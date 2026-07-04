from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import ProjectCreate, ProjectOut
from app.db.mongodb import projects_collection, chats_collection
from app.core.security import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
async def create_project(payload: ProjectCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "name": payload.name,
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await projects_collection.insert_one(doc)
    return ProjectOut(id=str(result.inserted_id), name=doc["name"], created_at=doc["created_at"])


@router.get("")
async def list_projects(current_user: dict = Depends(get_current_user)):
    cursor = projects_collection.find({"user_id": current_user["id"]})
    projects = await cursor.to_list(length=100)
    for p in projects:
        p["id"] = str(p.pop("_id"))
    return projects


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    doc = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Project not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    doc = await projects_collection.find_one({"_id": ObjectId(project_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Project not found")
    await projects_collection.delete_one({"_id": ObjectId(project_id)})
    # Also remove chats that belonged only to this project, keep messages cleanup simple
    await chats_collection.delete_many({"project_id": project_id, "user_id": current_user["id"]})
    return {"deleted": True}
