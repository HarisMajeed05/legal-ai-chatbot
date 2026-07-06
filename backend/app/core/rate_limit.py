"""
A minimal in-memory rate limiter. This is intentionally simple, no Redis, no
external service, it just tracks request timestamps per user in a dictionary.

Good enough for a single-process deployment. If this app is ever run across
multiple worker processes or machines, this would need to move to a shared
store like Redis, since each process would otherwise keep its own separate
counters and the limit would effectively multiply by the number of workers.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Depends

from app.core.security import get_current_user

_request_log: dict[str, list[float]] = defaultdict(list)


def rate_limiter(max_requests: int, window_seconds: int):
    async def dependency(current_user: dict = Depends(get_current_user)):
        key = f"{current_user['id']}"
        now = time.time()
        window_start = now - window_seconds

        _request_log[key] = [t for t in _request_log[key] if t > window_start]

        if len(_request_log[key]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Limit is {max_requests} per {window_seconds} seconds, please slow down.",
            )

        _request_log[key].append(now)
        return current_user

    return dependency
