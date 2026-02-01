# Photo Upload & Storage for TinyPM - Complete Research

**Date:** January 30, 2026
**Research Scope:** User-generated photo upload flow for wine labels, dinners, receipts, and book covers
**Target:** Max 5MB per image, automatic thumbnails, OCR text extraction, optimized delivery

---

## EXECUTIVE SUMMARY

**Recommendation: Supabase Storage + browser-image-compression + Tesseract.js**

This combination is optimal because:
- You already have Supabase account (zero new vendor relationships)
- Simple REST API integration with your existing backend
- S3-compatible, so you're not locked in
- Built-in CDN and image processing
- Cost-effective for your scale
- OCR can run client-side or server-side as needed

**Total Implementation Time:** 1-2 weeks
**Infrastructure Cost:** $25/month (Supabase Pro already budgeted) + egress costs

---

# PART 1: STORAGE OPTIONS COMPARISON

## Option A: Supabase Storage (RECOMMENDED)

### Overview
Supabase Storage is a PostgreSQL-backed file management system with built-in S3 compatibility, global CDN, and image processing capabilities. It's designed for app developers who want simplicity without sacrificing power.

### Pros
- **Already integrated:** You have Supabase account; just enable Storage bucket
- **Simple REST API:** Works perfectly with your existing TinySeedAPI wrapper
- **Built-in CDN:** Global edge locations, automatic caching
- **Access control:** Row-level security (RLS) with SQL policies
- **Image processing:** Resize, compress, format conversion via query params
- **No vendor lock-in:** S3-compatible storage backend
- **Authentication:** Uses same session tokens as your app
- **Bandwidth included:** 250GB/month on Pro plan ($0.03/GB cached egress after)

### Cons
- Less advanced image optimization than Cloudinary
- No built-in ML features (object detection, etc.)
- CDN caching strategy needs manual configuration
- EXIF data stripping requires custom function

### Pricing (2026)
```
Storage:       $0.021 per GB/month (100GB included in Pro)
Cached egress: $0.03 per GB/month
Raw egress:    $0.09 per GB/month
Initial:       Free tier allows 10GB bandwidth (5GB cached + 5GB raw)
```

### Cost Example: 1,000 photos/month @ 500KB avg
```
Storage:       10GB stored @ $0.021 = $0.21/month
Cached egress: 5GB @ $0.03 = $0.15/month
Total:         ~$0.36/month + Supabase Pro fee
```

### Implementation Complexity
**Easy** - Familiar PostgreSQL structure, REST API, integrates with existing auth

---

## Option B: Cloudinary

### Overview
Cloudinary is a specialized image management platform that transforms, optimizes, and delivers images at scale. It's a SaaS platform focused entirely on image and video workflow.

### Pros
- **Best-in-class transformations:** Automatic resizing, format selection, quality optimization
- **Built-in security:** EXIF stripping, malware scanning
- **Advanced features:** Face detection, object detection, content moderation
- **No bandwidth charges:** Delivery via CDN included
- **Free tier generous:** 25 GB/month for testing
- **ML capabilities:** Can extract objects, read text, detect safe content

### Cons
- **New vendor relationship:** Adds operational complexity
- **API key management:** Must keep credentials secure
- **Vendor lock-in:** Format transformations are proprietary
- **Learning curve:** More complex API for basic operations
- **Costs scale fast:** $99-499/month for production use
- **GDPR concerns:** Data processing in US regions by default

### Pricing (2026)
```
Free tier:     25GB/month storage, unlimited transformations
Plan 1:        75GB/month @ $49/month
Plan 2:        125GB/month @ $99/month
Plan 3:        500GB/month @ $199/month
Overage:       $0.50 per additional GB
```

### Cost Example: 1,000 photos/month @ 500KB avg
```
At 5GB/month need (originals + thumbnails + variants):
Cloudinary Plan 1: $49/month fixed
vs Supabase:       ~$0.36 + Pro fee
```

### When to Use
Only if you need advanced transformations or ML features. For TinyPM's use case, Supabase is 100x cheaper.

---

## Option C: AWS S3 + CloudFront

### Overview
Raw object storage with CDN. Maximum control, maximum complexity. Industry standard for enterprise.

### Pros
- **Cheapest for scale:** Pay only for what you use
- **Maximum flexibility:** Can integrate with any service
- **Direct control:** Full S3 API, version control, lifecycle policies
- **Durability:** 99.999999999% (11 nines)
- **Lambda integration:** Can trigger image processing

