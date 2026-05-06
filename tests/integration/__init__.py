"""End-to-end integration tests against a running mock LLM server.

Skipped automatically when the mock server isn't reachable on
``MOCK_LLM_BASE_URL`` (defaults to ``http://127.0.0.1:8099/v1``).

To run locally:
  python scripts/mock_llm_server.py --port 8099 &
  PYTHONPATH=. .venv/bin/python -m pytest tests/integration -q
"""
