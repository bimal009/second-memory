import secrets

from fastapi import APIRouter, Depends
from psycopg.rows import dict_row

from src.db import pool
from src.deps import current_user, hash_key
from src.schemas import DeviceIn, MeOnboard, MeOut, MePatch

router = APIRouter(tags=["me"])


@router.get("/me", response_model=MeOut)
def get_me(user=Depends(current_user)):
    return user


@router.patch("/me", response_model=MeOut)
def patch_me(body: MePatch, user=Depends(current_user)):
    with pool.connection() as conn:
        return conn.cursor(row_factory=dict_row).execute(
            """UPDATE users SET assistant_name = COALESCE(%s, assistant_name),
                                timezone = COALESCE(%s, timezone)
               WHERE id = %s RETURNING id, assistant_name, timezone""",
            (body.assistant_name, body.timezone, user["id"]),
        ).fetchone()


@router.post("/onboard", status_code=201)
def onboard(body: MeOnboard):
    api_key = secrets.token_urlsafe(32)
    with pool.connection() as conn:
        user = conn.cursor(row_factory=dict_row).execute(
            """INSERT INTO users (assistant_name, timezone, api_key_hash)
               VALUES (%s, %s, %s)
               RETURNING id AS user_id, assistant_name, timezone""",
            (body.assistant_name, body.timezone, hash_key(api_key)),
        ).fetchone()
    return {**user, "api_key": api_key}


@router.post("/devices", status_code=204)
def register_device(body: DeviceIn, user=Depends(current_user)):
    with pool.connection() as conn:
        conn.execute(
            """INSERT INTO devices (user_id, push_token, platform)
               VALUES (%s, %s, %s)
               ON CONFLICT (push_token)
               DO UPDATE SET user_id = EXCLUDED.user_id, last_seen_at = now()""",
            (user["id"], body.push_token, body.platform),
        )