### Cons
- **Requires AWS account setup:** New infrastructure to manage
- **Need separate image processing:** Must build or integrate Lambdas/EC2
- **CDN configuration required:** Must set up CloudFront separately
- **Operational overhead:** Requires AWS knowledge
- **Pricing complexity:** Multiple services, hidden costs
- **EXIF handling:** Must implement yourself
- **SDK bloat:** 200KB+ to download AWS SDK

### Pricing (2026)
```
S3 storage:         $0.023 per GB (Standard class)
Data transfer out:  $0.09 per GB (first 10TB/month)
CloudFront out:     $0.085 per GB (cached)
Requests:           $0.0004 per 1,000 PUT requests
```

### Cost Example: 1,000 photos/month @ 500KB avg
```
Storage (10GB):     $0.23/month
Egress (5GB):       $0.45/month (uncached)
Egress (5GB):       $0.425/month (CloudFront cached)
CloudFront setup:   20+ hours engineering
Total:              $1.10/month + engineering time
```

### When to Use
Enterprise scale (10TB+/month) or when you need Lambda integration for server-side processing.

---

## Option D: Uploadcare

### Overview
Managed file upload service with built-in storage, CDN, and image processing. Between Supabase and Cloudinary in complexity.

### Pros
- **Complete upload widget:** Handles camera, file picker, drag-drop
- **Generous free tier:** 10GB storage, 10GB bandwidth
- **Image optimization included:** Automatic format selection
- **Simple API:** Minimal setup
- **URL-based transformations:** Like Cloudinary

### Cons
- **Another vendor:** Adds operational dependency
- **Bandwidth costs high:** $0.10/GB after free tier
- **Less control:** Proprietary widget
- **Smaller ecosystem:** Fewer integrations

### Pricing (2026)
```
Free:           10GB storage, 10GB bandwidth
Scale:          $0.1 per GB storage, $0.1 per GB bandwidth
```

### When to Use
If you want a complete widget but Supabase Storage is already sufficient.

---

## Option E: Cloudflare R2

### Overview
Cloudflare's S3-compatible object storage. New player focusing on simplicity and cost.

### Pros
- **No egress charges:** Included in price (revolutionary)
- **S3-compatible API:** Drop-in replacement for S3
- **Cheap:** $15/month for unlimited storage
- **Global distribution:** Cloudflare's edge network

### Cons
- **New service:** Less mature than S3
- **No built-in CDN:** Must configure separately
- **Smaller ecosystem:** Fewer integrations
- **Smaller company:** Less enterprise support

### Pricing (2026)
```
Storage:     $15/month for unlimited
Egress:      Included (no overage charges)
Requests:    $0.50 per million
```

### When to Use
If bandwidth is your primary cost concern. Good for high-volume image serving.

---

# STORAGE COMPARISON MATRIX

| Feature | Supabase | Cloudinary | S3 + CF | Uploadcare | Cloudflare R2 |
|---------|----------|-----------|---------|-----------|---------------|
| Setup Time | 10 min | 30 min | 2 hours | 20 min | 30 min |
| Monthly Cost (5GB) | $0.36 | $49 | $1.10 | $0 (free) | $15 (unlimited) |
| CDN Included | Yes | Yes | No* | Yes | No* |
| Image Processing | Basic | Advanced | None | Good | None |
| EXIF Stripping | Needs function | Automatic | Manual | Automatic | Manual |
| API Simplicity | Easy | Medium | Hard | Easy | Medium |
| Egress Charges | Yes | No | Yes | Yes | No |
| Vendor Lock-in | Low | High | Low | Medium | Low |
| ML Features | None | Advanced | None | None | None |
| **Best For** | Most cases | Advanced needs | Large scale | Widget focus | High volume |

*CloudFront or equivalent required

---

# PART 2: IMAGE UPLOAD FLOW

## Requirements
1. Handle up to 5MB files
2. Show progress indicator
3. Retry on failure
4. Compress before upload
5. Generate thumbnails
6. Extract metadata (EXIF stripping for privacy)
7. Extract text (OCR) for wine labels

---

## Recommended Upload Flow

