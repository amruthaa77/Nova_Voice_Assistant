"""Unit tests for Voice Activity Detection (VAD) and audio calculation logic."""

import io
import wave
import numpy as np
import pytest

from pipeline.audio_io import (
    VoiceActivityDetector,
    calculate_rms,
    float_to_pcm16_wav,
)


def test_calculate_rms_silence():
    """Verify RMS of completely silent audio frames is 0.0."""
    silent_frame = np.zeros(1024, dtype=np.float32)
    assert calculate_rms(silent_frame) == 0.0

    empty_frame = np.array([], dtype=np.float32)
    assert calculate_rms(empty_frame) == 0.0


def test_calculate_rms_constant_signal():
    """Verify RMS calculation with constant amplitude signal."""
    # Constant signal of amplitude A has RMS = A
    amplitude = 0.5
    constant_frame = np.full(1024, amplitude, dtype=np.float32)
    rms = calculate_rms(constant_frame)
    assert pytest.approx(rms, abs=1e-5) == amplitude


def test_calculate_rms_sine_wave():
    """Verify RMS of a sinusoidal waveform: RMS = Amplitude / sqrt(2)."""
    t = np.linspace(0, 1, 16000, endpoint=False)
    freq = 440  # 440 Hz
    amplitude = 0.8
    sine_wave = amplitude * np.sin(2 * np.pi * freq * t).astype(np.float32)
    expected_rms = amplitude / np.sqrt(2)
    assert pytest.approx(calculate_rms(sine_wave), rel=1e-2) == expected_rms


def test_vad_speech_detection_and_silence_timeout():
    """Verify VAD state transitions from waiting -> in speech -> utterance complete."""
    # chunk duration = 0.05s
    vad = VoiceActivityDetector(
        energy_threshold=0.02,
        silence_timeout=0.15,  # 3 chunks of silence to finish
        speech_trigger_duration=0.10,  # 2 chunks of speech to confirm
        chunk_duration=0.05,
    )

    silent_chunk = np.zeros(800, dtype=np.float32)
    speech_chunk = np.full(800, 0.1, dtype=np.float32)  # RMS = 0.1 > 0.02

    # 1. Initial silence: not in speech
    is_speech, is_done = vad.process_frame(silent_chunk)
    assert not is_speech
    assert not is_done
    assert not vad.in_speech

    # 2. First speech frame: triggers counter (1/2), but not yet confirmed
    is_speech, is_done = vad.process_frame(speech_chunk)
    assert not is_speech
    assert not is_done
    assert not vad.in_speech

    # 3. Second speech frame: reaches required 2 frames -> confirmed in_speech!
    is_speech, is_done = vad.process_frame(speech_chunk)
    assert is_speech
    assert not is_done
    assert vad.in_speech

    # 4. Continuing speech frame: stays in speech
    is_speech, is_done = vad.process_frame(speech_chunk)
    assert is_speech
    assert not is_done
    assert vad.in_speech

    # 5. First silence frame during speech: counter = 1/3, still in speech
    is_speech, is_done = vad.process_frame(silent_chunk)
    assert not is_speech
    assert not is_done
    assert vad.in_speech

    # 6. Second silence frame: counter = 2/3, still in speech
    is_speech, is_done = vad.process_frame(silent_chunk)
    assert not is_speech
    assert not is_done
    assert vad.in_speech

    # 7. Third silence frame: reaches silence timeout (3/3) -> utterance complete!
    is_speech, is_done = vad.process_frame(silent_chunk)
    assert not is_speech
    assert is_done
    assert not vad.in_speech


def test_vad_noise_spike_rejection():
    """Verify that a short noise spike does not trigger speech state."""
    vad = VoiceActivityDetector(
        energy_threshold=0.02,
        silence_timeout=0.2,
        speech_trigger_duration=0.15,  # Requires 3 consecutive loud frames
        chunk_duration=0.05,
    )

    silent_chunk = np.zeros(800, dtype=np.float32)
    loud_spike = np.full(800, 0.5, dtype=np.float32)

    # One loud frame followed by silence
    vad.process_frame(loud_spike)
    assert not vad.in_speech

    # Back to silence -> reset speech counter
    vad.process_frame(silent_chunk)
    assert not vad.in_speech
    assert vad.speech_chunks_count == 0


def test_vad_reset():
    """Verify reset clears all counters."""
    vad = VoiceActivityDetector(
        energy_threshold=0.02,
        silence_timeout=0.2,
        speech_trigger_duration=0.05,
        chunk_duration=0.05,
    )
    speech_chunk = np.full(800, 0.1, dtype=np.float32)
    vad.process_frame(speech_chunk)
    assert vad.in_speech

    vad.reset()
    assert not vad.in_speech
    assert vad.speech_chunks_count == 0
    assert vad.silence_chunks_count == 0


def test_float_to_pcm16_wav():
    """Verify converting float frames to PCM16 produces valid WAV bytes."""
    sample_rate = 16000
    frames = [
        np.zeros(1600, dtype=np.float32),
        np.full(1600, 0.5, dtype=np.float32),
    ]

    wav_bytes = float_to_pcm16_wav(frames, sample_rate)
    assert len(wav_bytes) > 44  # WAV header is 44 bytes

    # Read back with standard wave module
    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        assert wf.getframerate() == sample_rate
        assert wf.getnframes() == 3200
