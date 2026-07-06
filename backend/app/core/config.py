from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "legal_ai"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    faiss_index_path: str = "data/faiss_index"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    frontend_origin: str = "http://localhost:5173"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
