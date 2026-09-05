## 2025-05-18 - Batch Canvas Pixel Updates & Color LUT
**Learning:** Calling `ctx.fillRect()` and generating CSS color strings thousands of times per animation frame in canvas components (like spectral waterfalls) creates severe CPU overhead and GC churn from string allocations.
**Action:** Use a pre-computed Uint8Array color lookup table (LUT) and render pixel data directly into an offscreen `ImageData` buffer, then stretch/draw it with a single `ctx.drawImage()` call.
