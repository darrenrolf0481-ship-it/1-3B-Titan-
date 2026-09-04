## 2025-05-21 - SmokeBackground Particle State Batching & Timer Cleanup
**Learning:** In React components with background animations (like particle generators), calling `setState` sequentially in a loop on initial mount triggers multiple synchronous re-renders, and scheduling per-item `setTimeout` calls without unmount cleanup causes memory leaks and updates on unmounted components.
**Action:** Batch initial state arrays into a single `setState` on mount and prune expired items declaratively inside a single `setInterval` callback instead of spawning per-item timers.
