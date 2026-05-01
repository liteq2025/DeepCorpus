# Phase A — Agent 开发基建

> **状态**：✅ completed (2026-05-01)
> **回到 PLAN.md**：[./PLAN.md](./PLAN.md)

## 0. 为什么必须先做这一阶段

当前现状：
- 11 个单测全在 `tests/*.test.ts`，**只覆盖 `lib/`**，0 个组件测试
- 1 个 Playwright `audit` 测试（`tests/e2e/compliance-and-ux.audit.ts`），仅做 a11y 语义检查
- `.github/workflows/tests.yml` 只跑 Python 测试，**前端零 CI 保护**
- 没有 Vitest / RTL / 视觉回归

问题：agent 改完一个 UI，无法在不开浏览器、不喊人的情况下回答「这个变更有没有破坏其他东西 / 视觉有没有退化」。

目标：完成 Phase A 后，agent 跑一句 `npm run check:e2e` 就能在 ~3 分钟内拿到机器答案。

## 1. 验收标准（全绿才算 Phase A 完成）

```
✅ npm run check        通过（lint + tsc + vitest）
✅ npm run check:e2e    通过（check + playwright smoke + visual baseline）
✅ CI workflow web-tests.yml 在 PR 触发并全绿
✅ docs/refactor/AGENT_LOOP.md 写完
```

## 2. 步骤

### A1. 组件测试运行器（vitest + RTL + jsdom）— 2h

**目标**：能写组件测试，破零，与现有 node-test runner 共存。

**为什么 vitest 不是 jest**：原生 ESM、原生 TS、配置最少、与 Vite 生态对齐。

**步骤**：

