---
colors:
  bg:
    base: "#0f172a"
    panel: "#1a2332"
    editor: "#111827"
    elevated: "#202d42"
    hover: "#2d3e52"
  text:
    primary: "#e2e8f0"
    secondary: "#94a3b8"
    muted: "#64748b"
    error: "#ff6b6b"
    success: "#51cf66"
  accent:
    primary: "#06b6d4"
    secondary: "#0ea5e9"
    warning: "#f59e0b"
    danger: "#ef4444"
    success: "#10b981"
  ui:
    border: "#334155"
    divider: "#1e293b"
    focus: "#06b6d4"
    shadow: "rgba(0,0,0,0.3)"
  status:
    online: "#10b981"
    offline: "#7c3aed"
    warning: "#f59e0b"
    error: "#ef4444"
typography:
  fontFamily:
    brand: "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    mono: "\"Fira Code\", \"Courier New\", monospace"
    ui: "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
  size:
    xs: "11px"
    sm: "12px"
    base: "13px"
    lg: "14px"
    xl: "16px"
    2xl: "18px"
    3xl: "24px"
  weight:
    normal: 400
    medium: 500
    semibold: 600
    bold: 700
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
radii:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
elevation:
  base: 0
  panel: 10
  toolbar: 20
  modal: 100
  tooltip: 1000
motion:
  fast: "100ms ease-out"
  normal: "200ms ease-out"
  slow: "300ms ease-out"
layout:
  panel_left:
    min: 200
    default: 320
    max: 500
  panel_right:
    min: 250
    default: 360
    max: 600
  panel_bottom:
    min: 100
    default: 240
    max: 500
  divider: 4
---
# Professional Industrial IDE Design System

## Look and Feel Overview
The visual identity of this platform is anchored in a **Dark Industrial** aesthetic, meticulously designed for professional engineering environments. Drawing heavy inspiration from industry-standard applications like VS Code, Mitsubishi GX Works3, and Siemens TIA Portal, the interface prioritizes sustained focus, absolute clarity, and high information density over decorative flair. 

This is a workspace built for professionals analyzing complex ladder logic and machine states—it acts as a quiet, unobtrusive, yet highly functional canvas.

## Architectural Hierarchy & Depth
Instead of relying on heavy drop-shadows or skeuomorphism to establish depth, the application uses distinct architectural backgrounds and structural dividers. 
- Deep slate forms the root foundation.
- Lighter navy tones lift the interactive panels.
- The editor itself drops back down to create an inset, focused "well" for the logic workspace.
- Elevation is strictly layered, from base workspaces to overlapping tooltips, ensuring critical context never gets buried.

## Color Semantics
Colors are purposefully subdued to absorb ambient light and reduce eye strain during prolonged sessions.
- **Utilitarian Base**: A spectrum of slate and muted navy blues forms the core UI.
- **Electric Accents**: Vibrant "Electric" Cyan and Sky Blue are deployed surgically to draw the eye to active focus rings, primary actions, and selected logical components.
- **Status Indicators**: In an industrial automation context, system health is paramount. Universal semantic colors (Online Green, Error Red, Pending Amber, Offline Violet) are used emphatically across hardware representations to convey immediate machine states.

## Typography Intent
- **System Interface**: The highly legible, neutral sans-serif typeface is used for the surrounding IDE shell, scaling down to a remarkably dense size for fine metadata without losing clarity.
- **Code & Logic**: Monospace typography is strictly enforced for memory addresses, console outputs, and technical identifiers. This ensures immediate scannability, structural alignment, and an unmistakable "technical" feel when displaying raw data.

## Motion & Interaction
Motion is intentionally brisk and mechanical.
- Animations utilize snappy, utilitarian transitions.
- There are no superfluous, bouncy animations. Everything from panel resizing to hover states is designed to feel responsive, instantaneous, and strictly predictable. 
- Even the cursor in the output console maintains a rigid, step-end blink to reinforce the terminal-like, precise nature of the system.
