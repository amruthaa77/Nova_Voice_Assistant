"""Audio I/O handling: microphone recording, VAD, and streaming playback with barge-in."""

import collections
import io
import logging
import threading
import time
import wave
from typing import Iterator, Optional, Tuple

import numpy as np
import sounddevice as sd

from config import AudioConfig

logger = logging.getLogger(__name__)


def check_audio_devices() -> None:
    """Verify that microphone and speaker devices are available.

    Raises:
        RuntimeError: If either microphone or speaker is missing or inaccessible.
    """
    try:
        devices = sd.query_devices()
        if not devices:
            raise RuntimeError("No audio devices detected on the system.")

        default_input = sd.default.device[0]
        default_output = sd.default.device[1]

        # Check default input
        if default_input == -1 or default_input is None:
            # Check if any input device exists
            has_input = any(d.get("max_input_channels", 0) > 0 for d in devices)
            if not has_input:
                raise RuntimeError("No microphone (input device) found.")

        # Check default output
        if default_output == -1 or default_output is None:
            has_output = any(d.get("max_output_channels", 0) > 0 for d in devices)
            if not has_output:
                raise RuntimeError("No speaker/headphones (output device) found.")

    except Exception as e:
        logger.error(f"Audio device query failed: {e}")
        raise RuntimeError(
            f"Failed to access audio hardware: {e}\n"
            "Please verify that microphone and audio drivers are working correctly."
        ) from e


def calculate_rms(frame: np.ndarray) -> float:
    """Calculate the Root Mean Square (RMS) energy of an audio frame.

    Args:
        frame: 1D or 2D numpy array of audio samples (float32 between -1.0 and 1.0).

    Returns:
        RMS energy as a float >= 0.0.
    """
    if frame.size == 0:
        return 0.0
    samples = frame.astype(np.float32).flatten()
    return float(np.sqrt(np.mean(samples ** 2)))


class VoiceActivityDetector:
    """Energy-based Voice Activity Detector (VAD) with silence timeout."""

    def __init__(
        self,
        energy_threshold: float = 0.015,
        silence_timeout: float = 1.2,
        speech_trigger_duration: float = 0.25,
        chunk_duration: float = 0.064,  # seconds per frame chunk
    ) -> None:
        """Initialize VAD parameters.

        Args:
            energy_threshold: RMS energy threshold above which a frame is considered speech.
            silence_timeout: Seconds of silence after speech before ending utterance.
            speech_trigger_duration: Consecutive seconds of speech required to confirm start.
            chunk_duration: Duration of each incoming audio chunk in seconds.
        """
        self.energy_threshold = energy_threshold
        self.silence_timeout = silence_timeout
        self.speech_trigger_duration = speech_trigger_duration
        self.chunk_duration = chunk_duration

        self.consecutive_speech_chunks_required = max(
            1, int(round(self.speech_trigger_duration / self.chunk_duration))
        )
        self.silence_chunks_timeout = max(
            1, int(round(self.silence_timeout / self.chunk_duration))
        )

        self.reset()

    def reset(self) -> None:
        """Reset internal state machine."""
        self.in_speech: bool = False
        self.speech_chunks_count: int = 0
        self.silence_chunks_count: int = 0

    def process_frame(self, frame: np.ndarray) -> Tuple[bool, bool]:
        """Process an incoming audio chunk and return speech detection status.

        Args:
            frame: Numpy audio frame chunk.

        Returns:
            Tuple of (is_speech_frame, is_utterance_complete).
        """
        rms = calculate_rms(frame)
        is_above_threshold = rms >= self.energy_threshold

        if not self.in_speech:
            if is_above_threshold:
                self.speech_chunks_count += 1
                if self.speech_chunks_count >= self.consecutive_speech_chunks_required:
                    self.in_speech = True
                    self.silence_chunks_count = 0
                    return (True, False)
            else:
                self.speech_chunks_count = 0
            return (False, False)
        else:
            # Currently inside confirmed speech
            if is_above_threshold:
                self.silence_chunks_count = 0
                return (True, False)
            else:
                self.silence_chunks_count += 1
                if self.silence_chunks_count >= self.silence_chunks_timeout:
                    # Utterance finished
                    self.in_speech = False
                    return (False, True)
                return (False, False)


def float_to_pcm16_wav(frames: list[np.ndarray], sample_rate: int) -> bytes:
    """Convert a sequence of float32 numpy frames to 16-bit PCM WAV bytes in memory.

    Args:
        frames: List of 1D float32 audio arrays (-1.0 to 1.0).
        sample_rate: Audio sampling rate (e.g. 16000).

    Returns:
        WAV formatted audio file bytes.
    """
    if not frames:
        return b""

    concatenated = np.concatenate(frames).flatten()
    # Clip and convert to 16-bit signed PCM
    clipped = np.clip(concatenated, -1.0, 1.0)
    int16_samples = (clipped * 32767).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit = 2 bytes
        wf.setframerate(sample_rate)
        wf.writeframes(int16_samples.tobytes())

    return buffer.getvalue()


