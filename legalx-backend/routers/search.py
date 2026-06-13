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
async def search_topics(q: str = Query(..., min_length=1, description="Search query")):
    """
    Search across ALL topic FAISS indexes.
    Returns top 5 results with topic_id, topic_name, excerpt, and relevance score.
    """
    try:
        raw_results = search_all_topics(q, k=5)
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
