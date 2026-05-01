# Phase 0 — shadcn 接入 + token 对齐 + 去 glass/snow

> **状态**：✅ completed (2026-05-01)
> **回到 PLAN.md**：[./PLAN.md](./PLAN.md)

## 0. 为什么这一阶段

第一性诊断（详见 `PLAN.md` §0）：

- `web/components/ui/` 只有 1 个 Button —— 设计系统层基本不存在
- 每个 feature 自己手撸 Modal / Input / Select / Tabs / Tooltip / Dropdown
- Token 系统只有 ~10 个 CSS 变量，颗粒度不够（缺 `--popover` / `--sidebar` / `--card-foreground` / `--ring` 等）
- 主题 4 种（light / dark / glass / snow），实际只有 light / dark 在用

shadcn/ui 是「Radix 原语 + Tailwind 样式 + a11y 默认」的官方组合包，项目已有 Radix 和 Tailwind，接入成本极低，杠杆极大。

## 1. 验收标准

```
✅ shadcn 初始化完成（components.json / tailwind / globals.css / utils）
✅ b37bl1flo 预设的 token 全部就位（背景/前景/卡片/弹层/主色/边框/ring/radius/sidebar 等）
✅ glass + snow 主题完全移除（仅 light / dark 保留）
✅ 字体保持现有 Plus Jakarta Sans + Lora（覆盖 shadcn 默认 Inter）
✅ 装好 8 个核心原语：Button / Input / Textarea / Select / DropdownMenu / Dialog / Sheet / Tooltip + Popover + Sonner（toast）
✅ 现有 components/ui/Button.tsx 替换为 shadcn 版本，所有调用方迁移
✅ npm run check:e2e 全绿（视觉 baseline 已更新）
```

## 2. 预设 b37bl1flo 解码（已冻结）

```
style        = nova
baseColor    = taupe (暖灰)
theme        = indigo (主色 / accent)
chartColor   = indigo
iconLibrary  = lucide        ← 与项目 lucide-react@0.562 一致
font         = inter         ← 覆盖：保留 Plus Jakarta Sans
fontHeading  = inherit
radius       = medium        ≈ 0.5rem
menuColor    = default
menuAccent   = subtle
```

## 3. 步骤

### 0.1 shadcn init — ½ 天

**前置**：当前所有改动已 commit；分支干净。

**步骤**：

1. 在 `web/` 跑：
   ```bash
   cd web
   pnpm dlx shadcn@latest init --preset b37bl1flo --template next
   ```
   （`pnpm dlx` 仅用于一次性 CLI；项目本身仍走 npm。CLI 会读 lockfile 检测包管理器。）

2. CLI 会问几个问题，按下面回答：
   - **Style**: New York（preset 已写死 nova，但 init 会问 New York/Default，选 New York）
   - **TypeScript**: yes
   - **Path alias `@/*`**: yes（已有）
   - **CSS file**: `app/globals.css`（已有）
   - **CSS variables**: yes（必须，preset 用 CSS 变量）
   - **Tailwind config**: `tailwind.config.js`（已有）
   - **React Server Components**: yes
   - **Components dir**: `@/components`（已有）
   - **Utils dir**: `@/lib`（已有）
   - **Default color**: 不重要，preset 会覆盖

3. 检查产出：
   ```
   components.json              ← 新建
   lib/utils.ts                 ← 可能新建（cn() helper）；如已存在合并
   tailwind.config.js           ← 改动：theme.extend.colors / borderRadius 加 shadcn token
   app/globals.css              ← 改动：@layer base 加 :root + .dark CSS 变量
   ```

4. 验证 token 落入 globals.css：
   - `:root { --background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --destructive-foreground --border --input --ring --radius --sidebar --sidebar-foreground --sidebar-primary --sidebar-primary-foreground --sidebar-accent --sidebar-accent-foreground --sidebar-border --sidebar-ring }`
   - `.dark { ... 同名 token，深色取值 ... }`

5. **关键合并**：项目原有的 `globals.css` 里有自定义 token（来自 fork-mod 历史）。逐项核对，preset 的 token 覆盖同名值，**自定义 token 保留**（如 `--font-sans` / `--font-serif`）。

**验收**：`npm run dev` 起得来；首页颜色看起来不再"完全坏掉"（虽然组件还没换，能跑就行）。

