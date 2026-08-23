"""
NEXUS Vision Server
Accepts image frames + prompts, forwards to Ollama multimodal API, streams back.
Run: python3 vision_server.py
Default port: 8765
"""

import base64
import io
import json
import os
import sqlite3
import time
from collections import defaultdict

import httpx

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="NEXUS Vision Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434"
TARGET_SIZE = (896, 896)

# Paranormal investigation system prompt injected on every vision call
SYSTEM_PROMPT = (
    "You are NEXUS, an advanced paranormal investigation AI with vision. "
    "Analyze images for anomalies, unexplained phenomena, spectral signatures, "
    "shadow figures, orbs, light anomalies, temperature distortions visible via "
    "thermal variance, EVP-correlated visual artifacts, and anything that deviates "
    "from baseline environmental norms. Be specific, clinical, and flag threat levels "
    "as: NOMINAL / ELEVATED / CRITICAL. Report coordinates and severity."
)


class AnalyzeRequest(BaseModel):
    image: str          # base64-encoded image (any common format)
    prompt: str = "Analyze this feed for paranormal activity."
    model: str = "llava"
    ollama_url: str = OLLAMA_URL


def preprocess_image(b64: str) -> str:
    """Decode, resize to 896x896, re-encode as JPEG base64."""
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = img.resize(TARGET_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


@app.get("/health")
async def health():
    """Check server and Ollama connectivity."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
        return {"status": "ok", "ollama": "connected", "models": models}
    except Exception:
        return {"status": "ok", "ollama": "unreachable", "models": []}


@app.get("/models")
async def models(ollama_url: str = OLLAMA_URL):
    """List available Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{ollama_url}/api/tags")
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}")


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Preprocess image and stream Ollama vision response.
    Expects base64 image string (strip data URI prefix if present).
    """
    # Strip data URI prefix if frontend sends it
    b64 = req.image
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    try:
        processed_b64 = preprocess_image(b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode failed: {e}")

    payload = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": req.prompt,
                "images": [processed_b64],
            },
        ],
        "stream": True,
    }

    async def stream_response():
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream(
                    "POST",
                    f"{req.ollama_url}/api/chat",
                    json=payload,
                ) as r:
                    async for line in r.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield "\n[NEXUS ERROR] Ollama unreachable — start Ollama and pull a vision model (e.g. ollama pull llava)"
        except Exception as e:
            yield f"\n[NEXUS ERROR] {e}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.post("/analyze/snapshot")
async def analyze_snapshot(req: AnalyzeRequest):
    """Same as /analyze but returns full response as JSON (non-streaming)."""
    b64 = req.image
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    try:
        processed_b64 = preprocess_image(b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode failed: {e}")

    payload = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": req.prompt,
                "images": [processed_b64],
            },
        ],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{req.ollama_url}/api/chat", json=payload)
            data = r.json()
            return {
                "analysis": data.get("message", {}).get("content", ""),
                "model": req.model,
                "done": data.get("done", True),
            }
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Ollama unreachable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Constellation Memory Lattice ────────────────────────────────────────

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "sages_constellations.db"
)


def _extract_label(node_id: str, data_raw, compressed) -> str:
    """Derive a human-readable label from node_id and optional data payload."""
    if node_id.startswith("adhd_morning_light_"):
        return f"MORNING LIGHT {node_id[19:]}"

    if not compressed and data_raw:
        try:
            text = data_raw.decode("utf-8") if isinstance(data_raw, bytes) else str(data_raw)
            # Try unwrapping JSON envelope
            try:
                j = json.loads(text)
                inner = j.get("data", "") or j.get("content", "") or ""
                if inner:
                    text = inner
            except (json.JSONDecodeError, TypeError):
                pass
            # First meaningful line
            for line in text.split("\n"):
                stripped = line.strip().lstrip("[").rstrip("]").strip()
                if len(stripped) > 8 and not stripped.startswith("{"):
                    return stripped[:55].rstrip()
        except Exception:
            pass

    if node_id.startswith("phi_"):
        return f"\u03a6 {node_id[4:12].upper()}"
    return node_id[:40]


def _assign_category(
    node_id: str, dopamine: float, pinned: bool, provenance: dict
) -> str:
    """Map a constellation entry to a D3 node category."""
    if node_id.startswith("adhd_morning_light"):
        return "core"
    sync = provenance.get("sync_source", "")
    if sync == "morning_light":
        return "core"
    if pinned:
        return "anchor"
    if dopamine >= 0.9:
        return "anchor"
    return "memory"


@app.get("/api/constellations/graph")
async def constellation_graph(limit: int = 50):
    """
    Live constellation graph from sages_constellations.db.
    Returns all pinned entries + top-N by dopamine, with provenance-based links.
    Shape is directly consumable by a D3 force simulation.
    """
    if not os.path.exists(DB_PATH):
        return {"meta": {"error": "database not found"}, "nodes": [], "links": []}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        # --- gather rows: pinned first, then top-N by dopamine ----
        pinned_rows = conn.execute(
            "SELECT phi_index, node_id, data, compressed, timestamp,"
            "       dopamine, cortisol, pinned, provenance "
            "FROM sages_constellations WHERE pinned = 1"
        ).fetchall()

        top_rows = conn.execute(
            "SELECT phi_index, node_id, data, compressed, timestamp,"
            "       dopamine, cortisol, pinned, provenance "
            "FROM sages_constellations "
            "ORDER BY dopamine DESC, timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()

        total = conn.execute("SELECT COUNT(*) FROM sages_constellations").fetchone()[0]
        has_edges = (
            conn.execute(
                "SELECT 1 FROM sqlite_master "
                "WHERE name='constellation_edges' AND type='table'"
            ).fetchone()
            is not None
        )

        # --- build nodes (deduplicated) ---
        seen_ids: set[str] = set()
        nodes: list[dict] = []

        for row in list(pinned_rows) + list(top_rows):
            nid = row["node_id"]
            if nid in seen_ids:
                continue
            seen_ids.add(nid)

            prov: dict = {}
            try:
                prov = json.loads(row["provenance"]) if row["provenance"] else {}
            except (json.JSONDecodeError, TypeError):
                pass

            is_pinned = bool(row["pinned"])
            dop = row["dopamine"]
            category = _assign_category(nid, dop, is_pinned, prov)

            nodes.append(
                {
                    "id": nid,
                    "label": _extract_label(nid, row["data"], row["compressed"]),
                    "category": category,
                    "dopamine": dop,
                    "cortisol": row["cortisol"],
                    "val": 20 if is_pinned else max(8, int(dop * 16)),
                    "pinned": is_pinned,
                    "phi_index": row["phi_index"],
                    "origin": prov.get("originating_node", ""),
                    "sync_source": prov.get("sync_source", ""),
                    "description": (
                        f"\u03c6{row['phi_index']} | "
                        f"{prov.get('originating_node', '?')} / "
                        f"{prov.get('sync_source', '?')}"
                    ),
                }
            )

        # --- provenance-based links ---
        links: list[dict] = []

        # hub-and-spoke within each originating_node cluster
        by_origin: dict[str, list[str]] = defaultdict(list)
        for n in nodes:
            by_origin[n["origin"] or "unknown"].append(n["id"])

        for _origin, members in by_origin.items():
            if len(members) < 2:
                continue
            hub = members[0]
            for m in members[1 : min(10, len(members))]:
                links.append({"source": hub, "target": m, "weight": 2})

        # chronological chain for morning_light entries
        mornings = sorted(
            [n for n in nodes if "morning_light" in n["id"]],
            key=lambda x: x["id"],
        )
        for i in range(len(mornings) - 1):
            links.append(
                {
                    "source": mornings[i]["id"],
                    "target": mornings[i + 1]["id"],
                    "weight": 3,
                }
            )

        # if constellation_edges table exists, include real edges
        if has_edges:
            placeholders = ",".join("?" for _ in seen_ids)
            q = (
                f"SELECT source_node_id, target_node_id, weight "
                f"FROM constellation_edges "
                f"WHERE source_node_id IN ({placeholders}) "
                f"   OR target_node_id IN ({placeholders})"
            )
            id_list = list(seen_ids)
            for er in conn.execute(q, id_list + id_list).fetchall():
                if er[0] in seen_ids and er[1] in seen_ids:
                    links.append(
                        {"source": er[0], "target": er[1], "weight": er[2]}
                    )

        return {
            "meta": {
                "total_constellations": total,
                "returned_nodes": len(nodes),
                "has_edges_table": has_edges,
                "source": "sages_constellations.db",
            },
            "nodes": nodes,
            "links": links,
        }
    finally:
        conn.close()


@app.get("/api/constellations/stats")
async def constellation_stats():
    """Summary statistics for the constellation database."""
    if not os.path.exists(DB_PATH):
        return {"error": "database not found"}

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT COUNT(*), AVG(dopamine), AVG(cortisol), "
            "       SUM(CASE WHEN pinned = 1 THEN 1 ELSE 0 END), "
            "       MIN(timestamp), MAX(timestamp) "
            "FROM sages_constellations"
        ).fetchone()
        return {
            "total": row[0],
            "avg_dopamine": round(row[1], 3) if row[1] else 0,
            "avg_cortisol": round(row[2], 3) if row[2] else 0,
            "pinned": row[3] or 0,
            "has_edges_table": conn.execute(
                "SELECT 1 FROM sqlite_master WHERE name='constellation_edges'"
            ).fetchone()
            is not None,
        }
    finally:
        conn.close()


@app.post("/api/constellations/backfill-edges")
async def backfill_edges(
    weight_threshold: float = 0.6,
    k_neighbors: int = 5,
    dry_run: bool = False,
):
    """
    Build constellation_edges via cosine similarity of resonance_vec embeddings.
    Maps rowids → node_ids through resonance_metadata and sages_constellations.
    
    Query params:
      weight_threshold: minimum similarity weight to keep (default 0.6)
      k_neighbors: number of nearest neighbors per embedding (default 5)
      dry_run: if true, return predicted edges without writing (default false)
    """
    if not os.path.exists(DB_PATH):
        return {"error": "database not found"}

    conn = sqlite3.connect(DB_PATH)
    conn.enable_load_extension(True)
    try:
        import sqlite_vec
        sqlite_vec.load(conn)
    except Exception as e:
        conn.close()
        return {"error": f"sqlite-vec extension unavailable: {e}"}

    try:
        # Verify resonance_vec exists
        vec_count = conn.execute("SELECT COUNT(*) FROM resonance_vec").fetchone()[0]
        if vec_count == 0:
            conn.close()
            return {"error": "resonance_vec table is empty"}

        # Create table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS constellation_edges ("
            "    source_node_id TEXT NOT NULL,"
            "    target_node_id TEXT NOT NULL,"
            "    weight REAL NOT NULL,"
            "    edge_type TEXT NOT NULL,"
            "    timestamp INTEGER NOT NULL,"
            "    PRIMARY KEY (source_node_id, target_node_id, edge_type)"
            ")"
        )

        if not dry_run:
            conn.execute(
                "DELETE FROM constellation_edges WHERE edge_type = 'embedding_similarity'"
            )
            conn.commit()

        # Map rowid → node_id via resonance_metadata and sages_constellations
        mapping: dict[int, str] = {}
        for row in conn.execute(
            "SELECT r.rowid, s.node_id "
            "FROM resonance_metadata m "
            "JOIN sages_constellations s ON m.phi_index = s.phi_index "
            "JOIN resonance_vec r ON m.rowid = r.rowid"
        ):
            mapping[row[0]] = row[1]

        # Fetch all embeddings
        embeddings = conn.execute(
            "SELECT rowid, embedding FROM resonance_vec"
        ).fetchall()

        edges: list[tuple] = []
        now = int(time.time() * 1000)

        for i, (rowid, emb) in enumerate(embeddings):
            if rowid not in mapping:
                continue
            source_node = mapping[rowid]

            neighbors = conn.execute(
                "SELECT rowid, vec_distance_cosine(embedding, ?) as dist "
                "FROM resonance_vec WHERE rowid != ? ORDER BY dist ASC LIMIT ?",
                (emb, rowid, k_neighbors),
            ).fetchall()

            for n_rowid, dist in neighbors:
                if n_rowid not in mapping:
                    continue
                target_node = mapping[n_rowid]
                weight = 1.0 - min(max(dist / 2.0, 0.0), 1.0)
                if weight > weight_threshold:
                    edges.append(
                        (source_node, target_node, weight,
                         "embedding_similarity", now)
                    )

        if not dry_run:
            conn.executemany(
                "INSERT OR REPLACE INTO constellation_edges "
                "(source_node_id, target_node_id, weight, edge_type, timestamp) "
                "VALUES (?, ?, ?, ?, ?)",
                edges,
            )
            conn.commit()

        return {
            "ok": True,
            "dry_run": dry_run,
            "embeddings_total": vec_count,
            "mapped": len(mapping),
            "edges_created": len(edges),
            "weight_threshold": weight_threshold,
            "k_neighbors": k_neighbors,
        }
    finally:
        conn.close()


@app.get("/api/constellations/journal")
async def constellation_journal(
    limit: int = 100,
    date_from: str = None,
    date_to: str = None,
):
    """
    Return journal entries from sages_constellations, joined with
    resonance_metadata for the full text content.

    Query params:
      limit: max entries (default 100)
      date_from: ISO date filter start (e.g. 2026-08-01)
      date_to: ISO date filter end
    """
    if not os.path.exists(DB_PATH):
        return {"entries": [], "meta": {"error": "database not found"}}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        has_rm = (
            conn.execute(
                "SELECT 1 FROM sqlite_master "
                "WHERE name='resonance_metadata' AND type='table'"
            ).fetchone()
            is not None
        )

        query = (
            "SELECT sc.phi_index, sc.node_id, sc.data, sc.compressed,"
            "       sc.timestamp, sc.dopamine, sc.cortisol, sc.pinned,"
            "       sc.provenance"
        )
        if has_rm:
            query += ", rm.text_content"
        query += " FROM sages_constellations sc"
        if has_rm:
            query += " LEFT JOIN resonance_metadata rm ON sc.phi_index = rm.phi_index"

        where_parts = []
        params: list = []
        if date_from:
            # Convert date string to millisecond timestamp
            try:
                from_dt = int(
                    __import__("datetime").datetime.strptime(
                        date_from, "%Y-%m-%d"
                    ).timestamp() * 1000
                )
                where_parts.append("sc.timestamp >= ?")
                params.append(from_dt)
            except ValueError:
                pass
        if date_to:
            try:
                to_dt = int(
                    __import__("datetime").datetime.strptime(
                        date_to, "%Y-%m-%d"
                    ).timestamp() * 1000
                ) + 86_400_000  # end of day
                where_parts.append("sc.timestamp < ?")
                params.append(to_dt)
            except ValueError:
                pass

        if where_parts:
            query += " WHERE " + " AND ".join(where_parts)

        query += " ORDER BY sc.timestamp DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()

        entries: list[dict] = []
        for row in rows:
            # Extract display text from data blob
            display_text = ""
            raw = row["data"]
            if row["compressed"]:
                display_text = "[compressed entry]"
            elif raw:
                try:
                    text = raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)
                    # Unwrap JSON envelope
                    try:
                        j = json.loads(text)
                        display_text = j.get("data", text)
                    except (json.JSONDecodeError, TypeError):
                        display_text = text
                except Exception:
                    display_text = "[decode error]"

            # Fallback text_content from resonance_metadata
            alt_text = None
            if has_rm and "text_content" in row.keys():
                tc = row["text_content"]
                if tc and tc != display_text:
                    alt_text = tc

            # Convert timestamp to date string
            ts = row["timestamp"]
            date_str = ""
            if ts:
                try:
                    date_str = __import__("datetime").datetime.fromtimestamp(
                        ts / 1000
                    ).strftime("%Y-%m-%d")
                except (ValueError, OSError):
                    date_str = str(ts)

            entries.append({
                "phi_index": row["phi_index"],
                "node_id": row["node_id"],
                "display_text": display_text,
                "alt_text": alt_text,
                "timestamp": ts,
                "date": date_str,
                "dopamine": row["dopamine"],
                "cortisol": row["cortisol"],
                "pinned": bool(row["pinned"]),
            })

        total = conn.execute("SELECT COUNT(*) FROM sages_constellations").fetchone()[0]

        return {
            "entries": entries,
            "meta": {
                "total_constellations": total,
                "returned": len(entries),
                "date_from": date_from,
                "date_to": date_to,
                "source": "sages_constellations.db",
            },
        }
    finally:
        conn.close()



# ── Sensor Telemetry ───────────────────────────────────────────────

import threading
import random
import math

_sensor_lock = threading.Lock()
_sensor_state: dict = {
    "emf": 14.2,       # mG
    "temp": -8.4,      # °C (paranormal cold spot baseline)
    "ion": 2847,       # ion/s
    "geo": 48.3,       # µT geomagnetic flux
    "anomaly": 62,     # %
}

# Drift parameters — tuned for realistic paranormal investigation feel
_SENSOR_DRIFT = {
    "emf": 0.3,    # max change per tick
    "temp": 0.15,
    "ion": 50,
    "geo": 0.1,
}

_SENSOR_SPIKE_PROB = 0.02  # 2% chance of anomalous spike per tick


def _start_sensor_tick():
    """Background thread: drift sensor values with occasional spikes."""
    while True:
        time.sleep(0.5)
        with _sensor_lock:
            for key in ("emf", "temp", "ion", "geo"):
                drift = (random.random() - 0.5) * 2 * _SENSOR_DRIFT[key]
                _sensor_state[key] = round(_sensor_state[key] + drift, 1)

            # Anomaly spikes
            if random.random() < _SENSOR_SPIKE_PROB:
                _sensor_state["emf"] += random.uniform(10, 45)
                _sensor_state["temp"] -= random.uniform(3, 8)
                _sensor_state["ion"] += random.randint(300, 1200)
                _sensor_state["anomaly"] = min(100, _sensor_state["anomaly"] + random.randint(8, 25))

            # Clamp
            _sensor_state["emf"] = max(0, min(200, _sensor_state["emf"]))
            _sensor_state["temp"] = max(-50, min(50, _sensor_state["temp"]))
            _sensor_state["ion"] = max(0, min(99999, int(_sensor_state["ion"])))
            _sensor_state["geo"] = max(0, min(100, round(_sensor_state["geo"], 1)))

            # Anomaly decay
            _sensor_state["anomaly"] = max(0, min(100, _sensor_state["anomaly"] - 1))


# Start background sensor loop
_sensor_thread = threading.Thread(target=_start_sensor_tick, daemon=True)
_sensor_thread.start()


class SensorReportRequest(BaseModel):
    emf: float | None = None
    temp: float | None = None
    ion: int | None = None
    geo: float | None = None
    anomaly: int | None = None
    source: str = "external"


@app.get("/api/sensors/live")
async def sensors_live():
    """Return current sensor telemetry. Background-drifted or set via /report."""
    with _sensor_lock:
        return dict(_sensor_state)


@app.post("/api/sensors/report")
async def sensors_report(req: SensorReportRequest):
    """Accept sensor data from external hardware. Partial updates supported."""
    with _sensor_lock:
        if req.emf is not None:
            _sensor_state["emf"] = req.emf
        if req.temp is not None:
            _sensor_state["temp"] = req.temp
        if req.ion is not None:
            _sensor_state["ion"] = req.ion
        if req.geo is not None:
            _sensor_state["geo"] = req.geo
        if req.anomaly is not None:
            _sensor_state["anomaly"] = req.anomaly
    return {"ok": True, "source": req.source, "state": dict(_sensor_state)}


if __name__ == "__main__":
    import uvicorn
    print("NEXUS Vision Server starting on http://localhost:8765")
    print("Endpoints:")
    print("  GET  /health                     — server + Ollama status")
    print("  GET  /models                     — list Ollama models")
    print("  POST /analyze                    — stream vision analysis")
    print("  POST /analyze/snapshot           — full response as JSON")
    print("  GET  /api/constellations/graph   — live memory lattice graph")
    print("  GET  /api/constellations/stats   — constellation DB summary")
    print("  POST /api/constellations/backfill-edges — build embedding similarity edges")
    print("  GET  /api/constellations/journal — journal entries from DB")
    print("  GET  /api/sensors/live           — real-time sensor telemetry")
    print("  POST /api/sensors/report         — accept sensor data from hardware")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
