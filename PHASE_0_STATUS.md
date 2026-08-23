# Phase 0 Status — Verified Against Code, Not Claims

**Supersedes the "read-path only" finding in `TITAN_UI_INTEGRATION_STATUS.md`.** That's now out of date — the fetch layer and backend both landed. This doc covers what's actually there and what changed vs. the original `MEMORY_GRAPH_PLAN.md` schema.

## The good news: Phase 0 backfill already exists

`vision_server.py` — running on `:8765` — has three constellation endpoints, all wired to the real `sages_constellations.db`, not mocks:

- `GET /api/constellations/graph` — builds the D3 node/link shape from pinned + top-dopamine entries, with provenance-based hub-and-spoke links, and pulls in `constellation_edges` rows if the table exists.
- `GET /api/constellations/stats` — summary counts.
- `POST /api/constellations/backfill-edges` — **this is Phase 0.** Already built. Uses `sqlite-vec`'s `vec_distance_cosine()` for real KNN similarity (k=5 neighbors, weight threshold 0.6 by default), maps `resonance_vec` rowids → `node_id` through `resonance_metadata` + `sages_constellations`, writes edges with `INSERT OR REPLACE` (safe to re-run), and supports `dry_run=true` to preview before writing.

KNN-with-threshold is a better call than the flat cosine cutoff the plan proposed — guarantees every node gets neighbors instead of leaving low-density nodes orphaned.

## Where the schema diverged from the plan — know this before Phase 2

| MEMORY_GRAPH_PLAN.md §4 proposed | What's actually built | Matters? |
|---|---|---|
| `source_phi_index` / `target_phi_index` (INTEGER) | `source_node_id` / `target_node_id` (TEXT) | Not a bug — matches how the graph endpoint keys nodes, saves a join at read time. But **use `node_id`, not `phi_index`**, in any code that touches this table going forward. |
| `evidence_kind` | `edge_type`, value `'embedding_similarity'` not `'vector_similarity'` | Naming only. Match the real column/value names, not the plan's. |
| `status` (`candidate` / `active` / `invalidated`) | **Not present** | Fine for this tier — vector-similarity edges were always meant to auto-activate. **Missing entirely is a problem for the `contradiction` tier**, which the plan requires to start `candidate` and never auto-activate. Needs an `ALTER TABLE` before Phase 2's contradiction work starts. |
| `birth_ts`, `last_reinforced_ts`, `hit_count` | Only a single `timestamp` | Reinforcement (Phase 2) has nothing to increment yet. Needs schema addition — this isn't optional, Phase 2 can't start without it. |

## One real dependency to confirm

`backfill-edges` hard-requires the `sqlite-vec` Python extension to load (`conn.enable_load_extension`, `import sqlite_vec`). It fails gracefully with an error message if unavailable — it won't crash the server — but it also won't create edges. Worth a `dry_run=true` call against wherever this actually runs in production to confirm the extension loads there, rather than assuming it does.

## The one operational gotcha

`vision_server.py` is not just a constellation API — it's the **NEXUS Vision Server**, built primarily for paranormal image analysis via Ollama's vision models, with the constellation graph and a simulated sensor-telemetry feed (EMF/temp/ion/geomagnetic — randomly drifting, not real hardware unless something POSTs to `/api/sensors/report`) bolted onto the same file.

It's not auto-started — it's a manual `python3 vision_server.py` process. If it's not running wherever the Titan UI's browser resolves `localhost:8765`, the frontend fetch fails silently and falls back to the static mock nodes — no visible error, it just looks like Phase 0 never happened. Worth confirming it's actually running (and that "localhost" from the browser's perspective actually reaches it — matters if the UI is served from one host and viewed from another) before trusting what the lattice shows.

## Bottom line for Darren

The pipe works and Phase 0's backfill logic is real, not aspirational. Run it with `dry_run=true` first, confirm sqlite-vec loads and edge counts look sane, then run for real. Before Phase 2 starts, add `status`, `birth_ts`, `last_reinforced_ts`, `hit_count` to `constellation_edges` — that part of the plan wasn't built yet and Phase 2 depends on it.
