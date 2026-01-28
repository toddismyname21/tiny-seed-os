#!/usr/bin/env python3
"""
TinyPM - Terminal Project Manager for Tiny Seed Farm OS
═══════════════════════════════════════════════════════
A TUI dashboard that manages tasks and launches Claude Code
with persona-injected system prompts.

Usage:
    python3 app.py
    # or with alias: pm

Keys:
    n       - New task
    e       - Edit selected task
    Enter   - Launch agent for selected task
    d       - Mark done / toggle status
    x       - Delete task
    /       - Filter tasks
    q       - Quit
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical, VerticalScroll
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.screen import ModalScreen
from textual.widgets import (
    Button,
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    Markdown,
    Select,
    Static,
    TextArea,
)

# ═══════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════
APP_DIR = Path(__file__).parent
BOARD_FILE = APP_DIR / "board.json"
PERSONAS_DIR = APP_DIR / "personas"
PROJECT_ROOT = APP_DIR.parent  # Tiny_Seed_OS root


# ═══════════════════════════════════════════════════════════════
# DATA LAYER
# ═══════════════════════════════════════════════════════════════
def load_board() -> dict:
    """Load the board from JSON file."""
    if BOARD_FILE.exists():
        with open(BOARD_FILE, "r") as f:
            return json.load(f)
    return {"version": "1.0", "project": "Tiny Seed Farm OS", "tasks": [], "next_id": 1}


def save_board(board: dict):
    """Save the board to JSON file."""
    with open(BOARD_FILE, "w") as f:
        json.dump(board, f, indent=2)


def load_persona(role: str) -> str:
    """Load a persona prompt from the personas folder."""
    persona_file = PERSONAS_DIR / f"{role}.md"
    if persona_file.exists():
        return persona_file.read_text()
    return f"You are the {role.title()} for Tiny Seed Farm OS."


def get_available_personas() -> list[tuple[str, str]]:
    """Get list of available persona names."""
    personas = []
    if PERSONAS_DIR.exists():
        for f in sorted(PERSONAS_DIR.glob("*.md")):
            personas.append((f.stem, f.stem.replace("-", " ").title()))
    if not personas:
        personas = [("builder", "Builder"), ("architect", "Architect"), ("qa", "QA")]
    return personas


def get_status_icon(status: str) -> str:
    """Get status indicator character."""
    return {"pending": "○", "in_progress": "◉", "done": "✓"}.get(status, "○")


def get_priority_color(priority: str) -> str:
    """Get CSS class for priority."""
    return {"high": "red", "medium": "yellow", "low": "green"}.get(priority, "white")


# ═══════════════════════════════════════════════════════════════
# NEW TASK SCREEN
# ═══════════════════════════════════════════════════════════════
class NewTaskScreen(ModalScreen[Optional[dict]]):
    """Modal for creating or editing a task."""

    CSS = """
    NewTaskScreen {
        align: center middle;
    }
    #new-task-dialog {
        width: 80;
        height: auto;
        max-height: 40;
        background: $surface;
        border: double $primary;
        padding: 1 2;
    }
    #new-task-dialog Label {
        margin-bottom: 0;
        color: $text-muted;
    }
    #new-task-dialog Input, #new-task-dialog TextArea {
        margin-bottom: 1;
    }
    #new-task-dialog Select {
        margin-bottom: 1;
    }
    .dialog-title {
        text-style: bold;
        color: $primary;
        margin-bottom: 1;
        text-align: center;
    }
    .dialog-buttons {
        margin-top: 1;
        align: center middle;
    }
    .dialog-buttons Button {
        margin: 0 1;
    }
    """

    def __init__(self, task: Optional[dict] = None):
        super().__init__()
        self.task = task  # None = new task, dict = editing

    def compose(self) -> ComposeResult:
        title = "Edit Task" if self.task else "New Task"
        personas = get_available_personas()

        with Vertical(id="new-task-dialog"):
            yield Label(f"═══ {title} ═══", classes="dialog-title")

            yield Label("Title:")
            yield Input(
                value=self.task["title"] if self.task else "",
                placeholder="What needs to be done?",
                id="task-title",
            )

            yield Label("Description:")
            yield TextArea(
                self.task.get("description", "") if self.task else "",
                id="task-desc",
            )

            yield Label("Role / Persona:")
            yield Select(
                [(name, key) for key, name in personas],
                value=self.task.get("role", "builder") if self.task else "builder",
                id="task-role",
            )

            yield Label("Priority:")
            yield Select(
                [("High", "high"), ("Medium", "medium"), ("Low", "low")],
                value=self.task.get("priority", "medium") if self.task else "medium",
                id="task-priority",
            )

            yield Label("Context files (comma-separated):")
            yield Input(
                value=", ".join(self.task.get("context", [])) if self.task else "",
                placeholder="web_app/file.html, apps_script/file.js",
                id="task-context",
            )

            with Horizontal(classes="dialog-buttons"):
                yield Button("Save", variant="primary", id="btn-save")
                yield Button("Cancel", variant="default", id="btn-cancel")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-save":
            title_input = self.query_one("#task-title", Input)
            desc_input = self.query_one("#task-desc", TextArea)
            role_select = self.query_one("#task-role", Select)
            priority_select = self.query_one("#task-priority", Select)
            context_input = self.query_one("#task-context", Input)

            title = title_input.value.strip()
            if not title:
                self.notify("Title is required", severity="error")
                return

            context_files = [
                c.strip()
                for c in context_input.value.split(",")
                if c.strip()
            ]

            result = {
                "title": title,
                "description": desc_input.text,
                "role": role_select.value if role_select.value != Select.BLANK else "builder",
                "priority": priority_select.value if priority_select.value != Select.BLANK else "medium",
                "context": context_files,
            }
            self.dismiss(result)
        else:
            self.dismiss(None)

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(None)


# ═══════════════════════════════════════════════════════════════
# LAUNCH CONFIRM SCREEN
# ═══════════════════════════════════════════════════════════════
class LaunchConfirmScreen(ModalScreen[bool]):
    """Confirm before launching Claude."""

    CSS = """
    LaunchConfirmScreen {
        align: center middle;
    }
    #launch-dialog {
        width: 70;
        height: auto;
        background: $surface;
        border: double $success;
        padding: 1 2;
    }
    .launch-title {
        text-style: bold;
        color: $success;
        text-align: center;
        margin-bottom: 1;
    }
    .launch-info {
        margin-bottom: 1;
        color: $text;
    }
    .launch-prompt-preview {
        background: $surface-darken-1;
        border: round $primary-background;
        padding: 1;
        margin-bottom: 1;
        max-height: 10;
        overflow-y: auto;
    }
    .launch-buttons {
        align: center middle;
        margin-top: 1;
    }
    .launch-buttons Button {
        margin: 0 1;
    }
    """

    def __init__(self, task: dict, persona_text: str):
        super().__init__()
        self.task = task
        self.persona_text = persona_text

    def compose(self) -> ComposeResult:
        with Vertical(id="launch-dialog"):
            yield Label("═══ LAUNCH AGENT ═══", classes="launch-title")
            yield Label(
                f"Task: {self.task['title']}\n"
                f"Role: {self.task.get('role', 'builder').upper()}\n"
                f"Priority: {self.task.get('priority', 'medium').upper()}",
                classes="launch-info",
            )
            yield Label("System prompt preview:", classes="launch-info")
            preview = self.persona_text[:500] + ("..." if len(self.persona_text) > 500 else "")
            yield Static(preview, classes="launch-prompt-preview")
            with Horizontal(classes="launch-buttons"):
                yield Button("🚀 Launch", variant="success", id="btn-launch")
                yield Button("Cancel", variant="default", id="btn-cancel-launch")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        self.dismiss(event.button.id == "btn-launch")

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(False)
        elif event.key == "enter":
            self.dismiss(True)


# ═══════════════════════════════════════════════════════════════
# MAIN APP
# ═══════════════════════════════════════════════════════════════
class TinyPM(App):
    """TinyPM - Terminal Project Manager."""

    TITLE = "TinyPM"
    SUB_TITLE = "Tiny Seed Farm OS"

    CSS = """
    Screen {
        background: $surface-darken-2;
    }

    /* ─── Three-panel layout ─── */
    #main-container {
        height: 1fr;
    }
    #panel-left {
        width: 40;
        border-right: solid $primary-background;
        background: $surface-darken-1;
    }
    #panel-right {
        width: 1fr;
    }
    #panel-detail {
        height: 2fr;
        border-bottom: solid $primary-background;
        padding: 1 2;
        background: $surface;
    }
    #panel-output {
        height: 1fr;
        padding: 1 2;
        background: $surface-darken-1;
    }

    /* ─── Queue panel ─── */
    .queue-header {
        dock: top;
        height: 3;
        background: $primary-darken-2;
        padding: 0 1;
        content-align: center middle;
        text-style: bold;
        color: $primary-lighten-2;
    }
    .queue-stats {
        dock: top;
        height: 1;
        padding: 0 1;
        color: $text-muted;
        background: $surface-darken-2;
    }
    #task-list {
        height: 1fr;
    }
    #task-list > ListItem {
        padding: 0 1;
        height: 3;
    }
    #task-list > ListItem.--highlight {
        background: $primary-darken-3;
    }
    .task-line {
        width: 1fr;
    }
    .task-status-pending {
        color: $text-muted;
    }
    .task-status-in_progress {
        color: $warning;
    }
    .task-status-done {
        color: $success;
    }
    .priority-high {
        color: $error;
    }
    .priority-medium {
        color: $warning;
    }
    .priority-low {
        color: $success;
    }

    /* ─── Detail panel ─── */
    .detail-title {
        text-style: bold;
        color: $primary;
        margin-bottom: 1;
    }
    .detail-meta {
        color: $text-muted;
        margin-bottom: 1;
    }
    .detail-desc {
        margin-top: 1;
    }
    .detail-context {
        margin-top: 1;
        color: $accent;
    }
    #detail-content {
        height: 1fr;
        overflow-y: auto;
    }

    /* ─── Output panel ─── */
    .output-header {
        text-style: bold;
        color: $success;
        margin-bottom: 1;
    }
    #output-log {
        height: 1fr;
        overflow-y: auto;
        color: $text-muted;
    }

    /* ─── Empty state ─── */
    .empty-state {
        color: $text-muted;
        text-align: center;
        margin-top: 3;
    }

    /* ─── Filter bar ─── */
    #filter-bar {
        dock: top;
        height: 3;
        padding: 0 1;
        background: $primary-darken-3;
        display: none;
    }
    #filter-bar.visible {
        display: block;
    }
    #filter-input {
        width: 1fr;
    }
    """

    BINDINGS = [
        Binding("n", "new_task", "New Task"),
        Binding("e", "edit_task", "Edit"),
        Binding("enter", "launch_agent", "Launch Agent"),
        Binding("d", "toggle_status", "Toggle Status"),
        Binding("x", "delete_task", "Delete"),
        Binding("slash", "filter", "Filter"),
        Binding("1", "filter_pending", "Pending"),
        Binding("2", "filter_progress", "In Progress"),
        Binding("3", "filter_done", "Done"),
        Binding("0", "filter_all", "All"),
        Binding("q", "quit", "Quit"),
    ]

    board: reactive[dict] = reactive(dict, recompose=False)
    selected_index: reactive[int] = reactive(0)
    filter_text: reactive[str] = reactive("")
    status_filter: reactive[str] = reactive("")  # "", "pending", "in_progress", "done"

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main-container"):
            # Left panel - Task Queue
            with Vertical(id="panel-left"):
                yield Static("  ═══ TASK QUEUE ═══  ", classes="queue-header")
                yield Static("", id="queue-stats", classes="queue-stats")
                with Container(id="filter-bar"):
                    yield Input(placeholder="Filter tasks...", id="filter-input")
                yield ListView(id="task-list")

            # Right panels
            with Vertical(id="panel-right"):
                # Detail panel
                with VerticalScroll(id="panel-detail"):
                    yield Static("Select a task to see details", id="detail-content", classes="empty-state")

                # Output panel
                with VerticalScroll(id="panel-output"):
                    yield Static("OUTPUT LOG", classes="output-header")
                    yield Static("Ready. Press [n] to create a task or select one and press [Enter] to launch.", id="output-log")

        yield Footer()

    def on_mount(self) -> None:
        """Load board on startup."""
        self.board = load_board()
        self.refresh_task_list()
        self.log_output("TinyPM started. Board loaded.")
        self.log_output(f"Project: {self.board.get('project', 'Unknown')}")
        self.log_output(f"Tasks: {len(self.board.get('tasks', []))}")
        self.log_output(f"Personas: {', '.join(k for k, _ in get_available_personas())}")
        self.log_output("─" * 40)

    # ═══════════════════════════════════════════════════════════
    # TASK LIST MANAGEMENT
    # ═══════════════════════════════════════════════════════════
    def get_filtered_tasks(self) -> list[dict]:
        """Get tasks matching current filters."""
        tasks = self.board.get("tasks", [])
        if self.status_filter:
            tasks = [t for t in tasks if t.get("status") == self.status_filter]
        if self.filter_text:
            ft = self.filter_text.lower()
            tasks = [
                t for t in tasks
                if ft in t.get("title", "").lower()
                or ft in t.get("description", "").lower()
                or ft in t.get("role", "").lower()
            ]
        return tasks

    def refresh_task_list(self) -> None:
        """Rebuild the task list UI."""
        list_view = self.query_one("#task-list", ListView)
        list_view.clear()

        tasks = self.get_filtered_tasks()
        all_tasks = self.board.get("tasks", [])

        # Update stats
        pending = sum(1 for t in all_tasks if t.get("status") == "pending")
        progress = sum(1 for t in all_tasks if t.get("status") == "in_progress")
        done = sum(1 for t in all_tasks if t.get("status") == "done")
        stats_label = self.query_one("#queue-stats", Static)
        filter_note = ""
        if self.status_filter:
            filter_note = f" [{self.status_filter}]"
        if self.filter_text:
            filter_note += f' "{self.filter_text}"'
        stats_label.update(
            f" ○ {pending}  ◉ {progress}  ✓ {done}  │ {len(tasks)} shown{filter_note}"
        )

        if not tasks:
            list_view.append(
                ListItem(
                    Static("  No tasks. Press [n] to create one.", classes="empty-state")
                )
            )
            return

        for task in tasks:
            icon = get_status_icon(task.get("status", "pending"))
            priority = task.get("priority", "medium")[0].upper()
            role = task.get("role", "?")[:8]
            title = task.get("title", "Untitled")
            if len(title) > 28:
                title = title[:27] + "…"

            line = f" {icon}  [{priority}] {title}  ({role})"
            status_class = f"task-status-{task.get('status', 'pending')}"
            item = ListItem(Static(line, classes=f"task-line {status_class}"))
            list_view.append(item)

        # Restore selection
        if tasks and self.selected_index >= len(tasks):
            self.selected_index = len(tasks) - 1
        if tasks and list_view.index is not None:
            try:
                list_view.index = min(self.selected_index, len(tasks) - 1)
            except Exception:
                pass

    def get_selected_task(self) -> Optional[dict]:
        """Get the currently selected task."""
        tasks = self.get_filtered_tasks()
        list_view = self.query_one("#task-list", ListView)
        idx = list_view.index
        if idx is not None and 0 <= idx < len(tasks):
            return tasks[idx]
        return None

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Update detail panel when task is selected."""
        self.selected_index = event.list_view.index or 0
        self.update_detail_panel()

    def on_list_view_highlighted(self, event: ListView.Highlighted) -> None:
        """Update detail panel on highlight change."""
        if event.list_view.index is not None:
            self.selected_index = event.list_view.index
            self.update_detail_panel()

    def update_detail_panel(self) -> None:
        """Update the detail panel with selected task info."""
        task = self.get_selected_task()
        detail = self.query_one("#detail-content", Static)

        if not task:
            detail.update("Select a task to see details")
            return

        icon = get_status_icon(task.get("status", "pending"))
        status = task.get("status", "pending").replace("_", " ").upper()
        priority = task.get("priority", "medium").upper()
        role = task.get("role", "builder").replace("-", " ").title()

        context_files = task.get("context", [])
        context_str = "\n".join(f"  • {c}" for c in context_files) if context_files else "  (none)"

        text = (
            f"═══════════════════════════════════════════\n"
            f"  {task.get('id', '???')}  │  {icon} {status}  │  {priority}\n"
            f"═══════════════════════════════════════════\n"
            f"\n"
            f"  TITLE\n"
            f"  {task.get('title', 'Untitled')}\n"
            f"\n"
            f"  ROLE: {role}\n"
            f"  CREATED: {task.get('created', '?')}\n"
            f"  UPDATED: {task.get('updated', '?')}\n"
            f"\n"
            f"  ─── DESCRIPTION ───\n"
            f"  {task.get('description', 'No description.')}\n"
            f"\n"
            f"  ─── CONTEXT FILES ───\n"
            f"{context_str}\n"
            f"\n"
            f"  ─── CONTROLS ───\n"
            f"  [Enter] Launch Agent  [d] Toggle Status\n"
            f"  [e] Edit  [x] Delete\n"
        )
        detail.update(text)

    # ═══════════════════════════════════════════════════════════
    # ACTIONS
    # ═══════════════════════════════════════════════════════════
    def action_new_task(self) -> None:
        """Create a new task."""
        def on_result(result: Optional[dict]) -> None:
            if result:
                task_id = self.board.get("next_id", 1)
                now = datetime.now().strftime("%Y-%m-%d")
                new_task = {
                    "id": f"TASK-{task_id:03d}",
                    "title": result["title"],
                    "description": result["description"],
                    "role": result["role"],
                    "priority": result["priority"],
                    "status": "pending",
                    "context": result["context"],
                    "created": now,
                    "updated": now,
                }
                self.board.setdefault("tasks", []).append(new_task)
                self.board["next_id"] = task_id + 1
                save_board(self.board)
                self.refresh_task_list()
                self.log_output(f"Created: {new_task['id']} - {new_task['title']}")
                self.notify(f"Task created: {new_task['title']}")

        self.push_screen(NewTaskScreen(), on_result)

    def action_edit_task(self) -> None:
        """Edit the selected task."""
        task = self.get_selected_task()
        if not task:
            self.notify("No task selected", severity="warning")
            return

        def on_result(result: Optional[dict]) -> None:
            if result:
                task["title"] = result["title"]
                task["description"] = result["description"]
                task["role"] = result["role"]
                task["priority"] = result["priority"]
                task["context"] = result["context"]
                task["updated"] = datetime.now().strftime("%Y-%m-%d")
                save_board(self.board)
                self.refresh_task_list()
                self.update_detail_panel()
                self.log_output(f"Updated: {task['id']} - {task['title']}")
                self.notify(f"Task updated: {task['title']}")

        self.push_screen(NewTaskScreen(task=task), on_result)

    def action_toggle_status(self) -> None:
        """Cycle task status: pending -> in_progress -> done -> pending."""
        task = self.get_selected_task()
        if not task:
            self.notify("No task selected", severity="warning")
            return

        cycle = {"pending": "in_progress", "in_progress": "done", "done": "pending"}
        old = task.get("status", "pending")
        task["status"] = cycle.get(old, "pending")
        task["updated"] = datetime.now().strftime("%Y-%m-%d")
        save_board(self.board)
        self.refresh_task_list()
        self.update_detail_panel()

        icon = get_status_icon(task["status"])
        self.log_output(f"{icon} {task['id']}: {old} → {task['status']}")
        self.notify(f"{task['title']}: {task['status'].replace('_', ' ')}")

    def action_delete_task(self) -> None:
        """Delete the selected task."""
        task = self.get_selected_task()
        if not task:
            self.notify("No task selected", severity="warning")
            return

        self.board["tasks"].remove(task)
        save_board(self.board)
        self.refresh_task_list()
        self.update_detail_panel()
        self.log_output(f"Deleted: {task['id']} - {task['title']}")
        self.notify(f"Deleted: {task['title']}", severity="warning")

    def action_launch_agent(self) -> None:
        """Launch Claude Code with the persona for the selected task."""
        task = self.get_selected_task()
        if not task:
            self.notify("No task selected", severity="warning")
            return

        role = task.get("role", "builder")
        persona_text = load_persona(role)

        def on_confirm(launch: bool) -> None:
            if launch:
                self._do_launch(task, persona_text)

        self.push_screen(LaunchConfirmScreen(task, persona_text), on_confirm)

    def _do_launch(self, task: dict, persona_text: str) -> None:
        """Actually launch Claude Code with the mega-prompt."""
        # Mark as in progress
        if task.get("status") == "pending":
            task["status"] = "in_progress"
            task["updated"] = datetime.now().strftime("%Y-%m-%d")
            save_board(self.board)

        # Build the mega-prompt
        context_files = task.get("context", [])
        context_section = ""
        if context_files:
            context_section = "\n## Key Files\n" + "\n".join(f"- {c}" for c in context_files)

        mega_prompt = (
            f"{persona_text}\n\n"
            f"## Current Task\n"
            f"**{task.get('id', '')}**: {task.get('title', '')}\n\n"
            f"**Priority**: {task.get('priority', 'medium').upper()}\n\n"
            f"**Description**:\n{task.get('description', 'No description.')}\n"
            f"{context_section}\n\n"
            f"## Project Root\n"
            f"{PROJECT_ROOT}\n\n"
            f"Begin working on this task now."
        )

        self.log_output(f"Launching {task.get('role', 'builder').upper()} agent...")
        self.log_output(f"Task: {task.get('title', '')}")
        self.log_output(f"Prompt: {len(mega_prompt)} chars")
        self.log_output("─" * 40)

        # Write prompt to temp file for claude to read
        prompt_file = APP_DIR / ".last-prompt.md"
        prompt_file.write_text(mega_prompt)

        # Try to find claude CLI
        claude_cmd = self._find_claude()

        if not claude_cmd:
            self.log_output("ERROR: Claude CLI not found!")
            self.log_output("Prompt saved to: .last-prompt.md")
            self.log_output("You can run manually:")
            self.log_output(f'  claude --system-prompt "$(cat {prompt_file})"')
            self.notify("Claude CLI not found. Prompt saved.", severity="error")
            return

        # Suspend TUI, launch Claude in the terminal
        self.log_output(f"Using: {claude_cmd}")

        # We need to suspend the TUI to give Claude the terminal
        with self.suspend():
            try:
                # Launch claude with system prompt
                cmd = [
                    claude_cmd,
                    "--system-prompt", mega_prompt,
                    "--cwd", str(PROJECT_ROOT),
                ]
                print(f"\n{'═' * 60}")
                print(f"  TinyPM → Launching {task.get('role', 'builder').upper()} Agent")
                print(f"  Task: {task.get('title', '')}")
                print(f"{'═' * 60}\n")

                result = subprocess.run(cmd)
                return_code = result.returncode

            except FileNotFoundError:
                print(f"\nERROR: Could not launch '{claude_cmd}'")
                print(f"Prompt saved to: {prompt_file}")
                input("\nPress Enter to return to TinyPM...")
                return_code = 1
            except KeyboardInterrupt:
                return_code = 0

            print(f"\n{'═' * 60}")
            print("  Agent session ended. Returning to TinyPM...")
            print(f"{'═' * 60}\n")

            # Ask about task status
            if task.get("status") != "done":
                response = input("  Mark task as done? [y/N]: ").strip().lower()
                if response == "y":
                    task["status"] = "done"
                    task["updated"] = datetime.now().strftime("%Y-%m-%d")
                    save_board(self.board)

        # Back in TUI
        self.refresh_task_list()
        self.update_detail_panel()
        if task.get("status") == "done":
            self.log_output(f"✓ {task['id']} marked DONE")
        else:
            self.log_output(f"◉ {task['id']} still in progress")

    def _find_claude(self) -> Optional[str]:
        """Find the claude CLI binary."""
        # Check common locations
        candidates = [
            "claude",
            os.path.expanduser("~/.claude/local/claude"),
            os.path.expanduser("~/.npm-global/bin/claude"),
            "/usr/local/bin/claude",
            "/opt/homebrew/bin/claude",
        ]

        # Also check if npx can find it
        for candidate in candidates:
            try:
                result = subprocess.run(
                    ["which", candidate] if "/" not in candidate else ["test", "-x", candidate],
                    capture_output=True, timeout=5
                )
                if result.returncode == 0:
                    return candidate
            except Exception:
                continue

        # Try npx as fallback
        try:
            result = subprocess.run(
                ["npx", "--yes", "@anthropic-ai/claude-code", "--version"],
                capture_output=True, timeout=30
            )
            if result.returncode == 0:
                return "npx @anthropic-ai/claude-code"
        except Exception:
            pass

        return None

    # ═══════════════════════════════════════════════════════════
    # FILTER ACTIONS
    # ═══════════════════════════════════════════════════════════
    def action_filter(self) -> None:
        """Toggle filter bar."""
        filter_bar = self.query_one("#filter-bar")
        if "visible" in filter_bar.classes:
            filter_bar.remove_class("visible")
            self.filter_text = ""
            self.refresh_task_list()
        else:
            filter_bar.add_class("visible")
            self.query_one("#filter-input", Input).focus()

    def on_input_changed(self, event: Input.Changed) -> None:
        """Filter tasks as user types."""
        if event.input.id == "filter-input":
            self.filter_text = event.value
            self.refresh_task_list()

    def action_filter_pending(self) -> None:
        self.status_filter = "pending" if self.status_filter != "pending" else ""
        self.refresh_task_list()

    def action_filter_progress(self) -> None:
        self.status_filter = "in_progress" if self.status_filter != "in_progress" else ""
        self.refresh_task_list()

    def action_filter_done(self) -> None:
        self.status_filter = "done" if self.status_filter != "done" else ""
        self.refresh_task_list()

    def action_filter_all(self) -> None:
        self.status_filter = ""
        self.filter_text = ""
        try:
            self.query_one("#filter-bar").remove_class("visible")
        except NoMatches:
            pass
        self.refresh_task_list()

    # ═══════════════════════════════════════════════════════════
    # OUTPUT LOG
    # ═══════════════════════════════════════════════════════════
    def log_output(self, message: str) -> None:
        """Append a message to the output log."""
        try:
            output = self.query_one("#output-log", Static)
            timestamp = datetime.now().strftime("%H:%M:%S")
            current = output.renderable
            if isinstance(current, str):
                lines = current.split("\n")
            else:
                lines = str(current).split("\n")
            lines.append(f"[{timestamp}] {message}")
            # Keep last 50 lines
            if len(lines) > 50:
                lines = lines[-50:]
            output.update("\n".join(lines))
        except NoMatches:
            pass


# ═══════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    app = TinyPM()
    app.run()
