/**
 * =============================================================================
 * RBAC-UI - Permission-Aware Document Access UI
 * =============================================================================
 *
 * Phase 2 of Project "Sovereign Seed" - RBAC Frontend
 *
 * Provides:
 * 1. Permission indicator badges on document cards
 * 2. Access denied modal with explanation
 * 3. Permission request button
 * 4. Access log viewer for admins
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude
 * =============================================================================
 */

// =============================================================================
// PERMISSION ENUM (mirrors Python)
// =============================================================================

const Permission = {
    NONE: 'none',
    VIEW: 'view',
    COMMENT: 'comment',
    EDIT: 'edit',
    OWNER: 'owner',

    // Permission hierarchy for comparison
    hierarchy: ['none', 'view', 'comment', 'edit', 'owner'],

    // Check if perm1 >= perm2
    isAtLeast(perm1, perm2) {
        return this.hierarchy.indexOf(perm1) >= this.hierarchy.indexOf(perm2);
    },

    // Get display label
    getLabel(perm) {
        const labels = {
            none: 'No Access',
            view: 'View Only',
            comment: 'Can Comment',
            edit: 'Can Edit',
            owner: 'Owner'
        };
        return labels[perm] || perm;
    },

    // Get badge color
    getColor(perm) {
        const colors = {
            none: '#dc3545',     // Red
            view: '#6c757d',     // Gray
            comment: '#17a2b8',  // Cyan
            edit: '#28a745',     // Green
            owner: '#6f42c1'     // Purple
        };
        return colors[perm] || '#6c757d';
    },

    // Get icon
    getIcon(perm) {
        const icons = {
            none: '\u{1F6AB}',      // Prohibited
            view: '\u{1F441}',      // Eye
            comment: '\u{1F4AC}',   // Speech bubble
            edit: '\u{270F}',       // Pencil
            owner: '\u{1F451}'      // Crown
        };
        return icons[perm] || '';
    }
};

// =============================================================================
// RBAC API CLIENT
// =============================================================================

class RBACClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this._permissionCache = new Map();
        this._cacheExpiry = new Map();
        this._cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check permission for a document
     */
    async checkPermission(documentId, required = 'view') {
        try {
            const response = await fetch(`${this.baseUrl}/api/rbac/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_id: documentId, required })
            });

            if (!response.ok) {
                throw new Error(`Permission check failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                allowed: data.allowed,
                actual: data.permission_actual || Permission.NONE,
                required: required,
                reason: data.reason || ''
            };
        } catch (error) {
            console.error('[RBAC] Permission check error:', error);
            // FAIL CLOSED
            return {
                allowed: false,
                actual: Permission.NONE,
                required: required,
                reason: 'Permission check failed'
            };
        }
    }

    /**
     * Get permission level for a document (with caching)
     */
    async getPermission(documentId) {
        // Check cache
        const cacheKey = documentId;
        const expiry = this._cacheExpiry.get(cacheKey);

        if (expiry && Date.now() < expiry) {
            return this._permissionCache.get(cacheKey);
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/rbac/permission?document_id=${encodeURIComponent(documentId)}`);

            if (!response.ok) {
                throw new Error(`Get permission failed: ${response.status}`);
            }

            const data = await response.json();
            const permission = data.permission || Permission.NONE;

            // Cache result
            this._permissionCache.set(cacheKey, permission);
            this._cacheExpiry.set(cacheKey, Date.now() + this._cacheTTL);

            return permission;
        } catch (error) {
            console.error('[RBAC] Get permission error:', error);
            return Permission.NONE;
        }
    }

    /**
     * Batch get permissions for multiple documents
     */
    async getPermissions(documentIds) {
        try {
            const response = await fetch(`${this.baseUrl}/api/rbac/permissions/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_ids: documentIds })
            });

            if (!response.ok) {
                throw new Error(`Batch permission check failed: ${response.status}`);
            }

            const data = await response.json();
            const permissions = data.permissions || {};

            // Cache results
            for (const [docId, perm] of Object.entries(permissions)) {
                this._permissionCache.set(docId, perm);
                this._cacheExpiry.set(docId, Date.now() + this._cacheTTL);
            }

            return permissions;
        } catch (error) {
            console.error('[RBAC] Batch permission error:', error);
            // Return none for all
            const result = {};
            documentIds.forEach(id => { result[id] = Permission.NONE; });
            return result;
        }
    }

    /**
     * Get access log (admin only)
     */
    async getAccessLog(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.user_id) params.append('user_id', options.user_id);
            if (options.document_id) params.append('document_id', options.document_id);
            if (options.denied_only) params.append('denied_only', 'true');
            if (options.limit) params.append('limit', options.limit.toString());

            const response = await fetch(`${this.baseUrl}/api/rbac/access-log?${params}`);

            if (!response.ok) {
                throw new Error(`Access log fetch failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[RBAC] Access log error:', error);
            return { attempts: [], error: error.message };
        }
    }

    /**
     * Get access statistics (admin only)
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/rbac/stats`);

            if (!response.ok) {
                throw new Error(`Stats fetch failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[RBAC] Stats error:', error);
            return { error: error.message };
        }
    }

    /**
     * Request permission (sends request to admin)
     */
    async requestPermission(documentId, requestedLevel, reason) {
        try {
            const response = await fetch(`${this.baseUrl}/api/rbac/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: documentId,
                    requested_permission: requestedLevel,
                    reason: reason
                })
            });

            if (!response.ok) {
                throw new Error(`Permission request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[RBAC] Permission request error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear permission cache
     */
    clearCache(documentId = null) {
        if (documentId) {
            this._permissionCache.delete(documentId);
            this._cacheExpiry.delete(documentId);
        } else {
            this._permissionCache.clear();
            this._cacheExpiry.clear();
        }
    }
}

// =============================================================================
// PERMISSION BADGE COMPONENT
// =============================================================================

class PermissionBadge {
    /**
     * Create a permission badge element
     */
    static create(permission, options = {}) {
        const badge = document.createElement('span');
        badge.className = 'rbac-permission-badge';
        badge.setAttribute('data-permission', permission);

        const color = Permission.getColor(permission);
        const icon = options.showIcon ? Permission.getIcon(permission) + ' ' : '';
        const label = options.compact ? permission.toUpperCase() : Permission.getLabel(permission);

        badge.innerHTML = `${icon}${label}`;
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: white;
            background-color: ${color};
            cursor: ${options.clickable ? 'pointer' : 'default'};
        `;

        if (options.tooltip) {
            badge.title = options.tooltip;
        }

        return badge;
    }

    /**
     * Add permission badge to an element
     */
    static addTo(element, permission, options = {}) {
        const badge = this.create(permission, options);
        element.appendChild(badge);
        return badge;
    }

    /**
     * Update an existing badge
     */
    static update(badge, newPermission) {
        badge.setAttribute('data-permission', newPermission);
        badge.style.backgroundColor = Permission.getColor(newPermission);
        badge.textContent = Permission.getLabel(newPermission);
    }
}

// =============================================================================
// ACCESS DENIED MODAL
// =============================================================================

class AccessDeniedModal {
    constructor() {
        this._modal = null;
        this._onRequestPermission = null;
    }

