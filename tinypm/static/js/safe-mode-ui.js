/**
 * TinyPM Intelligent Safe Mode UI - Phase 4: Sovereign Seed
 * ==============================================================================
 *
 * Frontend component for displaying safe mode status and controls.
 *
 * Features:
 * - Status banner (color-coded by level)
 * - Metrics dashboard with gauge visualizations
 * - Trend indicators for each metric
 * - Manual lockdown/unlock controls
 * - Alert notifications on level changes
 * - Event history viewer
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude
 * Part of: Project "Sovereign Seed" Phase 4
 */

const SafeModeUI = (function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    const CONFIG = {
        apiBase: '/api/safe-mode',
        pollInterval: 10000, // 10 seconds
        animationDuration: 300,
        notificationDuration: 5000,
        // Level configurations
        levels: {
            green: {
                color: '#22c55e',
                bgColor: '#dcfce7',
                borderColor: '#86efac',
                icon: 'check-circle',
                label: 'Normal Operation',
                description: 'All systems operational'
            },
            yellow: {
                color: '#eab308',
                bgColor: '#fef9c3',
                borderColor: '#fde047',
                icon: 'alert-triangle',
                label: 'Elevated Caution',
                description: 'Monitoring closely'
            },
            red: {
                color: '#ef4444',
                bgColor: '#fee2e2',
                borderColor: '#fca5a5',
                icon: 'alert-octagon',
                label: 'High Alert',
                description: 'Auto-execute disabled'
            },
            lockdown: {
                color: '#1f2937',
                bgColor: '#f3f4f6',
                borderColor: '#d1d5db',
                icon: 'lock',
                label: 'LOCKDOWN',
                description: 'Read-only mode'
            }
        },
        // Metric display names
        metricNames: {
            'abstain_rate': 'Abstain Rate',
            'conflict_rate': 'Conflict Rate',
            'low_confidence_rate': 'Low Confidence Rate',
            'validation_failure_rate': 'Validation Failures',
            'circuit_breaker_rate': 'Circuit Breaker Blocks'
        }
    };

    // =========================================================================
    // STATE
    // =========================================================================

    let state = {
        initialized: false,
        currentLevel: 'green',
        data: null,
        pollTimer: null,
        lastUpdate: null,
        notificationsEnabled: true
    };

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the Safe Mode UI
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        if (state.initialized) {
            console.log('[SafeMode] Already initialized');
            return;
        }

        // Merge options
        Object.assign(CONFIG, options);

        // Load initial data
        loadData();

        // Start polling
        state.pollTimer = setInterval(loadData, CONFIG.pollInterval);

        // Set up event listeners
        setupEventListeners();

        state.initialized = true;
        console.log('[SafeMode] UI initialized');
    }

    /**
     * Set up global event listeners
     */
    function setupEventListeners() {
        // Listen for manual lockdown requests
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-safe-mode-lockdown]')) {
                e.preventDefault();
                showLockdownDialog();
            }
            if (e.target.matches('[data-safe-mode-unlock]')) {
                e.preventDefault();
                showUnlockDialog();
            }
            if (e.target.matches('[data-safe-mode-refresh]')) {
                e.preventDefault();
                loadData();
            }
        });
    }

    // =========================================================================
    // API CALLS
    // =========================================================================

    /**
     * Load safe mode data from server
     */
    async function loadData() {
        try {
            const response = await fetch(`${CONFIG.apiBase}/status`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            // Check for level change
            if (state.data && data.level !== state.currentLevel) {
                handleLevelChange(state.currentLevel, data.level, data);
            }

            state.data = data;
            state.currentLevel = data.level;
            state.lastUpdate = new Date();

            // Update all UI elements
            updateBanner();
            updateMetricsDashboard();
            updateEventsList();

            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('safeModeUpdated', {
                detail: data
            }));

            return data;
        } catch (error) {
            console.error('[SafeMode] Failed to load data:', error);
            return null;
        }
    }

    /**
     * Trigger manual lockdown
     * @param {string} reason - Reason for lockdown
     */
    async function triggerLockdown(reason) {
        try {
            const response = await fetch(`${CONFIG.apiBase}/lockdown`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            await loadData();
            showNotification('Lockdown activated', 'warning');
            return data;
        } catch (error) {
            console.error('[SafeMode] Lockdown failed:', error);
            showNotification('Lockdown failed: ' + error.message, 'error');
            return null;
        }
    }

    /**
     * Attempt to unlock
     * @param {string} notes - Notes about the unlock
     */
    async function attemptUnlock(notes) {
        try {
            const response = await fetch(`${CONFIG.apiBase}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            await loadData();
            showNotification('System unlocked successfully', 'success');
            return data;
        } catch (error) {
            console.error('[SafeMode] Unlock failed:', error);
            showNotification('Unlock failed: ' + error.message, 'error');
            return null;
        }
    }

    // =========================================================================
    // UI UPDATES
    // =========================================================================

    /**
     * Update the status banner
     */
    function updateBanner() {
        const banner = document.getElementById('safe-mode-banner');
        if (!banner || !state.data) return;

        const levelConfig = CONFIG.levels[state.currentLevel];

        banner.style.backgroundColor = levelConfig.bgColor;
        banner.style.borderColor = levelConfig.borderColor;
        banner.style.color = levelConfig.color;

        banner.innerHTML = `
            <div class="safe-mode-banner-content">
                <div class="safe-mode-status">
                    <span class="safe-mode-icon">${getIcon(levelConfig.icon)}</span>
                    <span class="safe-mode-label">${levelConfig.label}</span>
                    <span class="safe-mode-description">${levelConfig.description}</span>
                </div>
                <div class="safe-mode-actions">
                    ${state.currentLevel === 'lockdown'
                        ? '<button class="btn btn-sm btn-outline" data-safe-mode-unlock>Acknowledge & Unlock</button>'
                        : '<button class="btn btn-sm btn-danger" data-safe-mode-lockdown>Emergency Lockdown</button>'
                    }
                    <button class="btn btn-sm btn-ghost" data-safe-mode-refresh>${getIcon('refresh-cw')}</button>
                </div>
            </div>
            ${state.data.triggered_by && state.data.triggered_by.length > 0 ? `
                <div class="safe-mode-triggers">
                    <strong>Triggered by:</strong> ${state.data.triggered_by.join(', ')}
                </div>
            ` : ''}
        `;

        // Show/hide banner based on level
        banner.style.display = state.currentLevel === 'green' ? 'none' : 'flex';
    }

    /**
     * Update the metrics dashboard
     */
    function updateMetricsDashboard() {
        const dashboard = document.getElementById('safe-mode-metrics');
        if (!dashboard || !state.data) return;

        const metrics = state.data.metrics || {};

        dashboard.innerHTML = Object.entries(metrics).map(([name, metric]) => `
            <div class="metric-card ${metric.status}">
                <div class="metric-header">
                    <span class="metric-name">${CONFIG.metricNames[name] || name}</span>
                    <span class="metric-trend ${metric.trend}">${getTrendIcon(metric.trend)}</span>
                </div>
                <div class="metric-gauge">
                    ${renderGauge(metric.value, metric.threshold_yellow, metric.threshold_red, metric.threshold_lockdown)}
                </div>
                <div class="metric-value">
                    <span class="value">${metric.value_percent}</span>
                    <span class="status-badge ${metric.status}">${metric.status}</span>
                </div>
                <div class="metric-thresholds">
                    <span class="threshold yellow">Y: ${(metric.threshold_yellow * 100).toFixed(0)}%</span>
                    <span class="threshold red">R: ${(metric.threshold_red * 100).toFixed(0)}%</span>
                    <span class="threshold lockdown">L: ${(metric.threshold_lockdown * 100).toFixed(0)}%</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render a gauge visualization
     */
    function renderGauge(value, yellow, red, lockdown) {
        const percentage = Math.min(value * 100, 100);
        const yellowPct = yellow * 100;
        const redPct = red * 100;
        const lockdownPct = lockdown * 100;

        let color = CONFIG.levels.green.color;
        if (value >= lockdown) color = CONFIG.levels.lockdown.color;
        else if (value >= red) color = CONFIG.levels.red.color;
        else if (value >= yellow) color = CONFIG.levels.yellow.color;

        return `
            <div class="gauge-container">
                <div class="gauge-background">
                    <div class="gauge-zone green" style="width: ${yellowPct}%"></div>
                    <div class="gauge-zone yellow" style="left: ${yellowPct}%; width: ${redPct - yellowPct}%"></div>
                    <div class="gauge-zone red" style="left: ${redPct}%; width: ${lockdownPct - redPct}%"></div>
                    <div class="gauge-zone lockdown" style="left: ${lockdownPct}%; width: ${100 - lockdownPct}%"></div>
                </div>
                <div class="gauge-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                <div class="gauge-needle" style="left: ${percentage}%"></div>
            </div>
        `;
    }

    /**
     * Update the events list
     */
    function updateEventsList() {
        const eventsList = document.getElementById('safe-mode-events');
        if (!eventsList || !state.data) return;

        const events = state.data.recent_events || [];

        if (events.length === 0) {
            eventsList.innerHTML = '<div class="no-events">No recent events</div>';
            return;
        }

        eventsList.innerHTML = events.reverse().map(event => `
            <div class="event-item ${event.new}">
                <div class="event-time">${formatTime(event.timestamp)}</div>
                <div class="event-transition">
                    <span class="level-badge ${event.previous}">${event.previous}</span>
                    <span class="arrow">&rarr;</span>
                    <span class="level-badge ${event.new}">${event.new}</span>
                </div>
                <div class="event-triggers">
                    ${event.triggered_by.length > 0
                        ? event.triggered_by.slice(0, 2).join(', ')
                        : 'Manual trigger'}
                </div>
                <div class="event-meta">
                    ${event.auto_triggered ? 'Auto' : 'Manual'}
                    ${event.acknowledged ? ' | Acknowledged' : ''}
                </div>
            </div>
        `).join('');
    }

    // =========================================================================
    // DIALOGS
    // =========================================================================

    /**
     * Show lockdown confirmation dialog
     */
    function showLockdownDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'safe-mode-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>${getIcon('alert-octagon')} Emergency Lockdown</h3>
                </div>
                <div class="dialog-body">
                    <p>This will immediately enable LOCKDOWN mode:</p>
                    <ul>
                        <li>All writes will be blocked</li>
                        <li>Auto-execute will be disabled</li>
                        <li>All actions will require human approval</li>
                    </ul>
                    <label>
                        <span>Reason for lockdown:</span>
                        <textarea id="lockdown-reason" rows="3" placeholder="Enter reason..."></textarea>
                    </label>
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.safe-mode-dialog').remove()">Cancel</button>
                    <button class="btn btn-danger" onclick="SafeModeUI.confirmLockdown()">Activate Lockdown</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    /**
     * Confirm and execute lockdown
     */
    function confirmLockdown() {
        const reason = document.getElementById('lockdown-reason')?.value || 'Manual lockdown';
        document.querySelector('.safe-mode-dialog')?.remove();
        triggerLockdown(reason);
    }

    /**
     * Show unlock dialog
     */
    function showUnlockDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'safe-mode-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>${getIcon('unlock')} Acknowledge & Unlock</h3>
                </div>
                <div class="dialog-body">
                    <p>To unlock the system, all health metrics must be within acceptable levels.</p>
                    ${renderUnlockMetrics()}
                    <label>
                        <span>Notes (optional):</span>
                        <textarea id="unlock-notes" rows="2" placeholder="What was done to resolve the issues?"></textarea>
                    </label>
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.safe-mode-dialog').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="SafeModeUI.confirmUnlock()">Attempt Unlock</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    /**
     * Render metrics status for unlock dialog
     */
    function renderUnlockMetrics() {
        if (!state.data?.metrics) return '';

        const metrics = state.data.metrics;
        return `
            <div class="unlock-metrics">
                ${Object.entries(metrics).map(([name, m]) => `
                    <div class="unlock-metric ${m.status}">
                        <span class="name">${CONFIG.metricNames[name] || name}</span>
                        <span class="value">${m.value_percent}</span>
                        <span class="status-icon">${m.status === 'green' ? getIcon('check') : getIcon('x')}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Confirm and execute unlock
     */
    function confirmUnlock() {
        const notes = document.getElementById('unlock-notes')?.value || '';
        document.querySelector('.safe-mode-dialog')?.remove();
        attemptUnlock(notes);
    }

    // =========================================================================
    // NOTIFICATIONS
    // =========================================================================

    /**
     * Handle level change
     */
    function handleLevelChange(oldLevel, newLevel, data) {
        if (!state.notificationsEnabled) return;

        const levelConfig = CONFIG.levels[newLevel];
        const direction = getLevelSeverity(newLevel) > getLevelSeverity(oldLevel) ? 'escalated' : 'de-escalated';

        showNotification(
            `Safe Mode ${direction}: ${levelConfig.label}`,
            newLevel === 'lockdown' ? 'error' : newLevel === 'red' ? 'warning' : 'info'
        );

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('safeModeChanged', {
            detail: { oldLevel, newLevel, data }
        }));
    }

    /**
     * Get severity number for a level
     */
    function getLevelSeverity(level) {
        const severities = { green: 0, yellow: 1, red: 2, lockdown: 3 };
        return severities[level] || 0;
    }

    /**
     * Show a notification
     */
    function showNotification(message, type = 'info') {
        const container = document.getElementById('safe-mode-notifications') || createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = `safe-mode-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, CONFIG.notificationDuration);
    }

    /**
     * Create notification container if not exists
     */
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'safe-mode-notifications';
        container.className = 'safe-mode-notifications';
        document.body.appendChild(container);
        return container;
    }

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================

    /**
     * Get icon SVG
     */
    function getIcon(name) {
        const icons = {
            'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            'alert-octagon': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            'lock': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
            'unlock': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
            'refresh-cw': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
            'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
            'trending-down': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
            'minus': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
            'check': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            'x': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            'info': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        return icons[name] || '';
    }

    /**
     * Get trend icon
     */
    function getTrendIcon(trend) {
        const icons = {
            'improving': getIcon('trending-down'),
            'stable': getIcon('minus'),
            'degrading': getIcon('trending-up')
        };
        return icons[trend] || icons.stable;
    }

    /**
     * Get notification icon
     */
    function getNotificationIcon(type) {
        const icons = {
            'success': getIcon('check-circle'),
            'warning': getIcon('alert-triangle'),
            'error': getIcon('alert-octagon'),
            'info': getIcon('info')
        };
        return icons[type] || icons.info;
    }

    /**
     * Format timestamp for display
     */
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        return date.toLocaleDateString();
    }

    // =========================================================================
    // CSS INJECTION
    // =========================================================================

    /**
     * Inject required styles
     */
    function injectStyles() {
        if (document.getElementById('safe-mode-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'safe-mode-styles';
        styles.textContent = `
            /* Safe Mode Banner */
            #safe-mode-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                padding: 8px 16px;
                display: flex;
                flex-direction: column;
                border-bottom: 2px solid;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .safe-mode-banner-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .safe-mode-status {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .safe-mode-icon { display: flex; }
            .safe-mode-label { font-weight: 600; }
            .safe-mode-description { opacity: 0.8; font-size: 14px; }

            .safe-mode-actions {
                display: flex;
                gap: 8px;
            }

            .safe-mode-triggers {
                margin-top: 4px;
                font-size: 12px;
                opacity: 0.8;
            }

            /* Metric Cards */
            .metric-card {
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-bottom: 8px;
            }

            .metric-card.lockdown { border-left: 4px solid #1f2937; }
            .metric-card.red { border-left: 4px solid #ef4444; }
            .metric-card.yellow { border-left: 4px solid #eab308; }
            .metric-card.green { border-left: 4px solid #22c55e; }

            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .metric-name { font-weight: 500; }

            .metric-trend.improving { color: #22c55e; }
            .metric-trend.stable { color: #6b7280; }
            .metric-trend.degrading { color: #ef4444; }

            /* Gauge */
            .gauge-container {
                position: relative;
                height: 8px;
                margin: 8px 0;
            }

            .gauge-background {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                border-radius: 4px;
                overflow: hidden;
            }

            .gauge-zone {
                position: absolute;
                height: 100%;
            }

            .gauge-zone.green { background: #dcfce7; }
            .gauge-zone.yellow { background: #fef9c3; }
            .gauge-zone.red { background: #fee2e2; }
            .gauge-zone.lockdown { background: #f3f4f6; }

            .gauge-fill {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .gauge-needle {
                position: absolute;
                top: -4px;
                width: 2px;
                height: 16px;
                background: #1f2937;
                transform: translateX(-50%);
            }

            .metric-value {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 8px;
            }

            .metric-value .value { font-size: 24px; font-weight: 600; }

            .status-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
            }

            .status-badge.green { background: #dcfce7; color: #166534; }
            .status-badge.yellow { background: #fef9c3; color: #854d0e; }
            .status-badge.red { background: #fee2e2; color: #991b1b; }
            .status-badge.lockdown { background: #f3f4f6; color: #1f2937; }

            .metric-thresholds {
                display: flex;
                gap: 12px;
                margin-top: 8px;
                font-size: 11px;
                color: #6b7280;
            }

            /* Events */
            .event-item {
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 4px;
                background: #f9fafb;
            }

            .event-item.lockdown { background: #f3f4f6; }
            .event-item.red { background: #fef2f2; }

            .event-time { font-size: 11px; color: #6b7280; }

            .event-transition {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 4px 0;
            }

            .level-badge {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 500;
            }

            .level-badge.green { background: #dcfce7; color: #166534; }
            .level-badge.yellow { background: #fef9c3; color: #854d0e; }
            .level-badge.red { background: #fee2e2; color: #991b1b; }
            .level-badge.lockdown { background: #1f2937; color: white; }

            .event-triggers { font-size: 12px; color: #6b7280; }
            .event-meta { font-size: 11px; color: #9ca3af; margin-top: 4px; }

            /* Dialog */
            .safe-mode-dialog {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .dialog-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
            }

            .dialog-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            }

            .dialog-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .dialog-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .dialog-body {
                padding: 20px;
            }

            .dialog-body label {
                display: block;
                margin-top: 16px;
            }

            .dialog-body label span {
                display: block;
                font-weight: 500;
                margin-bottom: 4px;
            }

            .dialog-body textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                resize: vertical;
            }

            .dialog-actions {
                padding: 16px 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }

            /* Unlock Metrics */
            .unlock-metrics {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin: 16px 0;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
            }

            .unlock-metric {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .unlock-metric .name { flex: 1; }
            .unlock-metric .value { font-weight: 500; }
            .unlock-metric.green .status-icon { color: #22c55e; }
            .unlock-metric.red .status-icon, .unlock-metric.yellow .status-icon, .unlock-metric.lockdown .status-icon { color: #ef4444; }

            /* Notifications */
            .safe-mode-notifications {
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 1500;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .safe-mode-notification {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                animation: slide-in 0.3s ease;
            }

            .safe-mode-notification.fade-out {
                animation: fade-out 0.3s ease forwards;
            }

            .safe-mode-notification.success { border-left: 4px solid #22c55e; }
            .safe-mode-notification.warning { border-left: 4px solid #eab308; }
            .safe-mode-notification.error { border-left: 4px solid #ef4444; }
            .safe-mode-notification.info { border-left: 4px solid #3b82f6; }

            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0;
                margin-left: 8px;
                opacity: 0.5;
            }

            .notification-close:hover { opacity: 1; }

            @keyframes slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            /* Buttons (basic styling if not already present) */
            .btn {
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                border: 1px solid transparent;
                font-size: 14px;
            }

            .btn-primary { background: #3b82f6; color: white; }
            .btn-secondary { background: #e5e7eb; color: #374151; }
            .btn-danger { background: #ef4444; color: white; }
            .btn-outline { background: transparent; border-color: currentColor; }
            .btn-ghost { background: transparent; }
            .btn-sm { padding: 4px 8px; font-size: 12px; }
        `;
        document.head.appendChild(styles);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    // Inject styles on load
    injectStyles();

    return {
        init,
        loadData,
        triggerLockdown,
        attemptUnlock,
        confirmLockdown,
        confirmUnlock,
        showNotification,
        getState: () => state,
        getCurrentLevel: () => state.currentLevel,
        isHealthy: () => state.currentLevel === 'green',
        canWrite: () => state.data?.can_write ?? true,
        canAutoExecute: () => state.data?.can_auto_execute ?? true
    };

})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SafeModeUI.init());
} else {
    SafeModeUI.init();
}
