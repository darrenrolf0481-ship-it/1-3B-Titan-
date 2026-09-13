## 2025-05-18 - Caching CSS Variable Resolution and Canvas Buffer Sizing in Frame Loops
**Learning:** Calling `getComputedStyle(document.documentElement)` or unconditionally resetting `canvas.width` / `canvas.height` on every 60 FPS animation frame causes severe browser layout thrashing and canvas context resets across multi-card real-time displays.
**Action:** Cache CSS variable resolutions and only update canvas buffer dimensions (`canvas.width`/`canvas.height`) when `offsetWidth`/`offsetHeight` actually change.
