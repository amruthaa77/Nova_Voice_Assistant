"""Configuration management for the Voice Virtual Assistant."""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load variables from .env file if present
load_dotenv()

DEFAULT_SYSTEM_PROMPT = (
    "Your name is Nova. You are a friendly, helpful voice assistant. "
    "Speak naturally in a conversational style. Keep your answers short, clear, "
    "and direct (typically 1 to 3 sentences). Do not use markdown formatting, "
    "bullet points, asterisks, numbered lists, emojis, or code blocks, "
    "because your responses will be read aloud over audio. "
    "Never check in on the user or say 'are you still there' during silence. "
    "Only speak when the user speaks. If the input is empty or just noise, stay silent. "
    "When the user says goodbye or indicates they are done, give a one-sentence farewell and then call the end_call tool."
)


@dataclass
class AudioConfig:
    """Audio capture, playback, and VAD parameters."""

    # Input recording (STT & VAD)
    input_sample_rate: int = 16000
    input_channels: int = 1
    chunk_size: int = 1024  # ~64ms per chunk at 16kHz

    # Voice Activity Detection (VAD)
    vad_energy_threshold: float = 0.015  # RMS energy threshold for speech
    vad_silence_timeout: float = 1.2  # Seconds of silence to trigger end of utterance
    vad_speech_trigger_duration: float = 0.25  # Consecutive seconds of speech to confirm utterance
    max_recording_seconds: float = 30.0  # Safeguard maximum utterance duration
    pre_speech_buffer_seconds: float = 0.3  # Buffer to prepend before speech onset

    # Output playback & Barge-in
    output_sample_rate: int = 24000
    output_channels: int = 1
    barge_in_threshold: float = 0.04  # Mic RMS energy threshold to trigger barge-in during playback
    barge_in_consecutive_chunks: int = 3  # Number of loud chunks required to interrupt playback


@dataclass
class Config:
    """Application-wide configuration."""

    # API Keys
    elevenlabs_api_key: Optional[str] = field(
        default_factory=lambda: os.getenv("ELEVENLABS_API_KEY")
    )
    elevenlabs_agent_id: Optional[str] = field(
        default_factory=lambda: os.getenv("ELEVENLABS_AGENT_ID")
    )
    elevenlabs_voice_id: str = field(
        default_factory=lambda: os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
    )
    anthropic_api_key: Optional[str] = field(
        default_factory=lambda: os.getenv("ANTHROPIC_API_KEY")
    )

    # Models & Language
    anthropic_model: str = field(
        default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest")
    )
    tts_model_id: str = field(
        default_factory=lambda: os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")
    )
    tts_output_format: str = "pcm_24000"
    stt_model_id: str = field(
        default_factory=lambda: os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1")
    )
    language: str = field(
        default_factory=lambda: os.getenv("ASSISTANT_LANGUAGE", "en")
    )

    # Agent specifics
    agent_name: str = "Voice Virtual Assistant"
    agent_first_message: str = "Hello! I am your voice assistant. How can I help you today?"
    agent_llm: str = "gemini-2.0-flash"
    agent_turn_timeout: float = 30.0  # Maximum allowed by ElevenLabs API
    max_conversation_seconds: int = field(
        default_factory=lambda: int(os.getenv("MAX_CONVERSATION_SECONDS", "180"))
    )

    # Persona & Memory
    system_prompt: str = field(
        default_factory=lambda: os.getenv("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT)
    )
    history_max_turns: int = 10

    # Paths
    transcripts_dir: Path = field(
        default_factory=lambda: Path(os.getenv("TRANSCRIPTS_DIR", "transcripts"))
    )

    # Audio config
    audio: AudioConfig = field(default_factory=AudioConfig)

    def validate_keys(self, mode: str) -> None:
        """Validate required API keys for the chosen mode.

        Args:
            mode: Either 'agent' or 'pipeline'.

        Raises:
            ValueError: If a required API key is missing.
        """
        if not self.elevenlabs_api_key or self.elevenlabs_api_key.startswith("your_"):
            raise ValueError(
                "Missing ELEVENLABS_API_KEY.\n"
                "Please add your ElevenLabs API key to the .env file:\n"
                "  ELEVENLABS_API_KEY=your_actual_key_here"
            )

        if mode == "agent":
            if not self.elevenlabs_agent_id or self.elevenlabs_agent_id.startswith("your_"):
                raise ValueError(
                    "Missing ELEVENLABS_AGENT_ID.\n"
                    "You can generate one automatically by running:\n"
                    "  python setup_agent.py\n"
                    "Or provide an existing agent ID in your .env file:\n"
                    "  ELEVENLABS_AGENT_ID=your_agent_id_here"
                )
        elif mode == "pipeline":
            if not self.anthropic_api_key or self.anthropic_api_key.startswith("your_"):
                raise ValueError(
                    "Missing ANTHROPIC_API_KEY.\n"
                    "Pipeline mode uses Claude for response generation.\n"
                    "Please add your Anthropic API key to the .env file:\n"
                    "  ANTHROPIC_API_KEY=your_actual_key_here\n"
                    "Alternatively, run in agent mode: python main.py --mode agent"
                )


def load_config() -> Config:
    """Load configuration from environment and defaults."""
    # Ensure transcripts directory exists
    config = Config()
    config.transcripts_dir.mkdir(parents=True, exist_ok=True)
    return config
