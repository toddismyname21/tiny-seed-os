"""
TinyPM Project Manager
======================

File-based discrete projects that users can create, use, and delete.
Each project is self-contained and can be stored locally or in the cloud.

Examples:
- Dinner Log: Log every dinner with photos and notes
- Wine Journal: Photograph labels, log tasting notes, remember favorites
- Book Tracker: Track books read with ratings and notes

Projects are SEPARATE from the Life Organizer - they can be deleted
without affecting your core life management.
"""

import os
import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field
from enum import Enum
import base64

# Try to import cloud storage (optional)
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


class StorageType(Enum):
    LOCAL = "local"
    CLOUD = "cloud"


class ProjectType(Enum):
    """Built-in project types with pre-defined schemas"""
    DINNER_LOG = "dinner_log"
    WINE_JOURNAL = "wine_journal"
    BOOK_TRACKER = "book_tracker"
    FITNESS_LOG = "fitness_log"
    TRAVEL_JOURNAL = "travel_journal"
    GRATITUDE_LOG = "gratitude_log"
    RECIPE_BOOK = "recipe_book"
    CUSTOM = "custom"


# Pre-defined schemas for common project types
PROJECT_SCHEMAS = {
    ProjectType.DINNER_LOG: {
        "entry_type": "dinner",
        "fields": {
            "date": {"type": "date", "required": True},
            "meal": {"type": "text", "required": True},
            "restaurant": {"type": "text", "required": False},
            "photo": {"type": "image", "required": False},
            "notes": {"type": "text", "required": False},
            "rating": {"type": "rating", "min": 1, "max": 5, "required": False},
            "companions": {"type": "list", "required": False},
            "cost": {"type": "number", "required": False}
        },
        "icon": "🍽️",
        "color": "#FF6B6B"
    },
    ProjectType.WINE_JOURNAL: {
        "entry_type": "wine",
        "fields": {
            "date": {"type": "date", "required": True},
            "name": {"type": "text", "required": True},
            "type": {"type": "select", "options": ["Red", "White", "Rosé", "Sparkling", "Dessert", "Fortified"], "required": True},
            "region": {"type": "text", "required": False},
            "vintage": {"type": "number", "required": False},
            "label_photo": {"type": "image", "required": False},
            "tasting_notes": {"type": "text", "required": False},
            "rating": {"type": "rating", "min": 1, "max": 5, "required": False},
            "price": {"type": "number", "required": False},
            "occasion": {"type": "text", "required": False},
            "would_buy_again": {"type": "boolean", "required": False}
        },
        "icon": "🍷",
        "color": "#722F37"
    },
    ProjectType.BOOK_TRACKER: {
        "entry_type": "book",
        "fields": {
            "title": {"type": "text", "required": True},
            "author": {"type": "text", "required": True},
            "date_started": {"type": "date", "required": False},
            "date_finished": {"type": "date", "required": False},
            "status": {"type": "select", "options": ["Want to Read", "Reading", "Finished", "Abandoned"], "required": True},
            "cover_photo": {"type": "image", "required": False},
            "notes": {"type": "text", "required": False},
            "rating": {"type": "rating", "min": 1, "max": 5, "required": False},
            "favorite_quotes": {"type": "list", "required": False},
            "genre": {"type": "text", "required": False}
        },
        "icon": "📚",
        "color": "#4A90A4"
    },
    ProjectType.FITNESS_LOG: {
        "entry_type": "workout",
        "fields": {
            "date": {"type": "date", "required": True},
            "type": {"type": "select", "options": ["Run", "Walk", "Gym", "Yoga", "Bike", "Swim", "HIIT", "Other"], "required": True},
            "duration_minutes": {"type": "number", "required": True},
            "distance": {"type": "number", "required": False},
            "calories": {"type": "number", "required": False},
            "notes": {"type": "text", "required": False},
            "how_felt": {"type": "select", "options": ["Great", "Good", "Okay", "Tired", "Struggled"], "required": False},
            "photo": {"type": "image", "required": False}
        },
        "icon": "💪",
        "color": "#4CAF50"
    },
    ProjectType.GRATITUDE_LOG: {
        "entry_type": "gratitude",
        "fields": {
            "date": {"type": "date", "required": True},
            "grateful_for": {"type": "list", "required": True, "min_items": 1, "max_items": 5},
            "highlight": {"type": "text", "required": False},
            "photo": {"type": "image", "required": False},
            "mood": {"type": "select", "options": ["Amazing", "Happy", "Content", "Neutral", "Struggling"], "required": False}
        },
        "icon": "🙏",
        "color": "#FFD700"
    }
}


