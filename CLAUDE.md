# CLAUDE.md — DeepCorpus (Fork of HKUDS/DeepTutor)

> **Fork strategy**: Path B (soft fork). Heavy customization, manual cherry-pick from upstream.
> **Default branch**: `custom/dev`. There is **no `main` branch** in this fork.

## Read order for AI agents

1. **`AGENTS.fork.md`** — fork-specific rules (commit prefix, provenance checks, forbidden actions). **Authoritative** when it conflicts with anything else.
2. **`AGENTS.md`** — upstream's runtime agent architecture (Tools, Capabilities, Orchestrator). Reference for *how the app works*, not for *how to contribute*.
3. **`../README.fork.md`** (parent directory) — operator manual for Path B layout.

## Critical do-NOTs

- Push to upstream remote (`pushurl` is set to `DISABLE_PUSH_TO_UPSTREAM`)
- Recreate the `main` branch
- Remove the `upstream` git remote
- Edit `LICENSE`
- Auto-merge upstream — propose **specific commits** to cherry-pick instead

## Commit prefix (REQUIRED)

| Prefix | When to use |
|---|---|
| `[FORK-FEAT]` | New feature we added, not in upstream |
| `[FORK-MOD]` | Modification of upstream code (incl. CI / config) |
| `[FORK-FIX]` | Bug fix specific to this fork |
| `[FORK-DEL]` | Removal of upstream code |
| `[UP-PICK] <sha>` | Cherry-picked from upstream commit `<sha>` |

Inherited upstream commits (before fork divergence) keep their original messages.

## Working with upstream

```bash
git upstream-status        # fetch + show new upstream commits
git upstream-diff          # how much have we diverged?
git upstream-pick <sha>    # cherry-pick a specific upstream commit
```

When in doubt about whether code is ours or upstream's:

```bash
git log -1 --format='%h %s' -- <file>
# Prefix [FORK-*] → ours.  Otherwise → upstream-inherited.
```

See `AGENTS.fork.md` for the full conventions.
