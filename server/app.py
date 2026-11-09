"""FastAPI application configuration and route registration."""

from contextlib import asynccontextmanager
import logging
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

    # CORS configuration restricted to local React Vite frontend
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
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
