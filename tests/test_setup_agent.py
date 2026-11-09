"""Unit tests for agent setup and configuration building."""

import pytest
from config import Config
from setup_agent import (
    SILENCE_AND_FAREWELL_INSTRUCTION,
    build_conversation_config,
    build_platform_settings,
)


def test_build_conversation_config_defaults():
    """Verify built conversation configuration has required settings."""
    config = Config()
    voice_id = "test_voice_123"
    conv_cfg = build_conversation_config(config, voice_id)

    # 1. System prompt tail
    prompt = conv_cfg["agent"]["prompt"]["prompt"]
    assert SILENCE_AND_FAREWELL_INSTRUCTION in prompt
    assert "Never check in on the user or say 'are you still there' during silence" in prompt
    assert "give a one-sentence farewell and then call the end_call tool" in prompt

    # 2. End call tool
    built_in = conv_cfg["agent"]["prompt"]["built_in_tools"]
    assert "end_call" in built_in
    assert built_in["end_call"]["name"] == "end_call"
    assert built_in["end_call"]["params"]["system_tool_type"] == "end_call"

    tools = conv_cfg["agent"]["prompt"]["tools"]
    assert any(t["name"] == "end_call" for t in tools)

    # 3. Turn timeout maximum
    assert conv_cfg["turn"]["turn_timeout"] == 30.0

    # 4. Max duration
    assert conv_cfg["conversation"]["max_duration_seconds"] == 180


def test_build_conversation_config_custom_duration(monkeypatch):
    """Verify MAX_CONVERSATION_SECONDS is reflected in config."""
    monkeypatch.setenv("MAX_CONVERSATION_SECONDS", "300")
    config = Config()
    conv_cfg = build_conversation_config(config, "test_voice")
    assert conv_cfg["conversation"]["max_duration_seconds"] == 300


def test_build_platform_settings_voice_id_override():
    """Verify platform_settings enables TTS voice_id override to prevent 1008 disconnection."""
    platform_settings = build_platform_settings()
    overrides = platform_settings.get("overrides", {})
    conv_overrides = overrides.get("conversation_config_override", {})
    tts_overrides = conv_overrides.get("tts", {})
    assert tts_overrides.get("voice_id") is True

