import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src import migrate
from src.db import pool
from src.routers.health import router as health_router
from src.routers.me import router as me_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("second-memory")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        migrate.run()
        log.info("Migrations applied")
    except Exception:
        log.exception("Migration failed")
        raise

    pool.open()
    try:
        pool.wait(timeout=10)
        log.info("Database connection established")
    except Exception:
        log.exception("Database connection failed")
        pool.close()
        raise

    try:
        yield
    finally:
        pool.close()


app = FastAPI(
    title="Second Memory API",
    description="Personal memory assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)

app.include_router(me_router)
