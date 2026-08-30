## 2025-05-18 - High-frequency Telemetry State Re-renders
**Learning:** High-frequency state updates in `useNexusState` (5Hz local sensor simulation ticks) cause top-level re-renders of the entire `NexusPlatform` component tree. Layout and ambient background components (Starfield, SmokeBackground, CornerSigils, Header, Sidebar, Footer) must be wrapped with `React.memo` to prevent redundant component re-evaluations on every tick.
**Action:** Always memoize static layout and background components when parent components hold high-frequency telemetry or animation state.
