"""
Configurable token bucket rate limiter for API calls.
Follows Anthropic best practices for respecting API rate limits.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class RateLimitConfig:
    """Configuration for a rate limiter"""
    rate: float           # tokens per second
    capacity: float       # maximum tokens (burst capacity)
    name: str            # identifier for logging


class TokenBucketLimiter:
    """
    Token bucket rate limiter for async operations.

    Allows bursts up to capacity, but maintains overall rate limit.
    Example: RateLimiter(rate=1, capacity=2) allows:
    - 2 immediate requests (uses 2 tokens)
    - Then refills at 1 token/second
    - After 2 seconds, can make another request
    """

    def __init__(self, rate: float, capacity: float, name: str = "limiter"):
        """
        Args:
            rate: tokens per second
            capacity: max tokens in bucket
            name: identifier for logging
        """
        self.rate = rate
        self.capacity = capacity
        self.name = name
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0, timeout: float = 300) -> bool:
        """
        Wait until tokens are available.

        Args:
            tokens: number of tokens to acquire (default 1)
            timeout: max seconds to wait (default 5 minutes)

        Returns:
            True if acquired, False if timeout
        """
        start_time = time.time()

        while True:
            async with self.lock:
                # Refill based on elapsed time
                now = time.time()
                elapsed = now - self.last_update
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_update = now

                # Check if enough tokens
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True

            # Not enough tokens, check timeout
            elapsed_total = time.time() - start_time
            if elapsed_total > timeout:
                return False

            # Wait a bit before checking again (avoid busy loop)
            await asyncio.sleep(min(0.1, (tokens - self.tokens) / self.rate))

    async def acquire_or_raise(self, tokens: float = 1.0, timeout: float = 300):
        """Acquire tokens or raise TimeoutError"""
        success = await self.acquire(tokens, timeout)
        if not success:
            raise asyncio.TimeoutError(
                f"Rate limiter '{self.name}' timeout after {timeout}s waiting for {tokens} tokens"
            )

    def reset(self):
        """Reset to full capacity (e.g., on new batch)"""
        self.tokens = self.capacity
        self.last_update = time.time()

    def available_tokens(self) -> float:
        """Get current token count (non-blocking)"""
        now = time.time()
        elapsed = now - self.last_update
        return min(self.capacity, self.tokens + elapsed * self.rate)


class RateLimiterManager:
    """Manages multiple rate limiters for different APIs"""

    def __init__(self):
        self.limiters: Dict[str, TokenBucketLimiter] = {}

    def configure(self, configs: Dict[str, RateLimitConfig]):
        """Configure rate limiters"""
        for name, config in configs.items():
            self.limiters[name] = TokenBucketLimiter(
                rate=config.rate,
                capacity=config.capacity,
                name=config.name
            )

    def get(self, name: str) -> TokenBucketLimiter:
        """Get limiter by name"""
        if name not in self.limiters:
            raise KeyError(f"Rate limiter '{name}' not configured")
        return self.limiters[name]

    async def acquire(self, name: str, tokens: float = 1.0, timeout: float = 300):
        """Acquire tokens from named limiter"""
        limiter = self.get(name)
        return await limiter.acquire(tokens, timeout)

    def reset_all(self):
        """Reset all limiters to full capacity"""
        for limiter in self.limiters.values():
            limiter.reset()


# Global rate limiter manager
_global_manager = RateLimiterManager()


def configure_rate_limits(configs: Dict[str, RateLimitConfig]):
    """Configure global rate limiters"""
    _global_manager.configure(configs)


async def acquire_rate_limit(name: str, tokens: float = 1.0, timeout: float = 300):
    """Acquire from global rate limiter"""
    return await _global_manager.acquire(name, tokens, timeout)


def get_rate_limiter(name: str) -> TokenBucketLimiter:
    """Get rate limiter by name"""
    return _global_manager.get(name)


# Default rate limit configurations (can be overridden in config.py)
DEFAULT_RATE_LIMITS = {
    "elevenlabs": RateLimitConfig(
        rate=1.0,          # 1 request per second
        capacity=1,        # 1 in flight
        name="ElevenLabs API"
    ),
    "runway": RateLimitConfig(
        rate=0.5,          # 2 requests per second (0.5 = 1 per 2 seconds)
        capacity=2,        # allow burst of 2
        name="Runway API"
    ),
    "json2video": RateLimitConfig(
        rate=0.5,          # 2 requests per second
        capacity=2,        # allow burst of 2
        name="JSON2Video API"
    ),
    "assemblyai": RateLimitConfig(
        rate=1.0,          # 1 per second
        capacity=2,
        name="AssemblyAI API"
    ),
    "youtube": RateLimitConfig(
        rate=0.2,          # 5 requests per second (slower, quota-based)
        capacity=1,
        name="YouTube API"
    ),
}