@dataclass
class ProjectEntry:
    """A single entry in a project"""
    id: str
    created_at: str
    updated_at: str
    data: Dict[str, Any]
    photos: List[str] = field(default_factory=list)  # Paths to photo files

    @classmethod
    def create(cls, data: Dict[str, Any], photos: List[str] = None) -> 'ProjectEntry':
        now = datetime.now().isoformat()
        return cls(
            id=str(uuid.uuid4())[:8],
            created_at=now,
            updated_at=now,
            data=data,
            photos=photos or []
        )


@dataclass
class Project:
    """A discrete project that can be created, used, and deleted"""
    id: str
    name: str
    project_type: str
    icon: str
    color: str
    storage_type: str
    storage_path: str
    schema: Dict[str, Any]
    created_at: str
    updated_at: str
    entry_count: int = 0
    last_entry_at: Optional[str] = None
    cloud_bucket: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Project':
        return cls(**data)


class ProjectManager:
    """
    Manages discrete file-based projects.

    Each project is a self-contained folder with:
    - project.json: Project metadata and schema
    - entries/: Individual entries as JSON files
    - photos/: Associated photos

    Projects can be stored locally or in the cloud.
    """

    def __init__(
        self,
        base_path: str = None,
        supabase_url: str = None,
        supabase_key: str = None
    ):
        self.base_path = Path(base_path or os.path.expanduser("~/TinyPM/projects"))
        self.base_path.mkdir(parents=True, exist_ok=True)

        # Cloud storage setup
        self.supabase: Optional[Client] = None
        if supabase_url and supabase_key and SUPABASE_AVAILABLE:
            self.supabase = create_client(supabase_url, supabase_key)

    # ========== Project CRUD ==========

    def create_project(
        self,
        name: str,
        project_type: ProjectType = ProjectType.CUSTOM,
        storage_type: StorageType = StorageType.LOCAL,
        custom_schema: Dict[str, Any] = None,
        icon: str = "📁",
        color: str = "#6366F1"
    ) -> Project:
        """Create a new project"""

        project_id = f"{name.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Get schema from templates or use custom
        if project_type != ProjectType.CUSTOM and project_type in PROJECT_SCHEMAS:
            schema = PROJECT_SCHEMAS[project_type]
            icon = schema.get("icon", icon)
            color = schema.get("color", color)
        else:
            schema = custom_schema or {"entry_type": "custom", "fields": {}}

        # Determine storage path
        if storage_type == StorageType.LOCAL:
            storage_path = str(self.base_path / project_id)
        else:
            storage_path = f"projects/{project_id}"

        now = datetime.now().isoformat()

        project = Project(
            id=project_id,
            name=name,
            project_type=project_type.value if isinstance(project_type, ProjectType) else project_type,
            icon=icon,
            color=color,
            storage_type=storage_type.value if isinstance(storage_type, StorageType) else storage_type,
            storage_path=storage_path,
            schema=schema,
            created_at=now,
            updated_at=now,
            entry_count=0,
            last_entry_at=None,
            cloud_bucket="tinypm-projects" if storage_type == StorageType.CLOUD else None
        )

        # Create project structure
        if storage_type == StorageType.LOCAL:
            self._create_local_project_structure(project)
        else:
            self._create_cloud_project_structure(project)

        return project

    def _create_local_project_structure(self, project: Project) -> None:
        """Create local folder structure for project"""
        project_path = Path(project.storage_path)
        project_path.mkdir(parents=True, exist_ok=True)
        (project_path / "entries").mkdir(exist_ok=True)
        (project_path / "photos").mkdir(exist_ok=True)

        # Write project.json
        with open(project_path / "project.json", "w") as f:
            json.dump(project.to_dict(), f, indent=2)

    def _create_cloud_project_structure(self, project: Project) -> None:
        """Create cloud storage structure for project"""
        if not self.supabase:
            raise RuntimeError("Supabase not configured for cloud storage")

        # Store project metadata
        self.supabase.table("pm_projects").insert(project.to_dict()).execute()

    def list_projects(self) -> List[Project]:
        """List all projects"""
        projects = []

        # Local projects
        if self.base_path.exists():
            for project_dir in self.base_path.iterdir():
                if project_dir.is_dir():
                    project_file = project_dir / "project.json"
                    if project_file.exists():
                        with open(project_file) as f:
                            projects.append(Project.from_dict(json.load(f)))

        # Cloud projects
        if self.supabase:
            result = self.supabase.table("pm_projects").select("*").execute()
            for row in result.data:
                projects.append(Project.from_dict(row))

        return sorted(projects, key=lambda p: p.updated_at, reverse=True)

    def get_project(self, project_id: str) -> Optional[Project]:
        """Get a project by ID"""
        # Check local
        local_path = self.base_path / project_id / "project.json"
        if local_path.exists():
            with open(local_path) as f:
                return Project.from_dict(json.load(f))

        # Check cloud
        if self.supabase:
            result = self.supabase.table("pm_projects").select("*").eq("id", project_id).execute()
            if result.data:
                return Project.from_dict(result.data[0])

        return None

    def delete_project(self, project_id: str, confirm: bool = False) -> bool:
        """
        Delete a project and all its data.

        This is PERMANENT. The Life Organizer continues unaffected.
        """
        if not confirm:
            raise ValueError("Must confirm deletion by passing confirm=True")

        project = self.get_project(project_id)
        if not project:
            return False

        if project.storage_type == "local":
            # Delete local folder
            project_path = Path(project.storage_path)
            if project_path.exists():
                shutil.rmtree(project_path)
                return True
        else:
            # Delete from cloud
            if self.supabase:
                # Delete entries
                self.supabase.table("pm_project_entries").delete().eq("project_id", project_id).execute()
                # Delete project
                self.supabase.table("pm_projects").delete().eq("id", project_id).execute()
                return True

        return False

    # ========== Entry CRUD ==========

    def add_entry(
        self,
        project_id: str,
        data: Dict[str, Any],
        photos: List[bytes] = None,
        photo_filenames: List[str] = None
    ) -> ProjectEntry:
        """Add an entry to a project"""

        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        # Create entry
        entry = ProjectEntry.create(data)

        # Handle photos
        if photos and photo_filenames:
            for photo_data, filename in zip(photos, photo_filenames):
                photo_path = self._save_photo(project, entry.id, photo_data, filename)
                entry.photos.append(photo_path)

        # Save entry
        if project.storage_type == "local":
            self._save_local_entry(project, entry)
        else:
            self._save_cloud_entry(project, entry)

        # Update project stats
        project.entry_count += 1
        project.last_entry_at = entry.created_at
        project.updated_at = datetime.now().isoformat()
        self._update_project_metadata(project)

        return entry

    def _save_photo(
        self,
        project: Project,
        entry_id: str,
        photo_data: bytes,
        filename: str
    ) -> str:
        """Save a photo and return the path"""

        # Generate unique filename
        ext = Path(filename).suffix or ".jpg"
        photo_filename = f"{entry_id}_{datetime.now().strftime('%H%M%S')}{ext}"

        if project.storage_type == "local":
            photo_path = Path(project.storage_path) / "photos" / photo_filename
            with open(photo_path, "wb") as f:
                f.write(photo_data)
            return str(photo_path)
        else:
            # Upload to cloud
            if self.supabase:
                storage_path = f"{project.storage_path}/photos/{photo_filename}"
                self.supabase.storage.from_("tinypm-projects").upload(storage_path, photo_data)
                return storage_path

        return ""

    def _save_local_entry(self, project: Project, entry: ProjectEntry) -> None:
        """Save entry to local filesystem"""
        entries_path = Path(project.storage_path) / "entries"
        entry_file = entries_path / f"{entry.id}.json"

        with open(entry_file, "w") as f:
            json.dump(asdict(entry), f, indent=2)

    def _save_cloud_entry(self, project: Project, entry: ProjectEntry) -> None:
        """Save entry to cloud storage"""
        if self.supabase:
            entry_data = asdict(entry)
            entry_data["project_id"] = project.id
            self.supabase.table("pm_project_entries").insert(entry_data).execute()

    def _update_project_metadata(self, project: Project) -> None:
        """Update project metadata after changes"""
        if project.storage_type == "local":
            project_file = Path(project.storage_path) / "project.json"
            with open(project_file, "w") as f:
                json.dump(project.to_dict(), f, indent=2)
        else:
            if self.supabase:
                self.supabase.table("pm_projects").update(
                    project.to_dict()
                ).eq("id", project.id).execute()

    def get_entries(
        self,
        project_id: str,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_desc: bool = True
    ) -> List[ProjectEntry]:
        """Get entries from a project"""

        project = self.get_project(project_id)
        if not project:
            return []

        entries = []

        if project.storage_type == "local":
            entries_path = Path(project.storage_path) / "entries"
            if entries_path.exists():
                for entry_file in entries_path.glob("*.json"):
                    with open(entry_file) as f:
                        entries.append(ProjectEntry(**json.load(f)))
        else:
            if self.supabase:
                query = self.supabase.table("pm_project_entries").select("*").eq("project_id", project_id)
                if sort_desc:
                    query = query.order(sort_by, desc=True)
                else:
                    query = query.order(sort_by)
                query = query.range(offset, offset + limit - 1)
                result = query.execute()
                entries = [ProjectEntry(**row) for row in result.data]

        # Sort locally for local storage
        if project.storage_type == "local":
            entries.sort(key=lambda e: getattr(e, sort_by, e.created_at), reverse=sort_desc)
            entries = entries[offset:offset + limit]

        return entries

    def search_entries(
        self,
        project_id: str,
        query: str,
        fields: List[str] = None
    ) -> List[ProjectEntry]:
        """Search entries in a project"""

        entries = self.get_entries(project_id, limit=1000)
        query_lower = query.lower()

        results = []
        for entry in entries:
            # Search all text fields in data
            for key, value in entry.data.items():
                if fields and key not in fields:
                    continue
                if isinstance(value, str) and query_lower in value.lower():
                    results.append(entry)
                    break
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, str) and query_lower in item.lower():
                            results.append(entry)
                            break

        return results

    # ========== Quick Actions ==========

    def quick_log(
        self,
        project_id: str,
        text: str,
        photo: bytes = None,
        photo_filename: str = None
    ) -> ProjectEntry:
        """
        Quick logging - AI parses natural language into structured entry.

        Example: "Had amazing pasta at Olive Garden with Sarah, would definitely go back"
        -> Parsed into: meal=pasta, restaurant=Olive Garden, companions=[Sarah], rating=5
        """
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        # For now, store as raw text - AI parsing can be added
        data = {
            "raw_input": text,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "parsed": False  # Flag for later AI processing
        }

        photos = [photo] if photo else None
        filenames = [photo_filename] if photo_filename else None

        return self.add_entry(project_id, data, photos, filenames)

    def get_favorites(self, project_id: str, min_rating: int = 4) -> List[ProjectEntry]:
        """Get highest rated entries from a project"""
        entries = self.get_entries(project_id, limit=1000)

        favorites = [
            e for e in entries
            if e.data.get("rating", 0) >= min_rating
        ]

        return sorted(favorites, key=lambda e: e.data.get("rating", 0), reverse=True)

    def get_stats(self, project_id: str) -> Dict[str, Any]:
        """Get statistics for a project"""
        project = self.get_project(project_id)
        if not project:
            return {}

        entries = self.get_entries(project_id, limit=10000)

        ratings = [e.data.get("rating") for e in entries if e.data.get("rating")]

        return {
            "total_entries": len(entries),
            "average_rating": sum(ratings) / len(ratings) if ratings else None,
            "highest_rated_count": len([r for r in ratings if r == 5]),
            "with_photos": len([e for e in entries if e.photos]),
            "first_entry": min(e.created_at for e in entries) if entries else None,
            "last_entry": max(e.created_at for e in entries) if entries else None
        }


