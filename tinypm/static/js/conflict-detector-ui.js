/**
 * ============================================================================
 * CONFLICT DETECTOR UI v1.0 - Conflict Visualization & Management
 * ============================================================================
 *
 * Part of Project "Sovereign Seed" Phase 2
 *
 * Frontend component for visualizing and managing data conflicts.
 * Integrates with the Conflict Detector backend API.
 *
 * Features:
 * - Conflict list with severity indicators (color-coded)
 * - Conflict detail modal showing both values and sources
 * - Resolution buttons (Accept A, Accept B, Manual Override)
 * - Conflict timeline showing when detected and resolved
 *
 * Usage:
 *   const conflictUI = new ConflictDetectorUI('#conflict-container');
 *   conflictUI.loadConflicts();
 *
 * Author: PM_Architect Claude
 * Date: 2026-02-04
 * ============================================================================
 */

class ConflictDetectorUI {
    /**
     * Initialize the Conflict Detector UI
     * @param {string} containerSelector - CSS selector for the container element
     * @param {Object} options - Configuration options
     */
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`[ConflictUI] Container not found: ${containerSelector}`);
            return;
        }

        this.options = {
            apiBase: '/api',
            autoRefresh: false,
            refreshInterval: 30000, // 30 seconds
            showResolved: false,
            ...options
        };

        this.conflicts = [];
        this.selectedConflict = null;
        this.refreshTimer = null;

        // Severity colors
        this.severityColors = {
            critical: '#dc2626',  // Red
            high: '#ea580c',      // Orange
            medium: '#ca8a04',    // Yellow
            low: '#16a34a'        // Green
        };

        this.severityIcons = {
            critical: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
            high: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
            medium: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>',
            low: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
        };

        this.init();
    }

    /**
     * Initialize the UI
     */
    init() {
        this.render();
        this.bindEvents();

        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    /**
     * Render the main UI structure
     */
    render() {
        this.container.innerHTML = `
            <div class="conflict-detector">
                <!-- Header -->
                <div class="conflict-header">
                    <h2>Data Conflicts</h2>
                    <div class="conflict-controls">
                        <label class="toggle-resolved">
                            <input type="checkbox" id="showResolved" ${this.options.showResolved ? 'checked' : ''}>
                            <span>Show Resolved</span>
                        </label>
                        <button class="btn-refresh" title="Refresh conflicts">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div class="conflict-stats" id="conflictStats">
                    <div class="stat-item critical">
                        <span class="stat-value">-</span>
                        <span class="stat-label">Critical</span>
                    </div>
                    <div class="stat-item high">
                        <span class="stat-value">-</span>
                        <span class="stat-label">High</span>
                    </div>
                    <div class="stat-item medium">
                        <span class="stat-value">-</span>
                        <span class="stat-label">Medium</span>
                    </div>
                    <div class="stat-item low">
                        <span class="stat-value">-</span>
                        <span class="stat-label">Low</span>
                    </div>
                </div>

                <!-- Conflict List -->
                <div class="conflict-list" id="conflictList">
                    <div class="loading-state">Loading conflicts...</div>
                </div>

                <!-- Detail Modal -->
                <div class="conflict-modal" id="conflictModal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Conflict Details</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body" id="conflictDetailBody">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .conflict-detector {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 100%;
                }

                .conflict-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .conflict-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .conflict-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .toggle-resolved {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #6b7280;
                    cursor: pointer;
                }

                .btn-refresh {
                    padding: 0.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-refresh:hover {
                    background: #f3f4f6;
                }

                .conflict-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .stat-item {
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    text-align: center;
                }

                .stat-item.critical {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                }

                .stat-item.high {
                    background: #fff7ed;
                    border: 1px solid #fed7aa;
                }

                .stat-item.medium {
                    background: #fefce8;
                    border: 1px solid #fef08a;
                }

                .stat-item.low {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                }

                .stat-value {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .stat-item.critical .stat-value { color: #dc2626; }
                .stat-item.high .stat-value { color: #ea580c; }
                .stat-item.medium .stat-value { color: #ca8a04; }
                .stat-item.low .stat-value { color: #16a34a; }

                .stat-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    text-transform: uppercase;
                }

                .conflict-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .conflict-card {
                    padding: 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .conflict-card:hover {
                    border-color: #9ca3af;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .conflict-card.resolved {
                    opacity: 0.6;
                }

                .conflict-card-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .severity-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .severity-badge.critical {
                    background: #fef2f2;
                    color: #dc2626;
                }

                .severity-badge.high {
                    background: #fff7ed;
                    color: #ea580c;
                }

                .severity-badge.medium {
                    background: #fefce8;
                    color: #ca8a04;
                }

                .severity-badge.low {
                    background: #f0fdf4;
                    color: #16a34a;
                }

                .conflict-field {
                    font-weight: 600;
                    color: #1f2937;
                }

                .conflict-type {
                    font-size: 0.75rem;
                    color: #6b7280;
                    padding: 0.125rem 0.5rem;
                    background: #f3f4f6;
                    border-radius: 0.25rem;
                }

                .resolved-badge {
                    font-size: 0.75rem;
                    color: #059669;
                    padding: 0.125rem 0.5rem;
                    background: #d1fae5;
                    border-radius: 0.25rem;
                    margin-left: auto;
                }

                .conflict-description {
                    font-size: 0.875rem;
                    color: #4b5563;
                    margin-bottom: 0.5rem;
                }

                .conflict-values {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .value-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    background: #f3f4f6;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-family: monospace;
                }

                .conflict-meta {
                    display: flex;
                    gap: 1rem;
                    margin-top: 0.5rem;
                    font-size: 0.75rem;
                    color: #9ca3af;
                }

                /* Modal Styles */
                .conflict-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    border-radius: 0.75rem;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                    font-weight: 600;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #9ca3af;
                }

                .modal-close:hover {
                    color: #4b5563;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .detail-section {
                    margin-bottom: 1.5rem;
                }

                .detail-section h4 {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    margin-bottom: 0.75rem;
                }

                .data-point-card {
                    padding: 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    margin-bottom: 0.5rem;
                    position: relative;
                }

                .data-point-card.winner {
                    border-color: #22c55e;
                    background: #f0fdf4;
                }

                .data-point-value {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                    font-family: monospace;
                }

                .data-point-meta {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.5rem;
                    margin-top: 0.75rem;
                    font-size: 0.875rem;
                }

                .meta-item {
                    display: flex;
                    flex-direction: column;
                }

                .meta-label {
                    font-size: 0.75rem;
                    color: #9ca3af;
                }

                .meta-value {
                    color: #4b5563;
                }

                .resolution-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .btn-resolve {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: none;
                    border-radius: 0.375rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-resolve.primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn-resolve.primary:hover {
                    background: #2563eb;
                }

                .btn-resolve.secondary {
                    background: #f3f4f6;
                    color: #374151;
                }

                .btn-resolve.secondary:hover {
                    background: #e5e7eb;
                }

                .resolution-info {
                    padding: 1rem;
                    background: #f0fdf4;
                    border-radius: 0.5rem;
                    border: 1px solid #bbf7d0;
                }

                .resolution-info h4 {
                    color: #15803d;
                    margin-bottom: 0.5rem;
                }

                .timeline {
                    position: relative;
                    padding-left: 1.5rem;
                }

                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 0.375rem;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: #e5e7eb;
                }

                .timeline-item {
                    position: relative;
                    padding-bottom: 1rem;
                }

                .timeline-item::before {
                    content: '';
                    position: absolute;
                    left: -1.25rem;
                    top: 0.25rem;
                    width: 0.75rem;
                    height: 0.75rem;
                    border-radius: 50%;
                    background: #9ca3af;
                }

                .timeline-item.resolved::before {
                    background: #22c55e;
                }

                .loading-state, .empty-state {
                    padding: 2rem;
                    text-align: center;
                    color: #6b7280;
                }

                .empty-state svg {
                    width: 3rem;
                    height: 3rem;
                    margin: 0 auto 1rem;
                    color: #d1d5db;
                }

                @media (max-width: 640px) {
                    .conflict-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .modal-content {
                        width: 95%;
                        margin: 1rem;
                    }
                }
            </style>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Refresh button
        const refreshBtn = this.container.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadConflicts());
        }

        // Show resolved toggle
        const showResolvedToggle = this.container.querySelector('#showResolved');
        if (showResolvedToggle) {
            showResolvedToggle.addEventListener('change', (e) => {
                this.options.showResolved = e.target.checked;
                this.renderConflictList();
            });
        }

        // Modal close
        const modalClose = this.container.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        // Click outside modal to close
        const modal = this.container.querySelector('.conflict-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    /**
     * Load conflicts from API
     */
    async loadConflicts() {
        const listEl = this.container.querySelector('#conflictList');
        listEl.innerHTML = '<div class="loading-state">Loading conflicts...</div>';

        try {
            const response = await fetch(`${this.options.apiBase}/conflicts`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.conflicts = data.conflicts || [];

            this.renderStats();
            this.renderConflictList();
        } catch (error) {
            console.error('[ConflictUI] Failed to load conflicts:', error);
            listEl.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>Failed to load conflicts</p>
                    <p style="font-size: 0.75rem;">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render stats summary
     */
    renderStats() {
        const stats = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        for (const conflict of this.conflicts) {
            if (!conflict.is_resolved) {
                const severity = conflict.severity.toLowerCase();
                if (stats.hasOwnProperty(severity)) {
                    stats[severity]++;
                }
            }
        }

        const statsEl = this.container.querySelector('#conflictStats');
        statsEl.innerHTML = `
            <div class="stat-item critical">
                <span class="stat-value">${stats.critical}</span>
                <span class="stat-label">Critical</span>
            </div>
            <div class="stat-item high">
                <span class="stat-value">${stats.high}</span>
                <span class="stat-label">High</span>
            </div>
            <div class="stat-item medium">
                <span class="stat-value">${stats.medium}</span>
                <span class="stat-label">Medium</span>
            </div>
            <div class="stat-item low">
                <span class="stat-value">${stats.low}</span>
                <span class="stat-label">Low</span>
            </div>
        `;
    }

    /**
     * Render conflict list
     */
    renderConflictList() {
        const listEl = this.container.querySelector('#conflictList');

        // Filter based on showResolved option
        let displayConflicts = this.conflicts;
        if (!this.options.showResolved) {
            displayConflicts = this.conflicts.filter(c => !c.is_resolved);
        }

        if (displayConflicts.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>No ${this.options.showResolved ? '' : 'unresolved '}conflicts</p>
                </div>
            `;
            return;
        }

        // Sort by severity (critical first)
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        displayConflicts.sort((a, b) => {
            const orderA = severityOrder[a.severity.toLowerCase()] ?? 4;
            const orderB = severityOrder[b.severity.toLowerCase()] ?? 4;
            return orderA - orderB;
        });

        listEl.innerHTML = displayConflicts.map(conflict => this.renderConflictCard(conflict)).join('');

        // Bind click events to cards
        listEl.querySelectorAll('.conflict-card').forEach(card => {
            card.addEventListener('click', () => {
                const conflictId = card.dataset.conflictId;
                this.showConflictDetail(conflictId);
            });
        });
    }

    /**
     * Render a single conflict card
     */
    renderConflictCard(conflict) {
        const severity = conflict.severity.toLowerCase();
        const icon = this.severityIcons[severity] || this.severityIcons.low;
        const values = conflict.data_points.map(dp => dp.value).slice(0, 3);

        const date = new Date(conflict.detected_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
            <div class="conflict-card ${conflict.is_resolved ? 'resolved' : ''}" data-conflict-id="${conflict.id}">
                <div class="conflict-card-header">
                    <span class="severity-badge ${severity}">
                        ${icon}
                        ${severity}
                    </span>
                    <span class="conflict-field">${this.escapeHtml(conflict.field_name)}</span>
                    <span class="conflict-type">${conflict.conflict_type}</span>
                    ${conflict.is_resolved ? '<span class="resolved-badge">Resolved</span>' : ''}
                </div>
                <div class="conflict-description">${this.escapeHtml(conflict.description)}</div>
                <div class="conflict-values">
                    ${values.map(v => `<span class="value-chip">${this.escapeHtml(String(v))}</span>`).join('')}
                    ${conflict.data_points.length > 3 ? `<span class="value-chip">+${conflict.data_points.length - 3} more</span>` : ''}
                </div>
                <div class="conflict-meta">
                    <span>Detected: ${dateStr}</span>
                    <span>Sources: ${conflict.data_points.length}</span>
                </div>
            </div>
        `;
    }

    /**
     * Show conflict detail modal
     */
    showConflictDetail(conflictId) {
        const conflict = this.conflicts.find(c => c.id === conflictId);
        if (!conflict) return;

        this.selectedConflict = conflict;
        const modal = this.container.querySelector('#conflictModal');
        const body = this.container.querySelector('#conflictDetailBody');

        body.innerHTML = this.renderConflictDetail(conflict);

        // Bind resolution action buttons
        body.querySelectorAll('.btn-resolve-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                this.resolveConflict(conflict.id, index);
            });
        });

        body.querySelectorAll('.btn-resolve-effective-date').forEach(btn => {
            btn.addEventListener('click', () => {
                this.resolveByEffectiveDate(conflict.id);
            });
        });

        body.querySelectorAll('.btn-resolve-source-priority').forEach(btn => {
            btn.addEventListener('click', () => {
                this.resolveBySourcePriority(conflict.id);
            });
        });

        modal.style.display = 'flex';
    }

    /**
     * Render conflict detail content
     */
    renderConflictDetail(conflict) {
        const severity = conflict.severity.toLowerCase();
        const icon = this.severityIcons[severity] || this.severityIcons.low;

        let html = `
            <div class="detail-section">
                <div class="conflict-card-header">
                    <span class="severity-badge ${severity}">
                        ${icon}
                        ${severity}
                    </span>
                    <span class="conflict-field">${this.escapeHtml(conflict.field_name)}</span>
                    <span class="conflict-type">${conflict.conflict_type}</span>
                </div>
                <p style="margin-top: 0.5rem; color: #4b5563;">${this.escapeHtml(conflict.description)}</p>
            </div>

            <div class="detail-section">
                <h4>Conflicting Values</h4>
        `;

        // Render each data point
        conflict.data_points.forEach((dp, idx) => {
            const isWinner = conflict.resolution && conflict.resolution.winning_data_point_index === idx;
            const effectiveDate = dp.effective_date ? new Date(dp.effective_date).toLocaleDateString() : 'Unknown';

            html += `
                <div class="data-point-card ${isWinner ? 'winner' : ''}">
                    <div class="data-point-value">${this.escapeHtml(String(dp.value))}</div>
                    <div class="data-point-meta">
                        <div class="meta-item">
                            <span class="meta-label">Source</span>
                            <span class="meta-value">${this.escapeHtml(dp.source_type)} (${this.escapeHtml(dp.source_id)})</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Effective Date</span>
                            <span class="meta-value">${effectiveDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Confidence</span>
                            <span class="meta-value">${(dp.extraction_confidence * 100).toFixed(0)}%</span>
                        </div>
                        ${dp.anchor_id ? `
                            <div class="meta-item">
                                <span class="meta-label">Anchor</span>
                                <span class="meta-value">${dp.anchor_id}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${!conflict.is_resolved ? `
                        <button class="btn-resolve secondary btn-resolve-option" data-index="${idx}" style="margin-top: 0.75rem;">
                            Accept This Value
                        </button>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';

        // Resolution section
        if (conflict.is_resolved && conflict.resolution) {
            html += `
                <div class="detail-section">
                    <div class="resolution-info">
                        <h4>Resolution</h4>
                        <p><strong>Method:</strong> ${conflict.resolution.method}</p>
                        <p><strong>Winning Value:</strong> ${this.escapeHtml(String(conflict.resolution.winning_value))}</p>
                        <p><strong>Reasoning:</strong> ${this.escapeHtml(conflict.resolution.reasoning)}</p>
                        <p><strong>Resolved by:</strong> ${conflict.resolution.resolved_by}</p>
                        <p><strong>Resolved at:</strong> ${new Date(conflict.resolution.resolved_at).toLocaleString()}</p>
                    </div>
                </div>
            `;
        } else {
            // Show auto-resolution options
            html += `
                <div class="detail-section">
                    <h4>Auto-Resolution Options</h4>
                    <div class="resolution-actions">
                        <button class="btn-resolve primary btn-resolve-effective-date">
                            Use Effective Date
                        </button>
                        <button class="btn-resolve secondary btn-resolve-source-priority">
                            Use Source Priority
                        </button>
                    </div>
                </div>
            `;
        }

        // Timeline
        html += `
            <div class="detail-section">
                <h4>Timeline</h4>
                <div class="timeline">
                    <div class="timeline-item">
                        <strong>Detected</strong>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            ${new Date(conflict.detected_at).toLocaleString()}
                        </div>
                    </div>
                    ${conflict.is_resolved ? `
                        <div class="timeline-item resolved">
                            <strong>Resolved</strong>
                            <div style="font-size: 0.875rem; color: #6b7280;">
                                ${new Date(conflict.resolution.resolved_at).toLocaleString()}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Close the detail modal
     */
    closeModal() {
        const modal = this.container.querySelector('#conflictModal');
        modal.style.display = 'none';
        this.selectedConflict = null;
    }

    /**
     * Resolve conflict by selecting a specific value
     */
    async resolveConflict(conflictId, winningIndex) {
        try {
            const response = await fetch(`${this.options.apiBase}/conflicts/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conflict_id: conflictId,
                    winning_index: winningIndex,
                    resolved_by: 'user'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Reload and close modal
            await this.loadConflicts();
            this.closeModal();
        } catch (error) {
            console.error('[ConflictUI] Resolution failed:', error);
            alert(`Failed to resolve conflict: ${error.message}`);
        }
    }

    /**
     * Resolve by effective date
     */
    async resolveByEffectiveDate(conflictId) {
        try {
            const response = await fetch(`${this.options.apiBase}/conflicts/resolve/effective-date`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conflict_id: conflictId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            await this.loadConflicts();
            this.closeModal();
        } catch (error) {
            console.error('[ConflictUI] Resolution failed:', error);
            alert(`Failed to resolve conflict: ${error.message}`);
        }
    }

    /**
     * Resolve by source priority
     */
    async resolveBySourcePriority(conflictId) {
        try {
            const response = await fetch(`${this.options.apiBase}/conflicts/resolve/source-priority`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conflict_id: conflictId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            await this.loadConflicts();
            this.closeModal();
        } catch (error) {
            console.error('[ConflictUI] Resolution failed:', error);
            alert(`Failed to resolve conflict: ${error.message}`);
        }
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.refreshTimer = setInterval(() => this.loadConflicts(), this.options.refreshInterval);
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * HTML escape helper
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy the UI and clean up
     */
    destroy() {
        this.stopAutoRefresh();
        this.container.innerHTML = '';
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConflictDetectorUI;
}

// Global export for script tag usage
if (typeof window !== 'undefined') {
    window.ConflictDetectorUI = ConflictDetectorUI;
}
