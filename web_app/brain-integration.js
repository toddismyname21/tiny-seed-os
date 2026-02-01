/**
 * ============================================================================
 * TINYPM BRAIN INTEGRATION MODULE
 * ============================================================================
 * Connects Chief of Staff frontend to TinyPM Brain backend for proactive
 * intelligence, predictions, and anticipatory suggestions.
 *
 * Architecture: Parallel Brain pattern with graceful degradation
 * Communication: SSE for server-push, REST for commands/feedback
 *
 * Created: 2026-02-01
 * Build Team: Frontend Integration (Researcher/Builder/Critic)
 * ============================================================================
 */

const BrainAPI = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    baseUrl: 'http://localhost:8001',  // TinyPM Brain server
    sseUrl: 'http://localhost:8001/api/events',

    // Connection state
    connected: false,
    connectionState: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,

    // SSE connection
    eventSource: null,

    // Session tracking for context
    sessionStart: null,
    recentActions: [],
    maxRecentActions: 20,

    // Callbacks for UI updates
    handlers: {
        onSuggestion: null,
        onNudge: null,
        onPrediction: null,
        onStatusChange: null,
        onError: null
    },

    // Suggestion queue for timing intelligence
    suggestionQueue: [],
    lastSuggestionTime: null,
    minSuggestionInterval: 120000, // 2 minutes between suggestions

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize brain connection with graceful degradation
     * @returns {Promise<boolean>} - Whether brain is available
     */
    async init() {
        console.log('[Brain] Initializing TinyPM Brain connection...');
        this.sessionStart = Date.now();
        this.updateConnectionState('connecting');

        // Check if brain server is available
        const available = await this.healthCheck();

        if (!available) {
            console.warn('[Brain] TinyPM Brain not available - running in basic mode');
            this.updateConnectionState('disconnected');
            this.showBasicModeIndicator();

            // Schedule reconnection attempts
            this.scheduleReconnect();
            return false;
        }

        // Establish SSE connection for server-push
        this.initSSE();

        // Start context sync loop
        this.startContextSync();

        this.connected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionState('connected');

        console.log('[Brain] TinyPM Brain connected successfully');
        return true;
    },

    /**
     * Check if brain server is healthy
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 500); // Fast fail - don't block UI

            const response = await fetch(`${this.baseUrl}/api/health`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                return data.status === 'healthy';
            }
            return false;
        } catch (error) {
            console.warn('[Brain] Health check failed:', error.message);
            return false;
        }
    },

    // =========================================================================
    // SERVER-SENT EVENTS (SSE) - Proactive Suggestions
    // =========================================================================

    /**
     * Initialize SSE connection for receiving proactive suggestions
     */
    initSSE() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        try {
            this.eventSource = new EventSource(this.sseUrl);

            // Generic message handler
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleBrainEvent(data);
                } catch (e) {
                    console.error('[Brain] Failed to parse SSE message:', e);
                }
            };

            // Typed event handlers
            this.eventSource.addEventListener('suggestion', (event) => {
                const suggestion = JSON.parse(event.data);
                this.handleSuggestion(suggestion);
            });

            this.eventSource.addEventListener('nudge', (event) => {
                const nudge = JSON.parse(event.data);
                this.handleNudge(nudge);
            });

            this.eventSource.addEventListener('prediction', (event) => {
                const prediction = JSON.parse(event.data);
                this.handlePredictionUpdate(prediction);
            });

            // Connection management
            this.eventSource.onopen = () => {
                console.log('[Brain] SSE connection established');
                this.updateConnectionState('connected');
            };

            this.eventSource.onerror = (error) => {
                console.warn('[Brain] SSE connection error:', error);
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.updateConnectionState('disconnected');
                    this.scheduleReconnect();
                }
            };

        } catch (error) {
            console.error('[Brain] Failed to initialize SSE:', error);
            this.updateConnectionState('error');
        }
    },

    /**
     * Handle incoming brain events
     */
    handleBrainEvent(data) {
        switch (data.type) {
            case 'suggestion':
                this.handleSuggestion(data.payload || data);
                break;
            case 'nudge':
                this.handleNudge(data.payload || data);
                break;
            case 'prediction':
                this.handlePredictionUpdate(data.payload || data);
                break;
            case 'heartbeat':
                // Connection is alive
                break;
            default:
                console.log('[Brain] Unknown event type:', data.type);
        }
    },

    // =========================================================================
    // SUGGESTION HANDLING
    // =========================================================================

    /**
     * Handle incoming proactive suggestion
     */
    handleSuggestion(suggestion) {
        // Apply timing intelligence - don't overwhelm user
        if (!this.isGoodTimeForSuggestion()) {
            this.suggestionQueue.push(suggestion);
            console.log('[Brain] Suggestion queued for later:', suggestion.id);
            return;
        }

        this.lastSuggestionTime = Date.now();

        // Call registered handler
        if (this.handlers.onSuggestion) {
            this.handlers.onSuggestion(suggestion);
        }

        // Display suggestion in UI
        this.displaySuggestion(suggestion);
    },

    /**
     * Check if this is a good time to show a suggestion (timing intelligence)
     */
    isGoodTimeForSuggestion() {
        // Respect minimum interval
        if (this.lastSuggestionTime) {
            const elapsed = Date.now() - this.lastSuggestionTime;
            if (elapsed < this.minSuggestionInterval) {
                return false;
            }
        }

        // Check if user seems to be in middle of something
        // (e.g., typing in chat input)
        const chatInput = document.getElementById('chat-input');
        if (chatInput && chatInput.value.trim().length > 0) {
            return false;
        }

        return true;
    },

    /**
     * Display suggestion in the UI
     */
    displaySuggestion(suggestion) {
        const container = document.getElementById('brain-suggestions-container');
        if (!container) {
            console.warn('[Brain] Suggestions container not found in DOM');
            return;
        }

        const suggestionId = suggestion.id || `sug-${Date.now()}`;
        const confidenceClass =
            suggestion.confidence > 0.85 ? 'high' :
            suggestion.confidence > 0.70 ? 'medium' : 'low';

        const suggestionEl = document.createElement('div');
        suggestionEl.className = `brain-suggestion confidence-${confidenceClass}`;
        suggestionEl.dataset.suggestionId = suggestionId;
        suggestionEl.innerHTML = this.renderSuggestionHTML(suggestion, suggestionId);

        // Prepend new suggestion
        container.prepend(suggestionEl);

        // Animate in
        requestAnimationFrame(() => {
            suggestionEl.classList.add('visible');
        });

        // Auto-dismiss after 45 seconds if not interacted
        setTimeout(() => {
            if (suggestionEl.parentNode && !suggestionEl.dataset.interacted) {
                this.dismissSuggestion(suggestionId, 'timeout');
            }
        }, 45000);
    },

    /**
     * Render suggestion HTML based on autonomy level
     */
    renderSuggestionHTML(suggestion, suggestionId) {
        const confidencePercent = Math.round((suggestion.confidence || 0.5) * 100);
        const autonomyLevel = suggestion.autonomy_level || 1;

        let actionsHTML = '';

        switch (autonomyLevel) {
            case 5: // Auto-executed
                actionsHTML = `<span class="brain-suggestion-auto">Completed automatically</span>`;
                break;
            case 4: // One-click approval
                actionsHTML = `
                    <button class="brain-btn brain-btn-approve" onclick="BrainAPI.approveSuggestion('${suggestionId}')">
                        Approve
                    </button>
                    <button class="brain-btn brain-btn-dismiss" onclick="BrainAPI.dismissSuggestion('${suggestionId}', 'rejected')">
                        Dismiss
                    </button>
                `;
                break;
            case 3: // Needs clarification
                actionsHTML = `
                    <div class="brain-clarification">
                        <p>${suggestion.clarification_question || 'Would you like to proceed?'}</p>
                        <input type="text" id="clarify-${suggestionId}" placeholder="Your answer..." class="brain-input">
                        <button class="brain-btn brain-btn-approve" onclick="BrainAPI.answerClarification('${suggestionId}')">
                            Submit
                        </button>
                    </div>
                `;
                break;
            default: // Inform only
                actionsHTML = `
                    <button class="brain-btn brain-btn-secondary" onclick="BrainAPI.acknowledgeSuggestion('${suggestionId}')">
                        Got it
                    </button>
                `;
        }

        const reasoningHTML = (suggestion.reasoning || [])
            .map(r => `<li>${this.escapeHtml(r)}</li>`)
            .join('');

        return `
            <div class="brain-suggestion-header">
                <span class="brain-confidence-badge">${confidencePercent}%</span>
                <span class="brain-suggestion-type">${this.escapeHtml(suggestion.type || 'Suggestion')}</span>
                <button class="brain-suggestion-close" onclick="BrainAPI.dismissSuggestion('${suggestionId}', 'dismissed')" title="Dismiss">
                    &times;
                </button>
            </div>
            <div class="brain-suggestion-message">
                ${this.escapeHtml(suggestion.message || 'No message')}
            </div>
            ${reasoningHTML ? `<ul class="brain-suggestion-reasoning">${reasoningHTML}</ul>` : ''}
            <div class="brain-suggestion-actions">
                ${actionsHTML}
            </div>
        `;
    },

    // =========================================================================
    // NUDGE HANDLING
    // =========================================================================

    /**
     * Handle incoming nudge (time-sensitive reminder)
     */
    handleNudge(nudge) {
        if (this.handlers.onNudge) {
            this.handlers.onNudge(nudge);
        }

        this.displayNudge(nudge);
    },

    /**
     * Display nudge in UI
     */
    displayNudge(nudge) {
        const container = document.getElementById('brain-nudges-container');
        if (!container) return;

        const nudgeId = nudge.id || `nudge-${Date.now()}`;
        const nudgeEl = document.createElement('div');
        nudgeEl.className = `brain-nudge priority-${nudge.priority || 'medium'}`;
        nudgeEl.dataset.nudgeId = nudgeId;

        nudgeEl.innerHTML = `
            <div class="brain-nudge-icon">${nudge.icon || '!'}</div>
            <div class="brain-nudge-content">
                <div class="brain-nudge-title">${this.escapeHtml(nudge.title || 'Reminder')}</div>
                <div class="brain-nudge-message">${this.escapeHtml(nudge.message || '')}</div>
            </div>
            <button class="brain-nudge-dismiss" onclick="BrainAPI.dismissNudge('${nudgeId}')">&times;</button>
        `;

        container.prepend(nudgeEl);

        requestAnimationFrame(() => {
            nudgeEl.classList.add('visible');
        });
    },

    // =========================================================================
    // PREDICTION HANDLING
    // =========================================================================

    /**
     * Handle prediction update from brain
     */
    handlePredictionUpdate(predictions) {
        if (this.handlers.onPrediction) {
            this.handlers.onPrediction(predictions);
        }

        // Update predictions display if present
        const container = document.getElementById('brain-predictions-container');
        if (container && Array.isArray(predictions)) {
            this.renderPredictions(container, predictions);
        }
    },

    /**
     * Get predictions for current context
     * @param {Object} context - Current context object
     * @returns {Promise<Array>} - List of predictions
     */
    async getPrediction(context = {}) {
        if (!this.connected) return [];

        try {
            const response = await fetch(`${this.baseUrl}/api/predictions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(context)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.predictions || [];
        } catch (error) {
            console.error('[Brain] Failed to get predictions:', error);
            return [];
        }
    },

    /**
     * Render predictions in container
     */
    renderPredictions(container, predictions) {
        if (!predictions || predictions.length === 0) {
            container.innerHTML = '<div class="brain-no-predictions">No predictions available</div>';
            return;
        }

        container.innerHTML = predictions.slice(0, 3).map(pred => `
            <div class="brain-prediction-card">
                <div class="brain-prediction-action">${this.escapeHtml(pred.action_type || 'Action')}</div>
                <div class="brain-prediction-confidence">${Math.round((pred.confidence || 0) * 100)}%</div>
            </div>
        `).join('');
    },

    // =========================================================================
    // FEEDBACK & ACTIONS
    // =========================================================================

    /**
     * Send feedback on a suggestion
     * @param {string} suggestionId - ID of suggestion
     * @param {string} outcome - 'accepted', 'rejected', 'dismissed', 'timeout'
     */
    async sendFeedback(suggestionId, outcome) {
        if (!this.connected) return;

        try {
            await fetch(`${this.baseUrl}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestion_id: suggestionId,
                    outcome: outcome,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('[Brain] Failed to send feedback:', error);
        }
    },

    /**
     * Approve and execute a suggestion
     */
    async approveSuggestion(suggestionId) {
        const el = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
        if (el) {
            el.dataset.interacted = 'true';
            el.classList.add('approved');
        }

        await this.sendFeedback(suggestionId, 'accepted');

        // Execute the approved action
        try {
            const response = await fetch(`${this.baseUrl}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suggestion_id: suggestionId })
            });

            const result = await response.json();
            if (result.status === 'executed') {
                this.showToast('Action completed', 'success');
            }
        } catch (error) {
            console.error('[Brain] Failed to execute suggestion:', error);
        }

        // Remove after short delay
        setTimeout(() => this.removeSuggestionElement(suggestionId), 1500);
    },

    /**
     * Dismiss a suggestion
     */
    dismissSuggestion(suggestionId, reason = 'dismissed') {
        const el = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
        if (el) {
            el.dataset.interacted = 'true';
            el.classList.add('dismissing');
        }

        this.sendFeedback(suggestionId, reason);

        setTimeout(() => this.removeSuggestionElement(suggestionId), 300);
    },

    /**
     * Acknowledge an informational suggestion
     */
    acknowledgeSuggestion(suggestionId) {
        const el = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
        if (el) {
            el.dataset.interacted = 'true';
        }

        this.sendFeedback(suggestionId, 'acknowledged');

        setTimeout(() => this.removeSuggestionElement(suggestionId), 300);
    },

    /**
     * Answer a clarification question
     */
    async answerClarification(suggestionId) {
        const input = document.getElementById(`clarify-${suggestionId}`);
        if (!input || !input.value.trim()) return;

        const answer = input.value.trim();

        try {
            await fetch(`${this.baseUrl}/api/clarify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestion_id: suggestionId,
                    answer: answer
                })
            });

            this.showToast('Response submitted', 'success');
            this.dismissSuggestion(suggestionId, 'clarified');
        } catch (error) {
            console.error('[Brain] Failed to submit clarification:', error);
        }
    },

    /**
     * Dismiss a nudge
     */
    dismissNudge(nudgeId) {
        const el = document.querySelector(`[data-nudge-id="${nudgeId}"]`);
        if (el) {
            el.classList.add('dismissing');
            setTimeout(() => el.remove(), 300);
        }
    },

    /**
     * Remove suggestion element from DOM
     */
    removeSuggestionElement(suggestionId) {
        const el = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
        if (el) el.remove();
    },

    // =========================================================================
    // PROACTIVE NUDGES
    // =========================================================================

    /**
     * Get pending nudges from brain
     * @returns {Promise<Array>}
     */
    async getNudges() {
        if (!this.connected) return [];

        try {
            const response = await fetch(`${this.baseUrl}/api/nudges/pending`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            return data.nudges || [];
        } catch (error) {
            console.error('[Brain] Failed to get nudges:', error);
            return [];
        }
    },

    // =========================================================================
    // ACTION RECORDING (for pattern learning)
    // =========================================================================

    /**
     * Record a user action for pattern learning
     * @param {string} actionType - Type of action
     * @param {string} category - Action category
     * @param {Object} metadata - Additional metadata
     */
    recordAction(actionType, category, metadata = {}) {
        // Store locally
        this.recentActions.push({
            action: actionType,
            category: category,
            timestamp: new Date().toISOString(),
            ...metadata
        });

        // Keep only recent actions
        if (this.recentActions.length > this.maxRecentActions) {
            this.recentActions.shift();
        }

        // Send to brain if connected
        if (this.connected) {
            this.sendActionToBrain(actionType, category, metadata);
        }
    },

    /**
     * Send action to brain server
     */
    async sendActionToBrain(actionType, category, metadata) {
        try {
            await fetch(`${this.baseUrl}/api/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'action_recorded',
                    action: actionType,
                    category: category,
                    metadata: metadata,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('[Brain] Failed to record action:', error);
        }
    },

    // =========================================================================
    // CONTEXT SYNC
    // =========================================================================

    /**
     * Start periodic context synchronization with brain
     */
    startContextSync() {
        // Sync every 30 seconds
        setInterval(() => this.syncContext(), 30000);

        // Initial sync after short delay
        setTimeout(() => this.syncContext(), 2000);
    },

    /**
     * Gather and sync current context with brain
     */
    async syncContext() {
        if (!this.connected) return;

        const context = this.gatherContext();

        try {
            await fetch(`${this.baseUrl}/api/context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'context_update',
                    context: context,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('[Brain] Context sync failed:', error);
        }
    },

    /**
     * Gather current context from frontend state
     * @returns {Object}
     */
    gatherContext() {
        // Get active tab
        const activeTab = document.querySelector('.tab.active');

        // Get visible tasks/items count
        const visibleCards = document.querySelectorAll('.message-card:not(.hidden), .action-card:not(.hidden)');

        return {
            // Session info
            session_start: this.sessionStart,
            session_duration_minutes: Math.round((Date.now() - this.sessionStart) / 60000),

            // UI state
            active_tab: activeTab?.dataset?.tab || 'unknown',
            visible_items: visibleCards?.length || 0,

            // Recent actions
            recent_actions: this.recentActions.slice(-10),

            // Time context
            hour: new Date().getHours(),
            day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),

            // Browser context
            is_visible: !document.hidden,
            viewport_width: window.innerWidth
        };
    },

    // =========================================================================
    // CONNECTION MANAGEMENT
    // =========================================================================

    /**
     * Update connection state and notify handlers
     */
    updateConnectionState(state) {
        this.connectionState = state;
        this.connected = state === 'connected';

        if (this.handlers.onStatusChange) {
            this.handlers.onStatusChange(state);
        }

        this.updateBrainStatusIndicator(state);
    },

    /**
     * Update brain status indicator in UI
     */
    updateBrainStatusIndicator(state) {
        const indicator = document.getElementById('brain-status-indicator');
        if (!indicator) return;

        indicator.className = `brain-status brain-status-${state}`;

        const labels = {
            'connected': 'Brain Active',
            'connecting': 'Connecting...',
            'disconnected': 'Brain Offline',
            'error': 'Brain Error'
        };

        indicator.title = labels[state] || 'Unknown';
        indicator.querySelector('.brain-status-text')?.textContent = labels[state] || '';
    },

    /**
     * Show indicator that we're running in basic mode (no brain)
     */
    showBasicModeIndicator() {
        const indicator = document.getElementById('brain-status-indicator');
        if (indicator) {
            indicator.classList.add('basic-mode');
            indicator.title = 'Running in basic mode - AI suggestions unavailable';
        }
    },

    /**
     * Schedule a reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[Brain] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

        console.log(`[Brain] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

        setTimeout(async () => {
            const success = await this.init();
            if (!success && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        }, delay);
    },

    /**
     * Disconnect from brain server
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.connected = false;
        this.updateConnectionState('disconnected');
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use existing toast if available
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }

        // Fallback implementation
        const toast = document.createElement('div');
        toast.className = `brain-toast brain-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =========================================================================
    // EVENT HANDLER REGISTRATION
    // =========================================================================

    /**
     * Register callback for suggestions
     */
    onSuggestion(callback) {
        this.handlers.onSuggestion = callback;
    },

    /**
     * Register callback for nudges
     */
    onNudge(callback) {
        this.handlers.onNudge = callback;
    },

    /**
     * Register callback for predictions
     */
    onPrediction(callback) {
        this.handlers.onPrediction = callback;
    },

    /**
     * Register callback for status changes
     */
    onStatusChange(callback) {
        this.handlers.onStatusChange = callback;
    }
};

