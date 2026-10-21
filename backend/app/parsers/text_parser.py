"""Plain text file parser."""

from app.parsers.base import ParsedContent


class TextParser:
    def parse(self, content: bytes) -> ParsedContent:
        try:
            text = content.decode("utf-8", errors="replace")
            return ParsedContent(
                text=text,
                metadata={"word_count": len(text.split()), "char_count": len(text)},
            )
        except Exception as exc:
            return ParsedContent(error=str(exc))
