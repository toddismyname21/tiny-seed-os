#!/usr/bin/env python3
"""
================================================================================
RBAC API HANDLERS - API endpoint handlers for RBAC Filtered Retrieval
================================================================================

Phase 2 of Project "Sovereign Seed" - API Integration

This module provides API handler functions that can be imported by web_server.py.
Kept separate to avoid file contention issues.

Created: 2026-02-04
Author: PM_Architect Claude
================================================================================
"""

import asyncio
import json
import time
from typing import Any, Dict, Optional

# Import RBAC components
try:
    from rbac_retrieval import (
        get_rbac_retrieval,
        RBACRetrieval,
        UserContext,
        Permission,
        AccessAction,
        grant_permission
    )
    RBAC_AVAILABLE = True
except ImportError as e:
    print(f"[RBAC API] RBAC module not available: {e}")
    RBAC_AVAILABLE = False

    # Stub classes for when RBAC not available
    class Permission:
        VIEW = "view"
        NONE = "none"

    class AccessAction:
        PERMISSION_CHECK = "permission_check"

    def get_rbac_retrieval():
        return None


def get_user_context_from_headers(headers: Dict) -> Optional['UserContext']:
    """
    Extract UserContext from request headers.

    In production, this would parse JWT tokens or session data.
    For development/testing, uses X-User-* headers.
    """
    if not RBAC_AVAILABLE:
        return None

    user_id = headers.get('X-User-ID', 'anonymous')
    user_email = headers.get('X-User-Email', 'anonymous@localhost')
    user_roles_str = headers.get('X-User-Roles', '')
    user_roles = [r.strip() for r in user_roles_str.split(',') if r.strip()]

    return UserContext(
        user_id=user_id,
        email=user_email,
        roles=user_roles
    )


def handle_rbac_stats() -> Dict[str, Any]:
    """
    GET /api/rbac/stats - Get RBAC access statistics.

    Returns:
        Statistics dict including total attempts, allowed/denied counts, etc.
    """
    if not RBAC_AVAILABLE:
        return {
            "available": False,
            "error": "RBAC system not installed"
        }

    try:
        start = time.perf_counter()
        rbac = get_rbac_retrieval()
        stats = rbac.get_access_stats()
        stats["available"] = True
        stats["api_latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
        return stats
    except Exception as e:
        return {"error": f"Stats check failed: {str(e)}"}


def handle_rbac_access_log(params: Dict) -> Dict[str, Any]:
    """
    GET /api/rbac/access-log - Get access log entries.

    Args:
        params: Query parameters (user_id, document_id, denied_only, limit)

    Returns:
        List of access attempts matching filters
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        user_id = params.get("user_id", [None])[0]
        document_id = params.get("document_id", [None])[0]
        denied_only = params.get("denied_only", ["false"])[0].lower() == "true"
        limit = int(params.get("limit", [50])[0])

        rbac = get_rbac_retrieval()
        attempts = rbac.get_access_log(
            user_id=user_id,
            document_id=document_id,
            allowed_only=False if denied_only else None,
            limit=min(limit, 500)  # Cap at 500
        )

        return {
            "attempts": [a.to_dict() for a in attempts],
            "count": len(attempts),
            "filters": {
                "user_id": user_id,
                "document_id": document_id,
                "denied_only": denied_only
            }
        }
    except Exception as e:
        return {"error": f"Failed to get access log: {str(e)}"}


def handle_rbac_get_permission(document_id: str, headers: Dict) -> Dict[str, Any]:
    """
    GET /api/rbac/permission - Get permission level for document.

    Args:
        document_id: Document ID to check
        headers: Request headers for user context

    Returns:
        Permission information for the user and document
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    if not document_id:
        return {"error": "document_id parameter required"}

    try:
        user = get_user_context_from_headers(headers)
        if not user:
            return {"error": "User context not available"}

        rbac = get_rbac_retrieval()

        # Run async permission check in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            permission = loop.run_until_complete(
                rbac.get_permission(user, document_id)
            )
        finally:
            loop.close()

        return {
            "document_id": document_id,
            "permission": permission.value,
            "user_id": user.user_id,
            "user_email": user.email,
            "is_admin": user.is_admin()
        }
    except Exception as e:
        return {"error": f"Permission check failed: {str(e)}"}