```
User Photo Capture
    ↓
Browser Compression (client-side) ← 80% of time saved
    ↓
Progress Indicator (visual feedback)
    ↓
Upload with Retry Logic
    ↓
Supabase Storage (backend storage)
    ↓
Generate Thumbnail (async)
    ↓
Extract Text with OCR (async)
    ↓
Store Metadata in PostgreSQL
    ↓
Return CDN URL to Frontend
```

### Step 1: Image Capture

**Option A: Direct File Input**
```html
<input type="file" accept="image/*" capture="environment">
```
- Pros: Works everywhere, simple
- Cons: Users must manually crop/edit

**Option B: Camera API**
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment', // Back camera on mobile
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});
```
- Pros: Direct camera access, better UX
- Cons: Requires HTTPS, more code, Android quirks
- **Recommendation:** Start with Option A, add Option B later

**Option C: Both**
Show file picker AND camera button. Let user choose.

---

### Step 2: Compression (Client-Side)

**Recommended Library: browser-image-compression**

Why this one:
- 50KB minzipped (acceptable size)
- Progress tracking with callbacks
- Web Worker support (non-blocking)
- 86% of image size reduction on average

```javascript
import ImageCompressor from 'browser-image-compression';

// Configuration
const options = {
  maxSizeMB: 5,              // Max 5MB before compression
  maxWidthOrHeight: 1280,    // Downscale to 1280px max
  useWebWorker: true,        // Don't block UI thread
  onProgress: (progress) => {
    console.log(`Compression: ${Math.round(progress * 100)}%`);
  }
};

// Compress
const compressedFile = await ImageCompressor.compress(file, options);

