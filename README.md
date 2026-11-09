# Real-Time Voice Virtual Assistant (ElevenLabs)

A real-time Python virtual assistant powered by ElevenLabs that listens through your microphone, understands speech, generates intelligent responses, and speaks them back with ultra-low latency and full barge-in (interruption) capabilities.

---

## Architecture Overview

The assistant supports **two selectable operational modes**:

```
                       ┌────────────────────────────────────────┐
                       │          python main.py                │
                       └──────────────────┬─────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [ Mode 1: --mode agent ]                       [ Mode 2: --mode pipeline ]
  ElevenLabs Conversational AI Platform               Modular Pipeline Fallback Architecture
                  │                                               │
   ┌──────────────┴──────────────┐                 ┌──────────────┴──────────────┐
   │ ElevenLabs WebSocket Engine │                 │ 1. Sounddevice + Energy VAD │
   │ • DefaultAudioInterface     │                 │    (Pre-roll buffer & silence)
   │ • Dynamic LLM orchestration │                 │ 2. ElevenLabs Scribe STT    │
   │ • Built-in interruption     │                 │    (Speech-to-text API)     │
   │ • Real-time latency tracking│                 │ 3. Pluggable LLM Provider   │
   └──────────────┬──────────────┘                 │    (Anthropic Claude default)│
                  │                                │ 4. ElevenLabs Flash TTS     │
                  │                                │    (pcm_24000 byte stream)  │
                  │                                │ 5. Barge-in Mic Monitor     │
                  │                                └──────────────┬──────────────┘
                  ▼                                               ▼
           Speaker Output                                  Speaker Output
```

### Mode 1: `agent` (Default)
Leverages the official **ElevenLabs Conversational AI platform**:
- Uses `elevenlabs.conversational_ai.conversation.Conversation` with `DefaultAudioInterface` for duplex microphone capture and speaker streaming.
- Programmatic agent deployment via `setup_agent.py`, saving `ELEVENLABS_AGENT_ID` directly to `.env`.
- Live callbacks for agent responses, user transcripts, agent interruption corrections, and latency metrics.
- Graceful session termination on `Ctrl+C` with transcript persistence.

### Mode 2: `pipeline` (Modular Fallback)
A custom, fully-pluggable audio pipeline:
1. **Speech Recognition (STT)**: Records microphone audio via `sounddevice` with an energy-based Voice Activity Detector (VAD) featuring pre-speech buffering and silence timeouts, then transcribes using the **ElevenLabs Scribe API** (`client.speech_to_text.convert`).
2. **Response Generation (LLM)**: Pluggable `LLMProvider` interface with a default **Anthropic Claude** (`claude-3-5-haiku-latest`) implementation. Maintains sliding memory over the last $N$ turns with a configurable spoken persona.
3. **Speech Synthesis (TTS)**: Streams spoken audio with low latency using **ElevenLabs Flash** (`eleven_flash_v2_5` or `pcm_24000` raw PCM chunks).
4. **Barge-in / Interruption**: Listens to the microphone during playback; if you speak while the assistant is responding, playback stops immediately and the assistant switches back to listening.

---

## Project Structure

```
c:/projects/assistant/
├── main.py              # CLI entry point (--mode, --voice-id, --language, --list-voices)
├── setup_agent.py       # Programmatically creates ElevenLabs Agent & saves to .env
├── config.py            # Loads and validates environment variables and audio configs
├── agent_mode.py        # Mode 1: Conversational AI implementation
├── pipeline/
│   ├── __init__.py
│   ├── audio_io.py      # sounddevice mic recording, VAD state machine, playback & barge-in
│   ├── stt.py           # ElevenLabs Scribe wrapper with retry and exponential backoff
│   ├── llm.py           # Pluggable LLMProvider interface + Claude implementation
│   ├── tts.py           # ElevenLabs streaming TTS wrapper with exponential backoff
│   └── conversation.py  # Conversation history manager and main pipeline loop
├── tests/
│   ├── test_vad.py          # Unit tests for RMS energy, VAD states, noise rejection, WAV conversion
│   ├── test_conversation.py # Unit tests for memory windowing, speaker tags, JSON saving
│   └── test_llm.py          # Unit tests for LLM provider contract
├── transcripts/         # Auto-saved JSON conversation logs with timestamps
├── .env.example         # Template for required environment variables
├── requirements.txt     # Pinned Python package dependencies
└── README.md            # Documentation and setup instructions
```

