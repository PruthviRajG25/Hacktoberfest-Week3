"""Tests for file parsers."""

import pytest

from app.parsers.text_parser import TextParser
from app.parsers.markdown_parser import MarkdownParser
from app.parsers.json_parser import JsonParser
from app.parsers.csv_parser import CsvParser
from app.parsers.registry import parse_file


class TestTextParser:
    def test_parse_utf8(self):
        parser = TextParser()
        result = parser.parse(b"Hello world\nThis is a test.")
        assert result.text == "Hello world\nThis is a test."
        assert result.error is None
        assert result.word_count == 6

    def test_parse_empty(self):
        parser = TextParser()
        result = parser.parse(b"")
        assert result.text == ""
        assert result.error is None


class TestMarkdownParser:
    def test_strip_headings(self):
        parser = MarkdownParser()
        result = parser.parse(b"# Title\n\nSome text here.\n\n## Section")
        assert "Title" in result.text
        assert "#" not in result.text

    def test_strip_links(self):
        parser = MarkdownParser()
        result = parser.parse(b"Click [here](http://example.com) for more.")
        assert "here" in result.text
        assert "http://example.com" not in result.text

    def test_parse_empty(self):
        parser = MarkdownParser()
        result = parser.parse(b"")
        assert result.error is None


class TestJsonParser:
    def test_valid_json(self):
        parser = JsonParser()
        result = parser.parse(b'{"name": "test", "value": 42}')
        assert result.text is not None
        assert result.error is None
        assert "test" in result.text

    def test_invalid_json(self):
        parser = JsonParser()
        result = parser.parse(b"not json {")
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_json_array(self):
        parser = JsonParser()
        result = parser.parse(b'[1, 2, 3]')
        assert result.text is not None
        assert result.error is None


class TestCsvParser:
    def test_valid_csv(self):
        parser = CsvParser()
        content = b"name,age,city\nAlice,30,NYC\nBob,25,LA"
        result = parser.parse(content)
        assert result.text is not None
        assert result.error is None
        assert "name,age,city" in result.text

    def test_empty_csv(self):
        parser = CsvParser()
        result = parser.parse(b"")
        assert result.error is None


class TestRegistry:
    def test_unsupported_format(self):
        result = parse_file(b"data", "docx")
        assert result.error is not None
        assert "docx" in result.error

    def test_txt_dispatch(self):
        result = parse_file(b"hello world", "txt")
        assert result.text == "hello world"
        assert result.error is None
