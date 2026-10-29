from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    meta_api_key: str
    meta_base_url: str = "https://api.meta.ai/v1"
    chat_model: str = "muse-spark-1.3"      
    router_model: str = "muse-spark-1.3"    
    asr_path: str = "/asr/transcribe"       

    app_api_key: str                        

    database_url: str 
    storage_dir: str = "storage"

    embed_model: str = "BAAI/bge-small-en-v1.5"
    embed_dim: int = 384

    max_clip_seconds: int = 60
    max_upload_mb: int = 50
    max_frames_per_clip: int = 8



settings = Settings()