"""
Audio router — text-to-speech generation and audio download for legal topics.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from config import TOPICS
from services.tts_service import generate_speech, get_last_audio_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["Audio"])


class AudioRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to convert to speech")


@router.post("/{topic_id}/audio")
async def generate_topic_audio(topic_id: str, body: AudioRequest):
    """
    Convert text to speech using OpenAI TTS (model: tts-1, voice: nova).
    Returns streaming MP3 response and saves file for download.
    Response includes X-Download-URL header with the download endpoint path.
    """
    if topic_id not in TOPICS:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    try:
        audio_bytes, output_path = generate_speech(topic_id, body.text)
        download_url = f"/api/topics/{topic_id}/audio/download"

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename={topic_id}_audio.mp3",
                "X-Download-URL": download_url,
                "X-Audio-File": str(output_path.name),
            },
        )
    except Exception as exc:
        logger.error("TTS failed for '%s': %s", topic_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate audio: {str(exc)}",
        )


@router.get("/{topic_id}/audio/download")
async def download_topic_audio(topic_id: str):
    """
    Download the last generated audio file for the given topic as MP3.
    """
    if topic_id not in TOPICS:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    audio_path = get_last_audio_path(topic_id)
    if not audio_path:
        raise HTTPException(
            status_code=404,
            detail=f"No audio file found for topic '{topic_id}'. Generate audio first.",
        )

    return FileResponse(
        path=str(audio_path),
        media_type="audio/mpeg",
        filename=f"{topic_id}_audio.mp3",
    )
