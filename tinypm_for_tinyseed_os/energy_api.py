#!/usr/bin/env python3
"""
ENERGY TRACKING API ENDPOINTS
Flask/FastAPI compatible endpoints for energy tracking

This module provides RESTful API endpoints for:
- Current energy status
- Energy visualization data
- Check-ins and task ratings
- Task suggestions
- Recovery management

Integrates with the main EnergyTracker class.
"""

from datetime import datetime
from typing import Dict, List, Optional
from flask import Blueprint, request, jsonify

# Import the energy tracking system
try:
    from energy_tracking import get_energy_tracker, EnergyTracker
except ImportError:
    # Fallback for standalone testing
    print("[EnergyAPI] energy_tracking module not available")
    get_energy_tracker = None

# Create Flask blueprint
energy_bp = Blueprint('energy', __name__, url_prefix='/api/energy')


def get_tracker() -> Optional[EnergyTracker]:
    """Get the energy tracker instance."""
    if get_energy_tracker:
        return get_energy_tracker()
    return None


# ===== STATUS ENDPOINTS =====

@energy_bp.route('/status', methods=['GET'])
def get_energy_status():
    """
    Get comprehensive energy status.

    Returns current energy, today's curve, and session info.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        status = tracker.get_full_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/current', methods=['GET'])
def get_current_energy():
    """
    Get just the current energy level.

    Quick endpoint for widget updates.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        energy = tracker.get_current_energy()
        return jsonify(energy)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== VISUALIZATION ENDPOINTS =====

@energy_bp.route('/curve/today', methods=['GET'])
def get_today_curve():
    """
    Get today's energy curve for visualization.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        curve = tracker.get_today_curve()
        return jsonify(curve)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/heatmap/weekly', methods=['GET'])
def get_weekly_heatmap():
    """
    Get weekly energy heatmap data.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        heatmap = tracker.get_weekly_heatmap()
        return jsonify(heatmap)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== IMPLICIT TRACKING ENDPOINTS =====

@energy_bp.route('/typing', methods=['POST'])
def record_typing():
    """
    Record typing speed for implicit energy detection.

    Body:
    {
        "chars_typed": int,
        "seconds_elapsed": float
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    chars = data.get('chars_typed', 0)
    seconds = data.get('seconds_elapsed', 1)

    try:
        result = tracker.record_typing(chars, seconds)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/action', methods=['POST'])
def record_action():
    """
    Record a generic action for gap tracking.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        result = tracker.record_action()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/task-completed', methods=['POST'])
