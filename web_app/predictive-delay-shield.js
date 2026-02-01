/**
 * PREDICTIVE DELAY SHIELD
 * ========================
 * AI-powered focus protection for deep work time
 *
 * This is the flagship differentiator - protects cognitive flow by:
 * 1. Detecting when user enters deep work (typing patterns, focus signals)
 * 2. Proactively suggesting notification blocking
 * 3. Queueing non-urgent interruptions
 * 4. Learning optimal protection durations
 *
 * Version: 1.0.0
 * Date: 2026-02-01
 */

class PredictiveDelayShield {
    constructor(options = {}) {
        // Configuration
        this.config = {
            // Detection thresholds
            typingSpeedThreshold: 150,        // chars per minute for "deep work"
            focusTimeThreshold: 180000,       // 3 minutes of activity = focus detected
            idleTimeThreshold: 30000,         // 30s idle = break detected

            // Shield defaults
            defaultShieldDuration: 45,        // minutes
            minShieldDuration: 15,            // minutes
            maxShieldDuration: 180,           // 3 hours max

            // Learning
            enableLearning: true,
            storageKey: 'predictiveDelayShield',

            // Notification categories
            criticalCategories: ['emergency', 'urgent', 'system_critical'],

            // UI
            container: document.body,
            position: 'top-right',

            ...options
        };

        // State
        this.state = {
            isActive: false,
            isPredicting: false,
            shieldStartTime: null,
            shieldEndTime: null,
            shieldDuration: this.config.defaultShieldDuration,

            // Focus detection
            lastActivityTime: Date.now(),
            typingBuffer: [],
            focusScore: 0,
            focusStartTime: null,

            // Queued notifications
            queuedNotifications: [],
            deflectedCount: 0,

            // Learning data
            sessions: [],
            acceptedSuggestions: 0,
            dismissedSuggestions: 0
        };

        // Bind methods
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.tick = this.tick.bind(this);

        // Initialize
        this.loadState();
        this.createUI();
        this.attachEventListeners();
        this.startMonitoring();

        console.log('[PredictiveDelayShield] Initialized');
    }

    // ========================================
    // PHASE 1: ANALYSIS - Focus Detection
    // ========================================

    /**
     * Monitor typing patterns to detect deep work
     */
    handleKeyPress(event) {
        const now = Date.now();
        this.state.lastActivityTime = now;

        // Track typing for speed calculation
        this.state.typingBuffer.push({
            time: now,
            key: event.key
        });

        // Keep only last 60 seconds of typing data
        const cutoff = now - 60000;
        this.state.typingBuffer = this.state.typingBuffer.filter(k => k.time > cutoff);

        // Calculate typing speed (chars per minute)
        const typingSpeed = this.calculateTypingSpeed();

        // Update focus score based on typing
        this.updateFocusScore(typingSpeed);

        // Check if we should suggest shield
        if (!this.state.isActive && !this.state.isPredicting) {
            this.checkFocusTrigger();
        }
    }

    /**
     * Calculate typing speed in characters per minute
     */
    calculateTypingSpeed() {
        if (this.state.typingBuffer.length < 10) return 0;

        const times = this.state.typingBuffer.map(k => k.time);
        const duration = (Math.max(...times) - Math.min(...times)) / 1000 / 60; // minutes

        if (duration < 0.1) return 0; // Less than 6 seconds of data

        return Math.round(this.state.typingBuffer.length / duration);
    }

    /**
     * Update focus score based on activity patterns
     */
    updateFocusScore(typingSpeed) {
        const now = Date.now();

        // Increase focus score for sustained typing
        if (typingSpeed > this.config.typingSpeedThreshold) {
            this.state.focusScore = Math.min(100, this.state.focusScore + 2);

            // Mark focus start time if not set
            if (!this.state.focusStartTime && this.state.focusScore > 30) {
                this.state.focusStartTime = now;
            }
        } else if (typingSpeed > 50) {
            this.state.focusScore = Math.min(100, this.state.focusScore + 0.5);
        }

        // Update UI indicator
        this.updateFocusIndicator();
    }

    /**
     * Monitor mouse activity (less weight than typing)
     */
    handleMouseMove(event) {
        this.state.lastActivityTime = Date.now();
    }

