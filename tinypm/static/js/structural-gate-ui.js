/**
 * ============================================================================
 * STRUCTURAL GATE UI - Schema Browser and Validation Dashboard
 * ============================================================================
 *
 * Frontend component for the TinyPM Structural Gate system.
 *
 * Features:
 * - Schema browser with version selector
 * - Live validation testing
 * - Kill count indicator
 * - Validation error display
 * - Schema health monitoring
 *
 * Usage:
 *   <div id="structural-gate-container"></div>
 *   <script src="/static/js/structural-gate-ui.js"></script>
 *   <script>
 *     const gateUI = new StructuralGateUI('#structural-gate-container');
 *     gateUI.init();
 *   </script>
 *
 * Created: 2026-02-04
 * Part of: Project Sovereign Seed - Phase 2
 * ============================================================================
 */

class StructuralGateUI {
    /**
     * Initialize the Structural Gate UI component.
     * @param {string} containerId - CSS selector for the container element
     * @param {object} options - Configuration options
     */
    constructor(containerId, options = {}) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            console.error(`StructuralGateUI: Container not found: ${containerId}`);
            return;
        }

        this.options = {
            apiBase: options.apiBase || '/api/admin/schemas',
            refreshInterval: options.refreshInterval || 30000, // 30 seconds
            showKillCount: options.showKillCount !== false,
            showSchemaBrowser: options.showSchemaBrowser !== false,
            showValidationTester: options.showValidationTester !== false,
            compactMode: options.compactMode || false,
            ...options
        };

        this.schemas = {};
        this.stats = {};
        this.refreshTimer = null;

        // Bind methods
        this.refresh = this.refresh.bind(this);
        this.handleSchemaSelect = this.handleSchemaSelect.bind(this);
        this.handleValidateTest = this.handleValidateTest.bind(this);
    }

    /**
     * Initialize the UI and start auto-refresh.
     */
    async init() {
        this.render();
        await this.refresh();

        if (this.options.refreshInterval > 0) {
            this.refreshTimer = setInterval(this.refresh, this.options.refreshInterval);
        }

        console.log('[StructuralGateUI] Initialized');
    }

    /**
     * Clean up and stop auto-refresh.
     */
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Render the main UI structure.
     */
    render() {
        const html = `
            <div class="structural-gate-ui" data-compact="${this.options.compactMode}">
                <!-- Header with Stats -->
                <div class="sg-header">
                    <div class="sg-title">
                        <span class="sg-icon">&#128274;</span>
                        <h3>Structural Gate</h3>
                    </div>
                    <div class="sg-stats-bar">
                        <div class="sg-stat sg-stat-pass">
                            <span class="sg-stat-value" id="sg-pass-count">0</span>
                            <span class="sg-stat-label">Pass</span>
                        </div>
                        <div class="sg-stat sg-stat-warn">
                            <span class="sg-stat-value" id="sg-warn-count">0</span>
                            <span class="sg-stat-label">Warn</span>
                        </div>
                        <div class="sg-stat sg-stat-kill">
                            <span class="sg-stat-value" id="sg-kill-count">0</span>
                            <span class="sg-stat-label">Kill</span>
                        </div>
                        <div class="sg-stat sg-stat-rate">
                            <span class="sg-stat-value" id="sg-pass-rate">100%</span>
                            <span class="sg-stat-label">Pass Rate</span>
                        </div>
                    </div>
                </div>

                <!-- Kill Count Indicator (Prominent) -->
                ${this.options.showKillCount ? `
                <div class="sg-kill-indicator" id="sg-kill-indicator">
                    <div class="sg-kill-count" id="sg-kill-count-large">0</div>
                    <div class="sg-kill-label">Schema Violations Killed</div>
                    <div class="sg-kill-status" id="sg-kill-status">System Healthy</div>
                </div>
                ` : ''}

                <!-- Schema Browser -->
                ${this.options.showSchemaBrowser ? `
                <div class="sg-section sg-schema-browser">
                    <div class="sg-section-header">
                        <h4>Schema Registry</h4>
                        <span class="sg-schema-count" id="sg-schema-count">0 schemas</span>
                    </div>
                    <div class="sg-schema-list" id="sg-schema-list">
                        <div class="sg-loading">Loading schemas...</div>
                    </div>
                    <div class="sg-schema-detail" id="sg-schema-detail" style="display: none;">
                        <div class="sg-detail-header">
                            <h4 id="sg-detail-title">Schema Name</h4>
                            <select id="sg-version-select" class="sg-version-select">
                            </select>
                            <button class="sg-close-btn" onclick="structuralGateUI.closeSchemaDetail()">
                                &times;
                            </button>
                        </div>
                        <div class="sg-detail-content">
                            <pre id="sg-schema-json"></pre>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Validation Tester -->
                ${this.options.showValidationTester ? `
                <div class="sg-section sg-validation-tester">
                    <div class="sg-section-header">
                        <h4>Validation Tester</h4>
                    </div>
                    <div class="sg-tester-form">
                        <div class="sg-form-row">
                            <label for="sg-test-schema">Schema:</label>
                            <select id="sg-test-schema" class="sg-select">
                                <option value="">Select schema...</option>
                            </select>
                            <select id="sg-test-version" class="sg-select sg-version-select">
                                <option value="">Latest</option>
                            </select>
                        </div>
                        <div class="sg-form-row">
                            <label for="sg-test-data">JSON Data:</label>
                            <textarea id="sg-test-data" class="sg-textarea" rows="6"
                                placeholder='{"example": "data"}'></textarea>
                        </div>
                        <div class="sg-form-actions">
                            <button id="sg-test-btn" class="sg-btn sg-btn-primary" onclick="structuralGateUI.handleValidateTest()">
                                Validate
                            </button>
                            <button class="sg-btn sg-btn-secondary" onclick="structuralGateUI.clearTestForm()">
                                Clear
                            </button>
                        </div>
                    </div>
                    <div class="sg-test-result" id="sg-test-result" style="display: none;">
                        <div class="sg-result-header">
                            <span class="sg-result-status" id="sg-result-status">PASS</span>
                            <span class="sg-result-schema" id="sg-result-schema">schema@version</span>
                        </div>
                        <div class="sg-result-errors" id="sg-result-errors"></div>
                    </div>
                </div>
                ` : ''}

                <!-- Recent Violations -->
                <div class="sg-section sg-recent-violations">
                    <div class="sg-section-header">
                        <h4>Recent Violations</h4>
                        <button class="sg-btn sg-btn-small" onclick="structuralGateUI.refreshViolations()">
                            Refresh
                        </button>
                    </div>
                    <div class="sg-violations-list" id="sg-violations-list">
                        <div class="sg-empty">No recent violations</div>
                    </div>
                </div>
            </div>

            <style>
                .structural-gate-ui {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #1a1a2e;
                    border-radius: 12px;
                    padding: 20px;
                    color: #e0e0e0;
                }

                .structural-gate-ui[data-compact="true"] {
                    padding: 12px;
                }

                .structural-gate-ui[data-compact="true"] .sg-section {
                    margin-bottom: 12px;
                }

                /* Header */
                .sg-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #333;
                }

                .sg-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .sg-title h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .sg-icon {
                    font-size: 24px;
                }

                /* Stats Bar */
                .sg-stats-bar {
                    display: flex;
                    gap: 15px;
                }

                .sg-stat {
                    text-align: center;
                    padding: 8px 12px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                }

                .sg-stat-value {
                    display: block;
                    font-size: 20px;
                    font-weight: 700;
                }

                .sg-stat-label {
                    font-size: 11px;
                    opacity: 0.7;
                    text-transform: uppercase;
                }

                .sg-stat-pass .sg-stat-value { color: #4ade80; }
                .sg-stat-warn .sg-stat-value { color: #fbbf24; }
                .sg-stat-kill .sg-stat-value { color: #f87171; }
                .sg-stat-rate .sg-stat-value { color: #60a5fa; }

                /* Kill Indicator */
                .sg-kill-indicator {
                    background: linear-gradient(135deg, #1a1a2e 0%, #2d1f3d 100%);
                    border: 2px solid #333;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    margin-bottom: 20px;
                    transition: all 0.3s ease;
                }

                .sg-kill-indicator.has-kills {
                    border-color: #ef4444;
                    background: linear-gradient(135deg, #1a1a2e 0%, #3d1f1f 100%);
                }

                .sg-kill-count {
                    font-size: 48px;
                    font-weight: 800;
                    color: #4ade80;
                    line-height: 1;
                }

                .sg-kill-indicator.has-kills .sg-kill-count {
                    color: #ef4444;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                .sg-kill-label {
                    font-size: 14px;
                    opacity: 0.7;
                    margin-top: 5px;
                }

                .sg-kill-status {
                    font-size: 12px;
                    margin-top: 10px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    display: inline-block;
                    background: rgba(74, 222, 128, 0.2);
                    color: #4ade80;
                }

                .sg-kill-indicator.has-kills .sg-kill-status {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                /* Sections */
                .sg-section {
                    background: rgba(255,255,255,0.03);
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 15px;
                }

                .sg-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .sg-section-header h4 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                }

                .sg-schema-count {
                    font-size: 12px;
                    opacity: 0.6;
                }

                /* Schema List */
                .sg-schema-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 10px;
                }

                .sg-schema-item {
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .sg-schema-item:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: #4f46e5;
                }

                .sg-schema-name {
                    font-weight: 600;
                    font-size: 13px;
                    margin-bottom: 4px;
                    word-break: break-word;
                }

                .sg-schema-versions {
                    font-size: 11px;
                    opacity: 0.6;
                }

                /* Schema Detail */
                .sg-schema-detail {
                    background: #0d0d1a;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 15px;
                }

                .sg-detail-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .sg-detail-header h4 {
                    margin: 0;
                    flex: 1;
                }

                .sg-close-btn {
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0 5px;
                }

                .sg-close-btn:hover {
                    color: #fff;
                }

                .sg-detail-content pre {
                    background: #000;
                    border-radius: 6px;
                    padding: 12px;
                    overflow-x: auto;
                    font-size: 12px;
                    max-height: 300px;
                    color: #a5d6ff;
                }

                /* Form Elements */
                .sg-select, .sg-version-select {
                    background: #0d0d1a;
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 8px 12px;
                    color: #e0e0e0;
                    font-size: 13px;
                }

                .sg-version-select {
                    width: 100px;
                }

                .sg-textarea {
                    background: #0d0d1a;
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 10px;
                    color: #e0e0e0;
                    font-family: monospace;
                    font-size: 12px;
                    width: 100%;
                    resize: vertical;
                }

                .sg-form-row {
                    margin-bottom: 12px;
                }

                .sg-form-row label {
                    display: block;
                    font-size: 12px;
                    margin-bottom: 5px;
                    opacity: 0.8;
                }

                .sg-form-actions {
                    display: flex;
                    gap: 10px;
                }

                /* Buttons */
                .sg-btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .sg-btn-primary {
                    background: #4f46e5;
                    color: white;
                }

                .sg-btn-primary:hover {
                    background: #6366f1;
                }

                .sg-btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: #e0e0e0;
                }

                .sg-btn-secondary:hover {
                    background: rgba(255,255,255,0.15);
                }

                .sg-btn-small {
                    padding: 4px 10px;
                    font-size: 11px;
                }

                /* Test Result */
                .sg-test-result {
                    margin-top: 15px;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .sg-result-header {
                    padding: 10px 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .sg-test-result.pass .sg-result-header {
                    background: rgba(74, 222, 128, 0.1);
                }

                .sg-test-result.fail .sg-result-header {
                    background: rgba(248, 113, 113, 0.1);
                }

                .sg-result-status {
                    font-weight: 700;
                    font-size: 14px;
                }

                .sg-test-result.pass .sg-result-status {
                    color: #4ade80;
                }

                .sg-test-result.fail .sg-result-status {
                    color: #f87171;
                }

                .sg-result-schema {
                    font-size: 12px;
                    opacity: 0.7;
                }

                .sg-result-errors {
                    padding: 10px 15px;
                    font-size: 12px;
                    background: rgba(0,0,0,0.2);
                }

                .sg-result-errors li {
                    margin-bottom: 5px;
                    color: #fca5a5;
                }

                /* Violations List */
                .sg-violations-list {
                    max-height: 200px;
                    overflow-y: auto;
                }

                .sg-violation-item {
                    background: rgba(248, 113, 113, 0.1);
                    border-left: 3px solid #f87171;
                    border-radius: 0 6px 6px 0;
                    padding: 10px;
                    margin-bottom: 8px;
                }

                .sg-violation-schema {
                    font-weight: 600;
                    font-size: 12px;
                    color: #f87171;
                }

                .sg-violation-time {
                    font-size: 11px;
                    opacity: 0.6;
                    margin-left: 10px;
                }

                .sg-violation-errors {
                    font-size: 11px;
                    margin-top: 5px;
                    color: #fca5a5;
                }

                /* Utility */
                .sg-loading, .sg-empty {
                    text-align: center;
                    padding: 20px;
                    opacity: 0.5;
                    font-size: 13px;
                }
            </style>
        `;

        this.container.innerHTML = html;

        // Store reference globally for onclick handlers
        window.structuralGateUI = this;

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners.
     */
    setupEventListeners() {
        // Schema select for test form
        const testSchemaSelect = document.getElementById('sg-test-schema');
        if (testSchemaSelect) {
            testSchemaSelect.addEventListener('change', (e) => {
                this.updateTestVersions(e.target.value);
            });
        }

        // Version select for detail view
        const versionSelect = document.getElementById('sg-version-select');
        if (versionSelect) {
            versionSelect.addEventListener('change', (e) => {
                const schemaId = document.getElementById('sg-detail-title').dataset.schemaId;
                if (schemaId) {
                    this.showSchemaDetail(schemaId, e.target.value);
                }
            });
        }
    }

    /**
     * Refresh data from the API.
     */
    async refresh() {
        try {
            // Fetch stats
            const statsResponse = await fetch(`${this.options.apiBase}/stats`);
            if (statsResponse.ok) {
                this.stats = await statsResponse.json();
                this.updateStats();
            }

            // Fetch schemas
            const schemasResponse = await fetch(`${this.options.apiBase}/list`);
            if (schemasResponse.ok) {
                this.schemas = await schemasResponse.json();
                this.updateSchemaList();
            }

            // Fetch recent violations
            await this.refreshViolations();

        } catch (error) {
            console.error('[StructuralGateUI] Refresh error:', error);
        }
    }

    /**
     * Refresh violations list.
     */
    async refreshViolations() {
        try {
            const response = await fetch(`${this.options.apiBase}/violations?limit=10`);
            if (response.ok) {
                const violations = await response.json();
                this.updateViolationsList(violations);
            }
        } catch (error) {
            console.error('[StructuralGateUI] Error fetching violations:', error);
        }
    }

    /**
     * Update stats display.
     */
    updateStats() {
        const { pass_count = 0, warn_count = 0, kill_count = 0, pass_rate = 1 } = this.stats;

        // Update stat values
        this.updateElement('sg-pass-count', pass_count);
        this.updateElement('sg-warn-count', warn_count);
        this.updateElement('sg-kill-count', kill_count);
        this.updateElement('sg-pass-rate', `${(pass_rate * 100).toFixed(1)}%`);

        // Update kill indicator
        const killIndicator = document.getElementById('sg-kill-indicator');
        const killCountLarge = document.getElementById('sg-kill-count-large');
        const killStatus = document.getElementById('sg-kill-status');

        if (killIndicator && killCountLarge && killStatus) {
            killCountLarge.textContent = kill_count;

            if (kill_count > 0) {
                killIndicator.classList.add('has-kills');
                killStatus.textContent = `${kill_count} violations terminated`;
            } else {
                killIndicator.classList.remove('has-kills');
                killStatus.textContent = 'System Healthy';
            }
        }
    }

    /**
     * Update schema list display.
     */
    updateSchemaList() {
        const listEl = document.getElementById('sg-schema-list');
        const countEl = document.getElementById('sg-schema-count');
        const testSelect = document.getElementById('sg-test-schema');

        if (!listEl) return;

        const schemaIds = Object.keys(this.schemas.schemas || this.schemas || {});

        if (countEl) {
            countEl.textContent = `${schemaIds.length} schema${schemaIds.length !== 1 ? 's' : ''}`;
        }

        if (schemaIds.length === 0) {
            listEl.innerHTML = '<div class="sg-empty">No schemas registered</div>';
            return;
        }

        // Render schema items
        const schemasData = this.schemas.schemas || this.schemas;
        listEl.innerHTML = schemaIds.map(schemaId => {
            const versions = Object.keys(schemasData[schemaId] || {});
            return `
                <div class="sg-schema-item" onclick="structuralGateUI.handleSchemaSelect('${schemaId}')">
                    <div class="sg-schema-name">${schemaId}</div>
                    <div class="sg-schema-versions">${versions.length} version${versions.length !== 1 ? 's' : ''}: ${versions.join(', ')}</div>
                </div>
            `;
        }).join('');

        // Update test schema select
        if (testSelect) {
            const currentValue = testSelect.value;
            testSelect.innerHTML = '<option value="">Select schema...</option>' +
                schemaIds.map(id => `<option value="${id}" ${id === currentValue ? 'selected' : ''}>${id}</option>`).join('');
        }
    }

    /**
     * Update violations list display.
     */
    updateViolationsList(violations) {
        const listEl = document.getElementById('sg-violations-list');
        if (!listEl) return;

        if (!violations || violations.length === 0) {
            listEl.innerHTML = '<div class="sg-empty">No recent violations</div>';
            return;
        }

        listEl.innerHTML = violations.map(v => {
            const time = v.validated_at ? new Date(v.validated_at).toLocaleString() : 'Unknown';
            const errors = v.errors || [];
            return `
                <div class="sg-violation-item">
                    <span class="sg-violation-schema">${v.schema_id}@${v.schema_version}</span>
                    <span class="sg-violation-time">${time}</span>
                    ${errors.length > 0 ? `
                        <div class="sg-violation-errors">
                            ${errors.slice(0, 3).map(e => `<div>- ${this.escapeHtml(e)}</div>`).join('')}
                            ${errors.length > 3 ? `<div>... and ${errors.length - 3} more</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Handle schema selection from the list.
     */
    handleSchemaSelect(schemaId) {
        const schemasData = this.schemas.schemas || this.schemas;
        const versions = Object.keys(schemasData[schemaId] || {}).sort().reverse();
        const latestVersion = versions[0];

        this.showSchemaDetail(schemaId, latestVersion);
    }

    /**
     * Show schema detail panel.
     */
    showSchemaDetail(schemaId, version) {
        const detailEl = document.getElementById('sg-schema-detail');
        const titleEl = document.getElementById('sg-detail-title');
        const versionSelect = document.getElementById('sg-version-select');
        const jsonEl = document.getElementById('sg-schema-json');

        if (!detailEl || !titleEl || !jsonEl) return;

        const schemasData = this.schemas.schemas || this.schemas;
        const schema = schemasData[schemaId]?.[version];

        if (!schema) {
            console.error(`Schema not found: ${schemaId}@${version}`);
            return;
        }

        titleEl.textContent = schemaId;
        titleEl.dataset.schemaId = schemaId;

        // Update version selector
        if (versionSelect) {
            const versions = Object.keys(schemasData[schemaId] || {}).sort().reverse();
            versionSelect.innerHTML = versions.map(v =>
                `<option value="${v}" ${v === version ? 'selected' : ''}>${v}</option>`
            ).join('');
        }

        // Show schema JSON
        jsonEl.textContent = JSON.stringify(schema, null, 2);

        detailEl.style.display = 'block';
    }

    /**
     * Close schema detail panel.
     */
    closeSchemaDetail() {
        const detailEl = document.getElementById('sg-schema-detail');
        if (detailEl) {
            detailEl.style.display = 'none';
        }
    }

    /**
     * Update version options for test form when schema changes.
     */
    updateTestVersions(schemaId) {
        const versionSelect = document.getElementById('sg-test-version');
        if (!versionSelect) return;

        if (!schemaId) {
            versionSelect.innerHTML = '<option value="">Latest</option>';
            return;
        }

        const schemasData = this.schemas.schemas || this.schemas;
        const versions = Object.keys(schemasData[schemaId] || {}).sort().reverse();

        versionSelect.innerHTML = '<option value="">Latest</option>' +
            versions.map(v => `<option value="${v}">${v}</option>`).join('');
    }

    /**
     * Handle validation test submission.
     */
    async handleValidateTest() {
        const schemaSelect = document.getElementById('sg-test-schema');
        const versionSelect = document.getElementById('sg-test-version');
        const dataTextarea = document.getElementById('sg-test-data');
        const resultEl = document.getElementById('sg-test-result');

        if (!schemaSelect || !dataTextarea || !resultEl) return;

        const schemaId = schemaSelect.value;
        const version = versionSelect?.value || '';
        const dataStr = dataTextarea.value.trim();

        if (!schemaId) {
            alert('Please select a schema');
            return;
        }

        if (!dataStr) {
            alert('Please enter JSON data to validate');
            return;
        }

        let data;
        try {
            data = JSON.parse(dataStr);
        } catch (e) {
            this.showTestResult(false, schemaId, version, [`Invalid JSON: ${e.message}`]);
            return;
        }

        try {
            const response = await fetch(`${this.options.apiBase}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schema_id: schemaId,
                    version: version || null,
                    data: data
                })
            });

            const result = await response.json();
            this.showTestResult(
                result.is_valid,
                result.schema_id || schemaId,
                result.schema_version || version || 'latest',
                result.errors || [],
                result.warnings || []
            );

        } catch (error) {
            this.showTestResult(false, schemaId, version, [`API error: ${error.message}`]);
        }
    }

    /**
     * Show test result.
     */
    showTestResult(isValid, schemaId, version, errors = [], warnings = []) {
        const resultEl = document.getElementById('sg-test-result');
        const statusEl = document.getElementById('sg-result-status');
        const schemaEl = document.getElementById('sg-result-schema');
        const errorsEl = document.getElementById('sg-result-errors');

        if (!resultEl || !statusEl || !schemaEl || !errorsEl) return;

        resultEl.style.display = 'block';
        resultEl.className = `sg-test-result ${isValid ? 'pass' : 'fail'}`;

        statusEl.textContent = isValid ? 'PASS' : 'FAIL';
        schemaEl.textContent = `${schemaId}@${version}`;

        if (errors.length === 0 && warnings.length === 0) {
            errorsEl.innerHTML = isValid ?
                '<span style="color: #4ade80;">Validation successful</span>' :
                '<span style="color: #f87171;">Validation failed (no details)</span>';
        } else {
            errorsEl.innerHTML = `
                ${errors.length > 0 ? `
                    <ul style="margin: 0; padding-left: 20px;">
                        ${errors.map(e => `<li>${this.escapeHtml(e)}</li>`).join('')}
                    </ul>
                ` : ''}
                ${warnings.length > 0 ? `
                    <div style="color: #fbbf24; margin-top: 10px;">
                        <strong>Warnings:</strong>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${warnings.map(w => `<li>${this.escapeHtml(w)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        }
    }

    /**
     * Clear the test form.
     */
    clearTestForm() {
        const dataTextarea = document.getElementById('sg-test-data');
        const resultEl = document.getElementById('sg-test-result');

        if (dataTextarea) dataTextarea.value = '';
        if (resultEl) resultEl.style.display = 'none';
    }

    /**
     * Update element text content safely.
     */
    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    /**
     * Escape HTML to prevent XSS.
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StructuralGateUI;
}
