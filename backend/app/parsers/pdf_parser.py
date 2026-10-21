"""PDF file parser using pypdf."""

import io

from app.parsers.base import ParsedContent


class PdfParser:
    def parse(self, content: bytes) -> ParsedContent:
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)

            text = "\n\n".join(pages)
            metadata: dict = {
                "page_count": len(reader.pages),
                "word_count": len(text.split()),
            }

            # Try to get PDF metadata
            if reader.metadata:
                if reader.metadata.title:
                    metadata["title"] = str(reader.metadata.title)
                if reader.metadata.author:
                    metadata["author"] = str(reader.metadata.author)

            return ParsedContent(text=text or None, metadata=metadata)
        except Exception as exc:
            return ParsedContent(error=f"PDF parse error: {exc}")