1. 装依赖（在 `web/`）：
   ```bash
   npm i -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. 新建 `web/vitest.config.ts`：
   ```ts
   import { defineConfig } from "vitest/config";
   import path from "node:path";
   import react from "@vitejs/plugin-react"; // 装 @vitejs/plugin-react

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: "jsdom",
       globals: true,
       setupFiles: ["./vitest.setup.ts"],
       include: ["**/*.vitest.{ts,tsx}"], // 与 .test.ts (node runner) 区分
       exclude: ["node_modules", "tests/**", "dist/**", ".next/**"],
     },
     resolve: { alias: { "@": path.resolve(__dirname) } },
   });
   ```

3. 新建 `web/vitest.setup.ts`：
   ```ts
   import "@testing-library/jest-dom/vitest";
   ```

4. 新建 `web/components/ui/Button.vitest.tsx`（破零示例）：
   ```tsx
   import { render, screen } from "@testing-library/react";
   import userEvent from "@testing-library/user-event";
   import { describe, it, expect, vi } from "vitest";
   import Button from "./Button";

   describe("Button", () => {
     it("renders children", () => {
       render(<Button>Click me</Button>);
       expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
     });

     it("calls onClick when clicked", async () => {
       const onClick = vi.fn();
       render(<Button onClick={onClick}>Go</Button>);
       await userEvent.click(screen.getByRole("button"));
       expect(onClick).toHaveBeenCalledOnce();
     });

     it("does not call onClick when disabled", async () => {
       const onClick = vi.fn();
       render(<Button disabled onClick={onClick}>Go</Button>);
       await userEvent.click(screen.getByRole("button"));
       expect(onClick).not.toHaveBeenCalled();
     });

     it("shows loading state", () => {
       render(<Button loading>Save</Button>);
       expect(screen.getByRole("button")).toBeDisabled();
     });
   });
   ```

5. 在 `package.json` 里加 scripts：
   ```json
   "test:component": "vitest run",
   "test:component:watch": "vitest"
   ```

6. 跑 `npm run test:component` 应该 4 个 pass。

**验收**：`npm run test:component` 4 pass / 0 fail。

---

### A2. /dev 视觉基线快照 — 2h

**目标**：用 Playwright 给 `/dev` 的三个 view 拍快照。一张图覆盖 73+ 个 showcase。

**关键设计决策**：`DevDashboard` 用 `useState` 管理 selectedId，初始值是 `SHOWCASE_ID`。要让 Playwright 切到不同 view，最简单的办法是**改成读 URL `?view=` query**，没有 query 时回退到默认。这样测试用 `goto('/dev?view=tree')` 就能精准截图。

**步骤**：

1. 改 `components/dev/DevDashboard.tsx`：
   ```tsx
   // 顶部加：
   import { useSearchParams } from "next/navigation";

   // 在组件内，初始 selectedId 改为读 URL
   const params = useSearchParams();
   const initial = (() => {
     const v = params?.get("view");
     if (v === "tree") return TREE_ID;
     if (v === "gallery") return GALLERY_ID;
     if (v === "showcase") return SHOWCASE_ID;
     return SHOWCASE_ID;
   })();
   const [selectedId, setSelectedId] = useState<string>(initial);
   ```

2. 在 `playwright.config.ts` 加新 project：
   ```ts
   {
     name: "visual",
     testMatch: "**/*.visual.ts",
     use: {
       ...devices["Desktop Chrome"],
       viewport: { width: 1440, height: 900 },
     },
     expect: {
       toHaveScreenshot: { maxDiffPixelRatio: 0.005 }, // 0.5% 容差
     },
   },
   ```

3. 新建 `tests/e2e/dev-page.visual.ts`：
   ```ts
   import { test, expect } from "@playwright/test";

   const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";

   for (const view of ["showcase", "gallery", "tree"] as const) {
     test(`/dev?view=${view} visual baseline`, async ({ page }) => {
       await page.goto(`${BASE}/dev?view=${view}`);
       await page.waitForLoadState("networkidle");
       await expect(page).toHaveScreenshot(`dev-${view}.png`, {
         fullPage: true,
       });
     });
   }
   ```

4. 在 `package.json` 加 scripts：
   ```json
   "test:visual": "playwright test --project=visual",
   "test:visual:update": "playwright test --project=visual --update-snapshots"
   ```

5. 启动 dev server，跑 `npm run test:visual:update` 生成 baseline。
   再跑一次 `npm run test:visual` 应该 3 pass。
   提交 baseline 图（`tests/e2e/dev-page.visual.ts-snapshots/`）到仓库。

**验收**：`npm run test:visual` 3 pass，baseline 图已提交。

---

### A3. Golden-path E2E（5 条核心路径）— 3h

**目标**：5 个最常断的用户路径，断了立刻发现。

**路径选择原则**：
- 不依赖后端真实数据（mock 或访问空状态）
- 每条 ≤ 30 行
- 失败信息要够具体（`expect(...).toBeVisible()` 而不是 `expect(true).toBe(true)`）

**5 条路径**：

| # | 路径 | 验证什么 |
|---|---|---|
| 1 | `/` 首页 | `<main>` + `<h1>` 渲染 |
| 2 | `/dev` 控制台 | 侧栏 nav 渲染 + `🎨 组件预览` 选中 |
| 3 | `/settings` 切主题 | 点 dark → `<html data-theme="dark">` |
| 4 | `/knowledge` 进入 | 不报错，显示空状态或 KB 列表 |
| 5 | `/book` 进入 | 不报错，显示书库或空状态 |

**步骤**：

1. 在 `playwright.config.ts` 加：
   ```ts
   {
     name: "smoke",
     testMatch: "**/*.smoke.ts",
     use: { ...devices["Desktop Chrome"] },
   },
   ```

2. 新建 `tests/e2e/golden-paths.smoke.ts`，写 5 个 test。

3. 加 script：
   ```json
   "test:smoke": "playwright test --project=smoke"
   ```

**验收**：`npm run test:smoke` 5 pass。

---

### A4. 前端 CI workflow — 1h

**目标**：PR 触发前端检查，不通过不能合。

**步骤**：

1. 新建 `.github/workflows/web-tests.yml`：
   ```yaml
   name: Web Tests

   on:
     push:
       branches: [custom/dev]
       paths: ["web/**", ".github/workflows/web-tests.yml"]
     pull_request:
       branches: [custom/dev]
       paths: ["web/**", ".github/workflows/web-tests.yml"]

   jobs:
     web:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: web
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: "20"
             cache: "npm"
             cache-dependency-path: web/package-lock.json
         - run: npm ci
         - run: npm run lint
         - run: npx tsc --noEmit -p tsconfig.json
         - run: npm run test:node          # 现有 node-test runner（lib/ 单元测试）
         - run: npm run test:component     # 新加的 vitest
         - name: Install Playwright browsers
           run: npx playwright install --with-deps chromium
         - name: Build for E2E
           run: npm run build
         - name: Start production server
           run: npm start &
           env: { PORT: "3000" }
         - name: Wait for server
           run: npx wait-on http://localhost:3000 -t 60000
         - run: npm run test:smoke
         - run: npm run test:visual
         - name: Upload Playwright report on failure
           if: failure()
           uses: actions/upload-artifact@v4
           with:
             name: playwright-report
             path: web/playwright-report/
   ```

2. 装 `wait-on`（CI 等 server 启好）：
   ```bash
   npm i -D wait-on
   ```

3. 在 `custom/dev` 上推一个空 commit 或本 PR 触发，确认 workflow 执行。

**验收**：CI workflow 在 PR 上跑且全绿。

---

### A5. 统一验收命令 — 30min

**目标**：一行命令搞定本地验收。

**步骤**：

在 `web/package.json` 加：

```json
"check": "npm run lint && tsc --noEmit -p tsconfig.json && npm run test:node && npm run test:component",
"check:e2e": "npm run check && npm run test:smoke && npm run test:visual"
```

**验收**：本地跑 `npm run check:e2e` 全绿。

---

### A6. Agent 工作循环 SOP 文档 — 30min

**目标**：未来 agent 接手时，30 秒读懂如何安全地改代码。

**步骤**：

新建 `docs/refactor/AGENT_LOOP.md`，内容大纲：

```markdown
# Agent 工作循环 SOP

