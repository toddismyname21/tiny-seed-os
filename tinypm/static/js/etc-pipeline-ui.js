/**
 * TinyPM ETC Pipeline UI - Extract-Transform-Calculate Visualization
 * ===================================================================
 * Frontend module for the Extraction/Calculation Split architecture.
 *
 * Features:
 * - Pipeline visualization (Extract -> Validate -> Calculate)
 * - Parameter display with source citations
 * - Calculation formula display
 * - Hash verification UI
 * - Real-time pipeline execution
 *
 * Part of Project "Sovereign Seed" - Phase 3
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude
 */

const ETCPipeline = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        apiBase: '/api',
        animationDuration: 300,
        maxDisplayParams: 10,
        maxCitationLength: 100
    },

    // State
    _lastResult: null,
    _contracts: [],
    _isRunning: false,

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this._setupEventListeners();
        this.loadContracts();
        console.log('[ETCPipeline] Initialized');
    },

    _setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Verify button
            const verifyBtn = e.target.closest('.etc-verify-btn');
            if (verifyBtn) {
                const pipelineId = verifyBtn.dataset.pipelineId;
                if (pipelineId) {
                    this.verifyResult(pipelineId);
                }
            }

            // Expand citation
            const citation = e.target.closest('.etc-citation-badge');
            if (citation) {
                this._toggleCitationExpand(citation);
            }

            // Copy hash
            const hashBtn = e.target.closest('.etc-hash-copy');
            if (hashBtn) {
                this._copyToClipboard(hashBtn.dataset.hash);
            }
        });
    },

    // =========================================================================
    // API CALLS
    // =========================================================================
    async loadContracts() {
        try {
            const response = await fetch(`${this.config.apiBase}/etc/contracts`);
            if (response.ok) {
                const data = await response.json();
                this._contracts = data.contracts || [];
                console.log(`[ETCPipeline] Loaded ${this._contracts.length} contracts`);
            }
        } catch (e) {
            console.error('[ETCPipeline] Failed to load contracts:', e);
        }
    },

    async runPipeline(documentId, schema, contractId, context = null) {
        if (this._isRunning) {
            console.warn('[ETCPipeline] Pipeline already running');
            return null;
        }

        this._isRunning = true;
        this._showLoading();

        try {
            const response = await fetch(`${this.config.apiBase}/etc/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: documentId,
                    schema: schema,
                    contract: contractId,
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            this._lastResult = result;
            return result;

        } catch (e) {
            console.error('[ETCPipeline] Pipeline error:', e);
            return { error: e.message, success: false };
        } finally {
            this._isRunning = false;
            this._hideLoading();
        }
    },

    async calculateDirect(contractId, inputs) {
        try {
            const response = await fetch(`${this.config.apiBase}/etc/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contract_id: contractId,
                    inputs: inputs
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (e) {
            console.error('[ETCPipeline] Calculation error:', e);
            return { error: e.message, status: 'error' };
        }
    },

    async verifyResult(pipelineId) {
        try {
            const response = await fetch(`${this.config.apiBase}/etc/verify/${pipelineId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const verification = await response.json();
            this._showVerificationResult(verification);
            return verification;

        } catch (e) {
            console.error('[ETCPipeline] Verification error:', e);
            return { error: e.message, verified: false };
        }
    },

    // =========================================================================
    // PIPELINE VISUALIZATION
    // =========================================================================
    /**
     * Create a full pipeline visualization widget
     *
     * @param {Object} result - Pipeline result from runPipeline()
     * @param {HTMLElement} container - Container element
     */
    renderPipelineResult(result, container) {
        if (!container) {
            console.error('[ETCPipeline] No container provided');
            return;
        }

        container.innerHTML = '';

        // Create pipeline widget
        const widget = document.createElement('div');
        widget.className = 'etc-pipeline-widget';

        // Header with status
        widget.appendChild(this._createHeader(result));

        // Pipeline steps visualization
        widget.appendChild(this._createStepsVisualization(result));

        // Extraction details
        if (result.extraction) {
            widget.appendChild(this._createExtractionPanel(result.extraction));
        }

        // Validation warnings
        if (result.validation_warnings && result.validation_warnings.length > 0) {
            widget.appendChild(this._createWarningsPanel(result.validation_warnings));
        }

        // Calculation result
        if (result.calculation) {
            widget.appendChild(this._createCalculationPanel(result.calculation));
        }

        // Audit trail
        if (result.audit_trail) {
            widget.appendChild(this._createAuditPanel(result.audit_trail));
        }

        container.appendChild(widget);
    },

    _createHeader(result) {
        const header = document.createElement('div');
        header.className = 'etc-header';

        const success = result.success;
        const statusClass = success ? 'etc-status-success' : 'etc-status-error';
        const statusIcon = success ? '\u2713' : '\u2717';
        const statusText = success ? 'Pipeline Complete' : 'Pipeline Failed';

        header.innerHTML = `
            <div class="etc-header-content">
                <span class="etc-status-badge ${statusClass}">
                    <span class="etc-status-icon">${statusIcon}</span>
                    ${statusText}
                </span>
                <span class="etc-pipeline-id">ID: ${result.pipeline_id || 'unknown'}</span>
            </div>
            <div class="etc-header-actions">
                <button class="etc-verify-btn" data-pipeline-id="${result.pipeline_id}">
                    Verify Hashes
                </button>
            </div>
        `;

        return header;
    },

    _createStepsVisualization(result) {
        const steps = document.createElement('div');
        steps.className = 'etc-steps';

        const extractionOk = result.extraction && result.extraction.parameters;
        const validationOk = !result.validation_warnings || result.validation_warnings.length === 0;
        const calculationOk = result.calculation && result.calculation.status === 'success';

        const stepsData = [
            {
                name: 'Extract',
                icon: '\uD83D\uDCE5',
                status: extractionOk ? 'complete' : 'error',
                detail: extractionOk ? `${Object.keys(result.extraction.parameters).length} params` : 'Failed'
            },
            {
                name: 'Validate',
                icon: '\u2714\uFE0F',
                status: validationOk ? 'complete' : 'warning',
                detail: validationOk ? 'All valid' : `${result.validation_warnings.length} warnings`
            },
            {
                name: 'Calculate',
                icon: '\uD83E\uDDEE',
                status: calculationOk ? 'complete' : 'error',
                detail: calculationOk ? 'Success' : (result.calculation?.error_message || 'Failed')
            }
        ];

        stepsData.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = `etc-step etc-step-${step.status}`;

            stepEl.innerHTML = `
                <div class="etc-step-icon">${step.icon}</div>
                <div class="etc-step-name">${step.name}</div>
                <div class="etc-step-detail">${step.detail}</div>
            `;

            steps.appendChild(stepEl);

            // Arrow between steps
            if (index < stepsData.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'etc-step-arrow';
                arrow.textContent = '\u2192';
                steps.appendChild(arrow);
            }
        });

        return steps;
    },

    _createExtractionPanel(extraction) {
        const panel = document.createElement('div');
        panel.className = 'etc-panel etc-extraction-panel';

        const params = Object.entries(extraction.parameters || {});

        let paramsHtml = '';
        params.slice(0, this.config.maxDisplayParams).forEach(([name, param]) => {
            const citations = param.citations || [];
            const citationBadge = citations.length > 0
                ? `<span class="etc-citation-badge" data-citations='${JSON.stringify(citations)}'>
                     \uD83D\uDD17 ${citations.length} citation${citations.length > 1 ? 's' : ''}
                   </span>`
                : '<span class="etc-no-citation">No citation</span>';

            const validationClass = param.validation_status === 'valid' ? 'etc-valid'
                : param.validation_status === 'hallucination' ? 'etc-hallucination'
                : param.validation_status === 'partial' ? 'etc-partial'
                : '';

            paramsHtml += `
                <div class="etc-param ${validationClass}">
                    <div class="etc-param-header">
                        <span class="etc-param-name">${name}</span>
                        <span class="etc-param-type">${param.value_type}</span>
                    </div>
                    <div class="etc-param-value">
                        <span class="etc-param-raw">${this._escapeHtml(param.raw_value)}</span>
                        \u2192
                        <span class="etc-param-normalized">${this._escapeHtml(String(param.normalized_value))}</span>
                    </div>
                    <div class="etc-param-meta">
                        ${citationBadge}
                        <span class="etc-confidence">Confidence: ${(param.confidence * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `;
        });

        if (params.length > this.config.maxDisplayParams) {
            paramsHtml += `<div class="etc-more">+ ${params.length - this.config.maxDisplayParams} more parameters</div>`;
        }

        panel.innerHTML = `
            <div class="etc-panel-header">
                <span class="etc-panel-icon">\uD83D\uDCE5</span>
                <span class="etc-panel-title">Extraction Result</span>
                <span class="etc-panel-badge">${params.length} parameters</span>
            </div>
            <div class="etc-panel-body">
                ${paramsHtml}
            </div>
            <div class="etc-panel-footer">
                <span class="etc-hash">
                    Input Hash:
                    <code class="etc-hash-value">${extraction.input_hash?.slice(0, 16)}...</code>
                    <button class="etc-hash-copy" data-hash="${extraction.input_hash}">\uD83D\uDCCB</button>
                </span>
                <span class="etc-time">${extraction.extraction_time_ms}ms</span>
            </div>
        `;

        return panel;
    },

    _createWarningsPanel(warnings) {
        const panel = document.createElement('div');
        panel.className = 'etc-panel etc-warnings-panel';

        const warningsHtml = warnings.map(w => {
            const isHallucination = w.includes('HALLUCINATION');
            const icon = isHallucination ? '\u26A0\uFE0F' : '\u2139\uFE0F';
            const cls = isHallucination ? 'etc-warning-critical' : 'etc-warning-info';
            return `<div class="etc-warning ${cls}">${icon} ${this._escapeHtml(w)}</div>`;
        }).join('');

        panel.innerHTML = `
            <div class="etc-panel-header etc-panel-header-warning">
                <span class="etc-panel-icon">\u26A0\uFE0F</span>
                <span class="etc-panel-title">Validation Warnings</span>
                <span class="etc-panel-badge etc-badge-warning">${warnings.length}</span>
            </div>
            <div class="etc-panel-body">
                ${warningsHtml}
            </div>
        `;

        return panel;
    },

    _createCalculationPanel(calculation) {
        const panel = document.createElement('div');
        panel.className = 'etc-panel etc-calculation-panel';

        const success = calculation.status === 'success';
        const statusClass = success ? 'etc-calc-success' : 'etc-calc-error';

        // Format output value
        let outputDisplay = calculation.output;
        if (typeof outputDisplay === 'number') {
            outputDisplay = outputDisplay.toLocaleString();
        }

        // Inputs snapshot
        let inputsHtml = '';
        if (calculation.inputs_snapshot) {
            inputsHtml = Object.entries(calculation.inputs_snapshot).map(([k, v]) =>
                `<span class="etc-input-item">${k}: <strong>${v}</strong></span>`
            ).join('');
        }

        panel.innerHTML = `
            <div class="etc-panel-header">
                <span class="etc-panel-icon">\uD83E\uDDEE</span>
                <span class="etc-panel-title">Calculation Result</span>
                <span class="etc-panel-badge">${calculation.contract_id}</span>
            </div>
            <div class="etc-panel-body ${statusClass}">
                ${success ? `
                    <div class="etc-calc-output">
                        <div class="etc-calc-label">Result</div>
                        <div class="etc-calc-value">${outputDisplay}</div>
                    </div>
                    <div class="etc-calc-formula">
                        <div class="etc-calc-label">Formula</div>
                        <div class="etc-calc-formula-text">${this._escapeHtml(calculation.formula_used)}</div>
                    </div>
                    <div class="etc-calc-inputs">
                        <div class="etc-calc-label">Inputs</div>
                        <div class="etc-calc-inputs-list">${inputsHtml}</div>
                    </div>
                ` : `
                    <div class="etc-calc-error">
                        <div class="etc-calc-error-icon">\u2717</div>
                        <div class="etc-calc-error-message">${this._escapeHtml(calculation.error_message)}</div>
                    </div>
                `}
            </div>
            <div class="etc-panel-footer">
                <span class="etc-hash">
                    Output Hash:
                    <code class="etc-hash-value">${calculation.output_hash?.slice(0, 16)}...</code>
                    <button class="etc-hash-copy" data-hash="${calculation.output_hash}">\uD83D\uDCCB</button>
                </span>
                <span class="etc-version">v${calculation.contract_version}</span>
            </div>
        `;

        return panel;
    },

    _createAuditPanel(audit) {
        const panel = document.createElement('div');
        panel.className = 'etc-panel etc-audit-panel';

        panel.innerHTML = `
            <div class="etc-panel-header">
                <span class="etc-panel-icon">\uD83D\uDCDD</span>
                <span class="etc-panel-title">Audit Trail</span>
            </div>
            <div class="etc-panel-body etc-audit-body">
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Pipeline ID</span>
                    <code class="etc-audit-value">${audit.pipeline_id}</code>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Document ID</span>
                    <code class="etc-audit-value">${audit.document_id}</code>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Extraction Hash</span>
                    <code class="etc-audit-value">${audit.extraction_hash?.slice(0, 24)}...</code>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Calculation Hash</span>
                    <code class="etc-audit-value">${audit.calculation_hash?.slice(0, 24)}...</code>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Output Hash</span>
                    <code class="etc-audit-value">${audit.output_hash?.slice(0, 24)}...</code>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Timestamp</span>
                    <span class="etc-audit-value">${audit.timestamp}</span>
                </div>
                <div class="etc-audit-row">
                    <span class="etc-audit-label">Pipeline Time</span>
                    <span class="etc-audit-value">${audit.pipeline_time_ms}ms</span>
                </div>
            </div>
        `;

        return panel;
    },

    // =========================================================================
    // VERIFICATION UI
    // =========================================================================
    _showVerificationResult(verification) {
        const modal = document.createElement('div');
        modal.className = 'etc-modal';

        const verified = verification.verified;
        const statusClass = verified ? 'etc-verified' : 'etc-unverified';
        const statusIcon = verified ? '\u2705' : '\u274C';
        const statusText = verified ? 'All Checks Passed' : 'Verification Failed';

        const checksHtml = (verification.checks || []).map(check => {
            const checkIcon = check.passed ? '\u2713' : '\u2717';
            const checkClass = check.passed ? 'etc-check-pass' : 'etc-check-fail';
            return `
                <div class="etc-check ${checkClass}">
                    <span class="etc-check-icon">${checkIcon}</span>
                    <span class="etc-check-name">${check.check}</span>
                    <span class="etc-check-details">${check.details}</span>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="etc-modal-backdrop"></div>
            <div class="etc-modal-content ${statusClass}">
                <div class="etc-modal-header">
                    <span class="etc-modal-icon">${statusIcon}</span>
                    <span class="etc-modal-title">${statusText}</span>
                    <button class="etc-modal-close">\u2715</button>
                </div>
                <div class="etc-modal-body">
                    <div class="etc-checks-list">
                        ${checksHtml}
                    </div>
                    ${verification.hallucinations ? `
                        <div class="etc-hallucinations">
                            <div class="etc-hallucinations-title">\u26A0\uFE0F Hallucinations Detected</div>
                            ${verification.hallucinations.map(h => `<div class="etc-hallucination-item">${this._escapeHtml(h)}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="etc-modal-footer">
                    <span class="etc-pipeline-ref">Pipeline: ${verification.pipeline_id}</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        modal.querySelector('.etc-modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.etc-modal-backdrop').addEventListener('click', () => modal.remove());

        // Auto-remove after animation
        setTimeout(() => {
            modal.classList.add('etc-modal-visible');
        }, 10);
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    _toggleCitationExpand(badge) {
        const existing = badge.querySelector('.etc-citation-expanded');
        if (existing) {
            existing.remove();
            return;
        }

        const citations = JSON.parse(badge.dataset.citations || '[]');
        if (citations.length === 0) return;

        const expanded = document.createElement('div');
        expanded.className = 'etc-citation-expanded';

        expanded.innerHTML = citations.map(c => `
            <div class="etc-citation-item">
                <div class="etc-citation-text">"${this._truncate(c.text_span, this.config.maxCitationLength)}"</div>
                <div class="etc-citation-meta">
                    <span class="etc-citation-doc">${c.document_id}</span>
                    <span class="etc-citation-pos">[${c.start_offset}:${c.end_offset}]</span>
                    <span class="etc-citation-method">${c.extraction_method}</span>
                </div>
            </div>
        `).join('');

        badge.appendChild(expanded);
    },

    _showLoading() {
        // Find any existing pipeline containers and add loading state
        document.querySelectorAll('.etc-pipeline-widget').forEach(w => {
            w.classList.add('etc-loading');
        });
    },

    _hideLoading() {
        document.querySelectorAll('.etc-pipeline-widget').forEach(w => {
            w.classList.remove('etc-loading');
        });
    },

    _copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('[ETCPipeline] Copied to clipboard');
        }).catch(e => {
            console.error('[ETCPipeline] Copy failed:', e);
        });
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _truncate(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('etc-pipeline-styles')) return;

        const style = document.createElement('style');
        style.id = 'etc-pipeline-styles';
        style.textContent = `
            /* ETC Pipeline Widget */
            .etc-pipeline-widget {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                margin: 1rem 0;
            }

            .etc-pipeline-widget.etc-loading {
                opacity: 0.7;
                pointer-events: none;
            }

            /* Header */
            .etc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }

            .etc-header-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .etc-status-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.875rem;
            }

            .etc-status-success {
                background: #d4edda;
                color: #155724;
            }

            .etc-status-error {
                background: #f8d7da;
                color: #721c24;
            }

            .etc-pipeline-id {
                color: #6c757d;
                font-size: 0.75rem;
                font-family: monospace;
            }

            .etc-verify-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
                transition: background 0.2s;
            }

            .etc-verify-btn:hover {
                background: #0056b3;
            }

            /* Steps Visualization */
            .etc-steps {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
                gap: 0.5rem;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            }

            .etc-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1rem 1.5rem;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                min-width: 100px;
            }

            .etc-step-complete {
                border: 2px solid #28a745;
            }

            .etc-step-warning {
                border: 2px solid #ffc107;
            }

            .etc-step-error {
                border: 2px solid #dc3545;
            }

            .etc-step-icon {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
            }

            .etc-step-name {
                font-weight: 600;
                font-size: 0.875rem;
            }

            .etc-step-detail {
                font-size: 0.75rem;
                color: #6c757d;
                margin-top: 0.25rem;
            }

            .etc-step-arrow {
                font-size: 1.5rem;
                color: #adb5bd;
            }

            /* Panels */
            .etc-panel {
                border-bottom: 1px solid #e9ecef;
            }

            .etc-panel:last-child {
                border-bottom: none;
            }

            .etc-panel-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                background: #f8f9fa;
            }

            .etc-panel-header-warning {
                background: #fff3cd;
            }

            .etc-panel-icon {
                font-size: 1.25rem;
            }

            .etc-panel-title {
                font-weight: 600;
                flex: 1;
            }

            .etc-panel-badge {
                background: #e9ecef;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .etc-badge-warning {
                background: #ffc107;
                color: #856404;
            }

            .etc-panel-body {
                padding: 1rem 1.5rem;
            }

            .etc-panel-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1.5rem;
                background: #f8f9fa;
                font-size: 0.75rem;
                color: #6c757d;
            }

            /* Extraction Parameters */
            .etc-param {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                border-left: 3px solid #007bff;
            }

            .etc-param.etc-valid {
                border-left-color: #28a745;
            }

            .etc-param.etc-partial {
                border-left-color: #ffc107;
            }

            .etc-param.etc-hallucination {
                border-left-color: #dc3545;
                background: #fff5f5;
            }

            .etc-param-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .etc-param-name {
                font-weight: 600;
                color: #212529;
            }

            .etc-param-type {
                background: #e9ecef;
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
                font-size: 0.7rem;
                text-transform: uppercase;
            }

            .etc-param-value {
                font-family: monospace;
                font-size: 0.875rem;
                margin-bottom: 0.5rem;
            }

            .etc-param-raw {
                color: #6c757d;
            }

            .etc-param-normalized {
                color: #212529;
                font-weight: 500;
            }

            .etc-param-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.75rem;
            }

            /* Citations */
            .etc-citation-badge {
                background: #e7f1ff;
                color: #0056b3;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                cursor: pointer;
                position: relative;
            }

            .etc-citation-badge:hover {
                background: #cce5ff;
            }

            .etc-no-citation {
                color: #adb5bd;
                font-style: italic;
            }

            .etc-citation-expanded {
                position: absolute;
                top: 100%;
                left: 0;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 1rem;
                min-width: 300px;
                max-width: 500px;
                z-index: 100;
                margin-top: 0.5rem;
            }

            .etc-citation-item {
                margin-bottom: 0.75rem;
            }

            .etc-citation-item:last-child {
                margin-bottom: 0;
            }

            .etc-citation-text {
                font-style: italic;
                color: #495057;
                margin-bottom: 0.25rem;
            }

            .etc-citation-meta {
                display: flex;
                gap: 0.5rem;
                font-size: 0.7rem;
                color: #6c757d;
            }

            /* Warnings */
            .etc-warning {
                padding: 0.75rem 1rem;
                border-radius: 6px;
                margin-bottom: 0.5rem;
            }

            .etc-warning-info {
                background: #cce5ff;
                color: #004085;
            }

            .etc-warning-critical {
                background: #f8d7da;
                color: #721c24;
            }

            /* Calculation Result */
            .etc-calc-success {
                background: #d4edda;
                border-radius: 8px;
                padding: 1.5rem;
            }

            .etc-calc-error {
                text-align: center;
                padding: 2rem;
            }

            .etc-calc-error-icon {
                font-size: 2rem;
                color: #dc3545;
                margin-bottom: 1rem;
            }

            .etc-calc-output {
                text-align: center;
                margin-bottom: 1.5rem;
            }

            .etc-calc-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                color: #6c757d;
                margin-bottom: 0.5rem;
            }

            .etc-calc-value {
                font-size: 2.5rem;
                font-weight: 700;
                color: #155724;
            }

            .etc-calc-formula {
                background: rgba(255,255,255,0.5);
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 1rem;
            }

            .etc-calc-formula-text {
                font-family: monospace;
                font-size: 0.875rem;
            }

            .etc-calc-inputs-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .etc-input-item {
                background: rgba(255,255,255,0.7);
                padding: 0.25rem 0.75rem;
                border-radius: 4px;
                font-size: 0.875rem;
            }

            /* Audit Trail */
            .etc-audit-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
            }

            .etc-audit-row {
                display: flex;
                flex-direction: column;
            }

            .etc-audit-label {
                font-size: 0.7rem;
                text-transform: uppercase;
                color: #6c757d;
                margin-bottom: 0.25rem;
            }

            .etc-audit-value {
                font-family: monospace;
                font-size: 0.8rem;
                color: #212529;
            }

            /* Hash */
            .etc-hash {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .etc-hash-value {
                background: #e9ecef;
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
            }

            .etc-hash-copy {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                font-size: 0.875rem;
            }

            .etc-hash-copy:hover {
                opacity: 0.7;
            }

            /* Modal */
            .etc-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .etc-modal.etc-modal-visible {
                opacity: 1;
            }

            .etc-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
            }

            .etc-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                min-width: 400px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: auto;
            }

            .etc-modal-content.etc-verified {
                border-top: 4px solid #28a745;
            }

            .etc-modal-content.etc-unverified {
                border-top: 4px solid #dc3545;
            }

            .etc-modal-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid #e9ecef;
            }

            .etc-modal-icon {
                font-size: 1.5rem;
            }

            .etc-modal-title {
                flex: 1;
                font-weight: 600;
                font-size: 1.125rem;
            }

            .etc-modal-close {
                background: none;
                border: none;
                font-size: 1.25rem;
                cursor: pointer;
                color: #6c757d;
            }

            .etc-modal-body {
                padding: 1.5rem;
            }

            .etc-modal-footer {
                padding: 1rem 1.5rem;
                background: #f8f9fa;
                font-size: 0.75rem;
                color: #6c757d;
            }

            /* Checks */
            .etc-checks-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .etc-check {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                border-radius: 6px;
            }

            .etc-check-pass {
                background: #d4edda;
            }

            .etc-check-fail {
                background: #f8d7da;
            }

            .etc-check-icon {
                font-size: 1.25rem;
            }

            .etc-check-name {
                flex: 1;
                font-weight: 500;
            }

            .etc-check-details {
                font-size: 0.875rem;
                color: #6c757d;
            }

            /* Hallucinations */
            .etc-hallucinations {
                margin-top: 1rem;
                padding: 1rem;
                background: #fff3cd;
                border-radius: 8px;
            }

            .etc-hallucinations-title {
                font-weight: 600;
                margin-bottom: 0.75rem;
            }

            .etc-hallucination-item {
                font-size: 0.875rem;
                padding: 0.5rem;
                background: rgba(255,255,255,0.5);
                border-radius: 4px;
                margin-bottom: 0.5rem;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .etc-steps {
                    flex-direction: column;
                }

                .etc-step-arrow {
                    transform: rotate(90deg);
                }

                .etc-audit-body {
                    grid-template-columns: 1fr;
                }

                .etc-header {
                    flex-direction: column;
                    gap: 1rem;
                }
            }
        `;

        document.head.appendChild(style);
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ETCPipeline.init());
} else {
    ETCPipeline.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETCPipeline;
}
