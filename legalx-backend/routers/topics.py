"""
Topics router — lists all legal topics with AI-generated descriptions.
"""

import logging

from fastapi import APIRouter, HTTPException

from config import TOPICS
from services.llm_service import generate_topic_description
from services.rag_service import is_topic_ready

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["Topics"])


@router.get("")
async def list_topics():
    """
    Return all 5 legal topics with id, name, short_description, and icon.
    Descriptions are AI-generated from PDF content via RAG (cached after first call).
    """
    topics_list = []

    for topic_id, meta in TOPICS.items():
        short_description = ""
        if is_topic_ready(topic_id):
            try:
                short_description = generate_topic_description(topic_id)
            except Exception as exc:
                logger.error("Failed to generate description for '%s': %s", topic_id, exc)
                short_description = "Description will be available once the PDF is processed."

        topics_list.append(
            {
                "id": topic_id,
                "name": meta["name"],
                "short_description": short_description,
                "icon": meta["icon"],
            }
        )

    return {"topics": topics_list}
