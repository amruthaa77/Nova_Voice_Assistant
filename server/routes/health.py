"""Health check endpoint for the voice assistant API."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response payload."""

    application: str = Field(..., description="Application name")
    status: str = Field(..., description="Current operational status")
    version: str = Field(..., description="API version")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns current API server health and version information.",
)
def get_health() -> HealthResponse:
    """Check API server health."""
    return HealthResponse(
        application="ElevenLabs Real-Time Voice Virtual Assistant",
        status="healthy",
        version="1.0.0",
    )
