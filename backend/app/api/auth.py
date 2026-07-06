from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import UserSignup, UserLogin, TokenResponse, ProfileUpdate, PasswordChange
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.db.mongodb import users_collection
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserSignup):
    existing = await users_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user={"id": user_id, "name": payload.name, "email": payload.email},
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await users_collection.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user={"id": user_id, "name": user["name"], "email": user["email"]},
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}


@router.put("/me")
async def update_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.email is not None and payload.email != current_user["email"]:
        existing = await users_collection.find_one({"email": payload.email})
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        updates["email"] = payload.email

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    await users_collection.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})
    updated = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    return {"id": current_user["id"], "name": updated["name"], "email": updated["email"]}


@router.post("/change-password")
async def change_password(payload: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    new_hash = hash_password(payload.new_password)
    await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])}, {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password updated successfully"}