from dotenv import load_dotenv
load_dotenv()

# IMPORTANT: setup Phoenix tracing BEFORE importing google.adk so that
# OpenInference auto-instrumentation can wrap ADK at module-import time.
from app.observability.tracing import setup_tracing
setup_tracing()

from app.services.audit_store import init_db as init_audit_db
init_audit_db()

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router as api_router


app = FastAPI(
    title="Agent Auditor",
    description="Adversarial red-team testing for AI agents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve the built React frontend if the /static directory exists (Cloud Run).
# In local dev, Vite's dev server handles the frontend instead.
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    # Serve index.html as fallback for client-side routing
    from fastapi.responses import FileResponse

    @app.get("/")
    async def serve_index():
        return FileResponse(_static_dir / "index.html")

    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
else:
    @app.get("/")
    async def root():
        return {
            "name": "Agent Auditor",
            "description": "Adversarial red-team testing for AI agents",
            "docs": "/docs",
        }