def record_task_completed():
    """
    Record task completion for energy tracking.

    Body:
    {
        "task_id": str,
        "started_at": str (ISO datetime),
        "completed_at": str (ISO datetime, optional),
        "estimated_minutes": int (optional)
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    task_id = data.get('task_id')
    started_at_str = data.get('started_at')
    completed_at_str = data.get('completed_at')
    estimated = data.get('estimated_minutes')

    if not task_id or not started_at_str:
        return jsonify({"error": "task_id and started_at are required"}), 400

    try:
        started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
        completed_at = None
        if completed_at_str:
            completed_at = datetime.fromisoformat(completed_at_str.replace('Z', '+00:00'))

        result = tracker.record_task_completed(task_id, started_at, completed_at, estimated)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/error', methods=['POST'])
def record_error():
    """
    Record error rate for energy tracking.

    Body:
    {
        "error_count": int,
        "total_actions": int
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    error_count = data.get('error_count', 0)
    total_actions = data.get('total_actions', 0)

    try:
        result = tracker.record_error(error_count, total_actions)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== EXPLICIT INPUT ENDPOINTS =====

@energy_bp.route('/checkin/prompt', methods=['GET'])
def get_checkin_prompt():
    """
    Get the check-in prompt for the UI.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        prompt = tracker.get_checkin_prompt()
        return jsonify(prompt)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/checkin', methods=['POST'])
def submit_checkin():
    """
    Submit energy check-in.

    Body:
    {
        "energy_level": int (1-5),
        "sleep_quality": int (1-4, optional)
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    energy = data.get('energy_level')
    sleep = data.get('sleep_quality')

    if not energy or energy < 1 or energy > 5:
        return jsonify({"error": "energy_level must be 1-5"}), 400

    try:
        result = tracker.record_checkin(energy, sleep)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/task-rating', methods=['POST'])
def submit_task_rating():
    """
    Submit post-task energy rating.

    Body:
    {
        "task_id": str,
        "energy_during": str ("low", "medium", "high")
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    task_id = data.get('task_id')
    energy = data.get('energy_during')

    if not task_id or not energy:
        return jsonify({"error": "task_id and energy_during are required"}), 400

    if energy not in ['low', 'medium', 'high']:
        return jsonify({"error": "energy_during must be low, medium, or high"}), 400

    try:
        result = tracker.record_task_energy_rating(task_id, energy)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== TASK ANALYSIS ENDPOINTS =====

@energy_bp.route('/task/analyze', methods=['POST'])
def analyze_task():
    """
    Analyze a task for difficulty.

    Body:
    {
        "task_id": str,
        "title": str,
        "description": str (optional),
        "estimated_minutes": int (optional),
        "has_deadline": bool (optional),
        "deadline_hours": int (optional),
        "task_type": str (optional)
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    task_id = data.get('task_id')
    title = data.get('title')

    if not task_id or not title:
        return jsonify({"error": "task_id and title are required"}), 400

    try:
        result = tracker.analyze_task(
            task_id=task_id,
            title=title,
            description=data.get('description', ''),
            estimated_minutes=data.get('estimated_minutes', 30),
            has_deadline=data.get('has_deadline', False),
            deadline_hours=data.get('deadline_hours'),
            task_type=data.get('task_type')
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/task/best-time/<task_id>', methods=['GET'])
def get_best_time(task_id):
    """
    Get best time recommendation for a task.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        result = tracker.get_best_time_for_task(task_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== SUGGESTIONS ENDPOINTS =====

@energy_bp.route('/suggestions', methods=['POST'])
def get_suggestions():
    """
    Get energy-aware task suggestions.

    Body:
    {
        "tasks": [
            {"id": str, "title": str, ...},
            ...
        ],
        "limit": int (optional, default 5)
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    tasks = data.get('tasks', [])
    limit = data.get('limit', 5)

    try:
        result = tracker.get_task_suggestions(tasks, limit)
        return jsonify({"suggestions": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/suggestions/low-energy', methods=['POST'])
def get_low_energy_suggestions():
    """
    Get easy wins for low energy mode.

    Body:
    {
        "tasks": [...]
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    tasks = data.get('tasks', [])

    try:
        result = tracker.get_low_energy_tasks(tasks)
        return jsonify({"suggestions": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== RECOVERY ENDPOINTS =====

@energy_bp.route('/recovery/check', methods=['GET'])
def check_recovery():
    """
    Check if recovery is needed.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        result = tracker.check_recovery_needed()
        return jsonify({"recovery_needed": result is not None, "block": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/recovery/pending', methods=['GET'])
def get_pending_recovery():
    """
    Get pending recovery block if any.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        result = tracker.get_pending_recovery()
        return jsonify({"pending": result is not None, "block": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/recovery/accept', methods=['POST'])
def accept_recovery():
    """
    Accept a recovery suggestion.

    Body:
    {
        "block_id": str
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    block_id = data.get('block_id')

    if not block_id:
        return jsonify({"error": "block_id is required"}), 400

    try:
        success = tracker.accept_recovery(block_id)
        return jsonify({"success": success})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/recovery/complete', methods=['POST'])
def complete_recovery():
    """
    Mark recovery as completed.

    Body:
    {
        "block_id": str
    }
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    data = request.json or {}
    block_id = data.get('block_id')

    if not block_id:
        return jsonify({"error": "block_id is required"}), 400

    try:
        success = tracker.complete_recovery(block_id)
        return jsonify({"success": success})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== STATS ENDPOINTS =====

@energy_bp.route('/stats/implicit', methods=['GET'])
def get_implicit_stats():
    """
    Get implicit detection statistics.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        stats = tracker.implicit_detector.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@energy_bp.route('/stats/recovery', methods=['GET'])
def get_recovery_stats():
    """
    Get recovery statistics.
    """
    tracker = get_tracker()
    if not tracker:
        return jsonify({"error": "Energy tracking not available"}), 503

    try:
        stats = tracker.recovery_manager.get_recovery_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== INTEGRATION FUNCTION =====

def register_energy_routes(app):
    """
    Register energy routes with Flask app.

    Usage:
        from energy_api import register_energy_routes
        register_energy_routes(app)
    """
    app.register_blueprint(energy_bp)
    print("[EnergyAPI] Energy tracking routes registered at /api/energy")


# ===== STANDALONE TEST =====

if __name__ == "__main__":
    from flask import Flask
    app = Flask(__name__)
    register_energy_routes(app)

    print("Energy API Test Server")
    print("=" * 60)
    print("Endpoints:")
    for rule in app.url_map.iter_rules():
        if 'energy' in rule.rule:
            print(f"  {rule.methods} {rule.rule}")
    print("=" * 60)

    app.run(debug=True, port=5001)
