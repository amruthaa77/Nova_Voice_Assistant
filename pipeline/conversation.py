"""Conversation history manager and main conversational pipeline loop."""

import datetime
import json
import logging
import signal
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import Config
from pipeline.audio_io import check_audio_devices, play_stream_with_barge_in, record_utterance
from pipeline.llm import ClaudeLLMProvider, LLMProvider
from pipeline.stt import ElevenLabsSTT
from pipeline.tts import ElevenLabsTTS

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manages conversational history, windowed memory for LLM, and transcript serialization."""

    def __init__(self, max_turns: int = 10, transcripts_dir: Path | None = None) -> None:
        self.max_turns = max_turns
        self.transcripts_dir = transcripts_dir or Path("transcripts")
        self.turns: List[Dict[str, Any]] = []
        self.start_time: datetime.datetime = datetime.datetime.now(datetime.timezone.utc)
        self.end_time: Optional[datetime.datetime] = None

    def add_user_message(self, text: str) -> None:
        """Record a user speech turn."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.turns.append({
            "timestamp": now,
            "speaker": "You",
            "role": "user",
            "content": text,
        })

    def add_assistant_message(self, text: str, interrupted: bool = False) -> None:
        """Record an assistant spoken turn."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.turns.append({
            "timestamp": now,
            "speaker": "Assistant",
            "role": "assistant",
            "content": text,
            "interrupted": interrupted,
        })

    def get_llm_messages(self) -> List[Dict[str, str]]:
        """Get the last N turns formatted for LLM consumption.

        Returns:
            List of dictionaries with 'role' ('user' or 'assistant') and 'content'.
        """
        # Take the most recent turns up to max_turns
        recent_turns = self.turns[-self.max_turns:] if len(self.turns) > self.max_turns else self.turns
        return [
            {"role": turn["role"], "content": turn["content"]}
            for turn in recent_turns
            if "role" in turn and "content" in turn
        ]

    def save_transcript(self, mode: str = "pipeline", metadata: Optional[Dict[str, Any]] = None) -> Path:
        """Save full conversation history to a timestamped JSON file.

        Args:
            mode: Operating mode ('pipeline' or 'agent').
            metadata: Additional metadata dictionary to include in the output.

        Returns:
            Path to the saved transcript JSON file.
        """
        self.transcripts_dir.mkdir(parents=True, exist_ok=True)
        timestamp_str = self.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"{mode}_{timestamp_str}.json"
        filepath = self.transcripts_dir / filename

        self.end_time = datetime.datetime.now(datetime.timezone.utc)
        duration = (self.end_time - self.start_time).total_seconds()

        payload = {
            "mode": mode,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": round(duration, 2),
            "total_turns": len(self.turns),
            "metadata": metadata or {},
            "turns": [
                {
                    "timestamp": turn["timestamp"],
                    "speaker": turn["speaker"],
                    "text": turn["content"],
                    "interrupted": turn.get("interrupted", False),
                }
                for turn in self.turns
            ],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        return filepath


def run_pipeline_mode(
    config: Config,
    voice_id: Optional[str] = None,
    llm_provider: Optional[LLMProvider] = None,
    verbose: bool = False,
) -> None:
    """Execute the modular STT -> LLM -> TTS pipeline conversation loop.

    Args:
        config: Application configuration.
        voice_id: Optional override for ElevenLabs Voice ID.
        llm_provider: Optional custom LLMProvider instance (defaults to ClaudeLLMProvider).
        verbose: If True, prints extra debugging output.
    """
    config.validate_keys(mode="pipeline")

    # Audio device pre-flight check
    try:
        check_audio_devices()
    except RuntimeError as e:
        print(f"\n[Audio Hardware Error] {e}")
        sys.exit(1)

    target_voice_id = voice_id or config.elevenlabs_voice_id
    stt = ElevenLabsSTT(config=config)
    llm = llm_provider or ClaudeLLMProvider(config=config)
    tts = ElevenLabsTTS(config=config, voice_id=target_voice_id)
    manager = ConversationManager(
        max_turns=config.history_max_turns,
        transcripts_dir=config.transcripts_dir,
    )

    stop_event = threading.Event()

    print("\n" + "=" * 65)
    print("  ELEVENLABS VOICE ASSISTANT (Pipeline Mode)")
    print(f"  Voice ID: {target_voice_id}")
    print(f"  STT: ElevenLabs Scribe ({config.stt_model_id})")
    print(f"  LLM: Claude ({config.anthropic_model})")
    print(f"  TTS: ElevenLabs Flash ({config.tts_model_id})")
    print("  Speak into your mic. You can interrupt the assistant at any time.")
    print("  Press Ctrl+C to finish and save transcript.")
    print("=" * 65 + "\n")

    def handle_sigint(signum, frame):
        stop_event.set()
        print("\n[Exiting] Stopping conversation loop...")

    signal.signal(signal.SIGINT, handle_sigint)

    # Initial greeting from assistant
    greeting = config.agent_first_message
    print(f"Assistant: {greeting}")
    manager.add_assistant_message(greeting)

    try:
        audio_stream = tts.stream_speech(greeting)
        play_stream_with_barge_in(audio_stream, config.audio, stop_event=stop_event)
    except Exception as e:
        logger.warning(f"Could not play initial greeting: {e}")

    try:
        while not stop_event.is_set():
            print("\n[Listening...] Speak into your microphone...")
            audio_bytes = record_utterance(config.audio, stop_event=stop_event)

            if stop_event.is_set():
                break

            if not audio_bytes:
                continue

            print("[Processing speech...]")
            try:
                transcript = stt.transcribe(audio_bytes)
            except Exception as e:
                logger.error(f"STT Error: {e}")
                print(f"[Speech recognition error: {e}]")
                continue

            if not transcript:
                print("[No clear speech detected, listening again...]")
                continue

            print(f"\nYou: {transcript}")
            manager.add_user_message(transcript)

            if stop_event.is_set():
                break

            print("[Generating response...]")
            try:
                llm_messages = manager.get_llm_messages()
                reply = llm.generate_reply(llm_messages, config.system_prompt)
            except Exception as e:
                logger.error(f"LLM Error: {e}")
                print(f"[Assistant generation error: {e}]")
                continue

            print(f"\nAssistant: {reply}")

            if stop_event.is_set():
                manager.add_assistant_message(reply)
                break

            # Convert reply to speech and play with barge-in support
            try:
                audio_stream = tts.stream_speech(reply)
                completed_normally = play_stream_with_barge_in(
                    audio_stream, config.audio, stop_event=stop_event
                )
                interrupted = not completed_normally
                manager.add_assistant_message(reply, interrupted=interrupted)

                if interrupted:
                    print("\n[Interrupted] Playback stopped. Listening to you...")

            except Exception as e:
                logger.error(f"TTS Playback Error: {e}")
                print(f"[Audio playback error: {e}]")
                manager.add_assistant_message(reply)

    except KeyboardInterrupt:
        print("\n[Interrupted by Ctrl+C]")
    finally:
        metadata = {
            "voice_id": target_voice_id,
            "stt_model": config.stt_model_id,
            "llm_model": config.anthropic_model,
            "tts_model": config.tts_model_id,
        }
        try:
            transcript_file = manager.save_transcript(mode="pipeline", metadata=metadata)
            print(f"\nConversation finished.")
            print(f"Transcript saved to: {transcript_file}")
        except Exception as e:
            logger.error(f"Failed to save transcript: {e}")
