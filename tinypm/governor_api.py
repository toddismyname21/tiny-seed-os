"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           GOVERNOR API HANDLERS                               ║
║                   REST API Endpoints for Governor Dashboard                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

Add these handlers to web_server.py to enable the Governor API.

Created: 2026-02-06
Author: Claude (PM_Architect)
Version: 1.0.0
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Optional

# Import Governor
from governor import get_governor, init_governor, SafeLevel, GovernorDecision


async def handle_governor_status(request) -> Dict:
    """
    GET /api/governor/status
    Returns current Governor status including safe level, circuit breakers, and metrics.
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    return governor.get_status()


async def handle_governor_set_safe_level(request, data: Dict) -> Dict:
    """
    POST /api/governor/safe-level
    Set the safe mode level.

    Body: {"level": "GREEN|YELLOW|RED|LOCKDOWN", "reason": "optional reason"}
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    level_str = data.get("level", "").upper()
    reason = data.get("reason", "API request")

    try:
        level = SafeLevel[level_str]
        governor.set_safe_level(level, reason)
        return {
            "success": True,
            "level": level.value,
            "reason": reason
        }
    except KeyError:
        return {
            "success": False,
            "error": f"Invalid level: {level_str}. Must be one of: GREEN, YELLOW, RED, LOCKDOWN"
        }


async def handle_governor_audit(request, limit: int = 50) -> Dict:
    """
    GET /api/governor/audit?limit=50
    Returns recent audit log entries.
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    entries = governor.audit_logger.query(limit=limit)
    return entries


async def handle_governor_metrics(request) -> Dict:
    """
    GET /api/governor/metrics
    Returns detailed metrics.
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    return governor.metrics.get_summary()


async def handle_governor_circuit_breakers(request) -> Dict:
    """
    GET /api/governor/circuit-breakers
    Returns circuit breaker status.
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    return {
        name: cb.get_status()
        for name, cb in governor.circuit_breakers.items()
    }


async def handle_governor_reset_circuit_breaker(request, data: Dict) -> Dict:
    """
    POST /api/governor/circuit-breakers/reset
    Reset a specific circuit breaker.

    Body: {"name": "circuit_breaker_name"}
    """
    governor = get_governor()
    if not governor._initialized:
        await governor.initialize()

    name = data.get("name")
    if name not in governor.circuit_breakers:
        return {
            "success": False,
            "error": f"Unknown circuit breaker: {name}"
        }

    cb = governor.circuit_breakers[name]
    cb.state = cb.state.__class__.CLOSED
    cb.failure_count = 0

    return {
        "success": True,
        "name": name,
        "new_state": "closed"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# FLASK/BOTTLE ROUTE REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

def register_governor_routes(app):
    """
    Register Governor routes with a Flask or Bottle app.

    Usage:
        from governor_api import register_governor_routes
        register_governor_routes(app)
    """

    # Try Flask-style registration
    try:
        from flask import request as flask_request, jsonify

        @app.route('/api/governor/status', methods=['GET'])
        def governor_status():
            result = asyncio.run(handle_governor_status(flask_request))
            return jsonify(result)

        @app.route('/api/governor/safe-level', methods=['POST'])
        def governor_set_safe_level():
            data = flask_request.get_json() or {}
            result = asyncio.run(handle_governor_set_safe_level(flask_request, data))
            return jsonify(result)

        @app.route('/api/governor/audit', methods=['GET'])
        def governor_audit():
            limit = flask_request.args.get('limit', 50, type=int)
            result = asyncio.run(handle_governor_audit(flask_request, limit))
            return jsonify(result)

        @app.route('/api/governor/metrics', methods=['GET'])
        def governor_metrics():
            result = asyncio.run(handle_governor_metrics(flask_request))
            return jsonify(result)

        @app.route('/api/governor/circuit-breakers', methods=['GET'])
        def governor_circuit_breakers():
            result = asyncio.run(handle_governor_circuit_breakers(flask_request))
            return jsonify(result)

        @app.route('/api/governor/circuit-breakers/reset', methods=['POST'])
        def governor_reset_circuit_breaker():
            data = flask_request.get_json() or {}
            result = asyncio.run(handle_governor_reset_circuit_breaker(flask_request, data))
            return jsonify(result)

        print("Governor API routes registered (Flask)")
        return True

    except ImportError:
        pass

    # Try Bottle-style registration
    try:
        from bottle import request as bottle_request, response

        @app.route('/api/governor/status', method='GET')
        def governor_status():
            response.content_type = 'application/json'
            result = asyncio.run(handle_governor_status(bottle_request))
            return json.dumps(result)

        @app.route('/api/governor/safe-level', method='POST')
        def governor_set_safe_level():
            response.content_type = 'application/json'
            data = bottle_request.json or {}
            result = asyncio.run(handle_governor_set_safe_level(bottle_request, data))
            return json.dumps(result)

        @app.route('/api/governor/audit', method='GET')
        def governor_audit():
            response.content_type = 'application/json'
            limit = int(bottle_request.query.get('limit', 50))
            result = asyncio.run(handle_governor_audit(bottle_request, limit))
            return json.dumps(result)

        @app.route('/api/governor/metrics', method='GET')
        def governor_metrics():
            response.content_type = 'application/json'
            result = asyncio.run(handle_governor_metrics(bottle_request))
            return json.dumps(result)

        @app.route('/api/governor/circuit-breakers', method='GET')
        def governor_circuit_breakers():
            response.content_type = 'application/json'
            result = asyncio.run(handle_governor_circuit_breakers(bottle_request))
            return json.dumps(result)

        @app.route('/api/governor/circuit-breakers/reset', method='POST')
        def governor_reset_circuit_breaker():
            response.content_type = 'application/json'
            data = bottle_request.json or {}
            result = asyncio.run(handle_governor_reset_circuit_breaker(bottle_request, data))
            return json.dumps(result)

        print("Governor API routes registered (Bottle)")
        return True

    except ImportError:
        pass

    print("Warning: Could not register Governor API routes (no Flask or Bottle found)")
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# AIOHTTP HANDLER (For async web servers)
# ═══════════════════════════════════════════════════════════════════════════════

async def aiohttp_governor_handler(request):
    """
    Generic handler for aiohttp-style async web servers.

    Usage:
        from aiohttp import web
        from governor_api import aiohttp_governor_handler

        app.router.add_route('*', '/api/governor/{action}', aiohttp_governor_handler)
    """
    from aiohttp import web

    action = request.match_info.get('action', 'status')
    method = request.method

    try:
        if action == 'status' and method == 'GET':
            result = await handle_governor_status(request)
        elif action == 'safe-level' and method == 'POST':
            data = await request.json()
            result = await handle_governor_set_safe_level(request, data)
        elif action == 'audit' and method == 'GET':
            limit = int(request.query.get('limit', 50))
            result = await handle_governor_audit(request, limit)
        elif action == 'metrics' and method == 'GET':
            result = await handle_governor_metrics(request)
        elif action == 'circuit-breakers' and method == 'GET':
            result = await handle_governor_circuit_breakers(request)
        elif action == 'circuit-breakers/reset' and method == 'POST':
            data = await request.json()
            result = await handle_governor_reset_circuit_breaker(request, data)
        else:
            return web.json_response({"error": "Unknown action"}, status=404)

        return web.json_response(result)

    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)