# ========== CLI Interface ==========

def main():
    import argparse
    import sys

    # Create main parser
    parser = argparse.ArgumentParser(
        description="TinyPM Project Manager - Discrete file-based projects",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  list                          List all projects
  create <name> [type]          Create a new project
  delete <project_id>           Delete a project
  log <project_id> <text>       Quick log an entry
  entries <project_id>          View project entries
  stats <project_id>            View project statistics

Project Types:
  dinner_log      - Track meals with photos and notes
  wine_journal    - Photograph labels, log tasting notes
  book_tracker    - Track books with ratings and notes
  fitness_log     - Log workouts and track progress
  gratitude_log   - Daily gratitude entries
  custom          - Create your own schema

Examples:
  python project_manager.py list
  python project_manager.py create "My Wine Journal" wine_journal
  python project_manager.py log wine_journal_20260131 "Amazing Cabernet from Napa"
  python project_manager.py entries wine_journal_20260131
  python project_manager.py stats wine_journal_20260131
"""
    )

    # Add subcommand argument
    parser.add_argument("command", nargs="?", default=None,
                       help="Command to run (list, create, delete, log, entries, stats)")
    parser.add_argument("args", nargs="*", help="Command arguments")

    # Handle --help explicitly
    if len(sys.argv) == 1 or (len(sys.argv) == 2 and sys.argv[1] in ["-h", "--help"]):
        parser.print_help()
        return

    args = parser.parse_args()

    pm = ProjectManager()
    command = args.command
    cmd_args = args.args

    if command == "list":
        projects = pm.list_projects()
        if not projects:
            print("No projects yet. Create one with: python project_manager.py create 'My Project'")
        else:
            print(f"\n{'ID':<40} {'Name':<20} {'Type':<15} {'Entries':<8}")
            print("-" * 90)
            for p in projects:
                print(f"{p.icon} {p.id:<38} {p.name:<20} {p.project_type:<15} {p.entry_count:<8}")

    elif command == "create":
        if len(cmd_args) < 1:
            print("Usage: python project_manager.py create <name> [type]")
            print("\nTypes: dinner_log, wine_journal, book_tracker, fitness_log, gratitude_log, custom")
            return

        name = cmd_args[0]
        ptype = cmd_args[1] if len(cmd_args) > 1 else "custom"

        try:
            project_type = ProjectType(ptype)
        except ValueError:
            project_type = ProjectType.CUSTOM

        project = pm.create_project(name, project_type)
        print(f"\nCreated project: {project.icon} {project.name}")
        print(f"   ID: {project.id}")
        print(f"   Path: {project.storage_path}")

    elif command == "delete":
        if len(cmd_args) < 1:
            print("Usage: python project_manager.py delete <project_id>")
            return

        project_id = cmd_args[0]
        project = pm.get_project(project_id)

        if not project:
            print(f"Project not found: {project_id}")
            return

        confirm = input(f"Delete '{project.name}' and all {project.entry_count} entries? (yes/no): ")
        if confirm.lower() == "yes":
            pm.delete_project(project_id, confirm=True)
            print(f"Deleted project: {project.name}")
        else:
            print("Cancelled")

    elif command == "log":
        if len(cmd_args) < 2:
            print("Usage: python project_manager.py log <project_id> <text>")
            return

        project_id = cmd_args[0]
        text = " ".join(cmd_args[1:])

        entry = pm.quick_log(project_id, text)
        print(f"Logged entry: {entry.id}")

    elif command == "entries":
        if len(cmd_args) < 1:
            print("Usage: python project_manager.py entries <project_id>")
            return

        project_id = cmd_args[0]
        entries = pm.get_entries(project_id, limit=20)

        if not entries:
            print("No entries yet")
        else:
            for e in entries:
                date = e.data.get("date", e.created_at[:10])
                text = e.data.get("raw_input") or e.data.get("meal") or e.data.get("name") or e.data.get("title") or str(e.data)[:50]
                rating = e.data.get("rating", "")
                stars = "*" * rating if rating else ""
                print(f"  [{date}] {text} {stars}")

    elif command == "stats":
        if len(cmd_args) < 1:
            print("Usage: python project_manager.py stats <project_id>")
            return

        project_id = cmd_args[0]
        stats = pm.get_stats(project_id)

        print(f"\nProject Statistics")
        print("-" * 30)
        for key, value in stats.items():
            print(f"  {key}: {value}")

    else:
        print(f"Unknown command: {command}")
        print("Run 'python project_manager.py --help' for usage.")


if __name__ == "__main__":
    main()
