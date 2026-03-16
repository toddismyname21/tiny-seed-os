#!/usr/bin/env python3
"""
===============================================================================
BRAIN BRIDGE - TinyPM Brain Integration for Tiny Seed OS Chief of Staff
===============================================================================

This bridge connects the TinyPM Brain to the Chief of Staff interface,
enabling proactive suggestions, predictions, and intelligent assistance.

STATE OF THE ART IMPLEMENTATION (February 2026):
- FastAPI server with SSE for real-time suggestions
- WebSocket for bidirectional communication
- Integration with PMBrain, PMOrchestrator, PredictiveIntentEngine
- Health monitoring and graceful degradation
- CORS enabled for Chief of Staff frontend

Architecture:
    Chief of Staff HTML
           |
           v
    [brain_bridge.py] <-- This file
           |
           v
    tinypm_for_tinyseed_os/
        - pm_brain.py
        - pm_orchestrator.py
        - predictive_intent.py

Usage:
    python brain_bridge.py                # Start the brain server
    python brain_bridge.py --port 8000    # Custom port
    python brain_bridge.py --health       # Check health status

Created: 2026-02-01
Author: Build Team 1 - Brain Core Setup
"""

import argparse
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add tinypm_for_tinyseed_os to path
TINYPM_DIR = Path(__file__).parent.parent / "tinypm_for_tinyseed_os"
sys.path.insert(0, str(TINYPM_DIR))

# Load environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# FastAPI and async imports
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from sse_starlette.sse import EventSourceResponse
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    print("[BrainBridge] FastAPI not available. Install with: pip install fastapi uvicorn sse-starlette")

# Import TinyPM Brain components
BRAIN_AVAILABLE = False
ORCHESTRATOR_AVAILABLE = False
PREDICTIVE_AVAILABLE = False

try:
    from pm_brain import (
        get_confidence_scorer,
        get_timing_intelligence,
        get_style_learner,
        ConfidenceScorer,
        TimingIntelligence,
        StyleLearner,
        load_memory,
        load_patterns,
        check_proactive_suggestions,
        gather_context
    )
    BRAIN_AVAILABLE = True
    print("[BrainBridge] PMBrain loaded successfully")
except ImportError as e:
    print(f"[BrainBridge] PMBrain not available: {e}")

try:
    from predictive_intent import (
        PredictiveIntentEngine,
        ActionEvent,
        ActionCategory,
        PredictedAction,
        ProactiveSuggestion,
        FusedContext
    )
    PREDICTIVE_AVAILABLE = True
    print("[BrainBridge] PredictiveIntentEngine loaded successfully")
except ImportError as e:
    print(f"[BrainBridge] PredictiveIntentEngine not available: {e}")

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
DEFAULT_PORT = 8000
PROACTIVE_CHECK_INTERVAL = 30  # seconds

# ===============================================================================
# BRAIN BRIDGE SERVER
# ===============================================================================