    /**
     * Handle tab visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // User switched away - pause focus detection
            this.state.focusScore = Math.max(0, this.state.focusScore - 20);
        } else {
            this.state.lastActivityTime = Date.now();
        }
    }

    /**
     * Check if focus patterns warrant shield suggestion
     */
    checkFocusTrigger() {
        const now = Date.now();

        // Check conditions for suggesting shield
        const hasHighFocus = this.state.focusScore >= 60;
        const hasSustainedFocus = this.state.focusStartTime &&
            (now - this.state.focusStartTime) >= this.config.focusTimeThreshold;
        const hasCalendarFocusTime = this.checkCalendarFocusTime();
        const hasComplexTask = this.detectComplexTaskEngagement();

        // Calculate confidence
        let confidence = 0;
        if (hasHighFocus) confidence += 30;
        if (hasSustainedFocus) confidence += 30;
        if (hasCalendarFocusTime) confidence += 25;
        if (hasComplexTask) confidence += 15;

        // Trigger prediction if confidence is high enough
        if (confidence >= 60 && !this.state.isPredicting) {
            this.showPrediction(confidence);
        }
    }

    /**
     * Check if calendar has scheduled focus time
     */
    checkCalendarFocusTime() {
        // Integration point for calendar API
        // Returns true if current time falls within a "focus block"
        const focusBlocks = this.getFocusBlocksFromStorage();
        const now = new Date();

        return focusBlocks.some(block => {
            const start = new Date(block.start);
            const end = new Date(block.end);
            return now >= start && now <= end;
        });
    }

    /**
     * Detect engagement with complex tasks
     */
    detectComplexTaskEngagement() {
        // Check if user is working on a task marked as "Intense" or "Hard"
        const activeTask = this.getActiveTaskFromContext();
        return activeTask && ['intense', 'hard', 'complex'].includes(activeTask.difficulty?.toLowerCase());
    }

    /**
     * Periodic tick for focus decay and shield countdown
     */
    tick() {
        const now = Date.now();

        // Decay focus score if idle
        if (now - this.state.lastActivityTime > this.config.idleTimeThreshold) {
            this.state.focusScore = Math.max(0, this.state.focusScore - 5);

            // Reset focus start if score drops
            if (this.state.focusScore < 20) {
                this.state.focusStartTime = null;
            }
        }

        // Update shield countdown if active
        if (this.state.isActive) {
            const remaining = this.getRemainingTime();
            this.updateShieldTimer(remaining);

            // Auto-deactivate when time expires
            if (remaining <= 0) {
                this.deactivateShield('time_expired');
            }
        }

        // Update UI
        this.updateFocusIndicator();
    }

    // ========================================
    // PHASE 2: RECOMMENDATION
    // ========================================

    /**
     * Show the shield prediction/recommendation
     */
    showPrediction(confidence) {
        this.state.isPredicting = true;

        // Calculate optimal duration based on learned patterns
        const optimalDuration = this.calculateOptimalDuration();

        // Create prediction UI
        const predictionEl = this.elements.prediction;

        // Set content
        predictionEl.innerHTML = `
            <div class="pds-prediction-header">
                <span class="pds-prediction-icon">&#x1F6E1;</span>
                <span class="pds-prediction-title">Focus Shield Suggestion</span>
                <button class="pds-prediction-close" onclick="predictiveDelayShield.dismissPrediction()">&times;</button>
            </div>
            <div class="pds-prediction-body">
                <p class="pds-prediction-text">
                    Deep work detected - would you like to block notifications for
                    <strong>${optimalDuration} minutes</strong>?
                </p>
                <div class="pds-prediction-confidence">
                    <span class="pds-confidence-label">Confidence</span>
                    <div class="pds-confidence-bar">
                        <div class="pds-confidence-fill" style="width: ${confidence}%"></div>
                    </div>
                    <span class="pds-confidence-value">${confidence}%</span>
                </div>
            </div>
            <div class="pds-prediction-actions">
                <button class="pds-btn pds-btn-primary" onclick="predictiveDelayShield.acceptPrediction(${optimalDuration})">
                    &#x2713; Activate Shield
                </button>
                <button class="pds-btn pds-btn-secondary" onclick="predictiveDelayShield.showDurationPicker()">
                    &#x23F1; Adjust Time
                </button>
                <button class="pds-btn pds-btn-ghost" onclick="predictiveDelayShield.dismissPrediction()">
                    Not Now
                </button>
            </div>
        `;

        // Show with animation
        predictionEl.classList.add('pds-visible');

        // Auto-dismiss after 30 seconds if no action
        this.predictionTimeout = setTimeout(() => {
            this.dismissPrediction('timeout');
        }, 30000);
    }

