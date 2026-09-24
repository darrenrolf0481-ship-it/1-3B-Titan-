## 2025-02-28 - Application Shell Memoization for High-Frequency Telemetry
**Learning:** High-frequency state updates in parent state containers (e.g. telemetry meters ticking every 200ms in `NexusPlatform`) trigger re-renders across all unmemoized child components in the application shell (`Starfield`, `SmokeBackground`, `CornerSigils`, `Header`, `Sidebar`, `Footer`).
**Action:** Wrap shell and background components in `React.memo` when parent state updates at high frequency and children do not depend on those rapidly changing state props.
