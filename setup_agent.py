"""Setup script to programmatically create or update an ElevenLabs Conversational AI Agent."""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError

from config import DEFAULT_SYSTEM_PROMPT, Config, load_config

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SILENCE_AND_FAREWELL_INSTRUCTION = (
    "Never check in on the user or say 'are you still there' during silence. "
    "Only speak when the user speaks. If the input is empty or just noise, stay silent. "
    "When the user says goodbye or indicates they are done, give a one-sentence farewell and then call the end_call tool."
)


def build_conversation_config(config: Config, voice_id: str) -> Dict[str, Any]:
    """Construct the conversation configuration dictionary with silence protection and end_call.

    Args:
        config: Application configuration.
        voice_id: Target voice ID.

    Returns:
        Structured conversation configuration dictionary for ElevenLabs API.
    """
    base_prompt = (config.system_prompt or DEFAULT_SYSTEM_PROMPT).strip()
    if SILENCE_AND_FAREWELL_INSTRUCTION not in base_prompt:
        system_prompt = f"{base_prompt} {SILENCE_AND_FAREWELL_INSTRUCTION}"
    else:
        system_prompt = base_prompt

    end_call_tool = {
        "type": "system",
        "name": "end_call",
        "description": "End the call when the user says goodbye or indicates they are done.",
        "params": {
            "system_tool_type": "end_call",
        },
    }

    return {
        "agent": {
            "first_message": config.agent_first_message,
            "language": config.language,
            "prompt": {
                "prompt": system_prompt,
                "llm": config.agent_llm,
                "temperature": 0.7,
                "built_in_tools": {
                    "end_call": end_call_tool,
                },
                "tools": [end_call_tool],
            },
        },
        "tts": {
            "voice_id": voice_id,
        },
        "turn": {
            "turn_timeout": float(config.agent_turn_timeout),  # Maximum 30.0s
        },
        "conversation": {
            "max_duration_seconds": int(config.max_conversation_seconds),  # 180s default
        },
    }


def build_platform_settings() -> Dict[str, Any]:
    """Construct platform settings that enable voice_id client override.

    Returns:
        Structured platform_settings dictionary allowing TTS voice_id overrides.
    """
    return {
        "overrides": {
            "conversation_config_override": {
                "tts": {
                    "voice_id": True,
                },
            },
        },
    }


def print_agent_config_summary(
    agent_id: str,
    action: str,
    conversation_config: Dict[str, Any],
) -> None:
    """Print the final agent configuration details for user verification.

    Args:
        agent_id: The ElevenLabs Agent ID.
        action: Either 'CREATED' or 'UPDATED'.
        conversation_config: The active configuration dictionary.
    """
    prompt = conversation_config["agent"]["prompt"]["prompt"]
    prompt_tail = prompt[-180:] if len(prompt) > 180 else prompt
    has_end_call = bool(
        conversation_config.get("agent", {})
        .get("prompt", {})
        .get("built_in_tools", {})
        .get("end_call")
        or any(
            t.get("name") == "end_call"
            for t in conversation_config.get("agent", {}).get("prompt", {}).get("tools", [])
        )
    )
    turn_timeout = conversation_config.get("turn", {}).get("turn_timeout")
    max_duration = conversation_config.get("conversation", {}).get("max_duration_seconds")

    print("\n" + "=" * 70)
    print(f"  ELEVENLABS AGENT CONFIGURATION ({action})")
    print("=" * 70)
    print(f"Agent ID:                  {agent_id}")
    print(f"End Call Tool Enabled:     {has_end_call} (system tool 'end_call')")
    print(f"Turn Timeout:              {turn_timeout}s (maximum allowed)")
    print(f"Max Conversation Duration: {max_duration}s (via MAX_CONVERSATION_SECONDS)")
    print("-" * 70)
    print(f"System Prompt Tail:\n... \"{prompt_tail}\"")
    print("=" * 70 + "\n")


