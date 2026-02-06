/**
 * TinyPM Overlap Validator UI
 * ===========================
 * Frontend integration for the Overlap Validator system.
 * Displays extraction validation results in the UI.
 *
 * For the General TinyPM App:
 * - Extraction cards show overlap score
 * - Green checkmark for valid (>=80%)
 * - Yellow warning for partial (50-80%)
 * - Red X for invalid (<50%)
 * - "View cited text" expandable to see exact span
 *
 * For the Developer Dashboard:
 * - Overlap validation monitor
 * - Hallucination detection log
 * - Abstain rate tracker
 * - Test extraction tool
 *
 * Created: 2026-02-04
 * Project: Sovereign Seed - Phase 1
 */

const OverlapValidatorUI = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        thresholds: {
            valid: 0.80,    // >= 80% = valid
            partial: 0.50,  // >= 50% = partial
            invalid: 0.0    // < 50% = invalid
        },
        colors: {
            valid: '#22c55e',      // Green
            partial: '#eab308',    // Yellow
            invalid: '#ef4444',    // Red
            hallucination: '#dc2626'  // Dark red
        },
        apiEndpoint: '/api/validate/overlap',
        animationDuration: 300
    },

    // State
    state: {
        validationLog: [],
        abstainRate: 0,
        hallucinationRate: 0,
        lastUpdate: null
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this.loadState();
    },

    loadState() {
        const saved = localStorage.getItem('tinypm_overlap_validator_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            } catch (e) {
                console.warn('Failed to load overlap validator state:', e);
            }
        }
    },

    saveState() {
        this.state.lastUpdate = new Date().toISOString();
        localStorage.setItem('tinypm_overlap_validator_state', JSON.stringify(this.state));
    },

    // =========================================================================
    // EXTRACTION CARD COMPONENT
    // =========================================================================
    /**
     * Create an extraction card with overlap validation display
     *
     * @param {Object} options - Card options
     * @param {string} options.extractedValue - The value extracted by AI
     * @param {string} options.citedSpan - The text span cited as source
     * @param {number} options.iouScore - IoU overlap score (0-1)
     * @param {string} options.status - Validation status
     * @param {string} options.recommendation - Governor recommendation
     * @param {string} options.valueType - Type of extracted value
     * @param {Array} options.evidence - Tokens found in span
     * @param {Array} options.missing - Tokens not found in span
     * @param {Function} options.onAccept - Callback when user accepts
     * @param {Function} options.onReject - Callback when user rejects
     * @returns {HTMLElement} The extraction card element
     */
    createExtractionCard(options) {
        const {
            extractedValue,
            citedSpan,
            iouScore = 0,
            status = 'unknown',
            recommendation = 'review',
            valueType = 'text',
            evidence = [],
            missing = [],
            onAccept,
            onReject
        } = options;

        const card = document.createElement('div');
        card.className = `extraction-card overlap-${this.getStatusLevel(iouScore, status)}`;

        const statusIcon = this.getStatusIcon(iouScore, status);
        const statusColor = this.getStatusColor(iouScore, status);
        const scorePercent = Math.round(iouScore * 100);

        card.innerHTML = `
            <div class="extraction-header">
                <div class="extraction-status">
                    <span class="status-icon" style="color: ${statusColor}">
                        ${statusIcon}
                    </span>
                    <span class="status-label">${this.capitalizeFirst(status)}</span>
                </div>
                <div class="overlap-score" style="color: ${statusColor}">
                    <span class="score-value">${scorePercent}%</span>
                    <span class="score-label">overlap</span>
                </div>
            </div>

            <div class="extraction-body">
                <div class="extracted-value">
                    <span class="value-label">Extracted:</span>
                    <span class="value-text">${this.escapeHtml(extractedValue)}</span>
                    ${valueType ? `<span class="value-type">${valueType}</span>` : ''}
                </div>

                <button class="cited-toggle" onclick="this.closest('.extraction-card').classList.toggle('expanded')">
                    <span class="toggle-icon"></span>
                    <span class="toggle-text">View cited text</span>
                </button>

                <div class="cited-section">
                    <div class="cited-span">${this.highlightMatches(citedSpan, evidence)}</div>

                    ${evidence.length > 0 || missing.length > 0 ? `
                        <div class="token-analysis">
                            ${evidence.length > 0 ? `
                                <div class="tokens found">
                                    <span class="tokens-label">Found:</span>
                                    ${evidence.slice(0, 8).map(t => `
                                        <span class="token">${this.escapeHtml(t)}</span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${missing.length > 0 ? `
                                <div class="tokens missing">
                                    <span class="tokens-label">Missing:</span>
                                    ${missing.slice(0, 8).map(t => `
                                        <span class="token">${this.escapeHtml(t)}</span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="extraction-footer">
                <span class="recommendation recommendation-${recommendation}">
                    ${this.getRecommendationText(recommendation)}
                </span>
                ${onAccept || onReject ? `
                    <div class="extraction-actions">
                        ${onAccept ? `
                            <button class="action-btn accept" onclick="OverlapValidatorUI.handleCardAction(this, 'accept')">
                                Accept
                            </button>
                        ` : ''}
                        ${onReject ? `
                            <button class="action-btn reject" onclick="OverlapValidatorUI.handleCardAction(this, 'reject')">
                                Reject
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        // Store callbacks
        card._callbacks = { onAccept, onReject };

        return card;
    },

    /**
     * Create a compact validation badge for inline display
     */
    createValidationBadge(iouScore, status = null) {
        const level = this.getStatusLevel(iouScore, status);
        const color = this.getStatusColor(iouScore, status);
        const icon = this.getStatusIcon(iouScore, status);
        const percent = Math.round(iouScore * 100);

        const badge = document.createElement('span');
        badge.className = `overlap-badge overlap-${level}`;
        badge.style.setProperty('--badge-color', color);
        badge.innerHTML = `
            <span class="badge-icon">${icon}</span>
            <span class="badge-score">${percent}%</span>
        `;

        return badge;
    },

    // =========================================================================
    // DEVELOPER DASHBOARD COMPONENTS
    // =========================================================================
    /**
     * Create the overlap validation monitor for dev dashboard
     */
    createValidationMonitor() {
        const container = document.createElement('div');
        container.className = 'overlap-monitor';
        container.id = 'overlap-validation-monitor';

        container.innerHTML = `
            <div class="monitor-header">
                <h3>Overlap Validation Monitor</h3>
                <button class="refresh-btn" onclick="OverlapValidatorUI.refreshMonitor()">
                    Refresh
                </button>
            </div>

            <div class="monitor-stats">
                <div class="stat-card">
                    <span class="stat-value" id="abstain-rate">--</span>
                    <span class="stat-label">Abstain Rate</span>
                    <div class="stat-bar">
                        <div class="stat-fill abstain" id="abstain-fill"></div>
                    </div>
                </div>

                <div class="stat-card">
                    <span class="stat-value" id="hallucination-rate">--</span>
                    <span class="stat-label">Hallucination Rate</span>
                    <div class="stat-bar">
                        <div class="stat-fill hallucination" id="hallucination-fill"></div>
                    </div>
                </div>

                <div class="stat-card">
                    <span class="stat-value" id="total-validations">--</span>
                    <span class="stat-label">Total Validations (24h)</span>
                </div>
            </div>

            <div class="monitor-alert" id="safe-mode-alert" style="display: none;">
                <span class="alert-icon">!</span>
                <span class="alert-text">High abstain rate detected. Consider triggering Safe Mode.</span>
            </div>

            <div class="monitor-log">
                <h4>Recent Validations</h4>
                <div class="log-entries" id="validation-log-entries">
                    <p class="empty-state">No validations yet</p>
                </div>
            </div>
        `;

        return container;
    },

    /**
     * Refresh the validation monitor with latest data
     */
    async refreshMonitor() {
        try {
            const response = await fetch('/api/admin/overlap/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');

            const stats = await response.json();

            // Update stats
            document.getElementById('abstain-rate').textContent =
                `${Math.round(stats.abstain_rate * 100)}%`;
            document.getElementById('hallucination-rate').textContent =
                `${Math.round(stats.hallucination_rate * 100)}%`;
            document.getElementById('total-validations').textContent =
                stats.total_checks || 0;

            // Update bars
            document.getElementById('abstain-fill').style.width =
                `${Math.round(stats.abstain_rate * 100)}%`;
            document.getElementById('hallucination-fill').style.width =
                `${Math.round(stats.hallucination_rate * 100)}%`;

            // Show/hide safe mode alert
            const alertEl = document.getElementById('safe-mode-alert');
            if (alertEl) {
                alertEl.style.display = stats.safe_mode_trigger ? 'flex' : 'none';
            }

            // Update log entries
            if (stats.recent_abstains && stats.recent_abstains.length > 0) {
                this.updateLogEntries(stats.recent_abstains);
            }

            // Update local state
            this.state.abstainRate = stats.abstain_rate;
            this.state.hallucinationRate = stats.hallucination_rate;
            this.saveState();

        } catch (error) {
            console.error('Failed to refresh monitor:', error);
            // Use cached state
            this.updateMonitorFromState();
        }
    },

    updateMonitorFromState() {
        document.getElementById('abstain-rate').textContent =
            `${Math.round(this.state.abstainRate * 100)}%`;
        document.getElementById('hallucination-rate').textContent =
            `${Math.round(this.state.hallucinationRate * 100)}%`;
    },

    updateLogEntries(entries) {
        const container = document.getElementById('validation-log-entries');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-state">No validations yet</p>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="log-entry ${entry.status}">
                <div class="log-header">
                    <span class="log-status ${entry.status}">${entry.status}</span>
                    <span class="log-time">${this.formatTime(entry.timestamp)}</span>
                </div>
                <div class="log-content">
                    <div class="log-value">${this.escapeHtml(entry.extracted_value)}</div>
                    <div class="log-score">IoU: ${Math.round(entry.iou_score * 100)}%</div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Create the test extraction tool for dev dashboard
     */
    createTestTool() {
        const container = document.createElement('div');
        container.className = 'overlap-test-tool';

        container.innerHTML = `
            <h3>Test Overlap Validation</h3>

            <div class="test-form">
                <div class="form-group">
                    <label for="test-extracted">Extracted Value:</label>
                    <input type="text" id="test-extracted" placeholder="e.g., $1,200">
                </div>

                <div class="form-group">
                    <label for="test-span">Cited Span:</label>
                    <textarea id="test-span" rows="3"
                        placeholder="e.g., The rent is $1,200 per month"></textarea>
                </div>

                <div class="form-group">
                    <label for="test-type">Value Type:</label>
                    <select id="test-type">
                        <option value="">Auto-detect</option>
                        <option value="currency">Currency</option>
                        <option value="date">Date</option>
                        <option value="percentage">Percentage</option>
                        <option value="number">Number</option>
                        <option value="text">Text</option>
                    </select>
                </div>

                <button class="test-btn" onclick="OverlapValidatorUI.runTest()">
                    Run Validation
                </button>
            </div>

            <div class="test-result" id="test-result" style="display: none;">
                <!-- Result will be inserted here -->
            </div>
        `;

        return container;
    },

    /**
     * Run a test validation
     */
    async runTest() {
        const extracted = document.getElementById('test-extracted').value;
        const span = document.getElementById('test-span').value;
        const valueType = document.getElementById('test-type').value || null;

        if (!extracted || !span) {
            alert('Please enter both an extracted value and a cited span');
            return;
        }

        const resultContainer = document.getElementById('test-result');
        resultContainer.innerHTML = '<p class="loading">Validating...</p>';
        resultContainer.style.display = 'block';

        try {
            const response = await fetch('/api/validate/overlap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extracted_value: extracted,
                    cited_span: span,
                    value_type: valueType
                })
            });

            if (!response.ok) throw new Error('Validation failed');

            const result = await response.json();

            // Create and display result card
            const card = this.createExtractionCard({
                extractedValue: extracted,
                citedSpan: span,
                iouScore: result.iou_score,
                status: result.status,
                recommendation: result.recommendation,
                valueType: valueType,
                evidence: result.evidence || [],
                missing: result.missing || []
            });

            resultContainer.innerHTML = '';
            resultContainer.appendChild(card);

        } catch (error) {
            console.error('Test validation failed:', error);
            resultContainer.innerHTML = `
                <div class="error-message">
                    Validation failed: ${error.message}
                </div>
            `;
        }
    },

    /**
     * Create the hallucination detection log
     */
    createHallucinationLog() {
        const container = document.createElement('div');
        container.className = 'hallucination-log';

        container.innerHTML = `
            <div class="log-header">
                <h3>Hallucination Detection Log</h3>
                <button class="refresh-btn" onclick="OverlapValidatorUI.refreshHallucinationLog()">
                    Refresh
                </button>
            </div>

            <div class="log-content" id="hallucination-log-content">
                <p class="empty-state">No hallucinations detected</p>
            </div>
        `;

        return container;
    },

    async refreshHallucinationLog() {
        try {
            const response = await fetch('/api/admin/overlap/hallucinations');
            if (!response.ok) throw new Error('Failed to fetch hallucinations');

            const data = await response.json();
            const container = document.getElementById('hallucination-log-content');

            if (!data.hallucinations || data.hallucinations.length === 0) {
                container.innerHTML = '<p class="empty-state">No hallucinations detected</p>';
                return;
            }

            container.innerHTML = data.hallucinations.map(h => `
                <div class="hallucination-entry">
                    <div class="entry-header">
                        <span class="entry-status">HALLUCINATION</span>
                        <span class="entry-time">${this.formatTime(h.timestamp)}</span>
                    </div>
                    <div class="entry-content">
                        <div class="entry-extracted">
                            <span class="label">Extracted:</span>
                            <span class="value">${this.escapeHtml(h.extracted_value)}</span>
                        </div>
                        <div class="entry-span">
                            <span class="label">Cited Span:</span>
                            <span class="value">${this.escapeHtml(h.cited_span?.substring(0, 100))}...</span>
                        </div>
                        <div class="entry-reason">
                            <span class="label">Reason:</span>
                            <span class="value">${this.escapeHtml(h.reason || 'Value contradicts span')}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to refresh hallucination log:', error);
        }
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    getStatusLevel(iouScore, status) {
        if (status === 'hallucination') return 'hallucination';
        if (iouScore >= this.config.thresholds.valid) return 'valid';
        if (iouScore >= this.config.thresholds.partial) return 'partial';
        return 'invalid';
    },

    getStatusColor(iouScore, status) {
        if (status === 'hallucination') return this.config.colors.hallucination;
        if (iouScore >= this.config.thresholds.valid) return this.config.colors.valid;
        if (iouScore >= this.config.thresholds.partial) return this.config.colors.partial;
        return this.config.colors.invalid;
    },

    getStatusIcon(iouScore, status) {
        if (status === 'hallucination') return '&#x2716;'; // X mark
        if (iouScore >= this.config.thresholds.valid) return '&#x2714;'; // Checkmark
        if (iouScore >= this.config.thresholds.partial) return '&#x26A0;'; // Warning
        return '&#x2716;'; // X mark
    },

    getRecommendationText(recommendation) {
        const texts = {
            accept: 'Recommended: Accept',
            review: 'Needs Human Review',
            reject: 'Recommended: Reject',
            abstain: 'Governor Abstaining'
        };
        return texts[recommendation] || recommendation;
    },

    highlightMatches(text, tokens) {
        if (!tokens || tokens.length === 0) {
            return this.escapeHtml(text);
        }

        let result = this.escapeHtml(text);

        // Sort tokens by length (longest first) to avoid partial replacements
        const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);

        for (const token of sortedTokens) {
            const regex = new RegExp(`\\b(${this.escapeRegex(token)})\\b`, 'gi');
            result = result.replace(regex, '<mark class="match">$1</mark>');
        }

        return result;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    formatTime(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return timestamp;
        }
    },

    handleCardAction(button, action) {
        const card = button.closest('.extraction-card');
        if (!card || !card._callbacks) return;

        if (action === 'accept' && card._callbacks.onAccept) {
            card._callbacks.onAccept();
        } else if (action === 'reject' && card._callbacks.onReject) {
            card._callbacks.onReject();
        }

        // Animate card removal
        card.classList.add(action === 'accept' ? 'accepted' : 'rejected');
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), this.config.animationDuration);
        }, 300);
    },

    // =========================================================================
    // API METHODS
    // =========================================================================
    /**
     * Validate an extraction via API
     */
    async validate(extractedValue, citedSpan, valueType = null) {
        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extracted_value: extractedValue,
                    cited_span: citedSpan,
                    value_type: valueType
                })
            });

            if (!response.ok) {
                throw new Error(`Validation failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Overlap validation failed:', error);
            throw error;
        }
    },

    /**
     * Check if an extraction should pass the Governor gate
     */
    shouldPass(validationResult) {
        return validationResult.recommendation === 'accept';
    },

    /**
     * Check if Governor should abstain
     */
    shouldAbstain(validationResult) {
        return validationResult.recommendation === 'abstain' ||
               validationResult.recommendation === 'reject';
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('overlap-validator-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'overlap-validator-styles';
        styles.textContent = `
            /* Extraction Card Styles */
            .extraction-card {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                margin: 12px 0;
                transition: all 0.3s ease;
            }

            .extraction-card.overlap-valid {
                border-left: 4px solid ${this.config.colors.valid};
            }

            .extraction-card.overlap-partial {
                border-left: 4px solid ${this.config.colors.partial};
            }

            .extraction-card.overlap-invalid,
            .extraction-card.overlap-hallucination {
                border-left: 4px solid ${this.config.colors.invalid};
            }

            .extraction-card.accepted {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
            }

            .extraction-card.rejected {
                opacity: 0.5;
            }

            .extraction-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .extraction-status {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .status-icon {
                font-size: 18px;
            }

            .status-label {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #a0a4b8;
            }

            .overlap-score {
                text-align: right;
            }

            .score-value {
                font-size: 20px;
                font-weight: 700;
            }

            .score-label {
                display: block;
                font-size: 10px;
                color: #6b6f82;
                text-transform: uppercase;
            }

            .extraction-body {
                margin-bottom: 12px;
            }

            .extracted-value {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }

            .value-label {
                font-size: 11px;
                color: #6b6f82;
            }

            .value-text {
                font-size: 14px;
                font-weight: 600;
                color: #f0f0f5;
            }

            .value-type {
                font-size: 10px;
                padding: 2px 6px;
                background: rgba(99, 102, 241, 0.2);
                border-radius: 4px;
                color: #a0a4b8;
            }

            .cited-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.03);
                border: none;
                border-radius: 6px;
                color: #6b6f82;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .cited-toggle:hover {
                background: rgba(255, 255, 255, 0.06);
                color: #a0a4b8;
            }

            .toggle-icon::after {
                content: '';
                border: solid currentColor;
                border-width: 0 2px 2px 0;
                padding: 3px;
                transform: rotate(45deg);
                display: inline-block;
                margin-top: -2px;
                transition: transform 0.2s;
            }

            .extraction-card.expanded .toggle-icon::after {
                transform: rotate(-135deg);
            }

            .cited-section {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }

            .extraction-card.expanded .cited-section {
                max-height: 500px;
            }

            .cited-span {
                margin-top: 12px;
                padding: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                font-size: 13px;
                color: #a0a4b8;
                line-height: 1.5;
            }

            .cited-span mark.match {
                background: rgba(34, 197, 94, 0.3);
                color: #22c55e;
                padding: 0 2px;
                border-radius: 2px;
            }

            .token-analysis {
                margin-top: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .tokens {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px;
            }

            .tokens-label {
                font-size: 11px;
                color: #6b6f82;
            }

            .token {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
                color: #a0a4b8;
            }

            .tokens.found .token {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .tokens.missing .token {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }

            .extraction-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .recommendation {
                font-size: 12px;
                font-weight: 600;
            }

            .recommendation-accept {
                color: ${this.config.colors.valid};
            }

            .recommendation-review {
                color: ${this.config.colors.partial};
            }

            .recommendation-reject,
            .recommendation-abstain {
                color: ${this.config.colors.invalid};
            }

            .extraction-actions {
                display: flex;
                gap: 8px;
            }

            .extraction-card .action-btn {
                padding: 6px 14px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }

            .extraction-card .action-btn.accept {
                background: ${this.config.colors.valid};
                color: white;
            }

            .extraction-card .action-btn.reject {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .extraction-card .action-btn:hover {
                transform: translateY(-1px);
            }

            /* Overlap Badge */
            .overlap-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
                background: rgba(255, 255, 255, 0.05);
            }

            .overlap-badge.overlap-valid {
                background: rgba(34, 197, 94, 0.15);
                color: ${this.config.colors.valid};
            }

            .overlap-badge.overlap-partial {
                background: rgba(234, 179, 8, 0.15);
                color: ${this.config.colors.partial};
            }

            .overlap-badge.overlap-invalid,
            .overlap-badge.overlap-hallucination {
                background: rgba(239, 68, 68, 0.15);
                color: ${this.config.colors.invalid};
            }

            /* Monitor Styles */
            .overlap-monitor {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
            }

            .monitor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .monitor-header h3 {
                font-size: 16px;
                font-weight: 600;
                color: #f0f0f5;
                margin: 0;
            }

            .refresh-btn {
                padding: 6px 12px;
                background: rgba(99, 102, 241, 0.2);
                border: none;
                border-radius: 6px;
                color: #a0a4b8;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .refresh-btn:hover {
                background: rgba(99, 102, 241, 0.3);
                color: #f0f0f5;
            }

            .monitor-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 20px;
            }

            .stat-card {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .stat-value {
                display: block;
                font-size: 28px;
                font-weight: 700;
                color: #f0f0f5;
            }

            .stat-label {
                display: block;
                font-size: 11px;
                color: #6b6f82;
                text-transform: uppercase;
                margin-top: 4px;
            }

            .stat-bar {
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                margin-top: 12px;
                overflow: hidden;
            }

            .stat-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.5s ease;
            }

            .stat-fill.abstain {
                background: ${this.config.colors.partial};
            }

            .stat-fill.hallucination {
                background: ${this.config.colors.invalid};
            }

            .monitor-alert {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 8px;
                margin-bottom: 20px;
            }

            .alert-icon {
                width: 24px;
                height: 24px;
                background: ${this.config.colors.invalid};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
            }

            .alert-text {
                color: #ef4444;
                font-size: 13px;
            }

            .monitor-log h4 {
                font-size: 14px;
                color: #a0a4b8;
                margin: 0 0 12px;
            }

            .log-entries {
                max-height: 300px;
                overflow-y: auto;
            }

            .log-entry {
                padding: 10px;
                background: rgba(0, 0, 0, 0.15);
                border-radius: 6px;
                margin-bottom: 8px;
            }

            .log-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
            }

            .log-status {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .log-status.valid {
                background: rgba(34, 197, 94, 0.2);
                color: ${this.config.colors.valid};
            }

            .log-status.partial {
                background: rgba(234, 179, 8, 0.2);
                color: ${this.config.colors.partial};
            }

            .log-status.invalid,
            .log-status.hallucination {
                background: rgba(239, 68, 68, 0.2);
                color: ${this.config.colors.invalid};
            }

            .log-time {
                font-size: 11px;
                color: #6b6f82;
            }

            .log-content {
                display: flex;
                justify-content: space-between;
            }

            .log-value {
                font-size: 12px;
                color: #a0a4b8;
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .log-score {
                font-size: 12px;
                color: #6b6f82;
                margin-left: 12px;
            }

            .empty-state {
                color: #6b6f82;
                font-size: 13px;
                text-align: center;
                padding: 20px;
            }

            /* Test Tool Styles */
            .overlap-test-tool {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                margin-top: 20px;
            }

            .overlap-test-tool h3 {
                font-size: 16px;
                font-weight: 600;
                color: #f0f0f5;
                margin: 0 0 16px;
            }

            .test-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .form-group label {
                font-size: 12px;
                color: #6b6f82;
            }

            .form-group input,
            .form-group textarea,
            .form-group select {
                padding: 10px 12px;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #f0f0f5;
                font-size: 13px;
                font-family: inherit;
            }

            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: rgba(99, 102, 241, 0.5);
            }

            .test-btn {
                padding: 10px 20px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .test-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .test-result {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .loading {
                color: #6b6f82;
                font-size: 13px;
            }

            .error-message {
                color: ${this.config.colors.invalid};
                font-size: 13px;
                padding: 12px;
                background: rgba(239, 68, 68, 0.1);
                border-radius: 6px;
            }

            /* Hallucination Log */
            .hallucination-log {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                margin-top: 20px;
            }

            .hallucination-entry {
                background: rgba(239, 68, 68, 0.05);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
            }

            .hallucination-entry .entry-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .hallucination-entry .entry-status {
                font-size: 10px;
                font-weight: 700;
                background: ${this.config.colors.invalid};
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
            }

            .hallucination-entry .entry-time {
                font-size: 11px;
                color: #6b6f82;
            }

            .hallucination-entry .entry-content > div {
                margin-bottom: 4px;
            }

            .hallucination-entry .label {
                font-size: 11px;
                color: #6b6f82;
                margin-right: 6px;
            }

            .hallucination-entry .value {
                font-size: 12px;
                color: #a0a4b8;
            }

            /* Mobile Responsive */
            @media (max-width: 600px) {
                .monitor-stats {
                    grid-template-columns: 1fr;
                }

                .extraction-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .overlap-score {
                    text-align: left;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.OverlapValidatorUI = OverlapValidatorUI;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    OverlapValidatorUI.init();
});
