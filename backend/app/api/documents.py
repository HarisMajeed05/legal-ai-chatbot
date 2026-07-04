from datetime import datetime, timezone
import io

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pypdf import PdfReader

from app.core.security import get_current_user
from app.db.mongodb import documents_collection, projects_collection
from app.services.rag_service import add_document_to_index

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE_MB = 20


async def _verify_project_ownership(project_id: str, user_id: str):
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project or project["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("/upload")
async def upload_document(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    await _verify_project_ownership(project_id, current_user["id"])

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds the {MAX_FILE_SIZE_MB}MB limit")

    try:
        reader = PdfReader(io.BytesIO(raw))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in this PDF. It may be a scanned image without OCR.",
        )

    chunk_count = add_document_to_index(text, project_id=project_id, filename=file.filename)

    doc_record = {
        "project_id": project_id,
        "user_id": current_user["id"],
        "filename": file.filename,
        "chunk_count": chunk_count,
        "uploaded_at": datetime.now(timezone.utc),
    }
    result = await documents_collection.insert_one(doc_record)

    return {
        "id": str(result.inserted_id),
        "filename": file.filename,
        "chunk_count": chunk_count,
        "message": f"Indexed {chunk_count} chunks from {file.filename}",
    }


@router.get("")
async def list_documents(project_id: str, current_user: dict = Depends(get_current_user)):
    await _verify_project_ownership(project_id, current_user["id"])
    cursor = documents_collection.find({"project_id": project_id}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@router.delete("/{document_id}")
async def delete_document_record(document_id: str, current_user: dict = Depends(get_current_user)):
    """Removes the tracking record. Note: does not currently remove the chunks
    already embedded in FAISS, since FAISS doesn't support deletion by metadata
    without rebuilding the whole index. Fine for a first version, worth revisiting
    if documents need to be fully retractable later."""
    doc = await documents_collection.find_one({"_id": ObjectId(document_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Document not found")
    await documents_collection.delete_one({"_id": ObjectId(document_id)})
    return {"deleted": True}
