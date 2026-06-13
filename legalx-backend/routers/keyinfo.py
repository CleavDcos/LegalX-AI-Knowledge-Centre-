"""
Key info router — extracts structured key information from legal topics via RAG + GPT-4o.
"""

import logging

from fastapi import APIRouter, HTTPException

from config import TOPICS
from services.llm_service import generate_key_info
from services.rag_service import ensure_vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["Key Info"])


@router.get("/{topic_id}/keyinfo")
async def get_topic_key_info(topic_id: str):
    """
    Return structured key information extracted from the topic PDF via RAG.
    Fields: key_rights, important_provisions, penalties, who_can_benefit.
    Each array contains 3-5 bullet points. Result is cached.
    """
    if topic_id not in TOPICS:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    try:
        ensure_vector_store(topic_id)
        key_info = generate_key_info(topic_id)
        return key_info
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"PDF for topic '{topic_id}' not found in /data: {exc}",
        )
    except Exception as exc:
        logger.error("Key info extraction failed for '%s': %s", topic_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract key information: {str(exc)}",
        )
