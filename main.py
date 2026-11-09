"""CLI entry point for the ElevenLabs Voice Virtual Assistant."""

import argparse
import logging
import sys
from typing import Optional

from elevenlabs.client import ElevenLabs

from agent_mode import run_agent_mode
from config import load_config
from pipeline.conversation import run_pipeline_mode
from setup_agent import setup_agent


def setup_logging(verbose: bool) -> None:
    """Configure application logging level and format."""
    level = logging.DEBUG if verbose else logging.INFO
    format_str = "%(asctime)s [%(levelname)s] %(name)s: %(message)s" if verbose else "%(levelname)s: %(message)s"
    logging.basicConfig(level=level, format=format_str, datefmt="%H:%M:%S")

    # Mute noisy internal HTTP request logs unless verbose is requested
    if not verbose:
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        logging.getLogger("urllib3").setLevel(logging.WARNING)


def handle_list_voices(api_key: Optional[str]) -> None:
    """Fetch and print available ElevenLabs voices."""
    if not api_key or api_key.startswith("your_"):
        print(
            "\n[Error] ELEVENLABS_API_KEY is not set.\n"
            "Please add your ElevenLabs API key to the .env file to list voices:\n"
            "  ELEVENLABS_API_KEY=your_actual_key_here\n"
        )
        sys.exit(1)

    print("\nConnecting to ElevenLabs to fetch available voices...")
    try:
        client = ElevenLabs(api_key=api_key)
        response = client.voices.get_all()
        voices = response.voices

        if not voices:
            print("No voices found for this account.")
            return

        print("\n" + "=" * 80)
        print(f"{'Voice Name':<28} | {'Category':<15} | {'Voice ID':<25}")
        print("-" * 80)
        for voice in voices:
            name = voice.name or "Unnamed"
            category = voice.category or "premade"
            voice_id = voice.voice_id
            print(f"{name:<28} | {category:<15} | {voice_id:<25}")
        print("=" * 80)
        print(f"Total voices: {len(voices)}\n")
        print("To use a specific voice, pass: python main.py --voice-id <VOICE_ID>")
        print("Or set ELEVENLABS_VOICE_ID in your .env file.\n")

    except Exception as e:
        print(f"\n[Error] Failed to fetch voices from ElevenLabs: {e}")
        sys.exit(1)


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Real-time Voice Virtual Assistant powered by ElevenLabs.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run in default Agent mode (ElevenLabs Conversational AI):
  python main.py

  # Run in modular Pipeline mode (Scribe STT -> Claude LLM -> ElevenLabs TTS):
  python main.py --mode pipeline

  # Create or set up a new ElevenLabs Agent programmatically:
  python setup_agent.py

  # List all available ElevenLabs voices:
  python main.py --list-voices

  # Run with custom voice and verbose debugging:
  python main.py --mode pipeline --voice-id 21m00Tcm4TlvDq8ikWAM --verbose
        """,
    )

    parser.add_argument(
        "--mode",
        choices=["agent", "pipeline"],
        default="agent",
        help="Conversation mode: 'agent' (ElevenLabs Conversational AI, default) or 'pipeline' (modular fallback).",
    )
    parser.add_argument(
        "--voice-id",
        type=str,
        default=None,
        help="Override ElevenLabs Voice ID for synthesized speech.",
    )
    parser.add_argument(
        "--language",
        type=str,
        default=None,
        help="Language code (e.g. 'en', 'es', 'fr', 'de'). Defaults to 'en'.",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="Print all available ElevenLabs voices for your account and exit.",
    )
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Run agent setup to create an ElevenLabs Agent and save ID to .env.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable detailed debug logging.",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    config = load_config()

    # Apply CLI overrides to config
    if args.language:
        config.language = args.language
    if args.voice_id:
        config.elevenlabs_voice_id = args.voice_id

    # Handle --list-voices
    if args.list_voices:
        handle_list_voices(config.elevenlabs_api_key)
        return

    # Handle --setup
    if args.setup:
        setup_agent(force_new=False, voice_id=args.voice_id)
        return

    # Run chosen mode
    try:
        if args.mode == "agent":
            run_agent_mode(config=config, verbose=args.verbose)
        elif args.mode == "pipeline":
            run_pipeline_mode(
                config=config,
                voice_id=args.voice_id,
                verbose=args.verbose,
            )
    except ValueError as ve:
        print(f"\n[Configuration Error]\n{ve}\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[Exiting] Program interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[Unexpected Error] {e}")
        if args.verbose:
            logging.exception("Fatal exception details:")
        sys.exit(1)


if __name__ == "__main__":
    main()
