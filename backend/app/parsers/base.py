"""Base parser interface."""

from dataclasses import dataclass, field


@dataclass
class ParsedContent:
    """Standardized output from any file parser."""
    text: str | None = None
    metadata: dict = field(default_factory=dict)
    error: str | None = None

    @property
    def word_count(self) -> int:
        if not self.text:
            return 0
        return len(self.text.split())
