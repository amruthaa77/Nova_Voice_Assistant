"""Transcript history management endpoints."""

import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from config import load_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])


class TranscriptSummary(BaseModel):
    """Summary of a stored conversation transcript."""

    filename: str = Field(..., description="Transcript JSON filename")
    mode: str = Field(..., description="Assistant mode: 'agent' or 'pipeline'")
    start_time: Optional[str] = Field(None, description="Session ISO start timestamp")
    end_time: Optional[str] = Field(None, description="Session ISO end timestamp")
    duration_seconds: Optional[float] = Field(None, description="Total conversation duration in seconds")
    total_turns: int = Field(0, description="Total number of speech turns recorded")


class TranscriptTurnInput(BaseModel):
    """Input payload for a single speech turn."""

    speaker: str = Field(..., description="Speaker identifier ('You' or 'Assistant')")
    text: str = Field(..., description="Spoken turn content")
    timestamp: Optional[str] = Field(None, description="ISO timestamp")
    interrupted: Optional[bool] = Field(False, description="Whether assistant turn was interrupted")
    latency_ms: Optional[float] = Field(None, description="Response latency in ms")


class SaveTranscriptRequest(BaseModel):
    """Payload to save a completed browser conversation transcript."""

    session_id: Optional[str] = Field(None, description="ElevenLabs conversation ID")
    mode: str = Field("agent", description="Conversation mode (default: 'agent')")
    start_time: str = Field(..., description="Session start ISO timestamp")
    end_time: Optional[str] = Field(None, description="Session end ISO timestamp")
    duration_seconds: Optional[float] = Field(None, description="Session duration in seconds")
    agent_id: Optional[str] = Field(None, description="Target ElevenLabs Agent ID")
    ended_by: Optional[str] = Field("user", description="Who ended the session ('user' or 'agent')")
    turns: List[TranscriptTurnInput] = Field(..., description="List of speech turns recorded")


class SaveTranscriptResponse(BaseModel):
    """Response confirming transcript persistence."""

    status: str = Field("saved", description="Operation status")
    filename: str = Field(..., description="Safe filename of saved transcript JSON")
    total_turns: int = Field(..., description="Total speech turns saved")


def get_transcripts_directory() -> Path:
    """Resolve and ensure the transcripts directory."""
    config = load_config()
    directory = config.transcripts_dir.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


@router.get(
    "",
    response_model=List[TranscriptSummary],
    summary="List Transcripts",
    description="Returns a list of all stored conversation transcripts, sorted newest first.",
)
def list_transcripts() -> List[TranscriptSummary]:
    """List all saved conversation transcripts."""
    transcripts_dir = get_transcripts_directory()
    summaries: List[TranscriptSummary] = []

    for file_path in transcripts_dir.glob("*.json"):
        if not file_path.is_file():
            continue

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data: Dict[str, Any] = json.load(f)

            # Safely extract fields with fallbacks for malformed or minimal files
            mode = data.get("mode") or ("agent" if file_path.name.startswith("agent_") else "pipeline")
            start_time = data.get("start_time")
            end_time = data.get("end_time")
            duration_seconds = data.get("duration_seconds")
            turns = data.get("turns") or []
            total_turns = data.get("total_turns", len(turns))

            summaries.append(
                TranscriptSummary(
                    filename=file_path.name,
                    mode=mode,
                    start_time=start_time,
                    end_time=end_time,
                    duration_seconds=duration_seconds,
                    total_turns=total_turns,
                )
            )

        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Skipping malformed or inaccessible transcript '{file_path.name}': {e}")
            continue

    # Sort newest first by start_time, falling back to filename (which contains timestamp)
    summaries.sort(
        key=lambda item: item.start_time or item.filename,
        reverse=True,
    )
    return summaries


@router.get(
    "/{filename}",
    response_model=Dict[str, Any],
    summary="Get Transcript Details",
    description="Retrieves the complete transcript JSON payload for a given filename.",
)
def get_transcript(filename: str) -> Dict[str, Any]:
    """Retrieve full transcript by filename with path traversal protection."""
    # Basic filename sanitization to reject separators and relative path components
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal sequences are not permitted.",
        )

    if not filename.endswith(".json"):
        filename = f"{filename}.json"

    transcripts_dir = get_transcripts_directory()
    target_path = (transcripts_dir / filename).resolve()

    # Enforce strict boundary check: resolved path must stay within transcripts directory
    try:
        target_path.relative_to(transcripts_dir)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access denied: path traverses outside transcripts directory.",
        )

    if not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transcript '{filename}' not found.",
        )

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Transcript '{filename}' contains invalid JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcript file contains corrupted JSON data.",
        )


@router.post(
    "",
    response_model=SaveTranscriptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save Conversation Transcript",
    description="Saves a completed browser conversation transcript to the archives.",
)
def save_transcript(payload: SaveTranscriptRequest) -> SaveTranscriptResponse:
    """Save browser conversation transcript in format compatible with CLI sessions."""
    transcripts_dir = get_transcripts_directory()

    # Determine base timestamp from start_time or current time
    try:
        dt = datetime.datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.datetime.now(datetime.timezone.utc)

    timestamp_str = dt.strftime("%Y%m%d_%H%M%S")
    mode = payload.mode if payload.mode in ("agent", "pipeline") else "agent"
    base_filename = f"{mode}_{timestamp_str}"
    target_filename = f"{base_filename}.json"
    target_path = (transcripts_dir / target_filename).resolve()

    # Prevent overwriting existing transcripts: if already exists, append unique suffix
    counter = 1
    while target_path.exists():
        target_filename = f"{base_filename}_{counter}.json"
        target_path = (transcripts_dir / target_filename).resolve()
        counter += 1

    # Security check: must resolve strictly inside transcripts directory
    try:
        target_path.relative_to(transcripts_dir)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access denied: invalid file path.",
        )

    # Format transcript JSON matching existing CLI format
    data: Dict[str, Any] = {
        "session_id": payload.session_id or f"web_{timestamp_str}",
        "mode": mode,
        "start_time": payload.start_time,
        "end_time": payload.end_time or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "duration_seconds": payload.duration_seconds if payload.duration_seconds is not None else 0.0,
        "agent_id": payload.agent_id,
        "ended_by": payload.ended_by or "user",
        "total_turns": len(payload.turns),
        "turns": [
            {
                "timestamp": turn.timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "speaker": turn.speaker,
                "text": turn.text,
                "interrupted": turn.interrupted or False,
                **({"latency_ms": turn.latency_ms} if turn.latency_ms is not None else {}),
            }
            for turn in payload.turns
        ],
    }

    try:
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Successfully saved transcript '{target_path.name}' with {len(payload.turns)} turns.")
    except OSError as e:
        logger.error(f"Failed to write transcript file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save transcript to disk.",
        )

    return SaveTranscriptResponse(
        status="saved",
        filename=target_path.name,
        total_turns=len(payload.turns),
    )
