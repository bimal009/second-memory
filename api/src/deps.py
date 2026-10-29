import hashlib
from fastapi import Header, HTTPException
from psycopg.rows import dict_row
from src.db import pool


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def current_user(x_api_key: str = Header(...)) -> dict:
    with pool.connection() as conn:
        row = conn.cursor(row_factory=dict_row).execute(
            "SELECT id, assistant_name, timezone FROM users WHERE api_key_hash = %s",
            (hash_key(x_api_key),),
        ).fetchone()
    if not row:
        raise HTTPException(401, "Invalid API key")
    return row