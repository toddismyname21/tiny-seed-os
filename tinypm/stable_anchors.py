#!/usr/bin/env python3
"""
================================================================================
STABLE ANCHOR CITATION SYSTEM - Forensic RAG Infrastructure
================================================================================

Phase 1 of Project "Sovereign Seed" - Deterministic Infrastructure

Every AI citation MUST be cryptographically verifiable. This module provides:

1. STABLE ANCHORS
   - SHA-256 hash of source documents
   - Character-precise text spans
   - Verification chain for provenance

2. DOCUMENT REFERENCES
   - Support for leases, emails, notes, tasks, Google Sheets
   - Permission-aware access control
   - Modification tracking

3. VERIFICATION SYSTEM
   - <50ms verification per anchor
   - Bulk verification for efficiency
   - Stale/invalid anchor detection

4. GOVERNOR INTEGRATION
   - Zero hallucination tolerance: if anchor can't be verified, Governor ABSTAINS
   - Automatic invalidation on document change
   - Full audit trail

Core Principle: Every citation MUST be reproducible.
Given the hash, anyone can retrieve the exact text.

Sources:
- Forensic RAG research
- Seed Vault canonical rules (forensic category)
- Negotiation Protocol (citations required for proposals)

Created: 2026-02-04
Author: PM_Architect Claude
================================================================================
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
from uuid import uuid4

# ================================================================================
# CONFIGURATION
# ================================================================================

APP_DIR = Path(__file__).parent
ANCHORS_DB_FILE = APP_DIR / ".stable_anchors.db"
ANCHORS_JSON_FILE = APP_DIR / ".stable_anchors.json"  # Backup/fallback
DOCUMENT_CACHE_FILE = APP_DIR / ".document_cache.json"
ANCHOR_LOG_FILE = APP_DIR / ".stable_anchors.log"

# Performance targets
MAX_VERIFICATION_TIME_MS = 50  # Must verify in <50ms
BULK_BATCH_SIZE = 100
CACHE_TTL_SECONDS = 300  # 5 minute cache


# ================================================================================
# LOGGING
# ================================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [StableAnchors] [{level}] {msg}"
    print(line)
    try:
        with open(ANCHOR_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ================================================================================
# ENUMS
# ================================================================================

class SourceType(str, Enum):
    """Types of source documents."""
    LEASE = "lease"
    EMAIL = "email"
    NOTE = "note"
    TASK = "task"
    SHEET = "sheet"
    CALENDAR = "calendar"
    FILE = "file"
    CHAT = "chat"
    RESEARCH = "research"


class VerificationStatus(str, Enum):
    """Status of anchor verification."""
    VERIFIED = "verified"        # Hash matches, span valid
    STALE = "stale"             # Document changed, needs re-anchor
    INVALID = "invalid"          # Anchor doesn't match at all
    DOCUMENT_MISSING = "document_missing"  # Source document not found
    SPAN_MISMATCH = "span_mismatch"       # Text at offset doesn't match
    HASH_MISMATCH = "hash_mismatch"       # Document hash changed
    ERROR = "error"              # Verification failed due to error


class AnchorConfidence(str, Enum):
    """Confidence level for anchor extraction."""
    HIGH = "high"        # Direct extraction, exact match
    MEDIUM = "medium"    # Normalized extraction (whitespace, etc.)
    LOW = "low"          # Fuzzy match, potential issues


# ================================================================================
# DATA CLASSES
# ================================================================================

@dataclass
class DocumentReference:
    """Reference to a source document."""
    document_id: str
    document_hash: str  # SHA-256 of full document
    title: str
    source_type: str  # SourceType value
    last_modified: datetime
    permissions: List[str] = field(default_factory=list)  # Who can access
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "document_id": self.document_id,
            "document_hash": self.document_hash,
            "title": self.title,
            "source_type": self.source_type,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "permissions": self.permissions,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'DocumentReference':
        last_modified = data.get("last_modified")
        if isinstance(last_modified, str):
            last_modified = datetime.fromisoformat(last_modified)
        elif last_modified is None:
            last_modified = datetime.now()

        return cls(
            document_id=data["document_id"],
            document_hash=data["document_hash"],
            title=data["title"],
            source_type=data["source_type"],
            last_modified=last_modified,
            permissions=data.get("permissions", []),
            metadata=data.get("metadata", {})
        )


@dataclass
class TextAnchor:
    """Precise location within a document."""
    start_offset: int   # Character position start
    end_offset: int     # Character position end
    text_span: str      # The actual extracted text
    span_hash: str      # SHA-256 of just the span
    normalized_span: str = ""  # Whitespace-normalized version

    def __post_init__(self):
        if not self.span_hash:
            self.span_hash = hashlib.sha256(self.text_span.encode('utf-8')).hexdigest()
        if not self.normalized_span:
            self.normalized_span = ' '.join(self.text_span.split())

    def verify(self, full_text: str) -> Tuple[bool, VerificationStatus]:
        """
        Verify this anchor against the full document.

        Returns:
            Tuple of (is_valid, status)
        """
        try:
            # Check bounds
            if self.start_offset < 0 or self.end_offset > len(full_text):
                return False, VerificationStatus.SPAN_MISMATCH

            if self.start_offset >= self.end_offset:
                return False, VerificationStatus.SPAN_MISMATCH

            # Extract text at offset
            extracted = full_text[self.start_offset:self.end_offset]

            # Exact match
            if extracted == self.text_span:
                computed_hash = hashlib.sha256(extracted.encode('utf-8')).hexdigest()
                if computed_hash == self.span_hash:
                    return True, VerificationStatus.VERIFIED
                return False, VerificationStatus.HASH_MISMATCH

            # Check normalized match (whitespace differences)
            normalized_extracted = ' '.join(extracted.split())
            if normalized_extracted == self.normalized_span:
                return False, VerificationStatus.STALE  # Needs re-anchoring

            return False, VerificationStatus.SPAN_MISMATCH

        except Exception as e:
            log(f"Verification error: {e}", "ERROR")
            return False, VerificationStatus.ERROR

    def to_dict(self) -> Dict:
        return {
            "start_offset": self.start_offset,
            "end_offset": self.end_offset,
            "text_span": self.text_span,
            "span_hash": self.span_hash,
            "normalized_span": self.normalized_span
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'TextAnchor':
        return cls(
            start_offset=data["start_offset"],
            end_offset=data["end_offset"],
            text_span=data["text_span"],
            span_hash=data.get("span_hash", ""),
            normalized_span=data.get("normalized_span", "")
        )


@dataclass
class VerificationResult:
    """Result of verifying a stable anchor."""
    anchor_id: str
    is_valid: bool
    status: VerificationStatus
    verification_time_ms: float
    checked_at: datetime = field(default_factory=datetime.now)
    error_message: Optional[str] = None
    document_current_hash: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "anchor_id": self.anchor_id,
            "is_valid": self.is_valid,
            "status": self.status.value if isinstance(self.status, VerificationStatus) else self.status,
            "verification_time_ms": self.verification_time_ms,
            "checked_at": self.checked_at.isoformat(),
            "error_message": self.error_message,
            "document_current_hash": self.document_current_hash
        }


@dataclass
class StableAnchor:
    """
    Complete forensic citation.

    A StableAnchor represents a cryptographically verifiable citation
    to a specific location in a source document.
    """
    id: str
    document: DocumentReference
    anchor: TextAnchor
    created_at: datetime
    created_by: str  # Agent or user ID
    confidence: float  # Extraction confidence (0-1)
    context: str = ""  # Surrounding context for display
    is_valid: bool = True
    last_verified: Optional[datetime] = None
    verification_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())[:12]

    def to_citation_string(self) -> str:
        """Human-readable citation format."""
        return f"[{self.document.title}:{self.anchor.start_offset}-{self.anchor.end_offset}] ({self.anchor.span_hash[:8]}...)"

    def to_compact_citation(self) -> str:
        """Compact citation for inline display."""
        title_short = self.document.title[:20] + "..." if len(self.document.title) > 20 else self.document.title
        return f"[{title_short}] ({self.anchor.span_hash[:8]})"

    def verify_chain(self, document_store: 'DocumentStore') -> VerificationResult:
        """
        Full verification: document exists, hash matches, span valid.

        This is the core verification method that ensures:
        1. The document exists
        2. The document hash matches (unchanged since anchor created)
        3. The text span is still valid at the specified offset
        """
        start_time = time.time()

        try:
            # Step 1: Get document
            doc_text = document_store.get_document_text(self.document.document_id)
            if doc_text is None:
                return VerificationResult(
                    anchor_id=self.id,
                    is_valid=False,
                    status=VerificationStatus.DOCUMENT_MISSING,
                    verification_time_ms=(time.time() - start_time) * 1000,
                    error_message=f"Document {self.document.document_id} not found"
                )

            # Step 2: Check document hash
            current_hash = hashlib.sha256(doc_text.encode('utf-8')).hexdigest()
            if current_hash != self.document.document_hash:
                # Document changed - span might still be valid
                is_valid, span_status = self.anchor.verify(doc_text)
                status = span_status if not is_valid else VerificationStatus.STALE

                return VerificationResult(
                    anchor_id=self.id,
                    is_valid=False,
                    status=status,
                    verification_time_ms=(time.time() - start_time) * 1000,
                    document_current_hash=current_hash,
                    error_message="Document has changed since anchor was created"
                )

            # Step 3: Verify span
            is_valid, span_status = self.anchor.verify(doc_text)

            verification_time = (time.time() - start_time) * 1000

            return VerificationResult(
                anchor_id=self.id,
                is_valid=is_valid,
                status=span_status,
                verification_time_ms=verification_time,
                document_current_hash=current_hash
            )

        except Exception as e:
            return VerificationResult(
                anchor_id=self.id,
                is_valid=False,
                status=VerificationStatus.ERROR,
                verification_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "document": self.document.to_dict(),
            "anchor": self.anchor.to_dict(),
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "confidence": self.confidence,
            "context": self.context,
            "is_valid": self.is_valid,
            "last_verified": self.last_verified.isoformat() if self.last_verified else None,
            "verification_count": self.verification_count,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'StableAnchor':
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        else:
            created_at = datetime.now()

        last_verified = data.get("last_verified")
        if isinstance(last_verified, str):
            last_verified = datetime.fromisoformat(last_verified)

        return cls(
            id=data["id"],
            document=DocumentReference.from_dict(data["document"]),
            anchor=TextAnchor.from_dict(data["anchor"]),
            created_at=created_at,
            created_by=data["created_by"],
            confidence=data.get("confidence", 1.0),
            context=data.get("context", ""),
            is_valid=data.get("is_valid", True),
            last_verified=last_verified,
            verification_count=data.get("verification_count", 0),
            metadata=data.get("metadata", {})
        )


# ================================================================================
# DOCUMENT STORE - Abstract Interface
# ================================================================================

class DocumentStore:
    """
    Abstract interface for document storage.

    Implementations can be:
    - FileSystemDocumentStore (local files)
    - GoogleSheetsDocumentStore (Google Sheets API)
    - DatabaseDocumentStore (SQLite/PostgreSQL)
    - MockDocumentStore (testing)
    """

    def get_document(self, document_id: str) -> Optional[Dict]:
        """Get document metadata by ID."""
        raise NotImplementedError

    def get_document_text(self, document_id: str) -> Optional[str]:
        """Get full text content of document."""
        raise NotImplementedError

    def compute_hash(self, document_id: str) -> Optional[str]:
        """Compute SHA-256 hash of document content."""
        text = self.get_document_text(document_id)
        if text is None:
            return None
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    def document_exists(self, document_id: str) -> bool:
        """Check if document exists."""
        return self.get_document(document_id) is not None

    def list_documents(self, source_type: Optional[str] = None) -> List[Dict]:
        """List all documents, optionally filtered by type."""
        raise NotImplementedError


class InMemoryDocumentStore(DocumentStore):
    """
    In-memory document store for testing and simple use cases.
    """

    def __init__(self):
        self.documents: Dict[str, Dict] = {}
        self._lock = threading.RLock()

    def add_document(
        self,
        document_id: str,
        content: str,
        title: str,
        source_type: str,
        permissions: Optional[List[str]] = None,
        metadata: Optional[Dict] = None
    ) -> DocumentReference:
        """Add a document to the store."""
        with self._lock:
            doc_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            now = datetime.now()

            self.documents[document_id] = {
                "id": document_id,
                "content": content,
                "title": title,
                "source_type": source_type,
                "hash": doc_hash,
                "last_modified": now,
                "permissions": permissions or [],
                "metadata": metadata or {}
            }

            return DocumentReference(
                document_id=document_id,
                document_hash=doc_hash,
                title=title,
                source_type=source_type,
                last_modified=now,
                permissions=permissions or [],
                metadata=metadata or {}
            )

    def update_document(self, document_id: str, new_content: str) -> Optional[str]:
        """Update document content and return new hash."""
        with self._lock:
            if document_id not in self.documents:
                return None

            new_hash = hashlib.sha256(new_content.encode('utf-8')).hexdigest()
            self.documents[document_id]["content"] = new_content
            self.documents[document_id]["hash"] = new_hash
            self.documents[document_id]["last_modified"] = datetime.now()

            return new_hash

    def get_document(self, document_id: str) -> Optional[Dict]:
        with self._lock:
            doc = self.documents.get(document_id)
            if doc:
                return {k: v for k, v in doc.items() if k != "content"}
            return None

    def get_document_text(self, document_id: str) -> Optional[str]:
        with self._lock:
            doc = self.documents.get(document_id)
            return doc["content"] if doc else None

    def list_documents(self, source_type: Optional[str] = None) -> List[Dict]:
        with self._lock:
            docs = []
            for doc in self.documents.values():
                if source_type is None or doc["source_type"] == source_type:
                    docs.append({k: v for k, v in doc.items() if k != "content"})
            return docs


class FileSystemDocumentStore(DocumentStore):
    """
    Document store backed by the file system.
    """

    def __init__(self, base_path: Path):
        self.base_path = base_path
        self._index: Dict[str, Dict] = {}
        self._index_file = base_path / ".document_index.json"
        self._lock = threading.RLock()
        self._load_index()

    def _load_index(self):
        """Load document index from file."""
        if self._index_file.exists():
            try:
                self._index = json.loads(self._index_file.read_text())
            except:
                self._index = {}

    def _save_index(self):
        """Save document index to file."""
        try:
            self._index_file.write_text(json.dumps(self._index, indent=2, default=str))
        except Exception as e:
            log(f"Failed to save index: {e}", "ERROR")

    def register_document(
        self,
        file_path: Path,
        title: str,
        source_type: str,
        permissions: Optional[List[str]] = None
    ) -> Optional[DocumentReference]:
        """Register a file as a document."""
        with self._lock:
            if not file_path.exists():
                return None

            content = file_path.read_text(encoding='utf-8')
            doc_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            doc_id = hashlib.md5(str(file_path.absolute()).encode()).hexdigest()[:12]

            self._index[doc_id] = {
                "file_path": str(file_path.absolute()),
                "title": title,
                "source_type": source_type,
                "hash": doc_hash,
                "last_modified": datetime.now().isoformat(),
                "permissions": permissions or []
            }
            self._save_index()

            return DocumentReference(
                document_id=doc_id,
                document_hash=doc_hash,
                title=title,
                source_type=source_type,
                last_modified=datetime.now(),
                permissions=permissions or []
            )

    def get_document(self, document_id: str) -> Optional[Dict]:
        with self._lock:
            return self._index.get(document_id)

    def get_document_text(self, document_id: str) -> Optional[str]:
        with self._lock:
            doc = self._index.get(document_id)
            if not doc:
                return None

            file_path = Path(doc["file_path"])
            if not file_path.exists():
                return None

            try:
                return file_path.read_text(encoding='utf-8')
            except:
                return None

    def list_documents(self, source_type: Optional[str] = None) -> List[Dict]:
        with self._lock:
            docs = []
            for doc_id, doc in self._index.items():
                if source_type is None or doc["source_type"] == source_type:
                    docs.append({"id": doc_id, **doc})
            return docs


# ================================================================================
# STABLE ANCHOR SERVICE
# ================================================================================

class StableAnchorService:
    """
    Service for creating and verifying stable anchors.

    This is the main interface for the Stable Anchor Citation System.
    """

    def __init__(self, document_store: DocumentStore, use_sqlite: bool = True):
        self.store = document_store
        self.anchors: Dict[str, StableAnchor] = {}
        self._lock = threading.RLock()
        self._cache: Dict[str, Tuple[str, float]] = {}  # document_id -> (hash, timestamp)

        self.use_sqlite = use_sqlite
        if use_sqlite:
            self._init_db()
        else:
            self._load_anchors_json()

    def _init_db(self):
        """Initialize SQLite database for anchor storage."""
        try:
            self.conn = sqlite3.connect(str(ANCHORS_DB_FILE), check_same_thread=False)
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS anchors (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    is_valid INTEGER DEFAULT 1
                )
            """)
            self.conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_document_id ON anchors(document_id)
            """)
            self.conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_is_valid ON anchors(is_valid)
            """)
            self.conn.commit()
            self._load_anchors_db()
        except Exception as e:
            log(f"SQLite init failed, falling back to JSON: {e}", "WARN")
            self.use_sqlite = False
            self._load_anchors_json()

    def _load_anchors_db(self):
        """Load anchors from SQLite database."""
        try:
            cursor = self.conn.execute("SELECT id, data FROM anchors WHERE is_valid = 1")
            for row in cursor.fetchall():
                try:
                    data = json.loads(row[1])
                    self.anchors[row[0]] = StableAnchor.from_dict(data)
                except:
                    pass
            log(f"Loaded {len(self.anchors)} anchors from database")
        except Exception as e:
            log(f"Failed to load anchors from DB: {e}", "ERROR")

    def _load_anchors_json(self):
        """Load anchors from JSON file (fallback)."""
        if ANCHORS_JSON_FILE.exists():
            try:
                data = json.loads(ANCHORS_JSON_FILE.read_text())
                for anchor_data in data.get("anchors", []):
                    anchor = StableAnchor.from_dict(anchor_data)
                    self.anchors[anchor.id] = anchor
                log(f"Loaded {len(self.anchors)} anchors from JSON")
            except Exception as e:
                log(f"Failed to load anchors from JSON: {e}", "ERROR")

    def _save_anchor(self, anchor: StableAnchor):
        """Save anchor to persistent storage."""
        if self.use_sqlite:
            try:
                self.conn.execute(
                    "INSERT OR REPLACE INTO anchors (id, data, created_at, document_id, is_valid) VALUES (?, ?, ?, ?, ?)",
                    (anchor.id, json.dumps(anchor.to_dict(), default=str),
                     anchor.created_at.isoformat(), anchor.document.document_id,
                     1 if anchor.is_valid else 0)
                )
                self.conn.commit()
            except Exception as e:
                log(f"Failed to save anchor to DB: {e}", "ERROR")
        else:
            self._save_anchors_json()

    def _save_anchors_json(self):
        """Save all anchors to JSON file."""
        try:
            data = {
                "anchors": [a.to_dict() for a in self.anchors.values()],
                "updated_at": datetime.now().isoformat()
            }
            ANCHORS_JSON_FILE.write_text(json.dumps(data, indent=2, default=str))
        except Exception as e:
            log(f"Failed to save anchors to JSON: {e}", "ERROR")

    def create_anchor(
        self,
        document_id: str,
        start: int,
        end: int,
        agent_id: str,
        confidence: float = 1.0,
        context_chars: int = 50
    ) -> Optional[StableAnchor]:
        """
        Create a new stable anchor with full verification.

        Args:
            document_id: ID of the source document
            start: Character offset start
            end: Character offset end
            agent_id: ID of the agent/user creating the anchor
            confidence: Extraction confidence (0-1)
            context_chars: Characters of context to store

        Returns:
            StableAnchor if successful, None if document/span invalid
        """
        with self._lock:
            # Get document
            doc_text = self.store.get_document_text(document_id)
            if doc_text is None:
                log(f"Document {document_id} not found", "ERROR")
                return None

            # Validate offsets
            if start < 0 or end > len(doc_text) or start >= end:
                log(f"Invalid offsets: {start}-{end} for doc length {len(doc_text)}", "ERROR")
                return None

            # Extract span
            text_span = doc_text[start:end]
            span_hash = hashlib.sha256(text_span.encode('utf-8')).hexdigest()

            # Get context
            context_start = max(0, start - context_chars)
            context_end = min(len(doc_text), end + context_chars)
            context = doc_text[context_start:context_end]

            # Get document metadata
            doc_meta = self.store.get_document(document_id)
            if doc_meta is None:
                log(f"Document metadata not found for {document_id}", "ERROR")
                return None

            # Compute document hash
            doc_hash = hashlib.sha256(doc_text.encode('utf-8')).hexdigest()

            # Create document reference
            doc_ref = DocumentReference(
                document_id=document_id,
                document_hash=doc_hash,
                title=doc_meta.get("title", "Unknown"),
                source_type=doc_meta.get("source_type", "file"),
                last_modified=datetime.fromisoformat(doc_meta["last_modified"])
                    if isinstance(doc_meta.get("last_modified"), str)
                    else doc_meta.get("last_modified", datetime.now()),
                permissions=doc_meta.get("permissions", [])
            )

            # Create text anchor
            text_anchor = TextAnchor(
                start_offset=start,
                end_offset=end,
                text_span=text_span,
                span_hash=span_hash
            )

            # Create stable anchor
            anchor = StableAnchor(
                id=str(uuid4())[:12],
                document=doc_ref,
                anchor=text_anchor,
                created_at=datetime.now(),
                created_by=agent_id,
                confidence=confidence,
                context=context,
                is_valid=True,
                last_verified=datetime.now(),
                verification_count=1
            )

            # Store
            self.anchors[anchor.id] = anchor
            self._save_anchor(anchor)

            log(f"Created anchor {anchor.id} for {doc_ref.title} [{start}:{end}]")
            return anchor

    def create_anchor_from_text(
        self,
        document_id: str,
        search_text: str,
        agent_id: str,
        occurrence: int = 1,
        confidence: float = 1.0
    ) -> Optional[StableAnchor]:
        """
        Create anchor by searching for text in document.

        Args:
            document_id: ID of the source document
            search_text: Text to find and anchor
            agent_id: ID of the agent/user creating
            occurrence: Which occurrence to anchor (1-based)
            confidence: Extraction confidence

        Returns:
            StableAnchor if text found, None otherwise
        """
        doc_text = self.store.get_document_text(document_id)
        if doc_text is None:
            return None

        # Find all occurrences
        start = 0
        found_count = 0
        while True:
            pos = doc_text.find(search_text, start)
            if pos == -1:
                break
            found_count += 1
            if found_count == occurrence:
                return self.create_anchor(
                    document_id=document_id,
                    start=pos,
                    end=pos + len(search_text),
                    agent_id=agent_id,
                    confidence=confidence
                )
            start = pos + 1

        log(f"Text not found (occurrence {occurrence}): {search_text[:30]}...", "WARN")
        return None

    def verify_anchor(self, anchor_id: str) -> VerificationResult:
        """
        Verify an anchor is still valid.

        Returns VerificationResult with status and timing.
        """
        start_time = time.time()

        with self._lock:
            anchor = self.anchors.get(anchor_id)
            if anchor is None:
                return VerificationResult(
                    anchor_id=anchor_id,
                    is_valid=False,
                    status=VerificationStatus.INVALID,
                    verification_time_ms=(time.time() - start_time) * 1000,
                    error_message="Anchor not found"
                )

            result = anchor.verify_chain(self.store)

            # Update anchor state
            anchor.last_verified = datetime.now()
            anchor.verification_count += 1
            anchor.is_valid = result.is_valid

            # Warn if slow
            if result.verification_time_ms > MAX_VERIFICATION_TIME_MS:
                log(f"Slow verification: {result.verification_time_ms:.1f}ms for {anchor_id}", "WARN")

            return result

    def bulk_verify(self, anchor_ids: List[str]) -> Dict[str, VerificationResult]:
        """
        Verify multiple anchors efficiently.

        Batches by document to minimize document loads.
        """
        start_time = time.time()
        results: Dict[str, VerificationResult] = {}

        # Group by document for efficiency
        by_document: Dict[str, List[str]] = {}
        for anchor_id in anchor_ids:
            anchor = self.anchors.get(anchor_id)
            if anchor:
                doc_id = anchor.document.document_id
                if doc_id not in by_document:
                    by_document[doc_id] = []
                by_document[doc_id].append(anchor_id)
            else:
                results[anchor_id] = VerificationResult(
                    anchor_id=anchor_id,
                    is_valid=False,
                    status=VerificationStatus.INVALID,
                    verification_time_ms=0,
                    error_message="Anchor not found"
                )

        # Verify by document
        for doc_id, doc_anchor_ids in by_document.items():
            # Load document once
            doc_text = self.store.get_document_text(doc_id)

            for anchor_id in doc_anchor_ids:
                anchor = self.anchors[anchor_id]

                if doc_text is None:
                    results[anchor_id] = VerificationResult(
                        anchor_id=anchor_id,
                        is_valid=False,
                        status=VerificationStatus.DOCUMENT_MISSING,
                        verification_time_ms=0,
                        error_message=f"Document {doc_id} not found"
                    )
                    continue

                # Verify
                result = anchor.verify_chain(self.store)
                results[anchor_id] = result

                # Update state
                anchor.last_verified = datetime.now()
                anchor.verification_count += 1
                anchor.is_valid = result.is_valid

        total_time = (time.time() - start_time) * 1000
        avg_time = total_time / len(anchor_ids) if anchor_ids else 0

        log(f"Bulk verified {len(anchor_ids)} anchors in {total_time:.1f}ms ({avg_time:.1f}ms avg)")

        return results

    def get_anchors_for_document(self, document_id: str) -> List[StableAnchor]:
        """Get all anchors pointing to a document."""
        with self._lock:
            return [
                a for a in self.anchors.values()
                if a.document.document_id == document_id
            ]

    def invalidate_on_document_change(self, document_id: str, new_hash: str) -> List[str]:
        """
        Mark anchors invalid when source document changes.

        Returns list of invalidated anchor IDs.
        """
        with self._lock:
            invalidated = []

            for anchor_id, anchor in self.anchors.items():
                if anchor.document.document_id == document_id:
                    if anchor.document.document_hash != new_hash:
                        anchor.is_valid = False
                        invalidated.append(anchor_id)
                        self._save_anchor(anchor)

            if invalidated:
                log(f"Invalidated {len(invalidated)} anchors for document {document_id}")

            return invalidated

    def get_stale_anchors(self) -> List[StableAnchor]:
        """Get all anchors that are marked invalid or stale."""
        with self._lock:
            return [a for a in self.anchors.values() if not a.is_valid]

    def get_anchor(self, anchor_id: str) -> Optional[StableAnchor]:
        """Get a single anchor by ID."""
        return self.anchors.get(anchor_id)

    def get_all_anchors(self) -> List[StableAnchor]:
        """Get all anchors."""
        return list(self.anchors.values())

    def delete_anchor(self, anchor_id: str) -> bool:
        """Delete an anchor."""
        with self._lock:
            if anchor_id in self.anchors:
                del self.anchors[anchor_id]
                if self.use_sqlite:
                    try:
                        self.conn.execute("DELETE FROM anchors WHERE id = ?", (anchor_id,))
                        self.conn.commit()
                    except:
                        pass
                else:
                    self._save_anchors_json()
                return True
            return False

    def get_health_summary(self) -> Dict:
        """Get anchor health summary for dashboard."""
        with self._lock:
            total = len(self.anchors)
            valid = sum(1 for a in self.anchors.values() if a.is_valid)
            invalid = total - valid

            by_source = {}
            for anchor in self.anchors.values():
                source = anchor.document.source_type
                if source not in by_source:
                    by_source[source] = {"total": 0, "valid": 0}
                by_source[source]["total"] += 1
                if anchor.is_valid:
                    by_source[source]["valid"] += 1

            return {
                "total_anchors": total,
                "valid_anchors": valid,
                "invalid_anchors": invalid,
                "health_percentage": round(valid / total * 100, 1) if total > 0 else 100,
                "by_source_type": by_source,
                "last_checked": datetime.now().isoformat()
            }


