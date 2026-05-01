# Agent 工作循环 SOP

> 给在 `web/` 改代码的 agent（或人）的最短可行操作手册。改之前花 30 秒看完。

## 0. 改之前

读一次：

1. [PLAN.md](./PLAN.md) — 看现在在哪个阶段、阶段状态、有没有 ❌ blocked
2. 对应阶段的 `phase-*.md` — 看本阶段未完事项与验收标准
3. [`AGENTS.fork.md`](../../AGENTS.fork.md) — fork 强制规则（commit 前缀、不能动 `main`、不能 push 上游）

**只在当前阶段范围内动手**。阶段间不要交叉，避免大 PR。

## 1. 改的过程中

- 一个 commit 一件事；改两件事 = 两个 commit
- 改 UI 必须保留可视回归基线（见 §3）
- 改类型契约（lib/*-types.ts）必须同步看后端 Pydantic（Phase 1 起会有 codegen）
- 不要给「以防万一」加 try/catch / fallback / null check —— 内部代码相信类型

## 2. 改完跑

```
npm run check        # ~30s  lint + typecheck + node-tests + component-tests
npm run check:e2e    # ~3min  check + smoke + visual
```

简单决策树：

| 改了什么 | 至少跑什么 |
|---|---|
| `lib/*.ts`（纯逻辑） | `npm run check` |
| 组件（任何 .tsx） | `npm run check:e2e` — 视觉回归是关键 |
| 路由 / page / layout | `npm run check:e2e` — 还要 smoke 兜底 |
| 主题 / token / CSS | `npm run check:e2e` — 视觉一定会 diff |
| `.github/workflows/` | 推到 PR 让 CI 自己验证 |
| 文档 / 注释 | 不强制 |

不通过不提交。CI 会再跑一遍 —— 本地不通过 CI 一定不通过。

## 3. 视觉回归 diff 怎么处理

```
✗ /dev?view=showcase visual baseline
  expected screenshot to match: dev-showcase-visual-darwin.png
```

四种情况：

1. **改动是预期视觉变化**（重构样式、加新组件、调 token）
   ```
   npm run test:visual:update    # 重新生成 -darwin 基线
   ```
   然后**还要在 Linux 容器里更新 -linux 基线**（否则 CI 会 fail）：
   ```
   # 假设 dev server 已起在 3782
   docker run --rm --network=host -v "$PWD/web":/work -w /work \
     -e WEB_BASE_URL=http://host.docker.internal:3782 \
     mcr.microsoft.com/playwright:v1.57.0-jammy \
     bash -lc 'npx playwright test --project=visual --update-snapshots'
   ```
   把两套 PNG 一起 commit。

2. **改动是回归（bug）** — 修代码，不动基线。

3. **CI fail 但本地 pass / 反过来** — 平台像素差。看 diff 三联图（红/绿/diff）：
   ```
   npx playwright show-report
   ```
   如果 diff 是字体/AA 像素差且配置容差（`maxDiffPixelRatio: 0.005`）兜不住，调容差或加 mask。

4. **不知道是哪种** — 别瞎更新基线。`npx playwright show-report` 看清楚再说。

## 4. Commit 与 push

```bash
# Commit 前缀按 AGENTS.fork.md：
[FORK-FEAT]    新功能（fork 自加）
[FORK-MOD]     改上游代码
[FORK-FIX]     fork 特有 bug 修
[FORK-DEL]     删上游代码
[UP-PICK] sha  从上游 cherry-pick

# push 只到 origin/custom/dev — 不能推上游
git push origin custom/dev
```

**禁止**：
- `--no-verify` / `--no-gpg-sign`（hook 失败时是修问题，不是绕过）
- `git push --force` 到 `custom/dev` 或 `main`（main 已退役）
- 重建 `main` 分支

## 5. 完成后更新计划文档

| 改了什么 | 改 PLAN.md 哪里 |
|---|---|
| 完成阶段内一项 | 不用改（commit 前缀 + 阶段 `.md` 的 checklist 自记录） |
| 完成整个阶段 | 状态从 🟡 → ✅ + 进度日志加一行 + 下一阶段从 ⏳ → 🟡 |
| 阻塞了 | 状态改 ❌ blocked + 注明阻塞原因 |
| 范围外发现新问题 | 写入 PLAN.md §5「不在本计划范围」或开新 phase 文档 |

## 6. 阻塞 / 失败时

- **不要硬推**：把状态改 ❌ blocked，PR description 里写阻塞原因
- **不要在阻塞的 PR 里塞别的改动**「顺便修一下」
- **不要 `git checkout .` / `git reset --hard`**：先 stash，让人能看到现场

## 7. 已知陷阱（项目特有）

- **dev server 端口不是 3000**：常驻在 `:3782`。本地跑 e2e 时设 `WEB_BASE_URL=http://localhost:3782`，CI 用 `:3000`（`npm start` 默认）。
- **视觉基线平台后缀**：`-darwin.png` 是本地，`-linux.png` 是 CI。两个都要 commit。
- **`docs/` 和 `.github/`** 在 `.gitignore` 里被 blanket 排除，但 `docs/refactor/` 和 `.github/workflows/` 用 `!` 例外重新加入。新增子目录如果没出现在 `git status`，先看 `.gitignore` 有没有挡住。
- **node-test runner vs vitest**：`*.test.ts` 走 node runner（pure JS），`*.vitest.ts(x)` 走 vitest（jsdom + RTL）。文件名搞错了 runner 找不到。
- **`@playwright/test` 与 docker image 版本必须对齐**。本地装的版本看 `npx playwright --version`，docker 镜像 tag 用同一个。