def handle_rbac_check(data: Dict, headers: Dict) -> Dict[str, Any]:
    """
    POST /api/rbac/check - Check if user has required permission.

    Args:
        data: Request body with document_id and required permission
        headers: Request headers for user context

    Returns:
        Whether access is allowed and relevant details
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        document_id = data.get("document_id")
        required = data.get("required", "view")

        if not document_id:
            return {"error": "document_id required"}

        user = get_user_context_from_headers(headers)
        if not user:
            return {"error": "User context not available"}

        rbac = get_rbac_retrieval()

        # Map string to Permission enum
        perm_values = [p.value for p in Permission]
        required_perm = Permission(required) if required in perm_values else Permission.VIEW

        # Run async checks
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            allowed = loop.run_until_complete(
                rbac.check_permission(user, document_id, required_perm)
            )
            actual_perm = loop.run_until_complete(
                rbac.get_permission(user, document_id)
            )
        finally:
            loop.close()

        return {
            "allowed": allowed,
            "document_id": document_id,
            "permission_required": required_perm.value,
            "permission_actual": actual_perm.value,
            "user_id": user.user_id,
            "user_email": user.email,
            "reason": "" if allowed else f"Insufficient permission: has {actual_perm.value}, needs {required_perm.value}"
        }
    except Exception as e:
        return {"error": f"Permission check failed: {str(e)}"}


def handle_rbac_batch_permissions(data: Dict, headers: Dict) -> Dict[str, Any]:
    """
    POST /api/rbac/permissions/batch - Get permissions for multiple documents.

    Args:
        data: Request body with document_ids array
        headers: Request headers for user context

    Returns:
        Dict mapping document IDs to permission levels
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        document_ids = data.get("document_ids", [])

        if not document_ids:
            return {"error": "document_ids array required"}

        if len(document_ids) > 100:
            return {"error": "Maximum 100 documents per batch"}

        user = get_user_context_from_headers(headers)
        if not user:
            return {"error": "User context not available"}

        rbac = get_rbac_retrieval()

        # Run async permission checks
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            permissions = {}
            for doc_id in document_ids:
                perm = loop.run_until_complete(
                    rbac.get_permission(user, doc_id)
                )
                permissions[doc_id] = perm.value
        finally:
            loop.close()

        return {
            "permissions": permissions,
            "count": len(permissions),
            "user_id": user.user_id
        }
    except Exception as e:
        return {"error": f"Batch permission check failed: {str(e)}"}


def handle_rbac_request_permission(data: Dict, headers: Dict) -> Dict[str, Any]:
    """
    POST /api/rbac/request - Request permission for a document.

    Args:
        data: Request body with document_id, requested_permission, reason
        headers: Request headers for user context

    Returns:
        Confirmation of permission request submission
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        document_id = data.get("document_id")
        requested_permission = data.get("requested_permission", "view")
        reason = data.get("reason", "")

        if not document_id:
            return {"error": "document_id required"}

        user = get_user_context_from_headers(headers)
        if not user:
            return {"error": "User context not available"}

        # Log the permission request
        rbac = get_rbac_retrieval()
        rbac.log_access(
            user=user,
            document_id=document_id,
            action=AccessAction.PERMISSION_CHECK,
            required=Permission(requested_permission),
            actual=Permission.NONE,
            allowed=False,
            reason=f"Permission request: {reason}"
        )

        return {
            "success": True,
            "message": "Permission request submitted",
            "document_id": document_id,
            "requested_permission": requested_permission,
            "user_id": user.user_id,
            "status": "pending"
        }
    except Exception as e:
        return {"error": f"Permission request failed: {str(e)}"}


def handle_rbac_grant_permission(data: Dict, headers: Dict) -> Dict[str, Any]:
    """
    POST /api/rbac/grant - Grant permission to a user (admin only).

    Args:
        data: Request body with document_id, user_id, permission, etc.
        headers: Request headers for admin user context

    Returns:
        Confirmation of permission grant
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        document_id = data.get("document_id")
        target_user_id = data.get("user_id")
        permission = data.get("permission", "view")
        expires_in_days = data.get("expires_in_days")
        reason = data.get("reason", "")

        if not document_id or not target_user_id:
            return {"error": "document_id and user_id required"}

        # Check if requester is admin
        admin_user = get_user_context_from_headers(headers)
        if not admin_user or not admin_user.is_admin():
            return {"error": "Admin permission required"}

        rbac = get_rbac_retrieval()
        perm = grant_permission(
            rbac=rbac,
            document_id=document_id,
            user_id=target_user_id,
            permission=Permission(permission),
            granted_by=admin_user.user_id,
            expires_in_days=expires_in_days,
            reason=reason
        )

        return {
            "success": True,
            "grant": perm.to_dict()
        }
    except Exception as e:
        return {"error": f"Grant permission failed: {str(e)}"}


def handle_rbac_invalidate_cache(data: Dict) -> Dict[str, Any]:
    """
    POST /api/rbac/invalidate-cache - Invalidate permission cache.

    Args:
        data: Request body with optional document_id

    Returns:
        Confirmation of cache invalidation
    """
    if not RBAC_AVAILABLE:
        return {"error": "RBAC system not available"}

    try:
        document_id = data.get("document_id")  # Optional

        rbac = get_rbac_retrieval()
        rbac.invalidate_cache(document_id)

        return {
            "success": True,
            "document_id": document_id,
            "message": f"Cache invalidated for {'document ' + document_id if document_id else 'all documents'}"
        }
    except Exception as e:
        return {"error": f"Cache invalidation failed: {str(e)}"}


# Export availability flag
__all__ = [
    'RBAC_AVAILABLE',
    'get_user_context_from_headers',
    'handle_rbac_stats',
    'handle_rbac_access_log',
    'handle_rbac_get_permission',
    'handle_rbac_check',
    'handle_rbac_batch_permissions',
    'handle_rbac_request_permission',
    'handle_rbac_grant_permission',
    'handle_rbac_invalidate_cache',
]
