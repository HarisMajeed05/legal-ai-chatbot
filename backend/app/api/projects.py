from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import ProjectCreate, ProjectOut, InviteRequest
from app.db.mongodb import projects_collection, chats_collection, documents_collection, users_collection
from app.core.security import get_current_user
from app.services.rag_service import delete_document_from_index

router = APIRouter(prefix="/api/projects", tags=["projects"])


async def _get_project_with_access(project_id: str, current_user: dict, require_owner: bool = False):
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project["user_id"] == current_user["id"]
    is_member = current_user["email"] in project.get("member_emails", [])

    if require_owner and not is_owner:
        raise HTTPException(status_code=403, detail="Only the project owner can do this")
    if not (is_owner or is_member):
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.post("", response_model=ProjectOut)
async def create_project(payload: ProjectCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "name": payload.name,
        "user_id": current_user["id"],
        "member_emails": [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await projects_collection.insert_one(doc)
    return ProjectOut(
        id=str(result.inserted_id),
        name=doc["name"],
        created_at=doc["created_at"],
        member_count=1,
    )


@router.get("")
async def list_projects(current_user: dict = Depends(get_current_user)):
    cursor = projects_collection.find(
        {"$or": [{"user_id": current_user["id"]}, {"member_emails": current_user["email"]}]}
    )
    projects = await cursor.to_list(length=100)
    for p in projects:
        p["id"] = str(p.pop("_id"))
    return projects


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_project_with_access(project_id, current_user)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/{project_id}/invite")
async def invite_collaborator(project_id: str, payload: InviteRequest, current_user: dict = Depends(get_current_user)):
    project = await _get_project_with_access(project_id, current_user, require_owner=True)

    invited_user = await users_collection.find_one({"email": payload.email})
    if not invited_user:
        raise HTTPException(
            status_code=404,
            detail="No account exists with that email, they need to sign up first before being invited",
        )
    if payload.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="You already own this project")
    if payload.email in project.get("member_emails", []):
        raise HTTPException(status_code=400, detail="This person is already a collaborator")

    await projects_collection.update_one(
        {"_id": ObjectId(project_id)}, {"$push": {"member_emails": payload.email}}
    )
    return {"message": f"{payload.email} added as a collaborator"}


@router.delete("/{project_id}/invite")
async def remove_collaborator(project_id: str, payload: InviteRequest, current_user: dict = Depends(get_current_user)):
    await _get_project_with_access(project_id, current_user, require_owner=True)
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)}, {"$pull": {"member_emails": payload.email}}
    )
    return {"message": f"{payload.email} removed"}


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    await _get_project_with_access(project_id, current_user, require_owner=True)

    # Clean up everything that belonged to this project, chats, messages, and
    # the actual FAISS vectors for every uploaded document, not just the
    # database records, otherwise deleted project content would keep quietly
    # influencing answers in whatever project reuses that shared FAISS index.
    docs_cursor = documents_collection.find({"project_id": project_id})
    docs = await docs_cursor.to_list(length=1000)
    for d in docs:
        delete_document_from_index(d.get("chunk_ids", []))
    await documents_collection.delete_many({"project_id": project_id})

    chat_ids = [str(c["_id"]) async for c in chats_collection.find({"project_id": project_id})]
    await chats_collection.delete_many({"project_id": project_id})
    if chat_ids:
        from app.db.mongodb import messages_collection
        await messages_collection.delete_many({"chat_id": {"$in": chat_ids}})

    await projects_collection.delete_one({"_id": ObjectId(project_id)})
    return {"deleted": True}