if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="TinyPM Brain Bridge",
        description="Intelligence layer for Tiny Seed OS Chief of Staff",
        version="1.0.0"
    )

    # CORS for Chief of Staff frontend
    app.add_middleware(
        CORSMiddleware,
        # SECURITY FIX 2026-02-28: Restrict CORS to localhost only (was allow_origins=["*"] with credentials)
        allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000", "https://toddismyname21.github.io"],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Connection tracking
    websocket_clients: Dict[str, WebSocket] = {}
    sse_queues: Dict[str, asyncio.Queue] = {}

    # Brain components (initialized on startup)
    confidence_scorer: Optional[ConfidenceScorer] = None
    timing_intelligence: Optional[TimingIntelligence] = None
    style_learner: Optional[StyleLearner] = None
    predictive_engine: Optional[PredictiveIntentEngine] = None
    proactive_task: Optional[asyncio.Task] = None

    # ===============================================================================
    # HEALTH & STATUS ENDPOINTS
    # ===============================================================================

    @app.get("/api/health")
    async def health_check():
        """Health check endpoint for brain availability."""
        components = {
            "brain": BRAIN_AVAILABLE,
            "predictive_engine": PREDICTIVE_AVAILABLE,
            "confidence_scorer": confidence_scorer is not None,
            "timing_intelligence": timing_intelligence is not None,
            "style_learner": style_learner is not None
        }

        all_healthy = BRAIN_AVAILABLE or PREDICTIVE_AVAILABLE

        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "components": components,
            "version": "1.0.0",
            "connected_clients": {
                "websocket": len(websocket_clients),
                "sse": len(sse_queues)
            }
        }

    @app.get("/api/status")
    async def get_status():
        """Get detailed brain status."""
        status = {
            "brain_available": BRAIN_AVAILABLE,
            "predictive_available": PREDICTIVE_AVAILABLE,
            "timestamp": datetime.now().isoformat()
        }

        if BRAIN_AVAILABLE:
            try:
                memory = load_memory()
                patterns = load_patterns()
                status["memory"] = {
                    "facts_count": len(memory.get("facts", {})),
                    "context_count": len(memory.get("context", [])),
                    "updated_at": memory.get("updated_at")
                }
                status["patterns"] = {
                    "time_patterns": len(patterns.get("time_patterns", {})),
                    "response_effectiveness": len(patterns.get("response_effectiveness", {}))
                }
            except Exception as e:
                status["memory_error"] = str(e)

        if PREDICTIVE_AVAILABLE and predictive_engine:
            try:
                status["predictive"] = {
                    "initialized": True,
                    "patterns_loaded": True
                }
            except Exception as e:
                status["predictive_error"] = str(e)

        return status

    # ===============================================================================
    # PREDICTION ENDPOINTS
    # ===============================================================================

    @app.post("/api/predictions")
    async def get_predictions(context: Optional[Dict] = None):
        """Get predictions based on current context."""
        if not PREDICTIVE_AVAILABLE or not predictive_engine:
            return {
                "predictions": [],
                "message": "Predictive engine not available",
                "generated_at": datetime.now().isoformat()
            }

        try:
            # Build fused context
            now = datetime.now()
            fused_context = FusedContext(
                hour=now.hour,
                minute=now.minute,
                day_of_week=now.weekday(),
                day_name=now.strftime("%A"),
                is_weekend=now.weekday() >= 5,
                is_morning=6 <= now.hour < 12,
                is_afternoon=12 <= now.hour < 18,
                is_evening=18 <= now.hour < 22
            )

            # Add context from request if provided
            if context:
                for key, value in context.items():
                    if hasattr(fused_context, key):
                        setattr(fused_context, key, value)

            # Get predictions
            predictions = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: predictive_engine.predict_next_actions(fused_context)
            )

            return {
                "predictions": [p.to_dict() for p in predictions[:5]],
                "context": fused_context.to_dict(),
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "predictions": [],
                "error": str(e),
                "generated_at": datetime.now().isoformat()
            }

    @app.get("/api/suggestions")
    async def get_suggestions():
        """Get proactive suggestions from brain."""
        suggestions = []

        if BRAIN_AVAILABLE:
            try:
                proactive = check_proactive_suggestions()
                for s in proactive:
                    suggestions.append({
                        "id": str(uuid.uuid4())[:8],
                        "message": s,
                        "type": "proactive",
                        "confidence": 0.7,
                        "timestamp": datetime.now().isoformat()
                    })
            except Exception as e:
                print(f"[BrainBridge] Error getting proactive suggestions: {e}")

        if BRAIN_AVAILABLE and confidence_scorer:
            try:
                # Check timing
                is_good_time = timing_intelligence.is_good_time_to_suggest() if timing_intelligence else True

                for suggestion in suggestions:
                    # Score confidence
                    confidence = confidence_scorer.score_suggestion(
                        suggestion.get("type", "general"),
                        {"base_confidence": 0.7}
                    )
                    suggestion["confidence"] = confidence
                    suggestion["action_level"] = confidence_scorer.get_action_level(confidence)
                    suggestion["is_good_time"] = is_good_time
            except Exception as e:
                print(f"[BrainBridge] Error scoring suggestions: {e}")

        return {
            "suggestions": suggestions,
            "count": len(suggestions),
            "generated_at": datetime.now().isoformat()
        }

    @app.get("/api/context")
    async def get_context():
        """Get current brain context."""
        if not BRAIN_AVAILABLE:
            return {"context": "Brain not available"}

        try:
            context = gather_context()
            return {
                "context": context,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "context": str(e),
                "error": True,
                "timestamp": datetime.now().isoformat()
            }

    @app.get("/api/patterns")
    async def get_patterns():
        """Get learned patterns for Memory tab."""
        if not BRAIN_AVAILABLE:
            return {"patterns": [], "count": 0}

        try:
            patterns = load_patterns()
            formatted = []

            # Time patterns
            if patterns.get("time_patterns"):
                for key, data in patterns["time_patterns"].items():
                    if isinstance(data, dict):
                        formatted.append({
                            "pattern": key,
                            "title": f"Time pattern: {key}",
                            "description": data.get("action", ""),
                            "confidence": data.get("frequency", 0),
                            "type": "time"
                        })

            # Sequence patterns
            if patterns.get("sequence_patterns"):
                for key, freq in patterns["sequence_patterns"].items():
                    if isinstance(freq, (int, float)) and freq > 0.3:
                        formatted.append({
                            "pattern": key,
                            "title": f"Sequence: {key.replace('->', ' → ')}",
                            "description": f"You often do this sequence",
                            "confidence": freq,
                            "type": "sequence"
                        })

            # Response effectiveness
            if patterns.get("response_effectiveness"):
                for key, data in patterns["response_effectiveness"].items():
                    if isinstance(data, dict) and data.get("trials", 0) > 5:
                        formatted.append({
                            "pattern": key,
                            "title": f"Effectiveness: {key}",
                            "description": f"Success rate: {data.get('success_rate', 0):.0%} ({data.get('trials', 0)} trials)",
                            "confidence": data.get("success_rate", 0),
                            "type": "effectiveness"
                        })

            # Sort by confidence descending
            formatted.sort(key=lambda x: x.get("confidence", 0), reverse=True)

            return {
                "patterns": formatted[:20],
                "count": len(formatted),
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {"patterns": [], "count": 0, "error": str(e)}

    @app.get("/api/style-profile")
    async def get_style_profile():
        """Get owner's communication style profile from StyleLearner."""
        if not BRAIN_AVAILABLE or not style_learner:
            return {"success": False, "error": "Style learner not available"}

        try:
            profile = style_learner.get_profile() if hasattr(style_learner, 'get_profile') else {}

            if not profile:
                return {
                    "success": True,
                    "profile": {
                        "tone": "Not yet learned — send more emails to train",
                        "formality": "Unknown",
                        "greeting": "Unknown",
                        "signOff": "Unknown",
                        "avgLength": "Unknown",
                        "keyPhrases": [],
                        "emojiUsage": "Unknown",
                        "status": "learning"
                    },
                    "message": "Style profile is still learning from your emails. Send a few more to build your profile."
                }

            return {
                "success": True,
                "profile": profile,
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ===============================================================================
    # SSE ENDPOINT FOR REAL-TIME SUGGESTIONS
    # ===============================================================================

    @app.get("/api/events")
    async def sse_endpoint():
        """
        Server-Sent Events endpoint for real-time brain updates.

        Events:
        - suggestion: Proactive suggestion from brain
        - prediction: Updated predictions
        - nudge: Time-sensitive reminder
        - heartbeat: Keep-alive ping
        """
        async def event_generator():
            client_id = str(uuid.uuid4())
            queue = asyncio.Queue()
            sse_queues[client_id] = queue

            try:
                # Send initial connection event
                yield {
                    "event": "connected",
                    "data": json.dumps({
                        "client_id": client_id,
                        "timestamp": datetime.now().isoformat()
                    })
                }

                while True:
                    try:
                        # Wait for events with timeout for heartbeat
                        event = await asyncio.wait_for(queue.get(), timeout=30.0)
                        yield {
                            "event": event.get("type", "message"),
                            "data": json.dumps(event.get("data", {}))
                        }
                    except asyncio.TimeoutError:
                        # Send heartbeat
                        yield {
                            "event": "heartbeat",
                            "data": json.dumps({
                                "timestamp": datetime.now().isoformat()
                            })
                        }
            finally:
                del sse_queues[client_id]

        return EventSourceResponse(event_generator())

    # ===============================================================================
    # WEBSOCKET FOR BIDIRECTIONAL COMMUNICATION
    # ===============================================================================

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """
        WebSocket endpoint for bidirectional communication.

        Receives:
        - action_recorded: User performed action (for pattern learning)
        - suggestion_feedback: User responded to suggestion
        - context_update: Frontend context changed

        Sends:
        - prediction_update: New predictions available
        - suggestion: Proactive suggestion
        """
        await websocket.accept()
        client_id = str(uuid.uuid4())
        websocket_clients[client_id] = websocket

        try:
            # Send welcome message
            await websocket.send_json({
                "type": "connected",
                "client_id": client_id,
                "timestamp": datetime.now().isoformat()
            })

            while True:
                data = await websocket.receive_json()

                if data.get("type") == "action_recorded":
                    # Record action for pattern learning
                    if PREDICTIVE_AVAILABLE and predictive_engine:
                        try:
                            action = ActionEvent(
                                id=str(uuid.uuid4()),
                                timestamp=datetime.now(),
                                category=ActionCategory(data.get("category", "unknown")),
                                action_type=data.get("action", "unknown"),
                                context=data.get("context", {}),
                                metadata=data.get("metadata", {})
                            )
                            predictive_engine.record_action(action)
                            await websocket.send_json({
                                "type": "action_recorded_ack",
                                "success": True
                            })
                        except Exception as e:
                            await websocket.send_json({
                                "type": "action_recorded_ack",
                                "success": False,
                                "error": str(e)
                            })

                elif data.get("type") == "suggestion_feedback":
                    # Record feedback for confidence calibration
                    if BRAIN_AVAILABLE and confidence_scorer:
                        try:
                            was_accepted = data.get("outcome") == "accepted"
                            confidence_scorer.record_outcome(
                                data.get("suggestion_type", "general"),
                                was_accepted
                            )
                            if timing_intelligence:
                                timing_intelligence.record_timing_outcome(
                                    was_accepted,
                                    {"suggestion_id": data.get("suggestion_id")}
                                )
                            await websocket.send_json({
                                "type": "feedback_recorded_ack",
                                "success": True
                            })
                        except Exception as e:
                            await websocket.send_json({
                                "type": "feedback_recorded_ack",
                                "success": False,
                                "error": str(e)
                            })

                elif data.get("type") == "context_update":
                    # Generate new predictions based on updated context
                    if PREDICTIVE_AVAILABLE and predictive_engine:
                        try:
                            context = data.get("context", {})
                            now = datetime.now()
                            fused_context = FusedContext(
                                hour=now.hour,
                                minute=now.minute,
                                day_of_week=now.weekday(),
                                day_name=now.strftime("%A"),
                                is_weekend=now.weekday() >= 5,
                                is_morning=6 <= now.hour < 12,
                                is_afternoon=12 <= now.hour < 18,
                                is_evening=18 <= now.hour < 22,
                                **context
                            )
                            predictions = predictive_engine.predict_next_actions(fused_context)
                            await websocket.send_json({
                                "type": "prediction_update",
                                "predictions": [p.to_dict() for p in predictions[:5]]
                            })
                        except Exception as e:
                            await websocket.send_json({
                                "type": "prediction_update",
                                "predictions": [],
                                "error": str(e)
                            })

                elif data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })

        except WebSocketDisconnect:
            pass
        finally:
            del websocket_clients[client_id]

    # ===============================================================================
    # PROACTIVE LOOP
    # ===============================================================================

    async def proactive_loop():
        """Background loop that generates proactive suggestions."""
        while True:
            try:
                await asyncio.sleep(PROACTIVE_CHECK_INTERVAL)

                # Check if it's a good time to suggest
                is_good_time = True
                if BRAIN_AVAILABLE and timing_intelligence:
                    is_good_time = timing_intelligence.is_good_time_to_suggest()

                if not is_good_time:
                    continue

                # Get suggestions
                suggestions = []
                if BRAIN_AVAILABLE:
                    proactive = check_proactive_suggestions()
                    for s in proactive:
                        confidence = 0.7
                        if confidence_scorer:
                            confidence = confidence_scorer.score_suggestion("proactive")

                        if confidence >= 0.5:  # Only show if confidence is reasonable
                            suggestions.append({
                                "id": str(uuid.uuid4())[:8],
                                "message": s,
                                "type": "proactive",
                                "confidence": confidence,
                                "timestamp": datetime.now().isoformat()
                            })

                # Push to all connected SSE clients
                if suggestions:
                    for queue in sse_queues.values():
                        for suggestion in suggestions[:1]:  # One at a time
                            await queue.put({
                                "type": "suggestion",
                                "data": suggestion
                            })

                    # Also push to WebSocket clients
                    for ws in websocket_clients.values():
                        try:
                            await ws.send_json({
                                "type": "suggestion",
                                "suggestion": suggestions[0]
                            })
                        except:
                            pass

                    # Mark suggestion as shown
                    if timing_intelligence:
                        timing_intelligence.mark_suggestion_shown()

            except Exception as e:
                print(f"[BrainBridge] Proactive loop error: {e}")

    # ===============================================================================
    # CHAT ENDPOINT - Chief of Staff AI Conversation
    # ===============================================================================

    # Try to import Anthropic
    try:
        import anthropic
        ANTHROPIC_AVAILABLE = True
        anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        print("[BrainBridge] Anthropic client initialized")
    except ImportError:
        ANTHROPIC_AVAILABLE = False
        anthropic_client = None
        print("[BrainBridge] Anthropic not available. Install with: pip install anthropic")
    except Exception as e:
        ANTHROPIC_AVAILABLE = False
        anthropic_client = None
        print(f"[BrainBridge] Anthropic error: {e}")

    @app.post("/api/chat")
    async def chat_with_brain(request: Dict[str, Any]):
        """
        Chat with the Chief of Staff AI brain.

        Request body:
        - message: User's message
        - history: List of previous messages (optional)
        - context: Additional context (optional)

        Returns:
        - response: AI response text
        - suggestions: Related action suggestions
        """
        message = request.get("message", "")
        history = request.get("history", [])
        context = request.get("context", {})

        if not message:
            return {"error": "No message provided", "response": "Please provide a message."}

        # Build system prompt with farm context
        system_prompt = """You are the Chief of Staff AI for Tiny Seed Farm, a small organic farm near Pittsburgh, PA.

Your role is to help Todd (the owner) manage his farm operations efficiently. You have access to:
- Task management (planting, harvesting, deliveries)
- Customer orders and CSA management
- Irrigation and field data
- Financial tracking
- Employee scheduling

Be concise, practical, and action-oriented. Give specific advice when possible.
When you don't have specific data, acknowledge it but still offer helpful guidance.

Current context:
- Time: """ + datetime.now().strftime("%A, %B %d at %I:%M %p") + """
- Season: """ + ("Winter" if datetime.now().month in [12,1,2] else "Spring" if datetime.now().month in [3,4,5] else "Summer" if datetime.now().month in [6,7,8] else "Fall")

        # Add brain context if available
        if BRAIN_AVAILABLE:
            try:
                brain_context = gather_context()
                if brain_context:
                    system_prompt += f"\n\nFarm Context:\n{brain_context}"
            except:
                pass

        # Get proactive suggestions to inform response
        suggestions = []
        if BRAIN_AVAILABLE:
            try:
                proactive = check_proactive_suggestions()
                if proactive:
                    system_prompt += f"\n\nProactive insights: {', '.join(proactive[:3])}"
                    suggestions = proactive[:3]
            except:
                pass

        # Build messages for API
        messages = []

        # Add conversation history
        for h in history[-10:]:  # Last 10 messages
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

        # Add current message
        messages.append({"role": "user", "content": message})

        # Call Anthropic API
        if ANTHROPIC_AVAILABLE and anthropic_client:
            try:
                response = anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    system=system_prompt,
                    messages=messages
                )
                ai_response = response.content[0].text

                return {
                    "response": ai_response,
                    "suggestions": suggestions,
                    "model": "claude-sonnet",
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                print(f"[BrainBridge] Anthropic API error: {e}")
                return {
                    "response": f"I apologize, I'm having trouble connecting to my AI backend. Error: {str(e)}",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
        else:
            # Fallback response if Anthropic not available
            return {
                "response": "I'm currently in limited mode. The AI backend is not available. Please check that the ANTHROPIC_API_KEY is configured.",
                "limited_mode": True,
                "suggestions": suggestions,
                "timestamp": datetime.now().isoformat()
            }

    # ===============================================================================
    # STARTUP & SHUTDOWN
    # ===============================================================================

    @app.on_event("startup")
    async def startup_event():
        """Initialize brain components on startup."""
        global confidence_scorer, timing_intelligence, style_learner, predictive_engine, proactive_task

        print("[BrainBridge] Starting Brain Bridge...")

        if BRAIN_AVAILABLE:
            try:
                confidence_scorer = get_confidence_scorer()
                timing_intelligence = get_timing_intelligence()
                style_learner = get_style_learner()
                print("[BrainBridge] Brain components initialized")
            except Exception as e:
                print(f"[BrainBridge] Error initializing brain components: {e}")

        if PREDICTIVE_AVAILABLE:
            try:
                predictive_engine = PredictiveIntentEngine()
                print("[BrainBridge] Predictive engine initialized")
            except Exception as e:
                print(f"[BrainBridge] Error initializing predictive engine: {e}")

        # Start proactive loop
        proactive_task = asyncio.create_task(proactive_loop())
        print("[BrainBridge] Proactive loop started")

        print("[BrainBridge] Brain Bridge ready!")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown."""
        global proactive_task

        if proactive_task:
            proactive_task.cancel()
            try:
                await proactive_task
            except asyncio.CancelledError:
                pass

        print("[BrainBridge] Brain Bridge shutdown complete")

# ===============================================================================
# MAIN
# ===============================================================================

def main():
    parser = argparse.ArgumentParser(description="TinyPM Brain Bridge Server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Server port")
    # SECURITY FIX 2026-02-28: Default to localhost (was 0.0.0.0)
    parser.add_argument("--host", default="127.0.0.1", help="Server host")
    parser.add_argument("--health", action="store_true", help="Check health and exit")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()

    if args.health:
        # Quick health check
        print("Brain Bridge Health Check")
        print("=" * 40)
        print(f"FastAPI available: {FASTAPI_AVAILABLE}")
        print(f"PMBrain available: {BRAIN_AVAILABLE}")
        print(f"PredictiveIntent available: {PREDICTIVE_AVAILABLE}")

        if BRAIN_AVAILABLE:
            try:
                memory = load_memory()
                print(f"Memory facts: {len(memory.get('facts', {}))}")
                print(f"Memory context items: {len(memory.get('context', []))}")
            except Exception as e:
                print(f"Memory error: {e}")

        sys.exit(0)

    if not FASTAPI_AVAILABLE:
        print("ERROR: FastAPI not available. Install with:")
        print("  pip install fastapi uvicorn sse-starlette")
        sys.exit(1)

    print(f"""
===============================================================================
     TINYPM BRAIN BRIDGE - Intelligence Layer for Chief of Staff
===============================================================================

  Server:     http://{args.host}:{args.port}
  Health:     http://localhost:{args.port}/api/health
  SSE:        http://localhost:{args.port}/api/events
  WebSocket:  ws://localhost:{args.port}/ws

  Components:
    - PMBrain:          {"ENABLED" if BRAIN_AVAILABLE else "DISABLED"}
    - Predictive:       {"ENABLED" if PREDICTIVE_AVAILABLE else "DISABLED"}

  Press Ctrl+C to stop
===============================================================================
""")

    uvicorn.run(
        "brain_bridge:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )

if __name__ == "__main__":
    main()
