"""
Search router — cross-topic semantic search across all FAISS indexes.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.rag_service import search_all_topics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Search"])


class SearchResult(BaseModel):
    topic_id: str
    topic_name: str
    relevant_excerpt: str
    relevance_score: float


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str


@router.get("/search", response_model=SearchResponse)
async def search_topics(
    q: str = Query(..., min_length=1, description="Search query"),
    topics: Optional[str] = Query(
        None,
        description="Comma-separated topic IDs to search (e.g. 'pocso,consumer'). "
        "Max 3 topics. If not provided, searches 2-3 most recently accessed "
        "available topics.",
    ),
):
    """
    Search across topic FAISS indexes with smart memory management.

    Query Parameters:
    - q: Search query string (required)
    - topics: Optional comma-separated topic IDs to search. If omitted, defaults
      to searching 2-3 most recently accessed topics (or first available if none
      have been accessed). Limited to 3 topics maximum to stay within 512MB memory.

    Returns:
    - results: Top 5 results with topic_id, topic_name, excerpt, and relevance score.
    - query: The search query used.
    """
    try:
        # Parse optional topics parameter
        topics_list = None
        if topics:
            # Split and strip whitespace
            topics_list = [t.strip() for t in topics.split(",") if t.strip()]
            if topics_list:
                logger.info("Search query '%s' with topics: %s", q, topics_list)
            else:
                logger.info("Search query '%s' with default topics", q)
                topics_list = None
        else:
            logger.info("Search query '%s' with default topics", q)

        raw_results = search_all_topics(q, k=5, topics=topics_list)
        results = [
            SearchResult(
                topic_id=r["topic_id"],
                topic_name=r["topic_name"],
                relevant_excerpt=r["relevant_excerpt"],
                relevance_score=r["relevance_score"],
            )
            for r in raw_results
        ]
        return SearchResponse(results=results, query=q)
    except Exception as exc:
        logger.error("Search failed for query '%s': %s", q, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(exc)}",
        )
