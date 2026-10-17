from __future__ import annotations

import json
import threading
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings

ARTIFACT_NAMES = ("dataset", "eda", "preprocessing", "models", "evaluation", "explain", "manifest")


class ArtifactNotFoundError(RuntimeError):
    def __init__(self, name: str, path: Path):
        super().__init__(f"Artifact '{name}' not found at {path}. Run `make train` to generate it.")
        self.name = name


class ArtifactStore:
    """Reads training artifacts from disk, caching each file until its mtime changes."""

    def __init__(self, root: Path):
        self.root = root
        self._cache: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def path(self, name: str) -> Path:
        return self.root / f"{name}.json"

    def get(self, name: str) -> Any:
        path = self.path(name)
        if not path.exists():
            raise ArtifactNotFoundError(name, path)
        mtime = path.stat().st_mtime
        with self._lock:
            cached = self._cache.get(name)
            if cached and cached[0] == mtime:
                return cached[1]
            data = json.loads(path.read_text())
            self._cache[name] = (mtime, data)
            return data

    def available(self) -> dict[str, bool]:
        return {name: self.path(name).exists() for name in ARTIFACT_NAMES}


@lru_cache
def get_artifact_store() -> ArtifactStore:
    return ArtifactStore(get_settings().artifacts_dir)
