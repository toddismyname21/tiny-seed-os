/**
 * TinyPM AI Nudges Module
 * =======================
 * Non-intrusive, proactive nudge system that feels helpful, not annoying.
 *
 * Features:
 * - Confidence-calibrated suggestions
 * - Smart timing (task boundaries, not interruptions)
 * - Auto-dismiss with snooze options
 * - Max 2 nudges stacked at a time
 * - Learning from user feedback
 *
 * Created: 2026-02-03
 * Team: AI UX & Guided Rituals (Team 3)
 */

const AINudges = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        maxVisible: 2,              // Max nudges visible at once
        autoDismissDelay: 5000,     // 5 seconds
        snoozeMinutes: 30,          // Snooze for 30 minutes
        minTimeBetweenNudges: 120,  // 2 minutes between nudges
        animationDuration: 300
    },

    // Nudge type definitions
    nudgeTypes: {
        task_due: {
            icon: '',
            color: '#f59e0b',
            priority: 'high'
        },
        task_overdue: {
            icon: '',
            color: '#ef4444',
            priority: 'urgent'
        },
        weather_alert: {
            icon: '',
            color: '#3b82f6',
            priority: 'medium'
        },
        pattern_suggestion: {
            icon: '',
            color: '#6366f1',
            priority: 'low'
        },
        achievement: {
            icon: '',
            color: '#22c55e',
            priority: 'low'
        },
        break_reminder: {
            icon: '',
            color: '#a855f7',
            priority: 'low'
        },
        ai_insight: {
            icon: '',
            color: '#6366f1',
            priority: 'medium'
        }
    },

    // State
    state: {
        activeNudges: [],
        nudgeHistory: [],
        lastNudgeTime: null,
        dismissedNudges: new Set(),
        snoozedNudges: {}
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this.createNudgeContainer();
        this.loadState();
        this.startProactiveChecks();
    },

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const history = localStorage.getItem('tinypm_nudge_history');
            if (history) {
                this.state.nudgeHistory = JSON.parse(history);
            }

            const dismissed = localStorage.getItem('tinypm_dismissed_nudges');
            if (dismissed) {
                this.state.dismissedNudges = new Set(JSON.parse(dismissed));
            }

            const snoozed = localStorage.getItem('tinypm_snoozed_nudges');
            if (snoozed) {
                this.state.snoozedNudges = JSON.parse(snoozed);
            }
        } catch (e) {
            console.error('[AINudges] Error loading state:', e);
        }
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('tinypm_nudge_history',
                JSON.stringify(this.state.nudgeHistory.slice(-100))); // Keep last 100

            localStorage.setItem('tinypm_dismissed_nudges',
                JSON.stringify([...this.state.dismissedNudges].slice(-50)));

            localStorage.setItem('tinypm_snoozed_nudges',
                JSON.stringify(this.state.snoozedNudges));
        } catch (e) {
            console.error('[AINudges] Error saving state:', e);
        }
    },

    // =========================================================================
    // PROACTIVE CHECKS
    // =========================================================================
    startProactiveChecks() {
        // Check every minute
        setInterval(() => this.runProactiveChecks(), 60000);

        // Also run on user activity (debounced)
        let activityTimeout;
        document.addEventListener('click', () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => this.checkForBoundaryNudge(), 2000);
        });
    },

    /**
     * Run proactive checks for nudge opportunities
     */
    runProactiveChecks() {
        // Don't interrupt if we just showed a nudge
        if (this.state.lastNudgeTime) {
            const timeSince = Date.now() - this.state.lastNudgeTime;
            if (timeSince < this.config.minTimeBetweenNudges * 1000) {
                return;
            }
        }

        // Check for overdue tasks
        this.checkOverdueTasks();

        // Check for tasks due soon
        this.checkTasksDueSoon();

        // Check for achievements
        this.checkAchievements();

        // Check for break reminder
        this.checkBreakReminder();

        // Check for pattern-based suggestions
        this.checkPatternSuggestions();
    },

    /**
     * Check for task boundary (good moment to nudge)
     */
    checkForBoundaryNudge() {
        // This would integrate with activity tracking
        // For now, we use simple time-based checks
    },

    /**
     * Check for overdue tasks
     */
    checkOverdueTasks() {
        const tasks = this.getTasks();
        const today = new Date().toISOString().split('T')[0];

        const overdue = tasks.filter(t =>
            t.due_date &&
            t.due_date < today &&
            t.status !== 'completed' &&
            !this.wasRecentlyDismissed(`overdue_${t.id}`)
        );

        if (overdue.length > 0) {
            const task = overdue[0];
            this.showNudge({
                id: `overdue_${task.id}`,
                type: 'task_overdue',
                title: 'Task overdue',
                message: `"${task.title}" was due ${this.formatRelativeDate(task.due_date)}`,
                reasoning: "You might want to reschedule or complete it",
                actions: [
                    { label: 'Do it', action: () => this.focusOnTask(task.id) },
                    { label: 'Reschedule', action: () => this.rescheduleTask(task.id) }
                ],
                confidence: 0.9
            });
        }
    },

    /**
     * Check for tasks due soon
     */
    checkTasksDueSoon() {
        const tasks = this.getTasks();
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        const dueSoon = tasks.filter(t =>
            t.due_date &&
            t.due_date >= today &&
            t.due_date <= in24Hours &&
            t.status !== 'completed' &&
            t.status !== 'in_progress' &&
            !this.wasRecentlyDismissed(`duesoon_${t.id}`)
        );

        if (dueSoon.length > 0) {
            const task = dueSoon[0];
            this.showNudge({
                id: `duesoon_${task.id}`,
                type: 'task_due',
                title: 'Due tomorrow',
                message: `"${task.title}" is due and you haven't started yet`,
                reasoning: "Starting now gives you time for unexpected issues",
                actions: [
                    { label: 'Start now', action: () => this.startTask(task.id) }
                ],
                confidence: 0.85
            });
        }
    },

    /**
     * Check for achievements
     */
    checkAchievements() {
        const tasks = this.getTasks();
        const today = new Date().toISOString().split('T')[0];

        const completedToday = tasks.filter(t =>
            t.completed_at && t.completed_at.startsWith(today)
        );

        // Achievement: 5 tasks before noon
        const hour = new Date().getHours();
        if (hour < 12 && completedToday.length >= 5) {
            const achievementId = `achievement_5before12_${today}`;
            if (!this.wasRecentlyDismissed(achievementId)) {
                this.showNudge({
                    id: achievementId,
                    type: 'achievement',
                    title: "You're crushing it!",
                    message: `${completedToday.length} tasks done before noon!`,
                    reasoning: "Peak productivity hours at work",
                    actions: [],
                    confidence: 1.0
                });
            }
        }
    },

    /**
     * Check for break reminder
     */
    checkBreakReminder() {
        const lastActivity = localStorage.getItem('tinypm_last_activity_time');
        if (!lastActivity) return;

        const hoursSince = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);

        if (hoursSince >= 2 && !this.wasRecentlyDismissed('break_reminder')) {
            this.showNudge({
                id: 'break_reminder',
                type: 'break_reminder',
                title: 'Taking a break?',
                message: "You've been working for 2+ hours",
                reasoning: "Short breaks improve focus and creativity",
                actions: [
                    { label: 'Take 5 min', action: () => this.startBreakTimer(5) }
                ],
                confidence: 0.7
            });
        }
    },

    /**
     * Check for pattern-based suggestions
     */
    checkPatternSuggestions() {
        // Would integrate with pattern learning
        const profile = this.getProfile();
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const hour = new Date().getHours();

        // Example: Wednesday planning
        if (day === 'Wednesday' && hour >= 9 && hour <= 10) {
            const suggestionId = `pattern_wednesday_${new Date().toISOString().split('T')[0]}`;
            if (!this.wasRecentlyDismissed(suggestionId)) {
                this.showNudge({
                    id: suggestionId,
                    type: 'pattern_suggestion',
                    title: 'You usually plan on Wednesdays',
                    message: 'Should I help you review your week?',
                    reasoning: "Based on your typical patterns",
                    actions: [
                        { label: 'Review week', action: () => this.openWeekReview() }
                    ],
                    confidence: 0.65
                });
            }
        }
    },

    // =========================================================================
    // NUDGE DISPLAY
    // =========================================================================
    /**
     * Show a nudge
     */
    showNudge(options) {
        const {
            id,
            type,
            title,
            message,
            reasoning,
            actions = [],
            confidence = 0.5
        } = options;

        // Check if already showing or recently dismissed
        if (this.state.activeNudges.find(n => n.id === id)) return;
        if (this.wasRecentlyDismissed(id)) return;
        if (this.isSnoozed(id)) return;

        // Check max visible
        while (this.state.activeNudges.length >= this.config.maxVisible) {
            this.dismissNudge(this.state.activeNudges[0].id, false);
        }

        const typeConfig = this.nudgeTypes[type] || this.nudgeTypes.ai_insight;

        const nudgeData = {
            id,
            type,
            title,
            message,
            reasoning,
            actions,
            confidence,
            typeConfig,
            shownAt: Date.now()
        };

        this.state.activeNudges.push(nudgeData);
        this.state.lastNudgeTime = Date.now();

        // Create and show the nudge element
        this.renderNudge(nudgeData);

        // Record in history
        this.state.nudgeHistory.push({
            id,
            type,
            shownAt: new Date().toISOString(),
            outcome: null
        });
        this.saveState();

        // Set auto-dismiss timer
        if (actions.length === 0) {
            setTimeout(() => this.dismissNudge(id, false), this.config.autoDismissDelay);
        }
    },

    /**
     * Render a nudge element
     */
    renderNudge(nudge) {
        const container = document.getElementById('ai-nudge-container');
        if (!container) return;

        const element = document.createElement('div');
        element.className = `ai-nudge ${nudge.type}`;
        element.id = `nudge-${nudge.id}`;
        element.dataset.nudgeId = nudge.id;

        // Confidence indicator
        const confidenceClass = nudge.confidence >= 0.8 ? 'high' :
                               nudge.confidence >= 0.6 ? 'medium' : 'low';

        element.innerHTML = `
            <div class="nudge-accent" style="background: ${nudge.typeConfig.color}"></div>
            <div class="nudge-content">
                <div class="nudge-header">
                    <span class="nudge-icon" style="background: ${nudge.typeConfig.color}20; color: ${nudge.typeConfig.color}">
                        ${nudge.typeConfig.icon}
                    </span>
                    <div class="nudge-titles">
                        <span class="nudge-title">${this.escapeHtml(nudge.title)}</span>
                        <span class="nudge-confidence ${confidenceClass}"></span>
                    </div>
                    <button class="nudge-close" onclick="AINudges.dismissNudge('${nudge.id}', true)">&times;</button>
                </div>
                <p class="nudge-message">${this.escapeHtml(nudge.message)}</p>
                ${nudge.reasoning ? `
                    <p class="nudge-reasoning">
                        <span class="reasoning-icon"></span>
                        ${this.escapeHtml(nudge.reasoning)}
                    </p>
                ` : ''}
                ${nudge.actions.length > 0 ? `
                    <div class="nudge-actions">
                        ${nudge.actions.map((action, idx) => `
                            <button class="nudge-action-btn ${idx === 0 ? 'primary' : 'secondary'}"
                                onclick="AINudges.executeAction('${nudge.id}', ${idx})">
                                ${this.escapeHtml(action.label)}
                            </button>
                        `).join('')}
                        <button class="nudge-snooze-btn" onclick="AINudges.snoozeNudge('${nudge.id}')">
                            Snooze
                        </button>
                    </div>
                ` : `
                    <div class="nudge-timer">
                        <div class="timer-bar" style="animation-duration: ${this.config.autoDismissDelay}ms"></div>
                    </div>
                `}
            </div>
        `;

        container.appendChild(element);

        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('visible');
        });
    },

    /**
     * Execute a nudge action
     */
    executeAction(nudgeId, actionIndex) {
        const nudge = this.state.activeNudges.find(n => n.id === nudgeId);
        if (!nudge || !nudge.actions[actionIndex]) return;

        // Record outcome
        this.recordOutcome(nudgeId, 'accepted');

        // Execute the action
        nudge.actions[actionIndex].action();

        // Dismiss the nudge
        this.dismissNudge(nudgeId, false);
    },

    /**
     * Dismiss a nudge
     */
    dismissNudge(nudgeId, wasManual = true) {
        const element = document.getElementById(`nudge-${nudgeId}`);
        if (element) {
            element.classList.remove('visible');
            element.classList.add('dismissed');
            setTimeout(() => element.remove(), this.config.animationDuration);
        }

        // Remove from active
        this.state.activeNudges = this.state.activeNudges.filter(n => n.id !== nudgeId);

        // Record if manually dismissed
        if (wasManual) {
            this.state.dismissedNudges.add(nudgeId);
            this.recordOutcome(nudgeId, 'dismissed');
            this.saveState();
        }
    },

    /**
     * Snooze a nudge
     */
    snoozeNudge(nudgeId) {
        const snoozedUntil = Date.now() + (this.config.snoozeMinutes * 60 * 1000);
        this.state.snoozedNudges[nudgeId] = snoozedUntil;

        this.recordOutcome(nudgeId, 'snoozed');
        this.dismissNudge(nudgeId, false);
        this.saveState();
    },

    /**
     * Check if nudge is snoozed
     */
    isSnoozed(nudgeId) {
        const snoozedUntil = this.state.snoozedNudges[nudgeId];
        if (!snoozedUntil) return false;

        if (Date.now() >= snoozedUntil) {
            delete this.state.snoozedNudges[nudgeId];
            this.saveState();
            return false;
        }

        return true;
    },

    /**
     * Check if nudge was recently dismissed
     */
    wasRecentlyDismissed(nudgeId) {
        return this.state.dismissedNudges.has(nudgeId);
    },

    /**
     * Record nudge outcome for learning
     */
    recordOutcome(nudgeId, outcome) {
        const historyItem = this.state.nudgeHistory.find(h => h.id === nudgeId && !h.outcome);
        if (historyItem) {
            historyItem.outcome = outcome;
            historyItem.respondedAt = new Date().toISOString();
        }
        this.saveState();

        // Could send to analytics/learning system
        console.log(`[AINudges] Outcome for ${nudgeId}: ${outcome}`);
    },

    // =========================================================================
    // PUBLIC API FOR SHOWING NUDGES
    // =========================================================================
    /**
     * Show AI insight nudge
     */
    showInsight(options) {
        this.showNudge({
            type: 'ai_insight',
            confidence: 0.75,
            ...options
        });
    },

    /**
     * Show achievement nudge
     */
    showAchievement(title, message) {
        this.showNudge({
            id: `achievement_${Date.now()}`,
            type: 'achievement',
            title,
            message,
            reasoning: null,
            actions: [],
            confidence: 1.0
        });
    },

    /**
     * Show task reminder
     */
    showTaskReminder(task, reason) {
        this.showNudge({
            id: `reminder_${task.id}`,
            type: 'task_due',
            title: 'Task reminder',
            message: task.title,
            reasoning: reason,
            actions: [
                { label: 'Do it now', action: () => this.focusOnTask(task.id) }
            ],
            confidence: 0.85
        });
    },

    // =========================================================================
    // ACTION HANDLERS
    // =========================================================================
    focusOnTask(taskId) {
        // Would integrate with task system
        console.log('[AINudges] Focus on task:', taskId);
        window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId } }));
    },

    rescheduleTask(taskId) {
        console.log('[AINudges] Reschedule task:', taskId);
        window.dispatchEvent(new CustomEvent('rescheduleTask', { detail: { taskId } }));
    },

    startTask(taskId) {
        // Update task status to in_progress
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'in_progress';
            task.started_at = new Date().toISOString();
            localStorage.setItem('tinypm_tasks', JSON.stringify(tasks));
        }
        this.focusOnTask(taskId);
    },

    startBreakTimer(minutes) {
        console.log('[AINudges] Starting break timer:', minutes, 'minutes');
        window.dispatchEvent(new CustomEvent('startBreak', { detail: { minutes } }));
    },

    openWeekReview() {
        console.log('[AINudges] Opening week review');
        window.dispatchEvent(new CustomEvent('openWeekReview'));
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    getTasks() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_tasks') || '[]');
        } catch (e) {
            return [];
        }
    },

    getProfile() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
        } catch (e) {
            return {};
        }
    },

    formatRelativeDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    // =========================================================================
    // DOM SETUP
    // =========================================================================
    createNudgeContainer() {
        if (document.getElementById('ai-nudge-container')) return;

        const container = document.createElement('div');
        container.id = 'ai-nudge-container';
        container.className = 'ai-nudge-container';
        document.body.appendChild(container);
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('ai-nudges-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ai-nudges-styles';
        styles.textContent = `
            /* Nudge Container */
            .ai-nudge-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 380px;
                pointer-events: none;
            }

            /* Individual Nudge */
            .ai-nudge {
                position: relative;
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                            0 0 0 1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                pointer-events: auto;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .ai-nudge.visible {
                transform: translateX(0);
                opacity: 1;
            }

            .ai-nudge.dismissed {
                transform: translateX(120%);
                opacity: 0;
            }

            /* Accent Bar */
            .nudge-accent {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
            }

            /* Nudge Content */
            .nudge-content {
                padding: 16px 16px 16px 20px;
            }

            /* Nudge Header */
            .nudge-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 10px;
            }

            .nudge-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }

            .nudge-titles {
                flex: 1;
                min-width: 0;
            }

            .nudge-title {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #f0f0f5;
                line-height: 1.3;
            }

            .nudge-confidence {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                margin-top: 4px;
            }

            .nudge-confidence.high { background: #22c55e; }
            .nudge-confidence.medium { background: #f59e0b; }
            .nudge-confidence.low { background: #6b6f82; }

            .nudge-close {
                background: none;
                border: none;
                color: #6b6f82;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                transition: color 0.2s;
            }

            .nudge-close:hover {
                color: #a0a4b8;
            }

            /* Nudge Message */
            .nudge-message {
                color: #a0a4b8;
                font-size: 13px;
                line-height: 1.5;
                margin: 0 0 8px;
            }

            /* Nudge Reasoning */
            .nudge-reasoning {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #6b6f82;
                font-size: 12px;
                margin: 0 0 12px;
                padding: 8px 10px;
                background: rgba(99, 102, 241, 0.08);
                border-radius: 8px;
            }

            .reasoning-icon::before {
                content: '';
            }

            /* Nudge Actions */
            .nudge-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .nudge-action-btn {
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                font-family: inherit;
            }

            .nudge-action-btn.primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .nudge-action-btn.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .nudge-action-btn.secondary {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .nudge-action-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #f0f0f5;
            }

            .nudge-snooze-btn {
                padding: 8px 12px;
                background: none;
                border: none;
                color: #6b6f82;
                font-size: 12px;
                cursor: pointer;
                transition: color 0.2s;
            }

            .nudge-snooze-btn:hover {
                color: #a0a4b8;
            }

            /* Timer Bar */
            .nudge-timer {
                margin-top: 12px;
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
            }

            .timer-bar {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #a855f7);
                width: 100%;
                animation: timer-countdown linear forwards;
            }

            @keyframes timer-countdown {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* Type-specific styles */
            .ai-nudge.task_overdue .nudge-accent { background: #ef4444; }
            .ai-nudge.task_due .nudge-accent { background: #f59e0b; }
            .ai-nudge.achievement .nudge-accent { background: #22c55e; }
            .ai-nudge.break_reminder .nudge-accent { background: #a855f7; }
            .ai-nudge.pattern_suggestion .nudge-accent { background: #6366f1; }
            .ai-nudge.weather_alert .nudge-accent { background: #3b82f6; }

            /* Mobile Responsive */
            @media (max-width: 480px) {
                .ai-nudge-container {
                    bottom: 16px;
                    right: 16px;
                    left: 16px;
                    max-width: none;
                }

                .ai-nudge {
                    transform: translateY(120%);
                }

                .ai-nudge.visible {
                    transform: translateY(0);
                }

                .ai-nudge.dismissed {
                    transform: translateY(120%);
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.AINudges = AINudges;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        AINudges.init();
    }, 2000);
});
