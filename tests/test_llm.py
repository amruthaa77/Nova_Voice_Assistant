"""Unit tests for pluggable LLM provider interface."""

import pytest
from pipeline.llm import LLMProvider


class MockLLMProvider(LLMProvider):
    """Mock implementation of LLMProvider for testing."""

    def __init__(self, reply: str = "Mock response") -> None:
        self.reply = reply
        self.called_with_messages = []
        self.called_with_system = ""

    def generate_reply(self, messages: list[dict], system_prompt: str) -> str:
        self.called_with_messages = messages
        self.called_with_system = system_prompt
        return self.reply


def test_mock_llm_provider():
    """Verify that any provider satisfying LLMProvider contract can be used seamlessly."""
    mock = MockLLMProvider(reply="Hello from mock LLM!")
    messages = [{"role": "user", "content": "Hi there"}]
    system_prompt = "You are a concise voice assistant."

    response = mock.generate_reply(messages, system_prompt)

    assert response == "Hello from mock LLM!"
    assert mock.called_with_messages == messages
    assert mock.called_with_system == system_prompt
