from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]

# Collections used across the app
users_collection = db["users"]
projects_collection = db["projects"]
chats_collection = db["chats"]
messages_collection = db["messages"]
documents_collection = db["documents"]
