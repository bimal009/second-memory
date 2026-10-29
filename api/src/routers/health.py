import time
from fastapi import APIRouter

router = APIRouter()

START_TIME = time.monotonic()


@router.get("/health", tags=["health"])
def get_health():
    uptime = time.monotonic() - START_TIME

    return {
        "status": "ok",
        "uptime": round(uptime, 2),
        "message": "API is running normally",
    }