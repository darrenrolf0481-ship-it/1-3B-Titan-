# Bolt Journal

## 2025-05-18 - Canvas dimension mutation in 60fps animation loops
**Learning:** Assigning `canvas.width = canvas.offsetWidth` or `canvas.height = canvas.offsetHeight` inside `requestAnimationFrame` loops on every frame forces the browser to reset canvas context state and reallocate GPU texture buffers at 60 FPS, causing unnecessary frame stalls and layout thrashing.
**Action:** Always guard canvas dimension assignments with condition checks (`if (canvas.width !== w) canvas.width = w`) to ensure buffer re-allocations only happen on actual element resize.