// Result: 2MB -> 400KB typical
console.log(`Compressed from ${file.size} to ${compressedFile.size}`);
```

**Built-in Utility You Already Have:**

Your `/web_app/api-config.js` already has:
```javascript
TinySeedUtils.compressImage(dataUrl, maxWidth = 1200, quality = 0.7)
```

This is fine for basic use but `browser-image-compression` is better because:
- Uses Web Workers (non-blocking)
- Progress callbacks
- Supports multiple formats

---

### Step 3: Upload with Progress & Retry

```javascript
async uploadImage(file, {
  bucket = 'photos',
  folder = 'wine-labels',
  maxRetries = 3,
  onProgress = null
} = {}) {
  // Generate unique filename
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
  const path = `${folder}/${filename}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Track upload progress
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress?.({ loaded: event.loaded, total: event.total, percent: percentComplete });
        }
      });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (error) throw error;

      // Generate public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return {
        success: true,
        fileId: filename,
        path,
        publicUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(`Upload failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## Step 4: Generate Thumbnails

Thumbnails should be created server-side for consistency.

**In your Apps Script backend:**

```javascript
function generateThumbnail(fileId, publicUrl) {
  // Download original from Supabase CDN
  const response = UrlFetchApp.fetch(publicUrl);
  const imageBlob = response.getBlob();

  // Resize using Apps Script Image Service
  const image = ImagesApp.newImage(imageBlob);
  const thumbnail = image.resize(300, 300); // 300x300px

  // Upload thumbnail back to Supabase
  const thumbFilename = `${fileId}-thumb.jpg`;
  const thumbPath = `thumbnails/${thumbFilename}`;

  // Store thumbnail URL in database
  return {
    originalId: fileId,
    originalUrl: publicUrl,
    thumbnailUrl: getSupabasePublicUrl(thumbPath),
    generatedAt: new Date().toISOString()
  };
}
```

---

## Step 5: Extract Metadata & EXIF Stripping

**EXIF Data Concerns:**
Wine photos may contain GPS coordinates, camera model, timestamps that reveal user location/habits.

**Client-side stripping with piexifjs:**
```javascript
// Remove EXIF before upload (privacy first)
import piexif from 'piexifjs';

function stripExif(dataUrl) {
  // Remove all EXIF data
  const base64str = dataUrl.split(',')[1];
  const binaryString = atob(base64str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create new image without EXIF
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  return blob;
}
```

**Better approach: Use libjpeg-turbo via Supabase Function**
- Supabase Edge Functions can recompress images automatically
- Removes all EXIF/metadata during compression
- More reliable than client-side

---

# PART 3: OCR TEXT EXTRACTION (Wine Labels)

## Use Case
Users photograph wine labels to automatically extract:
- Vintage year
- Producer name
- Appellation/region
- Grape variety
- ABV (alcohol by volume)

---

## OCR Solutions Comparison

### Option A: Tesseract.js (Client-Side, Recommended)

**Tesseract.js** - Pure JavaScript port of open-source Tesseract OCR engine

```javascript
import Tesseract from 'tesseract.js';

async function extractWineLabel(imageUrl) {
  try {
    const result = await Tesseract.recognize(
      imageUrl,
      ['eng', 'fra', 'spa'], // English, French, Spanish
      {
        logger: (m) => console.log('OCR Progress:', m.progress)
      }
    );

    // Raw text extraction
    const text = result.data.text;

    // Parse wine label fields (regex patterns)
    const extracted = {
      vintage: extractVintage(text),
      producer: extractProducer(text),
      appellation: extractAppellation(text),
      grapes: extractGrapes(text),
      abv: extractABV(text),
      confidence: result.data.confidence,
      rawText: text
    };

    return extracted;
  } catch (error) {
    console.error('OCR failed:', error);
    return { error: error.message, rawText: null };
  }
}

// Helper functions
function extractVintage(text) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

function extractABV(text) {
  const match = text.match(/(\d+\.?\d*)\s*%\s*(?:alc|alcohol|vol)/i);
  return match ? parseFloat(match[1]) : null;
}
```

**Pros:**
- No backend required
- No API keys
- Works offline
- Free
- Privacy: Data never leaves browser
- Supports 100+ languages
- 3-5 second processing time (first run slower)

**Cons:**
- Large library (3.5MB initial, 20MB with all language packs)
- Accuracy: 85-90% on clear labels, drops to 60-70% on rotated/blurry
- Processing happens on main thread (can freeze UI)
- Requires WASM support

**Performance Optimization:**
```javascript
// Cache Tesseract instance to avoid reinitializing
let ocrWorker = null;

async function getOCRWorker() {
  if (!ocrWorker) {
    ocrWorker = await Tesseract.createWorker('eng');
  }
  return ocrWorker;
}

// Use Web Workers for background processing
const worker = await Tesseract.createWorker(['eng', 'fra', 'spa'], 1, {
  logger: progressCallback,
  errorHandler: errorCallback
});
```

**Cost:** Free

---

### Option B: Cloud Vision API (Server-Side)

Google Cloud Vision - Server-side OCR with higher accuracy

**Use when:** You want 98%+ accuracy, need handwriting support

```javascript
async function cloudVisionOCR(imageUrl) {
  const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GOOGLE_VISION_TOKEN}`
    },
    body: JSON.stringify({
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'LABEL_DETECTION' },
          { type: 'OBJECT_LOCALIZATION' }
        ]
      }]
    })
  });

  return response.json();
}
```

**Pros:**
- 98%+ accuracy
- Faster (server-side processing)
- Works on any image quality
- Detects objects, faces, etc.
- Comprehensive results

**Cons:**
- Costs $1.50 per 1,000 requests (for OCR)
- Requires Google Cloud setup
- Data leaves your system
- Latency (5-10 seconds)
- Privacy concerns (GDPR)

**Cost:** $1.50 per 1,000 images = ~$0.15/month @ 100 images/month

---

### Option C: Hybrid (Recommended for TinyPM)

1. **Client-side with Tesseract.js** - Fast, free, local
2. **Fallback to Cloud Vision** - When confidence < 75%

```javascript
async function intelligentOCR(imageUrl) {
  // Try fast client-side first
  const clientResult = await tesseractOCR(imageUrl);

  if (clientResult.confidence >= 0.75) {
    return { source: 'client', ...clientResult };
  }

  // Fallback to cloud for difficult images
  const cloudResult = await cloudVisionOCR(imageUrl);
  return { source: 'cloud', ...cloudResult };
}
```

**Cost:** Free for most, ~$0.01/month for edge cases

---

## Wine Label Parsing Logic

After OCR extracts text, parse it for wine-specific fields:

```javascript
function parseWineLabel(ocrText) {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l);

  return {
    // Vintage year (e.g., "2019", "Vintage 2018")
    vintage: extractYear(ocrText),

    // Producer name (usually all caps or on first line)
    producer: extractProducerName(lines),

    // Region (France: Bordeaux, Burgundy; California: Napa, Sonoma)
    region: extractRegion(ocrText),

    // Appellation (AOC, AVA, DOC)
    appellation: extractAppellation(ocrText),

    // Grape varieties (Cabernet Sauvignon, Pinot Noir, etc.)
    grapes: extractGrapes(ocrText),

    // Alcohol by volume
    abv: extractABV(ocrText),

    // Bottle size (750ml, 1.5L)
    size: extractBottleSize(ocrText),

    // Confidence score
    confidence: calculateConfidence(lines)
  };
}
```

---

# PART 4: IMPLEMENTATION ARCHITECTURE

## Frontend Component

```html
<!-- Photo Upload Widget -->
<div class="photo-upload">
  <!-- Camera or file input -->
  <div class="upload-controls">
    <button id="cameraBtn">📷 Take Photo</button>
    <button id="fileBtn">📁 Choose File</button>
    <input type="file" id="fileInput" hidden accept="image/*">
  </div>

  <!-- Progress bar -->
  <div id="uploadProgress" class="hidden">
    <div class="progress-bar">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
    <span id="progressText">0%</span>
  </div>

  <!-- Preview -->
  <div id="preview" class="image-preview hidden">
    <img id="previewImg" src="">
    <button id="uploadBtn">Upload & Extract Text</button>
    <button id="cancelBtn">Cancel</button>
  </div>

  <!-- Extracted text -->
  <div id="extractedData" class="hidden">
    <h3>Extracted Information</h3>
    <div id="wineData"></div>
  </div>
