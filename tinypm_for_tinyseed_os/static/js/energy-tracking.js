/**
 * ENERGY TRACKING UI COMPONENTS
 * TinyPM's #1 Differentiator - Energy-Aware Scheduling
 *
 * This module provides all the UI components for energy tracking:
 * - Energy visualization (curve, heatmap)
 * - Optional check-in prompts
 * - Task difficulty indicators
 * - Energy-aware task suggestions
 * - Recovery time blocks
 *
 * NO COMPETITOR DOES THIS. THIS MAKES US #1.
 */

class EnergyTrackingUI {
    constructor(options = {}) {
        this.apiEndpoint = options.apiEndpoint || '/api/energy';
        this.container = options.container || document.body;
        this.onEnergyUpdate = options.onEnergyUpdate || (() => {});

        // State
        this.currentEnergy = 0.5;
        this.todayCurve = {};
        this.weeklyHeatmap = {};
        this.pendingRecovery = null;

        // Typing tracker for implicit detection
        this.typingStartTime = null;
        this.typingCharCount = 0;

        // Initialize
        this._initTypingTracker();
        this._loadInitialData();
    }

    // ===== INITIALIZATION =====

    _initTypingTracker() {
        // Track typing speed across the app
        document.addEventListener('keypress', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (!this.typingStartTime) {
                    this.typingStartTime = Date.now();
                }
                this.typingCharCount++;

                // Report every 50 characters
                if (this.typingCharCount >= 50) {
                    const elapsed = (Date.now() - this.typingStartTime) / 1000;
                    this._reportTypingSpeed(this.typingCharCount, elapsed);
                    this.typingStartTime = null;
                    this.typingCharCount = 0;
                }
            }
        });
    }

    async _loadInitialData() {
        try {
            const response = await fetch(`${this.apiEndpoint}/status`);
            if (response.ok) {
                const data = await response.json();
                this.currentEnergy = data.current_energy?.current_level || 0.5;
                this.todayCurve = data.today_curve || {};
                this.onEnergyUpdate(this.currentEnergy);
            }
        } catch (error) {
            console.log('[EnergyUI] Initial data load failed, using defaults');
        }
    }

    async _reportTypingSpeed(chars, seconds) {
        try {
            await fetch(`${this.apiEndpoint}/typing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chars_typed: chars, seconds_elapsed: seconds })
            });
        } catch (error) {
            // Silent fail - don't disrupt user
        }
    }

    // ===== ENERGY VISUALIZATION =====

    /**
     * Create the main energy display widget
     * Shows current energy level with visual bar
     */
    createEnergyWidget(containerId = 'energy-widget') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const energyPct = Math.round(this.currentEnergy * 100);
        const energyColor = this._getEnergyColor(this.currentEnergy);
        const peakInfo = this._getPeakInfo();

        container.innerHTML = `
            <div class="energy-widget" data-energy="${energyPct}">
                <div class="energy-header">
                    <span class="energy-label">Energy Now</span>
                    <span class="energy-value">${energyPct}%</span>
                </div>
                <div class="energy-bar-container">
                    <div class="energy-bar" style="width: ${energyPct}%; background-color: ${energyColor}"></div>
                </div>
                <div class="energy-footer">
                    ${peakInfo}
                </div>
            </div>
        `;

        // Add styles if not already present
        this._injectStyles();
    }

    /**
     * Create the daily energy curve visualization
     * Shows predicted energy throughout the day
     */
    createEnergyCurve(containerId = 'energy-curve') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentHour = new Date().getHours();
        const hours = Object.keys(this.todayCurve.hourly_levels || {}).map(Number);
        const levels = this.todayCurve.hourly_levels || {};
        const peakHours = this.todayCurve.peak_hours || [];
        const dipHours = this.todayCurve.dip_hours || [];

        // Create SVG curve
        const width = container.offsetWidth || 400;
        const height = 120;
        const padding = 20;

        // Generate path data
        let pathData = '';
        const activeHours = [];

        for (let h = 6; h <= 22; h++) {
            const x = padding + ((h - 6) / 16) * (width - 2 * padding);
            const level = levels[h] || this._getDefaultEnergy(h);
            const y = height - padding - (level * (height - 2 * padding));

            if (pathData === '') {
                pathData = `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }

            activeHours.push({ hour: h, x, y, level, isPeak: peakHours.includes(h), isDip: dipHours.includes(h) });
        }

        // Find current position
        const currentX = padding + ((currentHour - 6) / 16) * (width - 2 * padding);
        const currentLevel = levels[currentHour] || this._getDefaultEnergy(currentHour);
        const currentY = height - padding - (currentLevel * (height - 2 * padding));

        container.innerHTML = `
            <div class="energy-curve-container">
                <div class="energy-curve-header">
                    <span class="curve-title">Your Energy Today</span>
                    <span class="curve-subtitle">Peak windows: ${peakHours.map(h => h + ':00').join(', ')}</span>
                </div>
                <svg class="energy-curve-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                    <!-- Grid lines -->
                    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#e0e0e0" stroke-width="1"/>
                    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e0e0e0" stroke-width="1"/>

                    <!-- Energy curve -->
                    <path d="${pathData}" fill="none" stroke="#4a90d9" stroke-width="2"/>

                    <!-- Current position marker -->
                    <circle cx="${currentX}" cy="${currentY}" r="6" fill="#4a90d9"/>
                    <text x="${currentX}" y="${currentY - 12}" text-anchor="middle" class="current-marker-text">YOU ARE HERE</text>

                    <!-- Peak markers -->
                    ${activeHours.filter(h => h.isPeak).map(h => `
                        <circle cx="${h.x}" cy="${h.y}" r="4" fill="#22c55e"/>
                    `).join('')}

                    <!-- Dip markers -->
                    ${activeHours.filter(h => h.isDip).map(h => `
                        <circle cx="${h.x}" cy="${h.y}" r="4" fill="#f59e0b"/>
                    `).join('')}
                </svg>
                <div class="curve-legend">
                    <span class="legend-item"><span class="dot peak"></span>Peak hours</span>
                    <span class="legend-item"><span class="dot dip"></span>Expected dip</span>
                </div>
            </div>
        `;
    }

    /**
     * Create weekly energy heatmap
     * Shows patterns across the week
     */
    createWeeklyHeatmap(containerId = 'energy-heatmap') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hours = [6, 9, 12, 15, 18, 21];
        const heatmap = this.weeklyHeatmap.heatmap || {};

        let gridHTML = '<div class="heatmap-grid">';

        // Header row
        gridHTML += '<div class="heatmap-cell header"></div>';
        days.forEach(day => {
            gridHTML += `<div class="heatmap-cell header">${day}</div>`;
        });

        // Data rows
        hours.forEach(hour => {
            gridHTML += `<div class="heatmap-cell header">${hour}:00</div>`;
            for (let day = 0; day < 7; day++) {
                const level = (heatmap[day] || {})[hour] || this._getDefaultEnergy(hour);
                const color = this._getEnergyColor(level);
                const intensity = level > 0.7 ? 'high' : level > 0.4 ? 'medium' : 'low';
                gridHTML += `<div class="heatmap-cell data ${intensity}" style="background-color: ${color}" title="${Math.round(level * 100)}%"></div>`;
            }
        });

        gridHTML += '</div>';

        const bestDay = this.weeklyHeatmap.best_deep_work_day;
        const bestDayName = bestDay !== undefined ? days[bestDay] : 'N/A';

        container.innerHTML = `
            <div class="heatmap-container">
                <div class="heatmap-header">
                    <span class="heatmap-title">Weekly Energy Patterns</span>
                    <span class="heatmap-insight">Best deep work day: <strong>${bestDayName}</strong></span>
                </div>
                ${gridHTML}
                <div class="heatmap-legend">
                    <span class="legend-low">Low</span>
                    <div class="legend-gradient"></div>
                    <span class="legend-high">High</span>
                </div>
            </div>
        `;
    }

    // ===== OPTIONAL CHECK-IN UI =====

    /**
     * Show morning energy check-in
     * Non-intrusive, always skippable
     */
    showMorningCheckin() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'energy-checkin-modal';
        modal.innerHTML = `
            <div class="checkin-content">
                <div class="checkin-header">
                    <span class="checkin-greeting">Good morning!</span>
                    <span class="checkin-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>

                <div class="checkin-question">
                    <p>How are you feeling?</p>
                    <div class="energy-options">
                        <button class="energy-option" data-value="1">
                            <span class="energy-emoji">exhausted_face</span>
                            <span class="energy-label">Very Low</span>
                        </button>
                        <button class="energy-option" data-value="2">
                            <span class="energy-emoji">weary_face</span>
                            <span class="energy-label">Low</span>
                        </button>
                        <button class="energy-option" data-value="3">
                            <span class="energy-emoji">neutral_face</span>
                            <span class="energy-label">Normal</span>
                        </button>
                        <button class="energy-option" data-value="4">
                            <span class="energy-emoji">smile</span>
                            <span class="energy-label">Good</span>
                        </button>
                        <button class="energy-option" data-value="5">
                            <span class="energy-emoji">star_struck</span>
                            <span class="energy-label">Great</span>
                        </button>
                    </div>
                </div>

                <div class="checkin-question sleep-question" style="display: none;">
                    <p>Sleep quality last night?</p>
                    <div class="sleep-options">
                        <button class="sleep-option" data-value="1">Poor</button>
                        <button class="sleep-option" data-value="2">Fair</button>
                        <button class="sleep-option" data-value="3">Good</button>
                        <button class="sleep-option" data-value="4">Great</button>
                    </div>
                </div>

                <div class="checkin-actions">
                    <button class="btn-skip">Skip</button>
                    <button class="btn-save" style="display: none;">Save & View Day</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle interactions
        let selectedEnergy = null;
        let selectedSleep = null;

        modal.querySelectorAll('.energy-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.energy-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedEnergy = parseInt(btn.dataset.value);
                modal.querySelector('.sleep-question').style.display = 'block';
                modal.querySelector('.btn-save').style.display = 'inline-block';
            });
        });

        modal.querySelectorAll('.sleep-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.sleep-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSleep = parseInt(btn.dataset.value);
            });
        });

        modal.querySelector('.btn-skip').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.btn-save').addEventListener('click', async () => {
            if (selectedEnergy) {
                await this.submitCheckin(selectedEnergy, selectedSleep);
                modal.remove();
            }
        });
    }

    /**
     * Show post-task energy rating (non-blocking toast)
     */
    showPostTaskRating(taskId, taskTitle) {
        const toast = document.createElement('div');
        toast.className = 'energy-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <p class="toast-title">How was your energy during that task?</p>
                <div class="toast-options">
                    <button class="toast-option" data-value="low">Low</button>
                    <button class="toast-option" data-value="medium">Medium</button>
                    <button class="toast-option" data-value="high">High</button>
                    <button class="toast-skip">Skip</button>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto-dismiss after 10 seconds
        const autoDismiss = setTimeout(() => toast.remove(), 10000);

        toast.querySelectorAll('.toast-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                clearTimeout(autoDismiss);
                await this.submitTaskRating(taskId, btn.dataset.value);
                toast.remove();
            });
        });

        toast.querySelector('.toast-skip').addEventListener('click', () => {
            clearTimeout(autoDismiss);
            toast.remove();
        });
    }

    async submitCheckin(energyLevel, sleepQuality = null) {
        try {
            const response = await fetch(`${this.apiEndpoint}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ energy_level: energyLevel, sleep_quality: sleepQuality })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentEnergy = data.level || this.currentEnergy;
                this.onEnergyUpdate(this.currentEnergy);
            }
        } catch (error) {
            console.error('[EnergyUI] Checkin submission failed:', error);
        }
    }

    async submitTaskRating(taskId, energyDuring) {
        try {
            await fetch(`${this.apiEndpoint}/task-rating`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId, energy_during: energyDuring })
            });
        } catch (error) {
            console.error('[EnergyUI] Task rating submission failed:', error);
        }
    }

    // ===== TASK DIFFICULTY INDICATORS =====

    /**
     * Create difficulty indicator for a task
     */
    createDifficultyIndicator(difficulty, size = 'normal') {
        const colors = {
            1: '#22c55e', // Easy - Green
            2: '#3b82f6', // Light - Blue
            3: '#f59e0b', // Medium - Yellow
            4: '#f97316', // Hard - Orange
            5: '#ef4444'  // Intense - Red
        };

        const labels = {
            1: 'Easy',
            2: 'Light',
            3: 'Medium',
            4: 'Hard',
            5: 'Intense'
        };

        const color = colors[difficulty] || colors[3];
        const label = labels[difficulty] || 'Medium';

        return `
            <div class="difficulty-indicator ${size}" title="${label} difficulty">
                ${[1,2,3,4,5].map(i => `
                    <span class="difficulty-bar ${i <= difficulty ? 'filled' : ''}" style="${i <= difficulty ? `background-color: ${color}` : ''}"></span>
                `).join('')}
                <span class="difficulty-label">${label}</span>
            </div>
        `;
    }

    /**
     * Add difficulty indicator to a task element
     */
    addDifficultyToTask(taskElement, difficulty) {
        const indicator = this.createDifficultyIndicator(difficulty);
        const wrapper = document.createElement('div');
        wrapper.className = 'task-difficulty-wrapper';
        wrapper.innerHTML = indicator;
        taskElement.appendChild(wrapper);
    }

    // ===== ENERGY-AWARE SUGGESTIONS =====

    /**
     * Create energy-aware task suggestions panel
     */
    createSuggestionsPanel(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const energyPct = Math.round(this.currentEnergy * 100);
        const isLowEnergy = this.currentEnergy < 0.4;

        container.innerHTML = `
            <div class="suggestions-panel ${isLowEnergy ? 'low-energy-mode' : ''}">
                <div class="suggestions-header">
                    <span class="suggestions-title">${isLowEnergy ? 'Easy Wins (Low Energy Mode)' : 'Suggested for Now'}</span>
                    <span class="energy-badge">Energy: ${energyPct}%</span>
                </div>
                <div class="suggestions-list">
                    ${tasks.map(task => this._createSuggestionItem(task)).join('')}
                </div>
                ${isLowEnergy ? `
                    <div class="low-energy-notice">
                        <p>Your energy is low. Here are some easy tasks that still move you forward.</p>
                        <button class="btn-show-all">Show all tasks</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    _createSuggestionItem(task) {
        const matchPct = Math.round((task.match_score || 0.5) * 100);
        const matchClass = matchPct >= 70 ? 'good-match' : matchPct >= 50 ? 'ok-match' : 'poor-match';

        return `
            <div class="suggestion-item ${matchClass}">
                <div class="suggestion-main">
                    ${this.createDifficultyIndicator(task.task?.difficulty || 3, 'small')}
                    <span class="suggestion-title">${task.task?.title || 'Task'}</span>
                </div>
                <div class="suggestion-meta">
                    <span class="match-score">${matchPct}% match</span>
                    <span class="timing">${task.timing_recommendation || ''}</span>
                </div>
                <div class="suggestion-reasoning">${task.reasoning || ''}</div>
            </div>
        `;
    }

    // ===== RECOVERY TIME BLOCKS =====

    /**
     * Show recovery suggestion prompt
     */
    showRecoverySuggestion(block) {
        if (!block) return;

        const modal = document.createElement('div');
        modal.className = 'recovery-modal';
        modal.innerHTML = `
            <div class="recovery-content">
                <div class="recovery-header">
                    <span class="recovery-icon">break_icon</span>
                    <span class="recovery-title">Recovery Suggested</span>
                </div>
                <div class="recovery-body">
                    <p class="recovery-reason">${block.reason}</p>
                    <p class="recovery-duration">Suggested: ${block.duration_minutes} minutes</p>
                </div>
                <div class="recovery-suggestions">
                    <p>Suggestions for your break:</p>
                    <ul>
                        ${(block.suggestions || []).map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="recovery-actions">
                    <button class="btn-start-break" data-id="${block.id}">Start Recovery Break</button>
                    <button class="btn-later">I'll take one later</button>
                    <button class="btn-skip-recovery">Skip</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.btn-start-break').addEventListener('click', async () => {
            await this.acceptRecovery(block.id);
            this.showRecoveryTimer(block.duration_minutes);
            modal.remove();
        });

        modal.querySelector('.btn-later').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.btn-skip-recovery').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Show recovery timer
     */
    showRecoveryTimer(durationMinutes) {
        let secondsRemaining = durationMinutes * 60;

        const timer = document.createElement('div');
        timer.className = 'recovery-timer';
        timer.innerHTML = `
            <div class="timer-content">
                <div class="timer-header">Recovery Time</div>
                <div class="timer-display">${this._formatTime(secondsRemaining)}</div>
                <div class="timer-message">Take this time to rest and recharge.</div>
                <button class="btn-end-break">End Break Early</button>
            </div>
        `;

        document.body.appendChild(timer);

        const interval = setInterval(() => {
            secondsRemaining--;
            timer.querySelector('.timer-display').textContent = this._formatTime(secondsRemaining);

            if (secondsRemaining <= 0) {
                clearInterval(interval);
                this._playNotification();
                timer.remove();
            }
        }, 1000);

        timer.querySelector('.btn-end-break').addEventListener('click', () => {
            clearInterval(interval);
            timer.remove();
        });
    }

    async acceptRecovery(blockId) {
        try {
            await fetch(`${this.apiEndpoint}/recovery/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block_id: blockId })
            });
        } catch (error) {
            console.error('[EnergyUI] Recovery acceptance failed:', error);
        }
    }

    // ===== HELPERS =====

    _getEnergyColor(level) {
        if (level >= 0.8) return '#22c55e';      // Green - great
        if (level >= 0.6) return '#84cc16';      // Light green - good
        if (level >= 0.4) return '#f59e0b';      // Yellow - normal
        if (level >= 0.2) return '#f97316';      // Orange - low
        return '#ef4444';                         // Red - very low
    }

    _getDefaultEnergy(hour) {
        const defaults = {
            0: 0.15, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.10, 5: 0.20,
            6: 0.40, 7: 0.60, 8: 0.80, 9: 0.90, 10: 1.00, 11: 0.95,
            12: 0.70, 13: 0.60, 14: 0.65, 15: 0.75, 16: 0.80, 17: 0.70,
            18: 0.55, 19: 0.45, 20: 0.35, 21: 0.30, 22: 0.25, 23: 0.20
        };
        return defaults[hour] || 0.5;
    }

    _getPeakInfo() {
        const peakHours = this.todayCurve.peak_hours || [];
        const currentHour = new Date().getHours();

        for (const peak of peakHours) {
            if (peak > currentHour) {
                return `Peak in ${peak - currentHour} hour${peak - currentHour > 1 ? 's' : ''}`;
            }
        }
        return 'No more peaks today';
    }

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    _playNotification() {
        // Simple notification sound (could be replaced with actual audio)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Break Complete', { body: 'Time to get back to work!' });
        }
    }

    _injectStyles() {
        if (document.getElementById('energy-tracking-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'energy-tracking-styles';
        styles.textContent = `
            /* Energy Widget */
            .energy-widget {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .energy-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .energy-label {
                font-size: 14px;
                color: #666;
            }
            .energy-value {
                font-size: 24px;
                font-weight: bold;
            }
            .energy-bar-container {
                background: #e5e7eb;
                border-radius: 4px;
                height: 8px;
                overflow: hidden;
            }
            .energy-bar {
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            .energy-footer {
                margin-top: 8px;
                font-size: 12px;
                color: #888;
            }

            /* Energy Curve */
            .energy-curve-container {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .energy-curve-header {
                margin-bottom: 12px;
            }
            .curve-title {
                font-weight: 600;
                display: block;
            }
            .curve-subtitle {
                font-size: 12px;
                color: #888;
            }
            .current-marker-text {
                font-size: 10px;
                fill: #4a90d9;
            }
            .curve-legend {
                display: flex;
                gap: 16px;
                margin-top: 8px;
                font-size: 12px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .dot.peak { background: #22c55e; }
            .dot.dip { background: #f59e0b; }

            /* Heatmap */
            .heatmap-container {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .heatmap-header {
                margin-bottom: 12px;
            }
            .heatmap-title {
                font-weight: 600;
            }
            .heatmap-insight {
                display: block;
                font-size: 12px;
                color: #888;
            }
            .heatmap-grid {
                display: grid;
                grid-template-columns: 50px repeat(7, 1fr);
                gap: 2px;
            }
            .heatmap-cell {
                padding: 8px 4px;
                text-align: center;
                font-size: 11px;
                border-radius: 4px;
            }
            .heatmap-cell.header {
                font-weight: 500;
                color: #666;
            }
            .heatmap-cell.data {
                min-height: 24px;
            }
            .heatmap-legend {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 12px;
                font-size: 11px;
                color: #888;
            }
            .legend-gradient {
                flex: 1;
                height: 8px;
                background: linear-gradient(to right, #ef4444, #f59e0b, #22c55e);
                border-radius: 4px;
            }

            /* Check-in Modal */
            .energy-checkin-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .checkin-content {
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
            }
            .checkin-header {
                text-align: center;
                margin-bottom: 24px;
            }
            .checkin-greeting {
                font-size: 24px;
                font-weight: 600;
                display: block;
            }
            .checkin-date {
                color: #888;
                font-size: 14px;
            }
            .checkin-question p {
                margin-bottom: 12px;
                font-weight: 500;
            }
            .energy-options {
                display: flex;
                gap: 8px;
                justify-content: center;
            }
            .energy-option {
                background: #f3f4f6;
                border: 2px solid transparent;
                border-radius: 12px;
                padding: 12px 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            .energy-option:hover {
                background: #e5e7eb;
            }
            .energy-option.selected {
                border-color: #4a90d9;
                background: #e0edff;
            }
            .energy-emoji {
                font-size: 24px;
            }
            .energy-label {
                font-size: 11px;
                color: #666;
            }
            .sleep-options {
                display: flex;
                gap: 8px;
                justify-content: center;
            }
            .sleep-option {
                background: #f3f4f6;
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 8px 16px;
                cursor: pointer;
            }
            .sleep-option.selected {
                border-color: #4a90d9;
                background: #e0edff;
            }
            .checkin-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 24px;
            }
            .btn-skip {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
            }
            .btn-save {
                background: #4a90d9;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                cursor: pointer;
            }

            /* Post-task toast */
            .energy-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 9999;
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .toast-title {
                margin: 0 0 12px 0;
                font-weight: 500;
            }
            .toast-options {
                display: flex;
                gap: 8px;
            }
            .toast-option {
                background: #f3f4f6;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
            }
            .toast-option:hover {
                background: #e5e7eb;
            }
            .toast-skip {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
            }

            /* Difficulty Indicator */
            .difficulty-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .difficulty-indicator.small {
                transform: scale(0.8);
            }
            .difficulty-bar {
                width: 4px;
                height: 12px;
                background: #e5e7eb;
                border-radius: 2px;
            }
            .difficulty-bar.filled {
                background: currentColor;
            }
            .difficulty-label {
                font-size: 11px;
                margin-left: 4px;
                color: #666;
            }

            /* Suggestions Panel */
            .suggestions-panel {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .suggestions-panel.low-energy-mode {
                border: 2px solid #f59e0b;
            }
            .suggestions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .suggestions-title {
                font-weight: 600;
            }
            .energy-badge {
                background: #f3f4f6;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            .suggestion-item {
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 8px;
                background: #f9fafb;
            }
            .suggestion-item.good-match {
                border-left: 3px solid #22c55e;
            }
            .suggestion-item.ok-match {
                border-left: 3px solid #f59e0b;
            }
            .suggestion-item.poor-match {
                border-left: 3px solid #ef4444;
            }
            .suggestion-main {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .suggestion-title {
                font-weight: 500;
            }
            .suggestion-meta {
                display: flex;
                gap: 12px;
                margin-top: 4px;
                font-size: 12px;
                color: #888;
            }
            .match-score {
                color: #22c55e;
            }
            .suggestion-reasoning {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
            }
            .low-energy-notice {
                background: #fef3c7;
                padding: 12px;
                border-radius: 8px;
                margin-top: 12px;
            }
            .low-energy-notice p {
                margin: 0 0 8px 0;
                font-size: 13px;
            }
            .btn-show-all {
                background: none;
                border: none;
                color: #4a90d9;
                cursor: pointer;
                font-size: 13px;
            }

            /* Recovery Modal */
            .recovery-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .recovery-content {
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
            }
            .recovery-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .recovery-icon {
                font-size: 32px;
            }
            .recovery-title {
                font-size: 20px;
                font-weight: 600;
            }
            .recovery-reason {
                margin-bottom: 8px;
            }
            .recovery-duration {
                color: #4a90d9;
                font-weight: 500;
            }
            .recovery-suggestions ul {
                margin: 8px 0;
                padding-left: 20px;
            }
            .recovery-suggestions li {
                margin: 4px 0;
            }
            .recovery-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 20px;
            }
            .btn-start-break {
                background: #4a90d9;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 16px;
                cursor: pointer;
            }
            .btn-later, .btn-skip-recovery {
                background: #f3f4f6;
                border: none;
                border-radius: 8px;
                padding: 10px 16px;
                cursor: pointer;
            }

            /* Recovery Timer */
            .recovery-timer {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .timer-content {
                text-align: center;
                color: white;
            }
            .timer-header {
                font-size: 24px;
                opacity: 0.9;
                margin-bottom: 20px;
            }
            .timer-display {
                font-size: 72px;
                font-weight: 300;
                margin-bottom: 20px;
            }
            .timer-message {
                opacity: 0.8;
                margin-bottom: 40px;
            }
            .btn-end-break {
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnergyTrackingUI;
}

// Global instance
window.EnergyTrackingUI = EnergyTrackingUI;