---

## Prerequisites & Installation

Python **3.10 or higher** is required.

### 1. System Dependencies (PortAudio)

The audio libraries (`sounddevice` and `pyaudio`) communicate with host audio hardware via **PortAudio**.

#### Windows
On Windows, `sounddevice` includes bundled PortAudio DLLs, and `pyaudio` provides precompiled wheels. No external system packages are needed.

#### macOS
Install PortAudio using Homebrew:
```bash
brew install portaudio
```

#### Linux (Debian / Ubuntu / Raspberry Pi OS)
Install PortAudio development headers and ALSA dependencies:
```bash
sudo apt-get update
sudo apt-get install -y libportaudio2 libportaudiocpp0 portaudio19-dev libasound-dev libsndfile1-dev
```

---

### 2. Python Virtual Environment Setup

Clone or enter the project folder, create a virtual environment, and activate it:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

---

## API Keys Configuration

Create your local `.env` file by copying the template:

```bash
cp .env.example .env
```

Open `.env` in your editor and provide your keys:

```env
# ElevenLabs API Key (Required for both modes)
# Obtain from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# ElevenLabs Agent ID (Required for Agent mode)
# Leave blank initially and run `python setup_agent.py` to create one automatically
ELEVENLABS_AGENT_ID=

# ElevenLabs Voice ID (Optional override)
# Defaults to George (JBFqnCBsd6RMkjVDRZzb) or Rachel (21m00Tcm4TlvDq8ikWAM)
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb

# Anthropic API Key (Required for Pipeline mode)
# Obtain from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

> **Security Note**: Never commit your `.env` file to version control. Keys are loaded securely into memory via `python-dotenv`.

---

## Usage Guide

### 1. Exploring Voices
List all available ElevenLabs voices associated with your account:
```bash
python main.py --list-voices
```

---

### 2. Mode 1: Agent Mode (ElevenLabs Conversational AI)

#### Step 1: Create or Update the Agent
Run `setup_agent.py` to programmatically configure or update your conversational agent on ElevenLabs:
```bash
python setup_agent.py
```
- **Idempotent**: If `ELEVENLABS_AGENT_ID` already exists in `.env`, it updates the existing agent in-place via `PATCH`.
- **Force Fresh Agent**: Pass `--force-new` to provision a brand-new agent ID.
- **Built-in `end_call` Tool**: Enabled natively so that when you say goodbye, the assistant says farewell and terminates the call.
- **Silence & Noise Protection**: Turn timeout is set to 30.0s (maximum allowed) and the system prompt instructs the agent to stay silent during silence or background noise (like `...`).
- **Configurable Max Duration**: Automatically caps conversation duration to 180s (configurable via `MAX_CONVERSATION_SECONDS` in `.env`).

#### Step 2: Start the Assistant
```bash
python main.py
# or explicitly:
python main.py --mode agent
```
1. The assistant opens an authenticated bidirectional WebSocket to ElevenLabs.
2. Speak into your microphone; the assistant will answer out loud.
3. You will see a live transcript formatted in the terminal:
   ```
   Assistant: Hello! I am your voice assistant. How can I help you today?
   You: What is the weather like on Mars?
   Assistant: Mars is generally freezing and dry, with average temperatures around minus eighty degrees Fahrenheit.
   ```
4. **Barge-in / Interruption**: Speak while the assistant is talking. The assistant stops speaking and adapts immediately.
5. **Exit**: Press `Ctrl+C`. The session ends cleanly, prints the Conversation ID, and saves the transcript to `transcripts/`.

---

### 3. Mode 2: Pipeline Mode (Modular Fallback)

To run the custom pipeline (`sounddevice` VAD -> ElevenLabs Scribe STT -> Claude LLM -> ElevenLabs Flash TTS):
```bash
python main.py --mode pipeline
```

1. The assistant performs an audio hardware check, greets you with spoken audio, and begins listening.
2. Speak into your microphone. When you pause (silence threshold reached), the speech is transcribed with ElevenLabs Scribe.
3. Claude generates a conversational response based on the conversation history.
4. The response streams back via ElevenLabs Flash TTS and plays through your speakers.
5. **Barge-in**: If you speak while the assistant is reading out its answer, playback cuts off immediately and the microphone starts capturing your next question.
6. **Exit**: Press `Ctrl+C` to stop and save the transcript.

---

### CLI Reference

| Flag | Default | Description |
| :--- | :--- | :--- |
| `--mode {agent,pipeline}` | `agent` | Selects conversational AI agent mode or modular pipeline mode |
| `--voice-id <ID>` | Configured voice | Overrides the ElevenLabs Voice ID |
| `--language <CODE>` | `en` | Overrides language code (`en`, `es`, `fr`, `de`, etc.) |
| `--list-voices` | - | Displays table of available ElevenLabs voices and exits |
| `--setup` | - | Runs agent creation script programmatically |
| `--verbose` | False | Enables detailed debug logging including latencies and frames |

---

## Conversation Transcripts

Every session automatically saves a timestamped JSON file to the `transcripts/` directory:

```json
{
  "mode": "pipeline",
  "start_time": "2026-11-07T22:15:00.123456+00:00",
  "end_time": "2026-11-07T22:16:30.654321+00:00",
  "duration_seconds": 90.53,
  "total_turns": 4,
  "metadata": {
    "voice_id": "JBFqnCBsd6RMkjVDRZzb",
    "stt_model": "scribe_v1",
    "llm_model": "claude-3-5-haiku-latest",
    "tts_model": "eleven_flash_v2_5"
  },
  "turns": [
    {
      "timestamp": "2026-11-07T22:15:01.000000+00:00",
      "speaker": "Assistant",
      "text": "Hello! I am your voice assistant. How can I help you today?",
      "interrupted": false
    },
    {
      "timestamp": "2026-11-07T22:15:08.500000+00:00",
      "speaker": "You",
      "text": "Can you give me a quick tip on staying focused?",
      "interrupted": false
    },
    {
      "timestamp": "2026-11-07T22:15:11.200000+00:00",
      "speaker": "Assistant",
      "text": "Try the Pomodoro technique: work for twenty-five minutes, then take a five-minute break.",
      "interrupted": false
    }
  ]
}
```

---

## Running Unit Tests

Run the complete test suite with `pytest`:
```bash
python -m pytest -v
```

The test suite covers:
- **`test_vad.py`**: RMS energy calculations, silence vs speech detection, consecutive speech trigger confirmation, silence timeout transitions, noise spike rejection, and float-to-PCM16 WAV byte serialization.
- **`test_conversation.py`**: Adding turns, speaker attribution, memory windowing (keeping last $N$ turns for LLM context), and transcript JSON serialization.
- **`test_llm.py`**: Pluggable `LLMProvider` contract compliance and response handling.

---

## Troubleshooting & Audio Configuration

### 1. `[Audio Hardware Error] No microphone found`
- Verify that your microphone is plugged in, recognized by your OS, and set as the default recording device.
- On Windows: Check **Settings > Privacy & security > Microphone** and ensure **"Let desktop apps access your microphone"** is switched **On**.
- On macOS: Ensure your terminal emulator (Terminal, iTerm2, VS Code) has microphone permissions under **System Settings > Privacy & Security > Microphone**.

### 2. Background Noise Triggering Recording Prematurely
If background noise or hum triggers speech detection when you are not talking, adjust the VAD threshold in `config.py`:
```python
# In config.py:
vad_energy_threshold: float = 0.025  # Increase from default 0.015 for noisy environments
```

### 3. Barge-In Interruption Sensitivity
If speakers are loud and bleeding into your microphone causing false barge-in triggers, increase the barge-in threshold in `config.py`:
```python
# In config.py:
barge_in_threshold: float = 0.06  # Increase threshold (default: 0.04)
barge_in_consecutive_chunks: int = 4  # Require more consecutive loud frames
```
*Tip: Using headphones eliminates speaker-to-microphone feedback entirely.*

### 4. `API rate limit reached (429)`
Both the STT and TTS wrappers feature automatic exponential backoff retry mechanisms. If you hit rate limits frequently, ensure your ElevenLabs and Anthropic account tiers have sufficient concurrency allowances.

### 5. Swapping LLM Providers
The modular pipeline uses the `LLMProvider` abstract base class defined in `pipeline/llm.py`:
```python
from pipeline.llm import LLMProvider

class MyCustomLLM(LLMProvider):
    def generate_reply(self, messages: list[dict], system_prompt: str) -> str:
        # Custom logic (e.g. OpenAI, Google Gemini, Ollama, local model)
        return "Custom reply"
```
Pass your custom instance into `run_pipeline_mode(config, llm_provider=MyCustomLLM())`.
