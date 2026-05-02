#!/usr/bin/env python3
"""
Generate TypeScript types for FE↔BE WS events from the BE source of truth.

Phase 1 MVP. Covers server→client `StreamEvent` and `StreamEventType` only.
Client→server messages (start_turn / subscribe_turn / regenerate / …) are
parsed from raw dicts on the BE and have no Python type definitions yet,
so they remain manually maintained on both sides — see
`docs/refactor/phase-1-ws-contract.md` for scope rationale.

Usage:
    python3 scripts/gen_ws_types.py

Output:
    web/lib/ws-events.gen.ts

CI gate:
    `.github/workflows/web-tests.yml` runs `make types` and fails if the
    output diffs from the committed file — protecting against silent drift
    when someone edits `deeptutor/core/stream.py` without regenerating.
"""

from __future__ import annotations

from dataclasses import fields
from pathlib import Path
import sys

# Make `deeptutor` importable regardless of CWD.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from deeptutor.core.stream import StreamEvent, StreamEventType  # noqa: E402

# Hand-rolled TS field mapping. Asserted against the dataclass below so
# adding/removing a field on the BE without updating the mapping fails
# loudly during codegen, not silently at runtime.
TS_FIELDS: dict[str, str] = {
    "type": "StreamEventType",
    "source": "string",
    "stage": "string",
    "content": "string",
    "metadata": "Record<string, unknown>",
    "session_id": "string",
    "turn_id": "string",
    "seq": "number",
    "timestamp": "number",
}


def render_enum_union() -> str:
    members = list(StreamEventType)
    lines = [f'  | "{m.value}"' for m in members]
    return "export type StreamEventType =\n" + "\n".join(lines) + ";\n"


def render_event_interface() -> str:
    dc_fields = {f.name for f in fields(StreamEvent)}
    mapped = set(TS_FIELDS.keys())
    if dc_fields != mapped:
        missing = mapped - dc_fields
        extra = dc_fields - mapped
        raise SystemExit(
            "StreamEvent field drift between dataclass and codegen mapping:\n"
            f"  missing from dataclass: {sorted(missing) or '∅'}\n"
            f"  extra in dataclass:     {sorted(extra) or '∅'}\n"
            "Update TS_FIELDS in scripts/gen_ws_types.py to resync."
        )
    body = "\n".join(
        f"  {name}: {ts_type};"
        for name, ts_type in TS_FIELDS.items()
    )
    return "export interface StreamEvent {\n" + body + "\n}\n"


def render_file() -> str:
    header = (
        "// AUTO-GENERATED — do not edit by hand.\n"
        "// Source of truth: deeptutor/core/stream.py\n"
        "// Regenerate via: `make types` (or `python3 scripts/gen_ws_types.py`).\n"
        "//\n"
        "// Phase 1 (FE↔BE WS contract codegen) — only covers server→client\n"
        "// events. Client→server message types (StartTurnMessage / etc.) live\n"
        "// in lib/unified-ws.ts and are manually mirrored on both sides because\n"
        "// the BE side parses raw dicts. See docs/refactor/phase-1-ws-contract.md.\n\n"
    )
    return header + render_enum_union() + "\n" + render_event_interface()


def main() -> None:
    target = ROOT / "web" / "lib" / "ws-events.gen.ts"
    target.write_text(render_file(), encoding="utf-8")
    print(f"Wrote {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
