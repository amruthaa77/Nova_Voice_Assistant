"""Agent mode: Real-time conversational AI using ElevenLabs Agents platform."""

import datetime
import json
import logging
import signal
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

from config import Config

logger = logging.getLogger(__name__)


def is_meaningful_transcript(text: str) -> bool:
    """Check if user transcript contains actual speech words rather than silence or noise punctuation.

    Args:
        text: Raw transcribed string from user callback.

    Returns:
        True if text contains alphanumeric content, False if empty or punctuation-only (e.g. '...').
    """
    if not text:
        return False
    # Strip whitespace and common punctuation (including unicode ellipsis '…')
    stripped = text.strip(" \t\r\n.,;:!?-…\"'()[]{}~`^")
    return len(stripped) > 0


class AgentConversationHandler:
    """Manages the lifecycle, callbacks, and transcript for an ElevenLabs Agent session."""

    def __init__(self, config: Config, verbose: bool = False) -> None:
        self.config = config
        self.verbose = verbose
        self.turns: List[Dict[str, Any]] = []
        self.start_time: datetime.datetime = datetime.datetime.now(datetime.timezone.utc)
        self.end_time: Optional[datetime.datetime] = None
        self.conversation: Optional[Conversation] = None
        self.conversation_id: Optional[str] = None
        self._is_ending: bool = False
        self.disconnected_by_agent: bool = False

    def on_agent_response(self, response: str) -> None:
        """Callback triggered when the agent produces a spoken response."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(f"\nAssistant: {response}")
        self.turns.append({
            "timestamp": now,
            "speaker": "Assistant",
            "text": response,
        })

    def on_user_transcript(self, transcript: str) -> None:
        """Callback triggered when user speech is transcribed."""
        # Requirement: Ignore user transcripts that are empty or only punctuation like "..."
        if not is_meaningful_transcript(transcript):
            if self.verbose:
                logger.debug(f"Ignored noise/punctuation user transcript: {transcript!r}")
            return

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(f"\nYou: {transcript}")
        self.turns.append({
            "timestamp": now,
            "speaker": "You",
            "text": transcript,
        })

    def on_agent_response_correction(self, original: str, corrected: str) -> None:
        """Callback triggered when an interruption or correction occurs mid-stream."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(f"\n[Interrupted] Assistant corrected: '{corrected}'")
        self.turns.append({
            "timestamp": now,
            "speaker": "Assistant (Correction)",
            "text": corrected,
            "original_text": original,
            "interrupted": True,
        })

    def on_latency_measurement(self, latency_ms: int) -> None:
        """Callback triggered with round-trip latency measurements."""
        if self.verbose:
            logger.debug(f"[Latency] Round-trip latency: {latency_ms}ms")

    def on_disconnect(self, details: Any) -> None:
        """Callback triggered when the session disconnects."""
        reason = getattr(details, "reason", "unknown")
        close_reason = getattr(details, "close_reason", "")
        if self.verbose:
            logger.debug(f"Session disconnected (reason={reason}, close_reason={close_reason})")
        if reason == "agent":
            self.disconnected_by_agent = True
            print("\n[Call ended by assistant]")

    def save_transcript(self) -> Path:
        """Save conversation transcript to a timestamped JSON file."""
        self.config.transcripts_dir.mkdir(parents=True, exist_ok=True)
        timestamp_str = self.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"agent_{timestamp_str}.json"
        filepath = self.config.transcripts_dir / filename

        self.end_time = datetime.datetime.now(datetime.timezone.utc)
        duration_secs = (self.end_time - self.start_time).total_seconds()

        data = {
            "session_id": self.conversation_id or "unknown",
            "mode": "agent",
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": round(duration_secs, 2),
            "agent_id": self.config.elevenlabs_agent_id,
            "ended_by": "agent" if self.disconnected_by_agent else "user",
            "turns": self.turns,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return filepath


def run_agent_mode(config: Config, verbose: bool = False) -> None:
    """Execute the ElevenLabs Conversational AI Agent session.

    Exits automatically when the agent ends the call (or max duration is reached),
    while preserving graceful Ctrl+C handling.

    Args:
        config: Application configuration.
        verbose: If True, print detailed debug information.
    """
    config.validate_keys(mode="agent")

    logger.info("Initializing audio interface (PyAudio)...")
    try:
        audio_interface = DefaultAudioInterface()
    except Exception as e:
        logger.error(f"Failed to initialize audio interface: {e}")
        print(
            "\n[Audio Error] Could not access default microphone or speaker.\n"
            "Please check that your microphone is plugged in, enabled, and that\n"
            "audio permissions are granted to your terminal."
        )
        sys.exit(1)

    client = ElevenLabs(api_key=config.elevenlabs_api_key)
    handler = AgentConversationHandler(config=config, verbose=verbose)

    print("\n" + "=" * 60)
    print("  ELEVENLABS VOICE ASSISTANT (Agent Mode)")
    print(f"  Agent ID: {config.elevenlabs_agent_id}")
    print("  Speak into your microphone. Say 'goodbye' or press Ctrl+C to exit.")
    print("=" * 60 + "\n")

    conversation = None
    try:
        conversation = Conversation(
            client=client,
            agent_id=config.elevenlabs_agent_id,
            requires_auth=bool(config.elevenlabs_api_key),
            audio_interface=audio_interface,
            callback_agent_response=handler.on_agent_response,
            callback_user_transcript=handler.on_user_transcript,
            callback_agent_response_correction=handler.on_agent_response_correction,
            callback_latency_measurement=handler.on_latency_measurement,
            callback_disconnect=handler.on_disconnect,
        )
        handler.conversation = conversation

        def handle_sigint(signum, frame):
            if not handler._is_ending:
                handler._is_ending = True
                print("\n[Exiting] Ending conversation session gracefully...")
                try:
                    conversation.end_session()
                except Exception as ex:
                    logger.debug(f"Error ending session during SIGINT: {ex}")

        # Register signal handler for Ctrl+C
        signal.signal(signal.SIGINT, handle_sigint)

        conversation.start_session()
        print("Session connected! Listening...\n")

        # Wait for the session to end cleanly (either via agent end_call or user Ctrl+C)
        # Using timed join loop ensures keyboard interrupts are caught promptly on Windows
        while conversation._thread and conversation._thread.is_alive():
            conversation._thread.join(timeout=0.25)

        # Retrieve final conversation ID from Conversation instance
        conversation_id = conversation.wait_for_session_end()
        handler.conversation_id = conversation_id

    except KeyboardInterrupt:
        if not handler._is_ending:
            handler._is_ending = True
            print("\n[Exiting] Ending conversation session...")
            if conversation:
                conversation.end_session()
                handler.conversation_id = conversation.wait_for_session_end()
    except Exception as e:
        logger.error(f"Error during agent session: {e}")
        print(f"\n[Error] Conversational AI encountered an error: {e}")
    finally:
        # Save transcript and exit cleanly
        try:
            transcript_path = handler.save_transcript()
            print("\nSession finished.")
            if handler.conversation_id:
                print(f"Conversation ID: {handler.conversation_id}")
            print(f"Transcript saved to: {transcript_path}")
        except Exception as e:
            logger.error(f"Failed to save transcript: {e}")
