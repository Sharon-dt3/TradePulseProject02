"""Phase 1: JWKS-based JWT verification for risk-engine.

Mirrors ledger-core's SecurityConfig — verifies every protected request's
Bearer token against Supabase's public signing key (ES256), checking
signature, expiry, and issuer. FastAPI has no built-in equivalent of
Spring Security's auto-locking filter chain, so here verification is an
explicit dependency, added to each route that needs it (not global) —
/healthz stays exempt because main.py simply never applies this
dependency to it.

auto_error=False on HTTPBearer is required because its default behavior
returns 403 (not 401) when the Authorization header is missing entirely
— inconsistent with the 401 we want for every other failure case, and
with ledger-core's behavior. We handle the missing-header case ourselves
below so both paths agree on 401.
"""
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client = jwt.PyJWKClient(settings.supabase_jwks_url)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            issuer=settings.supabase_jwt_issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    return payload