/**
 * TinyPM Anticipatory Actions Module
 * ===================================
 * Phase 3: Prescient AI - Action Queue UI
 *
 * Features:
 * - Slide-in action queue panel (right side)
 * - Trust level indicators (color-coded confidence)
 * - One-click approve/reject/modify buttons
 * - Gmail-style undo toast notifications
 * - "Why did I suggest this?" expandable reasoning
 * - Satisfying animations and micro-interactions
 *
 * Trust Levels:
 * - INFORM (< 65%): Gray - Just informational
 * - SUGGEST (65-80%): Blue - Suggestion with reasoning
 * - PRE_PREPARE (80-90%): Yellow - Draft ready
 * - ONE_CLICK (90-95%): Green - High confidence
 * - AUTO_EXECUTE (95%+): Purple - Auto-executed
 *
 * Created: 2026-02-04
 * Team: PM_Architect Claude (Phase 3)
 */

const AnticipatoryActions = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        panelWidth: 380,
        undoToastDuration: 8000,  // 8 seconds to undo
        animationDuration: 300,
        pollInterval: 30000,  // Poll for new actions every 30s
        maxQueueVisible: 10
    },

    // Trust level styling
    trustLevels: {
        inform: {
            color: '#6b6f82',
            bgColor: 'rgba(107, 111, 130, 0.1)',
            icon: 'info',
            label: 'Info'
        },
        suggest: {
            color: '#3b82f6',
            bgColor: 'rgba(59, 130, 246, 0.1)',
            icon: 'lightbulb',
            label: 'Suggestion'
        },
        pre_prepare: {
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.1)',
            icon: 'draft',
            label: 'Draft Ready'
        },
        one_click: {
            color: '#22c55e',
            bgColor: 'rgba(34, 197, 94, 0.1)',
            icon: 'bolt',
            label: 'One-Click'
        },
        auto_execute: {
            color: '#a855f7',
            bgColor: 'rgba(168, 85, 247, 0.1)',
            icon: 'auto',
            label: 'Auto'
        }
    },

    // State
    state: {
        isOpen: false,
        actions: [],
        undoStack: [],
        loadingActions: new Set()
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this.createPanel();
        this.createUndoContainer();
        this.bindEvents();
        this.startPolling();
        this.loadActions();
    },

    // =========================================================================
    // PANEL MANAGEMENT
    // =========================================================================
    createPanel() {
        if (document.getElementById('anticipatory-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'anticipatory-panel';
        panel.className = 'anticipatory-panel';
        panel.innerHTML = `
            <div class="anticipatory-header">
                <div class="anticipatory-header-left">
                    <span class="anticipatory-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                    </span>
                    <div>
                        <h3>Anticipatory Actions</h3>
                        <span class="anticipatory-count">0 pending</span>
                    </div>
                </div>
                <button class="anticipatory-close" onclick="AnticipatoryActions.togglePanel()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="anticipatory-filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="one_click">One-Click</button>
                <button class="filter-btn" data-filter="pre_prepare">Drafts</button>
                <button class="filter-btn" data-filter="suggest">Suggestions</button>
            </div>
            <div class="anticipatory-list" id="anticipatory-list">
                <div class="anticipatory-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <p>No pending actions</p>
                    <span>I'm learning your patterns...</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Create floating indicator badge
        this.createIndicatorBadge();
    },

    createIndicatorBadge() {
        if (document.getElementById('anticipatory-badge')) return;

        const badge = document.createElement('button');
        badge.id = 'anticipatory-badge';
        badge.className = 'anticipatory-badge';
        badge.onclick = () => this.togglePanel();
        badge.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span class="badge-count hidden">0</span>
        `;

        document.body.appendChild(badge);
    },

    createUndoContainer() {
        if (document.getElementById('undo-toast-container')) return;

        const container = document.createElement('div');
        container.id = 'undo-toast-container';
        container.className = 'undo-toast-container';
        document.body.appendChild(container);
    },

    togglePanel() {
        const panel = document.getElementById('anticipatory-panel');
        if (!panel) return;

        this.state.isOpen = !this.state.isOpen;
        panel.classList.toggle('open', this.state.isOpen);

        if (this.state.isOpen) {
            this.loadActions();
        }
    },

    // =========================================================================
    // DATA LOADING
    // =========================================================================
    async loadActions() {
        try {
            // This would call the backend API
            // For now, we'll load from localStorage or mock data
            const response = await this.fetchActions();
            this.state.actions = response.actions || [];
            this.renderActions();
            this.updateBadge();
        } catch (error) {
            console.error('[Anticipatory] Error loading actions:', error);
        }
    },

    async fetchActions() {
        // This would call the TinyPM API
        // For now, return from localStorage
        const stored = localStorage.getItem('anticipatory_actions');
        if (stored) {
            return JSON.parse(stored);
        }
        return { actions: [] };
    },

    startPolling() {
        setInterval(() => {
            if (this.state.isOpen) {
                this.loadActions();
            } else {
                // Light poll just for badge count
                this.updateBadgeCount();
            }
        }, this.config.pollInterval);
    },

    async updateBadgeCount() {
        try {
            const response = await this.fetchActions();
            const count = (response.actions || []).filter(a => a.status === 'pending').length;
            this.updateBadge(count);
        } catch (error) {
            // Silent fail for background updates
        }
    },

    // =========================================================================
    // RENDERING
    // =========================================================================
    renderActions() {
        const list = document.getElementById('anticipatory-list');
        if (!list) return;

        const pending = this.state.actions.filter(a => a.status === 'pending');
        const countEl = document.querySelector('.anticipatory-count');
        if (countEl) {
            countEl.textContent = `${pending.length} pending`;
        }

        if (pending.length === 0) {
            list.innerHTML = `
                <div class="anticipatory-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <p>No pending actions</p>
                    <span>I'm learning your patterns...</span>
                </div>
            `;
            return;
        }

        list.innerHTML = pending.slice(0, this.config.maxQueueVisible).map(action =>
            this.renderActionCard(action)
        ).join('');
    },

    renderActionCard(action) {
        const trustConfig = this.trustLevels[action.trust_level] || this.trustLevels.suggest;
        const isLoading = this.state.loadingActions.has(action.id);
        const confidencePercent = Math.round(action.confidence * 100);

        return `
            <div class="action-card ${isLoading ? 'loading' : ''}" data-action-id="${action.id}">
                <div class="action-header">
                    <div class="action-trust-badge" style="background: ${trustConfig.bgColor}; color: ${trustConfig.color}">
                        ${this.getTrustIcon(trustConfig.icon)}
                        <span>${trustConfig.label}</span>
                    </div>
                    <div class="action-confidence">
                        <div class="confidence-bar" style="--confidence: ${confidencePercent}%">
                            <div class="confidence-fill" style="width: ${confidencePercent}%; background: ${trustConfig.color}"></div>
                        </div>
                        <span>${confidencePercent}%</span>
                    </div>
                </div>

                <h4 class="action-title">${this.escapeHtml(action.title)}</h4>
                <p class="action-description">${this.escapeHtml(action.description)}</p>

                <details class="action-reasoning">
                    <summary>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Why did I suggest this?
                    </summary>
                    <p>${this.escapeHtml(action.reasoning)}</p>
                </details>

                <div class="action-buttons">
                    ${this.renderActionButtons(action)}
                </div>

                ${isLoading ? '<div class="action-loading-overlay"><div class="spinner"></div></div>' : ''}
            </div>
        `;
    },

    renderActionButtons(action) {
        const trustLevel = action.trust_level;

        // Different button configs based on trust level
        if (trustLevel === 'one_click' || trustLevel === 'auto_execute') {
            return `
                <button class="action-btn primary" onclick="AnticipatoryActions.approveAction('${action.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approve
                </button>
                <button class="action-btn secondary" onclick="AnticipatoryActions.rejectAction('${action.id}')">
                    Dismiss
                </button>
            `;
        } else if (trustLevel === 'pre_prepare') {
            return `
                <button class="action-btn primary" onclick="AnticipatoryActions.reviewAction('${action.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Review & Edit
                </button>
                <button class="action-btn secondary" onclick="AnticipatoryActions.approveAction('${action.id}')">
                    Send As-Is
                </button>
                <button class="action-btn ghost" onclick="AnticipatoryActions.rejectAction('${action.id}')">
                    Dismiss
                </button>
            `;
        } else {
            return `
                <button class="action-btn secondary" onclick="AnticipatoryActions.approveAction('${action.id}')">
                    Sounds Good
                </button>
                <button class="action-btn ghost" onclick="AnticipatoryActions.rejectAction('${action.id}')">
                    Not Now
                </button>
            `;
        }
    },

    getTrustIcon(iconName) {
        const icons = {
            info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
            lightbulb: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
            draft: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
            bolt: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
            auto: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
        };
        return icons[iconName] || icons.info;
    },

    updateBadge(count = null) {
        const badge = document.getElementById('anticipatory-badge');
        if (!badge) return;

        const badgeCount = badge.querySelector('.badge-count');
        if (!badgeCount) return;

        const actualCount = count !== null ? count :
            this.state.actions.filter(a => a.status === 'pending').length;

        if (actualCount > 0) {
            badgeCount.textContent = actualCount > 9 ? '9+' : actualCount;
            badgeCount.classList.remove('hidden');
            badge.classList.add('has-actions');
        } else {
            badgeCount.classList.add('hidden');
            badge.classList.remove('has-actions');
        }
    },

    // =========================================================================
    // ACTION HANDLERS
    // =========================================================================
    async approveAction(actionId) {
        this.state.loadingActions.add(actionId);
        this.renderActions();

        try {
            // Call backend to approve
            const result = await this.executeAction(actionId, true);

            if (result.success) {
                // Show undo toast
                this.showUndoToast(actionId, result.undo_token, result.message);

                // Update local state
                const action = this.state.actions.find(a => a.id === actionId);
                if (action) {
                    action.status = 'approved';
                }
            }
        } catch (error) {
            console.error('[Anticipatory] Error approving action:', error);
            this.showErrorToast('Failed to execute action');
        } finally {
            this.state.loadingActions.delete(actionId);
            this.renderActions();
            this.updateBadge();
        }
    },

    async rejectAction(actionId) {
        this.state.loadingActions.add(actionId);
        this.renderActions();

        try {
            await this.executeAction(actionId, false);

            // Update local state
            const action = this.state.actions.find(a => a.id === actionId);
            if (action) {
                action.status = 'rejected';
            }
        } catch (error) {
            console.error('[Anticipatory] Error rejecting action:', error);
        } finally {
            this.state.loadingActions.delete(actionId);
            this.renderActions();
            this.updateBadge();
        }
    },

    async reviewAction(actionId) {
        // Open review modal for editing before approval
        const action = this.state.actions.find(a => a.id === actionId);
        if (!action) return;

        // For now, just approve - in production, open edit modal
        this.approveAction(actionId);
    },

    async executeAction(actionId, approved) {
        // This would call the backend API
        // For now, simulate with localStorage
        return new Promise((resolve) => {
            setTimeout(() => {
                const undoToken = `undo_${Date.now()}`;
                resolve({
                    success: approved,
                    undo_token: approved ? undoToken : null,
                    message: approved ? 'Action completed' : 'Action dismissed'
                });
            }, 500);
        });
    },

    // =========================================================================
    // UNDO SYSTEM
    // =========================================================================
    showUndoToast(actionId, undoToken, message) {
        const container = document.getElementById('undo-toast-container');
        if (!container) return;

        const toastId = `toast_${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'undo-toast';
        toast.innerHTML = `
            <div class="undo-toast-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="undo-btn" onclick="AnticipatoryActions.undoAction('${undoToken}', '${toastId}')">
                Undo
            </button>
            <div class="undo-timer">
                <div class="undo-timer-bar"></div>
            </div>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('visible'));

        // Auto-dismiss after timeout
        setTimeout(() => {
            this.dismissToast(toastId);
        }, this.config.undoToastDuration);
    },

    async undoAction(undoToken, toastId) {
        try {
            // Call backend to undo
            const result = await this.performUndo(undoToken);

            if (result.success) {
                this.dismissToast(toastId);
                this.loadActions();  // Refresh list
                this.showSuccessToast('Action undone');
            } else {
                this.showErrorToast(result.message || 'Failed to undo');
            }
        } catch (error) {
            console.error('[Anticipatory] Error undoing action:', error);
            this.showErrorToast('Failed to undo action');
        }
    },

    async performUndo(undoToken) {
        // This would call the backend API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: 'Undone successfully' });
            }, 300);
        });
    },

    dismissToast(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        toast.classList.remove('visible');
        toast.classList.add('dismissed');

        setTimeout(() => toast.remove(), 300);
    },

    showSuccessToast(message) {
        // Quick success notification
        console.log('[Anticipatory] Success:', message);
    },

    showErrorToast(message) {
        // Quick error notification
        console.error('[Anticipatory] Error:', message);
    },

    // =========================================================================
    // EVENT BINDING
    // =========================================================================
    bindEvents() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.anticipatory-filters .filter-btn')) {
                const filter = e.target.dataset.filter;
                this.filterActions(filter);

                // Update active state
                document.querySelectorAll('.anticipatory-filters .filter-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filter === filter);
                });
            }
        });

        // Keyboard shortcut to toggle panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'a' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                e.preventDefault();
                this.togglePanel();
            }
        });
    },

    filterActions(filter) {
        const list = document.getElementById('anticipatory-list');
        if (!list) return;

        const cards = list.querySelectorAll('.action-card');
        cards.forEach(card => {
            const actionId = card.dataset.actionId;
            const action = this.state.actions.find(a => a.id === actionId);

            if (!action) return;

            if (filter === 'all' || action.trust_level === filter) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('anticipatory-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'anticipatory-styles';
        styles.textContent = `
            /* ========== PANEL ========== */
            .anticipatory-panel {
                position: fixed;
                top: 0;
                right: -${this.config.panelWidth}px;
                width: ${this.config.panelWidth}px;
                height: 100vh;
                background: linear-gradient(180deg, #1a1d27 0%, #0f1117 100%);
                border-left: 1px solid rgba(255, 255, 255, 0.08);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
            }

            .anticipatory-panel.open {
                right: 0;
            }

            .anticipatory-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(30, 33, 48, 0.5);
            }

            .anticipatory-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .anticipatory-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2));
                display: flex;
                align-items: center;
                justify-content: center;
                color: #a855f7;
            }

            .anticipatory-header h3 {
                font-size: 15px;
                font-weight: 600;
                color: #f0f0f5;
                margin: 0;
            }

            .anticipatory-count {
                font-size: 12px;
                color: #6b6f82;
            }

            .anticipatory-close {
                background: none;
                border: none;
                color: #6b6f82;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.15s;
            }

            .anticipatory-close:hover {
                background: rgba(255, 255, 255, 0.08);
                color: #f0f0f5;
            }

            /* ========== FILTERS ========== */
            .anticipatory-filters {
                display: flex;
                gap: 8px;
                padding: 12px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                overflow-x: auto;
            }

            .anticipatory-filters .filter-btn {
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid transparent;
                color: #a0a4b8;
                cursor: pointer;
                transition: all 0.15s;
                white-space: nowrap;
            }

            .anticipatory-filters .filter-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #f0f0f5;
            }

            .anticipatory-filters .filter-btn.active {
                background: rgba(99, 102, 241, 0.2);
                border-color: rgba(99, 102, 241, 0.3);
                color: #818cf8;
            }

            /* ========== LIST ========== */
            .anticipatory-list {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            .anticipatory-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                text-align: center;
                color: #6b6f82;
            }

            .anticipatory-empty p {
                margin: 16px 0 8px;
                font-size: 14px;
                color: #a0a4b8;
            }

            .anticipatory-empty span {
                font-size: 12px;
            }

            /* ========== ACTION CARD ========== */
            .action-card {
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                position: relative;
                transition: all 0.2s;
            }

            .action-card:hover {
                border-color: rgba(99, 102, 241, 0.3);
                transform: translateY(-1px);
            }

            .action-card.loading {
                opacity: 0.6;
                pointer-events: none;
            }

            .action-loading-overlay {
                position: absolute;
                inset: 0;
                background: rgba(15, 17, 23, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
            }

            .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid rgba(99, 102, 241, 0.3);
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .action-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .action-trust-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .action-confidence {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                color: #6b6f82;
            }

            .confidence-bar {
                width: 40px;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
            }

            .confidence-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s ease;
            }

            .action-title {
                font-size: 14px;
                font-weight: 600;
                color: #f0f0f5;
                margin: 0 0 6px;
                line-height: 1.3;
            }

            .action-description {
                font-size: 13px;
                color: #a0a4b8;
                margin: 0 0 12px;
                line-height: 1.4;
            }

            /* ========== REASONING ========== */
            .action-reasoning {
                margin-bottom: 14px;
            }

            .action-reasoning summary {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #6b6f82;
                cursor: pointer;
                user-select: none;
                padding: 8px 10px;
                background: rgba(99, 102, 241, 0.08);
                border-radius: 8px;
                list-style: none;
            }

            .action-reasoning summary::-webkit-details-marker {
                display: none;
            }

            .action-reasoning summary:hover {
                color: #a0a4b8;
                background: rgba(99, 102, 241, 0.12);
            }

            .action-reasoning[open] summary {
                border-radius: 8px 8px 0 0;
            }

            .action-reasoning p {
                margin: 0;
                padding: 10px;
                font-size: 12px;
                color: #a0a4b8;
                background: rgba(99, 102, 241, 0.05);
                border-radius: 0 0 8px 8px;
                line-height: 1.5;
            }

            /* ========== BUTTONS ========== */
            .action-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .action-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
                border: none;
                font-family: inherit;
            }

            .action-btn.primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .action-btn.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .action-btn.secondary {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .action-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #f0f0f5;
            }

            .action-btn.ghost {
                background: none;
                color: #6b6f82;
                padding: 8px 10px;
            }

            .action-btn.ghost:hover {
                color: #a0a4b8;
            }

            /* ========== FLOATING BADGE ========== */
            .anticipatory-badge {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                z-index: 9000;
                transition: all 0.2s;
            }

            .anticipatory-badge:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 28px rgba(99, 102, 241, 0.5);
            }

            .anticipatory-badge.has-actions {
                animation: pulse-badge 2s infinite;
            }

            @keyframes pulse-badge {
                0%, 100% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); }
                50% { box-shadow: 0 4px 30px rgba(99, 102, 241, 0.6); }
            }

            .badge-count {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 20px;
                height: 20px;
                padding: 0 6px;
                border-radius: 10px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .badge-count.hidden {
                display: none;
            }

            /* ========== UNDO TOAST ========== */
            .undo-toast-container {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .undo-toast {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 12px 16px;
                background: #1e2130;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                min-width: 300px;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .undo-toast.visible {
                transform: translateY(0);
                opacity: 1;
            }

            .undo-toast.dismissed {
                transform: translateY(-20px);
                opacity: 0;
            }

            .undo-toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                color: #22c55e;
            }

            .undo-toast-content span {
                color: #f0f0f5;
                font-size: 13px;
            }

            .undo-btn {
                padding: 6px 14px;
                background: rgba(99, 102, 241, 0.2);
                border: none;
                border-radius: 6px;
                color: #818cf8;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
            }

            .undo-btn:hover {
                background: rgba(99, 102, 241, 0.3);
            }

            .undo-timer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 0 0 12px 12px;
                overflow: hidden;
            }

            .undo-timer-bar {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #a855f7);
                animation: timer-countdown ${this.config.undoToastDuration}ms linear forwards;
            }

            @keyframes timer-countdown {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* ========== MOBILE ========== */
            @media (max-width: 480px) {
                .anticipatory-panel {
                    width: 100%;
                    right: -100%;
                }

                .anticipatory-badge {
                    bottom: 16px;
                    right: 16px;
                    width: 48px;
                    height: 48px;
                }

                .undo-toast-container {
                    left: 16px;
                    right: 16px;
                    transform: none;
                }

                .undo-toast {
                    min-width: auto;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.AnticipatoryActions = AnticipatoryActions;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Delay init to not block page load
    setTimeout(() => {
        AnticipatoryActions.init();
    }, 1500);
});
