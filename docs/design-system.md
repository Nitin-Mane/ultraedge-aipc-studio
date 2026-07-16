# Design System

## Color Tokens

All colors are defined as CSS custom properties in `frontend/src/index.css` and mapped to Tailwind utilities.

| Token | Value | Usage |
|-------|-------|-------|
| `--edge-cyan` | `#00f5ff` | Primary accent, links, active states |
| `--edge-cyan-light` | `#7dfaff` | Lighter variant for text on dark bg |
| `--edge-cyan-glow` | `#00f5ff40` | Glow effects, pulse indicators |
| `--qwen-violet` | `#a855f7` | Secondary accent, coding agent, model cards |
| `--qwen-purple` | `#7c3aed` | Violet variant for gradients |
| `--aurora-base` | `#0a0e17` | Page background |
| `--aurora-surface` | `#111827` | Card/panel backgrounds |
| `--aurora-border` | `#1e293b` | Borders, dividers |
| `--text-primary` | `#f1f5f9` | Primary text |
| `--text-secondary` | `#94a3b8` | Secondary text |
| `--text-muted` | `#64748b` | Muted/placeholder text |
| `--status-ready` | `#10b981` | Success, ready state |
| `--status-warning` | `#f59e0b` | Warning, NPU indicator |
| `--status-error` | `#ef4444` | Error, destructive actions |
| `--status-preparing` | `#8b5cf6` | In-progress state |

## Tailwind Utility Classes

### Glass Morphism

```css
.glass-card    /* bg-aurora-surface + border + backdrop-blur */
.glass-panel   /* bg-aurora-surface/80 + border-edge-cyan/30 */
```

### Status Badges

```css
.status-badge  /* px-2 py-0.5 rounded text-xs font-mono border */
```

### Custom Animations

```css
.animate-fade-in    /* opacity 0→1 */
.animate-pulse-glow /* box-shadow pulse */
```

## Component Patterns

### Button

```tsx
import { Button } from '../components/Button'

<Button variant="primary" size="sm" onClick={handler}>
  <Icon className="w-4 h-4 mr-1.5" /> Label
</Button>

// Variants: primary, secondary, ghost
// Sizes: sm, md, lg
```

### Glass Card

```tsx
<div className="glass-card p-4 border border-aurora-border/40">
  Content
</div>
```

### Status Indicator

```tsx
<span className="flex items-center gap-1.5 text-[10px]">
  <span className="w-2 h-2 rounded-full bg-status-ready animate-pulse" />
  Ready
</span>
```

### Metric Card

```tsx
<motion.div
  className="glass-card p-4 group hover:border-edge-cyan/40"
  whileHover={{ scale: 1.02, y: -2 }}
>
  <div className="p-2 rounded-xl bg-edge-cyan/10">
    <Icon className="w-5 h-5 text-edge-cyan" />
  </div>
  <p className="text-2xl font-bold text-text-primary">{value}</p>
  <p className="text-xs text-text-muted">Label</p>
</motion.div>
```

## Page Layout Convention

Every page follows this structure:

```tsx
<PageTransition>
  <div className="min-h-screen bg-aurora-base">
    {/* Sticky header */}
    <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Title + actions */}
      </div>
    </div>

    {/* Content */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <FadeIn delay={0.1}>
        {/* Sections */}
      </FadeIn>
    </div>
  </div>
</PageTransition>
```

## Animation Primitives

From `frontend/src/components/PageTransition.tsx`:

- `<PageTransition>` — Fade + slide on route change
- `<FadeIn delay={0.1}>` — Staggered entrance
- `<StaggerContainer>` / `<StaggerItem>` — List stagger
- `framer-motion` `whileHover`, `whileTap`, `animate` for micro-interactions

## Icon Library

All icons from `lucide-react`. Color follows context:
- Cyan: primary actions, CPU indicator
- Violet: coding agent, model cards
- Green: success, ready, GPU
- Amber: warning, NPU
- Red: errors, destructive
- Muted: secondary info
