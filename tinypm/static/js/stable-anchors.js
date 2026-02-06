/**
 * TinyPM Stable Anchor Citation System - Frontend Module
 * ========================================================
 * Forensic RAG Infrastructure for Verifiable AI Citations
 *
 * Features:
 * - Citation badges on AI responses with verification status
 * - Click to expand and see quoted text
 * - Verification indicator (verified, stale, invalid)
 * - Anchor health monitor for developer dashboard
 * - Real-time verification status updates
 *
 * Part of Project "Sovereign Seed" - Phase 1
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude
 */

const StableAnchors = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        apiBase: '/api',
        verificationPollInterval: 30000, // 30 seconds
        maxCitationsExpanded: 3,
        animationDuration: 200,
        healthRefreshInterval: 60000 // 1 minute
    },

    // State
    _anchors: new Map(),
    _verificationCache: new Map(),
    _healthData: null,
    _pollInterval: null,

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this._setupEventListeners();
        console.log('[StableAnchors] Initialized');
    },

    _setupEventListeners() {
        // Global click handler for citation badges
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.citation-badge');
            if (badge) {
                this._handleBadgeClick(badge);
            }

            const verifyBtn = e.target.closest('.citation-verify-btn');
            if (verifyBtn) {
                const anchorId = verifyBtn.dataset.anchorId;
                if (anchorId) {
                    this.verifyAnchor(anchorId);
                }
            }
        });
    },

    // =========================================================================
    // CITATION BADGES - For AI Responses
    // =========================================================================
    /**
     * Create a citation badge for display in AI responses
     *
     * @param {Object} anchor - Anchor data from backend
     * @param {string} anchor.id - Anchor ID
     * @param {string} anchor.citation - Human-readable citation
     * @param {string} anchor.text - Cited text
     * @param {string} anchor.document - Document title
     * @param {string} anchor.hash - Short hash (8 chars)
     * @param {string} anchor.status - Verification status
     * @returns {HTMLElement} Citation badge element
     */
    createCitationBadge(anchor) {
        const badge = document.createElement('span');
        badge.className = `citation-badge ${this._getStatusClass(anchor.status)}`;
        badge.dataset.anchorId = anchor.id;

        const statusIcon = this._getStatusIcon(anchor.status);
        const documentShort = this._truncate(anchor.document, 15);

        badge.innerHTML = `
            <span class="citation-icon">${statusIcon}</span>
            <span class="citation-label">${documentShort}</span>
            <span class="citation-hash">${anchor.hash}</span>
        `;

        // Store anchor data
        this._anchors.set(anchor.id, anchor);

        return badge;
    },

    /**
     * Create an inline citation with expandable details
     */
    createInlineCitation(anchor) {
        const container = document.createElement('span');
        container.className = 'citation-inline';
        container.dataset.anchorId = anchor.id;

        const badge = this.createCitationBadge(anchor);
        container.appendChild(badge);

        // Store for expansion
        this._anchors.set(anchor.id, anchor);

        return container;
    },

    /**
     * Create citation panel with full details
     */
    createCitationPanel(anchor) {
        const panel = document.createElement('div');
        panel.className = `citation-panel ${this._getStatusClass(anchor.status)}`;
        panel.dataset.anchorId = anchor.id;

        const statusInfo = this._getStatusInfo(anchor.status);

        panel.innerHTML = `
            <div class="citation-panel-header">
                <div class="citation-panel-title">
                    <span class="citation-status-icon">${statusInfo.icon}</span>
                    <span class="citation-doc-title">${this._escapeHtml(anchor.document)}</span>
                </div>
                <div class="citation-panel-status">
                    <span class="status-badge ${anchor.status}">${statusInfo.label}</span>
                </div>
            </div>
            <div class="citation-panel-body">
                <div class="citation-text-block">
                    <div class="citation-text-label">Cited Text:</div>
                    <blockquote class="citation-quote">"${this._escapeHtml(anchor.text)}"</blockquote>
                </div>
                <div class="citation-meta">
                    <div class="citation-meta-item">
                        <span class="meta-label">Location:</span>
                        <span class="meta-value">${anchor.start || '?'} - ${anchor.end || '?'}</span>
                    </div>
                    <div class="citation-meta-item">
                        <span class="meta-label">Hash:</span>
                        <code class="meta-hash">${anchor.hash}</code>
                    </div>
                    <div class="citation-meta-item">
                        <span class="meta-label">Confidence:</span>
                        <span class="meta-value">${Math.round((anchor.confidence || 1) * 100)}%</span>
                    </div>
                </div>
            </div>
            <div class="citation-panel-actions">
                <button class="citation-verify-btn" data-anchor-id="${anchor.id}">
                    Verify Now
                </button>
                <button class="citation-copy-btn" onclick="StableAnchors.copyCitation('${anchor.id}')">
                    Copy Citation
                </button>
            </div>
        `;

        return panel;
    },

    /**
     * Render citations within a container (replaces [cite:xxx] markers)
     */
    renderCitations(container, anchors) {
        if (!Array.isArray(anchors)) return;

        // Store all anchors
        anchors.forEach(anchor => {
            this._anchors.set(anchor.id, anchor);
        });

        // Find citation markers and replace
        const html = container.innerHTML;
        let newHtml = html;

        anchors.forEach(anchor => {
            const marker = `[cite:${anchor.id}]`;
            if (html.includes(marker)) {
                const badge = this.createCitationBadge(anchor);
                newHtml = newHtml.replace(marker, badge.outerHTML);
            }
        });

        container.innerHTML = newHtml;
    },

    // =========================================================================
    // CITATION EXPANSION
    // =========================================================================
    _handleBadgeClick(badge) {
        const anchorId = badge.dataset.anchorId;
        const anchor = this._anchors.get(anchorId);

        if (!anchor) {
            console.warn('[StableAnchors] Anchor not found:', anchorId);
            return;
        }

        // Check if already expanded
        const existing = badge.parentElement.querySelector('.citation-panel');
        if (existing) {
            existing.remove();
            badge.classList.remove('expanded');
            return;
        }

        // Create and insert panel
        const panel = this.createCitationPanel(anchor);
        badge.classList.add('expanded');

        // Insert after badge
        badge.parentElement.insertBefore(panel, badge.nextSibling);

        // Animate in
        requestAnimationFrame(() => {
            panel.classList.add('visible');
        });
    },

    // =========================================================================
    // VERIFICATION
    // =========================================================================
    async verifyAnchor(anchorId) {
        try {
            const btn = document.querySelector(`.citation-verify-btn[data-anchor-id="${anchorId}"]`);
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Verifying...';
            }

            const response = await fetch(`${this.config.apiBase}/anchors/${anchorId}/verify`);
            const result = await response.json();

            // Update cache
            this._verificationCache.set(anchorId, {
                result,
                timestamp: Date.now()
            });

            // Update anchor data
            const anchor = this._anchors.get(anchorId);
            if (anchor) {
                anchor.status = result.status;
                this._updateBadgeStatus(anchorId, result.status);
            }

            // Update button
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Verify Now';
            }

            // Update panel status
            this._updatePanelStatus(anchorId, result);

            return result;

        } catch (error) {
            console.error('[StableAnchors] Verification failed:', error);

            const btn = document.querySelector(`.citation-verify-btn[data-anchor-id="${anchorId}"]`);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Verify Now';
            }

            return { status: 'error', error: error.message };
        }
    },

    async bulkVerify(anchorIds) {
        try {
            const response = await fetch(`${this.config.apiBase}/admin/anchors/bulk-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anchor_ids: anchorIds })
            });
            const results = await response.json();

            // Update all badges
            Object.entries(results).forEach(([anchorId, result]) => {
                this._verificationCache.set(anchorId, {
                    result,
                    timestamp: Date.now()
                });

                const anchor = this._anchors.get(anchorId);
                if (anchor) {
                    anchor.status = result.status;
                    this._updateBadgeStatus(anchorId, result.status);
                }
            });

            return results;

        } catch (error) {
            console.error('[StableAnchors] Bulk verification failed:', error);
            return {};
        }
    },

    _updateBadgeStatus(anchorId, status) {
        const badges = document.querySelectorAll(`.citation-badge[data-anchor-id="${anchorId}"]`);
        badges.forEach(badge => {
            badge.className = `citation-badge ${this._getStatusClass(status)}`;

            const icon = badge.querySelector('.citation-icon');
            if (icon) {
                icon.textContent = this._getStatusIcon(status);
            }
        });
    },

    _updatePanelStatus(anchorId, result) {
        const panel = document.querySelector(`.citation-panel[data-anchor-id="${anchorId}"]`);
        if (!panel) return;

        const statusInfo = this._getStatusInfo(result.status);

        const statusBadge = panel.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${result.status}`;
            statusBadge.textContent = statusInfo.label;
        }

        const statusIcon = panel.querySelector('.citation-status-icon');
        if (statusIcon) {
            statusIcon.textContent = statusInfo.icon;
        }

        // Add verification time
        if (result.verification_time_ms) {
            let timeEl = panel.querySelector('.verification-time');
            if (!timeEl) {
                timeEl = document.createElement('div');
                timeEl.className = 'verification-time';
                panel.querySelector('.citation-meta').appendChild(timeEl);
            }
            timeEl.innerHTML = `
                <span class="meta-label">Verified in:</span>
                <span class="meta-value">${result.verification_time_ms.toFixed(1)}ms</span>
            `;
        }
    },

    // =========================================================================
    // DEVELOPER DASHBOARD - Anchor Health Monitor
    // =========================================================================
    /**
     * Create anchor health monitor widget for developer dashboard
     */
    createHealthMonitor() {
        const widget = document.createElement('div');
        widget.className = 'anchor-health-monitor';
        widget.id = 'anchorHealthMonitor';

        widget.innerHTML = `
            <div class="ahm-header">
                <h3 class="ahm-title">Anchor Health</h3>
                <button class="ahm-refresh-btn" onclick="StableAnchors.refreshHealth()">
                    Refresh
                </button>
            </div>
            <div class="ahm-stats">
                <div class="ahm-stat-card ahm-total">
                    <div class="stat-value" id="ahmTotal">-</div>
                    <div class="stat-label">Total Anchors</div>
                </div>
                <div class="ahm-stat-card ahm-valid">
                    <div class="stat-value" id="ahmValid">-</div>
                    <div class="stat-label">Valid</div>
                </div>
                <div class="ahm-stat-card ahm-invalid">
                    <div class="stat-value" id="ahmInvalid">-</div>
                    <div class="stat-label">Invalid</div>
                </div>
                <div class="ahm-stat-card ahm-health">
                    <div class="stat-value" id="ahmHealth">-%</div>
                    <div class="stat-label">Health</div>
                </div>
            </div>
            <div class="ahm-health-bar">
                <div class="health-bar-fill" id="ahmHealthBar" style="width: 0%"></div>
            </div>
            <div class="ahm-by-source" id="ahmBySource">
                <!-- Populated dynamically -->
            </div>
            <div class="ahm-actions">
                <button class="ahm-action-btn" onclick="StableAnchors.verifyAllAnchors()">
                    Verify All Anchors
                </button>
                <button class="ahm-action-btn ahm-action-secondary" onclick="StableAnchors.showStaleAnchors()">
                    Show Stale/Invalid
                </button>
            </div>
        `;

        return widget;
    },

    async refreshHealth() {
        try {
            const response = await fetch(`${this.config.apiBase}/admin/anchors/health`);
            const health = await response.json();

            this._healthData = health;
            this._updateHealthDisplay(health);

            return health;

        } catch (error) {
            console.error('[StableAnchors] Failed to fetch health:', error);
            return null;
        }
    },

    _updateHealthDisplay(health) {
        const totalEl = document.getElementById('ahmTotal');
        const validEl = document.getElementById('ahmValid');
        const invalidEl = document.getElementById('ahmInvalid');
        const healthEl = document.getElementById('ahmHealth');
        const healthBar = document.getElementById('ahmHealthBar');
        const bySourceEl = document.getElementById('ahmBySource');

        if (totalEl) totalEl.textContent = health.total_anchors || 0;
        if (validEl) validEl.textContent = health.valid_anchors || 0;
        if (invalidEl) invalidEl.textContent = health.invalid_anchors || 0;
        if (healthEl) healthEl.textContent = `${health.health_percentage || 0}%`;

        if (healthBar) {
            healthBar.style.width = `${health.health_percentage || 0}%`;

            // Color based on health
            healthBar.className = 'health-bar-fill';
            if (health.health_percentage >= 90) {
                healthBar.classList.add('health-good');
            } else if (health.health_percentage >= 70) {
                healthBar.classList.add('health-warning');
            } else {
                healthBar.classList.add('health-critical');
            }
        }

        if (bySourceEl && health.by_source_type) {
            bySourceEl.innerHTML = '<div class="ahm-source-title">By Source Type</div>';

            Object.entries(health.by_source_type).forEach(([source, stats]) => {
                const percentage = stats.total > 0
                    ? Math.round(stats.valid / stats.total * 100)
                    : 100;

                bySourceEl.innerHTML += `
                    <div class="ahm-source-row">
                        <span class="source-name">${source}</span>
                        <span class="source-stats">${stats.valid}/${stats.total}</span>
                        <div class="source-bar">
                            <div class="source-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            });
        }
    },

    async verifyAllAnchors() {
        const btn = document.querySelector('.ahm-action-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
        }

        try {
            const response = await fetch(`${this.config.apiBase}/admin/anchors/bulk-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const results = await response.json();

            // Refresh health
            await this.refreshHealth();

            // Show result notification
            this._showNotification(
                `Verified ${Object.keys(results).length} anchors`,
                'success'
            );

        } catch (error) {
            console.error('[StableAnchors] Bulk verification failed:', error);
            this._showNotification('Verification failed', 'error');
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Verify All Anchors';
        }
    },

    async showStaleAnchors() {
        try {
            const response = await fetch(`${this.config.apiBase}/admin/anchors/stale`);
            const staleAnchors = await response.json();

            this._showStaleModal(staleAnchors);

        } catch (error) {
            console.error('[StableAnchors] Failed to fetch stale anchors:', error);
        }
    },

    _showStaleModal(anchors) {
        // Remove existing modal
        const existing = document.getElementById('staleAnchorsModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'staleAnchorsModal';
        modal.className = 'anchor-modal-overlay';

        const content = anchors.length > 0
            ? anchors.map(a => `
                <div class="stale-anchor-item">
                    <div class="stale-anchor-info">
                        <span class="stale-anchor-id">${a.id}</span>
                        <span class="stale-anchor-doc">${a.document?.title || 'Unknown'}</span>
                    </div>
                    <span class="stale-anchor-status ${a.status || 'invalid'}">${a.status || 'invalid'}</span>
                </div>
            `).join('')
            : '<div class="no-stale-anchors">All anchors are valid!</div>';

        modal.innerHTML = `
            <div class="anchor-modal">
                <div class="anchor-modal-header">
                    <h3>Stale/Invalid Anchors</h3>
                    <button class="anchor-modal-close" onclick="this.closest('.anchor-modal-overlay').remove()">
                        &times;
                    </button>
                </div>
                <div class="anchor-modal-body">
                    ${content}
                </div>
                <div class="anchor-modal-footer">
                    <span class="stale-count">${anchors.length} anchor(s) need attention</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================
    copyCitation(anchorId) {
        const anchor = this._anchors.get(anchorId);
        if (!anchor) return;

        const citation = `[${anchor.document}] "${anchor.text}" (${anchor.hash})`;

        navigator.clipboard.writeText(citation).then(() => {
            this._showNotification('Citation copied!', 'success');
        }).catch(() => {
            this._showNotification('Failed to copy', 'error');
        });
    },

    _getStatusClass(status) {
        const statusMap = {
            'verified': 'verified',
            'stale': 'stale',
            'invalid': 'invalid',
            'document_missing': 'invalid',
            'span_mismatch': 'invalid',
            'hash_mismatch': 'stale',
            'error': 'invalid'
        };
        return statusMap[status] || 'unknown';
    },

    _getStatusIcon(status) {
        const iconMap = {
            'verified': '\u2713',      // Checkmark
            'stale': '\u26A0',         // Warning
            'invalid': '\u2717',       // X
            'document_missing': '\u2753', // Question
            'span_mismatch': '\u2717',
            'hash_mismatch': '\u26A0',
            'error': '\u26A0'
        };
        return iconMap[status] || '\u2022'; // Bullet
    },

    _getStatusInfo(status) {
        const infoMap = {
            'verified': { icon: '\u2713', label: 'Verified', color: '#22c55e' },
            'stale': { icon: '\u26A0', label: 'Stale', color: '#eab308' },
            'invalid': { icon: '\u2717', label: 'Invalid', color: '#ef4444' },
            'document_missing': { icon: '\u2753', label: 'Doc Missing', color: '#ef4444' },
            'span_mismatch': { icon: '\u2717', label: 'Text Changed', color: '#ef4444' },
            'hash_mismatch': { icon: '\u26A0', label: 'Doc Changed', color: '#eab308' },
            'error': { icon: '\u26A0', label: 'Error', color: '#ef4444' }
        };
        return infoMap[status] || { icon: '\u2022', label: 'Unknown', color: '#6b7280' };
    },

    _truncate(text, maxLen) {
        if (!text) return '';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `anchor-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },

    // =========================================================================
    // POLLING
    // =========================================================================
    startHealthPolling() {
        this.refreshHealth();
        this._pollInterval = setInterval(() => {
            this.refreshHealth();
        }, this.config.healthRefreshInterval);
    },

    stopHealthPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('stable-anchors-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'stable-anchors-styles';
        styles.textContent = `
            /* Citation Badge */
            .citation-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
                cursor: pointer;
                transition: all 0.15s ease;
                vertical-align: middle;
                margin: 0 2px;
            }

            .citation-badge.verified {
                background: rgba(34, 197, 94, 0.15);
                border: 1px solid rgba(34, 197, 94, 0.3);
                color: #22c55e;
            }

            .citation-badge.stale {
                background: rgba(234, 179, 8, 0.15);
                border: 1px solid rgba(234, 179, 8, 0.3);
                color: #eab308;
            }

            .citation-badge.invalid {
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
            }

            .citation-badge.unknown {
                background: rgba(107, 114, 128, 0.15);
                border: 1px solid rgba(107, 114, 128, 0.3);
                color: #6b7280;
            }

            .citation-badge:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            .citation-badge.expanded {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }

            .citation-icon {
                font-size: 10px;
            }

            .citation-label {
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .citation-hash {
                font-size: 10px;
                opacity: 0.7;
            }

            /* Citation Panel */
            .citation-panel {
                background: #1e2130;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-top: none;
                border-radius: 0 0 8px 8px;
                padding: 12px;
                margin: 0 0 8px 0;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }

            .citation-panel.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .citation-panel.verified {
                border-color: rgba(34, 197, 94, 0.3);
            }

            .citation-panel.stale {
                border-color: rgba(234, 179, 8, 0.3);
            }

            .citation-panel.invalid {
                border-color: rgba(239, 68, 68, 0.3);
            }

            .citation-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .citation-panel-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .citation-doc-title {
                font-weight: 600;
                color: #f0f0f5;
            }

            .status-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .status-badge.verified {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }

            .status-badge.stale {
                background: rgba(234, 179, 8, 0.2);
                color: #eab308;
            }

            .status-badge.invalid,
            .status-badge.document_missing,
            .status-badge.span_mismatch {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .citation-text-block {
                margin-bottom: 10px;
            }

            .citation-text-label {
                font-size: 11px;
                color: #6b7280;
                margin-bottom: 4px;
            }

            .citation-quote {
                margin: 0;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.03);
                border-left: 3px solid #6366f1;
                color: #a0a4b8;
                font-style: italic;
                font-size: 13px;
            }

            .citation-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                font-size: 12px;
            }

            .citation-meta-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .meta-label {
                color: #6b7280;
            }

            .meta-value {
                color: #a0a4b8;
            }

            .meta-hash {
                font-family: monospace;
                background: rgba(255, 255, 255, 0.05);
                padding: 2px 6px;
                border-radius: 3px;
                color: #a0a4b8;
            }

            .citation-panel-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .citation-verify-btn,
            .citation-copy-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .citation-verify-btn {
                background: #6366f1;
                color: white;
            }

            .citation-verify-btn:hover {
                background: #5558e3;
            }

            .citation-verify-btn:disabled {
                background: #4b5563;
                cursor: not-allowed;
            }

            .citation-copy-btn {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .citation-copy-btn:hover {
                background: rgba(255, 255, 255, 0.12);
            }

            /* Anchor Health Monitor */
            .anchor-health-monitor {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
                padding: 16px;
            }

            .ahm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .ahm-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #f0f0f5;
            }

            .ahm-refresh-btn {
                padding: 4px 12px;
                background: rgba(255, 255, 255, 0.08);
                border: none;
                border-radius: 4px;
                color: #a0a4b8;
                font-size: 12px;
                cursor: pointer;
            }

            .ahm-refresh-btn:hover {
                background: rgba(255, 255, 255, 0.12);
            }

            .ahm-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }

            .ahm-stat-card {
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                padding: 12px;
                text-align: center;
            }

            .ahm-stat-card .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: #f0f0f5;
            }

            .ahm-stat-card .stat-label {
                font-size: 11px;
                color: #6b7280;
                margin-top: 4px;
            }

            .ahm-valid .stat-value { color: #22c55e; }
            .ahm-invalid .stat-value { color: #ef4444; }

            .ahm-health-bar {
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 16px;
            }

            .health-bar-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease, background 0.3s ease;
            }

            .health-bar-fill.health-good { background: linear-gradient(90deg, #22c55e, #16a34a); }
            .health-bar-fill.health-warning { background: linear-gradient(90deg, #eab308, #ca8a04); }
            .health-bar-fill.health-critical { background: linear-gradient(90deg, #ef4444, #dc2626); }

            .ahm-source-title {
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 8px;
            }

            .ahm-source-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }

            .source-name {
                font-size: 12px;
                color: #a0a4b8;
                min-width: 80px;
            }

            .source-stats {
                font-size: 11px;
                color: #6b7280;
                min-width: 50px;
            }

            .source-bar {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .source-bar-fill {
                height: 100%;
                background: #6366f1;
                border-radius: 3px;
            }

            .ahm-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .ahm-action-btn {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .ahm-action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }

            .ahm-action-btn:disabled {
                background: #4b5563;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .ahm-action-secondary {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .ahm-action-secondary:hover {
                background: rgba(255, 255, 255, 0.12);
                box-shadow: none;
            }

            /* Modal */
            .anchor-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .anchor-modal {
                background: #1e2130;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }

            .anchor-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .anchor-modal-header h3 {
                margin: 0;
                color: #f0f0f5;
            }

            .anchor-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
            }

            .anchor-modal-body {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
            }

            .stale-anchor-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 6px;
                margin-bottom: 8px;
            }

            .stale-anchor-id {
                font-family: monospace;
                font-size: 12px;
                color: #a0a4b8;
            }

            .stale-anchor-doc {
                font-size: 12px;
                color: #6b7280;
                margin-left: 8px;
            }

            .stale-anchor-status {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 3px;
            }

            .stale-anchor-status.stale {
                background: rgba(234, 179, 8, 0.2);
                color: #eab308;
            }

            .stale-anchor-status.invalid {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .no-stale-anchors {
                text-align: center;
                padding: 24px;
                color: #22c55e;
            }

            .anchor-modal-footer {
                padding: 12px 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .stale-count {
                font-size: 12px;
                color: #6b7280;
            }

            /* Notification */
            .anchor-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10001;
                animation: slideIn 0.2s ease;
            }

            .anchor-notification.success {
                background: #22c55e;
                color: white;
            }

            .anchor-notification.error {
                background: #ef4444;
                color: white;
            }

            .anchor-notification.info {
                background: #6366f1;
                color: white;
            }

            .anchor-notification.fade-out {
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Responsive */
            @media (max-width: 600px) {
                .ahm-stats {
                    grid-template-columns: repeat(2, 1fr);
                }

                .citation-panel-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.StableAnchors = StableAnchors;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    StableAnchors.init();
});
