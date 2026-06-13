"""
Transcribe router — speech-to-text using OpenAI Whisper.
"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from services.tts_service import transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Transcribe"])


class TranscribeResponse(BaseModel):
    transcript: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file to transcribe"),
):
    """
    Accept an audio file upload and transcribe it using OpenAI Whisper.
    Supports common audio formats (mp3, wav, m4a, webm, etc.).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    allowed_extensions = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".mp4"}
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext and ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        from io import BytesIO

        transcript = transcribe_audio(BytesIO(content), filename=file.filename)
        return TranscribeResponse(transcript=transcript)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(exc)}",
        )
