from pathlib import Path
import psycopg
from src.config import settings

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
LOCK_ID = 727274

def run() -> None:
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        conn.execute("SELECT pg_advisory_lock(%s)", (LOCK_ID,))
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version text PRIMARY KEY,
                    applied_at timestamptz NOT NULL DEFAULT now())
            """)
            done = {r[0] for r in conn.execute("SELECT version FROM schema_migrations")}
            for f in sorted(MIGRATIONS.glob("*.sql")):
                if f.stem in done:
                    continue
                with conn.transaction():
                    conn.execute(f.read_text())
                    conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (f.stem,))
        finally:
            conn.execute("SELECT pg_advisory_unlock(%s)", (LOCK_ID,))