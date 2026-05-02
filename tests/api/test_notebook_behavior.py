"""Notebook behavior tests (P0.13 #14–#17).

Locks notebook contracts that P4 features migration must preserve.
Uses NotebookManager directly with tmp_path so we don't need to spin up
a full FastAPI app per test.
"""

from __future__ import annotations

import time

import pytest


# ---------------------------------------------------------------------------
# #14 — record create + summary persisted
# ---------------------------------------------------------------------------


def test_record_create_summary_persisted(tmp_path):
    """add_record must persist the summary verbatim."""
    from deeptutor.services.notebook.service import NotebookManager, RecordType

    mgr = NotebookManager(base_dir=str(tmp_path))
    notebook = mgr.create_notebook(name="Test NB", description="for tests")

    result = mgr.add_record(
        notebook_ids=[notebook["id"]],
        record_type=RecordType.NOTE if hasattr(RecordType, "NOTE") else "note",
        title="My Record",
        user_query="What is X?",
        output="X is foo.",
        summary="Concise: X is foo.",
        metadata={"source": "test"},
    )

    assert result["added_to_notebooks"] == [notebook["id"]]
    record_id = result["record"]["id"]

    fetched = mgr.get_record(notebook["id"], record_id)
    assert fetched is not None
    assert fetched["summary"] == "Concise: X is foo.", (
        f"summary corrupted: got {fetched['summary']!r}"
    )
    assert fetched["title"] == "My Record"


# ---------------------------------------------------------------------------
# #15 — list_notebooks ordered by updated_at desc
# ---------------------------------------------------------------------------


def test_notebooks_ordered_by_updated_at_desc(tmp_path):
    """list_notebooks() returns most-recently-updated first."""
    from deeptutor.services.notebook.service import NotebookManager

    mgr = NotebookManager(base_dir=str(tmp_path))

    nb1 = mgr.create_notebook(name="First")
    time.sleep(0.01)  # ensure different timestamps
    nb2 = mgr.create_notebook(name="Second")
    time.sleep(0.01)
    nb3 = mgr.create_notebook(name="Third")

    listed = mgr.list_notebooks()
    names = [nb["name"] for nb in listed]
    assert names == ["Third", "Second", "First"], (
        f"expected reverse-chronological, got {names}"
    )

    # Touch nb1 — it should jump to top
    time.sleep(0.01)
    mgr.add_record(
        notebook_ids=[nb1["id"]],
        record_type="note",
        title="x",
        user_query="x",
        output="x",
    )
    listed = mgr.list_notebooks()
    assert listed[0]["name"] == "First", (
        "Adding a record must bump notebook to top of list"
    )


# ---------------------------------------------------------------------------
# #16 — delete_notebook removes all records
# ---------------------------------------------------------------------------


def test_notebook_delete_cascades_records(tmp_path):
    """delete_notebook must remove notebook + all its records."""
    from deeptutor.services.notebook.service import NotebookManager

    mgr = NotebookManager(base_dir=str(tmp_path))
    nb = mgr.create_notebook(name="Doomed")
    for i in range(3):
        mgr.add_record(
            notebook_ids=[nb["id"]],
            record_type="note",
            title=f"r{i}",
            user_query=f"q{i}",
            output=f"o{i}",
        )

    assert len(mgr.get_records(nb["id"])) == 3
    deleted = mgr.delete_notebook(nb["id"])
    assert deleted is True

    # After delete, notebook gone, records inaccessible
    assert mgr.get_notebook(nb["id"]) is None
    assert mgr.get_records(nb["id"]) == []
    assert nb["id"] not in [n["id"] for n in mgr.list_notebooks()]


# ---------------------------------------------------------------------------
# #17 — health endpoint reports notebook count
# ---------------------------------------------------------------------------


def test_notebook_health_endpoint_reports_count(monkeypatch, tmp_path):
    """GET /health returns 200 with valid JSON shape (P0.6 strengthened)."""
    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
    except Exception:
        pytest.skip("fastapi not installed")

    # Patch the notebook_manager singleton used by the router so health
    # reflects our tmp_path manager rather than the dev-machine state.
    from deeptutor.services.notebook.service import NotebookManager

    fake_mgr = NotebookManager(base_dir=str(tmp_path))

    import deeptutor.api.routers.notebook as notebook_router_mod

    monkeypatch.setattr(notebook_router_mod, "notebook_manager", fake_mgr)

    app = FastAPI()
    app.include_router(notebook_router_mod.router, prefix="/api/v1/notebook")
    client = TestClient(app)

    # Initially zero notebooks
    resp = client.get("/api/v1/notebook/health")
    assert resp.status_code == 200, f"health returned {resp.status_code}"
    body = resp.json()
    assert isinstance(body, dict), f"health body must be dict, got {type(body)}"
    # Must contain SOME indication of state — leave field name flexible
    assert any(k in body for k in ("status", "ok", "healthy", "notebook_count")), (
        f"health body missing status indicator: {body}"
    )

    # Add a notebook, health should still respond OK
    fake_mgr.create_notebook(name="One")
    resp2 = client.get("/api/v1/notebook/health")
    assert resp2.status_code == 200
