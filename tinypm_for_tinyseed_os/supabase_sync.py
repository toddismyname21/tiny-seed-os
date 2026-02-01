"""
TinyPM Supabase Sync Layer
Provides persistent storage and real-time sync via Supabase.

Created: 2026-01-30
Author: Backend_Agent_7
Purpose: Local-first operation with cloud backup for TinyPM
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bznidonyuztfplqzkmks.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


class SupabaseSync:
    """
    Sync layer between local JSON files and Supabase.
    Maintains local-first operation with cloud backup.

    Design principles:
    - Local-first: Always works offline, syncs when connected
    - Graceful degradation: Falls back to local-only if no credentials
    - Upsert pattern: Prevents duplicates, handles conflicts
    """

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Supabase client if credentials available."""
        if not SUPABASE_ANON_KEY:
            print("[SupabaseSync] No SUPABASE_ANON_KEY - running in local-only mode")
            return
        try:
            from supabase import create_client
            self.client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            print("[SupabaseSync] Connected to Supabase")
        except ImportError:
            print("[SupabaseSync] supabase-py not installed. Run: pip install supabase")
        except Exception as e:
            print(f"[SupabaseSync] Connection error: {e}")

    def is_connected(self) -> bool:
        """Check if Supabase is connected."""
        return self.client is not None

    # === TASKS ===

    def sync_tasks(self, local_tasks: List[Dict]) -> bool:
        """
        Sync local tasks to Supabase.
        Uses upsert to handle create/update in single operation.

        Args:
            local_tasks: List of task dictionaries with 'id' field

        Returns:
            True if sync successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            for task in local_tasks:
                # Ensure task has updated_at timestamp
                task_data = {
                    **task,
                    "updated_at": datetime.now().isoformat()
                }
                self.client.table("tasks").upsert(task_data).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Task sync error: {e}")
            return False

    def fetch_tasks(self) -> Optional[List[Dict]]:
        """
        Fetch tasks from Supabase.

        Returns:
            List of task dictionaries, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("tasks").select("*").execute()
            return response.data
        except Exception as e:
            print(f"[SupabaseSync] Task fetch error: {e}")
            return None

    def fetch_tasks_by_status(self, status: str) -> Optional[List[Dict]]:
        """
        Fetch tasks with specific status.

        Args:
            status: One of 'pending', 'in_progress', 'done'

        Returns:
            List of matching tasks, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("tasks").select("*").eq("status", status).execute()
            return response.data
        except Exception as e:
            print(f"[SupabaseSync] Task fetch by status error: {e}")
            return None

    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task from Supabase.

        Args:
            task_id: The task's unique identifier

        Returns:
            True if deletion successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("tasks").delete().eq("id", task_id).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Task delete error: {e}")
            return False

    # === MEMORY ===

    def sync_memory(self, memory_data: Dict) -> bool:
        """
        Sync memory state to Supabase.
        Stores entire memory as JSON blob with key 'pm_memory'.

        Args:
            memory_data: The memory dictionary from pm_brain.py

        Returns:
            True if sync successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("memory").upsert({
                "id": "pm_memory",
                "data": json.dumps(memory_data),
                "updated_at": datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Memory sync error: {e}")
            return False

    def fetch_memory(self) -> Optional[Dict]:
        """
        Fetch memory from Supabase.

        Returns:
            Memory dictionary, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("memory").select("*").eq("id", "pm_memory").execute()
            if response.data:
                return json.loads(response.data[0]["data"])
            return None
        except Exception as e:
            print(f"[SupabaseSync] Memory fetch error: {e}")
            return None

    # === CONVERSATIONS ===

    def sync_conversation(self, conversation_id: str, messages: List[Dict]) -> bool:
        """
        Sync a conversation to Supabase.

        Args:
            conversation_id: Unique identifier for conversation
            messages: List of message dictionaries

        Returns:
            True if sync successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("conversations").upsert({
                "id": conversation_id,
                "messages": json.dumps(messages),
                "updated_at": datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Conversation sync error: {e}")
            return False

    def fetch_conversation(self, conversation_id: str) -> Optional[List[Dict]]:
        """
        Fetch a conversation from Supabase.

        Args:
            conversation_id: The conversation's unique identifier

        Returns:
            List of messages, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("conversations").select("*").eq("id", conversation_id).execute()
            if response.data:
                return json.loads(response.data[0]["messages"])
            return None
        except Exception as e:
            print(f"[SupabaseSync] Conversation fetch error: {e}")
            return None

    def list_conversations(self, limit: int = 50) -> Optional[List[Dict]]:
        """
        List recent conversations.

        Args:
            limit: Maximum number of conversations to return

        Returns:
            List of conversation metadata, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = (
                self.client.table("conversations")
                .select("id, created_at, updated_at")
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            print(f"[SupabaseSync] Conversation list error: {e}")
            return None

    # === CHECKPOINTS (for LangGraph) ===

    def save_checkpoint(self, checkpoint_id: str, state: Dict) -> bool:
        """
        Save a LangGraph checkpoint.
        Used for durable execution - can resume from this point on crash.

        Args:
            checkpoint_id: Unique identifier for checkpoint
            state: The LangGraph state to persist

        Returns:
            True if save successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("checkpoints").upsert({
                "id": checkpoint_id,
                "state": json.dumps(state),
                "created_at": datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Checkpoint save error: {e}")
            return False

    def load_checkpoint(self, checkpoint_id: str) -> Optional[Dict]:
        """
        Load a LangGraph checkpoint.

        Args:
            checkpoint_id: The checkpoint's unique identifier

        Returns:
            State dictionary, or None if not found
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("checkpoints").select("*").eq("id", checkpoint_id).execute()
            if response.data:
                return json.loads(response.data[0]["state"])
            return None
        except Exception as e:
            print(f"[SupabaseSync] Checkpoint load error: {e}")
            return None

    def list_checkpoints(self, limit: int = 10) -> Optional[List[Dict]]:
        """
        List recent checkpoints.

        Args:
            limit: Maximum number of checkpoints to return

        Returns:
            List of checkpoint metadata, or None if fetch failed
        """
        if not self.is_connected():
            return None
        try:
            response = (
                self.client.table("checkpoints")
                .select("id, created_at")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            print(f"[SupabaseSync] Checkpoint list error: {e}")
            return None

    def delete_old_checkpoints(self, keep_count: int = 10) -> bool:
        """
        Delete old checkpoints, keeping only the most recent ones.

        Args:
            keep_count: Number of checkpoints to keep

        Returns:
            True if cleanup successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            # Get all checkpoint IDs ordered by creation time
            response = (
                self.client.table("checkpoints")
                .select("id")
                .order("created_at", desc=True)
                .execute()
            )

            if response.data and len(response.data) > keep_count:
                # Delete all but the most recent
                ids_to_delete = [cp["id"] for cp in response.data[keep_count:]]
                for cp_id in ids_to_delete:
                    self.client.table("checkpoints").delete().eq("id", cp_id).execute()

            return True
        except Exception as e:
            print(f"[SupabaseSync] Checkpoint cleanup error: {e}")
            return False

    # === SUGGESTIONS ===

    def save_suggestion(self, suggestion_type: str, content: str,
                        confidence: float = None, action_level: str = None) -> bool:
        """
        Save a proactive suggestion for tracking.

        Args:
            suggestion_type: Category of suggestion (task, reminder, insight, etc.)
            content: The suggestion text
            confidence: Confidence score 0.0-1.0
            action_level: auto, approve, clarify, collaborate, caveat

        Returns:
            True if save successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("suggestions").insert({
                "suggestion_type": suggestion_type,
                "content": content,
                "confidence": confidence,
                "action_level": action_level,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Suggestion save error: {e}")
            return False

    def resolve_suggestion(self, suggestion_id: int, accepted: bool) -> bool:
        """
        Mark a suggestion as resolved (accepted or rejected).

        Args:
            suggestion_id: The suggestion's ID
            accepted: Whether the user accepted the suggestion

        Returns:
            True if update successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            status = "accepted" if accepted else "rejected"
            self.client.table("suggestions").update({
                "status": status,
                "resolved_at": datetime.now().isoformat()
            }).eq("id", suggestion_id).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Suggestion resolve error: {e}")
            return False

    # === STYLE PROFILES ===

    def sync_style_profile(self, profile_id: str, profile: Dict, samples_analyzed: int) -> bool:
        """
        Sync a style profile to Supabase.

        Args:
            profile_id: Unique identifier for profile (e.g., 'user_default')
            profile: The style profile dictionary from StyleLearner
            samples_analyzed: Number of samples used to build profile

        Returns:
            True if sync successful, False otherwise
        """
        if not self.is_connected():
            return False
        try:
            self.client.table("style_profiles").upsert({
                "id": profile_id,
                "profile": json.dumps(profile),
                "samples_analyzed": samples_analyzed,
                "updated_at": datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"[SupabaseSync] Style profile sync error: {e}")
            return False

    def fetch_style_profile(self, profile_id: str) -> Optional[Dict]:
        """
        Fetch a style profile from Supabase.

        Args:
            profile_id: The profile's unique identifier

        Returns:
            Style profile dictionary, or None if not found
        """
        if not self.is_connected():
            return None
        try:
            response = self.client.table("style_profiles").select("*").eq("id", profile_id).execute()
            if response.data:
                return {
                    "profile": json.loads(response.data[0]["profile"]),
                    "samples_analyzed": response.data[0]["samples_analyzed"],
                    "updated_at": response.data[0]["updated_at"]
                }
            return None
        except Exception as e:
            print(f"[SupabaseSync] Style profile fetch error: {e}")
            return None

    # === UTILITY METHODS ===

    def sync_all_local_data(self, tasks_file: str = "board.json",
                            memory_file: str = ".pm_memory.json",
                            chat_file: str = ".pm_chat.json") -> Dict[str, bool]:
        """
        Sync all local JSON files to Supabase.
        Convenience method for full backup.

        Args:
            tasks_file: Path to tasks JSON file
            memory_file: Path to memory JSON file
            chat_file: Path to chat history JSON file

        Returns:
            Dictionary of sync results by category
        """
        results = {
            "tasks": False,
            "memory": False,
            "conversations": False
        }

        base_path = Path(__file__).parent

        # Sync tasks
        tasks_path = base_path / tasks_file
        if tasks_path.exists():
            try:
                with open(tasks_path, 'r') as f:
                    data = json.load(f)
                    tasks = data.get("tasks", []) if isinstance(data, dict) else data
                    results["tasks"] = self.sync_tasks(tasks)
            except Exception as e:
                print(f"[SupabaseSync] Tasks file read error: {e}")

        # Sync memory
        memory_path = base_path / memory_file
        if memory_path.exists():
            try:
                with open(memory_path, 'r') as f:
                    memory_data = json.load(f)
                    results["memory"] = self.sync_memory(memory_data)
            except Exception as e:
                print(f"[SupabaseSync] Memory file read error: {e}")

        # Sync chat as conversation
        chat_path = base_path / chat_file
        if chat_path.exists():
            try:
                with open(chat_path, 'r') as f:
                    messages = json.load(f)
                    results["conversations"] = self.sync_conversation("pm_chat_main", messages)
            except Exception as e:
                print(f"[SupabaseSync] Chat file read error: {e}")

        return results

    def get_sync_status(self) -> Dict[str, Any]:
        """
        Get current sync status and statistics.

        Returns:
            Dictionary with connection status and table counts
        """
        status = {
            "connected": self.is_connected(),
            "supabase_url": SUPABASE_URL,
            "tables": {}
        }

        if not self.is_connected():
            return status

        try:
            # Count records in each table
            for table in ["tasks", "memory", "conversations", "checkpoints", "suggestions", "style_profiles"]:
                try:
                    response = self.client.table(table).select("id", count="exact").execute()
                    status["tables"][table] = response.count or 0
                except:
                    status["tables"][table] = "error"
        except Exception as e:
            status["error"] = str(e)

        return status


# Global instance
_supabase_sync = None


def get_supabase_sync() -> SupabaseSync:
    """
    Get or create global SupabaseSync instance.
    Use this function rather than creating instances directly.

    Returns:
        SupabaseSync singleton instance
    """
    global _supabase_sync
    if _supabase_sync is None:
        _supabase_sync = SupabaseSync()
    return _supabase_sync


# === CLI INTERFACE ===

if __name__ == "__main__":
    import sys

    sync = get_supabase_sync()

    if len(sys.argv) < 2:
        print("TinyPM Supabase Sync")
        print("=" * 40)
        status = sync.get_sync_status()
        print(f"Connected: {status['connected']}")
        print(f"URL: {status['supabase_url']}")
        if status['connected']:
            print("\nTable counts:")
            for table, count in status.get('tables', {}).items():
                print(f"  {table}: {count}")
        else:
            print("\nTo connect, set environment variables:")
            print("  export SUPABASE_ANON_KEY='your-key'")
        sys.exit(0)

    command = sys.argv[1]

    if command == "sync":
        print("Syncing all local data to Supabase...")
        results = sync.sync_all_local_data()
        for category, success in results.items():
            status_emoji = "OK" if success else "FAILED"
            print(f"  {category}: {status_emoji}")

    elif command == "status":
        status = sync.get_sync_status()
        print(json.dumps(status, indent=2))

    elif command == "fetch-tasks":
        tasks = sync.fetch_tasks()
        if tasks:
            print(json.dumps(tasks, indent=2))
        else:
            print("No tasks or not connected")

    else:
        print(f"Unknown command: {command}")
        print("Available commands: sync, status, fetch-tasks")
        sys.exit(1)
