## 2026-09-06 - Canvas Waterfall BitBlt vs Full Repaint
**Learning:** In spectrogram/waterfall canvas components, calling `ctx.fillRect` for every pixel across all historical rows on every frame creates O(height * resolution) canvas calls (~38,000+ per frame), causing massive rendering overhead.
**Action:** Use `ctx.drawImage` to shift the existing canvas bitmap down by 1px and render only the 1 newly arrived top row per frame (O(resolution)), using full historical repaints only when canvas dimensions or color palette parameters change.
