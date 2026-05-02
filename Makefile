# DeepCorpus root Makefile
#
# Phase 1 (FE↔BE WS contract codegen) targets. See
# docs/refactor/phase-1-ws-contract.md for scope.

.PHONY: types types-check help

help:
	@echo "Available targets:"
	@echo "  types        Regenerate FE TypeScript types from BE source of truth"
	@echo "  types-check  Verify the committed FE types match the regenerated output"

# Regenerate web/lib/ws-events.gen.ts from deeptutor.core.stream.
types:
	python3 scripts/gen_ws_types.py

# Drift detection — fail if regenerating produces a diff vs. the committed
# files. Wired into the web-tests CI workflow so a BE change to the WS
# protocol that forgets to regenerate breaks the build.
types-check:
	@python3 scripts/gen_ws_types.py
	@if ! git diff --quiet --exit-code -- web/lib/ws-events.gen.ts; then \
		echo "✗ web/lib/ws-events.gen.ts is stale."; \
		echo "  Run \`make types\` and commit the regenerated file."; \
		git --no-pager diff -- web/lib/ws-events.gen.ts; \
		exit 1; \
	fi
	@echo "✓ FE↔BE WS types are in sync."
