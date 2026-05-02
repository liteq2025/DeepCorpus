"""WS event contract test (P0.13 #18).

Locks in the FE↔BE WebSocket event protocol so a backend StreamEvent change
that forgets to regenerate `web/lib/ws-events.gen.ts` (or vice versa) breaks
this test, not silent prod runtime drift.

Two assertions:
1. Every Python `StreamEventType` literal appears in the TS union.
2. Every field of `StreamEvent.to_dict()` appears in the TS interface.

Run: `pytest tests/api/test_ws_event_contract.py -v`
"""

from __future__ import annotations

from pathlib import Path
import re

import pytest

from deeptutor.core.stream import StreamEvent, StreamEventType

_REPO_ROOT = Path(__file__).resolve().parents[2]
_WS_EVENTS_TS = _REPO_ROOT / "web" / "lib" / "ws-events.gen.ts"


def _read_ts_file() -> str:
    if not _WS_EVENTS_TS.exists():
        pytest.skip(f"TS file not found at {_WS_EVENTS_TS}; run `make types` first")
    return _WS_EVENTS_TS.read_text(encoding="utf-8")


def test_every_python_streameventtype_in_ts_union() -> None:
    """Each `StreamEventType` Python value must appear in the TS union literal."""
    ts_source = _read_ts_file()
    union_match = re.search(r"export\s+type\s+StreamEventType\s*=([^;]+);", ts_source)
    assert union_match is not None, "TS union for StreamEventType not found"

    union_body = union_match.group(1)
    ts_literals = set(re.findall(r'"([^"]+)"', union_body))
    py_literals = {member.value for member in StreamEventType}

    missing_in_ts = py_literals - ts_literals
    extra_in_ts = ts_literals - py_literals

    assert not missing_in_ts, (
        f"TS union missing Python types: {missing_in_ts}. "
        f"Run `make types` to regenerate."
    )
    assert not extra_in_ts, (
        f"TS union has stale types not in Python: {extra_in_ts}. "
        f"Run `make types` to regenerate."
    )


def test_every_streamevent_field_in_ts_interface() -> None:
    """Every StreamEvent.to_dict() key must appear in the TS interface."""
    ts_source = _read_ts_file()
    iface_match = re.search(
        r"export\s+interface\s+StreamEvent\s*\{([^}]+)\}", ts_source, re.DOTALL
    )
    assert iface_match is not None, "TS interface StreamEvent not found"

    iface_body = iface_match.group(1)
    ts_fields = set(re.findall(r"^\s*(\w+)\s*:", iface_body, re.MULTILINE))

    sample = StreamEvent(type=StreamEventType.CONTENT, source="x")
    py_fields = set(sample.to_dict().keys())

    missing_in_ts = py_fields - ts_fields
    assert not missing_in_ts, (
        f"TS interface missing Python fields: {missing_in_ts}. "
        f"Run `make types` to regenerate."
    )


def test_streamevent_to_dict_is_json_safe() -> None:
    """Every StreamEventType must produce a JSON-serializable dict via .to_dict()."""
    import json

    for event_type in StreamEventType:
        event = StreamEvent(
            type=event_type,
            source="test",
            stage="contract",
            content="sample content",
            metadata={"k": "v", "n": 1},
            session_id="s1",
            turn_id="t1",
            seq=42,
        )
        d = event.to_dict()
        # Must be JSON-serializable round-trip without error
        round_trip = json.loads(json.dumps(d))
        assert round_trip["type"] == event_type.value, (
            f"Round-trip lost type for {event_type}"
        )
