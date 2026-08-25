# Bolt Journal - Critical Performance Learnings

## 2025-05-18 - Batching Canvas Arc Paths & Pre-allocating Opacity Buckets
**Learning:** Calling `ctx.arc()`, setting string `ctx.fillStyle`, and invoking `ctx.fill()` 200 times per frame in a 60 FPS `requestAnimationFrame` loop creates 12,000 string allocations/sec and high context state switching overhead. Pre-calculating opacity color strings and grouping `arc` calls into opacity buckets reduces draw calls from 200 down to <= 10. When batching multiple `arc()` calls in a single canvas path, `ctx.moveTo(cx + r, cy)` must be called before each `arc()` to avoid implicit connecting sub-path lines.
**Action:** In 2D canvas animation loops, group identical styles into discrete buckets and use `ctx.moveTo` when batching `arc` sub-paths within a single `beginPath()` / `fill()` sequence.
