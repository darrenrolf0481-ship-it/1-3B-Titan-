# Bolt's Journal - Critical Learnings

## 2025-03-01 - Canvas Animation Batching and GC Overhead
**Learning:** Batching canvas draw calls (e.g., grouping stars by opacity in Starfield) dramatically reduces canvas context state changes and draw calls from 200 to ~14 per frame. However, creating new `Map` or `Array` allocations per frame inside `requestAnimationFrame` introduces GC pressure and micro-stutters. Pre-allocating bucket arrays outside the animation loop and clearing them via `buckets[i].length = 0` maintains zero-allocation rendering. Additionally, when batching multiple `ctx.arc()` calls in a single path, `ctx.moveTo(cx + r, cy)` must be called before each arc to avoid drawing unwanted connecting lines.
**Action:** Always pre-allocate data structures outside `requestAnimationFrame` and call `ctx.moveTo` before subpath arcs when batching canvas shapes.
