"""Dataset acquisition and loading for the SMS Spam Collection.

Supports two sources, checked in order:
1. `data/raw/spam.csv`: the Kaggle export (columns v1, v2 plus mostly-empty extra columns, latin-1).
2. `data/raw/SMSSpamCollection`: the original UCI tab-separated file, downloaded automatically if missing.
"""

from __future__ import annotations

import io
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from app.core.config import BACKEND_ROOT

RAW_DIR = BACKEND_ROOT / "data" / "raw"
KAGGLE_CSV = RAW_DIR / "spam.csv"
UCI_FILE = RAW_DIR / "SMSSpamCollection"
UCI_ZIP_URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"

LABEL_COL = "label"
TEXT_COL = "message"


@dataclass
class RawDataset:
    frame: pd.DataFrame
    """Raw frame exactly as loaded (all original columns, before any cleaning)."""
    source: str
    label_col: str
    text_col: str


def download_uci(dest: Path = UCI_FILE) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(UCI_ZIP_URL, timeout=60) as resp:
        payload = resp.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        dest.write_bytes(zf.read("SMSSpamCollection"))
    return dest


def load_raw() -> RawDataset:
    if KAGGLE_CSV.exists():
        frame = pd.read_csv(KAGGLE_CSV, encoding="latin-1")
        return RawDataset(frame=frame, source="kaggle", label_col="v1", text_col="v2")

    if not UCI_FILE.exists():
        download_uci()
    frame = pd.read_csv(UCI_FILE, sep="\t", header=None, names=[LABEL_COL, TEXT_COL], quoting=3, encoding="utf-8")
    return RawDataset(frame=frame, source="uci", label_col=LABEL_COL, text_col=TEXT_COL)


def to_canonical(raw: RawDataset) -> pd.DataFrame:
    """Return a two-column frame (`label`, `message`) with missing rows dropped and labels normalized."""
    df = raw.frame[[raw.label_col, raw.text_col]].rename(columns={raw.label_col: LABEL_COL, raw.text_col: TEXT_COL})
    df = df.dropna(subset=[LABEL_COL, TEXT_COL])
    df[LABEL_COL] = df[LABEL_COL].str.strip().str.lower()
    df[TEXT_COL] = df[TEXT_COL].astype(str)
    df = df[df[LABEL_COL].isin(["ham", "spam"])]
    return df.reset_index(drop=True)
