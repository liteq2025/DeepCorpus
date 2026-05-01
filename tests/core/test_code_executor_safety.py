from __future__ import annotations

import pytest

from deeptutor.tools import code_executor
from deeptutor.tools.code_executor import (
    CodeExecutionError,
    DEFAULT_SAFE_IMPORTS,
    ImportGuard,
    NETWORK_DENY_HINTS,
    _resolve_imports_policy,
    build_codegen_prompt,
)


def test_import_guard_rejects_unsafe_builtin_calls() -> None:
    with pytest.raises(CodeExecutionError):
        ImportGuard.validate("print(open('secret.txt').read())", ["math"])


def test_import_guard_rejects_unsafe_module_access() -> None:
    with pytest.raises(CodeExecutionError):
        ImportGuard.validate("import math\nos.system('whoami')", ["math"])


def test_import_guard_rejects_unlisted_imports_with_module_names() -> None:
    """The error message must enumerate the offending modules so callers
    can surface them to the LLM (and to humans reading logs)."""
    with pytest.raises(CodeExecutionError) as exc_info:
        ImportGuard.validate("import sys\nimport urllib", ["math"])
    message = str(exc_info.value)
    assert "sys" in message
    assert "urllib" in message
    assert "not in the allowed list" in message


def test_import_guard_disallowed_bases_accepts_custom_set() -> None:
    """Per-call disallowed bases override the default set, so configuration
    can drive the policy without code changes."""
    # Default deny set blocks os.<attr>.
    with pytest.raises(CodeExecutionError):
        ImportGuard.validate("import math\nos.getcwd()", ["math", "os"])
    # An empty custom deny set disables attribute-access blocking entirely.
    ImportGuard.validate(
        "import math\nos.getcwd()",
        ["math", "os"],
        disallowed_attribute_bases=set(),
    )


def test_resolve_imports_policy_falls_back_when_yaml_missing(monkeypatch) -> None:
    """If main.yaml has no run_code config, the policy must fall back to
    the built-in defaults rather than blocking everything."""
    monkeypatch.setattr(code_executor, "_load_config", lambda: {})
    allowed, deny = _resolve_imports_policy()
    assert allowed == list(DEFAULT_SAFE_IMPORTS)
    assert "os" in deny and "sys" in deny


def test_resolve_imports_policy_reads_yaml_overrides(monkeypatch) -> None:
    monkeypatch.setattr(
        code_executor,
        "_load_config",
        lambda: {
            "allowed_imports": ["math", "json"],
            "disallowed_attribute_bases": ["os"],
        },
    )
    allowed, deny = _resolve_imports_policy()
    assert allowed == ["math", "json"]
    assert deny == {"os"}


def test_codegen_prompt_lists_allowed_imports_and_forbids_network() -> None:
    """The system prompt fed to the LLM must mirror the runtime allow-list
    and explicitly forbid the network modules that are *not* on it."""
    prompt = build_codegen_prompt(["math", "numpy"])
    assert "math, numpy" in prompt
    for forbidden in NETWORK_DENY_HINTS:
        assert forbidden in prompt
    assert "no network access" in prompt.lower()
