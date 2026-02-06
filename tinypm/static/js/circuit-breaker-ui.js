/**
 * TinyPM Financial Circuit Breaker UI - Phase 2: Sovereign Seed
 * ==============================================================================
 *
 * Frontend component for displaying impact assessments and circuit breaker state.
 *
 * Features:
 * - Impact assessment badges on action cards
 * - Threshold indicator (green/yellow/orange/red zones)
 * - "Why can't this auto-execute?" explanations
 * - Impact breakdown visualization
 * - Real-time circuit breaker stats
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude
 * Part of: Project "Sovereign Seed" Phase 2
 */

const CircuitBreakerUI = (function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    const CONFIG = {
        apiBase: '/api/impact',
        pollInterval: 30000, // 30 seconds
        animationDuration: 300,
        // Default thresholds (will be updated from server)
        thresholds: {
            autoExecute: 500,
            oneClick: 2000,
            humanRequired: 5000
        },
        // Zone colors
        colors: {
            safe: '#22c55e',      // Green - auto-execute OK
            caution: '#eab308',   // Yellow - one-click
            warning: '#f97316',   // Orange - pre-prepare
            danger: '#ef4444',    // Red - human required
            neutral: '#6b7280'    // Gray - unknown
        }
    };

    // =========================================================================
    // STATE
    // =========================================================================

    let state = {
        initialized: false,
        stats: null,
        recentAssessments: [],
        pollTimer: null
    };

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the Circuit Breaker UI
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        if (state.initialized) {
            console.log('[CircuitBreaker] Already initialized');
            return;
        }

        // Merge options
        Object.assign(CONFIG, options);

        // Load initial stats
        loadStats();

        // Start polling
        state.pollTimer = setInterval(loadStats, CONFIG.pollInterval);

        // Set up event listeners
        setupEventListeners();

        state.initialized = true;
        console.log('[CircuitBreaker] UI initialized');
    }

    /**
     * Set up global event listeners
     */
    function setupEventListeners() {
        // Listen for action cards being created
        document.addEventListener('actionCardCreated', (e) => {
            if (e.detail && e.detail.element && e.detail.action) {
                attachImpactBadge(e.detail.element, e.detail.action);
            }
        });

        // Listen for circuit breaker threshold changes
        document.addEventListener('circuitBreakerThresholdsChanged', (e) => {
            if (e.detail) {
                CONFIG.thresholds = e.detail;
                refreshAllBadges();
            }
        });
    }

    // =========================================================================
    // API CALLS
    // =========================================================================

    /**
     * Load circuit breaker stats from server
     */
    async function loadStats() {
        try {
            const response = await fetch(`${CONFIG.apiBase}/stats`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            state.stats = data;

            // Update thresholds from server
            if (data.thresholds) {
                CONFIG.thresholds.autoExecute = parseFloat(data.thresholds.auto_execute) || 500;
                CONFIG.thresholds.oneClick = parseFloat(data.thresholds.one_click) || 2000;
                CONFIG.thresholds.humanRequired = parseFloat(data.thresholds.human_required) || 5000;
            }

            // Dispatch event for dashboard updates
            document.dispatchEvent(new CustomEvent('circuitBreakerStatsUpdated', {
                detail: data
            }));

            return data;
        } catch (error) {
            console.error('[CircuitBreaker] Failed to load stats:', error);
            return null;
        }
    }

    /**
     * Assess impact for an action
     * @param {string} actionType - Type of action
     * @param {Object} context - Action context
     * @returns {Promise<Object>} Assessment result
     */
    async function assessImpact(actionType, context) {
        try {
            const response = await fetch(`${CONFIG.apiBase}/assess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_type: actionType, context })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[CircuitBreaker] Assessment failed:', error);
            return null;
        }
    }

    /**
     * Gate an action through circuit breaker
     * @param {string} actionType - Type of action
     * @param {Object} context - Action context
     * @param {string} requestedTrust - Requested trust level
     * @returns {Promise<Object>} Gate result
     */
    async function gateAction(actionType, context, requestedTrust = 'auto_execute') {
        try {
            const response = await fetch(`${CONFIG.apiBase}/gate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action_type: actionType,
                    context,
                    requested_trust: requestedTrust
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[CircuitBreaker] Gate check failed:', error);
            return { allowed: false, error: error.message };
        }
    }

    /**
     * Get recent assessments
     * @param {number} limit - Max assessments to return
     */
    async function getRecentAssessments(limit = 20) {
        try {
            const response = await fetch(`${CONFIG.apiBase}/recent?limit=${limit}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            state.recentAssessments = data.assessments || [];
            return state.recentAssessments;
        } catch (error) {
            console.error('[CircuitBreaker] Failed to get recent assessments:', error);
            return [];
        }
    }

    // =========================================================================
    // UI COMPONENTS
    // =========================================================================

    /**
     * Get impact zone based on amount
     * @param {number} impact - Dollar impact
     * @returns {Object} Zone info with name and color
     */
    function getImpactZone(impact) {
        const amount = parseFloat(impact) || 0;

        if (amount < CONFIG.thresholds.autoExecute) {
            return {
                name: 'safe',
                label: 'Auto-Execute OK',
                color: CONFIG.colors.safe,
                icon: 'check-circle',
                trustLevel: 'auto_execute'
            };
        } else if (amount < CONFIG.thresholds.oneClick) {
            return {
                name: 'caution',
                label: 'One-Click Required',
                color: CONFIG.colors.caution,
                icon: 'alert-circle',
                trustLevel: 'one_click'
            };
        } else if (amount < CONFIG.thresholds.humanRequired) {
            return {
                name: 'warning',
                label: 'Review Required',
                color: CONFIG.colors.warning,
                icon: 'alert-triangle',
                trustLevel: 'pre_prepare'
            };
        } else {
            return {
                name: 'danger',
                label: 'Human Required',
                color: CONFIG.colors.danger,
                icon: 'shield-alert',
                trustLevel: 'inform'
            };
        }
    }

    /**
     * Create an impact badge element
     * @param {Object} assessment - Impact assessment
     * @returns {HTMLElement} Badge element
     */
    function createImpactBadge(assessment) {
        const impact = parseFloat(assessment.total_impact) || 0;
        const zone = getImpactZone(impact);

        const badge = document.createElement('div');
        badge.className = `circuit-breaker-badge cb-zone-${zone.name}`;
        badge.setAttribute('data-impact', impact.toFixed(2));
        badge.setAttribute('data-zone', zone.name);

        badge.innerHTML = `
            <span class="cb-icon">${getIconSvg(zone.icon)}</span>
            <span class="cb-amount">$${formatAmount(impact)}</span>
            <span class="cb-tooltip">
                <strong>${zone.label}</strong>
                <br>Impact: $${impact.toFixed(2)}
                <br>Max Trust: ${zone.trustLevel}
                ${assessment.reasoning && assessment.reasoning.length > 0 ?
                    `<hr><em>${assessment.reasoning[0]}</em>` : ''}
            </span>
        `;

        // Add click handler for details
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            showImpactDetails(assessment);
        });

        return badge;
    }

    /**
     * Create impact meter visualization
     * @param {number} impact - Dollar impact
     * @returns {HTMLElement} Meter element
     */
    function createImpactMeter(impact) {
        const amount = parseFloat(impact) || 0;
        const zone = getImpactZone(amount);

        // Calculate position (0-100%)
        const maxDisplay = CONFIG.thresholds.humanRequired * 1.5;
        const position = Math.min((amount / maxDisplay) * 100, 100);

        const meter = document.createElement('div');
        meter.className = 'circuit-breaker-meter';
        meter.innerHTML = `
            <div class="cb-meter-track">
                <div class="cb-meter-zones">
                    <div class="cb-zone cb-zone-safe" style="width: ${(CONFIG.thresholds.autoExecute / maxDisplay) * 100}%"></div>
                    <div class="cb-zone cb-zone-caution" style="width: ${((CONFIG.thresholds.oneClick - CONFIG.thresholds.autoExecute) / maxDisplay) * 100}%"></div>
                    <div class="cb-zone cb-zone-warning" style="width: ${((CONFIG.thresholds.humanRequired - CONFIG.thresholds.oneClick) / maxDisplay) * 100}%"></div>
                    <div class="cb-zone cb-zone-danger" style="flex: 1"></div>
                </div>
                <div class="cb-meter-indicator" style="left: ${position}%">
                    <div class="cb-meter-needle"></div>
                    <div class="cb-meter-value">$${formatAmount(amount)}</div>
                </div>
            </div>
            <div class="cb-meter-labels">
                <span>$0</span>
                <span>$${formatAmount(CONFIG.thresholds.autoExecute)}</span>
                <span>$${formatAmount(CONFIG.thresholds.oneClick)}</span>
                <span>$${formatAmount(CONFIG.thresholds.humanRequired)}</span>
            </div>
        `;

        return meter;
    }

    /**
     * Create impact breakdown chart
     * @param {Object} breakdown - Impact breakdown by category
     * @returns {HTMLElement} Chart element
     */
    function createBreakdownChart(breakdown) {
        const chart = document.createElement('div');
        chart.className = 'cb-breakdown-chart';

        const categories = Object.entries(breakdown || {});
        if (categories.length === 0) {
            chart.innerHTML = '<p class="cb-no-data">No impact breakdown available</p>';
            return chart;
        }

        const total = categories.reduce((sum, [, val]) => sum + parseFloat(val), 0);

        const categoryLabels = {
            'direct_cost': 'Direct Cost',
            'revenue_risk': 'Revenue Risk',
            'penalty_risk': 'Penalty Risk',
            'opportunity': 'Opportunity Cost',
            'reputation': 'Reputation',
            'resource_cost': 'Resource Cost',
            'commitment': 'Commitment'
        };

        const categoryColors = {
            'direct_cost': '#ef4444',
            'revenue_risk': '#f97316',
            'penalty_risk': '#eab308',
            'opportunity': '#84cc16',
            'reputation': '#22c55e',
            'resource_cost': '#06b6d4',
            'commitment': '#8b5cf6'
        };

        let html = '<div class="cb-breakdown-bars">';
        categories.forEach(([category, amount]) => {
            const pct = total > 0 ? (parseFloat(amount) / total) * 100 : 0;
            const color = categoryColors[category] || '#6b7280';
            const label = categoryLabels[category] || category;

            html += `
                <div class="cb-breakdown-row">
                    <span class="cb-breakdown-label">${label}</span>
                    <div class="cb-breakdown-bar-container">
                        <div class="cb-breakdown-bar" style="width: ${pct}%; background: ${color}"></div>
                    </div>
                    <span class="cb-breakdown-value">$${formatAmount(parseFloat(amount))}</span>
                </div>
            `;
        });
        html += '</div>';

        chart.innerHTML = html;
        return chart;
    }

    /**
     * Attach impact badge to an action card
     * @param {HTMLElement} cardElement - The action card element
     * @param {Object} action - Action data
     */
    function attachImpactBadge(cardElement, action) {
        // Check if badge already exists
        if (cardElement.querySelector('.circuit-breaker-badge')) {
            return;
        }

        // Get assessment from action
        const assessment = action.circuit_breaker_assessment;
        if (!assessment) {
            return;
        }

        // Create and attach badge
        const badge = createImpactBadge(assessment);

        // Find header or create badge container
        let container = cardElement.querySelector('.cb-badge-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'cb-badge-container';
            const header = cardElement.querySelector('.action-header, .card-header, h3, h4');
            if (header) {
                header.appendChild(container);
            } else {
                cardElement.insertBefore(container, cardElement.firstChild);
            }
        }

        container.appendChild(badge);
    }

    /**
     * Show detailed impact modal
     * @param {Object} assessment - Impact assessment
     */
    function showImpactDetails(assessment) {
        const zone = getImpactZone(assessment.total_impact);

        const modal = document.createElement('div');
        modal.className = 'cb-modal-overlay';
        modal.innerHTML = `
            <div class="cb-modal">
                <div class="cb-modal-header">
                    <h3>Impact Assessment</h3>
                    <button class="cb-modal-close" onclick="this.closest('.cb-modal-overlay').remove()">
                        ${getIconSvg('x')}
                    </button>
                </div>
                <div class="cb-modal-body">
                    <div class="cb-summary cb-zone-${zone.name}">
                        <div class="cb-summary-icon">${getIconSvg(zone.icon)}</div>
                        <div class="cb-summary-text">
                            <div class="cb-summary-amount">$${parseFloat(assessment.total_impact).toFixed(2)}</div>
                            <div class="cb-summary-label">${zone.label}</div>
                        </div>
                    </div>

                    <div class="cb-section">
                        <h4>Impact Meter</h4>
                        <div id="cb-modal-meter"></div>
                    </div>

                    <div class="cb-section">
                        <h4>Breakdown by Category</h4>
                        <div id="cb-modal-breakdown"></div>
                    </div>

                    <div class="cb-section">
                        <h4>Reasoning</h4>
                        <ul class="cb-reasoning-list">
                            ${(assessment.reasoning || []).map(r =>
                                `<li>${escapeHtml(r)}</li>`
                            ).join('')}
                        </ul>
                    </div>

                    <div class="cb-section cb-details">
                        <h4>Details</h4>
                        <table class="cb-details-table">
                            <tr><td>Action Type:</td><td>${assessment.action_type}</td></tr>
                            <tr><td>Max Trust Level:</td><td>${assessment.max_trust_level}</td></tr>
                            <tr><td>Auto-Execute:</td><td>${assessment.auto_execute_allowed ? 'Yes' : 'No'}</td></tr>
                            <tr><td>Human Required:</td><td>${assessment.human_required ? 'Yes' : 'No'}</td></tr>
                            <tr><td>Confidence:</td><td>${(assessment.confidence * 100).toFixed(0)}%</td></tr>
                            <tr><td>Assessed:</td><td>${formatDate(assessment.assessed_at)}</td></tr>
                        </table>
                    </div>

                    ${assessment.human_required ? `
                        <div class="cb-warning-box">
                            <strong>Why can't this auto-execute?</strong>
                            <p>The financial impact of $${parseFloat(assessment.total_impact).toFixed(2)} exceeds
                            the auto-execute threshold of $${CONFIG.thresholds.autoExecute.toFixed(2)}.
                            This action requires human approval to prevent unintended financial consequences.</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add meter
        const meterContainer = modal.querySelector('#cb-modal-meter');
        meterContainer.appendChild(createImpactMeter(assessment.total_impact));

        // Add breakdown chart
        const breakdownContainer = modal.querySelector('#cb-modal-breakdown');
        breakdownContainer.appendChild(createBreakdownChart(assessment.breakdown));

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Create stats widget for dashboard
     * @returns {HTMLElement} Stats widget
     */
    function createStatsWidget() {
        const widget = document.createElement('div');
        widget.className = 'cb-stats-widget';
        widget.id = 'circuit-breaker-stats';
        widget.innerHTML = '<p>Loading circuit breaker stats...</p>';

        // Load and render stats
        loadStats().then(stats => {
            if (!stats) {
                widget.innerHTML = '<p class="cb-error">Failed to load stats</p>';
                return;
            }

            renderStatsWidget(widget, stats);
        });

        return widget;
    }

    /**
     * Render stats into widget
     * @param {HTMLElement} widget - Widget container
     * @param {Object} stats - Stats data
     */
    function renderStatsWidget(widget, stats) {
        const distribution = stats.distribution || {};

        widget.innerHTML = `
            <div class="cb-stats-header">
                <h4>Circuit Breaker</h4>
                <span class="cb-state cb-state-${stats.state || 'closed'}">${stats.state || 'CLOSED'}</span>
            </div>

            <div class="cb-stats-summary">
                <div class="cb-stat">
                    <span class="cb-stat-value">${stats.total_assessments || 0}</span>
                    <span class="cb-stat-label">Assessments</span>
                </div>
                <div class="cb-stat">
                    <span class="cb-stat-value">$${stats.avg_impact || '0'}</span>
                    <span class="cb-stat-label">Avg Impact</span>
                </div>
                <div class="cb-stat cb-stat-blocked">
                    <span class="cb-stat-value">${stats.blocked_count || 0}</span>
                    <span class="cb-stat-label">Blocked</span>
                </div>
            </div>

            <div class="cb-distribution">
                <div class="cb-dist-bar">
                    <div class="cb-dist-segment cb-zone-safe"
                         style="width: ${getDistPct(distribution.low, stats.total_assessments)}%"
                         title="Low impact: ${distribution.low || 0}"></div>
                    <div class="cb-dist-segment cb-zone-caution"
                         style="width: ${getDistPct(distribution.medium, stats.total_assessments)}%"
                         title="Medium impact: ${distribution.medium || 0}"></div>
                    <div class="cb-dist-segment cb-zone-warning"
                         style="width: ${getDistPct(distribution.high, stats.total_assessments)}%"
                         title="High impact: ${distribution.high || 0}"></div>
                    <div class="cb-dist-segment cb-zone-danger"
                         style="width: ${getDistPct(distribution.critical, stats.total_assessments)}%"
                         title="Critical impact: ${distribution.critical || 0}"></div>
                </div>
                <div class="cb-dist-legend">
                    <span><span class="cb-dot cb-zone-safe"></span> Safe</span>
                    <span><span class="cb-dot cb-zone-caution"></span> Caution</span>
                    <span><span class="cb-dot cb-zone-warning"></span> Warning</span>
                    <span><span class="cb-dot cb-zone-danger"></span> Danger</span>
                </div>
            </div>

            <div class="cb-thresholds">
                <small>Thresholds: Auto $${CONFIG.thresholds.autoExecute} | Click $${CONFIG.thresholds.oneClick} | Human $${CONFIG.thresholds.humanRequired}</small>
            </div>
        `;
    }

    /**
     * Refresh all impact badges on page
     */
    function refreshAllBadges() {
        document.querySelectorAll('.circuit-breaker-badge').forEach(badge => {
            const impact = parseFloat(badge.getAttribute('data-impact')) || 0;
            const zone = getImpactZone(impact);

            // Update zone class
            badge.className = `circuit-breaker-badge cb-zone-${zone.name}`;
            badge.setAttribute('data-zone', zone.name);

            // Update tooltip
            const tooltip = badge.querySelector('.cb-tooltip strong');
            if (tooltip) {
                tooltip.textContent = zone.label;
            }
        });
    }

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    /**
     * Format dollar amount for display
     * @param {number} amount - Dollar amount
     * @returns {string} Formatted amount
     */
    function formatAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        } else {
            return amount.toFixed(0);
        }
    }

    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    }

    /**
     * Calculate distribution percentage
     */
    function getDistPct(count, total) {
        if (!total || total === 0) return 0;
        return ((count || 0) / total) * 100;
    }

    /**
     * Escape HTML for safe insertion
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get SVG icon
     * @param {string} name - Icon name
     * @returns {string} SVG markup
     */
    function getIconSvg(name) {
        const icons = {
            'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            'alert-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            'shield-alert': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            'x': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        };
        return icons[name] || '';
    }

    // =========================================================================
    // CSS INJECTION
    // =========================================================================

    /**
     * Inject required CSS styles
     */
    function injectStyles() {
        if (document.getElementById('circuit-breaker-styles')) return;

        const style = document.createElement('style');
        style.id = 'circuit-breaker-styles';
        style.textContent = `
            /* Circuit Breaker Badge */
            .circuit-breaker-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                position: relative;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .circuit-breaker-badge:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }

            .cb-zone-safe { background: ${CONFIG.colors.safe}20; color: ${CONFIG.colors.safe}; border: 1px solid ${CONFIG.colors.safe}40; }
            .cb-zone-caution { background: ${CONFIG.colors.caution}20; color: ${CONFIG.colors.caution}; border: 1px solid ${CONFIG.colors.caution}40; }
            .cb-zone-warning { background: ${CONFIG.colors.warning}20; color: ${CONFIG.colors.warning}; border: 1px solid ${CONFIG.colors.warning}40; }
            .cb-zone-danger { background: ${CONFIG.colors.danger}20; color: ${CONFIG.colors.danger}; border: 1px solid ${CONFIG.colors.danger}40; }

            .cb-icon { display: flex; align-items: center; }
            .cb-amount { font-variant-numeric: tabular-nums; }

            .cb-tooltip {
                display: none;
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #1f2937;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 1000;
                margin-bottom: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .cb-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-top-color: #1f2937;
            }

            .circuit-breaker-badge:hover .cb-tooltip {
                display: block;
            }

            /* Impact Meter */
            .circuit-breaker-meter {
                margin: 12px 0;
            }

            .cb-meter-track {
                position: relative;
                height: 24px;
                border-radius: 12px;
                overflow: hidden;
                background: #e5e7eb;
            }

            .cb-meter-zones {
                display: flex;
                height: 100%;
            }

            .cb-meter-zones .cb-zone {
                opacity: 0.6;
            }

            .cb-zone.cb-zone-safe { background: ${CONFIG.colors.safe}; }
            .cb-zone.cb-zone-caution { background: ${CONFIG.colors.caution}; }
            .cb-zone.cb-zone-warning { background: ${CONFIG.colors.warning}; }
            .cb-zone.cb-zone-danger { background: ${CONFIG.colors.danger}; }

            .cb-meter-indicator {
                position: absolute;
                top: 0;
                transform: translateX(-50%);
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .cb-meter-needle {
                width: 3px;
                height: 24px;
                background: #1f2937;
                border-radius: 2px;
            }

            .cb-meter-value {
                position: absolute;
                top: -20px;
                background: #1f2937;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }

            .cb-meter-labels {
                display: flex;
                justify-content: space-between;
                margin-top: 4px;
                font-size: 10px;
                color: #6b7280;
            }

            /* Breakdown Chart */
            .cb-breakdown-chart { margin: 8px 0; }

            .cb-breakdown-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 4px 0;
            }

            .cb-breakdown-label {
                flex: 0 0 100px;
                font-size: 12px;
                color: #6b7280;
            }

            .cb-breakdown-bar-container {
                flex: 1;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
            }

            .cb-breakdown-bar {
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .cb-breakdown-value {
                flex: 0 0 60px;
                text-align: right;
                font-size: 12px;
                font-weight: 500;
            }

            /* Modal */
            .cb-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: cbFadeIn 0.2s ease;
            }

            @keyframes cbFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .cb-modal {
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: cbSlideUp 0.3s ease;
            }

            @keyframes cbSlideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .cb-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .cb-modal-header h3 {
                margin: 0;
                font-size: 18px;
            }

            .cb-modal-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: #6b7280;
                border-radius: 4px;
            }

            .cb-modal-close:hover {
                background: #f3f4f6;
                color: #1f2937;
            }

            .cb-modal-body {
                padding: 20px;
            }

            .cb-summary {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .cb-summary-icon {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: white;
            }

            .cb-summary-icon svg {
                width: 24px;
                height: 24px;
            }

            .cb-summary-amount {
                font-size: 28px;
                font-weight: 700;
            }

            .cb-summary-label {
                font-size: 14px;
                opacity: 0.8;
            }

            .cb-section {
                margin: 16px 0;
            }

            .cb-section h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #6b7280;
            }

            .cb-reasoning-list {
                margin: 0;
                padding-left: 20px;
                font-size: 13px;
                color: #4b5563;
            }

            .cb-reasoning-list li {
                margin: 4px 0;
            }

            .cb-details-table {
                width: 100%;
                font-size: 13px;
            }

            .cb-details-table td {
                padding: 4px 0;
            }

            .cb-details-table td:first-child {
                color: #6b7280;
                width: 120px;
            }

            .cb-warning-box {
                background: ${CONFIG.colors.danger}10;
                border: 1px solid ${CONFIG.colors.danger}30;
                border-radius: 8px;
                padding: 12px;
                margin-top: 16px;
            }

            .cb-warning-box strong {
                color: ${CONFIG.colors.danger};
            }

            .cb-warning-box p {
                margin: 8px 0 0 0;
                font-size: 13px;
                color: #4b5563;
            }

            /* Stats Widget */
            .cb-stats-widget {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .cb-stats-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .cb-stats-header h4 {
                margin: 0;
                font-size: 14px;
            }

            .cb-state {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 500;
            }

            .cb-state-closed {
                background: ${CONFIG.colors.safe}20;
                color: ${CONFIG.colors.safe};
            }

            .cb-state-open {
                background: ${CONFIG.colors.danger}20;
                color: ${CONFIG.colors.danger};
            }

            .cb-stats-summary {
                display: flex;
                gap: 16px;
                margin-bottom: 12px;
            }

            .cb-stat {
                flex: 1;
                text-align: center;
            }

            .cb-stat-value {
                display: block;
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
            }

            .cb-stat-label {
                font-size: 11px;
                color: #6b7280;
            }

            .cb-stat-blocked .cb-stat-value {
                color: ${CONFIG.colors.danger};
            }

            .cb-distribution { margin: 12px 0; }

            .cb-dist-bar {
                display: flex;
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
                background: #e5e7eb;
            }

            .cb-dist-segment {
                transition: width 0.3s ease;
            }

            .cb-dist-legend {
                display: flex;
                gap: 12px;
                margin-top: 6px;
                font-size: 10px;
                color: #6b7280;
            }

            .cb-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 4px;
            }

            .cb-thresholds {
                text-align: center;
                color: #9ca3af;
                font-size: 10px;
                margin-top: 8px;
            }

            /* Badge container */
            .cb-badge-container {
                display: inline-flex;
                margin-left: 8px;
            }

            /* Error and no-data states */
            .cb-error {
                color: ${CONFIG.colors.danger};
                font-size: 13px;
            }

            .cb-no-data {
                color: #9ca3af;
                font-size: 13px;
                text-align: center;
                padding: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // Inject styles on load
    injectStyles();

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        init,
        loadStats,
        assessImpact,
        gateAction,
        getRecentAssessments,
        createImpactBadge,
        createImpactMeter,
        createBreakdownChart,
        createStatsWidget,
        attachImpactBadge,
        showImpactDetails,
        refreshAllBadges,
        getImpactZone,

        // State access
        getState: () => ({ ...state }),
        getConfig: () => ({ ...CONFIG }),

        // Cleanup
        destroy: () => {
            if (state.pollTimer) {
                clearInterval(state.pollTimer);
            }
            state.initialized = false;
        }
    };
})();

// Auto-initialize if DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CircuitBreakerUI.init());
} else {
    // DOM already loaded
    CircuitBreakerUI.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CircuitBreakerUI;
}
