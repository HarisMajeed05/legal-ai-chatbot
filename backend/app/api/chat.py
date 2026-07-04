from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import ask_legal_question
from app.db.mongodb import chats_collection, messages_collection
from app.core.security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_message(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    chat_id = payload.chat_id

    if not chat_id:
        new_chat = {
            "user_id": current_user["id"],
            "project_id": payload.project_id,
            "title": payload.message[:60],
            "created_at": datetime.now(timezone.utc),
        }
        result = await chats_collection.insert_one(new_chat)
        chat_id = str(result.inserted_id)
    else:
        chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
        if not chat or chat["user_id"] != current_user["id"]:
            raise HTTPException(status_code=404, detail="Chat not found")

    # Pull prior turns for THIS chat so the model has real conversational memory,
    # instead of treating every message as a fresh, context-free question.
    cursor = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    history = await cursor.to_list(length=50)

    try:
        answer = await ask_legal_question(payload.message, history=history)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")

    await messages_collection.insert_many(
        [
            {
                "chat_id": chat_id,
                "role": "user",
                "content": payload.message,
                "timestamp": datetime.now(timezone.utc),
            },
            {
                "chat_id": chat_id,
                "role": "assistant",
                "content": answer,
                "timestamp": datetime.now(timezone.utc),
            },
        ]
    )

    return ChatResponse(answer=answer, chat_id=chat_id)


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
