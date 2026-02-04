/**
 * ===============================================================================
 * TINY SEED OS - OFFLINE TASK MANAGER
 * ===============================================================================
 *
 * Mobile_Claude - 2026-02-03
 *
 * Enables task viewing and completion while offline with background sync.
 * Uses IndexedDB for reliable offline storage and queues actions for later sync.
 *
 * Usage:
 * <script src="web_app/offline-task-manager.js"></script>
 *
 * const taskManager = new OfflineTaskManager();
 * await taskManager.init();
 *
 * ===============================================================================
 */

class OfflineTaskManager {
    constructor(options = {}) {
        this.DB_NAME = options.dbName || 'TinySeedOfflineTasks';
        this.DB_VERSION = options.dbVersion || 1;
        this.API_URL = options.apiUrl || (typeof TINY_SEED_API !== 'undefined'
            ? TINY_SEED_API.MAIN_API
            : 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec');

        this.db = null;
        this.isInitialized = false;
        this.syncInProgress = false;

        // Event callbacks
        this.onSyncStart = options.onSyncStart || (() => {});
        this.onSyncComplete = options.onSyncComplete || (() => {});
        this.onSyncError = options.onSyncError || (() => {});
        this.onOfflineStatusChange = options.onOfflineStatusChange || (() => {});
        this.onPendingCountChange = options.onPendingCountChange || (() => {});

        // Bind methods
        this._handleOnline = this._handleOnline.bind(this);
        this._handleOffline = this._handleOffline.bind(this);
        this._handleServiceWorkerMessage = this._handleServiceWorkerMessage.bind(this);
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async init() {
        if (this.isInitialized) return this;

        try {
            await this._initDatabase();
            this._setupEventListeners();
            this._setupServiceWorkerListener();
            this.isInitialized = true;
            console.log('[OfflineTaskManager] Initialized successfully');
            return this;
        } catch (error) {
            console.error('[OfflineTaskManager] Initialization failed:', error);
            throw error;
        }
    }

    async _initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineTaskManager] IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[OfflineTaskManager] IndexedDB connected');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // =========================================================
                // STORE: offlineTasks - Cached tasks for offline viewing
                // =========================================================
                if (!db.objectStoreNames.contains('offlineTasks')) {
                    const taskStore = db.createObjectStore('offlineTasks', { keyPath: 'id' });
                    taskStore.createIndex('status', 'status');
                    taskStore.createIndex('assignee', 'assignee');
                    taskStore.createIndex('dueDate', 'dueDate');
                    taskStore.createIndex('priority', 'aiPriorityScore');
                    taskStore.createIndex('type', 'taskType');
                    taskStore.createIndex('localUpdatedAt', 'localUpdatedAt');
                }

                // =========================================================
                // STORE: pendingActions - Queue of actions to sync
                // =========================================================
                if (!db.objectStoreNames.contains('pendingActions')) {
                    const actionStore = db.createObjectStore('pendingActions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    actionStore.createIndex('taskId', 'taskId');
                    actionStore.createIndex('action', 'action');
                    actionStore.createIndex('createdAt', 'createdAt');
                    actionStore.createIndex('status', 'status');
                    actionStore.createIndex('retryCount', 'retryCount');
                }

                // =========================================================
                // STORE: syncMeta - Metadata about sync state
                // =========================================================
                if (!db.objectStoreNames.contains('syncMeta')) {
                    db.createObjectStore('syncMeta', { keyPath: 'key' });
                }

                console.log('[OfflineTaskManager] IndexedDB stores created');
            };
        });
    }

    _setupEventListeners() {
        window.addEventListener('online', this._handleOnline);
        window.addEventListener('offline', this._handleOffline);
    }

    _setupServiceWorkerListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', this._handleServiceWorkerMessage);
        }
    }

    _handleOnline() {
        console.log('[OfflineTaskManager] Device came online');
        this.onOfflineStatusChange(true);
        this.syncWhenOnline();
    }

    _handleOffline() {
        console.log('[OfflineTaskManager] Device went offline');
        this.onOfflineStatusChange(false);
    }

    _handleServiceWorkerMessage(event) {
        if (event.data && event.data.type === 'SYNC_AVAILABLE') {
            console.log('[OfflineTaskManager] Background sync triggered');
            this.syncWhenOnline();
        }
    }

    // =========================================================================
    // TASK CACHING - Store tasks for offline viewing
    // =========================================================================

    /**
     * Cache tasks for offline viewing
     * @param {Array} tasks - Array of task objects from API
     * @returns {Promise<number>} - Number of tasks cached
     */
    async cacheTasksForOffline(tasks) {
        if (!this.db) await this.init();
        if (!Array.isArray(tasks) || tasks.length === 0) return 0;

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('offlineTasks', 'readwrite');
            const store = tx.objectStore('offlineTasks');
            const now = new Date().toISOString();

            let cached = 0;

            tasks.forEach(task => {
                // Ensure task has required fields
                const taskData = {
                    id: task.id || task.taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ...task,
                    cachedAt: now,
                    localUpdatedAt: now,
                    localStatus: task.status || 'PENDING'
                };

                const request = store.put(taskData);
                request.onsuccess = () => cached++;
            });

            tx.oncomplete = async () => {
                // Update last sync timestamp
                await this._setMeta('lastTaskCache', now);
                console.log(`[OfflineTaskManager] Cached ${cached} tasks`);
                resolve(cached);
            };

            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Get cached tasks for offline viewing
     * @param {Object} filters - Optional filters (status, assignee, dueDate)
     * @returns {Promise<Array>} - Array of cached tasks
     */
    async getOfflineTasks(filters = {}) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('offlineTasks', 'readonly');
            const store = tx.objectStore('offlineTasks');
            const request = store.getAll();

            request.onsuccess = () => {
                let tasks = request.result || [];

                // Apply filters
                if (filters.status) {
                    tasks = tasks.filter(t => t.localStatus === filters.status || t.status === filters.status);
                }
                if (filters.assignee) {
                    tasks = tasks.filter(t => t.assignee === filters.assignee || t.assignedTo === filters.assignee);
                }
                if (filters.dueDate) {
                    tasks = tasks.filter(t => t.dueDate === filters.dueDate);
                }
                if (filters.type) {
                    tasks = tasks.filter(t => t.taskType === filters.type || t.type === filters.type);
                }

                // Sort by priority (highest first), then by due date
                tasks.sort((a, b) => {
                    const priorityDiff = (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0);
                    if (priorityDiff !== 0) return priorityDiff;
                    return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
                });

                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single cached task by ID
     * @param {string} taskId - Task ID
     * @returns {Promise<Object|null>} - Task object or null
     */
    async getOfflineTask(taskId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('offlineTasks', 'readonly');
            const store = tx.objectStore('offlineTasks');
            const request = store.get(taskId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a cached task locally (before syncing)
     * @param {string} taskId - Task ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} - Updated task
     */
    async updateLocalTask(taskId, updates) {
        if (!this.db) await this.init();

        return new Promise(async (resolve, reject) => {
            const tx = this.db.transaction('offlineTasks', 'readwrite');
            const store = tx.objectStore('offlineTasks');

            const getRequest = store.get(taskId);

            getRequest.onsuccess = () => {
                const task = getRequest.result;
                if (!task) {
                    reject(new Error(`Task ${taskId} not found in offline cache`));
                    return;
                }

                // Merge updates
                const updatedTask = {
                    ...task,
                    ...updates,
                    localUpdatedAt: new Date().toISOString(),
                    hasLocalChanges: true
                };

                // Update localStatus if status changed
                if (updates.status) {
                    updatedTask.localStatus = updates.status;
                }

                const putRequest = store.put(updatedTask);
                putRequest.onsuccess = () => resolve(updatedTask);
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // =========================================================================
    // ACTION QUEUE - Queue offline changes for later sync
    // =========================================================================

    /**
     * Queue an action to be synced when online
     * @param {string} action - Action type (complete, update, create, delete)
     * @param {string} taskId - Task ID
     * @param {Object} data - Action data
     * @returns {Promise<number>} - Queue item ID
     */
    async queueOfflineAction(action, taskId, data = {}) {
        if (!this.db) await this.init();

        const queueItem = {
            action: action,
            taskId: taskId,
            data: data,
            createdAt: new Date().toISOString(),
            status: 'pending',
            retryCount: 0,
            lastError: null
        };

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readwrite');
            const store = tx.objectStore('pendingActions');
            const request = store.add(queueItem);

            request.onsuccess = async () => {
                const id = request.result;
                console.log(`[OfflineTaskManager] Queued action: ${action} for task ${taskId}`);

                // Notify about pending count change
                const count = await this.getPendingActionCount();
                this.onPendingCountChange(count);

                // Try to register background sync
                this._registerBackgroundSync();

                resolve(id);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending actions
     * @returns {Promise<Array>} - Array of pending actions
     */
    async getPendingActions() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readonly');
            const store = tx.objectStore('pendingActions');
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => {
                const actions = request.result || [];
                // Sort by creation time (oldest first)
                actions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                resolve(actions);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get count of pending actions
     * @returns {Promise<number>} - Number of pending actions
     */
    async getPendingActionCount() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readonly');
            const store = tx.objectStore('pendingActions');
            const index = store.index('status');
            const request = index.count('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark an action as completed
     * @param {number} actionId - Action ID
     * @param {Object} serverResponse - Response from server
     */
    async _markActionComplete(actionId, serverResponse = null) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readwrite');
            const store = tx.objectStore('pendingActions');
            const getRequest = store.get(actionId);

            getRequest.onsuccess = () => {
                const action = getRequest.result;
                if (action) {
                    action.status = 'completed';
                    action.completedAt = new Date().toISOString();
                    action.serverResponse = serverResponse;

                    const putRequest = store.put(action);
                    putRequest.onsuccess = () => resolve(true);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(false);
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Mark an action as failed (with retry logic)
     * @param {number} actionId - Action ID
     * @param {string} error - Error message
     */
    async _markActionFailed(actionId, error) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readwrite');
            const store = tx.objectStore('pendingActions');
            const getRequest = store.get(actionId);

            getRequest.onsuccess = () => {
                const action = getRequest.result;
                if (action) {
                    action.retryCount++;
                    action.lastError = error;
                    action.lastAttempt = new Date().toISOString();

                    // Max 3 retries, then mark as failed
                    if (action.retryCount >= 3) {
                        action.status = 'failed';
                    }

                    const putRequest = store.put(action);
                    putRequest.onsuccess = () => resolve(true);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(false);
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // =========================================================================
    // SYNC - Process pending actions when online
    // =========================================================================

    /**
     * Sync all pending actions when online
     * @returns {Promise<Object>} - Sync result {success: number, failed: number, conflicts: number}
     */
    async syncWhenOnline() {
        if (!navigator.onLine) {
            console.log('[OfflineTaskManager] Cannot sync - offline');
            return { success: 0, failed: 0, conflicts: 0 };
        }

        if (this.syncInProgress) {
            console.log('[OfflineTaskManager] Sync already in progress');
            return { success: 0, failed: 0, conflicts: 0 };
        }

        this.syncInProgress = true;
        this.onSyncStart();

        const result = { success: 0, failed: 0, conflicts: 0 };

        try {
            const pendingActions = await this.getPendingActions();
            console.log(`[OfflineTaskManager] Syncing ${pendingActions.length} pending actions`);

            for (const action of pendingActions) {
                try {
                    const syncResult = await this._processAction(action);

                    if (syncResult.conflict) {
                        // Server wins - update local with server version
                        await this._handleConflict(action, syncResult.serverData);
                        result.conflicts++;
                        await this._markActionComplete(action.id, syncResult);
                    } else if (syncResult.success) {
                        await this._markActionComplete(action.id, syncResult);
                        result.success++;
                    } else {
                        await this._markActionFailed(action.id, syncResult.error);
                        result.failed++;
                    }
                } catch (error) {
                    console.error(`[OfflineTaskManager] Action ${action.id} failed:`, error);
                    await this._markActionFailed(action.id, error.message);
                    result.failed++;
                }
            }

            // Update last sync timestamp
            await this._setMeta('lastSync', new Date().toISOString());

            // Update pending count
            const newCount = await this.getPendingActionCount();
            this.onPendingCountChange(newCount);

            this.onSyncComplete(result);
            console.log('[OfflineTaskManager] Sync complete:', result);

        } catch (error) {
            console.error('[OfflineTaskManager] Sync error:', error);
            this.onSyncError(error);
        } finally {
            this.syncInProgress = false;
        }

        return result;
    }

    /**
     * Process a single action
     * @param {Object} action - Action to process
     * @returns {Promise<Object>} - Result {success, conflict, error, serverData}
     */
    async _processAction(action) {
        const { action: actionType, taskId, data } = action;

        let apiAction, apiData;

        switch (actionType) {
            case 'complete':
                apiAction = 'updateUnifiedTask';
                apiData = {
                    taskId: taskId,
                    status: 'DONE',
                    completedAt: data.completedAt || new Date().toISOString(),
                    completedBy: data.completedBy,
                    ...data
                };
                break;

            case 'update':
                apiAction = 'updateUnifiedTask';
                apiData = {
                    taskId: taskId,
                    ...data
                };
                break;

            case 'create':
                apiAction = 'createTask';
                apiData = {
                    ...data
                };
                break;

            case 'start':
                apiAction = 'updateUnifiedTask';
                apiData = {
                    taskId: taskId,
                    status: 'IN_PROGRESS',
                    startedAt: data.startedAt || new Date().toISOString(),
                    ...data
                };
                break;

            default:
                return { success: false, error: `Unknown action type: ${actionType}` };
        }

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: apiAction, ...apiData })
            });

            const result = await response.json();

            // Check for conflict (server has newer version)
            if (result.conflict || result.error === 'CONFLICT') {
                return {
                    success: false,
                    conflict: true,
                    serverData: result.currentData || result.task
                };
            }

            if (result.success || result.status === 'success') {
                return { success: true, serverData: result.task || result.data };
            } else {
                return { success: false, error: result.error || result.message || 'Unknown error' };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle sync conflict - server wins
     * @param {Object} action - The conflicting action
     * @param {Object} serverData - Server's version of the task
     */
    async _handleConflict(action, serverData) {
        if (serverData && action.taskId) {
            // Update local cache with server version
            const tx = this.db.transaction('offlineTasks', 'readwrite');
            const store = tx.objectStore('offlineTasks');

            const taskData = {
                ...serverData,
                id: action.taskId,
                localUpdatedAt: new Date().toISOString(),
                hasLocalChanges: false,
                conflictResolved: true,
                conflictResolvedAt: new Date().toISOString()
            };

            await new Promise((resolve, reject) => {
                const request = store.put(taskData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            console.log(`[OfflineTaskManager] Conflict resolved for task ${action.taskId} - server wins`);
        }
    }

    /**
     * Register background sync with service worker
     */
    async _registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-tasks');
                console.log('[OfflineTaskManager] Background sync registered');
            } catch (error) {
                console.log('[OfflineTaskManager] Background sync not available:', error);
            }
        }
    }

    // =========================================================================
    // SYNC METADATA
    // =========================================================================

    async _setMeta(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncMeta', 'readwrite');
            const store = tx.objectStore('syncMeta');
            const request = store.put({ key, value, updatedAt: new Date().toISOString() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async _getMeta(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('syncMeta', 'readonly');
            const store = tx.objectStore('syncMeta');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get last sync timestamp
     * @returns {Promise<string|null>} - ISO date string or null
     */
    async getLastSync() {
        return this._getMeta('lastSync');
    }

    /**
     * Get last task cache timestamp
     * @returns {Promise<string|null>} - ISO date string or null
     */
    async getLastTaskCache() {
        return this._getMeta('lastTaskCache');
    }

    // =========================================================================
    // CONVENIENCE METHODS - Common task operations
    // =========================================================================

    /**
     * Complete a task (works offline)
     * @param {string} taskId - Task ID
     * @param {Object} options - Additional data (completedBy, notes, etc.)
     * @returns {Promise<Object>} - Updated task
     */
    async completeTask(taskId, options = {}) {
        const completionData = {
            status: 'DONE',
            completedAt: new Date().toISOString(),
            ...options
        };

        // Update local cache
        const updatedTask = await this.updateLocalTask(taskId, completionData);

        // Queue for sync
        await this.queueOfflineAction('complete', taskId, completionData);

        return updatedTask;
    }

    /**
     * Start a task (works offline)
     * @param {string} taskId - Task ID
     * @param {Object} options - Additional data
     * @returns {Promise<Object>} - Updated task
     */
    async startTask(taskId, options = {}) {
        const startData = {
            status: 'IN_PROGRESS',
            startedAt: new Date().toISOString(),
            ...options
        };

        // Update local cache
        const updatedTask = await this.updateLocalTask(taskId, startData);

        // Queue for sync
        await this.queueOfflineAction('start', taskId, startData);

        return updatedTask;
    }

    /**
     * Update task (works offline)
     * @param {string} taskId - Task ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} - Updated task
     */
    async updateTask(taskId, updates) {
        // Update local cache
        const updatedTask = await this.updateLocalTask(taskId, updates);

        // Queue for sync
        await this.queueOfflineAction('update', taskId, updates);

        return updatedTask;
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================

    /**
     * Clear old completed actions (older than 7 days)
     */
    async cleanupOldActions() {
        if (!this.db) await this.init();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffISO = cutoffDate.toISOString();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('pendingActions', 'readwrite');
            const store = tx.objectStore('pendingActions');
            const request = store.openCursor();

            let deleted = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const action = cursor.value;
                    if (action.status === 'completed' && action.completedAt < cutoffISO) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                }
            };

            tx.oncomplete = () => {
                console.log(`[OfflineTaskManager] Cleaned up ${deleted} old actions`);
                resolve(deleted);
            };

            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Clear all cached tasks (for refresh)
     */
    async clearTaskCache() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('offlineTasks', 'readwrite');
            const store = tx.objectStore('offlineTasks');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[OfflineTaskManager] Task cache cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Destroy - cleanup event listeners
     */
    destroy() {
        window.removeEventListener('online', this._handleOnline);
        window.removeEventListener('offline', this._handleOffline);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', this._handleServiceWorkerMessage);
        }
        this.isInitialized = false;
        console.log('[OfflineTaskManager] Destroyed');
    }
}

// ===============================================================================
// OFFLINE UI COMPONENTS - Indicators and badges
// ===============================================================================

class OfflineUIManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.elements = {};
        this._createElements();
        this._setupCallbacks();
    }

    _createElements() {
        // Create offline banner if it doesn't exist
        if (!document.getElementById('offlineTaskBanner')) {
            const banner = document.createElement('div');
            banner.id = 'offlineTaskBanner';
            banner.className = 'offline-task-banner';
            banner.innerHTML = `
                <div class="offline-banner-content">
                    <i class="fas fa-wifi-slash"></i>
                    <span>Offline Mode</span>
                    <span class="pending-badge" id="pendingSyncBadge" style="display: none;">
                        <span class="pending-count">0</span> pending
                    </span>
                </div>
            `;
            document.body.appendChild(banner);
            this.elements.banner = banner;
        } else {
            this.elements.banner = document.getElementById('offlineTaskBanner');
        }

        // Create sync status indicator
        if (!document.getElementById('syncStatusIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'syncStatusIndicator';
            indicator.className = 'sync-status-indicator';
            indicator.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                <span class="sync-status-text">Synced</span>
            `;
            document.body.appendChild(indicator);
            this.elements.syncIndicator = indicator;
        } else {
            this.elements.syncIndicator = document.getElementById('syncStatusIndicator');
        }

        // Add styles
        this._addStyles();
    }

    _addStyles() {
        if (document.getElementById('offlineTaskManagerStyles')) return;

        const style = document.createElement('style');
        style.id = 'offlineTaskManagerStyles';
        style.textContent = `
            .offline-task-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
                padding: 8px 16px;
                z-index: 10000;
                transform: translateY(-100%);
                transition: transform 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .offline-task-banner.visible {
                transform: translateY(0);
            }

            /* Account for safe area on iOS */
            @supports (padding-top: env(safe-area-inset-top)) {
                .offline-task-banner.visible {
                    padding-top: calc(8px + env(safe-area-inset-top));
                }
            }

            .offline-banner-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
            }

            .offline-banner-content i {
                font-size: 16px;
            }

            .pending-badge {
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }

            .pending-badge .pending-count {
                font-weight: 700;
            }

            .sync-status-indicator {
                position: fixed;
                bottom: 80px;
                right: 16px;
                background: #2d5a27;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 9999;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .sync-status-indicator.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .sync-status-indicator.syncing {
                background: #3498db;
            }

            .sync-status-indicator.syncing i {
                animation: spin 1s linear infinite;
            }

            .sync-status-indicator.error {
                background: #e74c3c;
            }

            .sync-status-indicator.success {
                background: #27ae60;
            }

            .sync-status-indicator.has-pending {
                background: #f39c12;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Body padding when offline banner is visible */
            body.has-offline-banner {
                padding-top: 40px;
            }

            @supports (padding-top: env(safe-area-inset-top)) {
                body.has-offline-banner {
                    padding-top: calc(40px + env(safe-area-inset-top));
                }
            }
        `;
        document.head.appendChild(style);
    }

    _setupCallbacks() {
        // Wire up task manager callbacks
        this.taskManager.onOfflineStatusChange = (isOnline) => {
            this.setOfflineStatus(!isOnline);
        };

        this.taskManager.onPendingCountChange = (count) => {
            this.setPendingCount(count);
        };

        this.taskManager.onSyncStart = () => {
            this.showSyncStatus('syncing', 'Syncing...');
        };

        this.taskManager.onSyncComplete = (result) => {
            if (result.success > 0 || result.conflicts > 0) {
                this.showSyncStatus('success', `Synced ${result.success} tasks`, 3000);
            }
            if (result.conflicts > 0) {
                this.showSyncStatus('warning', `${result.conflicts} conflicts resolved`, 3000);
            }
        };

        this.taskManager.onSyncError = (error) => {
            this.showSyncStatus('error', 'Sync failed', 5000);
        };

        // Set initial state
        this.setOfflineStatus(!navigator.onLine);
    }

    setOfflineStatus(isOffline) {
        if (isOffline) {
            this.elements.banner.classList.add('visible');
            document.body.classList.add('has-offline-banner');
        } else {
            this.elements.banner.classList.remove('visible');
            document.body.classList.remove('has-offline-banner');
        }
    }

    setPendingCount(count) {
        const badge = this.elements.banner.querySelector('.pending-badge');
        const countEl = badge.querySelector('.pending-count');

        if (count > 0) {
            countEl.textContent = count;
            badge.style.display = 'inline-flex';

            // Also update sync indicator if not currently syncing
            if (!this.elements.syncIndicator.classList.contains('syncing')) {
                this.showSyncStatus('has-pending', `${count} pending`, 0);
            }
        } else {
            badge.style.display = 'none';
            this.hideSyncStatus();
        }
    }

    showSyncStatus(type, text, duration = 0) {
        const indicator = this.elements.syncIndicator;
        const textEl = indicator.querySelector('.sync-status-text');

        indicator.className = 'sync-status-indicator visible ' + type;
        textEl.textContent = text;

        if (duration > 0) {
            setTimeout(() => {
                this.hideSyncStatus();
            }, duration);
        }
    }

    hideSyncStatus() {
        this.elements.syncIndicator.classList.remove('visible');
    }
}

// ===============================================================================
// EXPORT FOR USE IN HTML FILES
// ===============================================================================

window.OfflineTaskManager = OfflineTaskManager;
window.OfflineUIManager = OfflineUIManager;

console.log('[OfflineTaskManager] Module loaded');
