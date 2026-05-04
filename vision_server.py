"""
NEXUS Vision Server
Accepts image frames + prompts, forwards to Ollama multimodal API, streams back.
Run: python3 vision_server.py
Default port: 8765
"""

import base64
import io
import json
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


if __name__ == "__main__":
    import uvicorn
    print("NEXUS Vision Server starting on http://localhost:8765")
    print("Endpoints:")
    print("  GET  /health            — server + Ollama status")
    print("  GET  /models            — list Ollama models")
    print("  POST /analyze           — stream vision analysis")
    print("  POST /analyze/snapshot  — full response as JSON")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
