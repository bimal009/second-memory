import shutil
from pathlib import Path
from typing import BinaryIO
from src.config import settings

ROOT = Path(settings.storage_dir).resolve()
ROOT.mkdir(parents=True, exist_ok=True)


def path_for(key: str) -> Path:
    p = (ROOT / key).resolve()
    if ROOT not in p.parents:
        raise ValueError("Invalid storage key")
    return p


def save_stream(key: str, src: BinaryIO) -> int:
    p = path_for(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "wb") as out:
        shutil.copyfileobj(src, out)
    return p.stat().st_size


def delete_many(keys: list[str]) -> None:
    for k in keys:
        try:
            path_for(k).unlink(missing_ok=True)
        except ValueError:
            pass


def delete_prefix(prefix: str) -> None:
    shutil.rmtree(path_for(prefix), ignore_errors=True)