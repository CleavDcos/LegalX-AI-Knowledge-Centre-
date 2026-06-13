"""
Summary router — generates plain-English summaries for legal topics via RAG + GPT-4o.
"""

import logging

from fastapi import APIRouter, HTTPException

from config import TOPICS
from services.llm_service import generate_summary
from services.rag_service import vector_store_exists

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["Summary"])


@router.get("/{topic_id}/summary")
async def get_topic_summary(topic_id: str):
    """
    Return an AI-generated plain-English summary (max 250 words) for the topic.
    Uses RAG to retrieve relevant chunks, then GPT-4o to summarize.
    Result is cached after first generation.
    """
    if topic_id not in TOPICS:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    if not vector_store_exists(topic_id):
        raise HTTPException(
            status_code=503,
            detail=f"Topic '{topic_id}' is not yet indexed. Place the PDF in /data and restart.",
        )

    try:
        summary = generate_summary(topic_id)
        return {"summary": summary}
    except Exception as exc:
        logger.error("Summary generation failed for '%s': %s", topic_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(exc)}",
        )
