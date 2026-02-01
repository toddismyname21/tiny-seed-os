/**
 * TinyPM Photo Utilities
 * ======================
 * Frontend photo capture, compression, and upload with offline support.
 *
 * Features:
 * - Camera capture (mobile and desktop)
 * - Gallery selection
 * - Client-side image compression
 * - IndexedDB offline queue
 * - Background sync
 *
 * Created: 2026-01-30
 * Author: Team 6 - Photo Upload & Storage
 */

const PhotoUtils = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        maxSize: 1024 * 1024,        // 1MB max upload size
        maxDimension: 2048,          // Max width/height
        quality: 0.85,               // JPEG quality
        thumbSize: 200,              // Thumbnail dimension
        dbName: 'tinypm_photos',
        dbVersion: 1,
        storeName: 'offline_queue',
        apiEndpoint: '/api/photos'
    };

    // State
    let db = null;
    let currentStream = null;

    // ========================================
    // IndexedDB Setup for Offline Support
    // ========================================

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.dbName, CONFIG.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Create offline queue store
                if (!database.objectStoreNames.contains(CONFIG.storeName)) {
                    const store = database.createObjectStore(CONFIG.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async function getDB() {
        if (!db) {
            await initDB();
        }
        return db;
    }

    // ========================================
    // Camera Functions
    // ========================================

    /**
     * Open device camera and return video stream
     * @param {Object} options - Camera options
     * @param {string} options.facing - 'user' or 'environment'
     * @returns {Promise<MediaStream>}
     */
    async function openCamera(options = {}) {
        const facing = options.facing || 'environment'; // Default to rear camera

        const constraints = {
            video: {
                facingMode: facing,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            if (currentStream) {
                closeCamera();
            }

            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            return currentStream;
        } catch (error) {
            console.error('[PhotoUtils] Camera error:', error);
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }

    /**
     * Close camera stream
     */
    function closeCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    /**
     * Capture photo from video stream
     * @param {HTMLVideoElement} videoElement - Video element showing camera
     * @returns {Promise<Blob>} - Captured image as blob
     */
    async function capturePhoto(videoElement) {
        if (!videoElement || !videoElement.videoWidth) {
            throw new Error('Video element not ready');
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to capture image'));
                    }
                },
                'image/jpeg',
                CONFIG.quality
            );
        });
    }

    /**
     * Quick capture - opens camera, takes photo, closes camera
     * @param {Object} options - Capture options
     * @returns {Promise<Blob>}
     */
    async function quickCapture(options = {}) {
        const stream = await openCamera(options);

        // Create temporary video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play().then(resolve);
            };
        });

        // Small delay to ensure frame is available
        await new Promise(r => setTimeout(r, 100));

        // Capture
        const blob = await capturePhoto(video);

        // Cleanup
        closeCamera();

        return blob;
    }

    // ========================================
    // Gallery Functions
    // ========================================

    /**
     * Open file picker for gallery selection
     * @param {Object} options - Selection options
     * @param {boolean} options.multiple - Allow multiple selection
     * @returns {Promise<FileList>}
     */
    async function selectFromGallery(options = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = options.multiple || false;

            // For mobile, add capture attribute if camera is preferred
            if (options.preferCamera) {
                input.capture = 'environment';
            }

            input.onchange = (event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                    resolve(files);
                } else {
                    reject(new Error('No files selected'));
                }
            };

            input.oncancel = () => {
                reject(new Error('Selection cancelled'));
            };

            input.click();
        });
    }

    /**
     * Select single image from gallery
     * @returns {Promise<Blob>}
     */
    async function selectSingleImage() {
        const files = await selectFromGallery({ multiple: false });
        return files[0];
    }

    // ========================================
    // Image Compression
    // ========================================

    /**
     * Compress image to target size
     * @param {Blob|File} blob - Input image
     * @param {number} maxSize - Maximum output size in bytes
     * @returns {Promise<{blob: Blob, metadata: Object}>}
     */
    async function compressImage(blob, maxSize = CONFIG.maxSize) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);

                let { width, height } = img;
                const originalWidth = width;
                const originalHeight = height;

                // Scale down if too large
                if (width > CONFIG.maxDimension || height > CONFIG.maxDimension) {
                    const ratio = Math.min(
                        CONFIG.maxDimension / width,
                        CONFIG.maxDimension / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to hit target size
                let quality = CONFIG.quality;
                const attemptCompress = () => {
                    canvas.toBlob(
                        (outputBlob) => {
                            if (!outputBlob) {
                                reject(new Error('Compression failed'));
                                return;
                            }

                            if (outputBlob.size <= maxSize || quality <= 0.2) {
                                resolve({
                                    blob: outputBlob,
                                    metadata: {
                                        originalSize: blob.size,
                                        compressedSize: outputBlob.size,
                                        originalDimensions: { width: originalWidth, height: originalHeight },
                                        finalDimensions: { width, height },
                                        quality: quality,
                                        compressionRatio: (blob.size / outputBlob.size).toFixed(2)
                                    }
                                });
                            } else {
                                quality -= 0.1;
                                attemptCompress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                attemptCompress();
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    /**
     * Generate thumbnail from image
     * @param {Blob} blob - Input image
     * @param {number} size - Thumbnail size (square)
     * @returns {Promise<Blob>}
     */
    async function generateThumbnail(blob, size = CONFIG.thumbSize) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);

                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;

                const ctx = canvas.getContext('2d');

                // Calculate crop to make square thumbnail
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                ctx.drawImage(
                    img,
                    sx, sy, minSide, minSide,  // Source rectangle
                    0, 0, size, size            // Destination rectangle
                );

                canvas.toBlob(
                    (thumbBlob) => {
                        if (thumbBlob) {
                            resolve(thumbBlob);
                        } else {
                            reject(new Error('Thumbnail generation failed'));
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image for thumbnail'));
            };

            img.src = url;
        });
    }

    // ========================================
    // Upload Functions
    // ========================================

    /**
     * Upload photo to server
     * @param {Blob} blob - Image blob to upload
     * @param {Object} options - Upload options
     * @returns {Promise<Object>}
     */
    async function uploadPhoto(blob, options = {}) {
        const {
            projectId = 'default',
            entryId = null,
            userId = 'anonymous',
            metadata = {}
        } = options;

        // Compress if needed
        const { blob: compressedBlob, metadata: compressionMeta } = await compressImage(blob);

        // Create form data
        const formData = new FormData();
        formData.append('photo', compressedBlob, 'photo.jpg');
        formData.append('project_id', projectId);
        formData.append('user_id', userId);
        if (entryId) {
            formData.append('entry_id', entryId);
        }
        formData.append('metadata', JSON.stringify({
            ...metadata,
            compression: compressionMeta
        }));

        try {
            const response = await fetch(`${CONFIG.apiEndpoint}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[PhotoUtils] Upload success:', result);
            return result;

        } catch (error) {
            console.error('[PhotoUtils] Upload error:', error);

            // Queue for offline sync
            if (!navigator.onLine) {
                await queueForOfflineSync(compressedBlob, options);
                return {
                    success: true,
                    queued: true,
                    message: 'Photo queued for upload when online'
                };
            }

            throw error;
        }
    }

    /**
     * Upload with retry logic
     * @param {Blob} blob - Image blob
     * @param {Object} options - Upload options
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<Object>}
     */
    async function uploadWithRetry(blob, options = {}, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await uploadPhoto(blob, options);
            } catch (error) {
                lastError = error;
                console.warn(`[PhotoUtils] Upload attempt ${attempt} failed:`, error);

                if (attempt < maxRetries) {
                    // Exponential backoff
                    await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                }
            }
        }

        // All retries failed, queue offline
        await queueForOfflineSync(blob, options);
        return {
            success: true,
            queued: true,
            message: 'Upload failed after retries, queued for later',
            error: lastError.message
        };
    }

    // ========================================
    // Offline Queue Functions
    // ========================================

    /**
     * Add photo to offline queue
     * @param {Blob} blob - Image blob
     * @param {Object} options - Upload options
     */
    async function queueForOfflineSync(blob, options) {
        const database = await getDB();

        // Convert blob to ArrayBuffer for storage
        const buffer = await blob.arrayBuffer();

        const item = {
            data: buffer,
            options: options,
            status: 'pending',
            createdAt: new Date().toISOString(),
            attempts: 0
        };

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(CONFIG.storeName);
            const request = store.add(item);

            request.onsuccess = () => {
                console.log('[PhotoUtils] Queued for offline sync:', request.result);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get offline queue status
     * @returns {Promise<Object>}
     */
    async function getOfflineQueueStatus() {
        const database = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([CONFIG.storeName], 'readonly');
            const store = transaction.objectStore(CONFIG.storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve({
                    count: request.result,
                    online: navigator.onLine
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sync offline queue
     * @returns {Promise<Object>}
     */
    async function syncOfflineQueue() {
        if (!navigator.onLine) {
            return { synced: 0, message: 'Offline' };
        }

        const database = await getDB();
        let synced = 0;
        let failed = 0;

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(CONFIG.storeName);
            const request = store.openCursor();

            request.onsuccess = async (event) => {
                const cursor = event.target.result;

                if (cursor) {
                    const item = cursor.value;

                    if (item.status === 'pending') {
                        try {
                            const blob = new Blob([item.data], { type: 'image/jpeg' });
                            await uploadPhoto(blob, item.options);

                            // Delete from queue on success
                            cursor.delete();
                            synced++;

                        } catch (error) {
                            // Update attempts count
                            item.attempts++;
                            item.lastError = error.message;

                            if (item.attempts >= 5) {
                                item.status = 'failed';
                            }

                            cursor.update(item);
                            failed++;
                        }
                    }

                    cursor.continue();
                } else {
                    resolve({ synced, failed });
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear offline queue
     */
    async function clearOfflineQueue() {
        const database = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(CONFIG.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ========================================
    // UI Components
    // ========================================

    /**
     * Create camera capture modal
     * @param {Object} callbacks - Event callbacks
     * @returns {HTMLElement}
     */
    function createCameraModal(callbacks = {}) {
        const modal = document.createElement('div');
        modal.className = 'photo-capture-modal';
        modal.innerHTML = `
            <div class="photo-capture-container">
                <div class="photo-capture-header">
                    <span>Take Photo</span>
                    <button class="photo-capture-close" type="button">&times;</button>
                </div>
                <div class="photo-capture-preview">
                    <video autoplay playsinline muted></video>
                    <canvas style="display:none"></canvas>
                    <img class="captured-preview" style="display:none">
                </div>
                <div class="photo-capture-controls">
                    <button class="photo-btn photo-btn-switch" title="Switch Camera">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                    </button>
                    <button class="photo-btn photo-btn-capture" title="Capture">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </button>
                    <button class="photo-btn photo-btn-gallery" title="Choose from Gallery">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </button>
                </div>
                <div class="photo-capture-actions" style="display:none">
                    <button class="photo-btn photo-btn-retake">Retake</button>
                    <button class="photo-btn photo-btn-use">Use Photo</button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .photo-capture-modal {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .photo-capture-container {
                background: #1a1d27;
                border-radius: 16px;
                overflow: hidden;
                max-width: 500px;
                width: 100%;
                margin: 16px;
            }
            .photo-capture-header {
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
                font-weight: 600;
            }
            .photo-capture-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
            }
            .photo-capture-preview {
                background: black;
                aspect-ratio: 4/3;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .photo-capture-preview video,
            .photo-capture-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .photo-capture-controls,
            .photo-capture-actions {
                padding: 20px;
                display: flex;
                justify-content: center;
                gap: 24px;
                background: #1a1d27;
            }
            .photo-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                border-radius: 50%;
                width: 56px;
                height: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
            }
            .photo-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.05);
            }
            .photo-btn-capture {
                width: 72px;
                height: 72px;
                background: white;
                color: #ef4444;
            }
            .photo-btn-capture:hover {
                background: #f5f5f5;
            }
            .photo-btn-retake,
            .photo-btn-use {
                border-radius: 8px;
                width: auto;
                padding: 12px 24px;
                font-weight: 600;
            }
            .photo-btn-use {
                background: #6366f1;
            }
            .photo-btn-use:hover {
                background: #818cf8;
            }
        `;
        modal.appendChild(style);

        // Wire up events
        const video = modal.querySelector('video');
        const canvas = modal.querySelector('canvas');
        const preview = modal.querySelector('.captured-preview');
        const controls = modal.querySelector('.photo-capture-controls');
        const actions = modal.querySelector('.photo-capture-actions');
        let facing = 'environment';
        let capturedBlob = null;

        // Close
        modal.querySelector('.photo-capture-close').onclick = () => {
            closeCamera();
            modal.remove();
            callbacks.onClose?.();
        };

        // Start camera
        openCamera({ facing }).then(stream => {
            video.srcObject = stream;
        }).catch(err => {
            console.error('Camera error:', err);
            callbacks.onError?.(err);
        });

        // Switch camera
        modal.querySelector('.photo-btn-switch').onclick = async () => {
            facing = facing === 'environment' ? 'user' : 'environment';
            try {
                const stream = await openCamera({ facing });
                video.srcObject = stream;
            } catch (err) {
                console.error('Camera switch error:', err);
            }
        };

        // Capture
        modal.querySelector('.photo-btn-capture').onclick = async () => {
            capturedBlob = await capturePhoto(video);
            preview.src = URL.createObjectURL(capturedBlob);
            video.style.display = 'none';
            preview.style.display = 'block';
            controls.style.display = 'none';
            actions.style.display = 'flex';
        };

        // Gallery
        modal.querySelector('.photo-btn-gallery').onclick = async () => {
            try {
                const files = await selectFromGallery();
                capturedBlob = files[0];
                preview.src = URL.createObjectURL(capturedBlob);
                video.style.display = 'none';
                preview.style.display = 'block';
                controls.style.display = 'none';
                actions.style.display = 'flex';
            } catch (err) {
                // User cancelled
            }
        };

        // Retake
        modal.querySelector('.photo-btn-retake').onclick = () => {
            URL.revokeObjectURL(preview.src);
            capturedBlob = null;
            preview.style.display = 'none';
            video.style.display = 'block';
            controls.style.display = 'flex';
            actions.style.display = 'none';
        };

        // Use photo
        modal.querySelector('.photo-btn-use').onclick = () => {
            closeCamera();
            callbacks.onCapture?.(capturedBlob);
            modal.remove();
        };

        return modal;
    }

    /**
     * Show photo capture modal
     * @returns {Promise<Blob>}
     */
    function showCaptureModal() {
        return new Promise((resolve, reject) => {
            const modal = createCameraModal({
                onCapture: (blob) => resolve(blob),
                onClose: () => reject(new Error('Cancelled')),
                onError: (err) => reject(err)
            });
            document.body.appendChild(modal);
        });
    }

    /**
     * Create lightbox for photo viewing
     * @param {string} src - Image URL
     * @param {Object} options - Lightbox options
     */
    function showLightbox(src, options = {}) {
        const lightbox = document.createElement('div');
        lightbox.className = 'photo-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-content">
                <img src="${src}" alt="${options.alt || 'Photo'}">
                <div class="lightbox-actions">
                    ${options.onDelete ? '<button class="lightbox-btn lightbox-delete">Delete</button>' : ''}
                    <button class="lightbox-btn lightbox-close">Close</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .photo-lightbox {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .lightbox-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.9);
            }
            .lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .lightbox-content img {
                max-width: 100%;
                max-height: calc(90vh - 60px);
                object-fit: contain;
                border-radius: 8px;
            }
            .lightbox-actions {
                margin-top: 16px;
                display: flex;
                gap: 12px;
            }
            .lightbox-btn {
                padding: 8px 20px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .lightbox-close {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            .lightbox-close:hover {
                background: rgba(255,255,255,0.2);
            }
            .lightbox-delete {
                background: rgba(239,68,68,0.2);
                color: #ef4444;
            }
            .lightbox-delete:hover {
                background: rgba(239,68,68,0.3);
            }
        `;
        lightbox.appendChild(style);

        const close = () => lightbox.remove();

        lightbox.querySelector('.lightbox-backdrop').onclick = close;
        lightbox.querySelector('.lightbox-close').onclick = close;

        const deleteBtn = lightbox.querySelector('.lightbox-delete');
        if (deleteBtn && options.onDelete) {
            deleteBtn.onclick = () => {
                if (confirm('Delete this photo?')) {
                    options.onDelete();
                    close();
                }
            };
        }

        document.body.appendChild(lightbox);
    }

    // ========================================
    // Background Sync Registration
    // ========================================

    async function registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('photo-upload-sync');
                console.log('[PhotoUtils] Background sync registered');
            } catch (error) {
                console.warn('[PhotoUtils] Background sync not available:', error);
            }
        }
    }

    // Auto-sync when coming online
    window.addEventListener('online', () => {
        console.log('[PhotoUtils] Online - syncing queue');
        syncOfflineQueue().then(result => {
            if (result.synced > 0) {
                console.log(`[PhotoUtils] Synced ${result.synced} photos`);
            }
        });
    });

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDB);
    } else {
        initDB();
    }

    // ========================================
    // Public API
    // ========================================

    return {
        // Camera
        openCamera,
        closeCamera,
        capturePhoto,
        quickCapture,

        // Gallery
        selectFromGallery,
        selectSingleImage,

        // Compression
        compressImage,
        generateThumbnail,

        // Upload
        uploadPhoto,
        uploadWithRetry,

        // Offline Queue
        queueForOfflineSync,
        getOfflineQueueStatus,
        syncOfflineQueue,
        clearOfflineQueue,

        // UI
        createCameraModal,
        showCaptureModal,
        showLightbox,

        // Background Sync
        registerBackgroundSync,

        // Config
        CONFIG
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhotoUtils;
}
