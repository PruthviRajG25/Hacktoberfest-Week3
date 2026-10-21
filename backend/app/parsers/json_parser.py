"""JSON file parser — extracts text representation."""

import json

from app.parsers.base import ParsedContent


class JsonParser:
    def parse(self, content: bytes) -> ParsedContent:
        try:
            text = content.decode("utf-8", errors="replace")
            data = json.loads(text)
            # Convert to a readable text form
            readable = json.dumps(data, indent=2, ensure_ascii=False)
            return ParsedContent(
                text=readable,
                metadata={"keys": list(data.keys()) if isinstance(data, dict) else None,
                          "item_count": len(data) if isinstance(data, (dict, list)) else None},
            )
        except json.JSONDecodeError as exc:
            return ParsedContent(error=f"Invalid JSON: {exc}")
        except Exception as exc:
            return ParsedContent(error=str(exc))