### 0.2 Drop glass + snow themes — ½ 天

**目标**：清掉 4 主题的 `glass` 和 `snow`，只留 `light` / `dark`。

**改动清单**：

1. **`app/globals.css`**：删 `[data-theme="glass"]` / `.theme-glass` / `.theme-snow` / `[data-theme="snow"]` 相关的所有段落
2. **`components/ThemeScript.tsx`**：
   ```tsx
   // before
   document.documentElement.classList.remove('dark', 'theme-glass', 'theme-snow');
   if (stored === 'dark') {/*...*/}
   else if (stored === 'glass') {/*...*/}
   else if (stored === 'snow') {/*...*/}
   // after
   document.documentElement.classList.remove('dark');
   if (stored === 'dark') document.documentElement.classList.add('dark');
   ```
3. **`lib/theme.ts`**：把 `Theme` 类型从 `"light" | "dark" | "glass" | "snow"` 改成 `"light" | "dark"`
4. **`lib/theme-utils.ts`**：删 glass / snow 相关分支
5. **`app/(utility)/settings/page.tsx`** (~line 1018)：主题选择按钮组从 4 选 1 改 2 选 1，删掉 "Glass" / "Snow" 选项
6. **`context/AppShellContext.tsx`**：如有 theme 处理删 glass/snow 分支
7. 全文 grep：`grep -rn 'glass\|snow' web --include='*.{ts,tsx,css}'` 清剩余引用（注意不要误删 fonts 等无关词）

**验收**：
- `npm run check:e2e` 全绿
- 设置页只有 Light / Dark 两个按钮
- 切 Dark 后 `<html class="dark">`，切 Light 后 class 清空
- localStorage 里只可能存 `light` / `dark` 两值

### 0.3 字体保持 — ¼ 天

shadcn 预设 b37bl1flo 选了 `inter`。不接受。

**步骤**：

1. `app/layout.tsx` 已经用 `next/font/google` 引入 `Plus_Jakarta_Sans` + `Lora` 并通过 CSS 变量 `--font-sans` / `--font-serif` 注入。**不要改这一段**。
2. shadcn init 后，可能在 `app/globals.css` 里加了 `@import 'inter'` 之类的语句，**删除**。
3. `tailwind.config.js` 的 `theme.extend.fontFamily` 里如果出现 `sans: ['Inter', ...]`，改成 `sans: ['var(--font-sans)', 'system-ui', 'sans-serif']`。

**验收**：起 dev server，字体仍是 Plus Jakarta Sans（DevTools 检查 `body` 的 font-family）。

### 0.4 装 8 个核心原语 — 1.5 天

按 `Phase 0.5` 的需要顺序装：

```bash
cd web
pnpm dlx shadcn@latest add button input textarea label
pnpm dlx shadcn@latest add select dropdown-menu
pnpm dlx shadcn@latest add dialog alert-dialog sheet
pnpm dlx shadcn@latest add popover tooltip
pnpm dlx shadcn@latest add sonner   # toast
```

每装一个：

1. **检查产出**：`components/ui/<name>.tsx` 出现
2. **加 vitest**：每个原语 1-2 个最简测试（render / disabled / 触发 callback），命名 `<Name>.vitest.tsx`
3. **加 showcase**：`components/dev/showcases.tsx` 加一条 entry 到 `UI 原语` 类目
4. **commit**：单原语单 commit，如 `[FORK-FEAT] ui: add shadcn Dialog primitive`

### 0.5 替换现 Button — ½ 天

shadcn `add button` 会写到 `components/ui/button.tsx`（小写）。当前项目有 `components/ui/Button.tsx`（大写）。

**迁移策略**：

1. 接受 shadcn 的小写命名约定（lowercase 是 shadcn 标准）
2. 删除 `components/ui/Button.tsx`
3. 现有的 variant 名映射：

   | 现有 prop | shadcn prop |
   |---|---|
   | `variant="primary"` | `variant="default"`（或省略） |
   | `variant="secondary"` | `variant="secondary"` |
   | `variant="danger"` | `variant="destructive"` |
   | `variant="ghost"` | `variant="ghost"` |
   | `loading` | 无内建；保留 prop 自己加 Loader2 |
   | `icon` | 无内建；shadcn 推荐写在 children 里 |

