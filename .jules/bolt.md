## 2025-02-18 - Canvas Context FillStyle vs GlobalAlpha String Allocations
**Learning:** Setting `ctx.fillStyle` with template strings inside canvas render loops (e.g., `rgba(...)`) allocates thousands of temporary strings per second (12,000/sec for 200 items at 60fps) and causes continuous GC pressure and string parsing in browser canvas context engines.
**Action:** Move static color `ctx.fillStyle` assignments outside animation loops and use numeric `ctx.globalAlpha = opacity` per item instead.
