"""WebSocket endpoint for live synthesis progress updates."""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Active WebSocket connections per chapter
_connections: dict[str, list[WebSocket]] = {}


async def broadcast_progress(chapter_id: str, progress: dict):
    """Broadcast a progress update to all connected clients for a chapter."""
    if chapter_id not in _connections:
        return

    dead_connections = []
    for ws in _connections[chapter_id]:
        try:
            await ws.send_json(progress)
        except Exception:
            dead_connections.append(ws)

    # Clean up dead connections
    for ws in dead_connections:
        _connections[chapter_id].remove(ws)


@router.websocket("/progress/{chapter_id}")
async def websocket_progress(websocket: WebSocket, chapter_id: str):
    """WebSocket endpoint for receiving synthesis progress updates.

    Clients connect to /api/ws/progress/{chapter_id} and receive
    SynthesisProgress JSON messages as the synthesis proceeds.
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for chapter {chapter_id}")

    # Register connection
    if chapter_id not in _connections:
        _connections[chapter_id] = []
    _connections[chapter_id].append(websocket)

    try:
        # Keep connection alive — client can send ping/pong
        while True:
            data = await websocket.receive_text()
            # Echo back as keepalive acknowledgment
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for chapter {chapter_id}")
    finally:
        if chapter_id in _connections:
            if websocket in _connections[chapter_id]:
                _connections[chapter_id].remove(websocket)
            if not _connections[chapter_id]:
                del _connections[chapter_id]
