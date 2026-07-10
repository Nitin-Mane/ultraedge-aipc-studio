from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class RAGQuery(BaseModel):
    query: str
    document_ids: List[str]
    top_k: Optional[int] = 5

class RAGResponse(BaseModel):
    answer: str
    sources: List[dict]
    confidence: float

@router.post("/query")
async def rag_query(query: RAGQuery):
    return {
        "answer": f"Based on the indexed documents, here's what I found regarding '{query.query}': The technical documentation indicates that the system uses a modular architecture.",
        "sources": [
            {"document": "Technical_Documentation.pdf", "page": 12, "chunk": 45, "relevance": 0.95},
            {"document": "Product_Requirements.docx", "page": 3, "chunk": 12, "relevance": 0.88},
        ],
        "confidence": 0.92,
    }

@router.get("/documents")
async def get_documents():
    return {
        "documents": [
            {"id": "1", "name": "Technical_Documentation.pdf", "type": "pdf", "chunks": 156, "status": "indexed"},
            {"id": "2", "name": "Product_Requirements.docx", "type": "docx", "chunks": 98, "status": "indexed"},
        ]
    }