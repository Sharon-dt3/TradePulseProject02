"""Phase 17: Python mirror of ledger-core's PermissionService - same
role_permissions table, same "does any role this user holds have this
permission" check (no implicit admin bypass), evaluated here because
risk-engine enforces its own route-level authorization rather than
delegating to ledger-core. See PermissionService.java's own javadoc for
why this is a plain query rather than going through Postgres's
authorize() function: this connection isn't subject to RLS either.
"""
from typing import List

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session


def has_permission(session: Session, roles: List[str], permission: str) -> bool:
    if not roles:
        return False
    result = session.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1 FROM role_permissions
                WHERE permission = :permission AND role = ANY(:roles)
            )
            """
        ),
        {"permission": permission, "roles": roles},
    ).scalar()
    return bool(result)


def require_permission(session: Session, roles: List[str], permission: str) -> None:
    if not has_permission(session, roles, permission):
        raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")


def roles_from_user(user: dict) -> List[str]:
    """The 'user_role' JWT claim (same claim ledger-core's
    AdminUserController and gateway's SSE ticket flow read), defaulting
    to an empty list rather than raising for a token that somehow
    carries none - has_permission already treats an empty list as no
    permissions, the correct behavior either way."""
    return user.get("user_role") or []
