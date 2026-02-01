#!/usr/bin/env python3
"""
TinyPM Photo Upload System
==========================
Handles photo uploads for wine/dinner logging with Supabase Storage integration.

Features:
- Upload photos to Supabase Storage
- Automatic compression to max 1MB
- Thumbnail generation (200x200)
- EXIF data extraction
- Local fallback when Supabase unavailable
- Offline queue support

Created: 2026-01-30
Author: Team 6 - Photo Upload & Storage
"""

import os
import io
import json
import base64
import hashlib
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Any

# Image processing
try:
    from PIL import Image, ExifTags
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("[PhotoUpload] WARNING: Pillow not installed. Run: pip install Pillow")

# Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("[PhotoUpload] WARNING: supabase-py not installed. Run: pip install supabase")


# Configuration
APP_DIR = Path(__file__).parent
PHOTOS_DIR = APP_DIR / "photos"
PHOTOS_MANIFEST = APP_DIR / ".photos_manifest.json"
OFFLINE_QUEUE_FILE = APP_DIR / ".photos_offline_queue.json"

# Ensure directories exist
PHOTOS_DIR.mkdir(exist_ok=True)
(PHOTOS_DIR / "thumbs").mkdir(exist_ok=True)

# Supabase config from environment
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = "photos"

# Image settings
MAX_IMAGE_SIZE = 1024 * 1024  # 1MB
MAX_DIMENSION = 2048  # Max width/height
THUMBNAIL_SIZE = (200, 200)
JPEG_QUALITY = 85


