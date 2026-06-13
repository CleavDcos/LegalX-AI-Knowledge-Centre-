"""
Chat router — conversational Q&A about legal topics using RAG + ConversationalRetrievalChain.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import TOPICS
from services.llm_service import chat_with_topic
from services.rag_service import vector_store_exists

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["Chat"])


class ChatHistoryEntry(BaseModel):
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's question")
    history: List[ChatHistoryEntry] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]


@router.post("/{topic_id}/chat", response_model=ChatResponse)
async def chat_about_topic(topic_id: str, body: ChatRequest):
    """
    Answer a user question about a legal topic using RAG.
    Retrieves top 5 relevant chunks from FAISS, passes them with chat history to GPT-4o.
  """
    if topic_id not in TOPICS:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    if not vector_store_exists(topic_id):
        raise HTTPException(
            status_code=503,
            detail=f"Topic '{topic_id}' is not yet indexed. Place the PDF in /data and restart.",
        )

    try:
        history = [{"role": h.role, "content": h.content} for h in body.history]
        result = chat_with_topic(topic_id, body.message, history)
        return ChatResponse(answer=result["answer"], sources=result["sources"])
    except Exception as exc:
        logger.error("Chat failed for '%s': %s", topic_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Chat request failed: {str(exc)}",
        )
