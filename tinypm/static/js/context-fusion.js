/**
 * ============================================================================
 * CONTEXT FUSION FRONTEND - Phase 1 Prescient AI Integration
 * ============================================================================
 *
 * Connects to the Context Fusion Engine backend via SSE for real-time
 * fused intelligence updates. Displays predictions, signal status, and
 * provides "How did I know?" reasoning tooltips.
 *
 * Features:
 * - Real-time SSE connection to fusion engine
 * - Signal status indicators (7 sources)
 * - Prediction cards with confidence levels
 * - Reasoning tooltips for transparency
 * - Graceful degradation when backend unavailable
 *
 * Created: 2026-02-04
 * Research Basis: PROACTIVE_AI_RESEARCH_2026.md
 * ============================================================================
 */

const ContextFusion = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        baseUrl: '/api/fusion',  // Backend API base
        sseUrl: '/api/fusion/stream',  // SSE endpoint
        pollInterval: 30000,  // Fallback polling interval (30s)
        reconnectDelay: 5000,  // Reconnect delay on SSE failure
        maxReconnectAttempts: 10
    },

    // Connection state
    state: {
        connected: false,
        mode: 'disconnected',  // 'sse', 'polling', 'disconnected'
        reconnectAttempts: 0,
        lastUpdate: null,
        eventSource: null
    },

    // Cached data
    cache: {
        context: null,
        predictions: [],
        signalStatus: {},
        overallConfidence: 0
    },

    // Event handlers
    handlers: {
        onContextUpdate: null,
        onPrediction: null,
        onSignalStatusChange: null,
        onConnectionChange: null
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize Context Fusion integration
     * @param {Object} options - Configuration options
     */
    async init(options = {}) {
        console.log('[ContextFusion] Initializing...');

        // Merge options
        Object.assign(this.config, options);

        // Create UI containers if they don't exist
        this._ensureUIContainers();

        // Try SSE first, fall back to polling
        const sseAvailable = await this._initSSE();

        if (!sseAvailable) {
            console.log('[ContextFusion] SSE unavailable, using polling');
            this._startPolling();
        }

        // Initial fetch
        await this.fetchFusedIntelligence();

        console.log('[ContextFusion] Initialized');
        return true;
    },

    /**
     * Ensure UI containers exist in the DOM
     */
    _ensureUIContainers() {
        // Signal status container
        if (!document.getElementById('fusion-signal-status')) {
            const statusContainer = document.createElement('div');
            statusContainer.id = 'fusion-signal-status';
            statusContainer.className = 'fusion-signal-status';
            // Will be positioned by CSS
        }

        // Predictions container
        if (!document.getElementById('fusion-predictions')) {
            const predsContainer = document.createElement('div');
            predsContainer.id = 'fusion-predictions';
            predsContainer.className = 'fusion-predictions';
        }
    },

    // =========================================================================
    // SSE CONNECTION
    // =========================================================================

    /**
     * Initialize Server-Sent Events connection
     * @returns {Promise<boolean>} Whether SSE was established
     */
    async _initSSE() {
        try {
            // Check if SSE endpoint is available
            const response = await fetch(this.config.sseUrl, {
                method: 'HEAD'
            }).catch(() => null);

            if (!response || !response.ok) {
                return false;
            }

            this.state.eventSource = new EventSource(this.config.sseUrl);

            this.state.eventSource.onopen = () => {
                console.log('[ContextFusion] SSE connected');
                this.state.connected = true;
                this.state.mode = 'sse';
                this.state.reconnectAttempts = 0;
                this._updateConnectionIndicator('connected');

                if (this.handlers.onConnectionChange) {
                    this.handlers.onConnectionChange('connected');
                }
            };

            this.state.eventSource.onmessage = (event) => {
                this._handleSSEMessage(event);
            };

            this.state.eventSource.addEventListener('context_update', (event) => {
                const data = JSON.parse(event.data);
                this._handleContextUpdate(data);
            });

            this.state.eventSource.addEventListener('prediction', (event) => {
                const data = JSON.parse(event.data);
                this._handleNewPrediction(data);
            });

            this.state.eventSource.addEventListener('signal_status', (event) => {
                const data = JSON.parse(event.data);
                this._handleSignalStatusUpdate(data);
            });

            this.state.eventSource.onerror = (error) => {
                console.warn('[ContextFusion] SSE error:', error);
                this._handleSSEError();
            };

            return true;
        } catch (error) {
            console.warn('[ContextFusion] SSE init failed:', error);
            return false;
        }
    },

    /**
     * Handle SSE message
     */
    _handleSSEMessage(event) {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'context_update':
                    this._handleContextUpdate(data.payload);
                    break;
                case 'prediction':
                    this._handleNewPrediction(data.payload);
                    break;
                case 'signal_status':
                    this._handleSignalStatusUpdate(data.payload);
                    break;
                case 'heartbeat':
                    // Keep alive
                    break;
                default:
                    console.log('[ContextFusion] Unknown message type:', data.type);
            }
        } catch (e) {
            console.error('[ContextFusion] Error parsing SSE message:', e);
        }
    },

    /**
     * Handle SSE connection error
     */
    _handleSSEError() {
        this.state.connected = false;
        this._updateConnectionIndicator('error');

        if (this.state.eventSource) {
            this.state.eventSource.close();
            this.state.eventSource = null;
        }

        if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.state.reconnectAttempts++;
            const delay = this.config.reconnectDelay * Math.pow(1.5, this.state.reconnectAttempts - 1);

            console.log(`[ContextFusion] Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts})`);

            setTimeout(async () => {
                const success = await this._initSSE();
                if (!success) {
                    this._startPolling();
                }
            }, delay);
        } else {
            console.log('[ContextFusion] Max reconnect attempts reached, using polling');
            this._startPolling();
        }
    },

    // =========================================================================
    // POLLING FALLBACK
    // =========================================================================

    /**
     * Start polling for updates (fallback when SSE unavailable)
     */
    _startPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
        }

        this.state.mode = 'polling';
        this._updateConnectionIndicator('polling');

        this._pollInterval = setInterval(() => {
            this.fetchFusedIntelligence();
        }, this.config.pollInterval);
    },

    /**
     * Stop polling
     */
    _stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    },

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    /**
     * Fetch full fused intelligence from backend
     */
    async fetchFusedIntelligence() {
        try {
            const response = await fetch(`${this.config.baseUrl}/intelligence`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Update cache
            this.cache.context = data.context;
            this.cache.predictions = data.predictions || [];
            this.cache.signalStatus = data.signal_status || {};
            this.cache.overallConfidence = data.overall_confidence || 0;

            this.state.lastUpdate = new Date();
            this.state.connected = true;

            // Update UI
            this._renderSignalStatus();
            this._renderPredictions();

            // Notify handlers
            if (this.handlers.onContextUpdate) {
                this.handlers.onContextUpdate(data.context);
            }

            return data;
        } catch (error) {
            console.error('[ContextFusion] Fetch error:', error);
            this._updateConnectionIndicator('error');
            return null;
        }
    },

    // =========================================================================
    // DATA HANDLERS
    // =========================================================================

    /**
     * Handle context update from backend
     */
    _handleContextUpdate(context) {
        this.cache.context = context;
        this.state.lastUpdate = new Date();

        if (this.handlers.onContextUpdate) {
            this.handlers.onContextUpdate(context);
        }

        // Update relevant UI elements
        this._updateContextDisplay();
    },

    /**
     * Handle new prediction from backend
     */
    _handleNewPrediction(prediction) {
        // Add to predictions if not duplicate
        const exists = this.cache.predictions.find(p => p.id === prediction.id);
        if (!exists) {
            this.cache.predictions.unshift(prediction);
            // Keep only top 10
            this.cache.predictions = this.cache.predictions.slice(0, 10);
        }

        // Notify handler
        if (this.handlers.onPrediction) {
            this.handlers.onPrediction(prediction);
        }

        // Re-render predictions
        this._renderPredictions();

        // Show toast for high-priority predictions
        if (prediction.priority >= 7) {
            this._showPredictionToast(prediction);
        }
    },

    /**
     * Handle signal status update
     */
    _handleSignalStatusUpdate(status) {
        this.cache.signalStatus = status;

        if (this.handlers.onSignalStatusChange) {
            this.handlers.onSignalStatusChange(status);
        }

        this._renderSignalStatus();
    },

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    /**
     * Render signal status indicators
     */
    _renderSignalStatus() {
        const container = document.getElementById('fusion-signal-status');
        if (!container) return;

        const signals = [
            { key: 'time_context', icon: 'T', label: 'Time' },
            { key: 'calendar', icon: 'C', label: 'Calendar' },
            { key: 'weather', icon: 'W', label: 'Weather' },
            { key: 'tasks', icon: 'K', label: 'Tasks' },
            { key: 'email', icon: 'E', label: 'Email' },
            { key: 'user_behavior', icon: 'U', label: 'Behavior' },
            { key: 'seasonal', icon: 'S', label: 'Seasonal' }
        ];

        const html = `
            <div class="fusion-signals-header">
                <span class="fusion-signals-title">Signal Sources</span>
                <span class="fusion-signals-confidence">${Math.round(this.cache.overallConfidence * 100)}% confidence</span>
            </div>
            <div class="fusion-signals-grid">
                ${signals.map(sig => {
                    const status = this.cache.signalStatus[sig.key] || {};
                    const statusClass = this._statusToClass(status.status);
                    const freshness = status.freshness || 0;

                    return `
                        <div class="fusion-signal ${statusClass}" title="${sig.label}: ${status.status || 'unknown'}">
                            <span class="fusion-signal-icon">${sig.icon}</span>
                            <div class="fusion-signal-freshness" style="width: ${freshness * 100}%"></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Render predictions list
     */
    _renderPredictions() {
        const container = document.getElementById('fusion-predictions');
        if (!container) return;

        if (!this.cache.predictions || this.cache.predictions.length === 0) {
            container.innerHTML = `
                <div class="fusion-no-predictions">
                    <span class="fusion-no-predictions-icon">~</span>
                    <span>Gathering intelligence...</span>
                </div>
            `;
            return;
        }

        const html = `
            <div class="fusion-predictions-header">
                <span class="fusion-predictions-title">Predictions</span>
                <span class="fusion-predictions-count">${this.cache.predictions.length}</span>
            </div>
            <div class="fusion-predictions-list">
                ${this.cache.predictions.slice(0, 5).map(pred => this._renderPredictionCard(pred)).join('')}
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for reasoning tooltips
        this._attachReasoningTooltips();
    },

    /**
     * Render a single prediction card
     */
    _renderPredictionCard(prediction) {
        const confidenceClass = this._confidenceToClass(prediction.confidence);
        const actionLevelIcon = this._actionLevelToIcon(prediction.action_level);
        const priorityStars = this._priorityToStars(prediction.priority);

        return `
            <div class="fusion-prediction-card ${confidenceClass}" data-prediction-id="${prediction.id}">
                <div class="fusion-prediction-header">
                    <span class="fusion-prediction-confidence">${prediction.confidence_pct}</span>
                    <span class="fusion-prediction-type">${this._typeToLabel(prediction.type)}</span>
                    <span class="fusion-prediction-priority">${priorityStars}</span>
                </div>
                <div class="fusion-prediction-message">${this._escapeHtml(prediction.message)}</div>
                <div class="fusion-prediction-footer">
                    <button class="fusion-reasoning-btn" data-prediction-id="${prediction.id}" title="How did I know?">
                        Why?
                    </button>
                    <span class="fusion-prediction-action-level">${actionLevelIcon}</span>
                </div>
                <div class="fusion-reasoning-tooltip" id="reasoning-${prediction.id}" style="display: none;">
                    <div class="fusion-reasoning-title">How did I know?</div>
                    <ul class="fusion-reasoning-list">
                        ${(prediction.reasoning || []).map(r => `<li>${this._escapeHtml(r)}</li>`).join('')}
                    </ul>
                    ${prediction.action_suggestions && prediction.action_suggestions.length > 0 ? `
                        <div class="fusion-suggestions-title">Suggested Actions:</div>
                        <ul class="fusion-suggestions-list">
                            ${prediction.action_suggestions.map(s => `<li>${this._escapeHtml(s)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Attach reasoning tooltip event listeners
     */
    _attachReasoningTooltips() {
        document.querySelectorAll('.fusion-reasoning-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const predId = e.target.dataset.predictionId;
                const tooltip = document.getElementById(`reasoning-${predId}`);
                if (tooltip) {
                    const isVisible = tooltip.style.display !== 'none';
                    tooltip.style.display = isVisible ? 'none' : 'block';
                    e.target.textContent = isVisible ? 'Why?' : 'Hide';
                }
            });
        });
    },

    /**
     * Update context display (dashboard metrics)
     */
    _updateContextDisplay() {
        const ctx = this.cache.context;
        if (!ctx) return;

        // Update energy indicator if exists
        const energyEl = document.getElementById('fusion-energy-estimate');
        if (energyEl) {
            const energy = Math.round((ctx.energy_estimate || 0.5) * 100);
            energyEl.textContent = `${energy}%`;
            energyEl.className = `fusion-metric ${energy > 60 ? 'high' : energy > 30 ? 'medium' : 'low'}`;
        }

        // Update focus indicator
        const focusEl = document.getElementById('fusion-focus-likelihood');
        if (focusEl) {
            const focus = Math.round((ctx.focus_likelihood || 0.5) * 100);
            focusEl.textContent = `${focus}%`;
        }

        // Update urgency indicator
        const urgencyEl = document.getElementById('fusion-urgency');
        if (urgencyEl) {
            const urgency = Math.round((ctx.overall_urgency || 0) * 100);
            urgencyEl.textContent = `${urgency}%`;
            urgencyEl.className = `fusion-metric ${urgency > 50 ? 'high' : urgency > 25 ? 'medium' : 'low'}`;
        }

        // Update weather if available
        if (ctx.weather_connected) {
            const weatherEl = document.getElementById('fusion-weather');
            if (weatherEl) {
                weatherEl.innerHTML = `
                    <span class="fusion-weather-temp">${ctx.temperature_f ? Math.round(ctx.temperature_f) + 'F' : '--'}</span>
                    <span class="fusion-weather-condition">${ctx.weather_condition || 'Unknown'}</span>
                    ${ctx.frost_risk ? '<span class="fusion-weather-alert">Frost Risk!</span>' : ''}
                `;
            }
        }
    },

    /**
     * Update connection status indicator
     */
    _updateConnectionIndicator(status) {
        const indicator = document.getElementById('fusion-connection-indicator');
        if (indicator) {
            indicator.className = `fusion-connection fusion-connection-${status}`;

            const labels = {
                'connected': 'Live',
                'polling': 'Polling',
                'disconnected': 'Offline',
                'error': 'Error'
            };

            indicator.textContent = labels[status] || status;
        }
    },

    /**
     * Show toast notification for prediction
     */
    _showPredictionToast(prediction) {
        const toast = document.createElement('div');
        toast.className = 'fusion-toast';
        toast.innerHTML = `
            <div class="fusion-toast-header">
                <span class="fusion-toast-confidence">${prediction.confidence_pct}</span>
                <span class="fusion-toast-type">${this._typeToLabel(prediction.type)}</span>
            </div>
            <div class="fusion-toast-message">${this._escapeHtml(prediction.message)}</div>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    _statusToClass(status) {
        const map = {
            'connected': 'signal-connected',
            'disconnected': 'signal-disconnected',
            'stale': 'signal-stale',
            'error': 'signal-error',
            'not_configured': 'signal-not-configured'
        };
        return map[status] || 'signal-unknown';
    },

    _confidenceToClass(confidence) {
        if (confidence >= 0.85) return 'confidence-high';
        if (confidence >= 0.70) return 'confidence-medium';
        if (confidence >= 0.50) return 'confidence-low';
        return 'confidence-very-low';
    },

    _actionLevelToIcon(level) {
        const map = {
            'auto': 'A',
            'approve': 'O',
            'suggest': 'S',
            'collaborative': 'C',
            'inform': 'I'
        };
        return map[level] || '?';
    },

    _priorityToStars(priority) {
        const stars = Math.min(5, Math.ceil(priority / 2));
        return '*'.repeat(stars);
    },

    _typeToLabel(type) {
        const map = {
            'next_action': 'Next Action',
            'deadline_risk': 'Deadline Risk',
            'weather_impact': 'Weather',
            'meeting_prep': 'Meeting Prep',
            'energy_optimal': 'Energy',
            'follow_up_needed': 'Follow Up',
            'seasonal_task': 'Seasonal'
        };
        return map[type] || type;
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Get current fused context
     */
    getContext() {
        return this.cache.context;
    },

    /**
     * Get current predictions
     */
    getPredictions() {
        return this.cache.predictions;
    },

    /**
     * Get signal status
     */
    getSignalStatus() {
        return this.cache.signalStatus;
    },

    /**
     * Register context update handler
     */
    onContextUpdate(callback) {
        this.handlers.onContextUpdate = callback;
    },

    /**
     * Register prediction handler
     */
    onPrediction(callback) {
        this.handlers.onPrediction = callback;
    },

    /**
     * Register signal status change handler
     */
    onSignalStatusChange(callback) {
        this.handlers.onSignalStatusChange = callback;
    },

    /**
     * Register connection change handler
     */
    onConnectionChange(callback) {
        this.handlers.onConnectionChange = callback;
    },

    /**
     * Force refresh
     */
    async refresh() {
        return await this.fetchFusedIntelligence();
    },

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.state.eventSource) {
            this.state.eventSource.close();
            this.state.eventSource = null;
        }
        this._stopPolling();
        this.state.connected = false;
        this.state.mode = 'disconnected';
    }
};

// ============================================================================
// FUSION UI STYLES
// ============================================================================
const fusionStyles = `
/* Signal Status */
.fusion-signal-status {
    background: var(--bg-card, #1e2130);
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
}

.fusion-signals-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.fusion-signals-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary, #a0a4b8);
}

.fusion-signals-confidence {
    font-size: 12px;
    color: var(--green, #22c55e);
    font-weight: 500;
}

.fusion-signals-grid {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.fusion-signal {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    transition: all 0.2s ease;
}

.fusion-signal-icon {
    position: relative;
    z-index: 1;
}

.fusion-signal-freshness {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: var(--accent, #6366f1);
    transition: width 0.3s ease;
}

.fusion-signal.signal-connected {
    background: rgba(34, 197, 94, 0.15);
    color: var(--green, #22c55e);
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.fusion-signal.signal-disconnected {
    background: rgba(107, 114, 128, 0.15);
    color: var(--text-muted, #6b6f82);
    border: 1px solid rgba(107, 114, 128, 0.3);
}

.fusion-signal.signal-error {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red, #ef4444);
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.fusion-signal.signal-stale {
    background: rgba(234, 179, 8, 0.15);
    color: var(--yellow, #eab308);
    border: 1px solid rgba(234, 179, 8, 0.3);
}

.fusion-signal.signal-not-configured {
    background: rgba(107, 114, 128, 0.1);
    color: var(--text-muted, #6b6f82);
    border: 1px dashed rgba(107, 114, 128, 0.3);
}

/* Predictions */
.fusion-predictions {
    background: var(--bg-card, #1e2130);
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 12px;
    padding: 16px;
}

.fusion-predictions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.fusion-predictions-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary, #a0a4b8);
}

.fusion-predictions-count {
    font-size: 11px;
    background: var(--accent, #6366f1);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
}

.fusion-predictions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.fusion-prediction-card {
    background: var(--bg-secondary, #1a1d27);
    border-radius: 10px;
    padding: 12px;
    border-left: 3px solid var(--accent, #6366f1);
    transition: all 0.2s ease;
}

.fusion-prediction-card:hover {
    background: var(--bg-hover, #252839);
}

.fusion-prediction-card.confidence-high {
    border-left-color: var(--green, #22c55e);
}

.fusion-prediction-card.confidence-medium {
    border-left-color: var(--yellow, #eab308);
}

.fusion-prediction-card.confidence-low {
    border-left-color: var(--orange, #f97316);
}

.fusion-prediction-card.confidence-very-low {
    border-left-color: var(--text-muted, #6b6f82);
}

.fusion-prediction-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.fusion-prediction-confidence {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.2);
    color: var(--accent, #6366f1);
}

.fusion-prediction-type {
    font-size: 11px;
    color: var(--text-muted, #6b6f82);
    flex: 1;
}

.fusion-prediction-priority {
    font-size: 10px;
    color: var(--yellow, #eab308);
    letter-spacing: 1px;
}

.fusion-prediction-message {
    font-size: 13px;
    color: var(--text-primary, #f0f0f5);
    line-height: 1.4;
    margin-bottom: 8px;
}

.fusion-prediction-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fusion-reasoning-btn {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid var(--border, #2a2d3e);
    background: transparent;
    color: var(--text-secondary, #a0a4b8);
    cursor: pointer;
    transition: all 0.15s ease;
}

.fusion-reasoning-btn:hover {
    background: var(--bg-hover, #252839);
    color: var(--text-primary, #f0f0f5);
}

.fusion-prediction-action-level {
    font-size: 10px;
    font-weight: 700;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.15);
    color: var(--accent, #6366f1);
}

/* Reasoning Tooltip */
.fusion-reasoning-tooltip {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border, #2a2d3e);
}

.fusion-reasoning-title,
.fusion-suggestions-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary, #a0a4b8);
    margin-bottom: 6px;
}

.fusion-reasoning-list,
.fusion-suggestions-list {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: var(--text-secondary, #a0a4b8);
}

.fusion-reasoning-list li,
.fusion-suggestions-list li {
    margin-bottom: 4px;
}

.fusion-suggestions-title {
    margin-top: 10px;
}

.fusion-suggestions-list {
    color: var(--green, #22c55e);
}

/* No Predictions */
.fusion-no-predictions {
    text-align: center;
    padding: 24px;
    color: var(--text-muted, #6b6f82);
    font-size: 13px;
}

.fusion-no-predictions-icon {
    font-size: 24px;
    display: block;
    margin-bottom: 8px;
    animation: fusionPulse 2s infinite;
}

@keyframes fusionPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

/* Connection Indicator */
.fusion-connection {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 10px;
}

.fusion-connection::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.fusion-connection-connected {
    background: rgba(34, 197, 94, 0.15);
    color: var(--green, #22c55e);
}
.fusion-connection-connected::before {
    background: var(--green, #22c55e);
    animation: fusionConnectedPulse 2s infinite;
}

.fusion-connection-polling {
    background: rgba(234, 179, 8, 0.15);
    color: var(--yellow, #eab308);
}
.fusion-connection-polling::before {
    background: var(--yellow, #eab308);
}

.fusion-connection-disconnected,
.fusion-connection-error {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red, #ef4444);
}
.fusion-connection-disconnected::before,
.fusion-connection-error::before {
    background: var(--red, #ef4444);
}

@keyframes fusionConnectedPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Toast */
.fusion-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    max-width: 320px;
    background: var(--bg-card, #1e2130);
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 1000;
}

.fusion-toast.visible {
    transform: translateY(0);
    opacity: 1;
}

.fusion-toast-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.fusion-toast-confidence {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(34, 197, 94, 0.2);
    color: var(--green, #22c55e);
}

.fusion-toast-type {
    font-size: 11px;
    color: var(--text-muted, #6b6f82);
}

.fusion-toast-message {
    font-size: 13px;
    color: var(--text-primary, #f0f0f5);
    line-height: 1.4;
}

/* Metric indicators */
.fusion-metric {
    font-weight: 600;
}

.fusion-metric.high {
    color: var(--green, #22c55e);
}

.fusion-metric.medium {
    color: var(--yellow, #eab308);
}

.fusion-metric.low {
    color: var(--red, #ef4444);
}

/* Weather display */
.fusion-weather {
    display: flex;
    align-items: center;
    gap: 8px;
}

.fusion-weather-temp {
    font-weight: 600;
    color: var(--text-primary, #f0f0f5);
}

.fusion-weather-condition {
    font-size: 12px;
    color: var(--text-secondary, #a0a4b8);
}

.fusion-weather-alert {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.2);
    color: var(--red, #ef4444);
    font-weight: 600;
}
`;

// Inject styles
const fusionStyleEl = document.createElement('style');
fusionStyleEl.textContent = fusionStyles;
document.head.appendChild(fusionStyleEl);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextFusion;
}

// Make globally available
window.ContextFusion = ContextFusion;

console.log('[ContextFusion] Module loaded');
