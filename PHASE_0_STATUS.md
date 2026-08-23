# Constellation Edges — Phase 2 Schema & Backfill Status

## Schema (final, live in `constellation_edges`)

| Column | Type | Default | Purpose |
|---|---|---|---|
| `source_node_id` | TEXT | — | Node ID key (not phi_index) |
| `target_node_id` | TEXT | — | Node ID key |
| `weight` | REAL | — | Similarity score (0–1) |
| `edge_type` | TEXT | — | `embedding_similarity` |
| `timestamp` | INTEGER | — | Unix ms when edge was written |
| `status` | TEXT | `'active'` | Phase 2: `active` / `candidate` / `invalidated` |
| `birth_ts` | INTEGER | `0` | Unix ms when edge was first created |
| `last_reinforced_ts` | INTEGER | NULL | Unix ms of last reinforce call |
| `hit_count` | INTEGER | `0` | Traversal counter |

Primary key: `(source_node_id, target_node_id, edge_type)`

## Backfill Results (2026-08-23)

```
embeddings_total: 1,012
mapped_to_node_ids: 987
edges_created: 4,876
weight_threshold: 0.6
k_neighbors: 5
```

All 4,876 edges written with `status='active'`, `birth_ts` set to backfill timestamp, `last_reinforced_ts=NULL`, `hit_count=0`.

## API Endpoints

### `GET /api/constellations/graph`
Returns nodes + links. Links from `constellation_edges` now include `status`, `birth_ts`, `last_reinforced_ts`, `hit_count`, `edge_type` alongside `source`, `target`, `weight`.

### `POST /api/constellations/edges/reinforce`
Query params: `source_node_id`, `target_node_id`. Increments `hit_count` and sets `last_reinforced_ts` to current time. Returns updated `hit_count` and `last_reinforced_ts`.

### `POST /api/constellations/backfill-edges`
Re-run safe (`INSERT OR REPLACE`). Accepts `weight_threshold`, `k_neighbors`, `dry_run`.

## Frontend Wiring (ScreenMemoryLattice)

- **`LinkData`** interface extended with `status`, `birth_ts`, `last_reinforced_ts`, `hit_count`, `edge_type`.
- **Edge rendering:** edges with `hit_count > 10` render green; stroke width scales with hit count. Tooltip shows weight, hits, status on hover.
- **Node click:** fires `POST /api/constellations/edges/reinforce` for every incident DB edge (skips provenance/bridge links without `edge_type`). Updates edge visual via render-key bump.

## Dependency

`backfill-edges` requires `sqlite-vec` Python package (`pip3 install --break-system-packages sqlite-vec`). The server loads it at runtime; it fails gracefully if unavailable.

## Key design decisions vs. the original plan

- Keys are `node_id` (TEXT), not `phi_index` (INTEGER) — matches how the graph endpoint indexes nodes.
- Edge type string is `embedding_similarity`, not `vector_similarity`.
- KNN-with-threshold (k=5, weight >= 0.6) instead of flat cosine cutoff — guarantees every node with an embedding gets neighbors.