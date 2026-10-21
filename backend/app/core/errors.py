"""Structured error types and FastAPI exception handlers."""

import uuid
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: str | None = None
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class LazyOpsError(Exception):
    """Base application error."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, detail: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail


class NotFoundError(LazyOpsError):
    status_code = 404
    code = "NOT_FOUND"


class ValidationError(LazyOpsError):
    status_code = 422
    code = "VALIDATION_ERROR"


class FileTooLargeError(LazyOpsError):
    status_code = 413
    code = "FILE_TOO_LARGE"


class UnsupportedFormatError(LazyOpsError):
    status_code = 422
    code = "UNSUPPORTED_FORMAT"


class ParseFailedError(LazyOpsError):
    status_code = 422
    code = "PARSE_FAILED"


class PathViolationError(LazyOpsError):
    status_code = 422
    code = "PATH_VIOLATION"


class OllamaUnavailableError(LazyOpsError):
    status_code = 503
    code = "MODEL_UNAVAILABLE"


class OllamaTimeoutError(LazyOpsError):
    status_code = 504
    code = "OLLAMA_TIMEOUT"


class InvalidModelResponseError(LazyOpsError):
    status_code = 500
    code = "INVALID_MODEL_RESPONSE"


class InvalidStateError(LazyOpsError):
    status_code = 409
    code = "INVALID_STATE"


class ActionAlreadyExecutedError(LazyOpsError):
    status_code = 409
    code = "ACTION_ALREADY_EXECUTED"


def _make_error_response(
    code: str,
    message: str,
    detail: str | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "detail": detail,
            "request_id": request_id or str(uuid.uuid4()),
        }
    }


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers."""

    @app.exception_handler(LazyOpsError)
    async def lazyops_error_handler(request: Request, exc: LazyOpsError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_make_error_response(exc.code, exc.message, exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_make_error_response(
                "VALIDATION_ERROR",
                "Request validation failed.",
                str(exc.errors()),
            ),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_make_error_response(
                "INTERNAL_ERROR",
                "An unexpected error occurred.",
            ),
        )
