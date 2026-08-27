## 2026-08-25 - React.memo on static background decor components
**Learning:** Decorative background components (`Starfield`, `SmokeBackground`, `CornerSigils`) rendered in root layouts re-render every time high-frequency state updates (e.g., sensor telemetry ticks every 200ms). Wrapping static/self-contained UI elements in `React.memo` eliminates useless VDOM diffing on telemetry ticks.
**Action:** Always wrap non-interactive, purely decorative background elements in `React.memo` when located under high-frequency state parents.
