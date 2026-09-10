## 2026-05-21 - Canvas fillStyle string allocations
**Learning:** In canvas animation loops (such as background particle/star field rendering), string interpolations like `rgba(200, 200, 255, ${s.o})` inside `requestAnimationFrame` generate thousands of heap string allocations per second (e.g. 200 stars * 60 FPS = 12,000 allocations/sec), triggering unnecessary GC pauses.
**Action:** Set `ctx.fillStyle` once per frame (e.g. `#c8c8ff`) outside the particle loop and set `ctx.globalAlpha = s.o` inside the loop instead.
