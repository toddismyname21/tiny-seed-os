/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                           GOVERNOR UI                                         ║
 * ║                  Central Governance Dashboard Interface                       ║
 * ║                                                                               ║
 * ║  "Every AI operation flows through the Governor. No exceptions."              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Created: 2026-02-06
 * Author: Claude (PM_Architect)
 * Version: 1.0.0
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const GOVERNOR_API = '/api/governor';
    const POLL_INTERVAL = 5000; // 5 seconds
    const SAFE_LEVELS = ['GREEN', 'YELLOW', 'RED', 'LOCKDOWN'];
    const LEVEL_COLORS = {
        'GREEN': '#22c55e',
        'YELLOW': '#eab308',
        'RED': '#ef4444',
        'LOCKDOWN': '#64748b'
    };
    const DECISION_COLORS = {
        'allow': '#22c55e',
        'allow_with_conditions': '#3b82f6',
        'defer': '#eab308',
        'escalate': '#f97316',
        'block': '#ef4444'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES (Injected CSS)
    // ═══════════════════════════════════════════════════════════════════════════

    const styles = `
        /* Governor Status Banner */
        .governor-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
            transition: all 0.3s ease;
        }

        .governor-banner.green {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
            color: white;
        }

        .governor-banner.yellow {
            background: linear-gradient(135deg, rgba(234, 179, 8, 0.95), rgba(202, 138, 4, 0.95));
            color: #1a1a1a;
        }

        .governor-banner.red {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
            color: white;
            animation: pulse-banner 2s infinite;
        }

        .governor-banner.lockdown {
            background: linear-gradient(135deg, rgba(30, 30, 35, 0.98), rgba(15, 15, 20, 0.98));
            color: white;
            border-bottom: 3px solid #ef4444;
        }

        @keyframes pulse-banner {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.9; }
        }

        .governor-banner-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .governor-banner-icon {
            font-size: 24px;
        }

        .governor-banner-text h3 {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
        }

        .governor-banner-text p {
            font-size: 12px;
            opacity: 0.9;
            margin: 2px 0 0 0;
        }

        .governor-banner-actions {
            display: flex;
            gap: 8px;
        }

        .governor-banner-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }

        .governor-banner-btn.primary {
            background: rgba(255,255,255,0.2);
            color: inherit;
        }

        .governor-banner-btn.primary:hover {
            background: rgba(255,255,255,0.3);
        }

        .governor-banner-btn.danger {
            background: #ef4444;
            color: white;
        }

        .governor-banner-btn.success {
            background: #22c55e;
            color: white;
        }

        .governor-banner.hidden {
            transform: translateY(-100%);
            opacity: 0;
        }

        /* Governor Dashboard Modal */
        .governor-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .governor-modal.visible {
            opacity: 1;
            visibility: visible;
        }

        .governor-modal-content {
            background: var(--bg-card, #1e2130);
            border-radius: 16px;
            width: 90%;
            max-width: 900px;
            max-height: 85vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }

        .governor-modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border, #2a2d3e);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #7c3aed, #4f46e5);
        }

        .governor-modal-header h2 {
            font-size: 20px;
            font-weight: 700;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .governor-modal-close {
            background: rgba(255,255,255,0.1);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            color: white;
            transition: all 0.2s;
        }

        .governor-modal-close:hover {
            background: rgba(255,255,255,0.2);
        }

        .governor-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        /* Governor Cards */
        .governor-card {
            background: var(--bg-secondary, #1a1d27);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }

        .governor-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .governor-card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary, #f0f0f5);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .governor-card-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Safe Mode Status */
        .safe-mode-display {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }

        .safe-mode-display.green { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
        .safe-mode-display.yellow { background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); }
        .safe-mode-display.red { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
        .safe-mode-display.lockdown { background: rgba(100, 116, 139, 0.1); border: 1px solid rgba(100, 116, 139, 0.3); }

        .safe-mode-icon {
            font-size: 48px;
        }

        .safe-mode-info h3 {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }

        .safe-mode-info p {
            font-size: 13px;
            color: var(--text-secondary, #a0a4b8);
            margin: 4px 0 0 0;
        }

        .safe-mode-controls {
            margin-left: auto;
            display: flex;
            gap: 8px;
        }

        /* Circuit Breakers Grid */
        .circuit-breakers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }

        .circuit-breaker-item {
            background: var(--bg-primary, #0f1117);
            padding: 12px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .circuit-breaker-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .circuit-breaker-dot.closed { background: #22c55e; }
        .circuit-breaker-dot.open { background: #ef4444; animation: blink 1s infinite; }
        .circuit-breaker-dot.half_open { background: #eab308; }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .circuit-breaker-info {
            flex: 1;
            min-width: 0;
        }

        .circuit-breaker-name {
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .circuit-breaker-stats {
            font-size: 10px;
            color: var(--text-muted, #6b6f82);
        }

        /* Audit Log */
        .audit-log {
            max-height: 300px;
            overflow-y: auto;
        }

        .audit-entry {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid var(--border, #2a2d3e);
        }

        .audit-entry:last-child {
            border-bottom: none;
        }

        .audit-decision-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            flex-shrink: 0;
        }

        .audit-entry-content {
            flex: 1;
            min-width: 0;
        }

        .audit-entry-reason {
            font-size: 13px;
            margin-bottom: 4px;
        }

        .audit-entry-meta {
            font-size: 11px;
            color: var(--text-muted, #6b6f82);
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .metric-item {
            text-align: center;
            padding: 16px;
            background: var(--bg-primary, #0f1117);
            border-radius: 8px;
        }

        .metric-value {
            font-size: 28px;
            font-weight: 700;
        }

        .metric-label {
            font-size: 11px;
            color: var(--text-muted, #6b6f82);
            margin-top: 4px;
        }

        /* Level Selector */
        .level-selector {
            display: flex;
            gap: 8px;
        }

        .level-btn {
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid transparent;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .level-btn.green { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .level-btn.green:hover, .level-btn.green.active { background: #22c55e; color: white; }

        .level-btn.yellow { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .level-btn.yellow:hover, .level-btn.yellow.active { background: #eab308; color: #1a1a1a; }

        .level-btn.red { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .level-btn.red:hover, .level-btn.red.active { background: #ef4444; color: white; }

        .level-btn.lockdown { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
        .level-btn.lockdown:hover, .level-btn.lockdown.active { background: #64748b; color: white; }
    `;

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    const state = {
        initialized: false,
        status: null,
        safeLevel: 'GREEN',
        circuitBreakers: {},
        auditLog: [],
        metrics: null,
        pollingInterval: null
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // API HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    async function fetchGovernorStatus() {
        try {
            const response = await fetch(`${GOVERNOR_API}/status`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('Governor status fetch failed:', e);
        }
        return null;
    }

    async function fetchAuditLog(limit = 50) {
        try {
            const response = await fetch(`${GOVERNOR_API}/audit?limit=${limit}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('Audit log fetch failed:', e);
        }
        return [];
    }

    async function setSafeLevel(level, reason = '') {
        try {
            const response = await fetch(`${GOVERNOR_API}/safe-level`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, reason })
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error('Failed to set safe level:', e);
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI COMPONENTS
    // ═══════════════════════════════════════════════════════════════════════════

    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'governor-banner';
        banner.className = 'governor-banner hidden green';
        banner.innerHTML = `
            <div class="governor-banner-left">
                <span class="governor-banner-icon">&#128737;</span>
                <div class="governor-banner-text">
                    <h3>Governor Active</h3>
                    <p id="governor-banner-message">All systems operational</p>
                </div>
            </div>
            <div class="governor-banner-actions">
                <button class="governor-banner-btn primary" onclick="GovernorUI.openDashboard()">
                    Dashboard
                </button>
                <button class="governor-banner-btn primary" onclick="GovernorUI.hideBanner()">
                    Dismiss
                </button>
            </div>
        `;
        document.body.appendChild(banner);
        return banner;
    }

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'governor-modal';
        modal.className = 'governor-modal';
        modal.innerHTML = `
            <div class="governor-modal-content">
                <div class="governor-modal-header">
                    <h2>&#128737; Governor Dashboard</h2>
                    <button class="governor-modal-close" onclick="GovernorUI.closeDashboard()">&times;</button>
                </div>
                <div class="governor-modal-body" id="governor-modal-body">
                    <!-- Content injected dynamically -->
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                GovernorUI.closeDashboard();
            }
        });
        document.body.appendChild(modal);
        return modal;
    }

    function renderDashboardContent(container) {
        const status = state.status || {};
        const safeLevel = status.safe_level || 'GREEN';
        const circuitBreakers = status.circuit_breakers || {};
        const metrics = status.metrics || {};
        const cacheStats = status.cache_stats || {};

        const levelLower = safeLevel.toLowerCase();
        const levelMessages = {
            'green': 'All systems operational. AI operations running normally.',
            'yellow': 'Elevated caution. Some operations require additional approval.',
            'red': 'High alert. Write operations are restricted.',
            'lockdown': 'Emergency mode. All AI operations are blocked.'
        };

        const levelIcons = {
            'green': '&#9989;',
            'yellow': '&#9888;',
            'red': '&#128308;',
            'lockdown': '&#128274;'
        };

        container.innerHTML = `
            <!-- Safe Mode Status -->
            <div class="safe-mode-display ${levelLower}">
                <span class="safe-mode-icon">${levelIcons[levelLower]}</span>
                <div class="safe-mode-info">
                    <h3 style="color: ${LEVEL_COLORS[safeLevel]}">${safeLevel}</h3>
                    <p>${levelMessages[levelLower]}</p>
                </div>
                <div class="safe-mode-controls">
                    <div class="level-selector">
                        ${SAFE_LEVELS.map(level => `
                            <button class="level-btn ${level.toLowerCase()} ${safeLevel === level ? 'active' : ''}"
                                    onclick="GovernorUI.setSafeLevel('${level}')">
                                ${level}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Metrics Overview -->
            <div class="governor-card">
                <div class="governor-card-header">
                    <span class="governor-card-title">&#128200; Governance Metrics</span>
                    <span class="governor-card-badge" style="background: var(--accent, #6366f1); color: white;">
                        Live
                    </span>
                </div>
                <div class="metrics-grid">
                    ${Object.entries(metrics.gates || {}).map(([gate, stats]) => `
                        <div class="metric-item">
                            <div class="metric-value" style="color: var(--green, #22c55e)">
                                ${stats.processed || 0}
                            </div>
                            <div class="metric-label">${gate.replace(/_/g, ' ')}</div>
                        </div>
                    `).join('')}
                    <div class="metric-item">
                        <div class="metric-value" style="color: var(--blue, #3b82f6)">
                            ${((cacheStats.hit_rate || 0) * 100).toFixed(0)}%
                        </div>
                        <div class="metric-label">Cache Hit Rate</div>
                    </div>
                </div>
            </div>

            <!-- Circuit Breakers -->
            <div class="governor-card">
                <div class="governor-card-header">
                    <span class="governor-card-title">&#9889; Circuit Breakers</span>
                    <span class="governor-card-badge" style="background: rgba(34, 197, 94, 0.2); color: var(--green, #22c55e);">
                        ${Object.values(circuitBreakers).filter(cb => cb.state === 'closed').length}/${Object.keys(circuitBreakers).length} Healthy
                    </span>
                </div>
                <div class="circuit-breakers-grid">
                    ${Object.entries(circuitBreakers).map(([name, cb]) => `
                        <div class="circuit-breaker-item">
                            <div class="circuit-breaker-dot ${cb.state}"></div>
                            <div class="circuit-breaker-info">
                                <div class="circuit-breaker-name">${name.replace(/_/g, ' ')}</div>
                                <div class="circuit-breaker-stats">
                                    ${cb.state.toUpperCase()} | Failures: ${cb.failure_count}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Audit Log -->
            <div class="governor-card">
                <div class="governor-card-header">
                    <span class="governor-card-title">&#128203; Recent Decisions</span>
                    <button class="governor-banner-btn primary" onclick="GovernorUI.refreshAuditLog()">
                        Refresh
                    </button>
                </div>
                <div class="audit-log" id="governor-audit-log">
                    ${state.auditLog.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: var(--text-muted, #6b6f82);">
                            <div style="font-size: 32px; margin-bottom: 8px;">&#128737;</div>
                            <div>No governance decisions yet</div>
                        </div>
                    ` : state.auditLog.slice(0, 10).map(entry => `
                        <div class="audit-entry">
                            <span class="audit-decision-badge" style="background: ${DECISION_COLORS[entry.decision] || '#6b6f82'}; color: white;">
                                ${entry.decision}
                            </span>
                            <div class="audit-entry-content">
                                <div class="audit-entry-reason">${entry.reason}</div>
                                <div class="audit-entry-meta">
                                    Gate: ${entry.gate_name} | ${entry.operation_type} |
                                    ${new Date(entry.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Quick Actions -->
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="governor-banner-btn success" onclick="GovernorUI.runHealthCheck()">
                    &#129657; Health Check
                </button>
                <button class="governor-banner-btn primary" onclick="GovernorUI.exportAuditLog()">
                    &#128190; Export Audit Log
                </button>
                <button class="governor-banner-btn danger" onclick="GovernorUI.emergencyLockdown()">
                    &#128721; Emergency Lockdown
                </button>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    window.GovernorUI = {
        /**
         * Initialize the Governor UI
         */
        async init() {
            if (state.initialized) return;

            console.log('Initializing Governor UI...');

            // Create UI elements
            createBanner();
            createModal();

            // Fetch initial status
            await this.refresh();

            // Start polling
            state.pollingInterval = setInterval(() => this.refresh(), POLL_INTERVAL);

            state.initialized = true;
            console.log('Governor UI initialized');
        },

        /**
         * Refresh status from API
         */
        async refresh() {
            const status = await fetchGovernorStatus();
            if (status) {
                state.status = status;
                state.safeLevel = status.safe_level || 'GREEN';
                state.circuitBreakers = status.circuit_breakers || {};
                state.metrics = status.metrics || {};

                // Update banner based on safe level
                this.updateBanner();
            }
        },

        /**
         * Refresh audit log
         */
        async refreshAuditLog() {
            state.auditLog = await fetchAuditLog(50);
            const container = document.getElementById('governor-modal-body');
            if (container) {
                renderDashboardContent(container);
            }
        },

        /**
         * Update banner based on current safe level
         */
        updateBanner() {
            const banner = document.getElementById('governor-banner');
            if (!banner) return;

            const level = state.safeLevel.toLowerCase();

            // Update classes
            banner.className = `governor-banner ${level}`;

            // Update message
            const messageEl = document.getElementById('governor-banner-message');
            if (messageEl) {
                const messages = {
                    'green': 'All systems operational',
                    'yellow': 'Elevated caution mode active',
                    'red': 'High alert - Restricted operations',
                    'lockdown': 'EMERGENCY - All operations blocked'
                };
                messageEl.textContent = messages[level];
            }

            // Show banner if not GREEN
            if (level !== 'green') {
                banner.classList.remove('hidden');
            }
        },

        /**
         * Show the banner
         */
        showBanner() {
            const banner = document.getElementById('governor-banner');
            if (banner) {
                banner.classList.remove('hidden');
            }
        },

        /**
         * Hide the banner
         */
        hideBanner() {
            const banner = document.getElementById('governor-banner');
            if (banner) {
                banner.classList.add('hidden');
            }
        },

        /**
         * Open the dashboard modal
         */
        async openDashboard() {
            await this.refresh();
            await this.refreshAuditLog();

            const modal = document.getElementById('governor-modal');
            const body = document.getElementById('governor-modal-body');

            if (modal && body) {
                renderDashboardContent(body);
                modal.classList.add('visible');
            }
        },

        /**
         * Close the dashboard modal
         */
        closeDashboard() {
            const modal = document.getElementById('governor-modal');
            if (modal) {
                modal.classList.remove('visible');
            }
        },

        /**
         * Set safe level
         */
        async setSafeLevel(level) {
            if (!SAFE_LEVELS.includes(level)) return;

            const reason = level === 'LOCKDOWN'
                ? prompt('Enter reason for LOCKDOWN:')
                : `Manual change to ${level}`;

            if (level === 'LOCKDOWN' && !reason) return;

            const result = await setSafeLevel(level, reason);
            if (result) {
                state.safeLevel = level;
                this.updateBanner();
                await this.refresh();

                const body = document.getElementById('governor-modal-body');
                if (body) {
                    renderDashboardContent(body);
                }
            }
        },

        /**
         * Emergency lockdown
         */
        async emergencyLockdown() {
            if (confirm('EMERGENCY LOCKDOWN will block ALL AI operations. Are you sure?')) {
                await this.setSafeLevel('LOCKDOWN');
            }
        },

        /**
         * Run health check
         */
        async runHealthCheck() {
            const status = await fetchGovernorStatus();
            if (!status) {
                alert('Failed to get Governor status');
                return;
            }

            const issues = [];

            // Check circuit breakers
            for (const [name, cb] of Object.entries(status.circuit_breakers || {})) {
                if (cb.state === 'open') {
                    issues.push(`Circuit breaker "${name}" is OPEN`);
                }
            }

            // Check cache
            if ((status.cache_stats?.hit_rate || 0) < 0.5) {
                issues.push('Cache hit rate is below 50%');
            }

            if (issues.length === 0) {
                alert('Health Check PASSED - All systems operational');
            } else {
                alert(`Health Check WARNING:\n\n${issues.join('\n')}`);
            }
        },

        /**
         * Export audit log
         */
        async exportAuditLog() {
            const log = await fetchAuditLog(1000);
            const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `governor-audit-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        /**
         * Check and show banner if needed (call on page load)
         */
        checkAndShowBanner() {
            if (state.safeLevel && state.safeLevel !== 'GREEN') {
                this.showBanner();
            }
        },

        /**
         * Get current status
         */
        getStatus() {
            return state.status;
        },

        /**
         * Get current safe level
         */
        getSafeLevel() {
            return state.safeLevel;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GovernorUI.init());
    } else {
        GovernorUI.init();
    }

})();
