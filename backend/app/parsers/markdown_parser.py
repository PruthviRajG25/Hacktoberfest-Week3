"""Markdown file parser — strips markup and extracts plain text."""

import re

from app.parsers.base import ParsedContent


def _strip_markdown(text: str) -> str:
    """Very lightweight markdown stripping for text extraction."""
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    # Remove images
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    # Remove links but keep text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Remove headings markers
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", text)
    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}$", "", text, flags=re.MULTILINE)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class MarkdownParser:
    def parse(self, content: bytes) -> ParsedContent:
        try:
            raw = content.decode("utf-8", errors="replace")
            text = _strip_markdown(raw)
            return ParsedContent(
                text=text,
                metadata={"word_count": len(text.split()), "raw_length": len(raw)},
            )
        except Exception as exc:
            return ParsedContent(error=str(exc))
