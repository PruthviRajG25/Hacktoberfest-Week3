"""Deadline normalization tool."""

import re
from datetime import date, timedelta


_RELATIVE_PATTERNS = {
    r"\btoday\b": 0,
    r"\btomorrow\b": 1,
    r"\bnext week\b": 7,
    r"\bnext month\b": 30,
}

_MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def normalize_deadline(raw: str) -> str | None:
    """
    Attempt to normalize a raw deadline string to ISO 8601 (YYYY-MM-DD).
    Returns None if parsing fails (ambiguous dates are NOT guessed).
    """
    if not raw:
        return None

    text = raw.lower().strip()
    today = date.today()

    # Relative
    for pattern, delta in _RELATIVE_PATTERNS.items():
        if re.search(pattern, text):
            return (today + timedelta(days=delta)).isoformat()

    # ISO format: 2024-12-31
    iso_match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if iso_match:
        try:
            return date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))).isoformat()
        except ValueError:
            pass

    # DD/MM/YYYY or MM/DD/YYYY — ambiguous; try YYYY/MM/DD only
    slash_match = re.search(r"(\d{4})/(\d{1,2})/(\d{1,2})", text)
    if slash_match:
        try:
            return date(int(slash_match.group(1)), int(slash_match.group(2)), int(slash_match.group(3))).isoformat()
        except ValueError:
            pass

    # "15 October 2024" or "October 15 2024" or "Oct 15"
    for month_name, month_num in _MONTH_NAMES.items():
        patterns = [
            rf"(\d{{1,2}})\s+{month_name}\s+(\d{{4}})",
            rf"{month_name}\s+(\d{{1,2}}),?\s+(\d{{4}})",
            rf"{month_name}\s+(\d{{1,2}})",
        ]
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                try:
                    if len(m.groups()) == 2 and len(m.group(2)) == 4:
                        day = int(m.group(1))
                        year = int(m.group(2))
                    elif len(m.groups()) == 2:
                        day = int(m.group(1))
                        year = today.year
                    else:
                        day = int(m.group(1))
                        year = today.year
                    return date(year, month_num, day).isoformat()
                except (ValueError, IndexError):
                    continue

    # Could not normalize
    return None
