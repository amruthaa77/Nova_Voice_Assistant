"""Unit tests for conversation history and transcript serialization."""

import json
from pathlib import Path
import pytest

from agent_mode import is_meaningful_transcript
from pipeline.conversation import ConversationManager


def test_is_meaningful_transcript():
    """Verify filtering of empty transcripts and noise punctuation like '...'."""
    # Should be rejected (noise/silence)
    assert not is_meaningful_transcript("")
    assert not is_meaningful_transcript("   ")
    assert not is_meaningful_transcript("...")
    assert not is_meaningful_transcript(" ... ")
    assert not is_meaningful_transcript("…")
    assert not is_meaningful_transcript(".")
    assert not is_meaningful_transcript("?")
    assert not is_meaningful_transcript("?!")
    assert not is_meaningful_transcript("---")
    assert not is_meaningful_transcript(",,,")

    # Should be accepted (real speech)
    assert is_meaningful_transcript("Hello")
    assert is_meaningful_transcript("goodbye")
    assert is_meaningful_transcript("yes...")
    assert is_meaningful_transcript("...wait a second")
    assert is_meaningful_transcript("I'm done, thanks.")



def test_add_messages():
    """Verify adding user and assistant messages records speaker and timestamps."""
    manager = ConversationManager(max_turns=5)
    manager.add_user_message("Hello, how are you?")
    manager.add_assistant_message("I am doing great, thank you!")

    assert len(manager.turns) == 2
    assert manager.turns[0]["speaker"] == "You"
    assert manager.turns[0]["role"] == "user"
    assert manager.turns[0]["content"] == "Hello, how are you?"
    assert "timestamp" in manager.turns[0]

    assert manager.turns[1]["speaker"] == "Assistant"
    assert manager.turns[1]["role"] == "assistant"
    assert manager.turns[1]["content"] == "I am doing great, thank you!"
    assert manager.turns[1]["interrupted"] is False


def test_interrupted_assistant_message():
    """Verify assistant message records interruption flag."""
    manager = ConversationManager(max_turns=5)
    manager.add_assistant_message("Let me tell you about...", interrupted=True)
    assert manager.turns[0]["interrupted"] is True


def test_llm_messages_windowing():
    """Verify get_llm_messages only returns the last N turns."""
    max_turns = 4
    manager = ConversationManager(max_turns=max_turns)

    # Add 8 turns
    for i in range(8):
        if i % 2 == 0:
            manager.add_user_message(f"User message {i}")
        else:
            manager.add_assistant_message(f"Assistant message {i}")

    assert len(manager.turns) == 8

    llm_messages = manager.get_llm_messages()
    assert len(llm_messages) == max_turns
    # Should be the last 4 turns: 4, 5, 6, 7
    assert llm_messages[0]["content"] == "User message 4"
    assert llm_messages[1]["content"] == "Assistant message 5"
    assert llm_messages[2]["content"] == "User message 6"
    assert llm_messages[3]["content"] == "Assistant message 7"


def test_save_transcript(tmp_path: Path):
    """Verify saving conversation transcript to a valid JSON file."""
    manager = ConversationManager(max_turns=10, transcripts_dir=tmp_path)
    manager.add_user_message("Testing transcript save.")
    manager.add_assistant_message("Transcript save confirmed.")

    transcript_path = manager.save_transcript(
        mode="pipeline",
        metadata={"test_key": "test_value"},
    )

    assert transcript_path.exists()
    assert transcript_path.suffix == ".json"

    with open(transcript_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["mode"] == "pipeline"
    assert data["total_turns"] == 2
    assert "start_time" in data
    assert "end_time" in data
    assert "duration_seconds" in data
    assert data["metadata"]["test_key"] == "test_value"
    assert len(data["turns"]) == 2
    assert data["turns"][0]["speaker"] == "You"
    assert data["turns"][0]["text"] == "Testing transcript save."
    assert data["turns"][1]["speaker"] == "Assistant"
    assert data["turns"][1]["text"] == "Transcript save confirmed."
