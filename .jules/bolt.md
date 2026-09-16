## 2025-05-18 - Canvas Dimension Mutation Bottleneck in Animation Loops
**Learning:** Mutating `canvas.width` and `canvas.height` on every frame of `requestAnimationFrame` resets the 2D rendering context state and forces texture re-allocation on the GPU, even if the values haven't changed. Check dimensions before reassigning (`canvas.width !== canvas.offsetWidth`).
**Action:** Always guard canvas dimension updates in continuous render loops with equality checks against layout width/height.
