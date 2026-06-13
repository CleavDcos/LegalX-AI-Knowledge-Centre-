"""
PDF loading and text chunking service.
Reads PDF files from the data directory and splits them into overlapping chunks
for embedding and vector storage.
"""

import logging
from pathlib import Path

import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from config import CHUNK_OVERLAP, CHUNK_SIZE, DATA_DIR

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extract all text from a PDF file using pdfplumber.
    Returns concatenated page text with page markers for source referencing.
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    pages_text: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_text.append(f"[Page {i}]\n{page_text}")

    full_text = "\n\n".join(pages_text)
    if not full_text.strip():
        raise ValueError(f"No text could be extracted from {pdf_path}")

    return full_text


def chunk_pdf_text(text: str, topic_id: str, source_filename: str) -> list[Document]:
    """
    Split extracted PDF text into overlapping chunks using LangChain splitter.
    Each chunk carries metadata for topic identification and source tracing.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    raw_chunks = splitter.split_text(text)
    documents: list[Document] = []

    for idx, chunk in enumerate(raw_chunks):
        documents.append(
            Document(
                page_content=chunk,
                metadata={
                    "topic_id": topic_id,
                    "source": source_filename,
                    "chunk_index": idx,
                },
            )
        )

    return documents


def load_and_chunk_pdf(topic_id: str, pdf_filename: str) -> list[Document]:
    """
    Full pipeline: load PDF from data directory and return chunked Documents.
    """
    pdf_path = DATA_DIR / pdf_filename
    logger.info("Loading PDF for topic '%s': %s", topic_id, pdf_path)
    text = extract_text_from_pdf(pdf_path)
    return chunk_pdf_text(text, topic_id, pdf_filename)
