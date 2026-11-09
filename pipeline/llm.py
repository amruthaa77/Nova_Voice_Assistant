"""Pluggable LLM provider interface and Anthropic Claude implementation."""

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List

import anthropic

from config import Config

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract interface for LLM response generation in the conversational loop."""

    @abstractmethod
    def generate_reply(self, messages: List[Dict[str, str]], system_prompt: str) -> str:
        """Generate a response given conversation history and system persona.

        Args:
            messages: List of message dicts with 'role' ('user' or 'assistant') and 'content'.
            system_prompt: System instructions defining assistant persona and brevity.

        Returns:
            The generated response string.
        """
        pass


class ClaudeLLMProvider(LLMProvider):
    """Anthropic Claude LLM provider with retry logic and exponential backoff."""

    def __init__(self, config: Config) -> None:
        self.config = config
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self.model = config.anthropic_model

    def generate_reply(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_retries: int = 3,
        initial_backoff: float = 1.0,
    ) -> str:
        """Generate reply using Anthropic Messages API.

        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            system_prompt: System prompt for Claude.
            max_retries: Max attempts on transient errors.
            initial_backoff: Initial backoff delay in seconds.

        Returns:
            Assistant's spoken reply.

        Raises:
            ValueError: If API authentication fails.
            RuntimeError: If LLM call fails after max retries.
        """
        # Ensure messages are formatted as user/assistant turns
        formatted_messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in messages
            if msg.get("role") in ("user", "assistant") and msg.get("content")
        ]

        if not formatted_messages:
            return "How can I help you today?"

        backoff = initial_backoff

        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(
                    f"Querying Claude model '{self.model}' (attempt {attempt}/{max_retries})..."
                )
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=256,  # Short spoken answers
                    system=system_prompt,
                    messages=formatted_messages,
                    temperature=0.7,
                )

                # Extract text content
                reply_text = ""
                for block in response.content:
                    if block.type == "text":
                        reply_text += block.text

                return reply_text.strip()

            except anthropic.AuthenticationError as e:
                raise ValueError(
                    "Anthropic authentication failed: Invalid ANTHROPIC_API_KEY. "
                    "Please check your ANTHROPIC_API_KEY in .env"
                ) from e

            except anthropic.RateLimitError as e:
                logger.warning(
                    f"Anthropic rate limit reached. Retrying in {backoff:.1f}s "
                    f"(attempt {attempt}/{max_retries})..."
                )
                if attempt == max_retries:
                    raise RuntimeError(f"Anthropic rate limit exceeded: {e}") from e

            except (anthropic.APIConnectionError, anthropic.InternalServerError) as e:
                logger.warning(
                    f"Anthropic connection error: {e}. Retrying in {backoff:.1f}s "
                    f"(attempt {attempt}/{max_retries})..."
                )
                if attempt == max_retries:
                    raise RuntimeError(f"Anthropic request failed after {max_retries} retries: {e}") from e

            except Exception as e:
                logger.error(f"Unexpected error calling Claude LLM: {e}")
                if attempt == max_retries:
                    raise RuntimeError(f"Failed to generate LLM reply: {e}") from e

            time.sleep(backoff)
            backoff *= 2.0

        return "I'm sorry, I couldn't process that. Could you please repeat?"
