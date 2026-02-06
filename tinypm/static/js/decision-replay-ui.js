/**
 * ===============================================================================
 * DECISION REPLAY UI - Frontend for Decision Replay Engine
 * ===============================================================================
 *
 * Phase 3 of Project "Sovereign Seed" - Visual interface for decision lineage
 * and replay verification.
 *
 * Features:
 * - Decision timeline viewer
 * - Replay button with mode selector
 * - Diff visualization (original vs replayed)
 * - Lineage diagram visualization
 * - Export to legal format button
 * - Real-time chain verification status
 *
 * Usage:
 *   const replayUI = new DecisionReplayUI('#container');
 *   replayUI.loadDecisions();
 */

class DecisionReplayUI {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`Container not found: ${containerSelector}`);
            return;
        }

        this.options = {
            apiBase: options.apiBase || '/api/replay',
            refreshInterval: options.refreshInterval || 30000, // 30s
            showTimeline: options.showTimeline !== false,
            showStats: options.showStats !== false,
            ...options
        };

        this.decisions = [];
        this.selectedDecision = null;
        this.replayResult = null;

        this._init();
    }

    _init() {
        this._createDOM();
        this._bindEvents();
        this.loadDecisions();

        // Auto-refresh
        if (this.options.refreshInterval > 0) {
            setInterval(() => this.loadDecisions(), this.options.refreshInterval);
        }
    }

    _createDOM() {
        this.container.innerHTML = `
            <div class="replay-ui">
                <!-- Header -->
                <div class="replay-header">
                    <h2>Decision Replay Engine</h2>
                    <div class="replay-actions">
                        <button class="btn-verify" title="Verify Chain Integrity">
                            <span class="icon">&#x1F512;</span> Verify Chain
                        </button>
                        <button class="btn-export" title="Export for Legal Discovery">
                            <span class="icon">&#x1F4BE;</span> Export
                        </button>
                        <button class="btn-refresh" title="Refresh Decisions">
                            <span class="icon">&#x21BB;</span>
                        </button>
                    </div>
                </div>

                <!-- Stats Bar -->
                <div class="replay-stats">
                    <div class="stat">
                        <span class="stat-value" id="stat-total">-</span>
                        <span class="stat-label">Total Decisions</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="stat-verified">-</span>
                        <span class="stat-label">Verified</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="stat-chain">-</span>
                        <span class="stat-label">Chain Status</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="stat-version">-</span>
                        <span class="stat-label">Engine Version</span>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="replay-content">
                    <!-- Timeline -->
                    <div class="replay-timeline">
                        <h3>Decision Timeline</h3>
                        <div class="timeline-filters">
                            <select id="filter-type">
                                <option value="">All Types</option>
                                <option value="task_priority">Task Priority</option>
                                <option value="email_response">Email Response</option>
                                <option value="approval">Approval</option>
                                <option value="recommendation">Recommendation</option>
                            </select>
                            <input type="date" id="filter-date" placeholder="Filter by date">
                        </div>
                        <div class="timeline-list" id="timeline-list">
                            <div class="loading">Loading decisions...</div>
                        </div>
                    </div>

                    <!-- Detail Panel -->
                    <div class="replay-detail">
                        <div class="detail-placeholder" id="detail-placeholder">
                            <div class="placeholder-icon">&#x1F50D;</div>
                            <p>Select a decision to view details and replay</p>
                        </div>

                        <div class="detail-content" id="detail-content" style="display: none;">
                            <!-- Lineage Diagram -->
                            <div class="lineage-section">
                                <h3>Decision Lineage</h3>
                                <div class="lineage-diagram" id="lineage-diagram"></div>
                            </div>

                            <!-- Pipeline Steps -->
                            <div class="pipeline-section">
                                <h3>Decision Pipeline</h3>
                                <div class="pipeline-steps">
                                    <div class="pipeline-step" id="step-inputs">
                                        <div class="step-header">
                                            <span class="step-number">1</span>
                                            <span class="step-title">Inputs</span>
                                        </div>
                                        <pre class="step-content"></pre>
                                    </div>
                                    <div class="pipeline-arrow">&#x2192;</div>
                                    <div class="pipeline-step" id="step-extraction">
                                        <div class="step-header">
                                            <span class="step-number">2</span>
                                            <span class="step-title">Extraction (LLM)</span>
                                        </div>
                                        <pre class="step-content"></pre>
                                    </div>
                                    <div class="pipeline-arrow">&#x2192;</div>
                                    <div class="pipeline-step" id="step-calculation">
                                        <div class="step-header">
                                            <span class="step-number">3</span>
                                            <span class="step-title">Calculation</span>
                                        </div>
                                        <pre class="step-content"></pre>
                                    </div>
                                    <div class="pipeline-arrow">&#x2192;</div>
                                    <div class="pipeline-step" id="step-decision">
                                        <div class="step-header">
                                            <span class="step-number">4</span>
                                            <span class="step-title">Decision</span>
                                        </div>
                                        <pre class="step-content"></pre>
                                    </div>
                                </div>
                            </div>

                            <!-- Replay Controls -->
                            <div class="replay-controls">
                                <h3>Replay Verification</h3>
                                <div class="replay-mode-select">
                                    <label>
                                        <input type="radio" name="replay-mode" value="full" checked>
                                        Full Replay
                                    </label>
                                    <label>
                                        <input type="radio" name="replay-mode" value="calculation">
                                        Calculation Only
                                    </label>
                                    <label>
                                        <input type="radio" name="replay-mode" value="verify">
                                        Verify Chain
                                    </label>
                                </div>
                                <button class="btn-replay" id="btn-replay">
                                    <span class="icon">&#x25B6;</span> Replay Decision
                                </button>
                            </div>

                            <!-- Replay Result -->
                            <div class="replay-result" id="replay-result" style="display: none;">
                                <h3>Replay Result</h3>
                                <div class="result-summary" id="result-summary"></div>
                                <div class="result-diff" id="result-diff"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Export Modal -->
                <div class="modal" id="export-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Export for Legal Discovery</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Export Format</label>
                                <select id="export-format">
                                    <option value="json">JSON (Machine Readable)</option>
                                    <option value="html">HTML (Human Readable)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="export-verify" checked>
                                    Include Verification
                                </label>
                            </div>
                            <div class="form-group">
                                <label>Decisions to Export</label>
                                <div class="export-selection" id="export-selection">
                                    <label>
                                        <input type="radio" name="export-scope" value="selected" checked>
                                        Selected Decision
                                    </label>
                                    <label>
                                        <input type="radio" name="export-scope" value="all">
                                        All Decisions
                                    </label>
                                    <label>
                                        <input type="radio" name="export-scope" value="range">
                                        Date Range
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel">Cancel</button>
                            <button class="btn-primary" id="btn-do-export">Export</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .replay-ui {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .replay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .replay-header h2 {
                    margin: 0;
                    color: #2c3e50;
                }

                .replay-actions {
                    display: flex;
                    gap: 10px;
                }

                .replay-actions button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .btn-verify {
                    background: #3498db;
                    color: white;
                }

                .btn-export {
                    background: #2ecc71;
                    color: white;
                }

                .btn-refresh {
                    background: #95a5a6;
                    color: white;
                }

                .replay-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                }

                .stat-label {
                    font-size: 12px;
                    color: #7f8c8d;
                    text-transform: uppercase;
                }

                .replay-content {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 20px;
                }

                .replay-timeline {
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .replay-timeline h3 {
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                }

                .timeline-filters {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .timeline-filters select,
                .timeline-filters input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                }

                .timeline-list {
                    max-height: 600px;
                    overflow-y: auto;
                }

                .timeline-item {
                    padding: 12px;
                    border-left: 3px solid #3498db;
                    margin-bottom: 10px;
                    background: #f8f9fa;
                    border-radius: 0 6px 6px 0;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .timeline-item:hover {
                    background: #e8f4fc;
                }

                .timeline-item.selected {
                    background: #d4edfc;
                    border-left-color: #2980b9;
                }

                .timeline-item.verified {
                    border-left-color: #2ecc71;
                }

                .timeline-item.invalid {
                    border-left-color: #e74c3c;
                }

                .timeline-item-type {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #7f8c8d;
                    margin-bottom: 4px;
                }

                .timeline-item-title {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 4px;
                }

                .timeline-item-time {
                    font-size: 12px;
                    color: #95a5a6;
                }

                .replay-detail {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .detail-placeholder {
                    text-align: center;
                    padding: 60px 20px;
                    color: #95a5a6;
                }

                .placeholder-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }

                .lineage-section,
                .pipeline-section,
                .replay-controls,
                .replay-result {
                    margin-bottom: 25px;
                }

                .lineage-section h3,
                .pipeline-section h3,
                .replay-controls h3,
                .replay-result h3 {
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                    font-size: 16px;
                }

                .lineage-diagram {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    background: #2c3e50;
                    color: #ecf0f1;
                    padding: 15px;
                    border-radius: 8px;
                    overflow-x: auto;
                    white-space: pre;
                }

                .pipeline-steps {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    overflow-x: auto;
                    padding-bottom: 10px;
                }

                .pipeline-step {
                    flex: 1;
                    min-width: 180px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .step-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    background: #3498db;
                    color: white;
                }

                .step-number {
                    width: 24px;
                    height: 24px;
                    background: white;
                    color: #3498db;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                }

                .step-content {
                    margin: 0;
                    padding: 10px;
                    font-size: 11px;
                    max-height: 120px;
                    overflow: auto;
                    background: #f8f9fa;
                }

                .pipeline-arrow {
                    font-size: 20px;
                    color: #bdc3c7;
                    padding-top: 30px;
                }

                .replay-mode-select {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 15px;
                }

                .replay-mode-select label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                }

                .btn-replay {
                    background: #9b59b6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-replay:hover {
                    background: #8e44ad;
                }

                .result-summary {
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                }

                .result-summary.success {
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                }

                .result-summary.warning {
                    background: #fff3cd;
                    border: 1px solid #ffeeba;
                }

                .result-summary.error {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                }

                .result-diff {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    max-height: 200px;
                    overflow: auto;
                }

                .diff-added {
                    background: #d4edda;
                    color: #155724;
                }

                .diff-removed {
                    background: #f8d7da;
                    color: #721c24;
                }

                /* Modal */
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 500px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    border-bottom: 1px solid #eee;
                }

                .modal-header h3 {
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #95a5a6;
                }

                .modal-body {
                    padding: 20px;
                }

                .modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    color: #2c3e50;
                }

                .form-group select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                }

                .export-selection {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .btn-cancel {
                    padding: 10px 20px;
                    background: #95a5a6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .btn-primary {
                    padding: 10px 20px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .loading {
                    text-align: center;
                    padding: 20px;
                    color: #95a5a6;
                }

                @media (max-width: 900px) {
                    .replay-content {
                        grid-template-columns: 1fr;
                    }

                    .pipeline-steps {
                        flex-direction: column;
                    }

                    .pipeline-arrow {
                        transform: rotate(90deg);
                        padding: 10px 0;
                    }
                }
            </style>
        `;
    }

    _bindEvents() {
        // Refresh button
        this.container.querySelector('.btn-refresh').addEventListener('click', () => {
            this.loadDecisions();
        });

        // Verify button
        this.container.querySelector('.btn-verify').addEventListener('click', () => {
            this.verifyChain();
        });

        // Export button
        this.container.querySelector('.btn-export').addEventListener('click', () => {
            this.showExportModal();
        });

        // Filter changes
        this.container.querySelector('#filter-type').addEventListener('change', () => {
            this.filterDecisions();
        });

        this.container.querySelector('#filter-date').addEventListener('change', () => {
            this.filterDecisions();
        });

        // Replay button
        this.container.querySelector('#btn-replay').addEventListener('click', () => {
            this.replaySelectedDecision();
        });

        // Modal close
        this.container.querySelector('.modal-close').addEventListener('click', () => {
            this.hideExportModal();
        });

        this.container.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideExportModal();
        });

        // Export action
        this.container.querySelector('#btn-do-export').addEventListener('click', () => {
            this.doExport();
        });
    }

    async loadDecisions() {
        const listEl = this.container.querySelector('#timeline-list');
        listEl.innerHTML = '<div class="loading">Loading decisions...</div>';

        try {
            const response = await fetch(`${this.options.apiBase}/decisions`);
            if (!response.ok) throw new Error('Failed to load decisions');

            const data = await response.json();
            this.decisions = data.decisions || [];

            this.renderTimeline();
            this.updateStats(data.stats || {});
        } catch (error) {
            console.error('Failed to load decisions:', error);
            listEl.innerHTML = '<div class="loading">Failed to load decisions</div>';
        }
    }

    renderTimeline() {
        const listEl = this.container.querySelector('#timeline-list');

        if (this.decisions.length === 0) {
            listEl.innerHTML = '<div class="loading">No decisions recorded yet</div>';
            return;
        }

        listEl.innerHTML = this.decisions.map(decision => `
            <div class="timeline-item ${this.selectedDecision?.id === decision.id ? 'selected' : ''}"
                 data-id="${decision.id}">
                <div class="timeline-item-type">${decision.decision_type}</div>
                <div class="timeline-item-title">${this._summarizeDecision(decision)}</div>
                <div class="timeline-item-time">${this._formatTime(decision.created_at)}</div>
            </div>
        `).join('');

        // Bind click events
        listEl.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.selectDecision(id);
            });
        });
    }

    _summarizeDecision(decision) {
        // Create a short summary from the decision
        if (decision.final_decision) {
            if (typeof decision.final_decision === 'object') {
                const keys = Object.keys(decision.final_decision);
                if (keys.includes('priority')) {
                    return `Priority: ${decision.final_decision.priority}`;
                }
                if (keys.includes('action')) {
                    return decision.final_decision.action;
                }
                return JSON.stringify(decision.final_decision).substring(0, 30) + '...';
            }
            return String(decision.final_decision).substring(0, 30);
        }
        return 'Decision #' + decision.id.substring(0, 8);
    }

    _formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    async selectDecision(decisionId) {
        // Find the decision
        const decision = this.decisions.find(d => d.id === decisionId);
        if (!decision) return;

        this.selectedDecision = decision;
        this.replayResult = null;

        // Update UI
        this.container.querySelectorAll('.timeline-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === decisionId);
        });

        // Show detail panel
        this.container.querySelector('#detail-placeholder').style.display = 'none';
        this.container.querySelector('#detail-content').style.display = 'block';
        this.container.querySelector('#replay-result').style.display = 'none';

        // Load full decision details
        try {
            const response = await fetch(`${this.options.apiBase}/decision/${decisionId}`);
            if (!response.ok) throw new Error('Failed to load decision details');

            const fullDecision = await response.json();
            this.renderDecisionDetail(fullDecision);
        } catch (error) {
            console.error('Failed to load decision details:', error);
            this.renderDecisionDetail(decision);
        }
    }

    renderDecisionDetail(decision) {
        // Render lineage diagram
        this.container.querySelector('#lineage-diagram').textContent =
            this._generateLineageDiagram(decision);

        // Render pipeline steps
        this._renderPipelineStep('step-inputs', decision.raw_inputs);
        this._renderPipelineStep('step-extraction', decision.extraction_result);
        this._renderPipelineStep('step-calculation', decision.calculation_result);
        this._renderPipelineStep('step-decision', decision.final_decision);
    }

    _renderPipelineStep(elementId, data) {
        const el = this.container.querySelector(`#${elementId} .step-content`);
        el.textContent = JSON.stringify(data, null, 2);
    }

    _generateLineageDiagram(decision) {
        const lineage = decision.lineage || {};
        const prevHash = decision.previous_hash || 'GENESIS';

        return `
+-------------------------------------------------------------+
|                    DECISION LINEAGE                          |
|                    ID: ${decision.id.substring(0, 16)}...                   |
+-------------------------------------------------------------+
|                                                              |
|  INPUTS                                                      |
|  +-- Hash: ${(lineage.input_hash || 'N/A').substring(0, 16)}...               |
|                                                              |
|  EXTRACTION                                                  |
|  +-- Model: ${(lineage.model_id || 'N/A').substring(0, 40)}  |
|  +-- Version: ${lineage.extraction_version || 'N/A'}                           |
|  +-- Hash: ${(decision.extraction_hash || 'N/A').substring(0, 16)}...          |
|                                                              |
|  CALCULATION                                                 |
|  +-- Version: ${lineage.calculator_version || 'N/A'}                           |
|  +-- Hash: ${(decision.calculation_hash || 'N/A').substring(0, 16)}...         |
|                                                              |
|  DECISION                                                    |
|  +-- Hash: ${(decision.decision_hash || 'N/A').substring(0, 16)}...            |
|                                                              |
|  CHAIN                                                       |
|  +-- Previous: ${prevHash.substring(0, 16)}${prevHash.length > 16 ? '...' : ''}                       |
|  +-- Record: ${(decision.record_hash || 'N/A').substring(0, 16)}...            |
|                                                              |
+-------------------------------------------------------------+
`;
    }

    async replaySelectedDecision() {
        if (!this.selectedDecision) {
            alert('Please select a decision first');
            return;
        }

        const mode = this.container.querySelector('input[name="replay-mode"]:checked').value;
        const resultEl = this.container.querySelector('#replay-result');
        const summaryEl = this.container.querySelector('#result-summary');
        const diffEl = this.container.querySelector('#result-diff');

        // Show loading state
        resultEl.style.display = 'block';
        summaryEl.innerHTML = '<div class="loading">Replaying decision...</div>';
        summaryEl.className = 'result-summary';
        diffEl.innerHTML = '';

        try {
            const response = await fetch(`${this.options.apiBase}/replay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision_id: this.selectedDecision.id,
                    mode: mode
                })
            });

            if (!response.ok) throw new Error('Replay failed');

            const result = await response.json();
            this.replayResult = result;
            this.renderReplayResult(result);
        } catch (error) {
            console.error('Replay failed:', error);
            summaryEl.innerHTML = `<strong>Replay Failed</strong><br>${error.message}`;
            summaryEl.className = 'result-summary error';
        }
    }

    renderReplayResult(result) {
        const summaryEl = this.container.querySelector('#result-summary');
        const diffEl = this.container.querySelector('#result-diff');

        // Determine result class
        let resultClass = 'success';
        let resultText = 'MATCH - Decision verified successfully';

        if (result.match_type === 'diverged') {
            resultClass = 'error';
            resultText = 'DIVERGED - Replayed result differs from original';
        } else if (result.match_type === 'semantic') {
            resultClass = 'warning';
            resultText = 'SEMANTIC MATCH - Same meaning, different format';
        }

        summaryEl.className = `result-summary ${resultClass}`;
        summaryEl.innerHTML = `
            <strong>${resultText}</strong>
            <div style="margin-top: 10px; font-size: 13px;">
                <div>Extraction: ${result.extraction_matched ? '&#x2705; Match' : '&#x274C; Diverged'}</div>
                <div>Calculation: ${result.calculation_matched ? '&#x2705; Match' : '&#x274C; Diverged'}</div>
                <div>Decision: ${result.decision_matched ? '&#x2705; Match' : '&#x274C; Diverged'}</div>
                <div style="margin-top: 5px; color: #7f8c8d;">Replay time: ${result.replay_time_ms}ms</div>
            </div>
        `;

        // Show differences if any
        if (result.differences && result.differences.length > 0) {
            diffEl.innerHTML = `
                <strong>Differences Found:</strong>
                ${result.differences.map(d => `<div class="diff-removed">${d}</div>`).join('')}
            `;
        } else if (result.warnings && result.warnings.length > 0) {
            diffEl.innerHTML = `
                <strong>Warnings:</strong>
                ${result.warnings.map(w => `<div style="color: #856404;">${w}</div>`).join('')}
            `;
        } else {
            diffEl.innerHTML = '<div style="color: #155724;">No differences detected</div>';
        }
    }

    async verifyChain() {
        const verifyBtn = this.container.querySelector('.btn-verify');
        const originalText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = '<span class="icon">&#x23F3;</span> Verifying...';
        verifyBtn.disabled = true;

        try {
            const response = await fetch(`${this.options.apiBase}/verify`);
            if (!response.ok) throw new Error('Verification failed');

            const result = await response.json();
            const allValid = result.all_valid;

            if (allValid) {
                alert(`Chain Verification PASSED\n\nAll ${result.total} decisions verified successfully.`);
            } else {
                alert(`Chain Verification FAILED\n\nFound ${result.invalid_count} invalid records.\nCheck console for details.`);
                console.error('Invalid records:', result.invalid_records);
            }

            // Update chain status in stats
            this.container.querySelector('#stat-chain').textContent = allValid ? 'Valid' : 'Invalid';
            this.container.querySelector('#stat-chain').style.color = allValid ? '#27ae60' : '#e74c3c';

        } catch (error) {
            console.error('Verification failed:', error);
            alert('Verification failed: ' + error.message);
        } finally {
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
        }
    }

    filterDecisions() {
        const typeFilter = this.container.querySelector('#filter-type').value;
        const dateFilter = this.container.querySelector('#filter-date').value;

        let filtered = this.decisions;

        if (typeFilter) {
            filtered = filtered.filter(d => d.decision_type === typeFilter);
        }

        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filtered = filtered.filter(d => {
                const decisionDate = new Date(d.created_at);
                return decisionDate.toDateString() === filterDate.toDateString();
            });
        }

        // Re-render with filtered list
        const originalDecisions = this.decisions;
        this.decisions = filtered;
        this.renderTimeline();
        this.decisions = originalDecisions;
    }

    updateStats(stats) {
        this.container.querySelector('#stat-total').textContent = stats.total_decisions || 0;
        this.container.querySelector('#stat-verified').textContent = stats.verified || 'N/A';
        this.container.querySelector('#stat-chain').textContent = stats.chain_status || 'Unknown';
        this.container.querySelector('#stat-version').textContent = stats.engine_version || '1.0.0';
    }

    showExportModal() {
        this.container.querySelector('#export-modal').style.display = 'flex';
    }

    hideExportModal() {
        this.container.querySelector('#export-modal').style.display = 'none';
    }

    async doExport() {
        const format = this.container.querySelector('#export-format').value;
        const includeVerify = this.container.querySelector('#export-verify').checked;
        const scope = this.container.querySelector('input[name="export-scope"]:checked').value;

        let decisionIds = [];

        if (scope === 'selected' && this.selectedDecision) {
            decisionIds = [this.selectedDecision.id];
        } else if (scope === 'all') {
            decisionIds = this.decisions.map(d => d.id);
        }

        if (decisionIds.length === 0) {
            alert('No decisions selected for export');
            return;
        }

        try {
            const response = await fetch(`${this.options.apiBase}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision_ids: decisionIds,
                    format: format,
                    include_verification: includeVerify
                })
            });

            if (!response.ok) throw new Error('Export failed');

            // Download the file
            const blob = await response.blob();
            const filename = `decision_export_${new Date().toISOString().split('T')[0]}.${format}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.hideExportModal();

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#decision-replay-container');
    if (container) {
        window.decisionReplayUI = new DecisionReplayUI('#decision-replay-container');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DecisionReplayUI;
}
