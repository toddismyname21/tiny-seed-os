/**
 * TinyPM AI Rituals Module
 * ========================
 * Morning Planning & Evening Shutdown Rituals
 * Makes the AI feel like a brilliant, proactive Chief of Staff
 *
 * Reference: Superhuman's auto-drafts, Motion's smart scheduling, Sunsama's morning ritual
 *
 * Created: 2026-02-03
 * Updated: 2026-02-09 - Connected to live API endpoints
 * Team: AI UX & Guided Rituals (Team 3)
 */

const AIRituals = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        morningStart: 6,    // 6 AM
        morningEnd: 10,     // 10 AM
        eveningStart: 17,   // 5 PM
        eveningEnd: 21,     // 9 PM
        ritualDismissHours: 8, // Don't show again for 8 hours
        animationDuration: 400,
        apiTimeout: 8000    // 8 second timeout for API calls
    },

    // State
    state: {
        currentRitualStep: 0,
        ritualType: null, // 'morning' or 'evening'
        ritualData: {},
        isAnimating: false,
        cachedTasks: []     // Cache tasks after API fetch
    },

    // =========================================================================
    // API HELPERS - Connect to real task data
    // =========================================================================

    /**
     * Fetch tasks from the live API
     * @returns {Promise<Array>} Array of tasks
     */
    async fetchTasksFromAPI() {
        try {
            const res = await fetch('/api/tasks', {
                signal: AbortSignal.timeout(this.config.apiTimeout)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.state.cachedTasks = data.tasks || [];
            return this.state.cachedTasks;
        } catch (err) {
            console.error('[AIRituals] Failed to fetch tasks from API:', err);
            // Fallback to cached tasks or empty array
            return this.state.cachedTasks || [];
        }
    },

    /**
     * Create a task via the API
     * @param {Object} taskData - Task data to create
     * @returns {Promise<Object>} Result object
     */
    async createTaskViaAPI(taskData) {
        try {
            const res = await fetch('/api/tasks/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData),
                signal: AbortSignal.timeout(this.config.apiTimeout)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[AIRituals] Failed to create task via API:', err);
            return { success: false, error: err.message };
        }
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    async init() {
        this.injectStyles();
        // Pre-fetch tasks from API before checking rituals
        await this.fetchTasksFromAPI();
        this.checkAndShowRitual();
    },

    /**
     * Check if ritual should be shown based on time of day
     */
    checkAndShowRitual() {
        const hour = new Date().getHours();
        const profile = this.getProfile();

        // Check morning ritual
        if (hour >= this.config.morningStart && hour < this.config.morningEnd) {
            if (this.shouldShowRitual('morning')) {
                this.showMorningRitual();
                return true;
            }
        }

        // Check evening ritual
        if (hour >= this.config.eveningStart && hour < this.config.eveningEnd) {
            if (this.shouldShowRitual('evening')) {
                this.showEveningRitual();
                return true;
            }
        }

        return false;
    },

    /**
     * Check if ritual should be shown (not dismissed recently)
     */
    shouldShowRitual(type) {
        const dismissedKey = `tinypm_${type}_ritual_dismissed`;
        const dismissed = localStorage.getItem(dismissedKey);

        if (!dismissed) return true;

        const dismissedTime = new Date(dismissed);
        const hoursSince = (Date.now() - dismissedTime.getTime()) / (1000 * 60 * 60);

        return hoursSince >= this.config.ritualDismissHours;
    },

    /**
     * Get user profile from localStorage
     */
    getProfile() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
        } catch (e) {
            return {};
        }
    },

    /**
     * Get tasks from cached API data
     * NOTE: Tasks are fetched from the API in init() and stored in state.cachedTasks
     * This method returns the cached data synchronously for use in render methods
     */
    getTasks() {
        return this.state.cachedTasks || [];
    },

    /**
     * Get greeting based on time
     */
    getGreeting() {
        const hour = new Date().getHours();
        const profile = this.getProfile();
        const name = profile.name || 'there';

        if (hour < 12) return `Good morning, ${name}!`;
        if (hour < 17) return `Good afternoon, ${name}!`;
        return `Good evening, ${name}!`;
    },

    // =========================================================================
    // MORNING RITUAL
    // =========================================================================
    async showMorningRitual() {
        this.state.ritualType = 'morning';
        this.state.currentRitualStep = 0;

        // Fetch fresh task data from API before showing ritual
        await this.fetchTasksFromAPI();
        this.state.ritualData = this.gatherMorningData();

        const overlay = this.createRitualOverlay();
        overlay.innerHTML = this.getMorningRitualHTML();
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
    },

    /**
     * Gather data for morning ritual
     */
    gatherMorningData() {
        const tasks = this.getTasks();
        const today = new Date().toISOString().split('T')[0];

        // Get high priority tasks
        const highPriority = tasks.filter(t =>
            t.priority === 'high' && t.status !== 'completed'
        );

        // Get overdue tasks
        const overdue = tasks.filter(t =>
            t.due_date && t.due_date < today && t.status !== 'completed'
        );

        // Get tasks due today
        const dueToday = tasks.filter(t =>
            t.due_date === today && t.status !== 'completed'
        );

        // Get pending tasks
        const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

        // Calculate recommended focus order
        const focusOrder = [...dueToday, ...overdue, ...highPriority]
            .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
            .slice(0, 5);

        // Generate AI recommendation
        let aiReason = '';
        if (focusOrder.length > 0) {
            const first = focusOrder[0];
            if (overdue.find(t => t.id === first.id)) {
                aiReason = "It's overdue and might be blocking other work";
            } else if (dueToday.find(t => t.id === first.id)) {
                aiReason = "It's due today and you'll feel great checking it off";
            } else {
                aiReason = "It's high priority and best tackled when you're fresh";
            }
        }

        return {
            greeting: this.getGreeting(),
            date: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            }),
            stats: {
                highPriority: highPriority.length,
                dueToday: dueToday.length,
                overdue: overdue.length,
                totalPending: pending.length
            },
            focusOrder,
            aiReason,
            calendarEvents: this.getCalendarEvents() // Would integrate with real calendar
        };
    },

    /**
     * Get calendar events (placeholder - would integrate with Google Calendar)
     */
    getCalendarEvents() {
        // This would integrate with the calendar system
        return [];
    },

    /**
     * Get morning ritual HTML
     */
    getMorningRitualHTML() {
        const data = this.state.ritualData;

        return `
            <div class="ritual-container morning-ritual">
                <button class="ritual-close" onclick="AIRituals.dismissRitual()">&times;</button>

                <!-- Step Indicator -->
                <div class="ritual-steps">
                    <div class="ritual-step-dot active" data-step="0"></div>
                    <div class="ritual-step-dot" data-step="1"></div>
                    <div class="ritual-step-dot" data-step="2"></div>
                </div>

                <!-- Step 0: Overview -->
                <div class="ritual-step active" data-step="0">
                    <div class="ritual-header">
                        <div class="ritual-icon morning-icon">
                            <span class="icon-sun"></span>
                        </div>
                        <h1 class="ritual-title">${data.greeting}</h1>
                        <p class="ritual-subtitle">${data.date}</p>
                    </div>

                    <div class="ritual-content">
                        <p class="ritual-intro">Here's what's on your plate today:</p>

                        <div class="ritual-stats-grid">
                            ${data.stats.overdue > 0 ? `
                                <div class="ritual-stat urgent">
                                    <span class="stat-value">${data.stats.overdue}</span>
                                    <span class="stat-label">Overdue</span>
                                </div>
                            ` : ''}
                            <div class="ritual-stat">
                                <span class="stat-value">${data.stats.dueToday}</span>
                                <span class="stat-label">Due Today</span>
                            </div>
                            <div class="ritual-stat">
                                <span class="stat-value">${data.stats.highPriority}</span>
                                <span class="stat-label">High Priority</span>
                            </div>
                            <div class="ritual-stat">
                                <span class="stat-value">${data.stats.totalPending}</span>
                                <span class="stat-label">Total Tasks</span>
                            </div>
                        </div>

                        ${data.calendarEvents.length > 0 ? `
                            <div class="ritual-calendar-preview">
                                <h3>Today's Events</h3>
                                <ul class="calendar-list">
                                    ${data.calendarEvents.map(e => `
                                        <li><span class="event-time">${e.time}</span> ${e.title}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn primary" onclick="AIRituals.nextRitualStep()">
                            Let's Plan My Day
                        </button>
                    </div>
                </div>

                <!-- Step 1: Priority Planning -->
                <div class="ritual-step" data-step="1">
                    <div class="ritual-header compact">
                        <h2 class="ritual-title-sm">Let's plan your day</h2>
                        <p class="ritual-subtitle">Drag to reorder by priority, or trust my suggestions</p>
                    </div>

                    <div class="ritual-content">
                        ${data.focusOrder.length > 0 ? `
                            <div class="ai-suggestion-card">
                                <div class="ai-avatar">
                                    <span class="ai-icon"></span>
                                </div>
                                <div class="ai-message">
                                    <strong>I'd recommend tackling "${this.escapeHtml(data.focusOrder[0].title)}" first</strong>
                                    <p class="ai-reason">${data.aiReason}</p>
                                </div>
                            </div>

                            <div class="task-reorder-list" id="morningTaskList">
                                ${data.focusOrder.map((task, idx) => `
                                    <div class="reorder-task" data-task-id="${task.id}" draggable="true">
                                        <span class="drag-handle"></span>
                                        <span class="task-order">${idx + 1}</span>
                                        <div class="task-info">
                                            <span class="task-title">${this.escapeHtml(task.title)}</span>
                                            ${task.due_date ? `<span class="task-due ${task.due_date < new Date().toISOString().split('T')[0] ? 'overdue' : ''}">${this.formatDate(task.due_date)}</span>` : ''}
                                        </div>
                                        <span class="task-priority ${task.priority || 'medium'}"></span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-state">
                                <span class="empty-icon"></span>
                                <p>No pending tasks! Time to add some goals.</p>
                                <button class="ritual-btn secondary small" onclick="AIRituals.openQuickCapture()">
                                    Add Task
                                </button>
                            </div>
                        `}

                        <div class="time-block-option">
                            <label class="toggle-option">
                                <input type="checkbox" id="enableTimeBlocks">
                                <span class="toggle-label">Enable time blocking (optional)</span>
                            </label>
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn secondary" onclick="AIRituals.prevRitualStep()">
                            Back
                        </button>
                        <button class="ritual-btn primary" onclick="AIRituals.nextRitualStep()">
                            Looks Good
                        </button>
                    </div>
                </div>

                <!-- Step 2: Ready to Go -->
                <div class="ritual-step" data-step="2">
                    <div class="ritual-header">
                        <div class="ritual-icon success-icon">
                            <span class="icon-check"></span>
                        </div>
                        <h1 class="ritual-title">Ready to go!</h1>
                        <p class="ritual-subtitle">Your day is planned. Let's make it count.</p>
                    </div>

                    <div class="ritual-content">
                        <div class="summary-card">
                            <div class="summary-header">Today's Focus</div>
                            <div class="summary-tasks">
                                ${data.focusOrder.slice(0, 3).map((task, idx) => `
                                    <div class="summary-task">
                                        <span class="task-number">${idx + 1}</span>
                                        <span class="task-name">${this.escapeHtml(task.title)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="affirmation-card">
                            <span class="affirmation-icon"></span>
                            <p class="affirmation-text">"${this.getAffirmation()}"</p>
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn secondary" onclick="AIRituals.prevRitualStep()">
                            Back
                        </button>
                        <button class="ritual-btn primary focus-btn" onclick="AIRituals.startFocusMode()">
                            Start Focus Mode
                        </button>
                        <button class="ritual-btn secondary" onclick="AIRituals.completeRitual()">
                            Just Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // EVENING RITUAL
    // =========================================================================
    async showEveningRitual() {
        this.state.ritualType = 'evening';
        this.state.currentRitualStep = 0;

        // Fetch fresh task data from API before showing ritual
        await this.fetchTasksFromAPI();
        this.state.ritualData = this.gatherEveningData();

        const overlay = this.createRitualOverlay();
        overlay.innerHTML = this.getEveningRitualHTML();
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
    },

    /**
     * Gather data for evening ritual
     */
    gatherEveningData() {
        const tasks = this.getTasks();
        const today = new Date().toISOString().split('T')[0];
        const profile = this.getProfile();

        // Get completed tasks today
        const completedToday = tasks.filter(t =>
            t.completed_at && t.completed_at.startsWith(today)
        );

        // Get tasks that were moved/deferred
        const movedToday = tasks.filter(t =>
            t.moved_at && t.moved_at.startsWith(today)
        );

        // Get tasks created today
        const createdToday = tasks.filter(t =>
            t.created_at && t.created_at.startsWith(today)
        );

        // Get pending high priority for tomorrow
        const highPriorityPending = tasks.filter(t =>
            t.priority === 'high' && t.status !== 'completed'
        ).slice(0, 3);

        // Calculate if goal was met
        const dailyGoal = profile.daily_task_goal || 3;
        const goalMet = completedToday.length >= dailyGoal;

        return {
            greeting: this.getGreeting(),
            date: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            }),
            stats: {
                completed: completedToday.length,
                moved: movedToday.length,
                created: createdToday.length,
                dailyGoal
            },
            goalMet,
            celebration: this.getCelebration(completedToday.length, goalMet),
            tomorrowPreview: highPriorityPending,
            warnings: this.getTomorrowWarnings(tasks)
        };
    },

    /**
     * Get celebration message based on performance
     */
    getCelebration(completed, goalMet) {
        if (completed === 0) {
            return { emoji: '', message: "Every day is a fresh start. Rest up for tomorrow!" };
        }
        if (goalMet) {
            return { emoji: '', message: `You crushed it! ${completed} tasks completed!` };
        }
        if (completed >= 1) {
            return { emoji: '', message: `Great work! ${completed} task${completed > 1 ? 's' : ''} done!` };
        }
        return { emoji: '', message: "Progress is progress. Keep going!" };
    },

    /**
     * Get warnings for tomorrow
     */
    getTomorrowWarnings(tasks) {
        const warnings = [];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Count tasks due tomorrow
        const dueTomorrow = tasks.filter(t =>
            t.due_date === tomorrowStr && t.status !== 'completed'
        );

        if (dueTomorrow.length > 5) {
            warnings.push({
                type: 'overload',
                message: `You have ${dueTomorrow.length} tasks due tomorrow. Consider rescheduling some.`
            });
        }

        return warnings;
    },

    /**
     * Get evening ritual HTML
     */
    getEveningRitualHTML() {
        const data = this.state.ritualData;

        return `
            <div class="ritual-container evening-ritual">
                <button class="ritual-close" onclick="AIRituals.dismissRitual()">&times;</button>

                <!-- Step Indicator -->
                <div class="ritual-steps">
                    <div class="ritual-step-dot active" data-step="0"></div>
                    <div class="ritual-step-dot" data-step="1"></div>
                    <div class="ritual-step-dot" data-step="2"></div>
                </div>

                <!-- Step 0: Celebration -->
                <div class="ritual-step active" data-step="0">
                    <div class="ritual-header">
                        <div class="ritual-icon evening-icon ${data.goalMet ? 'celebration' : ''}">
                            <span class="icon-moon"></span>
                        </div>
                        <h1 class="ritual-title">${data.goalMet ? 'Great work today!' : 'Day in Review'}</h1>
                        <p class="ritual-subtitle">${data.date}</p>
                    </div>

                    <div class="ritual-content">
                        <div class="celebration-card ${data.goalMet ? 'success' : ''}">
                            <span class="celebration-emoji">${data.celebration.emoji}</span>
                            <p class="celebration-message">${data.celebration.message}</p>
                        </div>

                        <div class="ritual-stats-grid evening">
                            <div class="ritual-stat success">
                                <span class="stat-value">${data.stats.completed}</span>
                                <span class="stat-label">Completed</span>
                            </div>
                            <div class="ritual-stat">
                                <span class="stat-value">${data.stats.moved}</span>
                                <span class="stat-label">Moved</span>
                            </div>
                            <div class="ritual-stat">
                                <span class="stat-value">${data.stats.created}</span>
                                <span class="stat-label">Created</span>
                            </div>
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn primary" onclick="AIRituals.nextRitualStep()">
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 1: Brain Dump -->
                <div class="ritual-step" data-step="1">
                    <div class="ritual-header compact">
                        <h2 class="ritual-title-sm">Anything left to capture?</h2>
                        <p class="ritual-subtitle">Get it out of your head before bed</p>
                    </div>

                    <div class="ritual-content">
                        <div class="brain-dump-area">
                            <textarea id="brainDumpText" class="brain-dump-input"
                                placeholder="Type anything on your mind... tasks, ideas, reminders for tomorrow..."></textarea>

                            <div class="quick-add-row">
                                <button class="quick-add-btn" onclick="AIRituals.enableVoiceCapture()">
                                    <span class="mic-icon"></span> Voice
                                </button>
                                <button class="quick-add-btn" onclick="AIRituals.addBrainDumpAsTasks()">
                                    <span class="add-icon"></span> Add as Tasks
                                </button>
                            </div>
                        </div>

                        <div class="suggested-captures" id="suggestedCaptures">
                            <!-- AI suggestions would appear here -->
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn secondary" onclick="AIRituals.prevRitualStep()">
                            Back
                        </button>
                        <button class="ritual-btn primary" onclick="AIRituals.nextRitualStep()">
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 2: Tomorrow Preview -->
                <div class="ritual-step" data-step="2">
                    <div class="ritual-header compact">
                        <h2 class="ritual-title-sm">Tomorrow Preview</h2>
                        <p class="ritual-subtitle">Your top 3 priorities</p>
                    </div>

                    <div class="ritual-content">
                        ${data.warnings.length > 0 ? `
                            <div class="warning-cards">
                                ${data.warnings.map(w => `
                                    <div class="warning-card ${w.type}">
                                        <span class="warning-icon"></span>
                                        <p>${w.message}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div class="tomorrow-priorities">
                            ${data.tomorrowPreview.length > 0 ?
                                data.tomorrowPreview.map((task, idx) => `
                                    <div class="tomorrow-task">
                                        <span class="task-priority-badge ${task.priority || 'medium'}"></span>
                                        <span class="task-order">${idx + 1}</span>
                                        <span class="task-title">${this.escapeHtml(task.title)}</span>
                                    </div>
                                `).join('')
                            : `
                                <div class="empty-state small">
                                    <p>No high-priority tasks scheduled. Enjoy your evening!</p>
                                </div>
                            `}
                        </div>

                        <div class="goodnight-card">
                            <span class="moon-icon"></span>
                            <p class="goodnight-message">Sleep well! Tomorrow is a new opportunity.</p>
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="ritual-btn secondary" onclick="AIRituals.prevRitualStep()">
                            Back
                        </button>
                        <button class="ritual-btn primary" onclick="AIRituals.completeRitual()">
                            Good Night
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // RITUAL NAVIGATION
    // =========================================================================
    createRitualOverlay() {
        // Remove existing overlay if present
        const existing = document.getElementById('ai-ritual-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ai-ritual-overlay';
        overlay.className = 'ai-ritual-overlay';
        return overlay;
    },

    nextRitualStep() {
        if (this.state.isAnimating) return;
        this.state.isAnimating = true;

        const steps = document.querySelectorAll('.ritual-step');
        const dots = document.querySelectorAll('.ritual-step-dot');
        const currentStep = this.state.currentRitualStep;
        const nextStep = currentStep + 1;

        if (nextStep >= steps.length) {
            this.completeRitual();
            return;
        }

        // Animate out current step
        steps[currentStep].classList.add('exit-left');
        steps[currentStep].classList.remove('active');

        // Animate in next step
        setTimeout(() => {
            steps[currentStep].classList.remove('exit-left');
            steps[nextStep].classList.add('active');
            dots[currentStep].classList.remove('active');
            dots[nextStep].classList.add('active');
            this.state.currentRitualStep = nextStep;
            this.state.isAnimating = false;
        }, this.config.animationDuration);
    },

    prevRitualStep() {
        if (this.state.isAnimating) return;
        this.state.isAnimating = true;

        const steps = document.querySelectorAll('.ritual-step');
        const dots = document.querySelectorAll('.ritual-step-dot');
        const currentStep = this.state.currentRitualStep;
        const prevStep = currentStep - 1;

        if (prevStep < 0) return;

        // Animate out current step
        steps[currentStep].classList.add('exit-right');
        steps[currentStep].classList.remove('active');

        // Animate in previous step
        setTimeout(() => {
            steps[currentStep].classList.remove('exit-right');
            steps[prevStep].classList.add('active');
            dots[currentStep].classList.remove('active');
            dots[prevStep].classList.add('active');
            this.state.currentRitualStep = prevStep;
            this.state.isAnimating = false;
        }, this.config.animationDuration);
    },

    completeRitual() {
        const overlay = document.getElementById('ai-ritual-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), this.config.animationDuration);
        }

        // Mark ritual as completed
        const key = `tinypm_${this.state.ritualType}_ritual_dismissed`;
        localStorage.setItem(key, new Date().toISOString());

        // Trigger any completion events
        this.onRitualComplete();
    },

    dismissRitual() {
        const overlay = document.getElementById('ai-ritual-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), this.config.animationDuration);
        }

        // Mark as dismissed
        const key = `tinypm_${this.state.ritualType}_ritual_dismissed`;
        localStorage.setItem(key, new Date().toISOString());
    },

    onRitualComplete() {
        // Could trigger analytics, save state, etc.
        console.log(`[AIRituals] ${this.state.ritualType} ritual completed`);

        // Notify other components
        window.dispatchEvent(new CustomEvent('ritualComplete', {
            detail: { type: this.state.ritualType }
        }));
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    startFocusMode() {
        this.completeRitual();
        // Trigger focus mode if available
        if (window.FocusMode) {
            window.FocusMode.start();
        } else {
            console.log('[AIRituals] Focus mode started');
        }
    },

    openQuickCapture() {
        this.dismissRitual();
        // Trigger quick capture if available
        if (window.SmartCapture) {
            window.SmartCapture.open();
        }
    },

    enableVoiceCapture() {
        // Would integrate with voice capture
        console.log('[AIRituals] Voice capture requested');
    },

    async addBrainDumpAsTasks() {
        const text = document.getElementById('brainDumpText')?.value;
        if (!text) return;

        // Parse text into tasks (simple line-by-line)
        const lines = text.split('\n').filter(l => l.trim());
        let createdCount = 0;

        // Create each task via the API
        for (const line of lines) {
            const result = await this.createTaskViaAPI({
                title: line.trim(),
                status: 'pending',
                priority: 'medium',
                source: 'evening_ritual'
            });
            if (result.success) {
                createdCount++;
            }
        }

        // Clear input and show confirmation
        document.getElementById('brainDumpText').value = '';
        this.showToast(`Added ${createdCount} task${createdCount !== 1 ? 's' : ''}`);

        // Refresh cached tasks
        await this.fetchTasksFromAPI();
    },

    getAffirmation() {
        const affirmations = [
            "Focus on progress, not perfection.",
            "One task at a time. You've got this.",
            "Your best work happens when you're focused.",
            "Small steps lead to big achievements.",
            "Today's effort builds tomorrow's success.",
            "Breathe. Focus. Execute.",
            "You're more capable than you know."
        ];
        return affirmations[Math.floor(Math.random() * affirmations.length)];
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateStr === today.toISOString().split('T')[0]) return 'Today';
        if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ai-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =========================================================================
    // STYLES INJECTION
    // =========================================================================
    injectStyles() {
        if (document.getElementById('ai-rituals-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ai-rituals-styles';
        styles.textContent = `
            /* AI Ritual Overlay */
            .ai-ritual-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 15, 26, 0.95);
                backdrop-filter: blur(12px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.4s ease;
            }

            .ai-ritual-overlay.visible {
                opacity: 1;
            }

            /* Ritual Container */
            .ritual-container {
                position: relative;
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border-radius: 20px;
                border: 1px solid rgba(99, 102, 241, 0.2);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                            0 0 40px rgba(99, 102, 241, 0.15);
                padding: 32px;
                margin: 20px;
            }

            .ritual-close {
                position: absolute;
                top: 16px;
                right: 16px;
                background: none;
                border: none;
                color: #6b6f82;
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
                line-height: 1;
                transition: color 0.2s;
                z-index: 10;
            }

            .ritual-close:hover {
                color: #a0a4b8;
            }

            /* Step Indicator */
            .ritual-steps {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 24px;
            }

            .ritual-step-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #2a2d3e;
                transition: all 0.3s ease;
            }

            .ritual-step-dot.active {
                width: 24px;
                border-radius: 4px;
                background: linear-gradient(135deg, #6366f1, #a855f7);
            }

            /* Ritual Steps */
            .ritual-step {
                display: none;
                animation: fadeSlideIn 0.4s ease;
            }

            .ritual-step.active {
                display: block;
            }

            .ritual-step.exit-left {
                animation: fadeSlideLeft 0.4s ease forwards;
            }

            .ritual-step.exit-right {
                animation: fadeSlideRight 0.4s ease forwards;
            }

            @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            @keyframes fadeSlideLeft {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(-20px); }
            }

            @keyframes fadeSlideRight {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }

            /* Ritual Header */
            .ritual-header {
                text-align: center;
                margin-bottom: 28px;
            }

            .ritual-header.compact {
                margin-bottom: 20px;
            }

            .ritual-icon {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 36px;
            }

            .morning-icon {
                background: linear-gradient(135deg, #f59e0b, #fbbf24);
                box-shadow: 0 0 40px rgba(245, 158, 11, 0.4);
            }

            .evening-icon {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                box-shadow: 0 0 40px rgba(99, 102, 241, 0.4);
            }

            .evening-icon.celebration {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                box-shadow: 0 0 40px rgba(34, 197, 94, 0.4);
                animation: pulse-glow 2s ease-in-out infinite;
            }

            .success-icon {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                box-shadow: 0 0 40px rgba(34, 197, 94, 0.4);
            }

            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.4); }
                50% { box-shadow: 0 0 60px rgba(34, 197, 94, 0.6); }
            }

            .ritual-title {
                font-size: 28px;
                font-weight: 700;
                color: #f0f0f5;
                margin-bottom: 8px;
            }

            .ritual-title-sm {
                font-size: 22px;
                font-weight: 700;
                color: #f0f0f5;
                margin-bottom: 8px;
            }

            .ritual-subtitle {
                font-size: 14px;
                color: #a0a4b8;
            }

            /* Ritual Content */
            .ritual-content {
                margin-bottom: 24px;
            }

            .ritual-intro {
                color: #a0a4b8;
                margin-bottom: 20px;
                text-align: center;
            }

            /* Stats Grid */
            .ritual-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }

            .ritual-stat {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 16px 12px;
                text-align: center;
            }

            .ritual-stat.urgent {
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .ritual-stat.success {
                background: rgba(34, 197, 94, 0.15);
                border: 1px solid rgba(34, 197, 94, 0.3);
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
                letter-spacing: 0.05em;
                margin-top: 4px;
            }

            /* AI Suggestion Card */
            .ai-suggestion-card {
                display: flex;
                gap: 14px;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }

            .ai-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .ai-avatar::after {
                content: '';
                font-size: 20px;
            }

            .ai-message strong {
                display: block;
                color: #f0f0f5;
                font-size: 14px;
                margin-bottom: 4px;
            }

            .ai-reason {
                font-size: 13px;
                color: #a0a4b8;
                margin: 0;
            }

            /* Task Reorder List */
            .task-reorder-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .reorder-task {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid transparent;
                border-radius: 10px;
                padding: 14px;
                cursor: grab;
                transition: all 0.2s;
            }

            .reorder-task:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(99, 102, 241, 0.3);
            }

            .reorder-task:active {
                cursor: grabbing;
            }

            .drag-handle {
                width: 20px;
                height: 20px;
                opacity: 0.4;
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%23a0a4b8'%3E%3Ccircle cx='5' cy='5' r='1.5'/%3E%3Ccircle cx='10' cy='5' r='1.5'/%3E%3Ccircle cx='5' cy='10' r='1.5'/%3E%3Ccircle cx='10' cy='10' r='1.5'/%3E%3Ccircle cx='5' cy='15' r='1.5'/%3E%3Ccircle cx='10' cy='15' r='1.5'/%3E%3C/svg%3E") center no-repeat;
            }

            .task-order {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(99, 102, 241, 0.2);
                color: #6366f1;
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .task-info {
                flex: 1;
                min-width: 0;
            }

            .task-title {
                display: block;
                color: #f0f0f5;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .task-due {
                display: block;
                font-size: 12px;
                color: #6b6f82;
                margin-top: 2px;
            }

            .task-due.overdue {
                color: #ef4444;
            }

            .task-priority {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .task-priority.high { background: #ef4444; }
            .task-priority.medium { background: #f59e0b; }
            .task-priority.low { background: #22c55e; }

            /* Summary Card */
            .summary-card {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }

            .summary-header {
                font-size: 12px;
                font-weight: 700;
                color: #6b6f82;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 12px;
            }

            .summary-tasks {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .summary-task {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .task-number {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                color: white;
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .task-name {
                color: #f0f0f5;
                font-size: 14px;
            }

            /* Affirmation Card */
            .affirmation-card {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
                border: 1px solid rgba(34, 197, 94, 0.2);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }

            .affirmation-icon::after {
                content: '';
                font-size: 24px;
            }

            .affirmation-text {
                color: #a0a4b8;
                font-style: italic;
                margin: 10px 0 0;
            }

            /* Celebration Card */
            .celebration-card {
                text-align: center;
                padding: 24px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                margin-bottom: 20px;
            }

            .celebration-card.success {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.15));
                border: 1px solid rgba(34, 197, 94, 0.3);
            }

            .celebration-emoji {
                font-size: 48px;
                display: block;
                margin-bottom: 12px;
            }

            .celebration-message {
                color: #f0f0f5;
                font-size: 16px;
                font-weight: 600;
            }

            /* Brain Dump */
            .brain-dump-area {
                margin-bottom: 20px;
            }

            .brain-dump-input {
                width: 100%;
                min-height: 120px;
                padding: 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: #f0f0f5;
                font-family: inherit;
                font-size: 14px;
                resize: vertical;
                transition: border-color 0.2s;
            }

            .brain-dump-input:focus {
                outline: none;
                border-color: rgba(99, 102, 241, 0.5);
            }

            .brain-dump-input::placeholder {
                color: #6b6f82;
            }

            .quick-add-row {
                display: flex;
                gap: 10px;
                margin-top: 12px;
            }

            .quick-add-btn {
                flex: 1;
                padding: 10px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #a0a4b8;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .quick-add-btn:hover {
                background: rgba(99, 102, 241, 0.1);
                border-color: rgba(99, 102, 241, 0.3);
                color: #f0f0f5;
            }

            /* Tomorrow Preview */
            .tomorrow-priorities {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 20px;
            }

            .tomorrow-task {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
            }

            .task-priority-badge {
                width: 6px;
                height: 20px;
                border-radius: 3px;
            }

            .task-priority-badge.high { background: #ef4444; }
            .task-priority-badge.medium { background: #f59e0b; }
            .task-priority-badge.low { background: #22c55e; }

            /* Warning Card */
            .warning-card {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 10px;
                margin-bottom: 16px;
            }

            .warning-card p {
                color: #fca5a5;
                font-size: 13px;
                margin: 0;
            }

            /* Goodnight Card */
            .goodnight-card {
                text-align: center;
                padding: 24px;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
                border-radius: 12px;
            }

            .goodnight-message {
                color: #a0a4b8;
                font-size: 14px;
                margin-top: 12px;
            }

            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 32px;
                color: #6b6f82;
            }

            .empty-state.small {
                padding: 20px;
            }

            /* Toggle Option */
            .time-block-option {
                margin-top: 16px;
            }

            .toggle-option {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                color: #a0a4b8;
                font-size: 13px;
            }

            .toggle-option input {
                width: 18px;
                height: 18px;
                accent-color: #6366f1;
            }

            /* Ritual Actions */
            .ritual-actions {
                display: flex;
                gap: 12px;
            }

            .ritual-btn {
                flex: 1;
                padding: 14px 20px;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }

            .ritual-btn.primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .ritual-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            }

            .ritual-btn.secondary {
                background: rgba(255, 255, 255, 0.05);
                color: #a0a4b8;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .ritual-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #f0f0f5;
            }

            .ritual-btn.small {
                padding: 10px 16px;
                font-size: 13px;
            }

            .ritual-btn.focus-btn {
                background: linear-gradient(135deg, #22c55e, #16a34a);
            }

            .ritual-btn.focus-btn:hover {
                box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
            }

            /* Toast */
            .ai-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                padding: 14px 24px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 500;
                color: white;
                z-index: 10001;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .ai-toast.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .ai-toast.success {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
            }

            .ai-toast.error {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
            }

            /* Mobile Responsive */
            @media (max-width: 520px) {
                .ritual-container {
                    padding: 24px;
                    margin: 10px;
                    max-height: 95vh;
                }

                .ritual-title {
                    font-size: 24px;
                }

                .ritual-icon {
                    width: 64px;
                    height: 64px;
                    font-size: 28px;
                }

                .ritual-stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .ritual-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.AIRituals = AIRituals;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Delay to not interfere with initial page load
    // Also ensures the dashboard has loaded tasks first
    setTimeout(async () => {
        await AIRituals.init();
    }, 1500);
});

// Also expose manual trigger methods for testing
window.showMorningRitual = async () => {
    await AIRituals.fetchTasksFromAPI();
    AIRituals.showMorningRitual();
};

window.showEveningRitual = async () => {
    await AIRituals.fetchTasksFromAPI();
    AIRituals.showEveningRitual();
};
