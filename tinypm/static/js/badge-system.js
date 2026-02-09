/**
 * TinyPM Badge/Achievement System
 * ================================
 * Track and celebrate user achievements across Daily, Weekly, Monthly, and Seasonal tiers.
 * Uses localStorage for persistence with optional Google Sheet sync.
 *
 * Usage:
 *   BadgeSystem.init();
 *   BadgeSystem.checkAndUnlock('task_complete', { taskCount: 10 });
 *   BadgeSystem.showBadgePanel();
 *
 * Created: 2026-02-09
 * Author: Desktop_Claude
 */

const BadgeSystem = {
    // ============================================
    // BADGE DEFINITIONS
    // ============================================

    BADGES: {
        // TIER 1: Daily Badges
        EARLY_BIRD: {
            id: 'early_bird',
            name: 'Early Bird',
            icon: '🌅',
            description: 'Complete task before 6 AM (3x)',
            tier: 'daily',
            requirement: 3,
            trackingKey: 'early_completions',
            color: '#f97316'
        },
        TASK_MASTER: {
            id: 'task_master',
            name: 'Task Master',
            icon: '🎯',
            description: 'Complete 10 tasks in a day',
            tier: 'daily',
            requirement: 10,
            trackingKey: 'daily_completions',
            color: '#22c55e'
        },
        PRECISION: {
            id: 'precision',
            name: 'Precision',
            icon: '⏱️',
            description: 'Complete 3 tasks before deadline',
            tier: 'daily',
            requirement: 3,
            trackingKey: 'on_time_completions',
            color: '#3b82f6'
        },

        // TIER 2: Weekly Badges
        SPEED_RUNNER: {
            id: 'speed_runner',
            name: 'Speed Runner',
            icon: '🏃',
            description: 'Complete 20 tasks in a week',
            tier: 'weekly',
            requirement: 20,
            trackingKey: 'weekly_completions',
            color: '#a855f7'
        },
        OVERDELIVERY: {
            id: 'overdelivery',
            name: 'Overdelivery',
            icon: '📈',
            description: 'Complete 150% of assigned tasks',
            tier: 'weekly',
            requirement: 150,
            trackingKey: 'completion_percentage',
            color: '#ec4899'
        },
        CLEAN_SLATE: {
            id: 'clean_slate',
            name: 'Clean Slate',
            icon: '🧹',
            description: 'Zero overdue tasks for full week',
            tier: 'weekly',
            requirement: 7,
            trackingKey: 'clean_days',
            color: '#14b8a6'
        },

        // TIER 3: Monthly Badges
        MOMENTUM: {
            id: 'momentum',
            name: 'Momentum',
            icon: '🔥',
            description: '7-day completion streak',
            tier: 'monthly',
            requirement: 7,
            trackingKey: 'streak_days',
            color: '#ef4444'
        },
        MONTH_MASTER: {
            id: 'month_master',
            name: 'Month Master',
            icon: '👑',
            description: '30-day completion streak',
            tier: 'monthly',
            requirement: 30,
            trackingKey: 'streak_days',
            color: '#eab308'
        },
        FARM_HERO: {
            id: 'farm_hero',
            name: 'Farm Hero',
            icon: '🌾',
            description: '100+ tasks in a month',
            tier: 'monthly',
            requirement: 100,
            trackingKey: 'monthly_completions',
            color: '#84cc16'
        },

        // TIER 4: Seasonal Badges
        SEASON_LEGEND: {
            id: 'season_legend',
            name: 'Season Legend',
            icon: '🏆',
            description: '500+ tasks in a quarter',
            tier: 'seasonal',
            requirement: 500,
            trackingKey: 'quarterly_completions',
            color: '#f59e0b'
        },
        RELIABILITY: {
            id: 'reliability',
            name: 'Reliability',
            icon: '💎',
            description: '90 days without missing a day',
            tier: 'seasonal',
            requirement: 90,
            trackingKey: 'active_days_streak',
            color: '#06b6d4'
        }
    },

    // Tier display order and colors
    TIERS: {
        daily: { name: 'Daily', color: '#f97316', order: 1 },
        weekly: { name: 'Weekly', color: '#a855f7', order: 2 },
        monthly: { name: 'Monthly', color: '#eab308', order: 3 },
        seasonal: { name: 'Seasonal', color: '#06b6d4', order: 4 }
    },

    // ============================================
    // STATE
    // ============================================

    state: {
        unlockedBadges: [],
        badgeProgress: {},
        stats: {
            tasksCompletedToday: 0,
            tasksCompletedThisWeek: 0,
            tasksCompletedThisMonth: 0,
            tasksCompletedThisQuarter: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastCompletionDate: null,
            earlyCompletions: 0,
            onTimeCompletions: 0,
            cleanDays: 0,
            activeDaysStreak: 0
        },
        lastResetDate: null
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.loadState();
        this.checkDateReset();
        this.renderBadgeIndicator();
        console.log('[BadgeSystem] Initialized', {
            unlockedCount: this.state.unlockedBadges.length,
            currentStreak: this.state.stats.currentStreak
        });
    },

    loadState() {
        try {
            const saved = localStorage.getItem('tinypm_badges');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            }
        } catch (e) {
            console.warn('[BadgeSystem] Could not load state:', e);
        }
    },

    saveState() {
        try {
            localStorage.setItem('tinypm_badges', JSON.stringify(this.state));
        } catch (e) {
            console.warn('[BadgeSystem] Could not save state:', e);
        }
    },

    // ============================================
    // DATE RESET LOGIC
    // ============================================

    checkDateReset() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        if (this.state.lastResetDate !== today) {
            const lastDate = this.state.lastResetDate ? new Date(this.state.lastResetDate) : null;

            // Check if streak continues (completed at least one task yesterday)
            if (lastDate) {
                const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDiff > 1) {
                    // Streak broken
                    if (this.state.stats.currentStreak > this.state.stats.bestStreak) {
                        this.state.stats.bestStreak = this.state.stats.currentStreak;
                    }
                    this.state.stats.currentStreak = 0;
                    this.state.stats.activeDaysStreak = 0;
                }
            }

            // Reset daily counters
            this.state.stats.tasksCompletedToday = 0;
            this.state.stats.earlyCompletions = 0;
            this.state.stats.onTimeCompletions = 0;

            // Check for weekly reset (Sunday)
            if (now.getDay() === 0) {
                this.state.stats.tasksCompletedThisWeek = 0;
                this.state.stats.cleanDays = 0;
            }

            // Check for monthly reset (1st of month)
            if (now.getDate() === 1) {
                this.state.stats.tasksCompletedThisMonth = 0;
            }

            // Check for quarterly reset (Jan 1, Apr 1, Jul 1, Oct 1)
            const quarterStarts = [0, 3, 6, 9];
            if (quarterStarts.includes(now.getMonth()) && now.getDate() === 1) {
                this.state.stats.tasksCompletedThisQuarter = 0;
            }

            this.state.lastResetDate = today;
            this.saveState();
        }
    },

    // ============================================
    // TRACKING EVENTS
    // ============================================

    /**
     * Track a task completion
     * @param {Object} options - Task details
     */
    trackTaskComplete(options = {}) {
        const now = new Date();
        const hour = now.getHours();

        // Increment all completion counters
        this.state.stats.tasksCompletedToday++;
        this.state.stats.tasksCompletedThisWeek++;
        this.state.stats.tasksCompletedThisMonth++;
        this.state.stats.tasksCompletedThisQuarter++;

        // Check for early bird (before 6 AM)
        if (hour < 6) {
            this.state.stats.earlyCompletions++;
        }

        // Check for on-time completion
        if (options.beforeDeadline) {
            this.state.stats.onTimeCompletions++;
        }

        // Update streak
        const today = now.toISOString().split('T')[0];
        if (this.state.stats.lastCompletionDate !== today) {
            this.state.stats.currentStreak++;
            this.state.stats.activeDaysStreak++;
            this.state.stats.lastCompletionDate = today;
        }

        this.saveState();
        this.checkAllBadges();
    },

    /**
     * Track a day with no overdue tasks
     */
    trackCleanDay() {
        this.state.stats.cleanDays++;
        this.saveState();
        this.checkAllBadges();
    },

    /**
     * Track completion percentage (for overdelivery badge)
     * @param {number} percentage - Completion percentage
     */
    trackCompletionPercentage(percentage) {
        this.state.badgeProgress.completion_percentage = percentage;
        this.saveState();
        this.checkAllBadges();
    },

    // ============================================
    // BADGE CHECKING
    // ============================================

    checkAllBadges() {
        Object.values(this.BADGES).forEach(badge => {
            if (!this.isBadgeUnlocked(badge.id)) {
                this.checkBadge(badge);
            }
        });
    },

    checkBadge(badge) {
        let currentValue = 0;

        switch (badge.trackingKey) {
            case 'early_completions':
                currentValue = this.state.stats.earlyCompletions;
                break;
            case 'daily_completions':
                currentValue = this.state.stats.tasksCompletedToday;
                break;
            case 'on_time_completions':
                currentValue = this.state.stats.onTimeCompletions;
                break;
            case 'weekly_completions':
                currentValue = this.state.stats.tasksCompletedThisWeek;
                break;
            case 'completion_percentage':
                currentValue = this.state.badgeProgress.completion_percentage || 0;
                break;
            case 'clean_days':
                currentValue = this.state.stats.cleanDays;
                break;
            case 'streak_days':
                currentValue = this.state.stats.currentStreak;
                break;
            case 'monthly_completions':
                currentValue = this.state.stats.tasksCompletedThisMonth;
                break;
            case 'quarterly_completions':
                currentValue = this.state.stats.tasksCompletedThisQuarter;
                break;
            case 'active_days_streak':
                currentValue = this.state.stats.activeDaysStreak;
                break;
        }

        // Store progress for display
        this.state.badgeProgress[badge.id] = {
            current: currentValue,
            required: badge.requirement,
            percentage: Math.min(100, Math.round((currentValue / badge.requirement) * 100))
        };

        if (currentValue >= badge.requirement) {
            this.unlockBadge(badge);
        }

        this.saveState();
    },

    isBadgeUnlocked(badgeId) {
        return this.state.unlockedBadges.includes(badgeId);
    },

    // ============================================
    // BADGE UNLOCK
    // ============================================

    unlockBadge(badge) {
        if (this.isBadgeUnlocked(badge.id)) return;

        this.state.unlockedBadges.push(badge.id);
        this.saveState();

        // Show celebration
        this.showUnlockCelebration(badge);

        // Update indicator
        this.renderBadgeIndicator();

        // Sync to backend if available
        this.syncToBackend(badge);

        console.log('[BadgeSystem] Badge unlocked:', badge.name);
    },

    /**
     * Show badge unlock celebration
     */
    showUnlockCelebration(badge) {
        // Use TinyAnimations if available
        if (window.TinyAnimations && TinyAnimations.celebrate) {
            TinyAnimations.celebrate({
                title: 'Badge Unlocked!',
                subtitle: `${badge.icon} ${badge.name}`,
                icon: badge.icon,
                confetti: true,
                duration: 4000
            });
        } else {
            // Fallback celebration
            this.showFallbackCelebration(badge);
        }
    },

    showFallbackCelebration(badge) {
        const overlay = document.createElement('div');
        overlay.className = 'badge-unlock-overlay';
        overlay.innerHTML = `
            <style>
                .badge-unlock-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: badgeFadeIn 0.5s ease;
                }
                @keyframes badgeFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .badge-unlock-content {
                    text-align: center;
                    max-width: 400px;
                    padding: 40px;
                    animation: badgeScaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes badgeScaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .badge-unlock-icon {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, ${badge.color}, ${badge.color}aa);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 56px;
                    box-shadow: 0 0 60px ${badge.color}80;
                    animation: badgePulse 1.5s ease infinite;
                }
                @keyframes badgePulse {
                    0%, 100% { box-shadow: 0 0 60px ${badge.color}80; }
                    50% { box-shadow: 0 0 80px ${badge.color}aa; }
                }
                .badge-unlock-title {
                    font-size: 32px;
                    font-weight: 800;
                    color: #f0f0f5;
                    margin-bottom: 8px;
                }
                .badge-unlock-name {
                    font-size: 24px;
                    font-weight: 700;
                    color: ${badge.color};
                    margin-bottom: 16px;
                }
                .badge-unlock-desc {
                    font-size: 16px;
                    color: #a0a4b8;
                    margin-bottom: 24px;
                }
                .badge-unlock-tier {
                    display: inline-block;
                    padding: 6px 16px;
                    background: ${badge.color}30;
                    color: ${badge.color};
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 24px;
                }
                .badge-unlock-btn {
                    padding: 14px 32px;
                    background: ${badge.color};
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .badge-unlock-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 20px ${badge.color}60;
                }
            </style>
            <div class="badge-unlock-content">
                <div class="badge-unlock-icon">${badge.icon}</div>
                <div class="badge-unlock-title">Badge Unlocked!</div>
                <div class="badge-unlock-name">${badge.name}</div>
                <div class="badge-unlock-tier">${this.TIERS[badge.tier].name} Badge</div>
                <div class="badge-unlock-desc">${badge.description}</div>
                <button class="badge-unlock-btn" onclick="this.closest('.badge-unlock-overlay').remove()">
                    Awesome!
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Spawn confetti if TinyAnimations available
        if (window.TinyAnimations && TinyAnimations.spawnConfetti) {
            TinyAnimations.spawnConfetti({ count: 80 });
        }

        // Auto close after 5 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.animation = 'badgeFadeIn 0.3s ease reverse';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 5000);
    },

    // ============================================
    // UI RENDERING
    // ============================================

    /**
     * Render badge count indicator in header
     */
    renderBadgeIndicator() {
        let indicator = document.getElementById('badge-indicator');
        if (!indicator) {
            // Create indicator next to avatar
            const avatarLink = document.querySelector('.user-avatar-link');
            if (avatarLink) {
                indicator = document.createElement('button');
                indicator.id = 'badge-indicator';
                indicator.className = 'badge-indicator-btn';
                indicator.onclick = () => this.showBadgePanel();
                indicator.innerHTML = `
                    <span class="badge-indicator-icon">🏆</span>
                    <span class="badge-indicator-count" id="badge-count">0</span>
                `;
                avatarLink.parentNode.insertBefore(indicator, avatarLink);

                // Add styles
                if (!document.getElementById('badge-indicator-styles')) {
                    const style = document.createElement('style');
                    style.id = 'badge-indicator-styles';
                    style.textContent = `
                        .badge-indicator-btn {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 12px;
                            background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15));
                            border: 1px solid rgba(234, 179, 8, 0.3);
                            border-radius: 20px;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: inherit;
                        }
                        .badge-indicator-btn:hover {
                            background: linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(249, 115, 22, 0.25));
                            border-color: rgba(234, 179, 8, 0.5);
                            transform: translateY(-1px);
                        }
                        .badge-indicator-icon {
                            font-size: 16px;
                        }
                        .badge-indicator-count {
                            font-size: 13px;
                            font-weight: 700;
                            color: #eab308;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        }

        // Update count
        const countEl = document.getElementById('badge-count');
        if (countEl) {
            countEl.textContent = this.state.unlockedBadges.length;
        }
    },

    /**
     * Show the full badge panel
     */
    showBadgePanel() {
        // Remove existing panel
        const existing = document.getElementById('badge-panel-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'badge-panel-overlay';
        overlay.className = 'badge-panel-overlay';

        const unlockedBadges = this.state.unlockedBadges;
        const allBadges = Object.values(this.BADGES);

        // Group by tier
        const badgesByTier = {};
        Object.keys(this.TIERS).forEach(tier => {
            badgesByTier[tier] = allBadges.filter(b => b.tier === tier);
        });

        overlay.innerHTML = `
            <style>
                .badge-panel-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: badgePanelFadeIn 0.2s ease;
                }
                @keyframes badgePanelFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .badge-panel {
                    background: var(--bg-secondary, #1a1d27);
                    border: 1px solid var(--border, #2a2d3e);
                    border-radius: 16px;
                    width: 600px;
                    max-width: 95vw;
                    max-height: 85vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: badgePanelSlideIn 0.3s ease;
                }
                @keyframes badgePanelSlideIn {
                    from { transform: scale(0.95) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .badge-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border, #2a2d3e);
                    background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(249, 115, 22, 0.1));
                }
                .badge-panel-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary, #f0f0f5);
                }
                .badge-panel-stats {
                    display: flex;
                    gap: 16px;
                    font-size: 13px;
                    color: var(--text-secondary, #a0a4b8);
                }
                .badge-panel-stat {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .badge-panel-stat-value {
                    font-weight: 700;
                    color: #eab308;
                }
                .badge-panel-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: var(--text-muted, #6b6f82);
                    cursor: pointer;
                    padding: 4px;
                    transition: color 0.2s;
                }
                .badge-panel-close:hover {
                    color: var(--text-primary, #f0f0f5);
                }
                .badge-panel-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px 24px;
                }
                .badge-tier-section {
                    margin-bottom: 24px;
                }
                .badge-tier-section:last-child {
                    margin-bottom: 0;
                }
                .badge-tier-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border, #2a2d3e);
                }
                .badge-tier-name {
                    font-size: 14px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .badge-tier-count {
                    font-size: 12px;
                    color: var(--text-muted, #6b6f82);
                }
                .badge-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 12px;
                }
                .badge-card {
                    background: var(--bg-card, #1e2130);
                    border: 1px solid var(--border, #2a2d3e);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .badge-card:hover {
                    border-color: var(--accent, #6366f1);
                    transform: translateY(-2px);
                }
                .badge-card.unlocked {
                    background: linear-gradient(135deg, var(--badge-color, #eab308)10, var(--badge-color, #eab308)05);
                    border-color: var(--badge-color, #eab308)50;
                }
                .badge-card.locked {
                    opacity: 0.6;
                }
                .badge-card.locked .badge-icon {
                    filter: grayscale(1);
                }
                .badge-icon {
                    font-size: 40px;
                    margin-bottom: 8px;
                    display: block;
                }
                .badge-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary, #f0f0f5);
                    margin-bottom: 4px;
                }
                .badge-desc {
                    font-size: 11px;
                    color: var(--text-muted, #6b6f82);
                    line-height: 1.4;
                    margin-bottom: 8px;
                }
                .badge-progress {
                    height: 4px;
                    background: var(--bg-primary, #0f1117);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 8px;
                }
                .badge-progress-fill {
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.3s ease;
                }
                .badge-progress-text {
                    font-size: 10px;
                    color: var(--text-muted, #6b6f82);
                    margin-top: 4px;
                }
                .badge-unlocked-check {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 20px;
                    height: 20px;
                    background: var(--badge-color, #22c55e);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: white;
                }
                .streak-banner {
                    background: linear-gradient(135deg, #ef4444, #f97316);
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .streak-icon {
                    font-size: 36px;
                }
                .streak-info {
                    flex: 1;
                }
                .streak-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.8);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .streak-value {
                    font-size: 28px;
                    font-weight: 800;
                    color: white;
                }
                .streak-best {
                    text-align: right;
                }
                .streak-best-label {
                    font-size: 11px;
                    color: rgba(255,255,255,0.7);
                }
                .streak-best-value {
                    font-size: 20px;
                    font-weight: 700;
                    color: white;
                }
            </style>
            <div class="badge-panel">
                <div class="badge-panel-header">
                    <div class="badge-panel-title">
                        <span>🏆</span>
                        <span>Achievements</span>
                    </div>
                    <div class="badge-panel-stats">
                        <div class="badge-panel-stat">
                            <span class="badge-panel-stat-value">${unlockedBadges.length}</span>
                            <span>/ ${allBadges.length} Unlocked</span>
                        </div>
                    </div>
                    <button class="badge-panel-close" onclick="document.getElementById('badge-panel-overlay').remove()">×</button>
                </div>
                <div class="badge-panel-body">
                    <!-- Streak Banner -->
                    <div class="streak-banner">
                        <div class="streak-icon">🔥</div>
                        <div class="streak-info">
                            <div class="streak-label">Current Streak</div>
                            <div class="streak-value">${this.state.stats.currentStreak} days</div>
                        </div>
                        <div class="streak-best">
                            <div class="streak-best-label">Best</div>
                            <div class="streak-best-value">${this.state.stats.bestStreak} days</div>
                        </div>
                    </div>

                    <!-- Badge Tiers -->
                    ${Object.entries(this.TIERS).map(([tierId, tier]) => {
                        const tierBadges = badgesByTier[tierId];
                        const unlockedInTier = tierBadges.filter(b => unlockedBadges.includes(b.id)).length;
                        return `
                            <div class="badge-tier-section">
                                <div class="badge-tier-header">
                                    <span class="badge-tier-name" style="color: ${tier.color}">${tier.name}</span>
                                    <span class="badge-tier-count">${unlockedInTier}/${tierBadges.length}</span>
                                </div>
                                <div class="badge-grid">
                                    ${tierBadges.map(badge => {
                                        const isUnlocked = unlockedBadges.includes(badge.id);
                                        const progress = this.state.badgeProgress[badge.id] || { current: 0, required: badge.requirement, percentage: 0 };
                                        return `
                                            <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" style="--badge-color: ${badge.color}">
                                                ${isUnlocked ? '<div class="badge-unlocked-check">✓</div>' : ''}
                                                <span class="badge-icon">${badge.icon}</span>
                                                <div class="badge-name">${badge.name}</div>
                                                <div class="badge-desc">${badge.description}</div>
                                                ${!isUnlocked ? `
                                                    <div class="badge-progress">
                                                        <div class="badge-progress-fill" style="width: ${progress.percentage}%; background: ${badge.color}"></div>
                                                    </div>
                                                    <div class="badge-progress-text">${progress.current}/${progress.required}</div>
                                                ` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // ============================================
    // BACKEND SYNC
    // ============================================

    async syncToBackend(badge) {
        // Try to sync with Google Sheet if API available
        try {
            const profile = JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
            const employeeId = profile.id || 'anonymous';

            // Use the existing unlockAchievement endpoint if available
            if (window.TINY_SEED_API && TINY_SEED_API.MAIN_API) {
                const response = await fetch(TINY_SEED_API.MAIN_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'unlockAchievement',
                        employeeId: employeeId,
                        achievementCode: badge.id,
                        achievementName: badge.name
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('[BadgeSystem] Synced to backend:', badge.name);
                }
            }
        } catch (e) {
            // Silent fail - localStorage is primary, backend is optional
            console.log('[BadgeSystem] Backend sync skipped (offline or not configured)');
        }
    },

    // ============================================
    // UTILITY
    // ============================================

    /**
     * Get next badge in progress
     */
    getNextBadgeInProgress() {
        const allBadges = Object.values(this.BADGES);
        const lockedBadges = allBadges.filter(b => !this.isBadgeUnlocked(b.id));

        // Sort by progress percentage (closest to completion first)
        lockedBadges.sort((a, b) => {
            const progressA = this.state.badgeProgress[a.id]?.percentage || 0;
            const progressB = this.state.badgeProgress[b.id]?.percentage || 0;
            return progressB - progressA;
        });

        return lockedBadges[0] || null;
    },

    /**
     * Reset all badges (for testing)
     */
    resetAll() {
        if (confirm('Reset all badge progress? This cannot be undone.')) {
            this.state = {
                unlockedBadges: [],
                badgeProgress: {},
                stats: {
                    tasksCompletedToday: 0,
                    tasksCompletedThisWeek: 0,
                    tasksCompletedThisMonth: 0,
                    tasksCompletedThisQuarter: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    lastCompletionDate: null,
                    earlyCompletions: 0,
                    onTimeCompletions: 0,
                    cleanDays: 0,
                    activeDaysStreak: 0
                },
                lastResetDate: null
            };
            this.saveState();
            this.renderBadgeIndicator();
            console.log('[BadgeSystem] Reset complete');
        }
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.BadgeSystem = BadgeSystem;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BadgeSystem.init());
    } else {
        BadgeSystem.init();
    }
}
