---
name: Autonomous Agent Logic
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-base:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  mono-path:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
---

## Brand & Style

The design system is engineered for technical precision, catering to developers and AI operators who manage complex, multi-agent autonomous systems. The brand personality is **Technical, Disciplined, and Performant**, prioritizing data density and clarity over decorative flair. 

The aesthetic is a hybrid of **Minimalism** and **Geist-inspired Technical Modernism**. It uses a "low-light, high-focus" philosophy, where the interface recedes to let the agent logic and status indicators remain the focal point. Visual hierarchy is established through meticulous typography and functional color cues rather than heavy shadows or ornamentation.

## Colors

The color palette is anchored by a deep obsidian surface (`#10131a`) to reduce eye strain during long monitoring sessions. 

- **Primary Action:** A vibrant Blue-500 for active states and primary calls to action.
- **Validation Palette:** Strictly mapped to semantic meanings:
    - **Emerald-500 (Valid):** Successful agent execution or healthy resource status.
    - **Amber-500 (Warning):** Throttling, high latency, or pending tasks.
    - **Rose-500 (Invalid):** Logic breaks, connection failures, or critical errors.
    - **Blue-500 (Info):** System logs, neutral metadata, and navigation hints.
- **Neutrals:** Use a grayscale ramp based on Zinc/Slate to define borders and secondary text, ensuring a monochromatic foundation that makes validation colors pop.

## Typography

This design system utilizes a dual-font approach to balance UI legibility with technical data representation.

1.  **Geist (Sans):** Used for all navigational elements, button labels, and standard body text. It provides a clean, modern geometric feel that feels "engineered."
2.  **JetBrains Mono:** Reserved for "Data-Dense" areas including file paths, terminal output, agent logs, and variable declarations. 

**Density Rules:**
- Use **label-sm** for non-interactive metadata to keep the UI compact.
- Use **mono-path** in headers or breadcrumbs when displaying agent directory structures.
- For mobile, `display-lg` scales down to 24px to maintain readability within small viewports.

## Layout & Spacing

The system follows a **Multi-Pane Shell** architecture designed for high-productivity workflows.

- **Fixed Sidebar (Left):** 240px width. Contains primary navigation and agent groups.
- **Main Workspace (Center):** Fluid width. Houses the primary dashboard, canvas, or list views.
- **Details Panel (Right):** 320px width, collapsible. Used for inspecting agent attributes, configuration JSON, or specific node properties.
- **Terminal Drawer (Bottom):** Fixed to the bottom of the Main Workspace, resizable, with a minimum height of 160px.

**Grid & Spacing:**
Use an 8px base grid. Gutters between panes are strictly 1px (using border colors) to maximize screen real estate, creating a "tiled" look rather than a floating card look.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than shadows. In a dark-themed technical interface, shadows often create "muddiness."

1.  **Level 0 (Base):** `#10131a` - The background for the entire application.
2.  **Level 1 (Panes):** Surface backgrounds remain Level 0, but are separated by `1px` solid borders (`#27272a`).
3.  **Level 2 (Modals/Popovers):** Slightly lighter surface (`#1c1f26`) with a subtle 1px border and a very soft, high-spread black shadow (0 10px 30px rgba(0,0,0,0.5)).
4.  **Interactive States:** Hovering over list items or cards should use a subtle background highlight (`#1f2937`) rather than an elevation change.

## Shapes

The design system adopts a **Soft (0.25rem)** roundedness profile. This slight rounding softens the "brutalist" nature of the dark, pane-heavy layout without losing the professional, industrial feel.

- **Base Radius:** 4px (Buttons, Input fields, Small chips).
- **Large Radius:** 8px (Dashboard widgets, Modals).
- **Terminal/Code Blocks:** 0px (Sharp) to emphasize the transition from "UI" to "Raw Data."

## Components

### Tabbed Interfaces
Tabs are "Underlined" style within the Main Workspace and "Pill" style when used inside the Details Panel. Active tabs use the Primary color for the underline/background.

### Data Tables & Validation Badges
Tables must support high density. Rows are 36px in height. 
- **Validation Badges:** Use a "Dot + Label" pattern. A 6px circular indicator of the semantic color (e.g., Emerald-500) followed by a short text label in `mono-code` typography.

### Widget Cards
Dashboard widgets use a 1px border. The header of the widget should have a subtle bottom border and house the widget title in `label-sm` and any contextual actions (e.g., Refresh, Expand).

### Integrated Terminal Drawer
The terminal uses a pure black background (`#000000`) to differentiate it from the UI surface. Text is `mono-code` using a high-contrast white or light-gray, with semantic colors applied to log levels (INFO, WARN, ERR).

### Input Fields
Inputs use the `surface_color_hex` with a 1px border. On focus, the border transitions to the Primary color with a 2px outer "glow" (not a shadow) using 20% opacity of the primary color.