# ================================================================================
# SEED VAULT INTEGRATION - FORENSIC RULE CATEGORY
# ================================================================================

def add_forensic_rules_to_seed_vault():
    """
    Add FORENSIC rule category to Seed Vault.

    Rules require stable anchors for AI citations.
    """
    forensic_rules = {
        "FORENSIC001": {
            "id": "FORENSIC001",
            "category": "forensic",
            "severity": "critical",
            "title": "Verifiable Citations Required",
            "description": "All AI citations MUST be backed by StableAnchors with verifiable hashes",
            "must_do": [
                "Create StableAnchor before citing any document",
                "Verify anchor before including in response",
                "Include anchor hash in citation format",
                "ABSTAIN if anchor cannot be verified"
            ],
            "must_not_do": [
                "Cite documents without StableAnchors",
                "Use stale anchors without re-verification",
                "Hallucinate citations not backed by anchors"
            ],
            "source": "stable_anchors.py - Forensic RAG Infrastructure",
            "keywords": ["citation", "anchor", "verification", "forensic"]
        },
        "FORENSIC002": {
            "id": "FORENSIC002",
            "category": "forensic",
            "severity": "high",
            "title": "Verification Performance",
            "description": "Anchor verification MUST complete in under 50ms",
            "must_do": [
                "Use caching for frequently verified anchors",
                "Batch verification for multiple anchors",
                "Pre-load documents for known citation patterns"
            ],
            "must_not_do": [
                "Block UI on slow verification",
                "Skip verification for performance reasons",
                "Cache stale verification results"
            ],
            "source": "stable_anchors.py - Performance Requirements",
            "keywords": ["performance", "verification", "latency"]
        },
        "FORENSIC003": {
            "id": "FORENSIC003",
            "category": "forensic",
            "severity": "critical",
            "title": "Governor Abstention Rule",
            "description": "Governor MUST ABSTAIN if citation cannot be verified",
            "must_do": [
                "Verify all citations before Governor approval",
                "ABSTAIN rather than approve with unverified citations",
                "Log abstention reason for audit"
            ],
            "must_not_do": [
                "Approve proposals with unverified citations",
                "Override verification failures",
                "Hide verification status from audit trail"
            ],
            "source": "stable_anchors.py - Zero Hallucination Tolerance",
            "keywords": ["governor", "abstain", "verification", "approval"]
        }
    }

    return forensic_rules