def record_utterance(
    audio_config: AudioConfig,
    stop_event: Optional[threading.Event] = None,
) -> Optional[bytes]:
    """Record an utterance from the microphone using VAD.

    Listens continuously until speech is detected, records while speech continues,
    and returns WAV bytes when silence timeout is reached.

    Args:
        audio_config: Audio configuration with thresholds and timings.
        stop_event: Optional threading event to cancel recording.

    Returns:
        WAV bytes of recorded speech, or None if cancelled or empty.
    """
    chunk_samples = audio_config.chunk_size
    sample_rate = audio_config.input_sample_rate
    chunk_duration = chunk_samples / sample_rate

    vad = VoiceActivityDetector(
        energy_threshold=audio_config.vad_energy_threshold,
        silence_timeout=audio_config.vad_silence_timeout,
        speech_trigger_duration=audio_config.vad_speech_trigger_duration,
        chunk_duration=chunk_duration,
    )

    pre_speech_chunks_count = max(
        1, int(audio_config.pre_speech_buffer_seconds / chunk_duration)
    )
    pre_speech_buffer: collections.deque[np.ndarray] = collections.deque(
        maxlen=pre_speech_chunks_count
    )

    recorded_frames: list[np.ndarray] = []
    max_frames = int(audio_config.max_recording_seconds / chunk_duration)

    with sd.InputStream(
        samplerate=sample_rate,
        channels=audio_config.input_channels,
        dtype="float32",
        blocksize=chunk_samples,
    ) as stream:
        logger.debug("Microphone stream opened, listening for speech...")

        while True:
            if stop_event and stop_event.is_set():
                return None

            frame, overflowed = stream.read(chunk_samples)
            if overflowed:
                logger.debug("Input buffer overflowed")

            is_speech_frame, is_utterance_complete = vad.process_frame(frame)

            if not vad.in_speech and not is_utterance_complete:
                # Still waiting for speech start
                pre_speech_buffer.append(frame.copy())
            elif vad.in_speech:
                # Speech underway
                if len(recorded_frames) == 0:
                    # First confirmed speech frame: prepend pre-speech buffer
                    recorded_frames.extend(list(pre_speech_buffer))
                recorded_frames.append(frame.copy())

                if len(recorded_frames) >= max_frames:
                    logger.info("Maximum recording duration reached.")
                    break
            elif is_utterance_complete:
                logger.debug("Utterance complete (silence detected).")
                break

    if not recorded_frames:
        return None

    return float_to_pcm16_wav(recorded_frames, sample_rate)


def play_stream_with_barge_in(
    audio_chunks: Iterator[bytes],
    audio_config: AudioConfig,
    stop_event: Optional[threading.Event] = None,
) -> bool:
    """Play streaming raw PCM audio chunks through speakers with barge-in interruption.

    If the user speaks into the microphone during playback, playback stops immediately.

    Args:
        audio_chunks: Iterator yielding raw 16-bit PCM bytes (mono, output_sample_rate).
        audio_config: Audio configuration for playback and barge-in.
        stop_event: Optional event to cancel playback externally.

    Returns:
        True if playback completed fully without interruption; False if interrupted.
    """
    sample_rate = audio_config.output_sample_rate
    channels = audio_config.output_channels

    barge_in_event = threading.Event()
    consecutive_loud_chunks = 0
    lock = threading.Lock()

    # Input callback to detect user speaking during playback
    def mic_callback(indata, frames, time_info, status):
        nonlocal consecutive_loud_chunks
        if status:
            logger.debug(f"Barge-in input status: {status}")
        rms = calculate_rms(indata)
        if rms >= audio_config.barge_in_threshold:
            with lock:
                consecutive_loud_chunks += 1
                if consecutive_loud_chunks >= audio_config.barge_in_consecutive_chunks:
                    barge_in_event.set()
        else:
            with lock:
                consecutive_loud_chunks = 0

    # Start non-blocking mic listener for barge-in detection
    try:
        mic_stream = sd.InputStream(
            samplerate=audio_config.input_sample_rate,
            channels=audio_config.input_channels,
            dtype="float32",
            blocksize=audio_config.chunk_size,
            callback=mic_callback,
        )
    except Exception as e:
        logger.warning(f"Could not open barge-in mic stream: {e}. Playback will proceed without barge-in.")
        mic_stream = None

    interrupted = False

    try:
        if mic_stream:
            mic_stream.start()

        # Open output stream for raw 16-bit PCM audio chunks
        with sd.RawOutputStream(
            samplerate=sample_rate,
            channels=channels,
            dtype="int16",
        ) as speaker_stream:
            for chunk in audio_chunks:
                # Check for interruption
                if barge_in_event.is_set() or (stop_event and stop_event.is_set()):
                    interrupted = True
                    speaker_stream.abort()
                    break

                if chunk:
                    speaker_stream.write(chunk)

    except Exception as e:
        logger.error(f"Error during audio playback: {e}")
    finally:
        if mic_stream:
            try:
                mic_stream.stop()
                mic_stream.close()
            except Exception:
                pass

    return not interrupted