def setup_agent(force_new: bool = False, voice_id: Optional[str] = None) -> str:
    """Create or update an ElevenLabs Conversational AI Agent idempotently.

    - If ELEVENLABS_AGENT_ID exists in .env and force_new is False: updates the agent.
    - If ELEVENLABS_AGENT_ID does not exist or force_new is True: creates a new agent.

    Args:
        force_new: If True, forces creation of a fresh agent instead of updating.
        voice_id: Optional voice ID override.

    Returns:
        The agent ID (either updated or newly created).
    """
    config = load_config()
    dotenv_path = Path(".env")

    # Validate API key
    if not config.elevenlabs_api_key or config.elevenlabs_api_key.startswith("your_"):
        logger.error(
            "ELEVENLABS_API_KEY is not set in .env!\n"
            "Please create or edit your .env file with your ElevenLabs API key:\n"
            "  ELEVENLABS_API_KEY=your_actual_key_here"
        )
        sys.exit(1)

    target_voice_id = voice_id or config.elevenlabs_voice_id
    conversation_config = build_conversation_config(config, target_voice_id)
    platform_settings = build_platform_settings()

    client = ElevenLabs(api_key=config.elevenlabs_api_key)
    existing_agent_id = os.getenv("ELEVENLABS_AGENT_ID", "").strip()

    # Case 1: Update existing agent (idempotent)
    if existing_agent_id and not force_new and not existing_agent_id.startswith("your_"):
        logger.info(f"Existing ELEVENLABS_AGENT_ID found ({existing_agent_id}). Updating agent...")
        try:
            client.conversational_ai.agents.update(
                agent_id=existing_agent_id,
                name=config.agent_name,
                conversation_config=conversation_config,
                platform_settings=platform_settings,
            )
            logger.info("Agent updated successfully via API PATCH.")
            print_agent_config_summary(existing_agent_id, "UPDATED", conversation_config)
            return existing_agent_id

        except ApiError as e:
            if getattr(e, "status_code", None) == 404:
                logger.warning(
                    f"Agent {existing_agent_id} not found on ElevenLabs (404). "
                    "Creating a new agent instead..."
                )
            else:
                logger.error(f"Failed to update agent: {e}")
                sys.exit(1)
        except Exception as e:
            logger.error(f"Error updating agent {existing_agent_id}: {e}")
            sys.exit(1)

    # Case 2: Create new agent
    logger.info(f"Creating new ElevenLabs Conversational AI Agent '{config.agent_name}'...")
    try:
        agent_response = client.conversational_ai.agents.create(
            name=config.agent_name,
            conversation_config=conversation_config,
            platform_settings=platform_settings,
        )

        new_agent_id = agent_response.agent_id
        logger.info(f"Successfully created agent! Agent ID: {new_agent_id}")

        # Save to .env
        if not dotenv_path.exists():
            example_path = Path(".env.example")
            if example_path.exists():
                dotenv_path.write_text(example_path.read_text(encoding="utf-8"), encoding="utf-8")
            else:
                dotenv_path.touch()

        dotenv.set_key(str(dotenv_path), "ELEVENLABS_AGENT_ID", new_agent_id)
        logger.info(f"Saved ELEVENLABS_AGENT_ID to {dotenv_path.resolve()}")

        print_agent_config_summary(new_agent_id, "CREATED", conversation_config)
        return new_agent_id

    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        logger.info(
            "Tip: Ensure your ELEVENLABS_API_KEY has permissions for Conversational AI "
            "and that your plan supports agent creation."
        )
        sys.exit(1)


def main() -> None:
    """CLI entrypoint for agent setup."""
    parser = argparse.ArgumentParser(
        description="Programmatically create or update an ElevenLabs Conversational AI Agent."
    )
    parser.add_argument(
        "--force-new",
        action="store_true",
        help="Create a fresh agent even if ELEVENLABS_AGENT_ID already exists in .env",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Alias for --force-new",
    )
    parser.add_argument(
        "--voice-id",
        type=str,
        default=None,
        help="ElevenLabs Voice ID to assign to the agent (optional)",
    )
    args = parser.parse_args()

    setup_agent(force_new=(args.force_new or args.force), voice_id=args.voice_id)


if __name__ == "__main__":
    main()
