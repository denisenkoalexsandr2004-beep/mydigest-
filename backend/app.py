from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_TITLE, PERIOD_MAP, TOPIC_MAP
from .models import DigestRequest
from .services import DigestAgent


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title=APP_TITLE)
agent = DigestAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="assets")


@app.get("/api/meta")
async def get_meta() -> dict:
    return {
        "title": APP_TITLE,
        "divisions": TOPIC_MAP,
        "periods": PERIOD_MAP,
    }


@app.post("/api/digest/stream")
async def stream_digest(request: DigestRequest) -> StreamingResponse:
    async def event_stream():
        try:
            async for event in agent.run(request):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as exc:
            error_payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/")
async def root() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str) -> FileResponse:
    target = FRONTEND_DIR / full_path
    if target.exists() and target.is_file():
        return FileResponse(target)
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(FRONTEND_DIR / "index.html")
