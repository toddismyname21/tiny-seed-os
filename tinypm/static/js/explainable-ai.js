/**
 * TinyPM Explainable AI Module
 * ============================
 * When AI makes suggestions, ALWAYS show reasoning.
 * Builds trust through transparency.
 *
 * Features:
 * - Confidence-calibrated displays
 * - Show alternatives option
 * - Reasoning cards with evidence
 * - Smart loading states
 *
 * Created: 2026-02-03
 * Team: AI UX & Guided Rituals (Team 3)
 */

const ExplainableAI = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        confidenceThresholds: {
            high: 0.85,
            medium: 0.65,
            low: 0.45
        },
        maxReasons: 3,
        animationDuration: 300
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
    },

    // =========================================================================
    // SUGGESTION CARDS
    // =========================================================================
    /**
     * Create an AI suggestion card with explainability
     *
     * @param {Object} options - Suggestion options
     * @param {string} options.title - Main recommendation title
     * @param {string} options.subtitle - Optional subtitle
     * @param {number} options.confidence - Confidence score (0-1)
     * @param {Array} options.reasons - Array of reasoning strings
     * @param {Array} options.evidence - Array of supporting evidence objects
     * @param {Array} options.alternatives - Optional alternative suggestions
     * @param {Function} options.onAccept - Accept callback
     * @param {Function} options.onIgnore - Ignore callback
     * @param {Function} options.onShowAlternatives - Show alternatives callback
     * @returns {HTMLElement} The suggestion card element
     */
    createSuggestionCard(options) {
        const {
            title,
            subtitle,
            confidence = 0.5,
            reasons = [],
            evidence = [],
            alternatives = [],
            onAccept,
            onIgnore,
            onShowAlternatives
        } = options;

        const card = document.createElement('div');
        card.className = 'ai-suggestion-card explainable';

        const confidenceLevel = this.getConfidenceLevel(confidence);
        const confidencePercent = Math.round(confidence * 100);

        card.innerHTML = `
            <div class="suggestion-header">
                <div class="suggestion-avatar">
                    <div class="avatar-ring ${confidenceLevel}">
                        <span class="avatar-icon"></span>
                    </div>
                </div>
                <div class="suggestion-meta">
                    <span class="suggestion-label">AI Recommendation</span>
                    <div class="confidence-indicator ${confidenceLevel}">
                        <span class="confidence-bar" style="width: ${confidencePercent}%"></span>
                        <span class="confidence-text">${confidencePercent}% confident</span>
                    </div>
                </div>
            </div>

            <div class="suggestion-body">
                <h3 class="suggestion-title">${this.escapeHtml(title)}</h3>
                ${subtitle ? `<p class="suggestion-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
            </div>

            <div class="reasoning-section">
                <button class="reasoning-toggle" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="toggle-icon"></span>
                    <span class="toggle-text">Why this recommendation?</span>
                </button>
                <div class="reasoning-content">
                    ${reasons.length > 0 ? `
                        <ul class="reasoning-list">
                            ${reasons.slice(0, this.config.maxReasons).map(reason => `
                                <li class="reason-item">
                                    <span class="reason-bullet"></span>
                                    <span class="reason-text">${this.escapeHtml(reason)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    ${evidence.length > 0 ? `
                        <div class="evidence-section">
                            <span class="evidence-label">Supporting evidence:</span>
                            <div class="evidence-items">
                                ${evidence.map(e => `
                                    <span class="evidence-tag ${e.type || 'data'}">
                                        ${e.icon || ''}
                                        ${this.escapeHtml(e.label)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="suggestion-actions">
                <button class="action-btn accept" onclick="ExplainableAI.handleAccept(this)">
                    Accept
                </button>
                ${alternatives.length > 0 ? `
                    <button class="action-btn alternatives" onclick="ExplainableAI.handleShowAlternatives(this)">
                        Show alternatives
                    </button>
                ` : ''}
                <button class="action-btn ignore" onclick="ExplainableAI.handleIgnore(this)">
                    Ignore
                </button>
            </div>

            ${alternatives.length > 0 ? `
                <div class="alternatives-section" style="display: none;">
                    <div class="alternatives-header">
                        <span>Alternative suggestions</span>
                        <button class="close-alternatives" onclick="ExplainableAI.hideAlternatives(this)">Hide</button>
                    </div>
                    <div class="alternatives-list">
                        ${alternatives.map((alt, idx) => `
                            <div class="alternative-item" data-index="${idx}">
                                <div class="alt-content">
                                    <span class="alt-title">${this.escapeHtml(alt.title)}</span>
                                    ${alt.reason ? `<span class="alt-reason">${this.escapeHtml(alt.reason)}</span>` : ''}
                                </div>
                                <button class="alt-select-btn" onclick="ExplainableAI.selectAlternative(this, ${idx})">
                                    Select
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Store callbacks
        card.dataset.callbacks = JSON.stringify({
            hasAccept: !!onAccept,
            hasIgnore: !!onIgnore,
            hasAlternatives: !!onShowAlternatives
        });

        // Store actual callbacks on the element
        card._callbacks = { onAccept, onIgnore, onShowAlternatives, alternatives };

        return card;
    },

    /**
     * Create an inline AI explanation
     */
    createInlineExplanation(text, reasons, confidence = 0.7) {
        const el = document.createElement('div');
        el.className = 'ai-inline-explanation';

        const confidenceLevel = this.getConfidenceLevel(confidence);

        el.innerHTML = `
            <div class="inline-header">
                <span class="inline-icon"></span>
                <span class="inline-label ${confidenceLevel}">AI Insight</span>
            </div>
            <p class="inline-text">${this.escapeHtml(text)}</p>
            ${reasons && reasons.length > 0 ? `
                <details class="inline-reasons">
                    <summary>Why?</summary>
                    <ul>
                        ${reasons.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
                    </ul>
                </details>
            ` : ''}
        `;

        return el;
    },

    /**
     * Create a confidence badge
     */
    createConfidenceBadge(confidence) {
        const level = this.getConfidenceLevel(confidence);
        const percent = Math.round(confidence * 100);

        const badge = document.createElement('span');
        badge.className = `ai-confidence-badge ${level}`;
        badge.innerHTML = `
            <span class="badge-dot"></span>
            <span class="badge-text">${percent}%</span>
        `;

        return badge;
    },

    // =========================================================================
    // AI LOADING STATES
    // =========================================================================
    /**
     * Create AI thinking indicator
     */
    createThinkingIndicator(stage = 'analyzing') {
        const stages = {
            analyzing: 'Analyzing...',
            thinking: 'Thinking...',
            processing: 'Processing...',
            generating: 'Generating...',
            almost: 'Almost ready...'
        };

        const indicator = document.createElement('div');
        indicator.className = 'ai-thinking-indicator';
        indicator.innerHTML = `
            <div class="thinking-avatar">
                <div class="thinking-ring">
                    <div class="ring-segment"></div>
                    <div class="ring-segment"></div>
                    <div class="ring-segment"></div>
                </div>
                <span class="thinking-icon"></span>
            </div>
            <div class="thinking-content">
                <span class="thinking-text">${stages[stage] || stages.thinking}</span>
                <div class="thinking-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;

        return indicator;
    },

    /**
     * Create streaming text container for AI responses
     */
    createStreamingContainer() {
        const container = document.createElement('div');
        container.className = 'ai-streaming-container';
        container.innerHTML = `
            <div class="streaming-avatar">
                <span class="avatar-icon"></span>
            </div>
            <div class="streaming-content">
                <p class="streaming-text"></p>
                <span class="streaming-cursor"></span>
            </div>
        `;

        return container;
    },

    /**
     * Stream text into a container (simulates typing)
     */
    async streamText(container, text, speed = 30) {
        const textEl = container.querySelector('.streaming-text');
        const cursorEl = container.querySelector('.streaming-cursor');

        if (!textEl) return;

        textEl.textContent = '';
        cursorEl?.classList.add('active');

        for (let i = 0; i < text.length; i++) {
            textEl.textContent += text[i];
            await this.sleep(speed);

            // Scroll into view if needed
            textEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        cursorEl?.classList.remove('active');
    },

    /**
     * Show progress stages
     */
    showProgressStages(container, stages, currentIndex = 0) {
        const stagesHtml = stages.map((stage, idx) => {
            let status = 'pending';
            if (idx < currentIndex) status = 'complete';
            if (idx === currentIndex) status = 'active';

            return `
                <div class="progress-stage ${status}">
                    <span class="stage-indicator">
                        ${status === 'complete' ? '' : idx + 1}
                    </span>
                    <span class="stage-label">${this.escapeHtml(stage)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="ai-progress-stages">
                ${stagesHtml}
            </div>
        `;
    },

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================
    handleAccept(button) {
        const card = button.closest('.ai-suggestion-card');
        if (card?._callbacks?.onAccept) {
            card._callbacks.onAccept();
        }
        this.animateCardAction(card, 'accepted');
    },

    handleIgnore(button) {
        const card = button.closest('.ai-suggestion-card');
        if (card?._callbacks?.onIgnore) {
            card._callbacks.onIgnore();
        }
        this.animateCardAction(card, 'ignored');
    },

    handleShowAlternatives(button) {
        const card = button.closest('.ai-suggestion-card');
        const altSection = card?.querySelector('.alternatives-section');
        if (altSection) {
            altSection.style.display = 'block';
            requestAnimationFrame(() => {
                altSection.classList.add('visible');
            });
        }
    },

    hideAlternatives(button) {
        const altSection = button.closest('.alternatives-section');
        if (altSection) {
            altSection.classList.remove('visible');
            setTimeout(() => {
                altSection.style.display = 'none';
            }, this.config.animationDuration);
        }
    },

    selectAlternative(button, index) {
        const card = button.closest('.ai-suggestion-card');
        if (card?._callbacks?.alternatives?.[index]) {
            const alt = card._callbacks.alternatives[index];
            if (alt.onSelect) {
                alt.onSelect();
            }
        }
        this.animateCardAction(card, 'accepted');
    },

    animateCardAction(card, action) {
        if (!card) return;

        card.classList.add(action);
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), this.config.animationDuration);
        }, 500);
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    getConfidenceLevel(confidence) {
        if (confidence >= this.config.confidenceThresholds.high) return 'high';
        if (confidence >= this.config.confidenceThresholds.medium) return 'medium';
        return 'low';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('explainable-ai-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'explainable-ai-styles';
        styles.textContent = `
            /* AI Suggestion Card */
            .ai-suggestion-card.explainable {
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 16px;
                padding: 20px;
                margin: 16px 0;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }

            .ai-suggestion-card.explainable:hover {
                border-color: rgba(99, 102, 241, 0.4);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                            0 0 20px rgba(99, 102, 241, 0.1);
            }

            .ai-suggestion-card.accepted {
                border-color: rgba(34, 197, 94, 0.5);
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
            }

            .ai-suggestion-card.ignored {
                opacity: 0.6;
            }

            /* Suggestion Header */
            .suggestion-header {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                margin-bottom: 16px;
            }

            .suggestion-avatar {
                flex-shrink: 0;
            }

            .avatar-ring {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                padding: 3px;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .avatar-ring.high {
                background: linear-gradient(135deg, #22c55e, #16a34a);
            }

            .avatar-ring.medium {
                background: linear-gradient(135deg, #6366f1, #a855f7);
            }

            .avatar-ring.low {
                background: linear-gradient(135deg, #6b6f82, #4b5563);
            }

            .avatar-icon {
                width: 38px;
                height: 38px;
                background: #1e2130;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .avatar-icon::after {
                content: '';
                font-size: 18px;
            }

            .suggestion-meta {
                flex: 1;
            }

            .suggestion-label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #6366f1;
                margin-bottom: 6px;
            }

            /* Confidence Indicator */
            .confidence-indicator {
                position: relative;
                height: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                overflow: hidden;
            }

            .confidence-bar {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                background: linear-gradient(90deg, #6366f1, #a855f7);
                border-radius: 10px;
                transition: width 0.5s ease;
            }

            .confidence-indicator.high .confidence-bar {
                background: linear-gradient(90deg, #22c55e, #16a34a);
            }

            .confidence-indicator.low .confidence-bar {
                background: linear-gradient(90deg, #6b6f82, #4b5563);
            }

            .confidence-text {
                position: relative;
                z-index: 1;
                display: block;
                text-align: center;
                font-size: 11px;
                font-weight: 600;
                color: #f0f0f5;
                line-height: 20px;
            }

            /* Suggestion Body */
            .suggestion-body {
                margin-bottom: 16px;
            }

            .suggestion-title {
                font-size: 16px;
                font-weight: 600;
                color: #f0f0f5;
                margin: 0 0 6px;
            }

            .suggestion-subtitle {
                font-size: 13px;
                color: #a0a4b8;
                margin: 0;
            }

            /* Reasoning Section */
            .reasoning-section {
                background: rgba(99, 102, 241, 0.05);
                border-radius: 10px;
                margin-bottom: 16px;
                overflow: hidden;
            }

            .reasoning-toggle {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 14px;
                background: none;
                border: none;
                color: #a0a4b8;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .reasoning-toggle:hover {
                background: rgba(99, 102, 241, 0.1);
                color: #f0f0f5;
            }

            .toggle-icon {
                width: 20px;
                height: 20px;
                border-radius: 6px;
                background: rgba(99, 102, 241, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
            }

            .toggle-icon::after {
                content: '';
                border: solid #6366f1;
                border-width: 0 2px 2px 0;
                padding: 3px;
                transform: rotate(45deg);
                margin-top: -2px;
            }

            .reasoning-section.expanded .toggle-icon {
                transform: rotate(180deg);
            }

            .reasoning-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }

            .reasoning-section.expanded .reasoning-content {
                max-height: 300px;
            }

            .reasoning-list {
                list-style: none;
                padding: 0 14px 14px;
                margin: 0;
            }

            .reason-item {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 8px 0;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .reason-item:first-child {
                border-top: none;
            }

            .reason-bullet {
                width: 6px;
                height: 6px;
                background: #6366f1;
                border-radius: 50%;
                margin-top: 6px;
                flex-shrink: 0;
            }

            .reason-text {
                font-size: 13px;
                color: #a0a4b8;
                line-height: 1.5;
            }

            /* Evidence Section */
            .evidence-section {
                padding: 0 14px 14px;
            }

            .evidence-label {
                display: block;
                font-size: 11px;
                font-weight: 600;
                color: #6b6f82;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                margin-bottom: 8px;
            }

            .evidence-items {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .evidence-tag {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                font-size: 12px;
                color: #a0a4b8;
            }

            .evidence-tag.data { border-left: 2px solid #3b82f6; }
            .evidence-tag.pattern { border-left: 2px solid #6366f1; }
            .evidence-tag.history { border-left: 2px solid #22c55e; }

            /* Suggestion Actions */
            .suggestion-actions {
                display: flex;
                gap: 10px;
            }

            .action-btn {
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                font-family: inherit;
            }

            .action-btn.accept {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .action-btn.accept:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .action-btn.alternatives {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .action-btn.alternatives:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #f0f0f5;
            }

            .action-btn.ignore {
                background: none;
                color: #6b6f82;
                padding: 10px 12px;
            }

            .action-btn.ignore:hover {
                color: #a0a4b8;
            }

            /* Alternatives Section */
            .alternatives-section {
                margin-top: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 16px;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }

            .alternatives-section.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .alternatives-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .alternatives-header span {
                font-size: 12px;
                font-weight: 600;
                color: #6b6f82;
                text-transform: uppercase;
                letter-spacing: 0.03em;
            }

            .close-alternatives {
                background: none;
                border: none;
                color: #6b6f82;
                font-size: 12px;
                cursor: pointer;
            }

            .close-alternatives:hover {
                color: #a0a4b8;
            }

            .alternatives-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .alternative-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                transition: background 0.2s;
            }

            .alternative-item:hover {
                background: rgba(255, 255, 255, 0.06);
            }

            .alt-content {
                flex: 1;
                min-width: 0;
            }

            .alt-title {
                display: block;
                font-size: 13px;
                color: #f0f0f5;
            }

            .alt-reason {
                display: block;
                font-size: 11px;
                color: #6b6f82;
                margin-top: 2px;
            }

            .alt-select-btn {
                padding: 6px 12px;
                background: rgba(99, 102, 241, 0.2);
                border: none;
                border-radius: 6px;
                color: #a0a4b8;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .alt-select-btn:hover {
                background: rgba(99, 102, 241, 0.3);
                color: #f0f0f5;
            }

            /* Inline Explanation */
            .ai-inline-explanation {
                background: rgba(99, 102, 241, 0.08);
                border-left: 3px solid #6366f1;
                border-radius: 0 8px 8px 0;
                padding: 12px 16px;
                margin: 12px 0;
            }

            .inline-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .inline-icon::after {
                content: '';
                font-size: 14px;
            }

            .inline-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #6366f1;
            }

            .inline-label.high { color: #22c55e; }
            .inline-label.low { color: #6b6f82; }

            .inline-text {
                color: #a0a4b8;
                font-size: 13px;
                margin: 0;
                line-height: 1.5;
            }

            .inline-reasons {
                margin-top: 8px;
            }

            .inline-reasons summary {
                font-size: 12px;
                color: #6b6f82;
                cursor: pointer;
            }

            .inline-reasons ul {
                margin: 8px 0 0;
                padding-left: 20px;
            }

            .inline-reasons li {
                font-size: 12px;
                color: #6b6f82;
                margin: 4px 0;
            }

            /* Confidence Badge */
            .ai-confidence-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
            }

            .ai-confidence-badge.high {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .ai-confidence-badge.medium {
                background: rgba(99, 102, 241, 0.15);
                color: #6366f1;
            }

            .ai-confidence-badge.low {
                background: rgba(107, 111, 130, 0.15);
                color: #6b6f82;
            }

            .badge-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
            }

            /* AI Thinking Indicator */
            .ai-thinking-indicator {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 16px;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
            }

            .thinking-avatar {
                position: relative;
                width: 40px;
                height: 40px;
            }

            .thinking-ring {
                position: absolute;
                inset: 0;
                animation: thinking-spin 2s linear infinite;
            }

            @keyframes thinking-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .ring-segment {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 2px solid transparent;
                border-top-color: #6366f1;
                border-radius: 50%;
            }

            .ring-segment:nth-child(2) {
                transform: rotate(120deg);
                border-top-color: #a855f7;
            }

            .ring-segment:nth-child(3) {
                transform: rotate(240deg);
                border-top-color: #22c55e;
            }

            .thinking-icon {
                position: absolute;
                inset: 6px;
                background: #1e2130;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .thinking-icon::after {
                content: '';
                font-size: 16px;
            }

            .thinking-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .thinking-text {
                font-size: 14px;
                color: #a0a4b8;
            }

            .thinking-dots {
                display: flex;
                gap: 4px;
            }

            .thinking-dots .dot {
                width: 6px;
                height: 6px;
                background: #6366f1;
                border-radius: 50%;
                animation: dot-pulse 1.4s ease-in-out infinite;
            }

            .thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
            .thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

            @keyframes dot-pulse {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
            }

            /* Streaming Container */
            .ai-streaming-container {
                display: flex;
                gap: 14px;
                padding: 16px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 12px;
            }

            .streaming-avatar {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .streaming-avatar .avatar-icon::after {
                content: '';
                font-size: 16px;
            }

            .streaming-content {
                flex: 1;
                min-width: 0;
            }

            .streaming-text {
                color: #f0f0f5;
                font-size: 14px;
                line-height: 1.6;
                margin: 0;
            }

            .streaming-cursor {
                display: inline-block;
                width: 2px;
                height: 18px;
                background: #6366f1;
                margin-left: 2px;
                vertical-align: text-bottom;
                opacity: 0;
            }

            .streaming-cursor.active {
                animation: cursor-blink 0.7s ease-in-out infinite;
            }

            @keyframes cursor-blink {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }

            /* Progress Stages */
            .ai-progress-stages {
                display: flex;
                gap: 8px;
                padding: 16px;
            }

            .progress-stage {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .progress-stage.active {
                background: rgba(99, 102, 241, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.3);
            }

            .progress-stage.complete {
                background: rgba(34, 197, 94, 0.1);
            }

            .stage-indicator {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                color: #6b6f82;
            }

            .progress-stage.active .stage-indicator {
                background: #6366f1;
                color: white;
            }

            .progress-stage.complete .stage-indicator {
                background: #22c55e;
                color: white;
            }

            .stage-label {
                font-size: 12px;
                color: #6b6f82;
            }

            .progress-stage.active .stage-label {
                color: #f0f0f5;
            }

            .progress-stage.complete .stage-label {
                color: #22c55e;
            }

            /* Mobile Responsive */
            @media (max-width: 520px) {
                .ai-suggestion-card.explainable {
                    padding: 16px;
                }

                .suggestion-actions {
                    flex-wrap: wrap;
                }

                .action-btn {
                    flex: 1;
                    min-width: 80px;
                }

                .ai-progress-stages {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.ExplainableAI = ExplainableAI;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    ExplainableAI.init();
});
