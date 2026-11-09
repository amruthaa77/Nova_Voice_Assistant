"""ElevenLabs Text-to-Speech (TTS) streaming wrapper."""

import logging
import time
from typing import Iterator

from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError

from config import Config

logger = logging.getLogger(__name__)


class ElevenLabsTTS:
    """Wrapper for ElevenLabs streaming Text-to-Speech with low latency."""

    def __init__(self, config: Config, voice_id: str | None = None) -> None:
        self.config = config
        self.client = ElevenLabs(api_key=config.elevenlabs_api_key)
        self.voice_id = voice_id or config.elevenlabs_voice_id

    def stream_speech(
        self,
        text: str,
        max_retries: int = 3,
        initial_backoff: float = 1.0,
    ) -> Iterator[bytes]:
        """Convert text to speech stream yielding raw PCM chunks.

        Args:
            text: Text to synthesize.
            max_retries: Max attempts on transient API errors.
            initial_backoff: Initial backoff delay in seconds.

        Yields:
            Raw PCM audio chunks (16-bit, mono, at config.audio.output_sample_rate).

        Raises:
            ValueError: If voice ID or API key is invalid.
            RuntimeError: If stream creation fails after retries.
        """
        if not text.strip():
            return

        backoff = initial_backoff

        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(
                    f"Initiating TTS stream with model '{self.config.tts_model_id}' "
                    f"and voice '{self.voice_id}' (attempt {attempt}/{max_retries})..."
                )
                audio_stream = self.client.text_to_speech.stream(
                    voice_id=self.voice_id,
                    text=text,
                    model_id=self.config.tts_model_id,
                    output_format=self.config.tts_output_format,
                )

                for chunk in audio_stream:
                    if chunk and isinstance(chunk, bytes):
                        yield chunk
                return

            except ApiError as e:
                status_code = getattr(e, "status_code", None)
                if status_code == 401:
                    raise ValueError(
                        "Authentication failed: Invalid ELEVENLABS_API_KEY. "
                        "Please verify your API key in .env"
                    ) from e
                elif status_code == 404:
                    raise ValueError(
                        f"Voice ID '{self.voice_id}' not found. "
                        "Run `python main.py --list-voices` to see valid voice IDs."
                    ) from e
                elif status_code == 429:
                    logger.warning(
                        f"ElevenLabs TTS rate limit reached (429). Retrying in {backoff:.1f}s "
                        f"(attempt {attempt}/{max_retries})..."
                    )
                else:
                    logger.warning(
                        f"ElevenLabs TTS error ({status_code}): {e}. Retrying in {backoff:.1f}s..."
                    )

                if attempt == max_retries:
                    raise RuntimeError(f"ElevenLabs TTS failed after {max_retries} attempts: {e}") from e

            except Exception as e:
                logger.warning(
                    f"ElevenLabs TTS connection error: {e}. Retrying in {backoff:.1f}s "
                    f"(attempt {attempt}/{max_retries})..."
                )
                if attempt == max_retries:
                    raise RuntimeError(f"ElevenLabs TTS network failure after {max_retries} attempts: {e}") from e

            time.sleep(backoff)
            backoff *= 2.0
