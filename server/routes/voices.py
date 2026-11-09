"""Voice catalogue endpoint reusing ElevenLabs client."""

import logging
from typing import Dict, List, Optional

from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from config import load_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voices", tags=["Voices"])


class VoiceItem(BaseModel):
    """Voice metadata model for frontend consumption."""

    voice_id: str = Field(..., description="Unique ElevenLabs Voice ID")
    name: str = Field(..., description="Display name of the voice")
    category: Optional[str] = Field(None, description="Category (premade, cloned, generated)")
    description: Optional[str] = Field(None, description="Short voice description or accent summary")
    labels: Optional[Dict[str, str]] = Field(default_factory=dict, description="Voice tags and labels")
    preview_url: Optional[str] = Field(None, description="URL to sample audio preview")


class VoicesResponse(BaseModel):
    """List of available voices."""

    total: int = Field(..., description="Total count of available voices")
    voices: List[VoiceItem] = Field(..., description="Array of voice objects")


@router.get(
    "",
    response_model=VoicesResponse,
    summary="List Voices",
    description="Fetches all available ElevenLabs voices for the configured account.",
)
def get_voices() -> VoicesResponse:
    """Retrieve available ElevenLabs voices without exposing credentials."""
    config = load_config()

    if not config.elevenlabs_api_key or config.elevenlabs_api_key.startswith("your_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ELEVENLABS_API_KEY is not configured on the server. Please update .env",
        )

    try:
        client = ElevenLabs(api_key=config.elevenlabs_api_key)
        response = client.voices.get_all()
        voices_list = response.voices or []

        items: List[VoiceItem] = []
        for v in voices_list:
            items.append(
                VoiceItem(
                    voice_id=v.voice_id,
                    name=v.name or "Unnamed Voice",
                    category=v.category,
                    description=v.description,
                    labels=v.labels or {},
                    preview_url=v.preview_url,
                )
            )

        return VoicesResponse(total=len(items), voices=items)

    except ApiError as e:
        status_code = getattr(e, "status_code", None)
        if status_code == 401:
            logger.error("ElevenLabs authentication failed during voice fetch.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: Invalid ELEVENLABS_API_KEY.",
            )
        elif status_code == 429:
            logger.warning("ElevenLabs rate limit encountered during voice fetch.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="ElevenLabs API rate limit exceeded. Please try again shortly.",
            )
        else:
            logger.error(f"ElevenLabs API error fetching voices ({status_code}): {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ElevenLabs service returned an error ({status_code}).",
            )

    except Exception as e:
        logger.error(f"Unexpected error retrieving voices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve voices: {str(e)}",
        )
