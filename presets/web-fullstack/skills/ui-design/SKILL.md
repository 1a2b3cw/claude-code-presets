---
name: ui-design
description: 前端审美设计，打造高级感、有辨识度的 UI，拒绝 AI 廉价感。涵盖设计系统、排版、配色、动效、空间构成
---

# UI 设计美学

基于 Anthropic 官方 frontend-design 插件理念，扩展为完整的前端审美设计指南。

## 设计思维

在写代码之前，先理解上下文并确定大胆的美学方向：

- **目的**：这个界面解决什么问题？谁在用？
- **基调**：选择一个明确的方向 —— 极简主义、复古未来、奢华精致、有机自然、工业粗犷、编辑杂志感、艺术装饰几何、柔和粉彩、赛博朋克、日式侘寂……
- **差异化**：什么让人记住这个设计？一个就够了。

**关键**：选择清晰的美学概念并精准执行。大胆的极繁和精致的极简都行 —— 重点是意图明确。

## 字体排版

### 字体选择原则

- 拒绝平庸：不用 Arial、Roboto、Inter、system-ui 等无个性字体
- 选择有性格的字体：衬线体显优雅，无衬线体显现代，等宽体显技术感
- 显示字体 + 正文字体搭配：一个有个性，一个保证可读性
- 每个项目换不同字体，不要收敛到相同选择

### 推荐字体库

| 风格 | 显示字体 | 正文字体 |
|------|----------|----------|
| 奢华精致 | Playfair Display, Cormorant Garamond | Lora, Source Serif Pro |
| 现代极简 | Space Grotesk, Outfit, Sora | DM Sans, Plus Jakarta Sans |
| 复古未来 | Orbitron, Rajdhani, Audiowide | Exo 2, Chakra Petch |
| 编辑杂志 | Fraunces, Instrument Serif | Instrument Sans, Newsreader |
| 日式侘寂 | Zen Kaku Gothic, Noto Serif JP | Noto Sans JP |
| 工业粗犷 | Archivo Black, Oswald, Barlow Condensed | Barlow, Work Sans |
| 有机自然 | Cormorant, Libre Baskerville | Nunito, Quicksand |
| 赛博朋克 | Share Tech Mono, Fira Code, JetBrains Mono | Inter, Manrope |

### 字体层级系统

```css
:root {
  /* 使用 fluid type 实现响应式 */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.375rem);
  --text-xl: clamp(1.375rem, 1.1rem + 1.2vw, 1.75rem);
  --text-2xl: clamp(1.75rem, 1.3rem + 2vw, 2.5rem);
  --text-3xl: clamp(2.25rem, 1.5rem + 3.5vw, 3.75rem);
  --text-4xl: clamp(3rem, 2rem + 5vw, 5.5rem);
  --text-hero: clamp(3.5rem, 2rem + 7vw, 8rem);

  /* 行高 */
  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* 字间距 */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
  --tracking-wider: 0.1em;
}
```

### 排版规则

- 标题用 tight 行高（1.1-1.25），正文用 normal（1.5）
- 大标题用负字间距（-0.02em），小写字母用正字间距（0.05em+）
- 段落宽度控制在 45-75 个字符（ch 单位）
- 中文排版用 CJK 标点，注意中英文之间加空格

## 配色系统

### 配色方法论

#### 1. 60-30-10 法则
- 60% 主色调（背景、大面积）
- 30% 辅助色（卡片、区块）
- 10% 强调色（按钮、链接、高亮）

#### 2. 配色方案类型

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| 单色 | 同一色相不同明度/饱和度 | 极简、高端 |
| 互补 | 色轮对立的两个颜色 | 强对比、活力 |
| 类似 | 色轮相邻的 2-3 个颜色 | 和谐、自然 |
| 三色 | 色轮等距的三个颜色 | 丰富、活泼 |
| 暗色 | 深色背景 + 浅色文字 | 科技、沉浸 |
| 浅色 | 浅色背景 + 深色文字 | 清新、专业 |

#### 3. 避免的配色

- 紫色渐变白底（AI 廉价感标配）
- 彩虹色齐上阵
- 高饱和度大面积使用
- 纯黑 #000000（用 #0a0a0a 或 #111111）

### CSS 变量配色模板

```css
:root {
  /* 暗色主题 - 科技感 */
  --bg-primary: #0a0a0b;
  --bg-secondary: #111113;
  --bg-tertiary: #1a1a1e;
  --bg-elevated: #222226;
  --text-primary: #f5f5f7;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);

  /* 浅色主题 - 杂志感 */
  --bg-primary: #faf9f7;
  --bg-secondary: #f5f3ef;
  --bg-tertiary: #ebe8e3;
  --bg-elevated: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #525252;
  --text-tertiary: #a3a3a3;
  --accent: #c2410c;
  --accent-hover: #ea580c;
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.15);
}
```

### 渐变使用

