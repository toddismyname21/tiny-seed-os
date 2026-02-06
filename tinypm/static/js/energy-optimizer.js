/**
 * TinyPM Energy Optimizer - Circadian-Aware Task Scheduling
 * =========================================================
 * Phase 2: Visual energy tracking and task-energy matching
 *
 * Features:
 * - Energy curve visualization (battery-style meter)
 * - Task cards with energy match indicators (green/yellow/red)
 * - Drag-to-reschedule with energy feedback
 * - User profile configuration
 *
 * Created: 2026-02-04
 * Author: PM_Architect Claude (Phase 2)
 */

const EnergyOptimizer = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        storageKey: 'tinypm_energy_profile',
        updateInterval: 60000, // Update every minute
        animationDuration: 300
    },

    // Energy profiles matching backend
    PROFILES: {
        morning_person: {
            name: 'Morning Person',
            description: 'Peak energy in early morning',
            peaks: [{ start: 6, end: 10, level: 95 }, { start: 14, end: 16, level: 70 }],
            dips: [{ start: 12, end: 14, level: 40 }, { start: 20, end: 23, level: 30 }],
            baseline: 60
        },
        farmer_default: {
            name: 'Farmer (Early Riser)',
            description: 'Adapted for farm work - early peak, heat avoidance',
            peaks: [{ start: 5, end: 8, level: 100 }, { start: 17, end: 19, level: 80 }],
            dips: [{ start: 12, end: 15, level: 35 }, { start: 21, end: 23, level: 25 }],
            baseline: 55
        },
        night_owl: {
            name: 'Night Owl',
            description: 'Peak energy in late morning and evening',
            peaks: [{ start: 10, end: 13, level: 85 }, { start: 19, end: 23, level: 95 }],
            dips: [{ start: 6, end: 9, level: 30 }, { start: 14, end: 17, level: 50 }],
            baseline: 55
        }
    },

    // Task energy requirements
    TASK_REQUIREMENTS: {
        planning: 'high', email_triage: 'high', harvesting: 'high',
        transplanting: 'high', budget_review: 'high', seeding: 'high',
        customer_calls: 'moderate', market_prep: 'moderate', delivery: 'moderate',
        watering: 'low', weeding: 'low', data_entry: 'low', cleaning: 'low'
    },

    // State
    state: {
        profile: 'farmer_default',
        currentEnergy: null,
        updateTimer: null
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.loadProfile();
        this.injectStyles();
        this.updateEnergyState();
        this.renderAll();
        this.startAutoUpdate();
        console.log('[EnergyOptimizer] Initialized with profile:', this.state.profile);
    },

    renderAll() {
        this.renderEnergyMeter();
        this.renderEnergyCurve();
        this.renderRecommendations();
    },

    renderRecommendations() {
        const container = document.getElementById('energy-recommendations');
        if (!container) return;

        const energy = this.state.currentEnergy;
        if (!energy) return;

        let goodTasks = [];
        let avoidTasks = [];

        if (energy.level === 'peak') {
            goodTasks = ['Complex planning', 'Important decisions', 'Harvesting'];
            avoidTasks = ['Routine data entry', 'Simple watering'];
        } else if (energy.level === 'moderate') {
            goodTasks = ['Customer calls', 'Team meetings', 'Market prep'];
            avoidTasks = ['Deep strategic planning'];
        } else if (energy.level === 'dip') {
            goodTasks = ['Watering', 'Weeding', 'Data entry', 'Cleanup'];
            avoidTasks = ['Complex decisions', 'Difficult conversations'];
        } else {
            goodTasks = ['Light admin', 'Organizing', 'Planning tomorrow'];
            avoidTasks = ['Heavy physical work', 'Critical decisions'];
        }

        container.innerHTML = `
            <div class="energy-rec-item energy-rec-good">
                <span>Good now:</span>
                <span>${goodTasks.slice(0, 2).join(', ')}</span>
            </div>
            <div class="energy-rec-item energy-rec-avoid">
                <span>Save for later:</span>
                <span>${avoidTasks.slice(0, 2).join(', ')}</span>
            </div>
        `;
    },

    loadProfile() {
        try {
            const saved = localStorage.getItem(this.config.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.state.profile = data.profile || 'farmer_default';
            }
        } catch (e) {
            console.warn('[EnergyOptimizer] Could not load profile:', e);
        }
    },

    saveProfile(profileName) {
        this.state.profile = profileName;
        localStorage.setItem(this.config.storageKey, JSON.stringify({
            profile: profileName,
            updated: new Date().toISOString()
        }));
        this.updateEnergyState();
        this.renderAll();
    },

    // =========================================================================
    // ENERGY CALCULATION
    // =========================================================================
    calculateEnergyAtHour(hour, profile) {
        const p = this.PROFILES[profile] || this.PROFILES.farmer_default;

        // Check peaks
        for (const peak of p.peaks) {
            if (hour >= peak.start && hour < peak.end) return peak.level;
        }

        // Check dips
        for (const dip of p.dips) {
            if (hour >= dip.start && hour < dip.end) return dip.level;
        }

        return p.baseline;
    },

    updateEnergyState() {
        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const energy = this.calculateEnergyAtHour(hour, this.state.profile);

        // Calculate trend
        const pastEnergy = this.calculateEnergyAtHour(hour - 0.5, this.state.profile);
        const futureEnergy = this.calculateEnergyAtHour(hour + 0.5, this.state.profile);

        let trend = 'stable';
        if (futureEnergy > energy + 5) trend = 'rising';
        else if (futureEnergy < energy - 5) trend = 'falling';

        // Determine level
        let level = 'moderate';
        if (energy >= 80) level = 'peak';
        else if (energy >= 60) level = 'moderate';
        else if (energy >= 40) level = 'recovery';
        else level = 'dip';

        this.state.currentEnergy = {
            percentage: Math.round(energy),
            level: level,
            trend: trend,
            hour: hour,
            timestamp: now.toISOString()
        };

        return this.state.currentEnergy;
    },

    // =========================================================================
    // TASK MATCHING
    // =========================================================================
    getTaskEnergyMatch(task) {
        const energy = this.state.currentEnergy || this.updateEnergyState();
        const taskType = (task.task_type || task.type || 'general').toLowerCase();
        const requirement = this.TASK_REQUIREMENTS[taskType] || 'moderate';

        // Calculate match score (0-1)
        let score = 0.5;

        if (requirement === 'high') {
            if (energy.level === 'peak') score = 1.0;
            else if (energy.level === 'moderate') score = 0.6;
            else if (energy.level === 'recovery') score = 0.35;
            else score = 0.15;
        } else if (requirement === 'moderate') {
            if (energy.level === 'peak') score = 0.8;
            else if (energy.level === 'moderate') score = 1.0;
            else if (energy.level === 'recovery') score = 0.7;
            else score = 0.4;
        } else if (requirement === 'low') {
            if (energy.level === 'peak') score = 0.4;
            else if (energy.level === 'moderate') score = 0.7;
            else if (energy.level === 'recovery') score = 0.9;
            else score = 1.0; // Perfect for dip
        }

        return {
            score: score,
            requirement: requirement,
            energyLevel: energy.level,
            class: score >= 0.7 ? 'energy-good' : score >= 0.4 ? 'energy-okay' : 'energy-poor',
            label: score >= 0.7 ? 'Good fit' : score >= 0.4 ? 'Moderate fit' : 'Poor fit'
        };
    },

    suggestBestTime(task) {
        const taskType = (task.task_type || task.type || 'general').toLowerCase();
        const requirement = this.TASK_REQUIREMENTS[taskType] || 'moderate';
        const profile = this.PROFILES[this.state.profile];

        if (requirement === 'high') {
            const peak = profile.peaks[0];
            return `Best during ${this.formatHour(peak.start)}-${this.formatHour(peak.end)} (your peak energy)`;
        } else if (requirement === 'low') {
            const dip = profile.dips[0];
            return `Good during ${this.formatHour(dip.start)}-${this.formatHour(dip.end)} (save peak for harder tasks)`;
        }
        return 'Flexible timing';
    },

    formatHour(hour) {
        const h = Math.floor(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${h12}${ampm}`;
    },

    // =========================================================================
    // UI COMPONENTS
    // =========================================================================
    renderEnergyMeter(containerId = 'energy-meter-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const energy = this.state.currentEnergy || this.updateEnergyState();
        const profile = this.PROFILES[this.state.profile];

        // Determine color based on level
        let color, bgColor, label;
        if (energy.level === 'peak') {
            color = '#22c55e'; bgColor = 'rgba(34, 197, 94, 0.2)'; label = 'Peak';
        } else if (energy.level === 'moderate') {
            color = '#3b82f6'; bgColor = 'rgba(59, 130, 246, 0.2)'; label = 'Moderate';
        } else if (energy.level === 'recovery') {
            color = '#f59e0b'; bgColor = 'rgba(245, 158, 11, 0.2)'; label = 'Recovery';
        } else {
            color = '#ef4444'; bgColor = 'rgba(239, 68, 68, 0.2)'; label = 'Low';
        }

        // Trend indicator
        const trendIcon = energy.trend === 'rising' ? '\u2197' :
                          energy.trend === 'falling' ? '\u2198' : '\u2192';

        container.innerHTML = `
            <div class="energy-meter" data-level="${energy.level}">
                <div class="energy-meter-bar">
                    <div class="energy-meter-fill" style="width: ${energy.percentage}%; background: ${color};"></div>
                </div>
                <div class="energy-meter-info">
                    <span class="energy-level-badge" style="background: ${bgColor}; color: ${color};">
                        ${label} ${trendIcon}
                    </span>
                    <span class="energy-percentage">${energy.percentage}%</span>
                </div>
                <div class="energy-profile-name">${profile.name}</div>
            </div>
        `;
    },

    renderEnergyCurve(containerId = 'energy-curve-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const profile = this.PROFILES[this.state.profile];
        const currentHour = new Date().getHours();

        // Generate 24-hour curve points
        let points = [];
        for (let h = 0; h < 24; h++) {
            const energy = this.calculateEnergyAtHour(h, this.state.profile);
            points.push({ hour: h, energy: energy });
        }

        // Create SVG curve
        const width = container.offsetWidth || 300;
        const height = 60;
        const padding = 10;

        const xScale = (width - padding * 2) / 23;
        const yScale = (height - padding * 2) / 100;

        let pathD = `M ${padding} ${height - padding - points[0].energy * yScale}`;
        for (let i = 1; i < points.length; i++) {
            const x = padding + i * xScale;
            const y = height - padding - points[i].energy * yScale;
            pathD += ` L ${x} ${y}`;
        }

        // Current time marker
        const currentX = padding + currentHour * xScale;
        const currentY = height - padding - this.state.currentEnergy.percentage * yScale;

        container.innerHTML = `
            <svg class="energy-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(99, 102, 241, 0.3)"/>
                        <stop offset="100%" stop-color="rgba(99, 102, 241, 0)"/>
                    </linearGradient>
                </defs>
                <path d="${pathD} V ${height - padding} H ${padding} Z" fill="url(#energyGradient)" stroke="none"/>
                <path d="${pathD}" fill="none" stroke="#6366f1" stroke-width="2"/>
                <circle cx="${currentX}" cy="${currentY}" r="5" fill="#6366f1" stroke="white" stroke-width="2">
                    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/>
                </circle>
            </svg>
            <div class="energy-curve-labels">
                <span>6AM</span>
                <span>12PM</span>
                <span>6PM</span>
                <span>12AM</span>
            </div>
        `;
    },

    addEnergyIndicatorToTask(taskElement, task) {
        const match = this.getTaskEnergyMatch(task);

        // Add energy indicator
        let indicator = taskElement.querySelector('.energy-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'energy-indicator';
            const meta = taskElement.querySelector('.task-meta') || taskElement;
            meta.appendChild(indicator);
        }

        indicator.className = `energy-indicator ${match.class}`;
        indicator.innerHTML = `
            <span class="energy-dot"></span>
            <span class="energy-label">${match.label}</span>
        `;
        indicator.title = this.suggestBestTime(task);

        // Add glow effect based on match
        taskElement.classList.remove('energy-glow-good', 'energy-glow-okay', 'energy-glow-poor');
        taskElement.classList.add(`energy-glow-${match.class.replace('energy-', '')}`);
    },

    // =========================================================================
    // PROFILE CONFIGURATION MODAL
    // =========================================================================
    showProfileModal() {
        // Remove existing modal
        const existing = document.getElementById('energy-profile-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'energy-profile-modal';
        modal.className = 'energy-profile-modal';

        const profiles = Object.entries(this.PROFILES).map(([key, p]) => {
            const isSelected = key === this.state.profile;
            return `
                <button class="energy-profile-option ${isSelected ? 'selected' : ''}"
                        onclick="EnergyOptimizer.selectProfile('${key}')">
                    <div class="profile-option-name">${p.name}</div>
                    <div class="profile-option-desc">${p.description}</div>
                    ${isSelected ? '<span class="profile-check">Selected</span>' : ''}
                </button>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="energy-profile-content">
                <div class="energy-profile-header">
                    <h3>Energy Profile</h3>
                    <button class="energy-profile-close" onclick="EnergyOptimizer.closeProfileModal()">X</button>
                </div>
                <p class="energy-profile-intro">
                    Choose the profile that best matches your natural energy patterns.
                    TinyPM will optimize task scheduling based on your circadian rhythm.
                </p>
                <div class="energy-profile-options">
                    ${profiles}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('visible'));
    },

    selectProfile(profileName) {
        this.saveProfile(profileName);
        this.closeProfileModal();
        this.showToast(`Profile changed to ${this.PROFILES[profileName].name}`);
    },

    closeProfileModal() {
        const modal = document.getElementById('energy-profile-modal');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), this.config.animationDuration);
        }
    },

    // =========================================================================
    // AUTO-UPDATE
    // =========================================================================
    startAutoUpdate() {
        if (this.state.updateTimer) clearInterval(this.state.updateTimer);

        this.state.updateTimer = setInterval(() => {
            this.updateEnergyState();
            this.renderAll();
        }, this.config.updateInterval);
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'energy-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('energy-optimizer-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'energy-optimizer-styles';
        styles.textContent = `
            /* Energy Meter */
            .energy-meter {
                background: var(--bg-card, #1e2130);
                border: 1px solid var(--border, #2a2d3e);
                border-radius: 10px;
                padding: 12px 16px;
                margin-bottom: 12px;
            }

            .energy-meter-bar {
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .energy-meter-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease, background 0.3s ease;
            }

            .energy-meter-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .energy-level-badge {
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }

            .energy-percentage {
                font-size: 14px;
                font-weight: 700;
                color: var(--text-primary, #f0f0f5);
            }

            .energy-profile-name {
                font-size: 11px;
                color: var(--text-muted, #6b6f82);
                margin-top: 6px;
                cursor: pointer;
            }

            .energy-profile-name:hover {
                color: var(--accent, #6366f1);
                text-decoration: underline;
            }

            /* Energy Curve */
            .energy-curve-svg {
                width: 100%;
                height: 60px;
            }

            .energy-curve-labels {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: var(--text-muted, #6b6f82);
                margin-top: 4px;
            }

            /* Task Energy Indicators */
            .energy-indicator {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 600;
            }

            .energy-indicator.energy-good {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .energy-indicator.energy-okay {
                background: rgba(245, 158, 11, 0.15);
                color: #f59e0b;
            }

            .energy-indicator.energy-poor {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }

            .energy-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
            }

            /* Task Card Glow Effects */
            .task-card.energy-glow-good {
                border-color: rgba(34, 197, 94, 0.3);
                box-shadow: 0 0 8px rgba(34, 197, 94, 0.15);
            }

            .task-card.energy-glow-okay {
                border-color: rgba(245, 158, 11, 0.3);
            }

            .task-card.energy-glow-poor {
                border-color: rgba(239, 68, 68, 0.3);
            }

            /* Profile Modal */
            .energy-profile-modal {
                position: fixed;
                inset: 0;
                background: rgba(15, 15, 26, 0.9);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .energy-profile-modal.visible { opacity: 1; }

            .energy-profile-content {
                background: var(--bg-secondary, #1a1d27);
                border: 1px solid var(--border, #2a2d3e);
                border-radius: 16px;
                padding: 24px;
                max-width: 440px;
                width: 90%;
            }

            .energy-profile-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .energy-profile-header h3 {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-primary, #f0f0f5);
            }

            .energy-profile-close {
                background: none;
                border: none;
                color: var(--text-muted, #6b6f82);
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
            }

            .energy-profile-intro {
                font-size: 13px;
                color: var(--text-secondary, #a0a4b8);
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .energy-profile-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .energy-profile-option {
                background: var(--bg-card, #1e2130);
                border: 2px solid var(--border, #2a2d3e);
                border-radius: 12px;
                padding: 16px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
            }

            .energy-profile-option:hover {
                border-color: var(--accent, #6366f1);
                background: var(--bg-hover, #252839);
            }

            .energy-profile-option.selected {
                border-color: var(--accent, #6366f1);
                background: rgba(99, 102, 241, 0.1);
            }

            .profile-option-name {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary, #f0f0f5);
                margin-bottom: 4px;
            }

            .profile-option-desc {
                font-size: 12px;
                color: var(--text-secondary, #a0a4b8);
            }

            .profile-check {
                display: inline-block;
                margin-top: 8px;
                font-size: 11px;
                color: var(--accent, #6366f1);
                font-weight: 600;
            }

            /* Toast */
            .energy-toast {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: var(--bg-card, #1e2130);
                border: 1px solid var(--border, #2a2d3e);
                padding: 12px 20px;
                border-radius: 10px;
                font-size: 13px;
                color: var(--text-primary, #f0f0f5);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 10001;
            }

            .energy-toast.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.EnergyOptimizer = EnergyOptimizer;

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => EnergyOptimizer.init(), 500);
});