class PhotoUploader:
    """
    Complete photo upload system with Supabase Storage integration.
    Falls back to local storage when Supabase is unavailable.
    """

    def __init__(self):
        self.supabase: Optional[Client] = None
        self._init_supabase()
        self.manifest = self._load_manifest()

    def _init_supabase(self):
        """Initialize Supabase client if credentials available."""
        if not SUPABASE_AVAILABLE:
            print("[PhotoUpload] Supabase client not available - local only mode")
            return

        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            print("[PhotoUpload] Supabase credentials not set - local only mode")
            return

        try:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            print("[PhotoUpload] Connected to Supabase Storage")
        except Exception as e:
            print(f"[PhotoUpload] Supabase connection error: {e}")

    def _load_manifest(self) -> dict:
        """Load local photos manifest."""
        if PHOTOS_MANIFEST.exists():
            try:
                return json.loads(PHOTOS_MANIFEST.read_text())
            except:
                pass
        return {"photos": [], "next_id": 1}

    def _save_manifest(self):
        """Save photos manifest."""
        PHOTOS_MANIFEST.write_text(json.dumps(self.manifest, indent=2))

    def _load_offline_queue(self) -> List[dict]:
        """Load offline upload queue."""
        if OFFLINE_QUEUE_FILE.exists():
            try:
                return json.loads(OFFLINE_QUEUE_FILE.read_text())
            except:
                pass
        return []

    def _save_offline_queue(self, queue: List[dict]):
        """Save offline upload queue."""
        OFFLINE_QUEUE_FILE.write_text(json.dumps(queue, indent=2))

    def compress_image(self, image_data: bytes, max_size: int = MAX_IMAGE_SIZE) -> Tuple[bytes, dict]:
        """
        Compress image to target size while preserving quality.

        Args:
            image_data: Raw image bytes
            max_size: Maximum output size in bytes

        Returns:
            Tuple of (compressed_bytes, metadata_dict)
        """
        if not PIL_AVAILABLE:
            # Return original if Pillow not available
            return image_data, {"compressed": False, "reason": "Pillow not installed"}

        try:
            img = Image.open(io.BytesIO(image_data))
            original_format = img.format or "JPEG"

            # Extract EXIF before any processing
            exif_data = self.extract_exif(img)

            # Convert RGBA to RGB if needed (for JPEG)
            if img.mode in ('RGBA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1])
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize if too large
            original_size = img.size
            if max(img.size) > MAX_DIMENSION:
                img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

            # Compress with decreasing quality until under max_size
            output = io.BytesIO()
            quality = JPEG_QUALITY

            while quality > 20:
                output.seek(0)
                output.truncate()
                img.save(output, format='JPEG', quality=quality, optimize=True)

                if output.tell() <= max_size:
                    break
                quality -= 10

            metadata = {
                "compressed": True,
                "original_size": len(image_data),
                "compressed_size": output.tell(),
                "original_dimensions": original_size,
                "final_dimensions": img.size,
                "quality": quality,
                "format": "JPEG",
                "exif": exif_data
            }

            return output.getvalue(), metadata

        except Exception as e:
            print(f"[PhotoUpload] Compression error: {e}")
            return image_data, {"compressed": False, "error": str(e)}

    def extract_exif(self, img: "Image.Image") -> dict:
        """
        Extract useful EXIF data from image.
        Particularly useful for wine labels - captures date, location, device.
        """
        exif_data = {}

        try:
            exif = img._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)

                    # Extract useful fields
                    if tag in ['DateTime', 'DateTimeOriginal', 'DateTimeDigitized']:
                        exif_data['capture_date'] = str(value)
                    elif tag == 'Make':
                        exif_data['device_make'] = str(value)
                    elif tag == 'Model':
                        exif_data['device_model'] = str(value)
                    elif tag == 'GPSInfo':
                        # Parse GPS coordinates if available
                        try:
                            gps_info = {}
                            for key in value.keys():
                                gps_tag = ExifTags.GPSTAGS.get(key, key)
                                gps_info[gps_tag] = value[key]

                            if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
                                lat = self._gps_to_decimal(
                                    gps_info['GPSLatitude'],
                                    gps_info.get('GPSLatitudeRef', 'N')
                                )
                                lon = self._gps_to_decimal(
                                    gps_info['GPSLongitude'],
                                    gps_info.get('GPSLongitudeRef', 'E')
                                )
                                exif_data['location'] = {'lat': lat, 'lon': lon}
                        except:
                            pass
        except:
            pass

        return exif_data

    def _gps_to_decimal(self, coord, ref) -> float:
        """Convert GPS coordinates from EXIF format to decimal."""
        try:
            degrees = float(coord[0])
            minutes = float(coord[1])
            seconds = float(coord[2])

            decimal = degrees + minutes/60 + seconds/3600

            if ref in ['S', 'W']:
                decimal = -decimal

            return round(decimal, 6)
        except:
            return 0.0

    def generate_thumbnail(self, image_data: bytes) -> bytes:
        """
        Generate a 200x200 thumbnail.

        Args:
            image_data: Raw image bytes

        Returns:
            Thumbnail bytes in JPEG format
        """
        if not PIL_AVAILABLE:
            return image_data

        try:
            img = Image.open(io.BytesIO(image_data))

            # Convert to RGB if needed
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')

            # Create thumbnail (preserves aspect ratio, fits within box)
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Save as JPEG
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=80, optimize=True)

            return output.getvalue()

        except Exception as e:
            print(f"[PhotoUpload] Thumbnail error: {e}")
            return image_data

    def generate_filename(self, project_id: str, entry_id: str = None) -> str:
        """
        Generate unique filename for storage.
        Format: {project_id}/{entry_id}_{timestamp}_{hash}.jpg
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_hash = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:8]

        if entry_id:
            filename = f"{project_id}/{entry_id}_{timestamp}_{unique_hash}.jpg"
        else:
            filename = f"{project_id}/{timestamp}_{unique_hash}.jpg"

        return filename

    def upload_photo(
        self,
        file_data: bytes,
        user_id: str,
        project_id: str,
        entry_id: str = None,
        metadata: dict = None
    ) -> dict:
        """
        Upload a photo with automatic compression and storage.

        Args:
            file_data: Raw image bytes
            user_id: User identifier
            project_id: Project (wine/dinner) identifier
            entry_id: Optional specific entry ID
            metadata: Additional metadata to store

        Returns:
            Dict with upload result including URLs
        """
        if not file_data:
            return {"error": "No file data provided"}

        # Compress the image
        compressed_data, compression_info = self.compress_image(file_data)

        # Generate thumbnail
        thumbnail_data = self.generate_thumbnail(compressed_data)

        # Generate filenames
        photo_filename = self.generate_filename(project_id, entry_id)
        thumb_filename = photo_filename.replace('.jpg', '_thumb.jpg')

        # Prepare metadata
        photo_meta = {
            "id": self.manifest["next_id"],
            "user_id": user_id,
            "project_id": project_id,
            "entry_id": entry_id,
            "filename": photo_filename,
            "thumb_filename": thumb_filename,
            "size": len(compressed_data),
            "thumb_size": len(thumbnail_data),
            "uploaded_at": datetime.now().isoformat(),
            "compression": compression_info,
            "metadata": metadata or {},
            "synced": False
        }

        # Try Supabase upload first
        supabase_result = self._upload_to_supabase(
            compressed_data, thumbnail_data, photo_filename, thumb_filename
        )

        if supabase_result.get("success"):
            photo_meta["url"] = supabase_result["url"]
            photo_meta["thumb_url"] = supabase_result["thumb_url"]
            photo_meta["synced"] = True
            photo_meta["storage"] = "supabase"
        else:
            # Save locally as fallback
            local_result = self._save_locally(
                compressed_data, thumbnail_data, photo_filename, thumb_filename
            )
            photo_meta["url"] = local_result["url"]
            photo_meta["thumb_url"] = local_result["thumb_url"]
            photo_meta["storage"] = "local"

            # Add to offline queue for later sync
            self._add_to_offline_queue(photo_meta, compressed_data, thumbnail_data)

        # Update manifest
        self.manifest["photos"].insert(0, photo_meta)
        self.manifest["next_id"] += 1
        self._save_manifest()

        print(f"[PhotoUpload] Uploaded: {photo_filename} ({len(compressed_data)} bytes)")

        return {
            "success": True,
            "photo": photo_meta
        }

    def _upload_to_supabase(
        self,
        photo_data: bytes,
        thumb_data: bytes,
        photo_filename: str,
        thumb_filename: str
    ) -> dict:
        """Upload files to Supabase Storage."""
        if not self.supabase:
            return {"success": False, "error": "Supabase not available"}

        try:
            # Upload main photo
            photo_result = self.supabase.storage.from_(STORAGE_BUCKET).upload(
                photo_filename,
                photo_data,
                {"content-type": "image/jpeg"}
            )

            # Upload thumbnail
            thumb_result = self.supabase.storage.from_(STORAGE_BUCKET).upload(
                thumb_filename,
                thumb_data,
                {"content-type": "image/jpeg"}
            )

            # Get public URLs
            photo_url = self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(photo_filename)
            thumb_url = self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(thumb_filename)

            return {
                "success": True,
                "url": photo_url,
                "thumb_url": thumb_url
            }

        except Exception as e:
            print(f"[PhotoUpload] Supabase upload error: {e}")
            return {"success": False, "error": str(e)}

    def _save_locally(
        self,
        photo_data: bytes,
        thumb_data: bytes,
        photo_filename: str,
        thumb_filename: str
    ) -> dict:
        """Save files locally as fallback."""
        # Flatten the path structure for local storage
        safe_photo_name = photo_filename.replace('/', '_')
        safe_thumb_name = thumb_filename.replace('/', '_')

        photo_path = PHOTOS_DIR / safe_photo_name
        thumb_path = PHOTOS_DIR / "thumbs" / safe_thumb_name

        photo_path.write_bytes(photo_data)
        thumb_path.write_bytes(thumb_data)

        return {
            "url": f"/photos/{safe_photo_name}",
            "thumb_url": f"/photos/thumbs/{safe_thumb_name}"
        }

    def _add_to_offline_queue(self, photo_meta: dict, photo_data: bytes, thumb_data: bytes):
        """Add photo to offline queue for later sync."""
        queue = self._load_offline_queue()

        queue.append({
            "meta": photo_meta,
            "photo_data_b64": base64.b64encode(photo_data).decode(),
            "thumb_data_b64": base64.b64encode(thumb_data).decode(),
            "queued_at": datetime.now().isoformat()
        })

        self._save_offline_queue(queue)
        print(f"[PhotoUpload] Added to offline queue: {photo_meta['filename']}")

    def sync_offline_queue(self) -> dict:
        """
        Attempt to sync offline queue to Supabase.

        Returns:
            Dict with sync results
        """
        if not self.supabase:
            return {"success": False, "error": "Supabase not available", "synced": 0}

        queue = self._load_offline_queue()
        if not queue:
            return {"success": True, "synced": 0, "message": "Queue empty"}

        synced = 0
        failed = []
        remaining = []

        for item in queue:
            try:
                photo_data = base64.b64decode(item["photo_data_b64"])
                thumb_data = base64.b64decode(item["thumb_data_b64"])
                meta = item["meta"]

                result = self._upload_to_supabase(
                    photo_data, thumb_data,
                    meta["filename"], meta["thumb_filename"]
                )

                if result.get("success"):
                    # Update manifest entry
                    for photo in self.manifest["photos"]:
                        if photo["id"] == meta["id"]:
                            photo["url"] = result["url"]
                            photo["thumb_url"] = result["thumb_url"]
                            photo["synced"] = True
                            photo["storage"] = "supabase"
                            break

                    synced += 1
                    print(f"[PhotoUpload] Synced from queue: {meta['filename']}")
                else:
                    failed.append(meta["filename"])
                    remaining.append(item)

            except Exception as e:
                print(f"[PhotoUpload] Sync error: {e}")
                failed.append(item.get("meta", {}).get("filename", "unknown"))
                remaining.append(item)

        # Update queue with remaining items
        self._save_offline_queue(remaining)

        # Save updated manifest
        self._save_manifest()

        return {
            "success": True,
            "synced": synced,
            "failed": len(failed),
            "remaining": len(remaining),
            "failed_files": failed
        }

    def get_photo(self, photo_id: int) -> Optional[dict]:
        """Get photo metadata by ID."""
        for photo in self.manifest.get("photos", []):
            if photo["id"] == photo_id:
                return photo
        return None

    def get_photos_for_project(self, project_id: str) -> List[dict]:
        """Get all photos for a specific project."""
        return [
            p for p in self.manifest.get("photos", [])
            if p["project_id"] == project_id
        ]

    def get_photos_for_entry(self, project_id: str, entry_id: str) -> List[dict]:
        """Get all photos for a specific entry."""
        return [
            p for p in self.manifest.get("photos", [])
            if p["project_id"] == project_id and p.get("entry_id") == entry_id
        ]

    def delete_photo(self, photo_id: int) -> dict:
        """
        Delete a photo by ID.

        Args:
            photo_id: The photo's unique ID

        Returns:
            Dict with deletion result
        """
        photo = self.get_photo(photo_id)
        if not photo:
            return {"error": f"Photo {photo_id} not found"}

        # Try to delete from Supabase if synced there
        if photo.get("storage") == "supabase" and self.supabase:
            try:
                self.supabase.storage.from_(STORAGE_BUCKET).remove([
                    photo["filename"],
                    photo["thumb_filename"]
                ])
            except Exception as e:
                print(f"[PhotoUpload] Supabase delete error: {e}")

        # Delete local files if they exist
        safe_photo_name = photo["filename"].replace('/', '_')
        safe_thumb_name = photo["thumb_filename"].replace('/', '_')

        photo_path = PHOTOS_DIR / safe_photo_name
        thumb_path = PHOTOS_DIR / "thumbs" / safe_thumb_name

        if photo_path.exists():
            photo_path.unlink()
        if thumb_path.exists():
            thumb_path.unlink()

        # Remove from manifest
        self.manifest["photos"] = [p for p in self.manifest["photos"] if p["id"] != photo_id]
        self._save_manifest()

        # Remove from offline queue if present
        queue = self._load_offline_queue()
        queue = [q for q in queue if q.get("meta", {}).get("id") != photo_id]
        self._save_offline_queue(queue)

        print(f"[PhotoUpload] Deleted: {photo['filename']}")

        return {"success": True, "deleted_id": photo_id}

    def get_stats(self) -> dict:
        """Get upload statistics."""
        photos = self.manifest.get("photos", [])
        queue = self._load_offline_queue()

        total_size = sum(p.get("size", 0) for p in photos)
        synced = len([p for p in photos if p.get("synced")])

        return {
            "total_photos": len(photos),
            "synced": synced,
            "local_only": len(photos) - synced,
            "queue_size": len(queue),
            "total_size_mb": round(total_size / 1_000_000, 2),
            "supabase_connected": self.supabase is not None
        }


# Global instance
_uploader: Optional[PhotoUploader] = None


def get_photo_uploader() -> PhotoUploader:
    """Get or create the global PhotoUploader instance."""
    global _uploader
    if _uploader is None:
        _uploader = PhotoUploader()
    return _uploader


# Convenience functions
def upload_photo(file_data: bytes, user_id: str, project_id: str, entry_id: str = None, metadata: dict = None) -> dict:
    """Upload a photo (convenience wrapper)."""
    return get_photo_uploader().upload_photo(file_data, user_id, project_id, entry_id, metadata)


def get_photo(photo_id: int) -> Optional[dict]:
    """Get photo by ID (convenience wrapper)."""
    return get_photo_uploader().get_photo(photo_id)


def delete_photo(photo_id: int) -> dict:
    """Delete photo by ID (convenience wrapper)."""
    return get_photo_uploader().delete_photo(photo_id)


def sync_offline_queue() -> dict:
    """Sync offline queue (convenience wrapper)."""
    return get_photo_uploader().sync_offline_queue()


# CLI interface
if __name__ == "__main__":
    import sys

    uploader = get_photo_uploader()

    if len(sys.argv) < 2:
        print("TinyPM Photo Upload System")
        print("=" * 40)
        stats = uploader.get_stats()
        print(f"Total photos: {stats['total_photos']}")
        print(f"Synced to cloud: {stats['synced']}")
        print(f"Local only: {stats['local_only']}")
        print(f"Offline queue: {stats['queue_size']}")
        print(f"Total size: {stats['total_size_mb']} MB")
        print(f"Supabase connected: {stats['supabase_connected']}")
        print()
        print("Commands: stats, sync, list, test")
        sys.exit(0)

    command = sys.argv[1]

    if command == "stats":
        stats = uploader.get_stats()
        print(json.dumps(stats, indent=2))

    elif command == "sync":
        print("Syncing offline queue...")
        result = uploader.sync_offline_queue()
        print(json.dumps(result, indent=2))

    elif command == "list":
        photos = uploader.manifest.get("photos", [])
        for p in photos[:20]:
            synced = "v" if p.get("synced") else "x"
            print(f"[{synced}] #{p['id']}: {p['filename']} ({p['size']} bytes)")

    elif command == "test":
        # Test upload with a simple test image
        print("Creating test image...")
        if PIL_AVAILABLE:
            img = Image.new('RGB', (800, 600), color='blue')
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            test_data = buf.getvalue()

            print("Uploading test image...")
            result = uploader.upload_photo(
                test_data,
                user_id="test_user",
                project_id="wine",
                entry_id="test_entry",
                metadata={"test": True}
            )
            print(json.dumps(result, indent=2))
        else:
            print("Pillow not available for test image generation")

    else:
        print(f"Unknown command: {command}")
        print("Commands: stats, sync, list, test")
        sys.exit(1)