    /**
     * Calculate optimal shield duration from learning
     */
    calculateOptimalDuration() {
        const sessions = this.state.sessions;

        if (sessions.length < 3) {
            return this.config.defaultShieldDuration;
        }

        // Find average duration of successful sessions (not ended early)
        const successfulSessions = sessions.filter(s =>
            s.outcome === 'completed' || s.outcome === 'extended'
        );

        if (successfulSessions.length === 0) {
            return this.config.defaultShieldDuration;
        }

        const avgDuration = successfulSessions.reduce((sum, s) =>
            sum + s.duration, 0) / successfulSessions.length;

        // Round to nearest 5 minutes
        return Math.round(avgDuration / 5) * 5;
    }

    /**
     * Accept the prediction and activate shield
     */
    acceptPrediction(duration) {
        clearTimeout(this.predictionTimeout);
        this.state.acceptedSuggestions++;
        this.hidePrediction();
        this.activateShield(duration);
        this.saveState();
    }

    /**
     * Show duration picker for custom time
     */
    showDurationPicker() {
        const predictionEl = this.elements.prediction;

        predictionEl.innerHTML = `
            <div class="pds-prediction-header">
                <span class="pds-prediction-icon">&#x23F1;</span>
                <span class="pds-prediction-title">Choose Shield Duration</span>
                <button class="pds-prediction-close" onclick="predictiveDelayShield.dismissPrediction()">&times;</button>
            </div>
            <div class="pds-duration-picker">
                <div class="pds-duration-presets">
                    <button class="pds-duration-preset" onclick="predictiveDelayShield.acceptPrediction(15)">15 min</button>
                    <button class="pds-duration-preset" onclick="predictiveDelayShield.acceptPrediction(30)">30 min</button>
                    <button class="pds-duration-preset pds-selected" onclick="predictiveDelayShield.acceptPrediction(45)">45 min</button>
                    <button class="pds-duration-preset" onclick="predictiveDelayShield.acceptPrediction(60)">1 hour</button>
                    <button class="pds-duration-preset" onclick="predictiveDelayShield.acceptPrediction(90)">90 min</button>
                    <button class="pds-duration-preset" onclick="predictiveDelayShield.acceptPrediction(120)">2 hours</button>
                </div>
                <div class="pds-duration-custom">
                    <label>Custom duration:</label>
                    <input type="number" id="pds-custom-duration" min="15" max="180" value="45" step="5">
                    <span>minutes</span>
                    <button class="pds-btn pds-btn-primary" onclick="predictiveDelayShield.acceptPrediction(parseInt(document.getElementById('pds-custom-duration').value))">
                        Activate
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Dismiss the prediction
     */
    dismissPrediction(reason = 'user_dismissed') {
        clearTimeout(this.predictionTimeout);
        this.state.isPredicting = false;

        if (reason === 'user_dismissed') {
            this.state.dismissedSuggestions++;
        }

        this.hidePrediction();

        // Don't suggest again for 10 minutes
        this.state.focusScore = 0;
        this.state.focusStartTime = null;

        this.saveState();
    }

    /**
     * Hide prediction UI
     */
    hidePrediction() {
        this.elements.prediction.classList.remove('pds-visible');
        this.state.isPredicting = false;
    }

    // ========================================
    // PHASE 3: ACTIVE PROTECTION
    // ========================================

    /**
     * Activate the focus shield
     */
    activateShield(durationMinutes) {
        const now = Date.now();

        this.state.isActive = true;
        this.state.shieldStartTime = now;
        this.state.shieldDuration = durationMinutes;
        this.state.shieldEndTime = now + (durationMinutes * 60 * 1000);
        this.state.queuedNotifications = [];
        this.state.deflectedCount = 0;

        // Show active shield UI
        this.showActiveShield();

        // Add shield border to page
        document.body.classList.add('pds-shield-active');

        // Start intercepting notifications
        this.startNotificationInterception();

        // Log session start
        this.logSessionStart();

        console.log(`[PredictiveDelayShield] Shield activated for ${durationMinutes} minutes`);
    }

    /**
     * Show the active shield UI
     */
    showActiveShield() {
        const shieldEl = this.elements.activeShield;

        shieldEl.innerHTML = `
            <div class="pds-shield-header">
                <div class="pds-shield-status">
                    <span class="pds-shield-icon pds-pulse">&#x1F6E1;</span>
                    <span class="pds-shield-label">Focus Shield Active</span>
                </div>
                <button class="pds-shield-end" onclick="predictiveDelayShield.endShieldEarly()">End Early</button>
            </div>
            <div class="pds-shield-timer">
                <span class="pds-timer-value" id="pds-timer">--:--</span>
                <span class="pds-timer-label">remaining</span>
            </div>
            <div class="pds-shield-progress">
                <div class="pds-progress-bar" id="pds-progress"></div>
            </div>
            <div class="pds-shield-queue" id="pds-queue">
                <div class="pds-queue-empty">
                    <span>&#x2728;</span> No notifications deflected yet
                </div>
            </div>
        `;

        shieldEl.classList.add('pds-visible');

        // Initial timer update
        this.updateShieldTimer(this.getRemainingTime());
    }

    /**
     * Update the shield timer display
     */
    updateShieldTimer(remainingMs) {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        const timerEl = document.getElementById('pds-timer');
        if (timerEl) {
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update progress bar
        const progressEl = document.getElementById('pds-progress');
        if (progressEl) {
            const totalDuration = this.state.shieldDuration * 60 * 1000;
            const elapsed = totalDuration - remainingMs;
            const percent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
            progressEl.style.width = `${percent}%`;
        }
    }

    /**
     * Get remaining shield time
     */
    getRemainingTime() {
        if (!this.state.shieldEndTime) return 0;
        return Math.max(0, this.state.shieldEndTime - Date.now());
    }

    /**
     * Intercept notifications during shield
     */
    startNotificationInterception() {
        // Hook into notification system
        if (window.NotificationManager) {
            this.originalNotify = window.NotificationManager.notify;
            window.NotificationManager.notify = this.interceptNotification.bind(this);
        }

        // Also intercept browser notifications if permission granted
        if (Notification.permission === 'granted') {
            this.originalNotification = window.Notification;
            // Can't fully override Notification, but we can queue our own
        }
    }

    /**
     * Stop notification interception
     */
    stopNotificationInterception() {
        if (this.originalNotify && window.NotificationManager) {
            window.NotificationManager.notify = this.originalNotify;
        }
    }

    /**
     * Intercept and potentially queue a notification
     */
    interceptNotification(notification) {
        // Check if notification is critical
        const isCritical = this.config.criticalCategories.includes(notification.category);

        if (isCritical) {
            // Allow critical notifications through
            this.originalNotify.call(window.NotificationManager, notification);
            this.addToQueue(notification, true);
        } else {
            // Queue non-critical notifications
            this.addToQueue(notification, false);
        }

        return !isCritical; // Return true if intercepted
    }

    /**
     * Add notification to the queue display
     */
    addToQueue(notification, allowedThrough) {
        this.state.queuedNotifications.push({
            ...notification,
            time: Date.now(),
            allowedThrough
        });

        if (!allowedThrough) {
            this.state.deflectedCount++;
        }

        this.updateQueueDisplay();
    }

    /**
     * Update the queue display
     */
    updateQueueDisplay() {
        const queueEl = document.getElementById('pds-queue');
        if (!queueEl) return;

        const deflected = this.state.queuedNotifications.filter(n => !n.allowedThrough);
        const allowed = this.state.queuedNotifications.filter(n => n.allowedThrough);

        if (deflected.length === 0 && allowed.length === 0) {
            queueEl.innerHTML = `
                <div class="pds-queue-empty">
                    <span>&#x2728;</span> No notifications deflected yet
                </div>
            `;
            return;
        }

        let html = `
            <div class="pds-queue-header">
                <span class="pds-queue-count">${deflected.length} held</span>
                ${allowed.length > 0 ? `<span class="pds-queue-allowed">${allowed.length} allowed through</span>` : ''}
            </div>
            <div class="pds-queue-list">
        `;

        // Show last 5 notifications
        const recentNotifications = this.state.queuedNotifications.slice(-5).reverse();

        recentNotifications.forEach(n => {
            const icon = n.allowedThrough ? '&#x26A0;' : '&#x1F4E8;';
            const statusClass = n.allowedThrough ? 'pds-allowed' : 'pds-held';
            html += `
                <div class="pds-queue-item ${statusClass}">
                    <span class="pds-queue-icon">${icon}</span>
                    <span class="pds-queue-text">${n.title || n.from || 'Notification'}</span>
                    <span class="pds-queue-status">${n.allowedThrough ? 'allowed' : 'held'}</span>
                </div>
            `;
        });

        html += '</div>';
        queueEl.innerHTML = html;
    }

    /**
     * End the shield early
     */
    endShieldEarly() {
        const elapsed = Date.now() - this.state.shieldStartTime;
        const elapsedMinutes = Math.round(elapsed / 60000);

        // Confirm if less than half the time has passed
        if (elapsedMinutes < this.state.shieldDuration / 2) {
            if (!confirm('End focus shield early? Your queued notifications will be released.')) {
                return;
            }
        }

        this.deactivateShield('ended_early', elapsedMinutes);
    }

    /**
     * Deactivate the shield
     */
    deactivateShield(reason = 'completed', actualDuration = null) {
        this.state.isActive = false;

        // Stop interception
        this.stopNotificationInterception();

        // Remove shield border
        document.body.classList.remove('pds-shield-active');

        // Log session for learning
        this.logSessionEnd(reason, actualDuration);

        // Release queued notifications
        this.releaseQueuedNotifications();

        // Show completion summary
        this.showShieldSummary(reason);

        // Save state
        this.saveState();

        console.log(`[PredictiveDelayShield] Shield deactivated: ${reason}`);
    }

    /**
     * Release all queued notifications
     */
    releaseQueuedNotifications() {
        const queued = this.state.queuedNotifications.filter(n => !n.allowedThrough);

        if (queued.length > 0 && this.originalNotify) {
            // Release with a slight delay between each
            queued.forEach((notification, index) => {
                setTimeout(() => {
                    this.originalNotify.call(window.NotificationManager, notification);
                }, index * 500);
            });
        }

        this.state.queuedNotifications = [];
    }

    /**
     * Show shield completion summary
     */
    showShieldSummary(reason) {
        const shieldEl = this.elements.activeShield;

        const reasonText = {
            'completed': 'Focus session completed!',
            'time_expired': 'Focus session completed!',
            'ended_early': 'Focus session ended early',
            'user_deactivated': 'Shield deactivated'
        };

        shieldEl.innerHTML = `
            <div class="pds-summary">
                <span class="pds-summary-icon">&#x2705;</span>
                <span class="pds-summary-text">${reasonText[reason] || 'Shield ended'}</span>
                <div class="pds-summary-stats">
                    <span>${this.state.deflectedCount} notifications held</span>
                    <span>${this.state.shieldDuration} minutes protected</span>
                </div>
            </div>
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            shieldEl.classList.remove('pds-visible');
        }, 5000);
    }

    // ========================================
    // PHASE 4: LEARNING
    // ========================================

    /**
     * Log the start of a focus session
     */
    logSessionStart() {
        this.currentSession = {
            id: Date.now(),
            startTime: Date.now(),
            plannedDuration: this.state.shieldDuration,
            focusScore: this.state.focusScore
        };
    }

    /**
     * Log the end of a focus session
     */
    logSessionEnd(reason, actualDuration = null) {
        if (!this.currentSession) return;

        const session = {
            ...this.currentSession,
            endTime: Date.now(),
            actualDuration: actualDuration || this.state.shieldDuration,
            duration: actualDuration || this.state.shieldDuration,
            outcome: reason,
            deflectedCount: this.state.deflectedCount,
            wasHelpful: reason === 'completed' || reason === 'time_expired'
        };

        // Add to sessions history
        this.state.sessions.push(session);

        // Keep only last 50 sessions
        if (this.state.sessions.length > 50) {
            this.state.sessions = this.state.sessions.slice(-50);
        }

        // Learn from this session
        this.learnFromSession(session);

        this.currentSession = null;
    }

    /**
     * Learn from a completed session
     */
    learnFromSession(session) {
        if (!this.config.enableLearning) return;

        // Adjust optimal duration based on session outcome
        if (session.outcome === 'ended_early') {
            // User ended early - maybe suggest shorter durations
            console.log('[PredictiveDelayShield] Learning: User prefers shorter sessions');
        } else if (session.outcome === 'completed') {
            // Successful completion - this duration works well
            console.log('[PredictiveDelayShield] Learning: Duration was appropriate');
        }

        // Track time-of-day patterns
        const hour = new Date(session.startTime).getHours();
        const dayOfWeek = new Date(session.startTime).getDay();

        // This data could be used to predict optimal focus times
        console.log(`[PredictiveDelayShield] Session at ${hour}:00 on day ${dayOfWeek}`);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get focus blocks from storage (calendar integration point)
     */
    getFocusBlocksFromStorage() {
        try {
            const stored = localStorage.getItem('focusBlocks');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Get active task from context (task system integration point)
     */
    getActiveTaskFromContext() {
        // Check for globally exposed active task
        if (window.activeTask) {
            return window.activeTask;
        }

        // Check for task in URL or DOM
        const taskIndicator = document.querySelector('[data-active-task]');
        if (taskIndicator) {
            return {
                id: taskIndicator.dataset.taskId,
                difficulty: taskIndicator.dataset.taskDifficulty
            };
        }

        return null;
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            const stateToSave = {
                sessions: this.state.sessions,
                acceptedSuggestions: this.state.acceptedSuggestions,
                dismissedSuggestions: this.state.dismissedSuggestions
            };
            localStorage.setItem(this.config.storageKey, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('[PredictiveDelayShield] Could not save state:', e);
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state.sessions = parsed.sessions || [];
                this.state.acceptedSuggestions = parsed.acceptedSuggestions || 0;
                this.state.dismissedSuggestions = parsed.dismissedSuggestions || 0;
            }
        } catch (e) {
            console.warn('[PredictiveDelayShield] Could not load state:', e);
        }
    }

    /**
     * Update focus indicator in UI
     */
    updateFocusIndicator() {
        const indicator = this.elements.focusIndicator;
        if (!indicator) return;

        const score = this.state.focusScore;
        const fill = indicator.querySelector('.pds-focus-fill');

        if (fill) {
            fill.style.width = `${score}%`;

            // Change color based on score
            if (score >= 60) {
                fill.style.background = 'var(--pds-accent-green)';
            } else if (score >= 30) {
                fill.style.background = 'var(--pds-accent-amber)';
            } else {
                fill.style.background = 'var(--pds-accent-blue)';
            }
        }
    }

    /**
     * Create all UI elements
     */
    createUI() {
        // Create container
        const container = document.createElement('div');
        container.id = 'pds-container';
        container.className = `pds-container pds-${this.config.position}`;

        container.innerHTML = `
            <!-- Focus indicator (always visible) -->
            <div class="pds-focus-indicator" id="pds-focus-indicator">
                <span class="pds-focus-label">Focus</span>
                <div class="pds-focus-bar">
                    <div class="pds-focus-fill"></div>
                </div>
            </div>

            <!-- Prediction popup -->
            <div class="pds-prediction" id="pds-prediction"></div>

            <!-- Active shield panel -->
            <div class="pds-active-shield" id="pds-active-shield"></div>
        `;

        this.config.container.appendChild(container);

        // Store references
        this.elements = {
            container,
            focusIndicator: container.querySelector('#pds-focus-indicator'),
            prediction: container.querySelector('#pds-prediction'),
            activeShield: container.querySelector('#pds-active-shield')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        document.addEventListener('keypress', this.handleKeyPress);
        document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * Start the monitoring loop
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(this.tick, 1000);
    }

    /**
     * Manual trigger for shield (can be called from UI)
     */
    manualActivate(duration = null) {
        const durationToUse = duration || this.calculateOptimalDuration();
        this.activateShield(durationToUse);
    }

    /**
     * Destroy the shield (cleanup)
     */
    destroy() {
        clearInterval(this.monitoringInterval);
        clearTimeout(this.predictionTimeout);

        document.removeEventListener('keypress', this.handleKeyPress);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        this.stopNotificationInterception();

        if (this.elements.container) {
            this.elements.container.remove();
        }
    }
}

// Export for global use
window.PredictiveDelayShield = PredictiveDelayShield;

// Auto-initialize if not in module context
if (typeof module === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.predictiveDelayShield = new PredictiveDelayShield();
    });
}
