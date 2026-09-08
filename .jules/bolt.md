## 2025-02-18 - Canvas Starfield Allocation & Background Tab Optimization
**Learning:** Setting dynamic `fillStyle` strings (`rgba(r,g,b,a)`) inside 2D Canvas animation loops creates ~12,000 string allocations per second at 60 FPS, causing unnecessary garbage collection pauses. Furthermore, `requestAnimationFrame` recursion during `document.hidden` keeps event loop CPU cycles active even on background tabs.
**Action:** Move static `fillStyle` outside animation loops, use `ctx.globalAlpha` for opacity variations, and cancel/resume `requestAnimationFrame` using `visibilitychange` listeners.
