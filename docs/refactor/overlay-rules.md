# Overlay 决策与反模式手册

> 给所有可能加 overlay 的人（agent / 同事 / 未来的我）。改组件前花 30 秒看完。

## 0. 决策树

```
需要在主画布外的额外交互？
├─ 不可撤销的破坏性操作（删除 / 清空 / 重置）？  → AlertDialog
├─ 程序反馈 / 状态（保存成功 / 加载失败）？     → Toast (sonner)
├─ hover 提示 (≤ 1 行说明文字)？                → Tooltip
├─ 锚定的小弹层（自由布局，如颜色选择）？        → Popover
├─ 锚定的菜单（列表项 + 键盘导航）？             → DropdownMenu
└─ 其他一切（表单/预览/浏览/多步流程/设置）       → Sheet  ← 默认
```

**Sheet-first** 是这个项目的强制原则：除非命中以上特定 case，否则用 Sheet。Dialog 仅留给硬阻断。

## 1. 选择哪个 overlay

### Sheet — workhorse

**用**：表单 (Create KB) · 多步骤 (Save to Notebook) · 列表浏览 (History/Question Bank Picker) · 预览 (FilePreview) · 设置面板 · 长内容详情。

**不用**：单句确认（用 AlertDialog 或 Toast）；hover 提示（用 Tooltip）。

**变体**：
| prop | 取值 | 含义 |
|---|---|---|
| `side` | `right` (默认 桌面) / `bottom` (默认 移动 <640px) / `left` / `top` | 滑入方向 |
| `size` | `sm` (400) / `md` (540 默认) / `lg` (720) / `xl` (50vw) / `full` | 宽度档位 |
| `modal` | `false` (默认) / `true` (嵌套 Sheet 或多步表单时) | 是否抓焦点 |

**嵌套**：最多 2 层（如 "新建 KB" → 内层 "选 provider"）。≤ 640px 全部 fall back 到 `side="bottom"`。

### Dialog — 硬阻断专用

仅以下三种场景：
1. 不可撤销的破坏性操作（用 `AlertDialog` 变体）
2. 必须先解决才能继续的硬阻断（连接断开、API key 缺失）
3. 一句话非破坏性确认且不值得切 Sheet（极少）

其他 — 用 Sheet。

### AlertDialog — 删除前的 confirm

替代 `window.confirm()`。带 Cancel + 红色 Confirm 双 action + ARIA `role="alertdialog"`。

### Popover — 锚定自由布局

**用**：颜色选择器 · 配置 popout · 自定义内容的 hover-or-click 卡片。
**不用**：列表选择（用 DropdownMenu）；hover 文本（用 Tooltip）。

### DropdownMenu — 锚定菜单（列表）

**用**：动作菜单 · 选项菜单 · 用户头像菜单。
**不用**：自由布局（用 Popover）。

### Tooltip — hover 提示

**用**：≤ 1 行的解释文本，对图标按钮的扩展说明。
**不用**：可点击内容（参见 §3 反模式）。

### Toast — 短期反馈

**用**：保存成功 · 后台任务完成 · 网络断线提示 · undo 操作（"Deleted 2 docs. [Undo]"）。
**不用**：需要决策的情况（用 Dialog 或 Sheet）。

## 2. 状态归属

| 状态类型 | 落在哪 | 例子 |
|---|---|---|
| 长时间停留 + 可分享 | URL state | `?sheet=preview-fileId`、`?dialog=create-kb`、`?inspector=citations` |
| 用户偏好（持久化） | LayoutContext + localStorage | sidebar collapsed、listPane[id].collapsed、inspector[id].open |
| 瞬时不可分享 | 组件本地 state | Popover open、Dropdown open、Tooltip |
| 程序触发 | imperative | toast.success() |

## 3. 反模式（务必避免）

### Tooltip 里塞按钮 / 链接 / 输入框

```tsx
// ❌ Don't
<Tooltip>
  <TooltipContent>
    点击 <button>这里</button> 操作 / <a>链接</a>
  </TooltipContent>
</Tooltip>

// ✅ Use Popover instead
<Popover>
  <PopoverTrigger>...</PopoverTrigger>
  <PopoverContent>
    点击 <button>这里</button> 操作
  </PopoverContent>
</Popover>
```