# ================================================================================
# NEGOTIATION PROTOCOL INTEGRATION
# ================================================================================

def create_cited_proposal(
    description: str,
    citations: List[StableAnchor],
    anchor_service: StableAnchorService
) -> Tuple[Dict, List[VerificationResult]]:
    """
    Create a proposal with verified citations for Negotiation Protocol.

    Verifies all citations before including them.

    Returns:
        Tuple of (proposal_dict, verification_results)
    """
    verification_results = []
    verified_citations = []

    for anchor in citations:
        result = anchor_service.verify_anchor(anchor.id)
        verification_results.append(result)

        if result.is_valid:
            verified_citations.append({
                "anchor_id": anchor.id,
                "citation": anchor.to_citation_string(),
                "text": anchor.anchor.text_span,
                "document": anchor.document.title,
                "hash": anchor.anchor.span_hash[:8]
            })

    proposal = {
        "description": description,
        "citations": verified_citations,
        "citation_count": len(verified_citations),
        "all_verified": all(r.is_valid for r in verification_results),
        "verification_summary": {
            "total": len(citations),
            "verified": sum(1 for r in verification_results if r.is_valid),
            "failed": sum(1 for r in verification_results if not r.is_valid)
        }
    }

    return proposal, verification_results


# ================================================================================
# GLOBAL INSTANCE
# ================================================================================

