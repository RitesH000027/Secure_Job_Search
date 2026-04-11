"""
Helpers for sanitizing user-provided text/URL input before persistence.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

_TAG_RE = re.compile(r"<[^>]*>")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")
_JS_SCHEME_RE = re.compile(r"^\s*javascript\s*:", re.IGNORECASE)


def sanitize_text(value: str | None, max_length: int | None = None) -> str | None:
    if value is None:
        return None

    cleaned = _CONTROL_RE.sub("", value)
    cleaned = _TAG_RE.sub("", cleaned)
    cleaned = cleaned.strip()

    if max_length is not None:
        cleaned = cleaned[:max_length]

    return cleaned


def sanitize_optional_url(value: str | None, max_length: int | None = None) -> str | None:
    cleaned = sanitize_text(value, max_length=max_length)
    if not cleaned:
        return None

    if _JS_SCHEME_RE.match(cleaned):
        return None

    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"}:
        return None

    return cleaned


def sanitize_fields(payload: dict, text_fields: list[str], url_fields: list[str] | None = None) -> dict:
    sanitized = dict(payload)

    for field in text_fields:
        if field in sanitized:
            sanitized[field] = sanitize_text(sanitized.get(field))

    for field in url_fields or []:
        if field in sanitized:
            sanitized[field] = sanitize_optional_url(sanitized.get(field))

    return sanitized
