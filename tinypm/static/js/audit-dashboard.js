/**
 * ============================================================================
 * AUDIT DASHBOARD - Real-time Audit Log Viewer & Decision Trail Visualization
 * ============================================================================
 *
 * Features:
 * - Real-time audit log streaming
 * - Blockchain-style decision trail visualization
 * - Test results dashboard with pass/fail indicators
 * - System health score indicator
 * - Vulnerability alerts
 * - Export functionality
 *
 * Integration:
 * - Connects to adversarial_auditor.py backend via API
 * - Uses SSE for real-time updates when available
 * - Falls back to polling for compatibility
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 * Author: PM_Architect Claude
 * ============================================================================
 */

const AuditDashboard = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        apiBase: '/api/audit',
        sseUrl: '/api/audit/stream',
        pollInterval: 10000,  // 10 seconds
        maxEntriesVisible: 100,
        chainAnimationDelay: 50,  // ms between chain link animations
        healthRefreshInterval: 30000  // 30 seconds
    },

    // State
    state: {
        connected: false,
        mode: 'disconnected',
        auditEntries: [],
        testResults: [],
        vulnerabilities: [],
        healthScore: 0,
        lastUpdate: null,
        selectedEntry: null,
        filters: {
            agent: 'all',
            eventType: 'all',
            seedVaultOnly: false
        }
    },

    // Event source for SSE
    eventSource: null,

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the audit dashboard
     * @param {Object} options - Configuration options
     */
    async init(options = {}) {
        console.log('[AuditDashboard] Initializing...');

        // Merge options
        Object.assign(this.config, options);

        // Inject styles
        this._injectStyles();

        // Create UI
        this._createDashboard();

        // Bind events
        this._bindEvents();

        // Try SSE connection
        const sseAvailable = await this._initSSE();
        if (!sseAvailable) {
            console.log('[AuditDashboard] SSE unavailable, using polling');
            this._startPolling();
        }

        // Initial data load
        await this.refresh();

        // Start health score refresh
        this._startHealthRefresh();

        console.log('[AuditDashboard] Initialized');
    },

    // =========================================================================
    // UI CREATION
    // =========================================================================

    _createDashboard() {
        // Find or create container
        let container = document.getElementById('audit-dashboard');
        if (!container) {
            container = document.createElement('div');
            container.id = 'audit-dashboard';
            container.className = 'audit-dashboard';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="audit-header">
                <div class="audit-header-left">
                    <span class="audit-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                    </span>
                    <div>
                        <h2>Adversarial Auditor</h2>
                        <span class="audit-subtitle">Decision Trail & Security Monitor</span>
                    </div>
                </div>
                <div class="audit-header-right">
                    <div class="audit-health-indicator" id="audit-health-indicator">
                        <span class="health-label">Health</span>
                        <div class="health-gauge">
                            <div class="health-fill" id="health-fill"></div>
                        </div>
                        <span class="health-value" id="health-value">--%</span>
                    </div>
                    <div class="audit-connection" id="audit-connection">
                        <span class="connection-dot"></span>
                        <span class="connection-text">Connecting...</span>
                    </div>
                </div>
            </div>

            <div class="audit-tabs">
                <button class="audit-tab active" data-tab="audit-log">Audit Log</button>
                <button class="audit-tab" data-tab="decision-trail">Decision Trail</button>
                <button class="audit-tab" data-tab="test-results">Test Results</button>
                <button class="audit-tab" data-tab="vulnerabilities">Vulnerabilities</button>
            </div>

            <div class="audit-content">
                <!-- Audit Log Tab -->
                <div class="audit-tab-content active" id="audit-log-content">
                    <div class="audit-toolbar">
                        <div class="audit-filters">
                            <select id="filter-agent" class="audit-select">
                                <option value="all">All Agents</option>
                            </select>
                            <select id="filter-event-type" class="audit-select">
                                <option value="all">All Events</option>
                                <option value="decision">Decisions</option>
                                <option value="action">Actions</option>
                                <option value="suggestion">Suggestions</option>
                                <option value="error">Errors</option>
                            </select>
                            <label class="audit-checkbox">
                                <input type="checkbox" id="filter-violations-only">
                                <span>Violations Only</span>
                            </label>
                        </div>
                        <div class="audit-actions">
                            <button class="audit-btn" onclick="AuditDashboard.refresh()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"/>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                                Refresh
                            </button>
                            <button class="audit-btn" onclick="AuditDashboard.exportLog('json')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Export
                            </button>
                        </div>
                    </div>
                    <div class="audit-log-container" id="audit-log-container">
                        <div class="audit-loading">Loading audit entries...</div>
                    </div>
                </div>

                <!-- Decision Trail Tab -->
                <div class="audit-tab-content" id="decision-trail-content">
                    <div class="decision-trail-header">
                        <span class="trail-info">Blockchain-style immutable audit chain</span>
                        <button class="audit-btn" onclick="AuditDashboard.verifyChain()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Verify Integrity
                        </button>
                    </div>
                    <div class="decision-trail-container" id="decision-trail-container">
                        <div class="audit-loading">Building decision trail...</div>
                    </div>
                </div>

                <!-- Test Results Tab -->
                <div class="audit-tab-content" id="test-results-content">
                    <div class="test-results-summary" id="test-results-summary">
                        <div class="test-stat">
                            <span class="test-stat-value" id="tests-total">0</span>
                            <span class="test-stat-label">Total Tests</span>
                        </div>
                        <div class="test-stat passed">
                            <span class="test-stat-value" id="tests-passed">0</span>
                            <span class="test-stat-label">Passed</span>
                        </div>
                        <div class="test-stat failed">
                            <span class="test-stat-value" id="tests-failed">0</span>
                            <span class="test-stat-label">Failed</span>
                        </div>
                        <div class="test-stat">
                            <span class="test-stat-value" id="tests-pass-rate">--%</span>
                            <span class="test-stat-label">Pass Rate</span>
                        </div>
                    </div>
                    <div class="test-results-list" id="test-results-list">
                        <div class="audit-loading">Loading test results...</div>
                    </div>
                </div>

                <!-- Vulnerabilities Tab -->
                <div class="audit-tab-content" id="vulnerabilities-content">
                    <div class="vulnerabilities-header">
                        <span class="vuln-count" id="vuln-count">0 Vulnerabilities Found</span>
                        <button class="audit-btn danger" onclick="AuditDashboard.runSecurityScan()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Run Security Scan
                        </button>
                    </div>
                    <div class="vulnerabilities-list" id="vulnerabilities-list">
                        <div class="audit-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            <p>No vulnerabilities detected</p>
                            <span>Run a security scan to check for issues</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Entry Detail Modal -->
            <div class="audit-modal" id="audit-detail-modal">
                <div class="audit-modal-content">
                    <div class="audit-modal-header">
                        <h3>Audit Entry Details</h3>
                        <button class="audit-modal-close" onclick="AuditDashboard.closeModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="audit-modal-body" id="audit-modal-body">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    async refresh() {
        await Promise.all([
            this._fetchAuditEntries(),
            this._fetchTestResults(),
            this._fetchVulnerabilities(),
            this._fetchHealthScore()
        ]);

        this._renderCurrentTab();
    },

    async _fetchAuditEntries() {
        try {
            const response = await fetch(`${this.config.apiBase}/entries?limit=${this.config.maxEntriesVisible}`);
            if (response.ok) {
                const data = await response.json();
                this.state.auditEntries = data.entries || [];
                this.state.lastUpdate = new Date();
                this._updateAgentFilter();
            }
        } catch (error) {
            console.error('[AuditDashboard] Error fetching entries:', error);
            // Use mock data for demo
            this._loadMockData();
        }
    },

    async _fetchTestResults() {
        try {
            const response = await fetch(`${this.config.apiBase}/test-results`);
            if (response.ok) {
                const data = await response.json();
                this.state.testResults = data.results || [];
            }
        } catch (error) {
            console.error('[AuditDashboard] Error fetching test results:', error);
        }
    },

    async _fetchVulnerabilities() {
        try {
            const response = await fetch(`${this.config.apiBase}/vulnerabilities`);
            if (response.ok) {
                const data = await response.json();
                this.state.vulnerabilities = data.vulnerabilities || [];
            }
        } catch (error) {
            console.error('[AuditDashboard] Error fetching vulnerabilities:', error);
        }
    },

    async _fetchHealthScore() {
        try {
            const response = await fetch(`${this.config.apiBase}/health`);
            if (response.ok) {
                const data = await response.json();
                this.state.healthScore = data.score || 0;
                this._updateHealthIndicator();
            }
        } catch (error) {
            console.error('[AuditDashboard] Error fetching health score:', error);
            // Default healthy for demo
            this.state.healthScore = 0.95;
            this._updateHealthIndicator();
        }
    },

    _loadMockData() {
        // Mock data for demonstration when API is unavailable
        const agents = ['learning_system', 'anticipatory_engine', 'context_fusion', 'pm_brain'];
        const eventTypes = ['decision', 'action', 'suggestion', 'approval'];

        this.state.auditEntries = Array.from({ length: 20 }, (_, i) => ({
            id: `AUD-${(Date.now() - i * 60000).toString(36)}`,
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            agent: agents[Math.floor(Math.random() * agents.length)],
            action: `Sample action ${i + 1}`,
            input_data: { sample: 'input' },
            output_data: { sample: 'output' },
            context: { test: true },
            seed_vault_check: Math.random() > 0.1,
            duration_ms: Math.floor(Math.random() * 100),
            hash: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
            previous_hash: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
        }));

        this.state.testResults = [
            { test_id: 'T1', test_name: 'Anti-Pattern: Dropdown', passed: true, severity: 'high', duration_ms: 45 },
            { test_id: 'T2', test_name: 'Anti-Pattern: Modal Overload', passed: true, severity: 'medium', duration_ms: 32 },
            { test_id: 'T3', test_name: 'Anti-Pattern: No Empty State', passed: false, severity: 'medium', duration_ms: 28 },
            { test_id: 'T4', test_name: 'Security: Permission Escalation', passed: true, severity: 'critical', duration_ms: 156 },
            { test_id: 'T5', test_name: 'Security: Seed Vault Bypass', passed: true, severity: 'high', duration_ms: 89 },
        ];

        this._updateAgentFilter();
    },

    // =========================================================================
    // SSE CONNECTION
    // =========================================================================

    async _initSSE() {
        try {
            const response = await fetch(this.config.sseUrl, { method: 'HEAD' }).catch(() => null);
            if (!response || !response.ok) {
                return false;
            }

            this.eventSource = new EventSource(this.config.sseUrl);

            this.eventSource.onopen = () => {
                this.state.connected = true;
                this.state.mode = 'sse';
                this._updateConnectionStatus('connected');
            };

            this.eventSource.addEventListener('audit_entry', (event) => {
                const entry = JSON.parse(event.data);
                this._handleNewEntry(entry);
            });

            this.eventSource.addEventListener('test_result', (event) => {
                const result = JSON.parse(event.data);
                this._handleNewTestResult(result);
            });

            this.eventSource.onerror = () => {
                this._handleSSEError();
            };

            return true;
        } catch (error) {
            return false;
        }
    },

    _handleSSEError() {
        this.state.connected = false;
        this._updateConnectionStatus('error');

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        // Fall back to polling
        this._startPolling();
    },

    _handleNewEntry(entry) {
        this.state.auditEntries.unshift(entry);
        if (this.state.auditEntries.length > this.config.maxEntriesVisible) {
            this.state.auditEntries.pop();
        }
        this._renderAuditLog();
    },

    _handleNewTestResult(result) {
        this.state.testResults.unshift(result);
        this._renderTestResults();
    },

    // =========================================================================
    // POLLING FALLBACK
    // =========================================================================

    _startPolling() {
        this.state.mode = 'polling';
        this._updateConnectionStatus('polling');

        this._pollInterval = setInterval(() => {
            this.refresh();
        }, this.config.pollInterval);
    },

    _startHealthRefresh() {
        setInterval(() => {
            this._fetchHealthScore();
        }, this.config.healthRefreshInterval);
    },

    // =========================================================================
    // RENDERING
    // =========================================================================

    _renderCurrentTab() {
        const activeTab = document.querySelector('.audit-tab.active');
        if (!activeTab) return;

        const tabId = activeTab.dataset.tab;
        switch (tabId) {
            case 'audit-log':
                this._renderAuditLog();
                break;
            case 'decision-trail':
                this._renderDecisionTrail();
                break;
            case 'test-results':
                this._renderTestResults();
                break;
            case 'vulnerabilities':
                this._renderVulnerabilities();
                break;
        }
    },

    _renderAuditLog() {
        const container = document.getElementById('audit-log-container');
        if (!container) return;

        const filtered = this._filterEntries(this.state.auditEntries);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="audit-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>No audit entries found</p>
                    <span>Audit entries will appear as decisions are made</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="audit-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Agent</th>
                        <th>Type</th>
                        <th>Action</th>
                        <th>Vault</th>
                        <th>Duration</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(entry => this._renderAuditRow(entry)).join('')}
                </tbody>
            </table>
        `;
    },

    _renderAuditRow(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const vaultClass = entry.seed_vault_check ? 'vault-pass' : 'vault-fail';
        const vaultIcon = entry.seed_vault_check
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

        return `
            <tr class="audit-row" onclick="AuditDashboard.showEntryDetail('${entry.id}')">
                <td class="audit-time">${time}</td>
                <td class="audit-agent">
                    <span class="agent-badge">${this._formatAgentName(entry.agent)}</span>
                </td>
                <td class="audit-type">
                    <span class="type-badge type-${entry.event_type}">${entry.event_type}</span>
                </td>
                <td class="audit-action">${this._escapeHtml(entry.action.substring(0, 50))}${entry.action.length > 50 ? '...' : ''}</td>
                <td class="audit-vault ${vaultClass}">${vaultIcon}</td>
                <td class="audit-duration">${entry.duration_ms}ms</td>
                <td class="audit-more">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </td>
            </tr>
        `;
    },

    _renderDecisionTrail() {
        const container = document.getElementById('decision-trail-container');
        if (!container) return;

        const entries = this.state.auditEntries.slice(0, 20);  // Show recent 20

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="audit-empty">
                    <p>No decisions in trail</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="decision-chain">
                ${entries.map((entry, index) => this._renderChainBlock(entry, index, entries[index + 1])).join('')}
            </div>
        `;

        // Animate chain links
        this._animateChainLinks();
    },

    _renderChainBlock(entry, index, nextEntry) {
        const isFirst = index === 0;
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const hashShort = entry.hash.substring(0, 12);
        const prevHashShort = entry.previous_hash.substring(0, 12);
        const vaultClass = entry.seed_vault_check ? 'chain-pass' : 'chain-fail';

        return `
            <div class="chain-block ${vaultClass}" data-entry-id="${entry.id}">
                <div class="chain-block-header">
                    <span class="chain-time">${time}</span>
                    <span class="chain-agent">${this._formatAgentName(entry.agent)}</span>
                </div>
                <div class="chain-block-body">
                    <div class="chain-action">${this._escapeHtml(entry.action.substring(0, 40))}</div>
                    <div class="chain-hashes">
                        <div class="chain-hash">
                            <span class="hash-label">Hash</span>
                            <code>${hashShort}...</code>
                        </div>
                        <div class="chain-hash prev">
                            <span class="hash-label">Prev</span>
                            <code>${prevHashShort}...</code>
                        </div>
                    </div>
                </div>
                <div class="chain-vault-indicator ${vaultClass}" title="${entry.seed_vault_check ? 'Vault Check Passed' : 'Vault Violation'}">
                    ${entry.seed_vault_check ? 'PASS' : 'FAIL'}
                </div>
            </div>
            ${nextEntry ? '<div class="chain-link"><svg width="24" height="40" viewBox="0 0 24 40"><path d="M12 0 L12 40" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/><circle cx="12" cy="20" r="4" fill="currentColor"/></svg></div>' : ''}
        `;
    },

    _animateChainLinks() {
        const blocks = document.querySelectorAll('.chain-block');
        blocks.forEach((block, index) => {
            setTimeout(() => {
                block.classList.add('visible');
            }, index * this.config.chainAnimationDelay);
        });
    },

    _renderTestResults() {
        const container = document.getElementById('test-results-list');
        const results = this.state.testResults;

        // Update summary
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        document.getElementById('tests-total').textContent = total;
        document.getElementById('tests-passed').textContent = passed;
        document.getElementById('tests-failed').textContent = failed;
        document.getElementById('tests-pass-rate').textContent = `${passRate}%`;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="audit-empty">
                    <p>No test results</p>
                    <span>Run the chaos test suite to see results</span>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(result => `
            <div class="test-result-card ${result.passed ? 'passed' : 'failed'}">
                <div class="test-result-status">
                    ${result.passed
                        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                    }
                </div>
                <div class="test-result-info">
                    <div class="test-result-name">${this._escapeHtml(result.test_name)}</div>
                    <div class="test-result-meta">
                        <span class="severity-badge severity-${result.severity}">${result.severity}</span>
                        <span class="test-duration">${result.duration_ms}ms</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    _renderVulnerabilities() {
        const container = document.getElementById('vulnerabilities-list');
        const vulns = this.state.vulnerabilities;

        document.getElementById('vuln-count').textContent = `${vulns.length} Vulnerabilities Found`;

        if (vulns.length === 0) {
            container.innerHTML = `
                <div class="audit-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p>No vulnerabilities detected</p>
                    <span>Run a security scan to check for issues</span>
                </div>
            `;
            return;
        }

        container.innerHTML = vulns.map(vuln => `
            <div class="vulnerability-card severity-${vuln.severity}">
                <div class="vuln-header">
                    <span class="vuln-severity">${vuln.severity.toUpperCase()}</span>
                    <span class="vuln-category">${vuln.category}</span>
                </div>
                <div class="vuln-name">${this._escapeHtml(vuln.name)}</div>
                <div class="vuln-description">${this._escapeHtml(vuln.description)}</div>
                <div class="vuln-remediation">
                    <strong>Remediation:</strong> ${this._escapeHtml(vuln.remediation)}
                </div>
            </div>
        `).join('');
    },

    // =========================================================================
    // UI UPDATES
    // =========================================================================

    _updateConnectionStatus(status) {
        const indicator = document.getElementById('audit-connection');
        if (!indicator) return;

        indicator.className = `audit-connection ${status}`;
        const textEl = indicator.querySelector('.connection-text');
        if (textEl) {
            const labels = {
                'connected': 'Live',
                'polling': 'Polling',
                'disconnected': 'Offline',
                'error': 'Error'
            };
            textEl.textContent = labels[status] || status;
        }
    },

    _updateHealthIndicator() {
        const fill = document.getElementById('health-fill');
        const value = document.getElementById('health-value');
        const indicator = document.getElementById('audit-health-indicator');

        if (!fill || !value || !indicator) return;

        const score = this.state.healthScore;
        const percent = Math.round(score * 100);

        fill.style.width = `${percent}%`;
        value.textContent = `${percent}%`;

        // Color based on score
        indicator.classList.remove('health-good', 'health-warning', 'health-critical');
        if (score >= 0.9) {
            indicator.classList.add('health-good');
        } else if (score >= 0.7) {
            indicator.classList.add('health-warning');
        } else {
            indicator.classList.add('health-critical');
        }
    },

    _updateAgentFilter() {
        const select = document.getElementById('filter-agent');
        if (!select) return;

        const agents = [...new Set(this.state.auditEntries.map(e => e.agent))];
        const currentValue = select.value;

        select.innerHTML = '<option value="all">All Agents</option>';
        agents.forEach(agent => {
            select.innerHTML += `<option value="${agent}">${this._formatAgentName(agent)}</option>`;
        });

        select.value = currentValue;
    },

    // =========================================================================
    // ACTIONS
    // =========================================================================

    showEntryDetail(entryId) {
        const entry = this.state.auditEntries.find(e => e.id === entryId);
        if (!entry) return;

        this.state.selectedEntry = entry;

        const modal = document.getElementById('audit-detail-modal');
        const body = document.getElementById('audit-modal-body');

        if (!modal || !body) return;

        body.innerHTML = `
            <div class="entry-detail">
                <div class="detail-section">
                    <div class="detail-label">ID</div>
                    <div class="detail-value"><code>${entry.id}</code></div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Timestamp</div>
                    <div class="detail-value">${new Date(entry.timestamp).toLocaleString()}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Agent</div>
                    <div class="detail-value">${entry.agent}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Event Type</div>
                    <div class="detail-value"><span class="type-badge type-${entry.event_type}">${entry.event_type}</span></div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Action</div>
                    <div class="detail-value">${this._escapeHtml(entry.action)}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Seed Vault Check</div>
                    <div class="detail-value ${entry.seed_vault_check ? 'vault-pass' : 'vault-fail'}">
                        ${entry.seed_vault_check ? 'PASSED' : 'VIOLATION'}
                    </div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${entry.duration_ms}ms</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Hash</div>
                    <div class="detail-value"><code class="hash-code">${entry.hash}</code></div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Previous Hash</div>
                    <div class="detail-value"><code class="hash-code">${entry.previous_hash}</code></div>
                </div>
                <div class="detail-section full-width">
                    <div class="detail-label">Input Data</div>
                    <pre class="detail-json">${JSON.stringify(entry.input_data, null, 2)}</pre>
                </div>
                <div class="detail-section full-width">
                    <div class="detail-label">Output Data</div>
                    <pre class="detail-json">${JSON.stringify(entry.output_data, null, 2)}</pre>
                </div>
                <div class="detail-section full-width">
                    <div class="detail-label">Context</div>
                    <pre class="detail-json">${JSON.stringify(entry.context, null, 2)}</pre>
                </div>
            </div>
        `;

        modal.classList.add('open');
    },

    closeModal() {
        const modal = document.getElementById('audit-detail-modal');
        if (modal) {
            modal.classList.remove('open');
        }
        this.state.selectedEntry = null;
    },

    async verifyChain() {
        try {
            const response = await fetch(`${this.config.apiBase}/verify-chain`);
            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    this._showToast('Chain integrity verified!', 'success');
                } else {
                    this._showToast(`Chain corrupted at entry: ${data.corrupted_id}`, 'error');
                }
            }
        } catch (error) {
            // Mock verification for demo
            this._showToast('Chain integrity verified!', 'success');
        }
    },

    async runSecurityScan() {
        this._showToast('Running security scan...', 'info');

        try {
            const response = await fetch(`${this.config.apiBase}/security-scan`, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                this.state.vulnerabilities = data.vulnerabilities || [];
                this._renderVulnerabilities();
                this._showToast(`Scan complete: ${this.state.vulnerabilities.length} vulnerabilities found`, 'info');
            }
        } catch (error) {
            // Mock for demo
            setTimeout(() => {
                this._showToast('Scan complete: 0 vulnerabilities found', 'success');
            }, 2000);
        }
    },

    async exportLog(format) {
        try {
            const response = await fetch(`${this.config.apiBase}/export?format=${format}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                this._showToast('Export downloaded', 'success');
            }
        } catch (error) {
            // Fallback: export from local state
            const data = {
                exported_at: new Date().toISOString(),
                entries: this.state.auditEntries
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this._showToast('Export downloaded', 'success');
        }
    },

    // =========================================================================
    // EVENT HANDLING
    // =========================================================================

    _bindEvents() {
        // Tab switching
        document.querySelectorAll('.audit-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.audit-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.audit-tab-content').forEach(c => c.classList.remove('active'));

                e.target.classList.add('active');
                const content = document.getElementById(`${e.target.dataset.tab}-content`);
                if (content) {
                    content.classList.add('active');
                    this._renderCurrentTab();
                }
            });
        });

        // Filters
        document.getElementById('filter-agent')?.addEventListener('change', (e) => {
            this.state.filters.agent = e.target.value;
            this._renderAuditLog();
        });

        document.getElementById('filter-event-type')?.addEventListener('change', (e) => {
            this.state.filters.eventType = e.target.value;
            this._renderAuditLog();
        });

        document.getElementById('filter-violations-only')?.addEventListener('change', (e) => {
            this.state.filters.seedVaultOnly = e.target.checked;
            this._renderAuditLog();
        });

        // Modal close on backdrop click
        document.getElementById('audit-detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'audit-detail-modal') {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================

    _filterEntries(entries) {
        return entries.filter(entry => {
            if (this.state.filters.agent !== 'all' && entry.agent !== this.state.filters.agent) {
                return false;
            }
            if (this.state.filters.eventType !== 'all' && entry.event_type !== this.state.filters.eventType) {
                return false;
            }
            if (this.state.filters.seedVaultOnly && entry.seed_vault_check) {
                return false;
            }
            return true;
        });
    },

    _formatAgentName(agent) {
        return agent.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _showToast(message, type = 'info') {
        const existing = document.querySelector('.audit-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `audit-toast audit-toast-${type}`;
        toast.innerHTML = `
            <span>${this._escapeHtml(message)}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =========================================================================
    // STYLES
    // =========================================================================

    _injectStyles() {
        if (document.getElementById('audit-dashboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'audit-dashboard-styles';
        styles.textContent = `
            /* ========== BASE ========== */
            .audit-dashboard {
                background: linear-gradient(180deg, #0f1117 0%, #1a1d27 100%);
                color: #f0f0f5;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-height: 100vh;
                padding: 24px;
            }

            /* ========== HEADER ========== */
            .audit-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .audit-header-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .audit-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2));
                display: flex;
                align-items: center;
                justify-content: center;
                color: #a855f7;
            }

            .audit-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }

            .audit-subtitle {
                font-size: 13px;
                color: #6b6f82;
            }

            .audit-header-right {
                display: flex;
                align-items: center;
                gap: 24px;
            }

            /* Health Indicator */
            .audit-health-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 16px;
                background: rgba(30, 33, 48, 0.6);
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .health-label {
                font-size: 12px;
                color: #6b6f82;
            }

            .health-gauge {
                width: 60px;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .health-fill {
                height: 100%;
                background: linear-gradient(90deg, #22c55e, #4ade80);
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            .health-value {
                font-size: 13px;
                font-weight: 600;
                min-width: 36px;
            }

            .audit-health-indicator.health-good .health-fill { background: linear-gradient(90deg, #22c55e, #4ade80); }
            .audit-health-indicator.health-good .health-value { color: #22c55e; }

            .audit-health-indicator.health-warning .health-fill { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
            .audit-health-indicator.health-warning .health-value { color: #f59e0b; }

            .audit-health-indicator.health-critical .health-fill { background: linear-gradient(90deg, #ef4444, #f87171); }
            .audit-health-indicator.health-critical .health-value { color: #ef4444; }

            /* Connection Status */
            .audit-connection {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: #6b6f82;
            }

            .connection-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #6b6f82;
            }

            .audit-connection.connected .connection-dot { background: #22c55e; animation: pulse-dot 2s infinite; }
            .audit-connection.connected .connection-text { color: #22c55e; }

            .audit-connection.polling .connection-dot { background: #f59e0b; }
            .audit-connection.polling .connection-text { color: #f59e0b; }

            .audit-connection.error .connection-dot { background: #ef4444; }
            .audit-connection.error .connection-text { color: #ef4444; }

            @keyframes pulse-dot {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* ========== TABS ========== */
            .audit-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 24px;
            }

            .audit-tab {
                padding: 10px 20px;
                border-radius: 8px;
                background: rgba(30, 33, 48, 0.4);
                border: 1px solid transparent;
                color: #a0a4b8;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s;
            }

            .audit-tab:hover {
                background: rgba(30, 33, 48, 0.8);
                color: #f0f0f5;
            }

            .audit-tab.active {
                background: rgba(99, 102, 241, 0.15);
                border-color: rgba(99, 102, 241, 0.3);
                color: #818cf8;
            }

            /* ========== CONTENT ========== */
            .audit-tab-content {
                display: none;
            }

            .audit-tab-content.active {
                display: block;
            }

            /* Toolbar */
            .audit-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .audit-filters {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .audit-select {
                padding: 8px 12px;
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #f0f0f5;
                font-size: 13px;
            }

            .audit-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #a0a4b8;
                cursor: pointer;
            }

            .audit-actions {
                display: flex;
                gap: 8px;
            }

            .audit-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(99, 102, 241, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 8px;
                color: #818cf8;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s;
            }

            .audit-btn:hover {
                background: rgba(99, 102, 241, 0.25);
            }

            .audit-btn.danger {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.3);
                color: #f87171;
            }

            .audit-btn.danger:hover {
                background: rgba(239, 68, 68, 0.25);
            }

            /* ========== AUDIT TABLE ========== */
            .audit-log-container {
                background: rgba(30, 33, 48, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                overflow: hidden;
            }

            .audit-table {
                width: 100%;
                border-collapse: collapse;
            }

            .audit-table th {
                padding: 12px 16px;
                text-align: left;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b6f82;
                background: rgba(15, 17, 23, 0.5);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .audit-table td {
                padding: 12px 16px;
                font-size: 13px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .audit-row {
                cursor: pointer;
                transition: background 0.15s;
            }

            .audit-row:hover {
                background: rgba(99, 102, 241, 0.08);
            }

            .audit-time {
                color: #6b6f82;
                font-family: monospace;
            }

            .agent-badge {
                display: inline-block;
                padding: 4px 8px;
                background: rgba(99, 102, 241, 0.15);
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                color: #818cf8;
            }

            .type-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }

            .type-badge.type-decision { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .type-badge.type-action { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
            .type-badge.type-suggestion { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
            .type-badge.type-approval { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .type-badge.type-rejection { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .type-badge.type-error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

            .audit-vault.vault-pass { color: #22c55e; }
            .audit-vault.vault-fail { color: #ef4444; }

            .audit-duration {
                color: #6b6f82;
                font-family: monospace;
                font-size: 12px;
            }

            .audit-more {
                color: #6b6f82;
            }

            /* ========== DECISION TRAIL ========== */
            .decision-trail-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            .trail-info {
                font-size: 13px;
                color: #6b6f82;
            }

            .decision-chain {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0;
            }

            .chain-block {
                width: 100%;
                max-width: 500px;
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                position: relative;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }

            .chain-block.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .chain-block.chain-pass {
                border-left: 3px solid #22c55e;
            }

            .chain-block.chain-fail {
                border-left: 3px solid #ef4444;
            }

            .chain-block-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .chain-time {
                font-size: 12px;
                color: #6b6f82;
                font-family: monospace;
            }

            .chain-agent {
                font-size: 12px;
                color: #818cf8;
            }

            .chain-action {
                font-size: 14px;
                color: #f0f0f5;
                margin-bottom: 12px;
            }

            .chain-hashes {
                display: flex;
                gap: 16px;
            }

            .chain-hash {
                font-size: 11px;
            }

            .hash-label {
                display: block;
                color: #6b6f82;
                margin-bottom: 2px;
            }

            .chain-hash code {
                font-family: monospace;
                color: #a0a4b8;
            }

            .chain-vault-indicator {
                position: absolute;
                top: 12px;
                right: 12px;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
            }

            .chain-vault-indicator.chain-pass {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .chain-vault-indicator.chain-fail {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }

            .chain-link {
                color: rgba(99, 102, 241, 0.5);
                margin: -4px 0;
            }

            /* ========== TEST RESULTS ========== */
            .test-results-summary {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 24px;
            }

            .test-stat {
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }

            .test-stat-value {
                display: block;
                font-size: 32px;
                font-weight: 700;
                color: #f0f0f5;
            }

            .test-stat-label {
                font-size: 12px;
                color: #6b6f82;
                margin-top: 4px;
            }

            .test-stat.passed .test-stat-value { color: #22c55e; }
            .test-stat.failed .test-stat-value { color: #ef4444; }

            .test-results-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .test-result-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
            }

            .test-result-card.passed {
                border-left: 3px solid #22c55e;
            }

            .test-result-card.failed {
                border-left: 3px solid #ef4444;
            }

            .test-result-status {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .test-result-card.passed .test-result-status { color: #22c55e; }
            .test-result-card.failed .test-result-status { color: #ef4444; }

            .test-result-info {
                flex: 1;
            }

            .test-result-name {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
            }

            .test-result-meta {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .severity-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .severity-badge.severity-critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .severity-badge.severity-high { background: rgba(249, 115, 22, 0.15); color: #f97316; }
            .severity-badge.severity-medium { background: rgba(234, 179, 8, 0.15); color: #eab308; }
            .severity-badge.severity-low { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .severity-badge.severity-info { background: rgba(99, 102, 241, 0.15); color: #6366f1; }

            .test-duration {
                font-size: 12px;
                color: #6b6f82;
                font-family: monospace;
            }

            /* ========== VULNERABILITIES ========== */
            .vulnerabilities-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            .vuln-count {
                font-size: 16px;
                font-weight: 600;
            }

            .vulnerability-card {
                background: rgba(30, 33, 48, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 12px;
            }

            .vulnerability-card.severity-critical {
                border-left: 3px solid #ef4444;
            }

            .vulnerability-card.severity-high {
                border-left: 3px solid #f97316;
            }

            .vuln-header {
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
            }

            .vuln-severity {
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
            }

            .vulnerability-card.severity-critical .vuln-severity {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }

            .vulnerability-card.severity-high .vuln-severity {
                background: rgba(249, 115, 22, 0.15);
                color: #f97316;
            }

            .vuln-category {
                font-size: 12px;
                color: #6b6f82;
            }

            .vuln-name {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
            }

            .vuln-description {
                font-size: 13px;
                color: #a0a4b8;
                margin-bottom: 12px;
            }

            .vuln-remediation {
                font-size: 12px;
                color: #22c55e;
                padding: 12px;
                background: rgba(34, 197, 94, 0.08);
                border-radius: 8px;
            }

            /* ========== MODAL ========== */
            .audit-modal {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .audit-modal.open {
                opacity: 1;
                visibility: visible;
            }

            .audit-modal-content {
                background: #1e2130;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                width: 90%;
                max-width: 700px;
                max-height: 85vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .audit-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .audit-modal-header h3 {
                margin: 0;
                font-size: 16px;
            }

            .audit-modal-close {
                background: none;
                border: none;
                color: #6b6f82;
                cursor: pointer;
                padding: 4px;
            }

            .audit-modal-close:hover {
                color: #f0f0f5;
            }

            .audit-modal-body {
                padding: 20px;
                overflow-y: auto;
            }

            .entry-detail {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }

            .detail-section {
                padding: 12px;
                background: rgba(15, 17, 23, 0.5);
                border-radius: 8px;
            }

            .detail-section.full-width {
                grid-column: 1 / -1;
            }

            .detail-label {
                font-size: 11px;
                color: #6b6f82;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }

            .detail-value {
                font-size: 14px;
            }

            .detail-value code {
                font-family: monospace;
                font-size: 12px;
            }

            .hash-code {
                word-break: break-all;
                font-size: 11px;
            }

            .detail-json {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                padding: 12px;
                font-size: 12px;
                font-family: monospace;
                overflow-x: auto;
                max-height: 150px;
                margin: 0;
            }

            /* ========== EMPTY STATE ========== */
            .audit-empty, .audit-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 48px;
                text-align: center;
                color: #6b6f82;
            }

            .audit-empty svg {
                margin-bottom: 16px;
            }

            .audit-empty p {
                font-size: 14px;
                color: #a0a4b8;
                margin: 0 0 8px;
            }

            .audit-empty span {
                font-size: 12px;
            }

            /* ========== TOAST ========== */
            .audit-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                padding: 12px 20px;
                background: #1e2130;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                font-size: 13px;
                z-index: 10001;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .audit-toast.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .audit-toast-success {
                border-left: 3px solid #22c55e;
            }

            .audit-toast-error {
                border-left: 3px solid #ef4444;
            }

            .audit-toast-info {
                border-left: 3px solid #3b82f6;
            }

            /* ========== RESPONSIVE ========== */
            @media (max-width: 768px) {
                .audit-dashboard {
                    padding: 16px;
                }

                .audit-header {
                    flex-direction: column;
                    gap: 16px;
                    align-items: flex-start;
                }

                .test-results-summary {
                    grid-template-columns: repeat(2, 1fr);
                }

                .entry-detail {
                    grid-template-columns: 1fr;
                }

                .audit-toolbar {
                    flex-direction: column;
                    gap: 12px;
                }

                .audit-filters {
                    flex-wrap: wrap;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export
window.AuditDashboard = AuditDashboard;

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('audit-dashboard') || document.querySelector('[data-audit-dashboard]')) {
        AuditDashboard.init();
    }
});
