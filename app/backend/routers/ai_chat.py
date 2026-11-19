"""Server-side /api/ai-chat endpoint for local Vite dev & Render parity with Vercel Serverless."""

import time
from typing import Any, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from schemas.aihub import ChatMessage, GenTxtRequest
from services.aihub import AIHubService

router = APIRouter(tags=["ai-chat"])


class AiChatRequest(BaseModel):
    messages: List[dict[str, Any]] = []
    promptVersion: Optional[str] = "v2.0"
    intentType: Optional[str] = "communication"


@router.post("/api/ai-chat")
async def ai_chat_endpoint(payload: AiChatRequest):
    start_time = time.time()
    service = AIHubService()

    chat_messages = [
        ChatMessage(role=str(m.get("role", "user")), content=str(m.get("content", "")))
        for m in payload.messages
        if isinstance(m, dict)
    ]

    req = GenTxtRequest(
        messages=chat_messages,
        model="gemini-4-hydrogen",
        temperature=0.7,
        stream=False,
    )
    res = await service.gentxt(req)
    latency_ms = int((time.time() - start_time) * 1000)

    prompt_tokens = int((res.usage or {}).get("prompt_tokens") or 180)
    completion_tokens = int((res.usage or {}).get("completion_tokens") or 220)

    return {
        "content": res.content,
        "model": res.model,
        "usage": {
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "totalTokens": prompt_tokens + completion_tokens,
            "latencyMs": latency_ms,
            "promptVersion": payload.promptVersion or "v2.0",
            "intentType": payload.intentType or "communication",
        },
    }
