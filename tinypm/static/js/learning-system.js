/**
 * ============================================================================
 * CONTINUOUS LEARNING SYSTEM - Frontend Feedback & Visualization
 * ============================================================================
 *
 * This module handles:
 * 1. Subtle feedback capture (did user accept/reject/modify suggestion?)
 * 2. Pattern visualization ("I've learned you prefer...")
 * 3. Confidence calibration display
 * 4. "Teach Me" mode for explicit corrections
 *
 * Integration:
 * - Works with learning_engine.py backend
 * - Hooks into suggestion/action UI components
 * - Persists feedback via /api/learning/* endpoints
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

class LearningSystem {
    constructor(options = {}) {
        this.config = {
            apiBase: options.apiBase || '/api/learning',
            storageKey: 'tinypm_learning',
            feedbackTimeout: 60000,  // 1 minute to respond before "ignored"
            showConfidence: options.showConfidence !== false,
            enableTeachMode: options.enableTeachMode !== false,
            ...options
        };

        this.state = {
            pendingPredictions: {},  // prediction_id -> {timestamp, type, element}
            learningStats: null,
            learnedPreferences: [],
            teachModeActive: false
        };

        this.loadState();
        this.startFeedbackTimeoutChecker();

        console.log('[LearningSystem] Initialized');
    }

    // ========================================
    // FEEDBACK CAPTURE
    // ========================================

    /**
     * Record a prediction/suggestion being shown to user.
     * Call this when displaying any AI suggestion.
     *
     * @param {string} predictionType - Type of prediction (task_suggestion, email_draft, etc.)
     * @param {number} confidence - Raw confidence (0-1)
     * @param {object} context - Context when prediction was made
     * @param {HTMLElement} element - Optional element to attach feedback buttons to
     * @returns {string} prediction_id for tracking outcome
     */
    recordPrediction(predictionType, confidence, context = {}, element = null) {
        const predictionId = this.generateId();

        // Store locally for timeout tracking
        this.state.pendingPredictions[predictionId] = {
            timestamp: Date.now(),
            type: predictionType,
            confidence: confidence,
            context: context,
            element: element
        };

        // Send to backend
        this.apiPost('/record-prediction', {
            prediction_id: predictionId,
            prediction_type: predictionType,
            confidence: confidence,
            context: context
        });

        // Attach feedback UI if element provided
        if (element && this.config.showConfidence) {
            this.attachFeedbackUI(predictionId, element, confidence);
        }

        this.saveState();
        return predictionId;
    }

    /**
     * Record the outcome of a prediction.
     * Call this when user interacts with a suggestion.
     *
     * @param {string} predictionId - ID from recordPrediction
     * @param {string} outcome - 'accepted', 'rejected', 'modified', 'ignored', 'executed_undo'
     * @param {string} modification - If modified, what was changed
     */
    recordOutcome(predictionId, outcome, modification = null) {
        const pending = this.state.pendingPredictions[predictionId];
        const responseTime = pending ? Date.now() - pending.timestamp : null;

        // Send to backend
        this.apiPost('/record-outcome', {
            prediction_id: predictionId,
            outcome: outcome,
            user_modification: modification,
            response_time_ms: responseTime
        });

        // Remove from pending
        delete this.state.pendingPredictions[predictionId];
        this.saveState();

        // Show subtle feedback confirmation
        this.showFeedbackConfirmation(outcome);

        // Refresh stats if panel is open
        if (document.getElementById('learning-panel')?.classList.contains('open')) {
            this.refreshStats();
        }
    }

    /**
     * Attach subtle feedback buttons to a suggestion element.
     */
    attachFeedbackUI(predictionId, element, confidence) {
        // Create feedback container
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'ls-feedback-row';
        feedbackDiv.innerHTML = `
            <div class="ls-confidence" title="AI Confidence">
                <span class="ls-confidence-bar" style="width: ${confidence * 100}%"></span>
                <span class="ls-confidence-text">${Math.round(confidence * 100)}%</span>
            </div>
            <div class="ls-feedback-btns">
                <button class="ls-btn ls-btn-accept" onclick="learningSystem.recordOutcome('${predictionId}', 'accepted')" title="Helpful">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="ls-btn ls-btn-reject" onclick="learningSystem.recordOutcome('${predictionId}', 'rejected')" title="Not helpful">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                ${this.config.enableTeachMode ? `
                <button class="ls-btn ls-btn-teach" onclick="learningSystem.openTeachMode('${predictionId}')" title="Teach me">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </button>` : ''}
            </div>
        `;

        element.appendChild(feedbackDiv);
    }

    /**
     * Show subtle confirmation when feedback is recorded.
     */
    showFeedbackConfirmation(outcome) {
        const messages = {
            'accepted': 'Got it, learning...',
            'rejected': 'Noted, will adjust',
            'modified': 'Learning from your edit',
            'ignored': '',
            'executed_undo': 'Understood, won\'t do that again'
        };

        const message = messages[outcome];
        if (!message) return;

        // Use existing toast system if available
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        } else {
            console.log('[LearningSystem]', message);
        }
    }

    // ========================================
    // TEACH ME MODE
    // ========================================

    /**
     * Open teach mode for explicit correction.
     */
    openTeachMode(predictionId) {
        const pending = this.state.pendingPredictions[predictionId];
        if (!pending) return;

        this.state.teachModeActive = true;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'ls-teach-modal';
        modal.className = 'ls-modal';
        modal.innerHTML = `
            <div class="ls-modal-content">
                <div class="ls-modal-header">
                    <h3>Teach TinyPM</h3>
                    <button onclick="learningSystem.closeTeachMode()" class="ls-modal-close">&times;</button>
                </div>
                <div class="ls-modal-body">
                    <p class="ls-teach-prompt">What should I learn from this?</p>
                    <textarea id="ls-teach-input" placeholder="E.g., 'I prefer shorter emails' or 'Don't suggest outdoor tasks when it's raining'" rows="3"></textarea>
                    <div class="ls-teach-options">
                        <label><input type="checkbox" id="ls-teach-always"> Always apply this rule</label>
                        <label><input type="checkbox" id="ls-teach-context"> Only in similar contexts</label>
                    </div>
                </div>
                <div class="ls-modal-footer">
                    <button class="ls-btn ls-btn-ghost" onclick="learningSystem.closeTeachMode()">Cancel</button>
                    <button class="ls-btn ls-btn-primary" onclick="learningSystem.submitTeaching('${predictionId}')">Teach</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('ls-teach-input').focus();
    }

    /**
     * Submit teaching feedback.
     */
    submitTeaching(predictionId) {
        const input = document.getElementById('ls-teach-input');
        const alwaysApply = document.getElementById('ls-teach-always')?.checked;
        const contextOnly = document.getElementById('ls-teach-context')?.checked;

        const modification = input?.value?.trim();
        if (!modification) {
            this.recordOutcome(predictionId, 'rejected');
        } else {
            this.recordOutcome(predictionId, 'modified', modification);

            // Send explicit teaching to backend
            this.apiPost('/teach', {
                prediction_id: predictionId,
                teaching: modification,
                apply_always: alwaysApply,
                context_only: contextOnly
            });
        }

        this.closeTeachMode();
    }

    /**
     * Close teach mode modal.
     */
    closeTeachMode() {
        this.state.teachModeActive = false;
        document.getElementById('ls-teach-modal')?.remove();
    }

    // ========================================
    // PATTERN VISUALIZATION
    // ========================================

    /**
     * Refresh learning stats from backend.
     */
    async refreshStats() {
        try {
            const response = await fetch(`${this.config.apiBase}/stats`);
            if (response.ok) {
                this.state.learningStats = await response.json();
            }

            const prefsResponse = await fetch(`${this.config.apiBase}/preferences`);
            if (prefsResponse.ok) {
                this.state.learnedPreferences = await prefsResponse.json();
            }

            this.renderLearningPanel();
        } catch (err) {
            console.error('[LearningSystem] Failed to refresh stats:', err);
        }
    }

    /**
     * Render the learning panel with stats and preferences.
     */
    renderLearningPanel() {
        const panel = document.getElementById('learning-panel-content');
        if (!panel) return;

        const stats = this.state.learningStats || {};
        const prefs = this.state.learnedPreferences || [];

        let html = `
            <div class="ls-stats-grid">
                <div class="ls-stat">
                    <span class="ls-stat-value">${stats.total_predictions || 0}</span>
                    <span class="ls-stat-label">Predictions</span>
                </div>
                <div class="ls-stat">
                    <span class="ls-stat-value">${Math.round((stats.acceptance_rate || 0) * 100)}%</span>
                    <span class="ls-stat-label">Acceptance Rate</span>
                </div>
                <div class="ls-stat">
                    <span class="ls-stat-value">${stats.total_patterns || 0}</span>
                    <span class="ls-stat-label">Patterns Learned</span>
                </div>
                <div class="ls-stat ${stats.calibration_status === 'well-calibrated' ? 'ls-stat-good' : ''}">
                    <span class="ls-stat-value">${stats.calibration_status || 'learning'}</span>
                    <span class="ls-stat-label">Calibration</span>
                </div>
            </div>
        `;

        if (prefs.length > 0) {
            html += `
                <div class="ls-preferences">
                    <h4>What I've Learned</h4>
                    <ul class="ls-pref-list">
                        ${prefs.map(p => `
                            <li class="ls-pref-item">
                                <span class="ls-pref-icon">${p.weight > 0 ? '+' : '-'}</span>
                                <span class="ls-pref-text">${this.escapeHtml(p.description)}</span>
                                <span class="ls-pref-conf" title="Confidence: ${Math.round(p.confidence * 100)}%">
                                    ${'*'.repeat(Math.ceil(p.confidence * 5))}
                                </span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            html += `
                <div class="ls-empty-prefs">
                    <p>I'm still learning your preferences.</p>
                    <p class="ls-hint">Keep using suggestions and I'll adapt to your style!</p>
                </div>
            `;
        }

        html += `
            <div class="ls-actions">
                <button class="ls-btn ls-btn-ghost" onclick="learningSystem.resetLearning()">
                    Reset Learning
                </button>
                <button class="ls-btn ls-btn-ghost" onclick="learningSystem.exportState()">
                    Export Data
                </button>
            </div>
        `;

        panel.innerHTML = html;
    }

    // ========================================
    // TIMEOUT HANDLING
    // ========================================

    /**
     * Start checking for timed-out predictions.
     */
    startFeedbackTimeoutChecker() {
        setInterval(() => {
            const now = Date.now();
            for (const [predId, pending] of Object.entries(this.state.pendingPredictions)) {
                if (now - pending.timestamp > this.config.feedbackTimeout) {
                    this.recordOutcome(predId, 'ignored');
                }
            }
        }, 30000);  // Check every 30 seconds
    }

    // ========================================
    // STATE MANAGEMENT
    // ========================================

    generateId() {
        return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    }

    saveState() {
        try {
            const toSave = {
                pendingPredictions: Object.fromEntries(
                    Object.entries(this.state.pendingPredictions).map(
                        ([k, v]) => [k, { ...v, element: null }]  // Don't serialize DOM elements
                    )
                )
            };
            localStorage.setItem(this.config.storageKey, JSON.stringify(toSave));
        } catch (e) {
            console.warn('[LearningSystem] Could not save state:', e);
        }
    }

    loadState() {
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state.pendingPredictions = parsed.pendingPredictions || {};
            }
        } catch (e) {
            console.warn('[LearningSystem] Could not load state:', e);
        }
    }

    // ========================================
    // API HELPERS
    // ========================================

    async apiPost(endpoint, data) {
        try {
            const response = await fetch(`${this.config.apiBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) {
            console.error('[LearningSystem] API error:', err);
            return false;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // USER ACTIONS
    // ========================================

    async resetLearning() {
        if (!confirm('This will reset all learned preferences. Are you sure?')) return;

        const success = await this.apiPost('/reset', {});
        if (success) {
            this.state.learningStats = null;
            this.state.learnedPreferences = [];
            this.renderLearningPanel();
            if (typeof showToast === 'function') {
                showToast('Learning reset successfully', 'success');
            }
        }
    }

    async exportState() {
        try {
            const response = await fetch(`${this.config.apiBase}/export`);
            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tinypm-learning-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('[LearningSystem] Export failed:', err);
        }
    }
}

// ============================================================================
// CSS STYLES (injected into page)
// ============================================================================

const learningStyles = `
<style>
/* Learning System Feedback Row */
.ls-feedback-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    margin-top: 8px;
    border-top: 1px solid var(--border, #2a2d3e);
}

/* Confidence indicator */
.ls-confidence {
    position: relative;
    width: 60px;
    height: 6px;
    background: var(--bg-secondary, #1a1d27);
    border-radius: 3px;
    overflow: hidden;
}

.ls-confidence-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--accent, #6366f1), var(--green, #22c55e));
    border-radius: 3px;
    transition: width 0.3s ease;
}

.ls-confidence-text {
    position: absolute;
    right: -32px;
    top: -3px;
    font-size: 10px;
    color: var(--text-muted, #6b6f82);
}

/* Feedback buttons */
.ls-feedback-btns {
    display: flex;
    gap: 6px;
}

.ls-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary, #a0a4b8);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
}

.ls-btn:hover {
    background: var(--bg-hover, #252839);
    color: var(--text-primary, #f0f0f5);
}

.ls-btn-accept:hover {
    border-color: var(--green, #22c55e);
    color: var(--green, #22c55e);
}

.ls-btn-reject:hover {
    border-color: var(--red, #ef4444);
    color: var(--red, #ef4444);
}

.ls-btn-teach:hover {
    border-color: var(--accent, #6366f1);
    color: var(--accent, #6366f1);
}

.ls-btn-primary {
    background: var(--accent, #6366f1);
    color: white;
    border-color: var(--accent, #6366f1);
}

.ls-btn-primary:hover {
    background: var(--accent-hover, #818cf8);
}

.ls-btn-ghost {
    background: transparent;
    border-color: var(--border, #2a2d3e);
}

/* Teach Mode Modal */
.ls-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.ls-modal-content {
    background: var(--bg-card, #1e2130);
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 12px;
    width: 90%;
    max-width: 440px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.ls-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border, #2a2d3e);
}

.ls-modal-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.ls-modal-close {
    background: none;
    border: none;
    color: var(--text-muted, #6b6f82);
    font-size: 24px;
    cursor: pointer;
    line-height: 1;
}

.ls-modal-body {
    padding: 20px;
}

.ls-teach-prompt {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--text-secondary, #a0a4b8);
}

#ls-teach-input {
    width: 100%;
    padding: 12px;
    background: var(--bg-primary, #0f1117);
    border: 1px solid var(--border, #2a2d3e);
    border-radius: 8px;
    color: var(--text-primary, #f0f0f5);
    font-size: 14px;
    resize: none;
}

#ls-teach-input:focus {
    outline: none;
    border-color: var(--accent, #6366f1);
}

.ls-teach-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.ls-teach-options label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary, #a0a4b8);
    cursor: pointer;
}

.ls-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--border, #2a2d3e);
}

/* Stats Panel */
.ls-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.ls-stat {
    background: var(--bg-secondary, #1a1d27);
    padding: 12px;
    border-radius: 8px;
    text-align: center;
}

.ls-stat-value {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #f0f0f5);
}

.ls-stat-label {
    display: block;
    font-size: 11px;
    color: var(--text-muted, #6b6f82);
    margin-top: 4px;
}

.ls-stat-good .ls-stat-value {
    color: var(--green, #22c55e);
}

/* Preferences List */
.ls-preferences h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
}

.ls-pref-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.ls-pref-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: var(--bg-secondary, #1a1d27);
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 13px;
}

.ls-pref-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 700;
    font-size: 14px;
}

.ls-pref-item:has(.ls-pref-icon:contains('+')) .ls-pref-icon {
    background: rgba(34, 197, 94, 0.2);
    color: var(--green, #22c55e);
}

.ls-pref-text {
    flex: 1;
    color: var(--text-primary, #f0f0f5);
}

.ls-pref-conf {
    color: var(--accent, #6366f1);
    font-size: 10px;
    letter-spacing: 1px;
}

.ls-empty-prefs {
    text-align: center;
    padding: 20px;
    color: var(--text-muted, #6b6f82);
}

.ls-empty-prefs p {
    margin: 0 0 8px;
}

.ls-hint {
    font-size: 12px;
    opacity: 0.7;
}

.ls-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border, #2a2d3e);
}
</style>
`;

// Inject styles into page
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', learningStyles);
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

window.LearningSystem = LearningSystem;

// Auto-initialize if not in module context
if (typeof module === 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.learningSystem = new LearningSystem();
    });
}