    /**
     * Show access denied modal
     */
    show(options = {}) {
        const {
            documentId = '',
            documentTitle = 'this document',
            requiredPermission = 'view',
            currentPermission = 'none',
            reason = '',
            allowRequest = true,
            onRequestPermission = null
        } = options;

        this._onRequestPermission = onRequestPermission;

        // Create modal if not exists
        if (!this._modal) {
            this._createModal();
        }

        // Update content
        const titleEl = this._modal.querySelector('.rbac-modal-doc-title');
        const requiredEl = this._modal.querySelector('.rbac-required-permission');
        const currentEl = this._modal.querySelector('.rbac-current-permission');
        const reasonEl = this._modal.querySelector('.rbac-denial-reason');
        const requestBtn = this._modal.querySelector('.rbac-request-btn');

        if (titleEl) titleEl.textContent = documentTitle;
        if (requiredEl) {
            requiredEl.innerHTML = '';
            PermissionBadge.addTo(requiredEl, requiredPermission, { showIcon: true });
        }
        if (currentEl) {
            currentEl.innerHTML = '';
            PermissionBadge.addTo(currentEl, currentPermission, { showIcon: true });
        }
        if (reasonEl) {
            reasonEl.textContent = reason || 'You do not have sufficient permissions to access this resource.';
        }
        if (requestBtn) {
            requestBtn.style.display = allowRequest ? 'inline-flex' : 'none';
            requestBtn.setAttribute('data-document-id', documentId);
            requestBtn.setAttribute('data-required-permission', requiredPermission);
        }

        // Show modal
        this._modal.style.display = 'flex';
        this._modal.offsetHeight; // Force reflow
        this._modal.classList.add('rbac-modal-visible');
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this._modal) {
            this._modal.classList.remove('rbac-modal-visible');
            setTimeout(() => {
                this._modal.style.display = 'none';
            }, 200);
        }
    }

    _createModal() {
        this._modal = document.createElement('div');
        this._modal.className = 'rbac-access-denied-modal';
        this._modal.innerHTML = `
            <div class="rbac-modal-backdrop"></div>
            <div class="rbac-modal-content">
                <div class="rbac-modal-header">
                    <span class="rbac-modal-icon">\u{1F6AB}</span>
                    <h3>Access Denied</h3>
                </div>
                <div class="rbac-modal-body">
                    <p>You cannot access <strong class="rbac-modal-doc-title">this document</strong>.</p>

                    <div class="rbac-permission-comparison">
                        <div class="rbac-perm-item">
                            <span class="rbac-perm-label">Required:</span>
                            <span class="rbac-required-permission"></span>
                        </div>
                        <div class="rbac-perm-item">
                            <span class="rbac-perm-label">You have:</span>
                            <span class="rbac-current-permission"></span>
                        </div>
                    </div>

                    <p class="rbac-denial-reason"></p>
                </div>
                <div class="rbac-modal-footer">
                    <button class="rbac-request-btn" type="button">
                        <span>\u{1F4E7}</span> Request Access
                    </button>
                    <button class="rbac-close-btn" type="button">Close</button>
                </div>
            </div>
        `;

        // Add styles
        this._addStyles();

        // Add event listeners
        const backdrop = this._modal.querySelector('.rbac-modal-backdrop');
        const closeBtn = this._modal.querySelector('.rbac-close-btn');
        const requestBtn = this._modal.querySelector('.rbac-request-btn');

        backdrop.addEventListener('click', () => this.hide());
        closeBtn.addEventListener('click', () => this.hide());
        requestBtn.addEventListener('click', () => this._handleRequestAccess());

        document.body.appendChild(this._modal);
    }

    _addStyles() {
        if (document.getElementById('rbac-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'rbac-modal-styles';
        style.textContent = `
            .rbac-access-denied-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .rbac-access-denied-modal.rbac-modal-visible {
                opacity: 1;
            }
            .rbac-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            .rbac-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 440px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.2s ease;
            }
            .rbac-modal-visible .rbac-modal-content {
                transform: scale(1);
            }
            .rbac-modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
            }
            .rbac-modal-icon {
                font-size: 24px;
            }
            .rbac-modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #dc3545;
            }
            .rbac-modal-body {
                padding: 20px 24px;
            }
            .rbac-modal-body p {
                margin: 0 0 16px;
                color: #374151;
                line-height: 1.5;
            }
            .rbac-modal-doc-title {
                color: #111827;
            }
            .rbac-permission-comparison {
                background: #f9fafb;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
            }
            .rbac-perm-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
            }
            .rbac-perm-item:first-child {
                border-bottom: 1px solid #e5e7eb;
            }
            .rbac-perm-label {
                font-size: 13px;
                color: #6b7280;
            }
            .rbac-denial-reason {
                font-size: 13px;
                color: #6b7280;
                font-style: italic;
            }
            .rbac-modal-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding: 16px 24px;
                border-top: 1px solid #e5e7eb;
            }
            .rbac-modal-footer button {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                border: none;
                transition: background 0.15s ease;
            }
            .rbac-close-btn {
                background: #e5e7eb;
                color: #374151;
            }
            .rbac-close-btn:hover {
                background: #d1d5db;
            }
            .rbac-request-btn {
                background: #3b82f6;
                color: white;
            }
            .rbac-request-btn:hover {
                background: #2563eb;
            }
        `;
        document.head.appendChild(style);
    }

    async _handleRequestAccess() {
        const requestBtn = this._modal.querySelector('.rbac-request-btn');
        const documentId = requestBtn.getAttribute('data-document-id');
        const requiredPermission = requestBtn.getAttribute('data-required-permission');

        if (this._onRequestPermission) {
            await this._onRequestPermission(documentId, requiredPermission);
        }

        this.hide();
    }
}

// =============================================================================
// ACCESS LOG VIEWER (Admin)
// =============================================================================

class AccessLogViewer {
    constructor(container, rbacClient) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        this.rbacClient = rbacClient;
        this._currentFilter = {};
    }

    /**
     * Render the access log viewer
     */
    async render(options = {}) {
        if (!this.container) return;

        // Add viewer HTML
        this.container.innerHTML = `
            <div class="rbac-log-viewer">
                <div class="rbac-log-header">
                    <h3>Access Log</h3>
                    <div class="rbac-log-filters">
                        <select class="rbac-filter-type">
                            <option value="">All Attempts</option>
                            <option value="denied">Denied Only</option>
                        </select>
                        <input type="text" class="rbac-filter-user" placeholder="Filter by user...">
                        <button class="rbac-refresh-btn" type="button">\u{1F504} Refresh</button>
                    </div>
                </div>
                <div class="rbac-log-stats"></div>
                <div class="rbac-log-entries"></div>
                <div class="rbac-log-pagination">
                    <button class="rbac-load-more-btn" type="button">Load More</button>
                </div>
            </div>
        `;

        // Add styles
        this._addStyles();

        // Add event listeners
        this._setupEventListeners();

        // Load initial data
        await this._loadData();
    }

    async _loadData() {
        const entriesContainer = this.container.querySelector('.rbac-log-entries');
        const statsContainer = this.container.querySelector('.rbac-log-stats');

        // Show loading
        entriesContainer.innerHTML = '<div class="rbac-loading">Loading access log...</div>';

        // Fetch data
        const [logData, statsData] = await Promise.all([
            this.rbacClient.getAccessLog(this._currentFilter),
            this.rbacClient.getStats()
        ]);

        // Render stats
        if (statsData && !statsData.error) {
            const stats = statsData.last_24h || {};
            statsContainer.innerHTML = `
                <div class="rbac-stat-cards">
                    <div class="rbac-stat-card">
                        <div class="rbac-stat-value">${stats.total_attempts || 0}</div>
                        <div class="rbac-stat-label">Total (24h)</div>
                    </div>
                    <div class="rbac-stat-card rbac-stat-allowed">
                        <div class="rbac-stat-value">${stats.allowed || 0}</div>
                        <div class="rbac-stat-label">Allowed</div>
                    </div>
                    <div class="rbac-stat-card rbac-stat-denied">
                        <div class="rbac-stat-value">${stats.denied || 0}</div>
                        <div class="rbac-stat-label">Denied</div>
                    </div>
                    <div class="rbac-stat-card">
                        <div class="rbac-stat-value">${stats.avg_duration_ms || 0}ms</div>
                        <div class="rbac-stat-label">Avg Check Time</div>
                    </div>
                </div>
            `;
        }

        // Render entries
        const attempts = logData.attempts || [];

        if (attempts.length === 0) {
            entriesContainer.innerHTML = '<div class="rbac-empty">No access attempts found.</div>';
            return;
        }

        entriesContainer.innerHTML = attempts.map(attempt => this._renderEntry(attempt)).join('');
    }

    _renderEntry(attempt) {
        const statusClass = attempt.allowed ? 'rbac-entry-allowed' : 'rbac-entry-denied';
        const statusIcon = attempt.allowed ? '\u{2705}' : '\u{274C}';
        const timestamp = new Date(attempt.timestamp).toLocaleString();

        return `
            <div class="rbac-log-entry ${statusClass}">
                <div class="rbac-entry-status">${statusIcon}</div>
                <div class="rbac-entry-main">
                    <div class="rbac-entry-user">${attempt.user_email || attempt.user_id}</div>
                    <div class="rbac-entry-document">${attempt.document_title || attempt.document_id}</div>
                    <div class="rbac-entry-action">${attempt.action}</div>
                </div>
                <div class="rbac-entry-permissions">
                    <span class="rbac-perm-badge" style="background: ${Permission.getColor(attempt.permission_required)}">
                        Need: ${attempt.permission_required}
                    </span>
                    <span class="rbac-perm-badge" style="background: ${Permission.getColor(attempt.permission_actual)}">
                        Has: ${attempt.permission_actual}
                    </span>
                </div>
                <div class="rbac-entry-time">${timestamp}</div>
                ${attempt.reason ? `<div class="rbac-entry-reason">${attempt.reason}</div>` : ''}
            </div>
        `;
    }

    _setupEventListeners() {
        const filterType = this.container.querySelector('.rbac-filter-type');
        const filterUser = this.container.querySelector('.rbac-filter-user');
        const refreshBtn = this.container.querySelector('.rbac-refresh-btn');
        const loadMoreBtn = this.container.querySelector('.rbac-load-more-btn');

        filterType.addEventListener('change', (e) => {
            this._currentFilter.denied_only = e.target.value === 'denied';
            this._loadData();
        });

        filterUser.addEventListener('input', this._debounce((e) => {
            this._currentFilter.user_id = e.target.value || undefined;
            this._loadData();
        }, 300));

        refreshBtn.addEventListener('click', () => {
            this.rbacClient.clearCache();
            this._loadData();
        });

        loadMoreBtn.addEventListener('click', () => {
            this._currentFilter.limit = (this._currentFilter.limit || 20) + 20;
            this._loadData();
        });
    }

    _debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    _addStyles() {
        if (document.getElementById('rbac-log-viewer-styles')) return;

        const style = document.createElement('style');
        style.id = 'rbac-log-viewer-styles';
        style.textContent = `
            .rbac-log-viewer {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .rbac-log-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            .rbac-log-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            .rbac-log-filters {
                display: flex;
                gap: 8px;
            }
            .rbac-log-filters select,
            .rbac-log-filters input {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 13px;
            }
            .rbac-refresh-btn {
                padding: 8px 12px;
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
            }
            .rbac-refresh-btn:hover {
                background: #e5e7eb;
            }
            .rbac-stat-cards {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }
            .rbac-stat-card {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }
            .rbac-stat-value {
                font-size: 24px;
                font-weight: 700;
                color: #111827;
            }
            .rbac-stat-label {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
            }
            .rbac-stat-allowed {
                background: #ecfdf5;
            }
            .rbac-stat-allowed .rbac-stat-value {
                color: #059669;
            }
            .rbac-stat-denied {
                background: #fef2f2;
            }
            .rbac-stat-denied .rbac-stat-value {
                color: #dc2626;
            }
            .rbac-log-entries {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }
            .rbac-log-entry {
                display: grid;
                grid-template-columns: 40px 1fr auto auto;
                gap: 12px;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #f3f4f6;
            }
            .rbac-log-entry:last-child {
                border-bottom: none;
            }
            .rbac-entry-status {
                font-size: 18px;
                text-align: center;
            }
            .rbac-entry-user {
                font-weight: 500;
                color: #111827;
            }
            .rbac-entry-document {
                font-size: 13px;
                color: #6b7280;
            }
            .rbac-entry-action {
                font-size: 12px;
                color: #9ca3af;
                text-transform: uppercase;
            }
            .rbac-entry-permissions {
                display: flex;
                gap: 6px;
            }
            .rbac-perm-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                color: white;
                text-transform: uppercase;
            }
            .rbac-entry-time {
                font-size: 12px;
                color: #9ca3af;
                text-align: right;
            }
            .rbac-entry-reason {
                grid-column: 2 / -1;
                font-size: 12px;
                color: #f59e0b;
                font-style: italic;
            }
            .rbac-entry-denied {
                background: #fef2f2;
            }
            .rbac-loading, .rbac-empty {
                padding: 40px;
                text-align: center;
                color: #6b7280;
            }
            .rbac-log-pagination {
                margin-top: 16px;
                text-align: center;
            }
            .rbac-load-more-btn {
                padding: 10px 24px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            }
            .rbac-load-more-btn:hover {
                background: #2563eb;
            }
        `;
        document.head.appendChild(style);
    }
}

