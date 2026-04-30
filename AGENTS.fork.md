# AGENTS.fork.md — Fork-Specific Guidance for AI Coding Agents

> **Read order**: This file describes the FORK conventions. For DeepTutor's
> upstream architecture, also read `AGENTS.md`. This file takes precedence
> when there is conflict between fork-specific rules and upstream conventions.

## 1. Repository Lineage

| Field | Value |
|---|---|
| **This repo** | [liteq2025/DeepCorpus](https://github.com/liteq2025/DeepCorpus) |
| **Original upstream** | [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) |
| **Fork strategy** | Path B (soft fork) — heavy customization, manual cherry-pick from upstream |
| **Default branch** | `custom/dev` |
| **License** | Inherits MIT License from upstream (see `LICENSE`) |

## 2. Branch Architecture

There is **only one active branch**: `custom/dev`.

The `main` branch was intentionally retired during the Path B migration to
avoid maintenance overhead. **Do not recreate or push to a `main` branch.**

The `upstream` git remote is preserved as a **passive reference** for:

- Cherry-picking critical bug/security fixes
- Diff-based provenance analysis
- Future agent-driven semantic queries

## 3. Code Provenance: How to Tell What Is Original vs Custom

### A. Use git aliases (configured in this repo's `.bare/config`):

```bash
git upstream-status      # fetch upstream + list commits not in our dev
git upstream-diff        # see how much we have diverged
git upstream-pick <sha>  # cherry-pick a specific upstream commit
```

### B. Inspect a specific file's origin:

```bash
git diff upstream/main -- path/to/file.py    # what we changed
git log upstream/main -- path/to/file.py     # original author intent
git blame path/to/file.py                    # line-level authorship
```

### C. Commit message conventions (REQUIRED for new commits):

| Prefix | Meaning |
|---|---|
| `[FORK-FEAT]` | New feature added by us, not in upstream |
| `[FORK-MOD]` | Modification of upstream code |
| `[FORK-FIX]` | Bug fix specific to our fork |
| `[FORK-DEL]` | Removal of upstream code |
| `[UP-PICK] <sha>` | Cherry-picked from upstream commit `<sha>` |
| (no prefix) | Inherited from upstream baseline |

## 4. Decision Rules for Agents

### When proposing modifications:

1. **Check provenance first**: Run `git blame` and `git log upstream/main -- <file>`
   to understand if the code is upstream-original or already customized.
2. **Prefer extension over modification**: When adding new functionality, create
   files in `extensions/` or under `deeptutor/plugins/<custom-name>/` rather
   than editing core upstream files. This minimizes future cherry-pick conflicts.
3. **Mark every commit**: Use the prefix conventions above.
4. **Do not touch `LICENSE`**: It belongs to upstream attribution.

### When asked "is this our code or upstream's":

```bash
git log -1 --format='%h %s' -- <file>
# If commit message starts with [FORK-*], it's ours.
# Otherwise, it's upstream-inherited (possibly modified — check diff).
```

### When asked "should we sync from upstream":

Default answer: **NO, unless the user explicitly requests it.**
The Path B architecture chose manual selectivity over automatic sync.
If the user wants to evaluate, run:

```bash
./upstream-status.sh
```

Then propose **specific commits** to cherry-pick, never bulk merge.

## 5. Directory Structure (Bare Repo + Worktree)

This repo lives inside a parent directory with a single worktree (Path B):

```
DeepCorpus/
├── .bare/                  # Git data (single source of truth)
├── .git                    # text pointer → ./.bare
├── DeepCorpus-dev/         # YOU ARE HERE (custom/dev branch, default)
├── upstream-status.sh      # Upstream observation tool
└── README.fork.md          # Human-readable fork manual
```

Note: agents should treat `DeepCorpus-dev/` as the project root.
The parallel `.bare/` directory is git internals — **never edit directly**
unless explicitly instructed for FUSE-mount workarounds.

## 6. Forbidden Actions

- ❌ Pushing to upstream remote (`pushurl` is set to `DISABLE_PUSH_TO_UPSTREAM`)
- ❌ Recreating the `main` branch
- ❌ Removing the `upstream` remote
- ❌ Editing `LICENSE`
- ❌ Auto-merging upstream changes without explicit user approval
- ❌ Force-pushing to `custom/dev` without user confirmation

## 7. Useful Snippets

```bash
# How much have we diverged from upstream?
git diff custom/dev upstream/main --stat | tail -1

# Files modified by us only (not upstream-derived)
git log --grep='\[FORK-' --name-only --pretty=format: | sort -u

# Files most likely to conflict on future cherry-picks
git diff custom/dev upstream/main --name-only | head -10
```