</div>

<!-- Required libraries -->
<script src="api-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/browser-image-compression/dist/browser-image-compression.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5"></script>
<script src="photo-upload.js"></script>
```

---

## JavaScript Implementation

```javascript
// photo-upload.js
class PhotoUploadManager {
  constructor(config = {}) {
    this.config = {
      maxSize: 5 * 1024 * 1024, // 5MB
      bucket: 'photos',
      folder: 'user-uploads',
      compressionQuality: 0.7,
      enableOCR: true,
      ...config
    };

    this.setupEventListeners();
    this.ocrWorker = null;
  }

  setupEventListeners() {
    document.getElementById('cameraBtn')?.addEventListener('click', () => this.captureCamera());
    document.getElementById('fileBtn')?.addEventListener('click', () => this.selectFile());
    document.getElementById('uploadBtn')?.addEventListener('click', () => this.uploadPhoto());
    document.getElementById('cancelBtn')?.addEventListener('click', () => this.reset());
  }

  async captureCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } }
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      // Get blob and show preview
      canvas.toBlob(blob => this.showPreview(blob));
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access denied. Using file picker instead.');
      this.selectFile();
    }
  }

  selectFile() {
    document.getElementById('fileInput').click();
  }

  async uploadPhoto() {
    const file = this.currentFile;
    if (!file) return;

    try {
      // Show progress
      this.showProgress();

      // Compress
      const compressed = await ImageCompressor.compress(file, {
        maxSizeMB: 5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        onProgress: (progress) => this.updateProgress(progress * 50) // 50% of progress
      });

      // Upload
      const result = await this.uploadToSupabase(compressed, (progress) => {
        this.updateProgress(50 + progress * 50); // Second 50% of progress
      });

      // Extract text if enabled
      if (this.config.enableOCR) {
        await this.extractTextFromImage(result.publicUrl);
      }

      // Show success
      this.showSuccess(result);
    } catch (error) {
      console.error('Upload error:', error);
      this.showError(error.message);
    }
  }

  async uploadToSupabase(file, onProgress) {
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const path = `${this.config.folder}/${fileName}`;

    // Create FormData for XHR progress tracking
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Generate public URL
          const publicUrl = `${TINY_SEED_API.SUPABASE_URL}/storage/v1/object/public/${this.config.bucket}/${path}`;

          resolve({
            fileId: fileName,
            path,
            publicUrl,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));

      // POST to Supabase Storage API
      xhr.open('POST', `${TINY_SEED_API.SUPABASE_URL}/storage/v1/object/${this.config.bucket}/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      xhr.send(formData);
    });
  }

  async extractTextFromImage(imageUrl) {
    try {
      if (!this.ocrWorker) {
        this.ocrWorker = await Tesseract.createWorker();
      }

      const result = await this.ocrWorker.recognize(imageUrl);
      const text = result.data.text;

      // Try to parse as wine label
      const wineData = this.parseWineLabel(text);

      return {
        rawText: text,
        confidence: result.data.confidence,
        parsed: wineData
      };
    } catch (error) {
      console.error('OCR error:', error);
      return { error: error.message };
    }
  }

  parseWineLabel(text) {
    // Extract structured data from raw OCR text
    return {
      vintage: this.extractYear(text),
      producer: this.extractProducer(text),
      region: this.extractRegion(text),
      grapes: this.extractGrapes(text),
      abv: this.extractABV(text)
    };
  }

  extractYear(text) {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : null;
  }

  extractABV(text) {
    const match = text.match(/(\d+\.?\d*)\s*%\s*(?:alc|alcohol|vol)/i);
    return match ? parseFloat(match[1]) : null;
  }

  // UI Methods
  showPreview(blob) {
    this.currentFile = blob;
    const url = URL.createObjectURL(blob);
    document.getElementById('previewImg').src = url;
    document.getElementById('preview').classList.remove('hidden');
  }

  showProgress() {
    document.getElementById('uploadProgress').classList.remove('hidden');
  }

  updateProgress(percent) {
    document.getElementById('progressText').textContent = `${Math.round(percent)}%`;
    document.querySelector('.progress-fill').style.width = `${percent}%`;
  }

  showSuccess(result) {
    document.getElementById('uploadProgress').classList.add('hidden');
    // Show stored data
    console.log('Upload successful:', result);
  }

  showError(message) {
    alert(`Error: ${message}`);
  }

  reset() {
    this.currentFile = null;
    document.getElementById('preview').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.photoUpload = new PhotoUploadManager({
    bucket: 'photos',
    folder: 'tinypm-user-content',
    enableOCR: true
  });
});
```

---

## Backend Integration (Apps Script)

Add to your MERGED TOTAL.js:

```javascript
/**
 * PHOTO MANAGEMENT API
 */

// Store photo metadata in database
function savePhotoMetadata(fileId, metadata) {
  const sheet = getSheet('PHOTOS');
  sheet.appendRow([
    fileId,
    metadata.uploadedBy,
    new Date().toISOString(),
    metadata.type, // 'wine-label', 'dinner', 'receipt', 'book-cover'
    metadata.contentType,
    JSON.stringify(metadata.extractedData || {}),
    metadata.supabaseUrl,
    metadata.thumbnailUrl,
    JSON.stringify(metadata.tags || [])
  ]);

  return fileId;
}

// Retrieve photo by ID
function getPhotoById(fileId) {
  const sheet = getSheet('PHOTOS');
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === fileId);

  if (!row) return null;

  return {
    fileId: row[0],
    uploadedBy: row[1],
    uploadedAt: row[2],
    type: row[3],
    contentType: row[4],
    extractedData: JSON.parse(row[5] || '{}'),
    supabaseUrl: row[6],
    thumbnailUrl: row[7],
    tags: JSON.parse(row[8] || '[]')
  };
}

// List all photos for a user
function getUserPhotos(userId, type = null) {
  const sheet = getSheet('PHOTOS');
  const data = sheet.getDataRange().getValues();

  return data
    .slice(1)
    .filter(row => row[1] === userId && (!type || row[3] === type))
    .map(row => ({
      fileId: row[0],
      uploadedBy: row[1],
      uploadedAt: row[2],
      type: row[3],
      contentType: row[4],
      extractedData: JSON.parse(row[5] || '{}'),
      supabaseUrl: row[6],
      thumbnailUrl: row[7],
      tags: JSON.parse(row[8] || '[]')
    }));
}

// Delete photo
function deletePhoto(fileId) {
  const sheet = getSheet('PHOTOS');
  const data = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === fileId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// API endpoint
case 'getUserPhotos':
  return getUserPhotos(user.id, params.type);

case 'savePhotoMetadata':
  return savePhotoMetadata(params.fileId, params.metadata);

case 'getPhotoById':
  return getPhotoById(params.fileId);
```

---

# PART 5: COST BREAKDOWN & RECOMMENDATION

## Total 12-Month Cost Projection

**Assumptions:**
- 1,000 photos/month (growing from 100 to 2,000)
- Average 500KB per photo
- 50% viewing rate
- 10% OCR extraction rate

### Option 1: Supabase Storage (RECOMMENDED)

```
Year 1 costs:
Supabase Pro:        $25 × 12 = $300
Storage (100GB incl, extra minimal)
Egress (5GB cached): $0.03 × 60GB × 12 = $21.60
Egress (5GB raw):    $0.09 × 60GB × 12 = $64.80
OCR (Tesseract free): $0
Total: $386.40/year (or $32.20/month average)
```

### Option 2: Cloudinary

```
Cloudinary Plan 1:   $49 × 12 = $588/year
OCR (Cloud Vision):  $1.50 × 100 requests × 12 = $18/year
Total: $606/year
```

### Option 3: AWS S3 + CloudFront

```
S3 storage:          $0.023 × 120GB = $2.76/year
Egress (CloudFront): $0.085 × 60GB × 12 = $61.20/year
CloudFront setup:    ~40 hours @ $100/hr = $4,000
Management overhead: ~5 hours/month = $3,000/year
OCR: $0 (can use Tesseract.js)
Total: ~$7,063/year (+ ongoing management)
```

---

## FINAL RECOMMENDATION

**Stack: Supabase Storage + browser-image-compression + Tesseract.js**

### Why This Combination

1. **Supabase Storage**
   - Zero setup (already have account)
   - $0.36/month storage, $0.03-0.09/GB egress
   - S3-compatible (not locked in)
   - Built-in CDN and access control
   - Works with existing auth

2. **browser-image-compression**
   - 50KB library, modern compression
   - Web Worker support (non-blocking)
   - Progress callbacks for UI
   - 80% size reduction typical

3. **Tesseract.js OCR**
   - Free (100% client-side)
   - Privacy (data never leaves device)
   - Fallback to Cloud Vision for edge cases
   - Supports 100+ languages

### Implementation Timeline

- **Week 1:** Set up Supabase Storage bucket, create API endpoints
- **Week 2:** Build frontend upload widget, integrate compression
- **Week 3:** Add OCR, test wine label extraction, polish UI
- **Total:** 3 weeks to production

### Cost Summary (Year 1)

| Item | Cost |
|------|------|
| Supabase Pro (already paying) | $300 |
| Supabase egress | $86 |
| Tesseract.js (free) | $0 |
| Cloud Vision (fallback, 10%) | $18 |
| **TOTAL** | **$404/year** |

vs. Cloudinary at $606/year = **$202/year savings**

---

# QUICK START CHECKLIST

- [ ] Enable Supabase Storage (Settings > Storage)
- [ ] Create `photos` bucket with public access
- [ ] Add storage.insert and storage.select RLS policies
- [ ] Create `PHOTOS` metadata table in Sheets
- [ ] Install `browser-image-compression` via CDN
- [ ] Install `tesseract.js` via CDN
- [ ] Build PhotoUploadManager component
- [ ] Test with sample wine label image
- [ ] Add to your API wrapper (`api-config.js`)
- [ ] Document for other Claudes

---

# REFERENCES & SOURCES

Storage Comparison:
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Cloudinary vs S3 Comparison](https://cloudinary.com/guides/ecosystems/cloudinary-vs-s3)
- [How to Use Supabase Storage as Alternative to S3](https://www.linkedin.com/pulse/how-use-supabase-storage-alternative-s3-image-uploads-muhammad-asad-7h7wf)
- [Supabase Pricing 2026](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)

Image Compression:
- [browser-image-compression - npm](https://www.npmjs.com/package/browser-image-compression)
- [Compressor.js GitHub](https://github.com/fengyuanchen/compressorjs)
- [Best Ways to Compress Images Before Upload in JavaScript](https://cloudinary.com/guides/image-effects/best-ways-to-compress-images-before-upload-in-javascript)

OCR & Text Extraction:
- [Tesseract.js - Pure Javascript OCR](https://tesseract.projectnaptha.com/)
- [Using OCR in JavaScript to Extract Text](https://sign.dropbox.com/blog/using-ocr-in-javascript)
- [OpenWines OCR for Wine Labels](https://github.com/OpenWines/OpenWinesOCR)
- [Scribe.js - JavaScript OCR](https://github.com/scribeocr/scribe.js)

Camera API:
- [MediaDevices.getUserMedia() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Getting Started with getUserMedia in 2025](https://blog.addpipe.com/getusermedia-getting-started/)
- [Choosing Cameras in JavaScript with mediaDevices API](https://www.twilio.com/en-us/blog/developers/tutorials/product/choosing-cameras-javascript-mediadevices-api-html)

---

**End of Research Document**
**Prepared for:** TinyPM Photo Upload Feature
**Date:** January 30, 2026