## 改代码前
- 读 PLAN.md 确认在哪个阶段
- 读对应 phase-*.md 确认本阶段未完事项

## 改代码时
- 单一关注点：一个 commit 一件事
- 不跨阶段动手

## 改完后
1. `npm run check`         （30s）— 必过
2. `npm run check:e2e`     （3 min）— 改了 UI 就必须跑
3. 如果 visual diff 是预期的，跑 `npm run test:visual:update` 更新基线
4. 提交：commit prefix 按 AGENTS.fork.md 约定
5. 更新 PLAN.md 状态行 + 进度日志

## 阻塞或失败
- 不要 --no-verify
- 不要 force push
- 把状态改成 ❌ blocked，PR 里写阻塞原因，等人介入

## 视觉回归怎么 review
- CI 失败时下载 playwright-report artifact
- 本地 `npx playwright show-report` 看 diff 三联图
- 如果是预期变化，本地 update-snapshots 后重提
- 如果是回归，回滚或修复
```

**验收**：文档存在 + 链接从 PLAN.md 第 6 节引用。

---

## 3. 已知风险 / 注意事项

1. **`useSearchParams` 在 Next.js 16 需要被 `<Suspense>` 包裹**（client component 限制）。如果 A2 改完 SSR 报错，方案是把 `useSearchParams` 的读取下沉到一个内部子组件，外层包 `<Suspense fallback={null}>`。
2. **Playwright baseline 图是平台特定的**。CI 是 Linux Chrome，本地 macOS Chrome 渲染可能有像素差。**baseline 图必须在 CI 第一次跑时生成、提交**，本地只 `--update-snapshots` 调试时用。
3. **vitest 与 node-test runner 共存**：用 `*.vitest.ts` vs `*.test.ts` 文件名区分；`vitest.config.ts` 的 `include`/`exclude` 必须排除 `tests/`，避免误吃。
4. **shadcn 装在 Phase 0 而不是 A**。A 阶段不引入 shadcn，单测就用现有 `ui/Button.tsx`；A 完成后 Phase 0 替换 Button 时，已有的 `Button.vitest.tsx` 是回归保护。

## 4. 完成检查清单

执行人完成 Phase A 后逐条勾选：

- [x] A1 — `npm run test:component` 5 pass（Button.vitest.tsx）
- [x] A2 — `npm run test:visual` 3 pass，baseline 图已提交（darwin + linux）
- [x] A3 — `npm run test:smoke` 5 pass
- [x] A4 — CI workflow `.github/workflows/web-tests.yml` 已就位（首次 PR 触发后才能验证全绿）
- [x] A5 — `npm run check:e2e` 一行跑通（96 项检查）
- [x] A6 — `docs/refactor/AGENT_LOOP.md` 落地
- [x] 更新 `PLAN.md`：A 行状态 → ✅，进度日志加一行
- [ ] 给 Phase 0 写 `phase-0-shadcn.md`（A 全绿后才能动 0）← Phase 0 启动前的下一动作

## 5. Commit 拆分建议

| 步 | Commit 信息 |
|---|---|
| A1 | `[FORK-FEAT] dev: add vitest + RTL component test runner` |
| A2 | `[FORK-FEAT] dev: visual regression baseline for /dev page` |
| A3 | `[FORK-FEAT] dev: 5 golden-path smoke tests` |
| A4 | `[FORK-FEAT] ci: web-tests workflow (lint/tsc/vitest/playwright)` |
| A5 | `[FORK-FEAT] dev: unified npm run check / check:e2e commands` |
| A6 | `[FORK-FEAT] docs: agent loop SOP` |

最后再一个收尾 commit：`[FORK-MOD] docs: mark Phase A as completed in PLAN.md`。
