from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    chat_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    chat_id: str
    sources: List[dict] = []


class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    member_count: int = 1


class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ChatSummary(BaseModel):
    id: str
    title: str
    project_id: Optional[str] = None
    created_at: datetime
