"""Agent session management endpoints."""

import logging
from typing import Optional

from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from config import load_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["Agent"])


class SignedUrlResponse(BaseModel):
    """Temporary signed URL response for browser-based Conversational AI sessions."""

    signed_url: str = Field(..., description="Single-use signed WebSocket URL for ElevenLabs Conversational AI")
    agent_id: str = Field(..., description="Target ElevenLabs Agent ID")


@router.post(
    "/signed-url",
    response_model=SignedUrlResponse,
    summary="Generate Agent Signed URL",
    description="Generates an ephemeral, secure signed WebSocket URL for the configured Conversational AI agent.",
)
def create_agent_signed_url() -> SignedUrlResponse:
    """Generate temporary signed URL for client WebSocket connection without exposing secret keys."""
    config = load_config()

    if not config.elevenlabs_api_key or config.elevenlabs_api_key.startswith("your_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ELEVENLABS_API_KEY is not configured on the server. Please check your .env file.",
        )

    if not config.elevenlabs_agent_id or config.elevenlabs_agent_id.startswith("your_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ELEVENLABS_AGENT_ID is not configured. Please run `python setup_agent.py` first.",
        )

    try:
        client = ElevenLabs(api_key=config.elevenlabs_api_key)

        # Proactively check available ElevenLabs character quota
        try:
            sub = client.user.subscription.get()
            char_count = getattr(sub, "character_count", 0) or 0
            char_limit = getattr(sub, "character_limit", 0) or 0
            remaining = char_limit - char_count
            if remaining <= 100:
                logger.warning(
                    f"ElevenLabs character quota exhausted: {char_count}/{char_limit} characters used."
                )
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=(
                        f"ElevenLabs character quota exhausted ({char_count:,} / {char_limit:,} used on Free Tier). "
                        "Please update ELEVENLABS_API_KEY in .env with a new key or upgrade your subscription."
                    ),
                )
        except HTTPException:
            raise
        except Exception as q_err:
            logger.debug(f"Quota pre-check skipped: {q_err}")

        # Call official ElevenLabs SDK method for generating signed conversation URLs
        response = client.conversational_ai.conversations.get_signed_url(
            agent_id=config.elevenlabs_agent_id,
        )

        signed_url = getattr(response, "signed_url", None)
        if not signed_url:
            raise ValueError("No signed_url returned in ElevenLabs response.")

        return SignedUrlResponse(
            signed_url=signed_url,
            agent_id=config.elevenlabs_agent_id,
        )

    except HTTPException:
        raise
    except ApiError as e:
        status_code = getattr(e, "status_code", None)
        if status_code == 401:
            logger.error("ElevenLabs authentication failed during signed URL generation.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: Invalid ELEVENLABS_API_KEY.",
            )
        elif status_code == 404:
            logger.error(f"Agent ID '{config.elevenlabs_agent_id}' was not found on ElevenLabs.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent '{config.elevenlabs_agent_id}' not found on ElevenLabs. Run `python setup_agent.py`.",
            )
        elif status_code == 429:
            logger.warning("ElevenLabs rate limit encountered during signed URL generation.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="ElevenLabs API rate limit exceeded. Please try again shortly.",
            )
        else:
            logger.error(f"ElevenLabs API error generating signed URL ({status_code}): {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ElevenLabs service returned error ({status_code}).",
            )

    except Exception as e:
        logger.error(f"Unexpected error generating signed URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate signed agent URL: {str(e)}",
        )