// =============================================================================
// DOCUMENT CARD ENHANCER
// =============================================================================

class DocumentCardEnhancer {
    constructor(rbacClient) {
        this.rbacClient = rbacClient;
        this.modal = new AccessDeniedModal();
    }

    /**
     * Enhance document cards with permission badges and access control
     */
    async enhanceCards(cards, options = {}) {
        // Collect document IDs
        const documentIds = [];
        const cardMap = new Map();

        cards.forEach(card => {
            const docId = card.getAttribute('data-document-id');
            if (docId) {
                documentIds.push(docId);
                cardMap.set(docId, card);
            }
        });

        if (documentIds.length === 0) return;

        // Batch fetch permissions
        const permissions = await this.rbacClient.getPermissions(documentIds);

        // Enhance each card
        for (const [docId, card] of cardMap) {
            const permission = permissions[docId] || Permission.NONE;
            this._enhanceCard(card, docId, permission, options);
        }
    }

    _enhanceCard(card, documentId, permission, options = {}) {
        // Add permission badge
        let badgeContainer = card.querySelector('.rbac-badge-container');
        if (!badgeContainer) {
            badgeContainer = document.createElement('div');
            badgeContainer.className = 'rbac-badge-container';
            badgeContainer.style.cssText = 'position: absolute; top: 8px; right: 8px;';

            // Make card position relative if not already
            if (getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }

            card.appendChild(badgeContainer);
        }

        badgeContainer.innerHTML = '';
        PermissionBadge.addTo(badgeContainer, permission, {
            compact: true,
            showIcon: true,
            tooltip: Permission.getLabel(permission)
        });

        // Add click handler for access control
        const requiredPermission = options.requiredPermission || Permission.VIEW;

        if (!Permission.isAtLeast(permission, requiredPermission)) {
            // Disable the card or show locked state
            card.style.opacity = '0.7';
            card.style.cursor = 'not-allowed';

            // Remove any existing click handlers and add our own
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.modal.show({
                    documentId: documentId,
                    documentTitle: card.getAttribute('data-document-title') || 'this document',
                    requiredPermission: requiredPermission,
                    currentPermission: permission,
                    allowRequest: options.allowRequest !== false,
                    onRequestPermission: options.onRequestPermission
                });
            }, { capture: true });
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Create global instances
const rbacClient = new RBACClient();
const accessDeniedModal = new AccessDeniedModal();
const documentCardEnhancer = new DocumentCardEnhancer(rbacClient);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Permission,
        RBACClient,
        PermissionBadge,
        AccessDeniedModal,
        AccessLogViewer,
        DocumentCardEnhancer,
        rbacClient,
        accessDeniedModal,
        documentCardEnhancer
    };
}

// Make available globally
window.RBAC = {
    Permission,
    RBACClient,
    PermissionBadge,
    AccessDeniedModal,
    AccessLogViewer,
    DocumentCardEnhancer,
    client: rbacClient,
    modal: accessDeniedModal,
    enhancer: documentCardEnhancer
};
