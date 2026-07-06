from datetime import datetime, timezone
import io

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pypdf import PdfReader

from app.core.security import get_current_user
from app.core.rate_limit import rate_limiter
from app.db.mongodb import documents_collection, projects_collection
from app.services.rag_service import add_document_to_index, delete_document_from_index

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE_MB = 20


async def _verify_project_access(project_id: str, current_user: dict):
    """Allows the project owner or anyone invited as a collaborator. Upload and
    delete both go through this, delete additionally checks ownership on top."""
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    is_owner = project["user_id"] == current_user["id"]
    is_member = current_user["email"] in project.get("member_emails", [])
    if not (is_owner or is_member):
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _extract_pdf_text(raw: bytes) -> tuple[str, bool]:
    """Tries normal text extraction first. If that yields nothing, usually a
    scanned document with no text layer, falls back to OCR. Returns the text
    and whether OCR was actually used, so the caller can report that back.

    OCR requires two system-level installs that pip cannot provide on its
    own: the Tesseract OCR engine, and Poppler (for rendering PDF pages to
    images). If either is missing, this fails closed with a clear message
    rather than crashing, so a normal text-based PDF upload still works fine
    even on a machine that never set up OCR at all.
    """
    reader = PdfReader(io.BytesIO(raw))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if text.strip():
        return text, False

    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError:
        raise HTTPException(
            status_code=400,
            detail=(
                "This PDF has no extractable text, it looks like a scanned document. "
                "OCR is not set up on this server yet. Install the pytesseract and "
                "pdf2image Python packages, plus the Tesseract OCR engine and Poppler "
                "system binaries, then try again."
            ),
        )

    try:
        images = convert_from_bytes(raw)
        ocr_text = "\n".join(pytesseract.image_to_string(img) for img in images)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=(
                f"OCR was attempted but failed: {e}. This usually means Tesseract or "
                "Poppler is not installed or not on your system PATH."
            ),
        )

    if not ocr_text.strip():
        raise HTTPException(
            status_code=400,
            detail="OCR ran but could not read any text from this document, it may be too low quality or blank.",
        )

    return ocr_text, True


@router.post("/upload")
async def upload_document(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(rate_limiter(max_requests=10, window_seconds=300)),
):
    await _verify_project_access(project_id, current_user)

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds the {MAX_FILE_SIZE_MB}MB limit")

    try:
        text, used_ocr = _extract_pdf_text(raw)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    chunk_count, chunk_ids = add_document_to_index(text, project_id=project_id, filename=file.filename)

    doc_record = {
        "project_id": project_id,
        "user_id": current_user["id"],
        "filename": file.filename,
        "chunk_count": chunk_count,
        "chunk_ids": chunk_ids,
        "used_ocr": used_ocr,
        "uploaded_at": datetime.now(timezone.utc),
    }
    result = await documents_collection.insert_one(doc_record)

    message = f"Indexed {chunk_count} chunks from {file.filename}"
    if used_ocr:
        message += " (extracted using OCR, this was a scanned document)"

    return {
        "id": str(result.inserted_id),
        "filename": file.filename,
        "chunk_count": chunk_count,
        "used_ocr": used_ocr,
        "message": message,
    }


@router.get("")
async def list_documents(project_id: str, current_user: dict = Depends(get_current_user)):
    await _verify_project_access(project_id, current_user)
    cursor = documents_collection.find({"project_id": project_id}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("chunk_ids", None)
    return docs


@router.delete("/{document_id}")
async def delete_document_record(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await documents_collection.find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    project = await projects_collection.find_one({"_id": ObjectId(doc["project_id"])})
    is_owner = project and project["user_id"] == current_user["id"]
    if not is_owner:
        raise HTTPException(status_code=403, detail="Only the project owner can delete documents")

    # This is the actual fix, earlier versions only removed the database
    # record and left the document's chunks searchable in FAISS forever.
    delete_document_from_index(doc.get("chunk_ids", []))
    await documents_collection.delete_one({"_id": ObjectId(document_id)})
    return {"deleted": True}
