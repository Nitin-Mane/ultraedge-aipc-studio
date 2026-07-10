from fastapi import APIRouter

router = APIRouter()

@router.get("/sessions")
async def get_sessions():
    return {
        "sessions": [
            {"id": "1", "name": "Chat Session 1", "created_at": "2026-07-04T10:00:00", "message_count": 15},
        ]
    }

@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    return {
        "messages": [
            {"id": "1", "role": "user", "content": "Hello", "timestamp": "2026-07-04T10:00:00"},
            {"id": "2", "role": "assistant", "content": "Hello! How can I help you today?", "timestamp": "2026-07-04T10:00:01"},
        ]
    }