```css
/* 好：微妙的渐变增加层次感 */
background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);

/* 好：渐变文字强调 */
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 坏：彩虹渐变 = AI 廉价感 */
background: linear-gradient(90deg, red, orange, yellow, green, blue, purple);
```

## 空间构成

### 布局原则

#### 1. 打破网格
- 不要所有内容都对齐到同一个网格
- 使用不对称布局创造视觉张力
- 重叠元素增加层次感
- 对角线流动引导视线

#### 2. 负空间
- 慷慨的留白 = 高端感
- 拥挤的布局 = 廉价感
- hero 区域留白 > 内容区域留白
- 标题周围留白 > 正文周围留白

#### 3. 间距系统

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */
}
```

#### 4. 响应式断点

```css
/* Mobile First */
@media (min-width: 640px)  { /* sm - 大手机 */ }
@media (min-width: 768px)  { /* md - 平板 */ }
@media (min-width: 1024px) { /* lg - 小桌面 */ }
@media (min-width: 1280px) { /* xl - 桌面 */ }
@media (min-width: 1536px) { /* 2xl - 大屏 */ }
```

## 动效设计

### 原则

- 动效要有目的：引导注意力、反馈操作、展示关系
- 一个精心编排的页面加载动画 > 散落的微交互
- 优先 CSS 动画（性能好），复杂动效用 Motion/Framer Motion

### CSS 动画模板

```css
/* 页面入场动画 - 交错渐入 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

.animate-in:nth-child(1) { animation-delay: 0.1s; }
.animate-in:nth-child(2) { animation-delay: 0.2s; }
.animate-in:nth-child(3) { animation-delay: 0.3s; }
.animate-in:nth-child(4) { animation-delay: 0.4s; }

/* 悬停效果 - 微妙上浮 */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

/* 文字渐入 */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

/* 粒子/光晕背景 */
@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
  opacity: 0.15;
  filter: blur(60px);
  animation: float 8s ease-in-out infinite;
}
```

### Framer Motion（React）

```tsx
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AnimatedList({ items }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      {items.map((i) => (
        <motion.li key={i.id} variants={item}>
          {i.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

## 背景与视觉细节

### 拒绝纯色背景

```css
/* 好：微妙纹理增加质感 */
background-image:
  radial-gradient(at 20% 80%, rgba(120, 119, 198, 0.1) 0px, transparent 50%),
  radial-gradient(at 80% 20%, rgba(255, 119, 198, 0.08) 0px, transparent 50%);

/* 好：噪点纹理 */
.noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.03;
  pointer-events: none;
}

/* 好：网格背景 */
.grid-bg {
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* 好：渐变网格 */
.mesh-gradient {
  background:
    radial-gradient(at 40% 20%, hsla(240, 100%, 74%, 0.15) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(180, 100%, 74%, 0.1) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 0.1) 0px, transparent 50%);
}
```

### 卡片设计

```css
/* 毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
}

/* 光晕边框卡片 */
.glow-card {
  position: relative;
  background: var(--bg-elevated);
  border-radius: 16px;
  padding: 2rem;
  overflow: hidden;
}
.glow-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 17px;
  background: linear-gradient(135deg, var(--accent), transparent, var(--accent));
  opacity: 0.3;
  z-index: -1;
}

/* 悬停发光 */
.hover-glow {
  transition: box-shadow 0.3s ease;
}
.hover-glow:hover {
  box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.2);
}
```

## 暗色模式

```css
/* 系统偏好检测 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0a0a0b;
    --text-primary: #f5f5f7;
  }
}

/* 手动切换 */
[data-theme="dark"] {
  --bg-primary: #0a0a0b;
  --text-primary: #f5f5f7;
}

[data-theme="light"] {
  --bg-primary: #faf9f7;
  --text-primary: #1a1a1a;
}
```

### 暗色模式原则

- 不要用纯黑 #000 做背景（用 #0a0a0b 或 #111）
- 暗色模式下降低对比度（用 #aaa 而不是 #fff 做次要文字）
- 边框用半透明白色（rgba(255,255,255,0.08)）
- 阴影在暗色模式下效果差，用边框或发光代替

## 永远不要做的事

- ❌ Inter/Roboto/Arial 做主字体
- ❌ 紫色渐变白底
- ❌ 所有内容对齐到同一网格
- ❌ 纯黑 #000000 做背景
- ❌ 高饱和度大面积使用
- ❌ 没有留白的拥挤布局
- ❌ 无意义的装饰动画
- ❌ 彩虹色
- ❌ 所有卡片一模一样的圆角和阴影

## 设计检查清单

- [ ] 有明确的美学方向（不是"好看就行"）
- [ ] 字体有个性，不是默认字体
- [ ] 配色有主次，不是五颜六色
- [ ] 有足够的留白
- [ ] 动效有目的，不是为了动而动
- [ ] 背景有质感，不是纯色
- [ ] 暗色/浅色模式都好看
- [ ] 响应式，手机端也好看
- [ ] 有视觉层次，最重要的内容最突出
- [ ] 整体风格一致，不是东拼西凑
