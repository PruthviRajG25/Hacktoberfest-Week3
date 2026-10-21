"""CSV file parser — extracts text representation with header info."""

import csv
import io

from app.parsers.base import ParsedContent

MAX_ROWS = 200  # Prevent huge CSV files from flooding the prompt


class CsvParser:
    def parse(self, content: bytes) -> ParsedContent:
        try:
            text = content.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)

            if not rows:
                return ParsedContent(text=None, metadata={"row_count": 0}, error=None)

            headers = rows[0]
            data_rows = rows[1:MAX_ROWS]

            lines = [",".join(headers)]
            for row in data_rows:
                lines.append(",".join(row))

            readable = "\n".join(lines)
            return ParsedContent(
                text=readable,
                metadata={
                    "column_count": len(headers),
                    "row_count": len(rows) - 1,
                    "columns": headers[:20],  # first 20 columns only
                },
            )
        except Exception as exc:
            return ParsedContent(error=f"CSV parse error: {exc}")
