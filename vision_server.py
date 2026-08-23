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


if __name__ == "__main__":
    import uvicorn
    print("NEXUS Vision Server starting on http://localhost:8765")
    print("Endpoints:")
    print("  GET  /health                   — server + Ollama status")
    print("  GET  /models                   — list Ollama models")
    print("  POST /analyze                  — stream vision analysis")
    print("  POST /analyze/snapshot         — full response as JSON")
    print("  GET  /api/constellations/graph  — live memory lattice graph")
    print("  GET  /api/constellations/stats  — constellation DB summary")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
