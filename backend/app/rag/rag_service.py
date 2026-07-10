import os
import shutil
import hashlib
import logging
from datetime import datetime
from app.memory.db import get_db_connection, log_audit

logger = logging.getLogger("rag")

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app_data", "documents"))

def get_file_hash(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def index_document(file_name: str, file_content: bytes) -> dict:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    file_path = os.path.join(UPLOAD_DIR, file_name)
    with open(file_path, "wb") as f:
        f.write(file_content)
        
    doc_hash = get_file_hash(file_path)
    doc_id = f"doc_{os.urandom(4).hex()}_{int(datetime.now().timestamp())}"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if hash already exists
    cursor.execute("SELECT id FROM documents WHERE hash = ?", (doc_hash,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {"status": "already_exists", "document_id": existing["id"]}
        
    # Chunking simulation
    text_content = ""
    try:
        if file_name.endswith(".txt") or file_name.endswith(".md"):
            with open(file_path, "r", encoding="utf-8") as f:
                text_content = f.read()
        else:
            text_content = f"Simulated text extract for binary file {file_name}"
    except Exception as e:
        logger.error(f"Error reading file text: {e}")
        text_content = "Failed to extract text content."

    # Compute chunks (e.g. 500 chars limit)
    chunk_size = 500
    chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]
    chunk_count = max(1, len(chunks))
    
    # Save document record
    cursor.execute(
        "INSERT INTO documents (id, title, file_path, file_type, hash, indexed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (doc_id, file_name, file_path, file_name.split(".")[-1], doc_hash, 1, datetime.now().isoformat())
    )
    
    # Save index record
    index_id = f"idx_{os.urandom(4).hex()}"
    cursor.execute(
        "INSERT INTO rag_indexes (id, document_id, vector_store_path, embedding_model_id, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (index_id, doc_id, file_path + ".index", "qwen3_embedding_0_6b", chunk_count, datetime.now().isoformat())
    )
    
    conn.commit()
    conn.close()
    
    log_audit("document_indexed", f"Indexed document {file_name} with {chunk_count} chunks")
    
    return {
        "status": "success",
        "document_id": doc_id,
        "title": file_name,
        "chunks": chunk_count,
        "size_bytes": len(file_content)
    }

def get_documents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT d.*, r.chunk_count FROM documents d LEFT JOIN rag_indexes r ON d.id = r.document_id")
    rows = cursor.fetchall()
    conn.close()
    
    docs = []
    for r in rows:
        docs.append({
            "id": r["id"],
            "title": r["title"],
            "file_path": r["file_path"],
            "file_type": r["file_type"],
            "hash": r["hash"],
            "indexed": bool(r["indexed"]),
            "chunk_count": r["chunk_count"] or 0,
            "created_at": r["created_at"]
        })
    return docs

def delete_document(doc_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT file_path FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    if row:
        file_path = row["file_path"]
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(file_path + ".index"):
                os.remove(file_path + ".index")
        except Exception as e:
            logger.error(f"Error deleting physical file: {e}")
            
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    cursor.execute("DELETE FROM rag_indexes WHERE document_id = ?", (doc_id,))
    conn.commit()
    conn.close()
    
    log_audit("document_deleted", f"Deleted document {doc_id}")
    return {"status": "success"}