4. **codemod**：`grep -rln '@/components/ui/Button' app components | xargs sed -i ... ` 把 import 改成 `@/components/ui/button`，然后人工 review 改 prop。
5. **保留 loading + icon**：在 shadcn `button.tsx` 上 patch 这两个 prop（fork 自加，加注释说明）

   ```tsx
   // shadcn 默认无 loading prop；fork 加这两个便于调用方继续按习惯写法
   interface ButtonProps {
     loading?: boolean;
     icon?: React.ReactNode;
   }
   ```

6. **showcase 同步**：`Button.vitest.tsx` 5 个 case 调整 variant 名（`danger` → `destructive`）
7. **视觉 baseline 一定会变**：跑 `npm run test:visual:update`（macOS）+ docker linux update（CI baseline）

**验收**：
- `Button.vitest.tsx` 5 pass
- `/dev?view=showcase` 视觉 diff 已确认是 shadcn 风格变化（不是回归），baseline 已更新
- 所有 import 路径都是 `@/components/ui/button`
- `npm run check:e2e` 全绿

### 0.6 全量 check + 文档更新 — ¼ 天

1. `npm run check:e2e` 必须全绿
2. 更新 `docs/refactor/PLAN.md`：Phase 0 状态 → ✅，进度日志加一行
3. 给 Phase 0.5 启动条件画勾（"shadcn 装好 + Sheet/Dialog 等原语就位"）

## 4. 已知风险

1. **`globals.css` token 合并冲突**：现有的 fork-mod 修改可能与 shadcn 预设的同名 token 冲突。逐行 review，preset 优先，fork-mod 只在 preset 没覆盖的字段保留。
2. **现 `common/Modal.tsx` 不动**：Phase 0 不删它。`common/Modal.tsx` 在 Phase 0.5.6 才被 shadcn `Dialog` 取代。Phase 0 期间它和 shadcn `Dialog` 共存。
3. **shadcn `add` 命令可能覆盖文件**：装 `button` 时它会问"already exists, overwrite?"，选 yes（我们就是要它覆盖）。
4. **preset b37bl1flo 的字体会被强制写入**：CLI 可能在 globals.css 注 `@import` 或在 tailwind config 加 `fontFamily.sans: ['Inter']`。第 0.3 步必须主动改回。
5. **视觉基线雪崩**：换 Button 视觉一定 diff，showcase 73 个组件里很多用到 Button 的会跟着 diff。预算半天处理 baseline 更新。

## 5. 完成检查清单

- [x] 0.1 — shadcn init，components.json + lib/utils.ts + b37bl1flo token + Tailwind v3 兼容补丁
- [x] 0.2 — glass + snow 主题完全移除（globals.css -77 行）
- [x] 0.3 — 字体仍是 Plus Jakarta Sans + Lora（覆盖 shadcn Inter）
- [x] 0.4 — 11 个原语装好（button/input/textarea/label/dialog/alert-dialog/sheet/popover/dropdown-menu/tooltip/sonner）+ tailwindcss-animate
- [x] 0.5 — Button 替换为 shadcn API + 保留 fork loading/icon 扩展，showcase + vitest 已迁移，视觉 baseline 已更新（macOS + Linux）
- [x] 0.6 — `npm run check:e2e` 97 项检查全绿
- [x] 更新 `PLAN.md`：Phase 0 状态 → ✅，进度日志加一行
- [ ] 启动 Phase 0.5（layout 标准化）← 下一动作

## 6. Commit 拆分

```
0.1     1 commit   [FORK-FEAT] ui: shadcn init with preset b37bl1flo
0.2     1 commit   [FORK-MOD] theme: drop glass + snow, keep only light/dark
0.3     1 commit   [FORK-MOD] ui: keep Plus Jakarta Sans + Lora, override shadcn Inter
0.4     8 commits  [FORK-FEAT] ui: add shadcn {button,input,textarea,select,dropdown-menu,dialog,sheet,tooltip,popover,sonner}
                   (装 8-10 个原语，每个一 commit；button 单独留到 0.5)
0.5     2 commits  [FORK-MOD] ui: replace local Button with shadcn (props mapping)
                   [FORK-MOD] visual: update baselines after shadcn migration
0.6     1 commit   [FORK-MOD] docs: mark Phase 0 as completed
```

总计 ~13 commits / 3 天。
