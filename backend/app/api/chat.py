import json
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import ask_legal_question, stream_legal_answer
from app.db.mongodb import chats_collection, messages_collection
from app.core.security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _get_or_create_chat(payload: ChatRequest, current_user: dict) -> str:
    if payload.chat_id:
        chat = await chats_collection.find_one({"_id": ObjectId(payload.chat_id)})
        if not chat or chat["user_id"] != current_user["id"]:
            raise HTTPException(status_code=404, detail="Chat not found")
        return payload.chat_id

    new_chat = {
        "user_id": current_user["id"],
        "project_id": payload.project_id,
        "title": payload.message[:60],
        "created_at": datetime.now(timezone.utc),
    }
    result = await chats_collection.insert_one(new_chat)
    return str(result.inserted_id)


async def _get_history(chat_id: str) -> list[dict]:
    cursor = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    return await cursor.to_list(length=50)


async def _save_turn(chat_id: str, user_message: str, answer: str, sources: list[dict]):
    await messages_collection.insert_many(
        [
            {
                "chat_id": chat_id,
                "role": "user",
                "content": user_message,
                "timestamp": datetime.now(timezone.utc),
            },
            {
                "chat_id": chat_id,
                "role": "assistant",
                "content": answer,
                "sources": sources,
                "timestamp": datetime.now(timezone.utc),
            },
        ]
    )


@router.post("", response_model=ChatResponse)
async def send_message(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    chat_id = await _get_or_create_chat(payload, current_user)
    history = await _get_history(chat_id)

    try:
        result = await ask_legal_question(payload.message, history=history, project_id=payload.project_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")

    await _save_turn(chat_id, payload.message, result["answer"], result["sources"])

    return ChatResponse(answer=result["answer"], chat_id=chat_id, sources=result["sources"])


@router.post("/stream")
async def send_message_stream(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    chat_id = await _get_or_create_chat(payload, current_user)
    history = await _get_history(chat_id)

    async def event_generator():
        # First event tells the frontend which chat_id to adopt, before any tokens arrive.
        yield f"data: {json.dumps({'type': 'chat_id', 'chat_id': chat_id})}\n\n"

        try:
            async for event in stream_legal_answer(payload.message, history=history, project_id=payload.project_id):
                if event["type"] == "token":
                    yield f"data: {json.dumps({'type': 'token', 'text': event['text']})}\n\n"
                elif event["type"] == "done":
                    await _save_turn(chat_id, payload.message, event["answer"], event["sources"])
                    yield f"data: {json.dumps({'type': 'done', 'sources': event['sources']})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{chat_id}/history")
async def get_chat_history(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    if not chat or chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")

    cursor = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=500)
    for m in messages:
        m["_id"] = str(m["_id"])
    return {"chat_id": chat_id, "title": chat["title"], "messages": messages}


@router.get("")
async def list_chats(project_id: str | None = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if project_id:
        query["project_id"] = project_id
    cursor = chats_collection.find(query).sort("created_at", -1)
    chats = await cursor.to_list(length=200)
    for c in chats:
        c["id"] = str(c.pop("_id"))
    return chats


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    if not chat or chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    await chats_collection.delete_one({"_id": ObjectId(chat_id)})
    await messages_collection.delete_many({"chat_id": chat_id})
    return {"deleted": True}
