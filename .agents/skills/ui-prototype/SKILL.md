---
name: ui-prototype
description: UI 原型产出技能，按项目设计方向生成静态 HTML 原型，作为 Builder 的设计契约
---

# UI 原型产出技能

## 触发条件
- 用户说「画个原型」「做个 UI 草图」「先出个设计看看」
- 用户说「生成 preview」
- Designer Agent 在 Plan 阶段被要求产出原型时

## 工作流程

### Step 1：确定设计方向
原型必须按项目已定的设计方向来画，不凭空发挥。按优先级取方向（见 `rules/design.md` 优先级链）：

1. `preview/design-direction.md`（由 `/taste` 探索产出）——最高权威，直接读它的色板、字体、圆角、阴影
2. 项目 spec.md 中声明的设计方向
3. 都没有 → `rules/design.md` 的白底简约默认

> **还没有设计方向？** 先让用户走 `/taste` 定向（详见 `commands/taste.md`），再回来生成原型——避免做完才发现"不对味"返工。不强制，用户也可直接用 design.md 默认先跑。

### Step 2：产出原型
根据用户描述的页面需求 + 上一步确定的设计方向，生成静态 HTML 原型：

**技术要求：**
- 单个 HTML 文件，内联 CSS（无外部依赖）
- 移动端视口：`<meta name="viewport" content="width=device-width, initial-scale=1">`
- 把设计方向里的色板/圆角/阴影落成 CSS 变量
- 语义化 HTML 结构
- 包含 2-3 个典型页面状态（如列表页、详情页、空状态）

**输出：**
- 保存到 `preview/[页面名].html`
- 用户可在浏览器直接打开预览

### Step 3：确认与迭代
- 向用户展示原型预览（可用 Playwright 截图回看）
- 用户确认后，原型成为 Builder 的设计契约
- 用户要求修改时，直接更新 `preview/` 中的文件

## 注意事项
- 原型不是最终代码，是设计契约
- Builder 实现时应还原原型的视觉效果，而非复制原型代码
- 设计方向由 `/taste` 探索、`preview/design-direction.md` 固化；本技能只负责把方向渲染成 HTML，不自己定方向
- 缺设计方向时，按 `rules/design.md` 白底简约默认产出，并提示用户可用 `/taste` 定向
