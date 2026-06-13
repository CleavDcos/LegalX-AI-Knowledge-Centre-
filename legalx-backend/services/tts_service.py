"""
Text-to-speech and speech-to-text service.
Uses OpenAI TTS (nova voice) and Whisper for transcription.
"""

import logging
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional

from openai import OpenAI

from config import AUDIO_DIR, OPENAI_API_KEY, TTS_MODEL, TTS_VOICE

logger = logging.getLogger(__name__)

# Track last generated audio file per topic for download endpoint
_last_audio_files: dict[str, Path] = {}


def _get_client() -> OpenAI:
    """Return configured OpenAI client."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")
    return OpenAI(api_key=OPENAI_API_KEY)


def generate_speech(topic_id: str, text: str) -> tuple[bytes, Path]:
    """
    Convert text to speech using OpenAI TTS.
    Saves MP3 to audio_output directory and returns bytes + file path.
    """
    client = _get_client()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    output_path = AUDIO_DIR / f"{topic_id}_latest.mp3"

    response = client.audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=text,
        response_format="mp3",
    )

    audio_bytes = response.content
    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    _last_audio_files[topic_id] = output_path
    logger.info("Generated audio for topic '%s': %s", topic_id, output_path)

    return audio_bytes, output_path


def get_last_audio_path(topic_id: str) -> Optional[Path]:
    """Return path to the last generated audio file for a topic."""
    path = _last_audio_files.get(topic_id)
    if path and path.exists():
        return path
    # Fallback: check default filename on disk
    default = AUDIO_DIR / f"{topic_id}_latest.mp3"
    if default.exists():
        return default
    return None


def transcribe_audio(file: BinaryIO, filename: str = "audio.wav") -> str:
    """
    Transcribe an uploaded audio file using OpenAI Whisper.
    Returns the transcript text.
    """
    client = _get_client()

    # Whisper API needs a file with a name; write to temp if needed
    suffix = Path(filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file.read())
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        return transcript.text
    finally:
        Path(tmp_path).unlink(missing_ok=True)
