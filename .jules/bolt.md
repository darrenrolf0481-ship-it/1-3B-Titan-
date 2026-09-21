## 2026-08-23 - Canvas 60FPS Render Optimization in Sensor Cards

**Learning:** In canvas animation loops running at 60 FPS, invoking `Math.max(...Array.from(data))` on TypedArrays allocates temporary arrays every frame, triggering GC pressure. Additionally, accessing `offsetWidth`/`offsetHeight` or calling `getComputedStyle(document.documentElement)` inside requestAnimationFrame callbacks causes forced synchronous layout reflows and style calculation overhead.

**Action:** When rendering real-time canvas graphs, compute peak values inline with standard loops, cache CSS variables via a Map, and query layout dimensions (`clientWidth`/`clientHeight`) only when canvas internal dimensions need updating.
