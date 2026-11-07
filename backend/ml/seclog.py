"""Assignment 8: generate a seeded week of web/auth logs, detect attacks with rules, and summarise for the dashboard.

The log is synthetic (a fictional shop, 7 days, ~20k events) with planted incidents so every detection rule has
something real to find. No real system was attacked.

Usage: `uv run python -m ml.seclog` (or `make seclog` from the repo root).
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "artifacts" / "seclog.json"
SEED = 8
START = datetime(2026, 10, 26, tzinfo=UTC)
DAYS = 7

BRUTE_WINDOW = "5min"
BRUTE_MIN_FAILS = 5
STUFFING_MIN_USERS = 10
FLOOD_Z = 4.0
TRAVEL_HOURS = 2

SQLI_RE = re.compile(r"(?:'|%27)\s*(?:or|and)\s|union(?:\s|%20)+select|--|;\s*drop\s|sleep\(", re.I)
XSS_RE = re.compile(r"<script|%3cscript|onerror\s*=|javascript:|<img[^>]+src", re.I)

PAGES = ["/", "/products", "/products/laptops", "/products/phones", "/cart", "/search?q=headphones", "/about",
         "/account", "/products?id=42", "/checkout", "/blog/security-tips", "/search?q=usb+c+cable"]
COUNTRIES = ["US"] * 14 + ["CA", "GB", "DE", "IN"]
SEVERITY_WEIGHT = {"critical": 30, "high": 20, "medium": 10, "low": 5}

rng = np.random.default_rng(SEED)


def ts(day: int, hour: float) -> datetime:
    return START + timedelta(days=day, seconds=float(hour) * 3600)


def normal_traffic() -> list[dict]:
    users = [f"user{i:03d}" for i in range(80)] + ["mchen", "jhouston", "admin"]
    home = {u: (f"73.{rng.integers(10, 250)}.{rng.integers(0, 255)}.{rng.integers(1, 254)}", rng.choice(COUNTRIES))
            for u in users}
    rows = []
    for day in range(DAYS):
        for _ in range(rng.integers(1300, 1600)):
            hour = float(np.clip(rng.normal(14, 4), 0, 23.99))
            user = str(rng.choice(users))
            ip, country = home[user]
            if rng.random() < 0.18:
                fail = rng.random() < 0.06
                rows.append({"ts": ts(day, hour), "ip": ip, "country": country, "user": user,
                             "event": "login_failure" if fail else "login_success", "path": "/login",
                             "status": 401 if fail else 200})
                if fail:
                    rows.append({"ts": ts(day, hour + 0.01), "ip": ip, "country": country, "user": user,
                                 "event": "login_success", "path": "/login", "status": 200})
            else:
                rows.append({"ts": ts(day, hour), "ip": ip, "country": country, "user": None, "event": "http",
                             "path": str(rng.choice(PAGES)), "status": int(rng.choice([200] * 30 + [404, 302]))})
    return rows


def attacks() -> list[dict]:
    rows = []

    ip = "185.220.101.47"
    for i in range(380):
        rows.append({"ts": ts(1, 2.2 + i * 0.0009), "ip": ip, "country": "RU", "user": "admin",
                     "event": "login_failure", "path": "/login", "status": 401})

    ip = "45.155.205.233"
    victims = ["user017", "user052"] + [f"user{i:03d}" for i in range(80) if i not in (17, 52)][:68]
    victims += [f"guest{i}" for i in range(60)]
    for i, user in enumerate(rng.permutation(victims)):
        ok = user in ("user017", "user052")
        rows.append({"ts": ts(3, 3.5 + i * 0.004), "ip": ip, "country": "NL", "user": str(user),
                     "event": "login_success" if ok else "login_failure", "path": "/login",
                     "status": 200 if ok else 401})

    ip = "103.152.118.20"
    payloads = ["/products?id=42' OR '1'='1", "/products?id=42 UNION SELECT username,password FROM users--",
                "/products?id=1; DROP TABLE orders", "/search?q=x' AND sleep(5)--", "/login?user=admin'--"]
    for i in range(42):
        rows.append({"ts": ts(2, 11.0 + i * 0.01), "ip": ip, "country": "CN", "user": None, "event": "http",
                     "path": payloads[i % len(payloads)], "status": int(rng.choice([500, 403, 200]))})

    ip = "91.240.118.172"
    payloads = ["/search?q=<script>alert(document.cookie)</script>", "/search?q=<img src=x onerror=alert(1)>",
                "/blog/security-tips?ref=javascript:alert(1)",
                "/search?q=%3Cscript%3Efetch('//evil.example')%3C/script%3E"]
    for i in range(27):
        rows.append({"ts": ts(4, 16.0 + i * 0.012), "ip": ip, "country": "UA", "user": None, "event": "http",
                     "path": payloads[i % len(payloads)], "status": 200})

    bots = [f"203.0.113.{i}" for i in range(1, 61)] + [f"198.51.100.{i}" for i in range(1, 31)]
    for _ in range(8200):
        rows.append({"ts": ts(5, 14.0 + rng.random() / 6), "ip": str(rng.choice(bots)), "country": str(rng.choice(
            ["BR", "VN", "ID", "IN", "US", "TR"])), "user": None, "event": "http", "path": "/", "status": int(
            rng.choice([200, 200, 503]))})

    rows += [
        {"ts": ts(2, 9.0), "ip": "73.41.18.9", "country": "US", "user": "mchen", "event": "login_success",
         "path": "/login", "status": 200},
        {"ts": ts(2, 9.33), "ip": "95.173.136.70", "country": "RU", "user": "mchen", "event": "login_success",
         "path": "/login", "status": 200},
    ]
    return rows


def build_log() -> pd.DataFrame:
    df = pd.DataFrame(normal_traffic() + attacks()).sort_values("ts").reset_index(drop=True)
    return df


def detect(df: pd.DataFrame) -> list[dict]:
    incidents: list[dict] = []
    fails = df[df.event == "login_failure"].set_index("ts")

    for ip, g in fails.groupby("ip"):
        rolling = g["event"].rolling(BRUTE_WINDOW).count()
        if rolling.max() >= BRUTE_MIN_FAILS and g["user"].nunique() < STUFFING_MIN_USERS:
            incidents.append(_incident("Brute-force login", "high", [ip], g, f"{len(g)} failed logins for "
                                       f"'{', '.join(g.user.unique()[:3])}' (peak {int(rolling.max())} in 5 min)",
                                       f">= {BRUTE_MIN_FAILS} failed logins from one IP within 5 minutes"))

    logins = df[df.event.isin(["login_failure", "login_success"])]
    for ip, g in logins.groupby("ip"):
        users = g["user"].nunique()
        if users >= STUFFING_MIN_USERS:
            hits = g[g.event == "login_success"]["user"].unique().tolist()
            sev = "critical" if hits else "high"
            incidents.append(_incident("Credential stuffing", sev, [ip], g.set_index("ts"),
                                       f"{users} different usernames tried; {len(hits)} succeeded "
                                       f"({', '.join(hits) or 'none'}): reset these passwords",
                                       f">= {STUFFING_MIN_USERS} distinct usernames from one IP"))

    http = df[df.event == "http"]
    for name, regex, sev, note in (("SQL injection probe", SQLI_RE, "high", "SQL keywords/quotes in URL parameters"),
                                   ("Cross-site scripting (XSS) probe", XSS_RE, "medium",
                                    "script tags / event handlers in URL parameters")):
        hits = http[http.path.str.contains(regex)]
        for ip, g in hits.groupby("ip"):
            incidents.append(_incident(name, sev, [ip], g.set_index("ts"), f"{len(g)} malicious requests, e.g. "
                                       f"{g.path.iloc[0]}", f"Signature match: {note}"))

    per_min = http.set_index("ts").resample("1min").size()
    mean, std = per_min.mean(), per_min.std() or 1
    z = (per_min - mean) / std
    spike = z[z > FLOOD_Z]
    if len(spike):
        window = http[http.ts.dt.floor("1min").isin(spike.index)]
        counts = window.groupby("ip").size()
        bots = counts[counts >= 20].index.tolist()
        g = window[window.ip.isin(bots)].set_index("ts")
        incidents.append(_incident("HTTP flood (DDoS)", "critical", bots, g,
                                   f"{len(g):,} requests from {len(bots)} IPs in {len(spike)} min; peak "
                                   f"{int(per_min.max()):,} req/min vs normal {mean:.1f} (z={z.max():.0f})",
                                   f"Per-minute request rate z-score > {FLOOD_Z:g}"))

    ok = df[df.event == "login_success"].sort_values("ts")
    for user, g in ok.groupby("user"):
        prev = g.shift()
        jump = g[(g.country != prev.country) & prev.country.notna() &
                 ((g.ts - prev.ts) < pd.Timedelta(hours=TRAVEL_HOURS))]
        for idx, row in jump.iterrows():
            p = prev.loc[idx]
            mins = int((row.ts - p.ts).total_seconds() // 60)
            incidents.append({
                "type": "Impossible travel", "severity": "high", "ips": [row.ip], "user": user,
                "start": p.ts.isoformat(), "end": row.ts.isoformat(), "events": 2,
                "detail": f"'{user}' logged in from {p.country} then {row.country} {mins} min later",
                "rule": f"Successful logins from two countries < {TRAVEL_HOURS} h apart",
            })

    incidents.sort(key=lambda i: i["start"])
    for n, inc in enumerate(incidents, 1):
        inc["id"] = f"INC-{n:03d}"
    return incidents


def _incident(kind: str, severity: str, ips: list[str], g: pd.DataFrame, detail: str, rule: str) -> dict:
    users = [u for u in g["user"].dropna().unique().tolist()]
    return {
        "type": kind, "severity": severity, "ips": ips, "user": users[0] if len(users) == 1 else None,
        "start": g.index.min().isoformat(), "end": g.index.max().isoformat(), "events": int(len(g)),
        "detail": detail, "rule": rule,
    }


def threat(incidents: list[dict]) -> dict:
    score = min(100, sum(SEVERITY_WEIGHT[i["severity"]] for i in incidents))
    level = next(lv for lim, lv in ((80, "Severe"), (60, "High"), (40, "Elevated"), (20, "Guarded"), (0, "Low"))
                 if score >= lim)
    return {"score": score, "level": level}


def summarise(df: pd.DataFrame, incidents: list[dict]) -> dict:
    bad_ips = {ip for i in incidents for ip in i["ips"]}
    df["suspicious"] = df.ip.isin(bad_ips)
    logins = df[df.event != "http"]

    days = []
    for d in range(DAYS):
        day = df[(df.ts >= ts(d, 0)) & (df.ts < ts(d + 1, 0))]
        day_inc = [i for i in incidents if ts(d, 0).isoformat() <= i["start"] < ts(d + 1, 0).isoformat()]
        days.append({
            "day": (START + timedelta(days=d)).strftime("%a %b %d"),
            "normal": int((~day.suspicious).sum()), "suspicious": int(day.suspicious.sum()),
            "failed_logins": int((day.event == "login_failure").sum()),
            "incidents": len(day_inc), "threat": threat(day_inc)["score"],
        })

    hourly = df[df.event == "login_failure"].set_index("ts").resample("1h").size()
    hourly = hourly.reindex(pd.date_range(START, periods=DAYS * 24, freq="1h", tz=UTC), fill_value=0)

    by_type: dict[str, dict] = {}
    for i in incidents:
        t = by_type.setdefault(i["type"], {"type": i["type"], "incidents": 0, "events": 0})
        t["incidents"] += 1
        t["events"] += i["events"]

    top = []
    for ip, g in df[df.suspicious].groupby("ip"):
        types = sorted({i["type"] for i in incidents if ip in i["ips"]})
        top.append({"ip": ip, "country": g.country.mode().iloc[0], "events": int(len(g)),
                    "failed_logins": int((g.event == "login_failure").sum()), "types": types,
                    "first_seen": g.ts.min().isoformat(), "last_seen": g.ts.max().isoformat()})
    top.sort(key=lambda r: (-len(r["types"]), -r["events"]))
    flood_ips = [r for r in top if r["types"] == ["HTTP flood (DDoS)"]]
    top_ips = [r for r in top if r not in flood_ips][:8] + flood_ips[:3]

    def profile(mask: pd.Series) -> dict:
        part = df[mask]
        lg = part[part.event != "http"]
        active_hours = part.assign(h=part.ts.dt.floor("h")).groupby("ip").h.nunique()
        return {
            "ips": int(part.ip.nunique()),
            "events": int(len(part)),
            "events_per_ip_hour": round(float(len(part) / max(1, active_hours.sum())), 1),
            "login_failure_rate": round(float((lg.event == "login_failure").mean()) if len(lg) else 0.0, 4),
            "usernames_per_ip": round(float(lg.groupby("ip").user.nunique().mean()) if len(lg) else 0.0, 1),
            "signature_hits": int(part.path.str.contains(SQLI_RE).sum() + part.path.str.contains(XSS_RE).sum()),
            "night_share": round(float(((part.ts.dt.hour < 6)).mean()), 4),
            "error_share": round(float((part.status >= 400).mean()), 4),
        }

    picks = df[~df.suspicious].sample(4, random_state=SEED)
    firsts = [df[(df.ip.isin(i["ips"])) & (df.ts >= pd.Timestamp(i["start"]))].head(1) for i in incidents]
    sample = pd.concat([picks, *firsts]).sort_values("ts")
    sample_lines = [
        f'{r.ts.strftime("%Y-%m-%dT%H:%M:%SZ")} {r.ip} [{r.country}] {r.event} '
        f'user={r.user if isinstance(r.user, str) else "-"} "{"POST" if r.event != "http" else "GET"} {r.path}" '
        f"{r.status}"
        for r in sample.itertuples()
    ]

    return {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "window": {"start": START.isoformat(), "end": (START + timedelta(days=DAYS)).isoformat(), "days": DAYS},
        "totals": {
            "events": int(len(df)),
            "http_requests": int((df.event == "http").sum()),
            "login_attempts": int(len(logins)),
            "failed_logins": int((df.event == "login_failure").sum()),
            "unique_ips": int(df.ip.nunique()),
            "suspicious_ips": len(bad_ips),
            "detected_attacks": len(incidents),
            "security_events": int(df.suspicious.sum()),
        },
        "threat": threat(incidents),
        "days": days,
        "hourly_failed_logins": [{"hour": t.strftime("%a %H:00"), "failed": int(v)} for t, v in hourly.items()],
        "attacks_by_type": sorted(by_type.values(), key=lambda t: -t["events"]),
        "incidents": incidents,
        "top_ips": top_ips,
        "comparison": {"normal": profile(~df.suspicious), "suspicious": profile(df.suspicious)},
        "rules": [
            {"name": "Brute force", "logic": f">= {BRUTE_MIN_FAILS} failed logins from one IP in 5 minutes"},
            {"name": "Credential stuffing", "logic": f">= {STUFFING_MIN_USERS} distinct usernames from one IP"},
            {"name": "SQL injection", "logic": "Regex: quotes + OR/AND, UNION SELECT, --, DROP, sleep()"},
            {"name": "XSS", "logic": "Regex: <script, onerror=, javascript:, <img src"},
            {"name": "HTTP flood", "logic": f"Per-minute request rate z-score > {FLOOD_Z:g}"},
            {"name": "Impossible travel", "logic": f"Same user, two countries, < {TRAVEL_HOURS} h apart"},
        ],
        "sample_lines": sample_lines,
    }


def main() -> None:
    df = build_log()
    incidents = detect(df)
    out = summarise(df, incidents)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"{out['totals']} threat={out['threat']}")
    for i in incidents:
        print(f"{i['id']} {i['severity']:<8} {i['type']:<34} {i['detail']}")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
