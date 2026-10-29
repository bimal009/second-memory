from psycopg_pool import ConnectionPool

from src.config import settings

pool = ConnectionPool(settings.database_url, open=True)
