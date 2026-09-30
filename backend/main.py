"""
Main FastAPI application entry point
"""
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from database import create_tables, SessionLocal, init_default_settings
from scheduler import start_scheduler, stop_scheduler
from routes import auth, dashboard, settings
import telegram_client as tc
import logging

# Connected WebSocket clients
ws_clients: list[WebSocket] = []
logger = logging.getLogger(__name__)


async def broadcast_to_all(message: dict):
    """Send a message to all connected WebSocket clients."""
    disconnected = []
    for ws in ws_clients:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        ws_clients.remove(ws)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    start_scheduler()
    tc.broadcast_callback = broadcast_to_all
    asyncio.create_task(tc.client_manager.prewarm_qr())
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title="Scoutrix — Telegram Lead Intelligence",
    description="AI-powered Telegram scouting platform for lead generation and outreach",
    version="2.0.0",
    lifespan=lifespan
)

# CORS - allow frontend (file:// and localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(settings.router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    await websocket.send_text(json.dumps({"type": "connected", "message": "Connected to Scoutrix live feed"}))
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back (client can also send commands via WS in future)
            await websocket.send_text(json.dumps({"type": "ack", "received": data}))
    except WebSocketDisconnect:
        if websocket in ws_clients:
            ws_clients.remove(websocket)


# Serve frontend static files
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
logger.info(f"Frontend path: {frontend_path}")
logger.info(f"Exists: {os.path.exists(frontend_path)}")
if os.path.exists(frontend_path):
    logger.info("Mounting frontend at /")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "IPTV Scout API is running. Frontend not found.", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
