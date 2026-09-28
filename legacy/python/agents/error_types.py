"""
Structured error types for agents with recovery suggestions.
Follows Anthropic best practices for error handling and recovery.
"""

from enum import Enum
from typing import Optional


class ErrorType(Enum):
    """Error classification for recovery handling"""
    RETRYABLE = "retryable"        # Transient errors (rate limit, timeout, connection)
    FATAL = "fatal"                # Permanent errors (invalid key, bad data)
    CONFIG = "config"              # Setup issues (missing env, path not found)
    VALIDATION = "validation"      # Input validation failed


class AgentError(Exception):
    """Structured error with recovery suggestions"""

    def __init__(
        self,
        error_type: ErrorType,
        message: str,
        recovery_suggestion: str,
        details: Optional[dict] = None,
        retry_after_seconds: Optional[int] = None
    ):
        self.error_type = error_type
        self.message = message
        self.recovery_suggestion = recovery_suggestion
        self.details = details or {}
        self.retry_after_seconds = retry_after_seconds

        super().__init__(f"[{error_type.value}] {message}")

    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization"""
        return {
            "status": "error",
            "error_type": self.error_type.value,
            "message": self.message,
            "recovery_suggestion": self.recovery_suggestion,
            "details": self.details,
            "retry_after_seconds": self.retry_after_seconds
        }

    @property
    def is_retryable(self) -> bool:
        """Whether this error should be retried"""
        return self.error_type == ErrorType.RETRYABLE

    @property
    def is_fatal(self) -> bool:
        """Whether this error is unrecoverable"""
        return self.error_type == ErrorType.FATAL

    @property
    def is_config_error(self) -> bool:
        """Whether this is a configuration issue"""
        return self.error_type == ErrorType.CONFIG


# Common error instances with recovery suggestions

class RateLimitError(AgentError):
    """API rate limit exceeded"""
    def __init__(self, api_name: str, retry_after: int = 30):
        super().__init__(
            error_type=ErrorType.RETRYABLE,
            message=f"{api_name} API rate limit exceeded",
            recovery_suggestion=f"Retry in {retry_after} seconds; consider increasing rate limit delay in config",
            retry_after_seconds=retry_after
        )


class TimeoutError_(AgentError):
    """Operation exceeded timeout"""
    def __init__(self, operation: str, timeout_seconds: int):
        super().__init__(
            error_type=ErrorType.RETRYABLE,
            message=f"{operation} exceeded timeout of {timeout_seconds}s",
            recovery_suggestion=f"Increase timeout for {operation} in config; check external service status"
        )


class APIKeyError(AgentError):
    """Missing or invalid API key"""
    def __init__(self, api_name: str, env_var: str):
        super().__init__(
            error_type=ErrorType.CONFIG,
            message=f"{api_name} API key missing or invalid",
            recovery_suggestion=f"Set {env_var} environment variable in .env file with valid API key"
        )


class ConfigError(AgentError):
    """Configuration issue"""
    def __init__(self, config_key: str, message: str, suggestion: str):
        super().__init__(
            error_type=ErrorType.CONFIG,
            message=f"Configuration error: {message}",
            recovery_suggestion=suggestion,
            details={"config_key": config_key}
        )


class ValidationError_(AgentError):
    """Input validation failed"""
    def __init__(self, field: str, reason: str, expected: str):
        super().__init__(
            error_type=ErrorType.VALIDATION,
            message=f"Validation failed for field '{field}': {reason}",
            recovery_suggestion=f"Expected {expected}; check input data",
            details={"field": field, "reason": reason, "expected": expected}
        )


class ConnectionError_(AgentError):
    """Network/connection error"""
    def __init__(self, service: str, details: str):
        super().__init__(
            error_type=ErrorType.RETRYABLE,
            message=f"Connection error to {service}: {details}",
            recovery_suggestion="Check network connectivity; verify service is accessible; retry after 30 seconds",
            retry_after_seconds=30
        )