// ============================================================================
// BRAIN UI STYLES (injected into document)
// ============================================================================
const brainStyles = `
/* Brain Status Indicator */
.brain-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.3s ease;
}

.brain-status::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: background 0.3s ease;
}

.brain-status-connected {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
}
.brain-status-connected::before {
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
    animation: brainPulse 2s infinite;
}

.brain-status-connecting {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
}
.brain-status-connecting::before {
    background: #fbbf24;
    animation: brainBlink 1s infinite;
}

.brain-status-disconnected, .brain-status-error {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
}
.brain-status-disconnected::before, .brain-status-error::before {
    background: #6b7280;
}

.brain-status.basic-mode {
    background: rgba(107, 114, 128, 0.15);
    color: #9ca3af;
}

@keyframes brainPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes brainBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* Brain Thinking Indicator */
.brain-thinking {
    display: none;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(90deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%);
    border-radius: 10px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #a78bfa;
}

.brain-thinking.active {
    display: flex;
}

.brain-thinking-dots {
    display: flex;
    gap: 4px;
}

.brain-thinking-dots span {
    width: 6px;
    height: 6px;
    background: #a78bfa;
    border-radius: 50%;
    animation: brainThink 1.4s infinite;
}

.brain-thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.brain-thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes brainThink {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50% { transform: translateY(-4px); opacity: 1; }
}

/* Suggestions Container */
#brain-suggestions-container {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 360px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
}

@media (max-width: 600px) {
    #brain-suggestions-container {
        left: 12px;
        right: 12px;
        width: auto;
        bottom: 80px;
    }
}

/* Suggestion Card */
.brain-suggestion {
    background: #1f2a48;
    border: 1px solid #2a3f5f;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
}

.brain-suggestion.visible {
    transform: translateX(0);
    opacity: 1;
}

.brain-suggestion.dismissing {
    transform: translateX(100%);
    opacity: 0;
}

.brain-suggestion.approved {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
}

.brain-suggestion.confidence-high {
    border-left: 4px solid #4ade80;
}
.brain-suggestion.confidence-medium {
    border-left: 4px solid #fbbf24;
}
.brain-suggestion.confidence-low {
    border-left: 4px solid #6b7280;
}

.brain-suggestion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.brain-confidence-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 10px;
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
}

.brain-suggestion-type {
    font-size: 12px;
    color: #8899a8;
    flex: 1;
}

.brain-suggestion-close {
    background: none;
    border: none;
    color: #667788;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}
.brain-suggestion-close:hover {
    color: #f5f5f5;
}

.brain-suggestion-message {
    font-size: 14px;
    line-height: 1.5;
    color: #f5f5f5;
    margin-bottom: 10px;
}

.brain-suggestion-reasoning {
    margin: 0 0 12px 16px;
    padding: 0;
    font-size: 12px;
    color: #8899a8;
}

.brain-suggestion-reasoning li {
    margin-bottom: 4px;
}

.brain-suggestion-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.brain-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
}

.brain-btn-approve {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: #0a1628;
}
.brain-btn-approve:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.brain-btn-dismiss {
    background: #243354;
    color: #b8c5d6;
}
.brain-btn-dismiss:hover {
    background: #2a3f5f;
}

.brain-btn-secondary {
    background: #1f2a48;
    border: 1px solid #2a3f5f;
    color: #b8c5d6;
}
.brain-btn-secondary:hover {
    background: #243354;
}

.brain-suggestion-auto {
    font-size: 12px;
    color: #4ade80;
    display: flex;
    align-items: center;
    gap: 6px;
}
.brain-suggestion-auto::before {
    content: '\\2713';
}

.brain-clarification {
    width: 100%;
}

.brain-input {
    width: 100%;
    padding: 10px 12px;
    background: #0f1629;
    border: 1px solid #2a3f5f;
    border-radius: 8px;
    color: #f5f5f5;
    font-size: 14px;
    margin: 8px 0;
}
.brain-input:focus {
    outline: none;
    border-color: #4ade80;
}

/* Nudges Container */
#brain-nudges-container {
    position: fixed;
    top: 80px;
    right: 24px;
    width: 320px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
}

.brain-nudge {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    background: #1f2a48;
    border: 1px solid #2a3f5f;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
}

.brain-nudge.visible {
    transform: translateX(0);
    opacity: 1;
}

.brain-nudge.dismissing {
    transform: translateX(100%);
    opacity: 0;
}

.brain-nudge.priority-high {
    border-left: 3px solid #fb923c;
}
.brain-nudge.priority-critical {
    border-left: 3px solid #f87171;
}

.brain-nudge-icon {
    font-size: 20px;
}

.brain-nudge-content {
    flex: 1;
}

.brain-nudge-title {
    font-size: 13px;
    font-weight: 600;
    color: #f5f5f5;
    margin-bottom: 4px;
}

.brain-nudge-message {
    font-size: 12px;
    color: #8899a8;
}

.brain-nudge-dismiss {
    background: none;
    border: none;
    color: #667788;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
}
.brain-nudge-dismiss:hover {
    color: #f5f5f5;
}

/* Predictions Display */
.brain-predictions-section {
    background: #1f2a48;
    border: 1px solid #2a3f5f;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
}

.brain-predictions-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #a78bfa;
}

.brain-prediction-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #0f1629;
    border-radius: 8px;
    margin-bottom: 8px;
}
.brain-prediction-card:last-child {
    margin-bottom: 0;
}

.brain-prediction-action {
    font-size: 13px;
    color: #b8c5d6;
}

.brain-prediction-confidence {
    font-size: 12px;
    font-weight: 600;
    color: #4ade80;
}

.brain-no-predictions {
    font-size: 13px;
    color: #667788;
    text-align: center;
    padding: 20px;
}

/* Toast */
.brain-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    z-index: 2000;
    opacity: 0;
    transition: all 0.3s ease;
}

.brain-toast.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

.brain-toast-success {
    background: #4ade80;
    color: #0a1628;
}

.brain-toast-error {
    background: #f87171;
    color: #0a1628;
}

.brain-toast-info {
    background: #60a5fa;
    color: #0a1628;
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = brainStyles;
document.head.appendChild(styleEl);

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize brain when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BrainAPI.init();
    });
} else {
    // DOM already loaded
    BrainAPI.init();
}

// Make globally available
window.BrainAPI = BrainAPI;

console.log('[Brain] Brain Integration Module loaded');
