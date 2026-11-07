"""Knowledge base for the site assistant: curated security Q&A plus facts about this project's assignments.

Project entries are built from the committed JSON artifacts so their numbers always match the website.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


@dataclass(frozen=True)
class Entry:
    id: str
    title: str
    tags: str
    answer: str
    more: str = ""
    link: str = ""


SECURITY: list[Entry] = [
    Entry(
        "phishing", "Phishing and how to recognize a phishing email",
        "phishing email scam fake link spoof sender recognize spot lure",
        "Phishing is a scam where an attacker pretends to be a trusted organisation to trick you into clicking a "
        "link, opening an attachment, or handing over passwords or payment details. Warning signs: urgent or "
        "threatening language ('your account will be closed'), a sender address that doesn't match the real domain, "
        "links whose real URL (hover to check) points somewhere else, unexpected attachments, requests for "
        "credentials or gift cards, and generic greetings. When in doubt, don't click: go to the site yourself or "
        "call the organisation using a number you already trust.",
        "Spear phishing targets one person using personal details; smishing is phishing by SMS (what this project's "
        "SpamShield detector classifies); vishing is by phone. Defences that work together: MFA (so a stolen "
        "password isn't enough), a password manager (it won't autofill on a fake domain), email filtering, and "
        "reporting suspicious messages so others are warned.",
        "/detector",
    ),
    Entry(
        "password", "Creating a strong password",
        "strong password passphrase create good secure length password manager reuse",
        "A strong password is long, unique, and unpredictable. Use a passphrase of 4 or more random words or at "
        "least 14 characters, never reuse it on another site, and avoid personal details like names, birthdays, or "
        "pet names. A password manager can generate and remember a different strong password for every account, "
        "and you should turn on multi-factor authentication wherever it's offered.",
        "Length beats complexity: 'correct-horse-battery-staple' is far harder to crack than 'P@ssw0rd1'. Reuse is "
        "the biggest risk, because one breached site lets attackers try the same email and password everywhere "
        "(credential stuffing, which the Security Monitor detected in its log). Check haveibeenpwned.com to see if "
        "your email appears in known breaches.",
    ),
    Entry(
        "dos", "Denial-of-service (DoS) attack",
        "dos denial of service attack availability flood overload server crash website down",
        "A denial-of-service (DoS) attack tries to make a website or service unavailable to real users by "
        "overwhelming it with traffic or requests, or by exploiting a bug that crashes it. It attacks availability, "
        "the 'A' in the CIA triad. Examples include HTTP floods, SYN floods that exhaust connection tables, and "
        "slow attacks like Slowloris that hold connections open.",
        "Defences: rate limiting, a CDN or DDoS-protection service that absorbs traffic, web application firewalls, "
        "auto-scaling, and monitoring that alerts on sudden traffic spikes. Assignment 7 on this site analyses real "
        "DDoS traffic from the CIC-IDS2017 dataset.",
        "/assignments/assignment-7",
    ),
    Entry(
        "dos-vs-ddos", "Difference between DoS and DDoS attacks",
        "difference dos ddos distributed botnet compare versus vs many sources",
        "A DoS attack comes from a single source, so it can often be stopped by blocking or rate-limiting that one "
        "IP. A DDoS (distributed denial-of-service) attack comes from many machines at once, usually a botnet of "
        "infected computers or IoT devices, so the combined traffic is much larger and blocking individual IPs "
        "doesn't work. Defenders must filter by behaviour instead.",
        "In Assignment 7, the DDoS flows in CIC-IDS2017 were individually small and slow; the attack's power came "
        "from 128,014 near-identical connections. A simple 'high packets per second' rule caught almost none of "
        "them, while a Random Forest using flow shape reached an F1 score of about 99.96%. The Security Monitor "
        "shows the same pattern: a flood from 90 IPs detected by a per-minute request-rate z-score.",
        "/assignments/assignment-7",
    ),
    Entry(
        "malware", "Protecting your computer from malware",
        "malware virus trojan ransomware protect antivirus computer infection worm spyware",
        "To protect against malware: keep your operating system, browser, and apps updated; use built-in "
        "antivirus such as Microsoft Defender and keep it on; only install software from official sources; don't "
        "open unexpected attachments or enable macros in documents; use a standard (non-admin) account day to "
        "day; and keep regular backups, ideally one offline, so ransomware can't hold your files hostage.",
        "Malware types: viruses and worms spread themselves, trojans pretend to be useful software, spyware steals "
        "information, and ransomware encrypts files and demands payment. Most infections start with phishing or "
        "unpatched software, so updates and caution with links stop the majority.",
    ),
    Entry(
        "sqli", "SQL injection",
        "sql injection sqli database query input union select quote web attack",
        "SQL injection happens when a website puts user input straight into a database query, so an attacker can "
        "type SQL code instead of normal data, for example ' OR '1'='1 in a login box. That can let them bypass "
        "logins or read, change, or delete data. The fix is parameterised queries (prepared statements), which "
        "keep data separate from code, plus input validation and least-privilege database accounts.",
        "The Security Monitor flagged an IP sending 42 SQL injection probes such as "
        "/products?id=42 UNION SELECT username,password FROM users--, caught by a signature rule looking for "
        "quotes with OR/AND, UNION SELECT, comment markers, and DROP. Signature rules are fast but can miss "
        "obfuscated payloads, so the real defence is in the code.",
        "/monitor",
    ),
    Entry(
        "xss", "Cross-site scripting (XSS)",
        "xss cross site scripting script injection javascript browser cookie",
        "Cross-site scripting (XSS) is when an attacker gets a website to include their JavaScript in a page that "
        "other people view. The script runs in the victim's browser and can steal session cookies, change the "
        "page, or act as the user. Defences: escape or encode output, validate input, use a Content Security "
        "Policy, and mark cookies HttpOnly.",
        "There are three main kinds: stored (saved in the database, e.g. a comment), reflected (bounced back from "
        "a URL parameter), and DOM-based (created by client-side JavaScript). Assignment 6 on this site covers XSS "
        "security, and the Security Monitor detected 27 XSS probes like <script>alert(document.cookie)</script>.",
        "/assignments/assignment-6",
    ),
    Entry(
        "mfa", "How multi-factor authentication (MFA) works",
        "mfa 2fa multi factor two factor authentication authenticator code otp passkey",
        "Multi-factor authentication requires two or more different kinds of proof before you can log in: "
        "something you know (a password), something you have (a phone authenticator app, security key, or "
        "passkey), or something you are (fingerprint or face). Even if an attacker steals your password, they "
        "still can't get in without the second factor.",
        "Strongest to weakest: hardware security keys and passkeys (phishing-resistant), authenticator app codes, "
        "then SMS codes (better than nothing, but vulnerable to SIM swapping). Never share an MFA code with "
        "anyone; real support staff won't ask for it. Watch out for 'MFA fatigue', where attackers spam approval "
        "prompts hoping you tap Approve.",
    ),
    Entry(
        "hacked", "What to do if you suspect your computer has been hacked",
        "hacked compromised breach suspect infected what to do incident response account taken over",
        "If you think you've been hacked: disconnect the device from the internet; from a different, trusted "
        "device change the passwords for your email, banking, and other important accounts and turn on MFA; run "
        "a full antivirus scan; check accounts for unfamiliar logins, forwarding rules, or purchases; tell your "
        "bank if financial details may be exposed; and report it to your IT department if it's a work or school "
        "device.",
        "Common signs: unexpected pop-ups or new programs, the browser homepage changing, a sudden slowdown, "
        "friends receiving messages you didn't send, or login alerts you don't recognise. If problems persist "
        "after a scan, back up personal files and reinstall the operating system. Keep notes of what happened; "
        "they help investigators.",
    ),
    Entry(
        "privacy", "Protecting your personal information online",
        "personal information privacy protect data online identity theft share social media",
        "To protect your personal information: share less on social media (birthdays, addresses, and travel plans "
        "help attackers); check privacy settings; use unique passwords and MFA; only enter details on HTTPS sites "
        "you reached yourself; avoid public Wi-Fi for sensitive tasks or use a VPN; be wary of quizzes and forms "
        "asking for personal details; and review app permissions on your phone.",
        "Also consider freezing your credit with the credit bureaus to block identity theft, shredding documents "
        "with personal data, and using email aliases for sign-ups. Under privacy laws you can often request that "
        "companies delete data they hold about you.",
    ),
    Entry(
        "suspicious-site", "Identifying a suspicious website",
        "suspicious website fake site scam url domain https padlock shopping check legit",
        "Signs of a suspicious website: a misspelled or odd domain (paypa1.com, amazon-security-check.net), no "
        "HTTPS or certificate warnings, prices that are too good to be true, pressure to act fast, poor spelling "
        "and design, no real contact information, and requests for unusual payment methods like gift cards or "
        "crypto. The padlock only means the connection is encrypted, not that the site is honest.",
        "Before entering details, type the address yourself or use a bookmark rather than following a link, search "
        "for reviews of the site, and use a URL checker such as Google Safe Browsing. Your password manager "
        "refusing to autofill is another strong hint that the domain is fake.",
    ),
    Entry(
        "brute-force", "Brute-force and credential-stuffing attacks",
        "brute force credential stuffing login attempts guess password failed logins lockout",
        "A brute-force attack guesses passwords over and over against one account. Credential stuffing uses "
        "username and password pairs leaked from other sites, trying them across many accounts. Defences include "
        "account lockout or increasing delays after failed attempts, CAPTCHA, MFA, and monitoring for many "
        "failures from one IP.",
        "The Security Monitor detected both: 380 failed logins for 'admin' from one IP (peak 93 in five minutes), "
        "and one IP trying 130 different usernames, two of which succeeded. Those two accounts need password "
        "resets, which shows why unique passwords matter.",
        "/monitor",
    ),
    Entry(
        "ids", "Intrusion detection systems (IDS)",
        "intrusion detection ids ips siem monitoring logs anomaly signature alert",
        "An intrusion detection system watches network traffic or logs for signs of attack and raises alerts. "
        "Signature-based IDS match known attack patterns (like SQL injection strings); anomaly-based IDS learn "
        "what normal looks like and flag deviations (like a sudden traffic spike). An intrusion prevention system "
        "(IPS) can also block the traffic. A SIEM collects logs from many systems so analysts can correlate events.",
        "This site's Security Monitor is a small IDS: six explainable rules over a week of web and login logs "
        "(brute force, credential stuffing, SQL injection, XSS, HTTP flood, impossible travel), feeding a threat "
        "score. Assignment 7 adds the machine-learning side, detecting DDoS flows with a Random Forest.",
        "/monitor",
    ),
    Entry(
        "cia", "The CIA triad",
        "cia triad confidentiality integrity availability security goals",
        "The CIA triad is the core model of information security. Confidentiality means only authorised people "
        "can read data (encryption, access control). Integrity means data isn't altered without permission "
        "(hashes, signatures). Availability means systems are up when needed (redundancy, DDoS protection, "
        "backups).",
        "Each attack type maps to one of these: phishing and data breaches hit confidentiality, SQL injection and "
        "XSS can hit integrity, and DoS/DDoS attacks hit availability, the focus of Assignment 7.",
    ),
    Entry(
        "updates", "Why software updates and patching matter",
        "update patch software vulnerability zero day exploit outdated",
        "Updates fix security vulnerabilities that attackers actively exploit. Turn on automatic updates for your "
        "operating system, browser, and apps, and replace devices that no longer receive updates. A zero-day is a "
        "flaw attackers use before a patch exists, which is why defence in depth (MFA, backups, least privilege) "
        "still matters.",
    ),
    Entry(
        "wifi", "Public Wi-Fi and VPNs",
        "public wifi wi-fi vpn coffee shop hotspot network safe encrypt",
        "Public Wi-Fi can be monitored or impersonated by a fake hotspot. Prefer HTTPS sites, avoid banking or "
        "entering passwords on open networks, turn off auto-join, and use your phone's hotspot or a reputable VPN, "
        "which encrypts traffic between your device and the VPN provider.",
    ),
    Entry(
        "social-engineering", "Social engineering",
        "social engineering manipulation pretexting impersonation tailgating human",
        "Social engineering manipulates people rather than technology: pretending to be IT support, a boss, or a "
        "delivery company to get passwords, codes, or access. Slow down, verify requests through a separate "
        "channel you trust, and never share passwords or MFA codes.",
    ),
    Entry(
        "encryption", "Encryption and HTTPS",
        "encryption https tls ssl certificate padlock encrypt data",
        "Encryption scrambles data so only someone with the right key can read it. HTTPS uses TLS to encrypt "
        "traffic between your browser and a website, protecting passwords and data from eavesdroppers. It proves "
        "you're connected to the domain shown, but not that the site's owner is trustworthy.",
    ),
]

STATIC_PROJECT: list[Entry] = [
    Entry(
        "lab-1", "Lab 1: Identity and security (ipconfig, ping, tracert, ARP)",
        "lab 1 ipconfig ping tracert arp mac address ip address subnet mask dhcp ttl network identity",
        "Lab 1 (CPS 3498) explored a Windows computer's network identity. ipconfig /all shows the IP address, "
        "subnet mask, gateway, MAC address, and DNS servers, and ipconfig /renew gets a new address from DHCP. "
        "ping to the gateway measured about 2 ms with TTL 64 (the hop limit that stops packets looping forever). "
        "tracert mapped the route to kean.edu and google.com (about 8 hops), and arp -a listed IP-to-MAC mappings.",
        "Security relevance: knowing your IP and MAC identity is the basis for spotting spoofing. ARP has no "
        "authentication, so ARP spoofing lets an attacker on the same network intercept traffic, and tracert and "
        "ping help diagnose whether a site is down because of an attack or a network fault.",
        "/assignments/lab-1",
    ),
    Entry(
        "assignment-8", "Assignment 8: Intrusion detection and an AI assistant that controls the website",
        "assignment 8 chatbot assistant digital human voice commands control website intrusion detection",
        "Assignment 8 adds two things. First, the Security Monitor dashboard analyses a week of web and login logs "
        "for brute force, credential stuffing, SQL injection, XSS, an HTTP flood, and impossible travel, and rates "
        "the threat level. Second, it adds me, Shield: an assistant you can type or speak to that changes the "
        "site's appearance, plays music or the training video, navigates pages, and answers security questions.",
        "I only run a fixed whitelist of website actions: I can't access your files, other apps, or your operating "
        "system, and I don't store what you say. Voice uses your browser's built-in speech recognition. Answers "
        "come from a curated knowledge base, plus Gemini when the site has an API key configured.",
        "/assignments/assignment-8",
    ),
    Entry(
        "assignments-overview", "How the assignments relate to the overall project",
        "assignments relate overall project relationship connect all assignments 1 2 3 4 5 9 course",
        "Everything builds on one site, SpamShield AI. Lab 1 covers network identity (IP, MAC, ARP). Assignment 6 "
        "set out the research method for machine-learning spam detection and covered XSS security. The main "
        "project trains ten models to detect SMS spam and phishing. Assignment 7 applies the same data-driven "
        "approach to DDoS detection and website availability. Assignment 8 adds a security monitoring dashboard "
        "and this assistant.",
        "Documents for the other course assignments haven't been added to the site yet, so I can only answer "
        "about the ones listed in the Assignments tab. The common thread is using data and machine learning to "
        "detect attacks (spam, phishing, DDoS, intrusions) while explaining the results clearly.",
        "/assignments",
    ),
]


def _load(name: str) -> dict | None:
    path = get_settings().artifacts_dir / name
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return None


def _project_entries() -> list[Entry]:
    out: list[Entry] = []
    ev = _load("evaluation.json")
    ds = _load("dataset.json")
    if ev and ds:
        best = next(r for r in ev["results"] if r["key"] == ev["ranking"][0]["key"])
        base = next(r for r in ev["results"] if r["role"] == "baseline")
        m, b = best["metrics"], base["metrics"]
        out.append(Entry(
            "spamshield", "SpamShield AI project and Assignment 6 spam detection results",
            "spamshield project spam detection sms machine learning model accuracy assignment 6 research method "
            "random forest logistic regression results",
            f"SpamShield AI detects SMS spam and phishing with machine learning. It uses the Kaggle SMS Spam "
            f"Collection ({ds['records']:,} messages, {ds['spam_ratio']:.1%} spam), TF-IDF text features plus "
            f"engineered signals like URLs and money symbols, and compares ten models. The top-ranked model, "
            f"{best['name']}, reached {m['accuracy']:.2%} accuracy and {m['f1']:.2%} F1, against the "
            f"{base['name']} baseline at {b['accuracy']:.2%} accuracy and {b['f1']:.2%} F1. Assignment 6 defined "
            f"this research method.",
            "You can paste any message into the Live Detector to see the prediction, confidence, and which words "
            "drove it. Precision matters because false positives block real messages; recall matters because "
            "false negatives let scams through.",
            "/evaluation",
        ))
    dd = _load("ddos.json")
    if dd:
        rf = next(x for x in dd["models"] if x["name"] == "Random Forest")
        vr = dd["detectors"][0]
        out.append(Entry(
            "assignment-7", "Assignment 7: DoS/DDoS attacks and website availability",
            "assignment 7 ddos cic-ids2017 dataset website availability traffic detection movie",
            f"Assignment 7 analysed {dd['preprocessing']['raw_rows']:,} network flows from CIC-IDS2017's Friday "
            f"DDoS capture. Attack flows all targeted port 80 and were individually small and slow, so a volume "
            f"threshold scored only {vr['f1']:.2%} F1. A Random Forest on flow-shape features reached "
            f"{rf['f1']:.2%} F1 with {rf['cm']['fp']} false alarms and {rf['cm']['fn']} missed attacks. It also "
            f"includes an AI-generated movie about restoring website availability.",
            "Takeaway: detect DDoS by combining per-flow classification with aggregate rate monitoring. Limits: "
            "one capture, one attack tool (LOIC), lab traffic, and classifying flows without time windows.",
            "/assignments/assignment-7",
        ))
    sl = _load("seclog.json")
    if sl:
        t = sl["totals"]
        out.append(Entry(
            "monitor", "Security Monitor dashboard results",
            "security monitor dashboard threat level failed logins suspicious ip detected attacks logs events",
            f"The Security Monitor analysed {t['events']:,} log events over {sl['window']['days']} days: "
            f"{t['login_attempts']:,} login attempts ({t['failed_logins']:,} failed), {t['suspicious_ips']} "
            f"suspicious IPs, and {t['detected_attacks']} detected attacks. The threat level is "
            f"{sl['threat']['level']} ({sl['threat']['score']}/100). Incidents: "
            + "; ".join(f"{i['type']} ({i['severity']})" for i in sl["incidents"]) + ".",
            "Normal vs suspicious: normal IPs average "
            f"{sl['comparison']['normal']['events_per_ip_hour']} events per active hour with a "
            f"{sl['comparison']['normal']['login_failure_rate']:.1%} login failure rate; suspicious IPs average "
            f"{sl['comparison']['suspicious']['events_per_ip_hour']} with "
            f"{sl['comparison']['suspicious']['login_failure_rate']:.1%} failures. The log is synthetic with "
            "planted incidents, so no real system was attacked.",
            "/monitor",
        ))
    return out


@lru_cache
def knowledge_base() -> tuple[Entry, ...]:
    return tuple(SECURITY + STATIC_PROJECT + _project_entries())
