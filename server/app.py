"""FastAPI application configuration and route registration."""

from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.routes.agent import router as agent_router
from server.routes.health import router as health_router
from server.routes.transcripts import router as transcripts_router
from server.routes.voices import router as voices_router

# Configure logger for backend server
logger = logging.getLogger("server")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    logger.info("FastAPI backend server started successfully.")
    yield
    logger.info("FastAPI backend server shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="ElevenLabs Real-Time Voice Assistant API",
        description=(
            "REST backend providing session signed URLs, voice catalogue, "
            "and conversation transcript access for the React frontend."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS configuration supporting local Vite dev and deployed production (Vercel)
    cors_env = os.getenv("CORS_ORIGINS", "").strip()
    if cors_env and cors_env != "*":
        allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
        allow_creds = True
    else:
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
        allow_creds = True

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=allow_creds,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API route modules
    app.include_router(health_router)
    app.include_router(transcripts_router)
    app.include_router(voices_router)
    app.include_router(agent_router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server.app:app", host="127.0.0.1", port=8000, reload=True)