_anchor_service: Optional[StableAnchorService] = None
_document_store: Optional[DocumentStore] = None


def get_document_store() -> DocumentStore:
    """Get or create the global document store."""
    global _document_store
    if _document_store is None:
        _document_store = InMemoryDocumentStore()
    return _document_store


def get_anchor_service() -> StableAnchorService:
    """Get or create the global anchor service."""
    global _anchor_service
    if _anchor_service is None:
        _anchor_service = StableAnchorService(get_document_store())
    return _anchor_service


def init_with_document_store(store: DocumentStore) -> StableAnchorService:
    """Initialize with a custom document store."""
    global _anchor_service, _document_store
    _document_store = store
    _anchor_service = StableAnchorService(store)
    return _anchor_service


# ================================================================================
# CLI
# ================================================================================

def main():
    """CLI interface for Stable Anchors."""
    import argparse

    parser = argparse.ArgumentParser(description="Stable Anchor Citation System")
    parser.add_argument("--health", action="store_true", help="Show anchor health summary")
    parser.add_argument("--list", action="store_true", help="List all anchors")
    parser.add_argument("--verify", type=str, help="Verify a specific anchor ID")
    parser.add_argument("--verify-all", action="store_true", help="Verify all anchors")
    parser.add_argument("--demo", action="store_true", help="Run demo with sample data")
    args = parser.parse_args()

    service = get_anchor_service()

    if args.health:
        health = service.get_health_summary()
        print("\n=== ANCHOR HEALTH SUMMARY ===")
        print(f"Total Anchors: {health['total_anchors']}")
        print(f"Valid: {health['valid_anchors']}")
        print(f"Invalid: {health['invalid_anchors']}")
        print(f"Health: {health['health_percentage']}%")
        print("\nBy Source Type:")
        for source, stats in health['by_source_type'].items():
            print(f"  {source}: {stats['valid']}/{stats['total']} valid")

    elif args.list:
        anchors = service.get_all_anchors()
        print(f"\n=== {len(anchors)} ANCHORS ===\n")
        for anchor in anchors:
            status = "VALID" if anchor.is_valid else "INVALID"
            print(f"[{status}] {anchor.id}: {anchor.to_compact_citation()}")
            print(f"         Text: {anchor.anchor.text_span[:50]}...")
            print()

    elif args.verify:
        result = service.verify_anchor(args.verify)
        print(f"\n=== VERIFICATION RESULT ===")
        print(f"Anchor ID: {result.anchor_id}")
        print(f"Valid: {result.is_valid}")
        print(f"Status: {result.status.value if isinstance(result.status, VerificationStatus) else result.status}")
        print(f"Time: {result.verification_time_ms:.2f}ms")
        if result.error_message:
            print(f"Error: {result.error_message}")

    elif args.verify_all:
        anchors = service.get_all_anchors()
        anchor_ids = [a.id for a in anchors]
        results = service.bulk_verify(anchor_ids)

        print(f"\n=== BULK VERIFICATION ({len(results)} anchors) ===\n")
        valid = sum(1 for r in results.values() if r.is_valid)
        print(f"Valid: {valid}/{len(results)}")

        for anchor_id, result in results.items():
            status = "OK" if result.is_valid else "FAIL"
            print(f"[{status}] {anchor_id}: {result.status.value if isinstance(result.status, VerificationStatus) else result.status}")

    elif args.demo:
        print("\n=== STABLE ANCHOR DEMO ===\n")

        # Create sample document
        store = get_document_store()
        if isinstance(store, InMemoryDocumentStore):
            doc_ref = store.add_document(
                document_id="lease-001",
                content="""LEASE AGREEMENT

Section 1: Premises
The landlord agrees to lease the property located at 123 Farm Road
to the tenant for agricultural purposes.

Section 2: Term
The lease term shall be from January 1, 2026 to December 31, 2026.
The monthly rent shall be $2,500 payable on the first of each month.

Section 3: Use of Property
The property shall be used solely for organic vegetable farming.
No livestock shall be kept on the premises without prior written consent.""",
                title="Farm Lease Agreement 2026",
                source_type=SourceType.LEASE.value,
                permissions=["todd@tinyseedfarm.com"]
            )
            print(f"Created document: {doc_ref.title}")
            print(f"Hash: {doc_ref.document_hash[:16]}...")

            # Create anchor
            anchor = service.create_anchor_from_text(
                document_id="lease-001",
                search_text="The monthly rent shall be $2,500",
                agent_id="demo_agent"
            )

            if anchor:
                print(f"\nCreated anchor: {anchor.id}")
                print(f"Citation: {anchor.to_citation_string()}")
                print(f"Text: {anchor.anchor.text_span}")

                # Verify
                result = service.verify_anchor(anchor.id)
                print(f"\nVerification: {result.status.value if isinstance(result.status, VerificationStatus) else result.status}")
                print(f"Time: {result.verification_time_ms:.2f}ms")

                # Health summary
                print("\n" + "=" * 40)
                health = service.get_health_summary()
                print(f"Anchor Health: {health['health_percentage']}%")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
