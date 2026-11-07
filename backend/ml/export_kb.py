"""Export the assistant knowledge base to JSON so the Next.js route can answer without the Python service.

Usage: `uv run python -m ml.export_kb` (run by `make kb`, after `make train`, `make ddos`, or `make seclog`).
"""

from __future__ import annotations

import json
from dataclasses import asdict

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

from app.core.config import get_settings
from app.services.knowledge import knowledge_base


def main() -> None:
    out = get_settings().artifacts_dir / "knowledge.json"
    out.write_text(json.dumps({
        "stop_words": sorted(ENGLISH_STOP_WORDS),
        "entries": [asdict(e) for e in knowledge_base()],
    }, indent=1))
    print(f"Wrote {out} ({len(knowledge_base())} entries)")


if __name__ == "__main__":
    main()
