"""ElevenLabs Speech-to-Text (Scribe) wrapper."""

import io
import logging
import time
from typing import Optional

from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError

from config import Config

logger = logging.getLogger(__name__)


class ElevenLabsSTT:
    """Wrapper for ElevenLabs Speech-to-Text (Scribe) API with retries and exponential backoff."""

    def __init__(self, config: Config) -> None:
        self.config = config
        self.client = ElevenLabs(api_key=config.elevenlabs_api_key)

    def transcribe(
        self,
        wav_audio_bytes: bytes,
        max_retries: int = 3,
        initial_backoff: float = 1.0,
    ) -> str:
        """Transcribe WAV audio bytes to text using ElevenLabs Scribe.

        Args:
            wav_audio_bytes: WAV formatted audio file bytes.
            max_retries: Maximum number of retry attempts on network or rate limit failure.
            initial_backoff: Initial backoff delay in seconds.

        Returns:
            Transcribed text string, or empty string if no speech was detected.

        Raises:
            ValueError: If audio bytes are empty or API key is invalid.
            RuntimeError: If transcription fails after maximum retries.
        """
        if not wav_audio_bytes:
            return ""

        file_tuple = ("audio.wav", io.BytesIO(wav_audio_bytes), "audio/wav")
        backoff = initial_backoff

        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(f"Sending audio to ElevenLabs Scribe STT (attempt {attempt}/{max_retries})...")
                response = self.client.speech_to_text.convert(
                    file=file_tuple,
                    model_id=self.config.stt_model_id,
                    language_code=self.config.language,
                    tag_audio_events=False,
                )

                transcript = getattr(response, "text", "") or ""
                return transcript.strip()

            except ApiError as e:
                status_code = getattr(e, "status_code", None)
                if status_code == 401:
                    raise ValueError(
                        "Authentication failed: Invalid ELEVENLABS_API_KEY. "
                        "Please verify your API key in .env"
                    ) from e
                elif status_code == 429:
                    logger.warning(
                        f"ElevenLabs STT rate limit encountered (429). "
                        f"Retrying in {backoff:.1f}s (attempt {attempt}/{max_retries})..."
                    )
                else:
                    logger.warning(
                        f"ElevenLabs STT API error ({status_code}): {e}. "
                        f"Retrying in {backoff:.1f}s..."
                    )

                if attempt == max_retries:
                    raise RuntimeError(f"ElevenLabs STT failed after {max_retries} attempts: {e}") from e

            except Exception as e:
                logger.warning(
                    f"ElevenLabs STT connection error: {e}. "
                    f"Retrying in {backoff:.1f}s (attempt {attempt}/{max_retries})..."
                )
                if attempt == max_retries:
                    raise RuntimeError(f"ElevenLabs STT network failure after {max_retries} attempts: {e}") from e

            time.sleep(backoff)
            backoff *= 2.0

        return ""
