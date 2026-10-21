"""Dataset loading for the SMS Spam Collection Dataset (Kaggle).

The project uses only the Kaggle export, committed at `data/spam.csv`:
https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset

Two quirks of that file are handled in `to_canonical`:
- Commas inside some messages split them across the unnamed columns 2-4; those fragments are rejoined.
- Non-ASCII characters were mis-encoded when the CSV was produced (e.g. "å£" for "£"); they are repaired.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from app.core.config import BACKEND_ROOT

KAGGLE_CSV = BACKEND_ROOT / "data" / "spam.csv"
KAGGLE_URL = "https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset"

LABEL_COL = "label"
TEXT_COL = "message"

# Mis-encoded sequences found in the Kaggle CSV and the characters they stand for.
MOJIBAKE = {
    "å£": "£",
    "Ì_": "ü",
    "ÌÏ": "Ü",
    "Ì©": "é",
    "Ì¬": "è",
    "Ì¼": "ú",
    "Ìä": "É",
    "\x89Û÷": "‘",
    "\x89Ûª": "’",
    "\x89Û_": "…",
    "\x89ÛÒ": "–",
    "\x89ÛÓ": "—",
    "\x89ÛÏ": "“",
    "åÕ": "’",
    "åÔ": "‘",
    "åÒ": "“",
    "åÓ": "”",
    "åÐ": "–",
    "åÁ": "¡",
    "åÈ": "»",
}


@dataclass
class RawDataset:
    frame: pd.DataFrame
    """Raw frame exactly as loaded (all original columns, before any cleaning)."""
    source: str
    label_col: str
    text_col: str


def load_raw() -> RawDataset:
    if not KAGGLE_CSV.exists():
        raise FileNotFoundError(f"Dataset not found at {KAGGLE_CSV}. Download spam.csv from {KAGGLE_URL}.")
    frame = pd.read_csv(KAGGLE_CSV, encoding="latin-1")
    return RawDataset(frame=frame, source="kaggle", label_col="v1", text_col="v2")


def repair_encoding(text: str) -> str:
    for bad, good in MOJIBAKE.items():
        text = text.replace(bad, good)
    return text


def quality_report(raw: RawDataset) -> dict[str, int]:
    """Counts of rows affected by the two Kaggle quirks repaired in `to_canonical`."""
    overflow = [c for c in raw.frame.columns if c not in (raw.label_col, raw.text_col)]
    text = raw.frame[raw.text_col].astype(str)
    return {
        "rows_rejoined": int(raw.frame[overflow].notna().any(axis=1).sum()) if overflow else 0,
        "rows_encoding_repaired": int((text.map(repair_encoding) != text).sum()),
    }


def to_canonical(raw: RawDataset) -> pd.DataFrame:
    """Return a two-column frame (`label`, `message`): spilled fragments rejoined, encoding repaired."""
    frame = raw.frame
    overflow = [c for c in frame.columns if c not in (raw.label_col, raw.text_col)]
    text = frame[[raw.text_col, *overflow]].apply(
        lambda row: ",".join(str(v) for v in row if pd.notna(v)), axis=1
    )
    df = pd.DataFrame({LABEL_COL: frame[raw.label_col], TEXT_COL: text})
    df = df.dropna(subset=[LABEL_COL])
    df = df[df[TEXT_COL].str.strip() != ""]
    df[LABEL_COL] = df[LABEL_COL].str.strip().str.lower()
    df[TEXT_COL] = df[TEXT_COL].map(repair_encoding)
    df = df[df[LABEL_COL].isin(["ham", "spam"])]
    return df.reset_index(drop=True)
