# Bolt's Journal - Performance Learnings

## 2025-02-18 - Canvas requestAnimationFrame Leaks and GC String Allocations
**Learning:** In canvas animation loops, `cancelAnimationFrame` fails to stop the loop if only the initial frame request ID is saved while subsequent frame IDs are un-tracked inside the animation callback. Furthermore, generating `rgba(...)` string templates inside a per-frame star/particle loop creates thousands of transient string objects per second.
**Action:** Always store the latest `requestAnimationFrame` ID in a mutable variable for cleanup, and use `ctx.globalAlpha` with a static `ctx.fillStyle` to eliminate string allocations in 60fps canvas loops.