理由：tooltip 用 `role="tooltip"`，对屏幕阅读器是被动 description；点击不可达；hover 触发不持久。把交互放进 tooltip 等于失去无障碍。

ESLint 规则 `overlay-rules/no-interactive-in-tooltip` 自动检查这一点。

### Dialog 仅用来展示信息

```tsx
// ❌ Don't — 无决策需要，盖整个画布只为读
<Dialog>
  <DialogContent>{longArticleText}</DialogContent>
</Dialog>

// ✅ Use Sheet — 不阻断主画布
<Sheet side="right" size="lg">
  <SheetContent>{longArticleText}</SheetContent>
</Sheet>
```

### Popover 用作菜单（列表选择）

```tsx
// ❌ Don't — 失去键盘导航 + 选项语义
<Popover>
  <PopoverContent>
    <button>Option 1</button>
    <button>Option 2</button>
  </PopoverContent>
</Popover>

// ✅ Use DropdownMenu — 自带 role="menu" + 箭头导航
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem>Option 1</DropdownMenuItem>
    <DropdownMenuItem>Option 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 用 `window.confirm()` / `window.alert()` / `window.prompt()`

```tsx
// ❌ Don't
if (window.confirm("Delete?")) { ... }

// ✅ Use AlertDialog — 视觉一致，可主题化
const confirmed = await confirmDelete({ title: "Delete?" });
if (confirmed) { ... }
```

Phase 0.5.7 一次 codemod 全部清掉这 11 处。

### 多个 overlay 同层堆叠（z-index 撞车）

z-index 用 token，不用裸数字（参考 [phase-0.5-layout.md §2](./phase-0.5-layout.md)）：

```
z-base    10   page chrome
z-sheet   40
z-dialog  50
z-popover 60
z-tooltip 70
z-toast   80
```

裸 `z-50` / `z-[xxxx]` 在 Phase 0.5.3 codemod 已被消灭。新代码不要再写。

### Sheet 嵌套 > 2 层

```tsx
// ❌ Don't — 用户迷失
<Sheet>
  <Sheet>
    <Sheet>
      ...
```

> 2 层意味着任务可以拆成多页面或顺序流程。重新设计。

### 在 InspectorPanel 里嵌 Sheet 来"展示更多"

InspectorPanel 已经是右侧持久面板（Layer 4）。在它里面再开一个 Sheet 是浪费空间。直接换 InspectorPanel 内容，或者升级到 Sheet（关掉 InspectorPanel，开 Sheet）。

## 4. ARIA / 键盘约定

| Overlay | role | 焦点 | Esc |
|---|---|---|---|
| Sheet | `dialog` (modal=true) / `region` (modal=false) | trapped if modal | close |
| Dialog | `dialog`, `aria-modal="true"` | trapped | close |
| AlertDialog | `alertdialog` | trapped | cancel |
| Popover | `dialog` (Radix 默认) | not trapped | close |
| DropdownMenu | `menu` + `menuitem` | not trapped, arrow nav | close |
| Tooltip | `tooltip` | n/a | dismiss when keyboard-focused |
| Toast | `status` (`aria-live="polite"`) | n/a | n/a |

shadcn 原语已带这些；自己写底座时务必复制相同语义。

## 5. 动画时长（已设入原语，不用手调）

| Overlay | 时长 | easing |
|---|---|---|
| ListPane / InspectorPanel collapse | 200ms | ease-out |
| Sheet | 250ms | ease-out |
| Dialog / AlertDialog | 150ms | ease-out |
| Popover / Dropdown | 100ms | ease-out |
| Tooltip | 100ms | ease-out (fade only) |
| Toast | 200ms | ease-out |

## 6. 检查清单（PR review 时打勾）

- [ ] overlay 类型符合 §0 决策树
- [ ] z-index 用 token，不用裸数字
- [ ] Tooltip 内只放文本，不放可交互元素
- [ ] 不出现 `window.confirm/alert/prompt`
- [ ] Sheet 嵌套 ≤ 2 层
- [ ] aria-label / role / aria-modal 该有的都有
- [ ] 移动断点（< 640px）测试过 Sheet 是否 fall back 到 `side="bottom"`
