# Bolt's Performance Journal

## 2025-02-22 - Prevent background component re-renders from telemetry polling loops
**Learning:** High-frequency polling hooks (like 5 Hz sensor telemetry in `useNexusState`) trigger root component re-renders that cascade into unmemoized static background graphics (`Starfield`, `SmokeBackground`, `CornerSigils`) and layout bars (`Footer`, `Sidebar`).
**Action:** Wrap fixed layout and canvas/CSS background components with `React.memo` to isolate high-frequency telemetry state updates from ambient visuals.
