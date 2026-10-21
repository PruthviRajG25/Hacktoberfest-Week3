"""Parser registry — dispatch to the correct parser by format."""

from app.parsers.base import ParsedContent
from app.parsers.text_parser import TextParser
from app.parsers.markdown_parser import MarkdownParser
from app.parsers.pdf_parser import PdfParser
from app.parsers.json_parser import JsonParser
from app.parsers.csv_parser import CsvParser

_PARSERS = {
    "txt": TextParser(),
    "md": MarkdownParser(),
    "pdf": PdfParser(),
    "json": JsonParser(),
    "csv": CsvParser(),
}


def parse_file(content: bytes, fmt: str) -> ParsedContent:
    """Dispatch to the correct parser. Returns ParsedContent with error set on failure."""
    parser = _PARSERS.get(fmt)
    if not parser:
        return ParsedContent(error=f"No parser registered for format '{fmt}'.")
    try:
        return parser.parse(content)
    except Exception as exc:
        return ParsedContent(error=f"Parser error: {exc}")
