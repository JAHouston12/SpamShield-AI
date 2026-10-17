"""Threat-intelligence heuristics that complement the ML model.

The SMS Spam Collection (2011) is dominated by premium-rate SMS spam, so modern smishing patterns such as
URL-shortener links and account-verification lures are under-represented. These weighted signals are
explainable on their own and, in hybrid mode, shift the model's log-odds by a capped amount.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from ml.preprocessing import CURRENCY_RE, PHONE_RE

LINK_RE = re.compile(
    r"(https?://\S+|www\.\S+|\b[a-z0-9-]+\.(?:ly|com|net|org|io|co|me|xyz|info|biz|link|top|uk|app|site|club)(?:/\S*)?)",
    re.I,
)
URGENCY_RE = re.compile(
    r"\b(urgent|immediately|now|today only|expires?|limited|act fast|last chance|asap|final notice)\b", re.I
)
PRIZE_RE = re.compile(r"\b(won|winner|win|prize|award|free|bonus|claim|reward|selected|congratulations?)\b", re.I)
CTA_RE = re.compile(r"\b(click|call|text|reply|txt|send|visit|tap|subscribe|redeem)\b", re.I)
CREDENTIAL_RE = re.compile(
    r"\b(password|verify|verification|account|bank|login|pin|ssn|security code|suspend(ed)?|locked)\b", re.I
)

SEVERITY_WEIGHT = {"high": 1.5, "medium": 0.9, "low": 0.5}
MAX_HEURISTIC_LOGIT = 3.5


@dataclass
class Signal:
    id: str
    label: str
    detected: bool
    detail: str
    severity: str
    weight: float


def extract_signals(text: str) -> list[dict]:
    letters = [c for c in text if c.isalpha()]
    upper_ratio = sum(c.isupper() for c in letters) / len(letters) if letters else 0.0

    def found(rx: re.Pattern) -> list[str]:
        return sorted({m.group(0).lower() for m in rx.finditer(text)})

    links, phones, money = found(LINK_RE), found(PHONE_RE), found(CURRENCY_RE)
    urgency, prize, cta, creds = found(URGENCY_RE), found(PRIZE_RE), found(CTA_RE), found(CREDENTIAL_RE)

    def sig(id_: str, label: str, hit: bool, detail: str, severity: str) -> Signal:
        return Signal(id_, label, hit, detail, severity, SEVERITY_WEIGHT[severity] if hit else 0.0)

    signals = [
        sig("link", "Embedded link", bool(links), ", ".join(links[:3]) or "No links found", "high"),
        sig("credentials", "Account / credential lure", bool(creds), ", ".join(creds[:4]) or "None", "high"),
        sig("prize", "Prize or reward language", bool(prize), ", ".join(prize[:4]) or "None", "medium"),
        sig("urgency", "Urgency pressure", bool(urgency), ", ".join(urgency[:4]) or "None", "medium"),
        sig("money", "Money or currency", bool(money), ", ".join(money[:3]) or "None", "medium"),
        sig("shortcode", "Premium number / short code", bool(phones), ", ".join(phones[:2]) or "None", "medium"),
        sig("cta", "Call to action", bool(cta), ", ".join(cta[:4]) or "None", "low"),
        sig(
            "shouting",
            "Excessive capitals",
            upper_ratio > 0.3 and len(letters) > 10,
            f"{upper_ratio:.0%} of letters uppercase",
            "low",
        ),
    ]
    return [asdict(s) for s in signals]


def heuristic_logit(signals: list[dict]) -> float:
    return min(sum(s["weight"] for s in signals), MAX_HEURISTIC_LOGIT)
