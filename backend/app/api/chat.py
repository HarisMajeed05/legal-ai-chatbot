import io
import json
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors as rl_colors

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import ask_legal_question, stream_legal_answer
from app.db.mongodb import chats_collection, messages_collection, projects_collection
from app.core.security import get_current_user
from app.core.rate_limit import rate_limiter

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _user_can_access_project(project_id: str, current_user: dict) -> bool:
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        return False
    return project["user_id"] == current_user["id"] or current_user["email"] in project.get("member_emails", [])


async def _authorize_chat(chat: dict, current_user: dict):
    """A chat is accessible if you created it, or if it belongs to a project
    you have access to. The project check matters, without it, chats inside
    a shared project were silently invisible to everyone except whoever
    happened to create them, which defeats the entire point of sharing."""
    if chat["user_id"] == current_user["id"]:
        return
    if chat.get("project_id") and await _user_can_access_project(chat["project_id"], current_user):
        return
    raise HTTPException(status_code=404, detail="Chat not found")


async def _get_or_create_chat(payload: ChatRequest, current_user: dict) -> str:
    if payload.chat_id:
        chat = await chats_collection.find_one({"_id": ObjectId(payload.chat_id)})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        await _authorize_chat(chat, current_user)
        return payload.chat_id

    if payload.project_id and not await _user_can_access_project(payload.project_id, current_user):
        raise HTTPException(status_code=404, detail="Project not found")

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
                "grounded": len(sources) > 0,
                "timestamp": datetime.now(timezone.utc),
            },
        ]
    )


@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest, current_user: dict = Depends(rate_limiter(max_requests=30, window_seconds=60))
):
    chat_id = await _get_or_create_chat(payload, current_user)
    history = await _get_history(chat_id)

    try:
        result = await ask_legal_question(payload.message, history=history, project_id=payload.project_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")

    await _save_turn(chat_id, payload.message, result["answer"], result["sources"])

    return ChatResponse(answer=result["answer"], chat_id=chat_id, sources=result["sources"])


@router.post("/stream")
async def send_message_stream(
    payload: ChatRequest, current_user: dict = Depends(rate_limiter(max_requests=30, window_seconds=60))
):
    chat_id = await _get_or_create_chat(payload, current_user)
    history = await _get_history(chat_id)

    async def event_generator():
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
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await _authorize_chat(chat, current_user)

    cursor = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=500)
    for m in messages:
        m["_id"] = str(m["_id"])
    return {"chat_id": chat_id, "title": chat["title"], "messages": messages}


@router.get("/{chat_id}/export")
async def export_chat_pdf(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await _authorize_chat(chat, current_user)

    cursor = messages_collection.find({"chat_id": chat_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=500)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ChatTitle", parent=styles["Heading1"], fontSize=18, textColor=rl_colors.HexColor("#0b1d3a")
    )
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=rl_colors.grey)
    user_style = ParagraphStyle(
        "UserMsg", parent=styles["Normal"], fontSize=11, textColor=rl_colors.HexColor("#0b1d3a"),
        spaceBefore=14, spaceAfter=4, fontName="Helvetica-Bold",
    )
    answer_style = ParagraphStyle(
        "AnswerMsg", parent=styles["Normal"], fontSize=10.5, leading=15, spaceAfter=4,
    )
    source_style = ParagraphStyle(
        "SourceMsg", parent=styles["Normal"], fontSize=8.5, textColor=rl_colors.HexColor("#c9a227"), spaceAfter=10,
    )

    story = [
        Paragraph("Law AI Assistant, Chat Export", title_style),
        Paragraph(chat.get("title", "Untitled chat"), styles["Heading3"]),
        Paragraph(f"Exported {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", meta_style),
        Spacer(1, 16),
    ]

    for m in messages:
        text = m["content"].replace("\n", "<br/>")
        if m["role"] == "user":
            story.append(Paragraph(f"You: {text}", user_style))
        else:
            story.append(Paragraph(f"Assistant: {text}", answer_style))
            sources = m.get("sources") or []
            if sources:
                names = ", ".join(s.get("filename", "unknown") for s in sources)
                story.append(Paragraph(f"Sources: {names}", source_style))

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "This export is for reference only and is not a substitute for advice from a licensed attorney.",
        meta_style,
    ))

    doc.build(story)
    buffer.seek(0)

    safe_title = "".join(c for c in chat.get("title", "chat") if c.isalnum() or c in " -_")[:50] or "chat"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )


@router.get("")
async def list_chats(project_id: str | None = None, current_user: dict = Depends(get_current_user)):
    if project_id:
        if not await _user_can_access_project(project_id, current_user):
            raise HTTPException(status_code=404, detail="Project not found")
        # Shared: everyone with project access sees the same chats, not just their own.
        query = {"project_id": project_id}
    else:
        query = {"user_id": current_user["id"], "project_id": None}
    cursor = chats_collection.find(query).sort("created_at", -1)
    chats = await cursor.to_list(length=200)
    for c in chats:
        c["id"] = str(c.pop("_id"))
    return chats


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await _authorize_chat(chat, current_user)
    await chats_collection.delete_one({"_id": ObjectId(chat_id)})
    await messages_collection.delete_many({"chat_id": chat_id})
    return {"deleted": True}
