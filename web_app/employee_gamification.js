/**
 * ================================================================================
 * TINY SEED EMPLOYEE GAMIFICATION SYSTEM
 * ================================================================================
 *
 * A comprehensive gamification system designed to motivate farm employees through
 * achievements, XP tracking, levels, bonuses, and leaderboards.
 *
 * FEATURES:
 * - XP (Experience Points) tracking for various activities
 * - Level progression system with tier bonuses
 * - Achievement badges (unlockable rewards)
 * - Streaks and consistency bonuses
 * - Team leaderboards
 * - Bonus pool allocation
 * - Performance metrics tracking
 *
 * VERSION: 1.0.0
 * LAST UPDATED: 2026-01-15
 * ================================================================================
 */

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

const GAMIFICATION_CONFIG = {
    // XP Requirements per Level
    LEVEL_THRESHOLDS: [
        0,      // Level 1
        200,    // Level 2
        450,    // Level 3
        750,    // Level 4
        1100,   // Level 5
        1500,   // Level 6
        2000,   // Level 7
        2600,   // Level 8
        3300,   // Level 9
        4100,   // Level 10
        5000,   // Level 11
        6000,   // Level 12
        7200,   // Level 13
        8600,   // Level 14
        10200   // Level 15 (max shown, continues formula beyond)
    ],

    // Bonus tiers (per level achieved)
    BONUS_TIERS: {
        BRONZE: { minLevel: 1, maxLevel: 5, bonusPerLevel: 25 },
        SILVER: { minLevel: 6, maxLevel: 10, bonusPerLevel: 50 },
        GOLD: { minLevel: 11, maxLevel: 15, bonusPerLevel: 100 },
        PLATINUM: { minLevel: 16, maxLevel: Infinity, bonusPerLevel: 150 }
    },

    // XP Awards for Activities
    XP_ACTIVITIES: {
        // Daily activities
        CLOCK_IN_ON_TIME: { xp: 5, description: 'Clock in on time', category: 'attendance' },
        COMPLETE_SHIFT: { xp: 10, description: 'Complete full shift', category: 'attendance' },
        OVERTIME_HOUR: { xp: 15, description: 'Work overtime (per hour)', category: 'attendance' },

        // Harvest activities
        HARVEST_BIN: { xp: 5, description: 'Complete harvest bin', category: 'harvest' },
        QUALITY_HARVEST: { xp: 20, description: 'Quality grade A harvest', category: 'harvest' },
        HARVEST_GOAL_MET: { xp: 50, description: 'Daily harvest goal met', category: 'harvest' },

        // Delivery activities
        DELIVERY_COMPLETE: { xp: 15, description: 'Complete delivery', category: 'delivery' },
        DELIVERY_ON_TIME: { xp: 10, description: 'On-time delivery bonus', category: 'delivery' },
        PERFECT_ORDER: { xp: 25, description: 'Perfect order (no issues)', category: 'delivery' },

        // Sales activities
        SALE_MADE: { xp: 10, description: 'Complete a sale', category: 'sales' },
        LARGE_SALE: { xp: 25, description: 'Sale over $100', category: 'sales' },
        NEW_CUSTOMER: { xp: 50, description: 'Sign up new customer', category: 'sales' },
        CSA_RENEWAL: { xp: 30, description: 'CSA membership renewal', category: 'sales' },

        // Equipment/Farm
        EQUIPMENT_MAINTAINED: { xp: 15, description: 'Complete maintenance task', category: 'equipment' },
        GREENHOUSE_TASK: { xp: 10, description: 'Greenhouse task completed', category: 'greenhouse' },
        PLANTING_ROW: { xp: 8, description: 'Plant a row', category: 'planting' },

        // Bonus/Special
        STREAK_BONUS_5: { xp: 50, description: '5-day attendance streak', category: 'bonus' },
        STREAK_BONUS_10: { xp: 100, description: '10-day attendance streak', category: 'bonus' },
        STREAK_BONUS_30: { xp: 300, description: '30-day attendance streak', category: 'bonus' },
        WEEKLY_TOP_PERFORMER: { xp: 100, description: 'Top performer of the week', category: 'bonus' },
        MONTHLY_TOP_PERFORMER: { xp: 500, description: 'Top performer of the month', category: 'bonus' },
        HELPFUL_TEAMMATE: { xp: 25, description: 'Help a teammate', category: 'bonus' },
        SUGGESTION_IMPLEMENTED: { xp: 100, description: 'Suggestion implemented', category: 'bonus' }
    },

    // Streak Configuration
    STREAKS: {
        ATTENDANCE_STREAK: {
            5: { xp: 50, badge: 'STREAK_5' },
            10: { xp: 100, badge: 'STREAK_10' },
            20: { xp: 200, badge: 'STREAK_20' },
            30: { xp: 300, badge: 'STREAK_30' },
            60: { xp: 500, badge: 'STREAK_60' },
            90: { xp: 750, badge: 'STREAK_90' }
        }
    }
};

// =============================================================================
// SECTION 2: ACHIEVEMENTS
// =============================================================================

const ACHIEVEMENTS = {
    // Attendance achievements
    FIRST_DAY: {
        id: 'FIRST_DAY',
        name: 'First Day',
        description: 'Complete your first day of work',
        icon: 'fa-seedling',
        xp: 100,
        tier: 'bronze',
        category: 'attendance'
    },
    STREAK_5: {
        id: 'STREAK_5',
        name: '5-Day Streak',
        description: 'Work 5 consecutive days',
        icon: 'fa-fire',
        xp: 50,
        tier: 'bronze',
        category: 'attendance'
    },
    STREAK_10: {
        id: 'STREAK_10',
        name: '10-Day Streak',
        description: 'Work 10 consecutive days',
        icon: 'fa-fire-alt',
        xp: 100,
        tier: 'silver',
        category: 'attendance'
    },
    STREAK_30: {
        id: 'STREAK_30',
        name: 'Monthly Warrior',
        description: 'Work 30 consecutive days',
        icon: 'fa-medal',
        xp: 300,
        tier: 'gold',
        category: 'attendance'
    },
    PERFECT_MONTH: {
        id: 'PERFECT_MONTH',
        name: 'Perfect Month',
        description: 'Perfect attendance for a full month',
        icon: 'fa-calendar-check',
        xp: 500,
        tier: 'gold',
        category: 'attendance'
    },

    // Harvest achievements
    FIRST_HARVEST: {
        id: 'FIRST_HARVEST',
        name: 'First Harvest',
        description: 'Complete your first harvest',
        icon: 'fa-leaf',
        xp: 100,
        tier: 'bronze',
        category: 'harvest'
    },
    HARVEST_100: {
        id: 'HARVEST_100',
        name: 'Century Harvest',
        description: 'Complete 100 harvest bins',
        icon: 'fa-boxes',
        xp: 200,
        tier: 'silver',
        category: 'harvest'
    },
    HARVEST_500: {
        id: 'HARVEST_500',
        name: 'Harvest Hero',
        description: 'Complete 500 harvest bins',
        icon: 'fa-trophy',
        xp: 500,
        tier: 'gold',
        category: 'harvest'
    },
    QUALITY_KING: {
        id: 'QUALITY_KING',
        name: 'Quality King',
        description: '50 Grade-A quality harvests',
        icon: 'fa-crown',
        xp: 300,
        tier: 'gold',
        category: 'harvest'
    },

    // Delivery achievements
    FIRST_DELIVERY: {
        id: 'FIRST_DELIVERY',
        name: 'First Delivery',
        description: 'Complete your first delivery',
        icon: 'fa-truck',
        xp: 100,
        tier: 'bronze',
        category: 'delivery'
    },
    DELIVERY_50: {
        id: 'DELIVERY_50',
        name: 'Road Warrior',
        description: 'Complete 50 deliveries',
        icon: 'fa-route',
        xp: 200,
        tier: 'silver',
        category: 'delivery'
    },
    DELIVERY_100: {
        id: 'DELIVERY_100',
        name: 'Delivery Master',
        description: 'Complete 100 deliveries',
        icon: 'fa-truck-moving',
        xp: 400,
        tier: 'gold',
        category: 'delivery'
    },
    PERFECT_DELIVERIES: {
        id: 'PERFECT_DELIVERIES',
        name: 'Perfect Record',
        description: '25 perfect deliveries in a row',
        icon: 'fa-star',
        xp: 300,
        tier: 'gold',
        category: 'delivery'
    },

    // Sales achievements
    FIRST_SALE: {
        id: 'FIRST_SALE',
        name: 'First Sale',
        description: 'Make your first sale',
        icon: 'fa-cash-register',
        xp: 100,
        tier: 'bronze',
        category: 'sales'
    },
    SALES_1000: {
        id: 'SALES_1000',
        name: '$1K Sales',
        description: 'Reach $1,000 in total sales',
        icon: 'fa-money-bill-wave',
        xp: 200,
        tier: 'silver',
        category: 'sales'
    },
    SALES_10000: {
        id: 'SALES_10000',
        name: 'Sales Superstar',
        description: 'Reach $10,000 in total sales',
        icon: 'fa-gem',
        xp: 500,
        tier: 'gold',
        category: 'sales'
    },
    CUSTOMER_CHAMPION: {
        id: 'CUSTOMER_CHAMPION',
        name: 'Customer Champion',
        description: 'Sign up 10 new customers',
        icon: 'fa-users',
        xp: 300,
        tier: 'gold',
        category: 'sales'
    },

    // Team achievements
    TEAM_PLAYER: {
        id: 'TEAM_PLAYER',
        name: 'Team Player',
        description: 'Help 10 teammates',
        icon: 'fa-hands-helping',
        xp: 200,
        tier: 'silver',
        category: 'team'
    },
    MENTOR: {
        id: 'MENTOR',
        name: 'Mentor',
        description: 'Train a new employee',
        icon: 'fa-chalkboard-teacher',
        xp: 150,
        tier: 'silver',
        category: 'team'
    },

    // Milestone achievements
    LEVEL_5: {
        id: 'LEVEL_5',
        name: 'Rising Star',
        description: 'Reach Level 5',
        icon: 'fa-star',
        xp: 100,
        tier: 'bronze',
        category: 'milestone'
    },
    LEVEL_10: {
        id: 'LEVEL_10',
        name: 'Veteran',
        description: 'Reach Level 10',
        icon: 'fa-award',
        xp: 250,
        tier: 'silver',
        category: 'milestone'
    },
    LEVEL_15: {
        id: 'LEVEL_15',
        name: 'Legend',
        description: 'Reach Level 15',
        icon: 'fa-crown',
        xp: 500,
        tier: 'gold',
        category: 'milestone'
    },
    XP_1000: {
        id: 'XP_1000',
        name: '1K XP Club',
        description: 'Earn 1,000 total XP',
        icon: 'fa-bolt',
        xp: 100,
        tier: 'bronze',
        category: 'milestone'
    },
    XP_5000: {
        id: 'XP_5000',
        name: '5K XP Club',
        description: 'Earn 5,000 total XP',
        icon: 'fa-bolt',
        xp: 250,
        tier: 'silver',
        category: 'milestone'
    },
    XP_10000: {
        id: 'XP_10000',
        name: '10K XP Club',
        description: 'Earn 10,000 total XP',
        icon: 'fa-bolt',
        xp: 500,
        tier: 'gold',
        category: 'milestone'
    },

    // Special achievements
    TOP_PERFORMER: {
        id: 'TOP_PERFORMER',
        name: 'Top Performer',
        description: 'Be #1 on the monthly leaderboard',
        icon: 'fa-crown',
        xp: 500,
        tier: 'gold',
        category: 'special'
    },
    INNOVATOR: {
        id: 'INNOVATOR',
        name: 'Innovator',
        description: 'Have a suggestion implemented',
        icon: 'fa-lightbulb',
        xp: 200,
        tier: 'silver',
        category: 'special'
    },
    YEAR_ONE: {
        id: 'YEAR_ONE',
        name: 'Anniversary',
        description: 'Complete 1 year of employment',
        icon: 'fa-birthday-cake',
        xp: 1000,
        tier: 'gold',
        category: 'special'
    }
};

// =============================================================================
// SECTION 3: EMPLOYEE CLASS
// =============================================================================

/**
 * Represents an employee in the gamification system
 */
class Employee {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.name = data.name;
        this.role = data.role || 'Farm Hand';
        this.startDate = data.startDate ? new Date(data.startDate) : new Date();
        this.totalXP = data.totalXP || 0;
        this.currentStreak = data.currentStreak || 0;
        this.longestStreak = data.longestStreak || 0;
        this.lastWorkDate = data.lastWorkDate ? new Date(data.lastWorkDate) : null;
        this.achievements = data.achievements || [];
        this.activityLog = data.activityLog || [];

        // Statistics
        this.stats = data.stats || {
            harvestBins: 0,
            deliveries: 0,
            sales: 0,
            salesAmount: 0,
            newCustomers: 0,
            daysWorked: 0,
            hoursWorked: 0,
            helpfulActions: 0
        };
    }

    generateId() {
        return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get current level based on XP
     */
    getLevel() {
        const thresholds = GAMIFICATION_CONFIG.LEVEL_THRESHOLDS;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (this.totalXP >= thresholds[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    /**
     * Get XP needed for next level
     */
    getXPToNextLevel() {
        const currentLevel = this.getLevel();
        const thresholds = GAMIFICATION_CONFIG.LEVEL_THRESHOLDS;

        if (currentLevel >= thresholds.length) {
            // Beyond defined levels, use formula
            const nextThreshold = thresholds[thresholds.length - 1] +
                (currentLevel - thresholds.length + 1) * 1500;
            return nextThreshold - this.totalXP;
        }

        return thresholds[currentLevel] - this.totalXP;
    }

    /**
     * Get progress percentage to next level
     */
    getLevelProgress() {
        const currentLevel = this.getLevel();
        const thresholds = GAMIFICATION_CONFIG.LEVEL_THRESHOLDS;

        const currentThreshold = thresholds[currentLevel - 1] || 0;
        const nextThreshold = thresholds[currentLevel] ||
            (thresholds[thresholds.length - 1] + 1500);

        const progressXP = this.totalXP - currentThreshold;
        const levelXP = nextThreshold - currentThreshold;

        return Math.min(100, Math.round((progressXP / levelXP) * 100));
    }

    /**
     * Get bonus tier based on level
     */
    getBonusTier() {
        const level = this.getLevel();
        const tiers = GAMIFICATION_CONFIG.BONUS_TIERS;

        for (const [tierName, tier] of Object.entries(tiers)) {
            if (level >= tier.minLevel && level <= tier.maxLevel) {
                return { name: tierName, ...tier };
            }
        }
        return { name: 'PLATINUM', ...tiers.PLATINUM };
    }

    /**
     * Calculate total bonus earned based on level
     */
    calculateBonus() {
        const level = this.getLevel();
        const tiers = GAMIFICATION_CONFIG.BONUS_TIERS;
        let totalBonus = 0;

        // Bronze levels (1-5)
        const bronzeLevels = Math.min(level, tiers.BRONZE.maxLevel);
        totalBonus += bronzeLevels * tiers.BRONZE.bonusPerLevel;

        // Silver levels (6-10)
        if (level > 5) {
            const silverLevels = Math.min(level - 5, 5);
            totalBonus += silverLevels * tiers.SILVER.bonusPerLevel;
        }

        // Gold levels (11-15)
        if (level > 10) {
            const goldLevels = Math.min(level - 10, 5);
            totalBonus += goldLevels * tiers.GOLD.bonusPerLevel;
        }

        // Platinum levels (16+)
        if (level > 15) {
            const platinumLevels = level - 15;
            totalBonus += platinumLevels * tiers.PLATINUM.bonusPerLevel;
        }

        return totalBonus;
    }

    /**
     * Award XP for an activity
     */
    awardXP(activityType, multiplier = 1, notes = '') {
        const activity = GAMIFICATION_CONFIG.XP_ACTIVITIES[activityType];
        if (!activity) {
            console.warn(`Unknown activity type: ${activityType}`);
            return 0;
        }

        const xpEarned = Math.round(activity.xp * multiplier);
        this.totalXP += xpEarned;

        // Log the activity
        this.activityLog.push({
            type: activityType,
            xp: xpEarned,
            description: activity.description,
            date: new Date(),
            notes
        });

        // Check for level-up achievements
        this.checkLevelAchievements();

        // Check for XP milestone achievements
        this.checkXPAchievements();

        return xpEarned;
    }

    /**
     * Record attendance and update streak
     */
    recordAttendance(date = new Date()) {
        // Check if continuing streak (worked yesterday or last work day)
        if (this.lastWorkDate) {
            const daysSinceLastWork = Math.floor(
                (date - this.lastWorkDate) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceLastWork === 1) {
                // Consecutive day - increase streak
                this.currentStreak++;
                this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
            } else if (daysSinceLastWork > 1) {
                // Streak broken
                this.currentStreak = 1;
            }
            // daysSinceLastWork === 0 means same day, don't change streak
        } else {
            this.currentStreak = 1;
        }

        this.lastWorkDate = date;
        this.stats.daysWorked++;

        // Award streak bonuses
        this.checkStreakAchievements();

        return this.currentStreak;
    }

    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        if (this.achievements.includes(achievementId)) {
            return false; // Already unlocked
        }

        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) {
            console.warn(`Unknown achievement: ${achievementId}`);
            return false;
        }

        this.achievements.push(achievementId);
        this.totalXP += achievement.xp;

        this.activityLog.push({
            type: 'ACHIEVEMENT_UNLOCKED',
            achievementId,
            xp: achievement.xp,
            description: `Unlocked: ${achievement.name}`,
            date: new Date()
        });

        return achievement;
    }

    /**
     * Check and award streak achievements
     */
    checkStreakAchievements() {
        const streakThresholds = [5, 10, 30];
        const achievementIds = ['STREAK_5', 'STREAK_10', 'STREAK_30'];

        for (let i = 0; i < streakThresholds.length; i++) {
            if (this.currentStreak >= streakThresholds[i] &&
                !this.achievements.includes(achievementIds[i])) {
                this.unlockAchievement(achievementIds[i]);
            }
        }
    }

    /**
     * Check and award level achievements
     */
    checkLevelAchievements() {
        const level = this.getLevel();
        const levelAchievements = { 5: 'LEVEL_5', 10: 'LEVEL_10', 15: 'LEVEL_15' };

        for (const [lvl, achievementId] of Object.entries(levelAchievements)) {
            if (level >= parseInt(lvl) && !this.achievements.includes(achievementId)) {
                this.unlockAchievement(achievementId);
            }
        }
    }

    /**
     * Check and award XP milestone achievements
     */
    checkXPAchievements() {
        const xpAchievements = {
            1000: 'XP_1000',
            5000: 'XP_5000',
            10000: 'XP_10000'
        };

        for (const [xp, achievementId] of Object.entries(xpAchievements)) {
            if (this.totalXP >= parseInt(xp) && !this.achievements.includes(achievementId)) {
                this.unlockAchievement(achievementId);
            }
        }
    }

    /**
     * Get unlocked achievements with details
     */
    getUnlockedAchievements() {
        return this.achievements.map(id => ACHIEVEMENTS[id]).filter(Boolean);
    }

    /**
     * Get locked achievements (available but not yet earned)
     */
    getLockedAchievements() {
        return Object.values(ACHIEVEMENTS).filter(
            achievement => !this.achievements.includes(achievement.id)
        );
    }

    /**
     * Get recent activity
     */
    getRecentActivity(limit = 10) {
        return this.activityLog.slice(-limit).reverse();
    }

    /**
     * Export to JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            startDate: this.startDate,
            totalXP: this.totalXP,
            currentStreak: this.currentStreak,
            longestStreak: this.longestStreak,
            lastWorkDate: this.lastWorkDate,
            achievements: this.achievements,
            stats: this.stats,
            activityLog: this.activityLog
        };
    }
}

// =============================================================================
// SECTION 4: TEAM LEADERBOARD
// =============================================================================

/**
 * Team leaderboard and rankings
 */
class TeamLeaderboard {
    constructor(employees = []) {
        this.employees = employees.map(e =>
            e instanceof Employee ? e : new Employee(e)
        );
    }

    /**
     * Get leaderboard sorted by XP
     */
    getByXP() {
        return [...this.employees].sort((a, b) => b.totalXP - a.totalXP);
    }

    /**
     * Get leaderboard sorted by level
     */
    getByLevel() {
        return [...this.employees].sort((a, b) => {
            const levelDiff = b.getLevel() - a.getLevel();
            if (levelDiff !== 0) return levelDiff;
            return b.totalXP - a.totalXP; // Tie breaker
        });
    }

    /**
     * Get leaderboard for a specific time period
     */
    getByPeriod(period = 'month') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'quarter':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = new Date(0); // All time
        }

        // Calculate XP earned in period for each employee
        const periodXP = this.employees.map(emp => {
            const xpInPeriod = emp.activityLog
                .filter(log => new Date(log.date) >= startDate)
                .reduce((sum, log) => sum + (log.xp || 0), 0);

            return { employee: emp, periodXP: xpInPeriod };
        });

        return periodXP.sort((a, b) => b.periodXP - a.periodXP);
    }

    /**
     * Get top performer
     */
    getTopPerformer(period = 'month') {
        const leaderboard = this.getByPeriod(period);
        return leaderboard[0] || null;
    }

    /**
     * Get team statistics
     */
    getTeamStats() {
        const totalXP = this.employees.reduce((sum, e) => sum + e.totalXP, 0);
        const totalAchievements = this.employees.reduce(
            (sum, e) => sum + e.achievements.length, 0
        );
        const avgLevel = this.employees.reduce(
            (sum, e) => sum + e.getLevel(), 0
        ) / this.employees.length || 0;

        const totalBonuses = this.employees.reduce(
            (sum, e) => sum + e.calculateBonus(), 0
        );

        return {
            teamSize: this.employees.length,
            totalXP,
            totalAchievements,
            averageLevel: Math.round(avgLevel * 10) / 10,
            totalBonusPool: totalBonuses,
            topPerformer: this.getTopPerformer()?.employee?.name || 'N/A'
        };
    }

    /**
     * Add employee to team
     */
    addEmployee(employeeData) {
        const employee = new Employee(employeeData);
        this.employees.push(employee);
        return employee;
    }

    /**
     * Get employee by ID
     */
    getEmployee(id) {
        return this.employees.find(e => e.id === id);
    }
}

// =============================================================================
// SECTION 5: BONUS CALCULATOR
// =============================================================================

/**
 * Calculate and distribute bonuses
 */
class BonusCalculator {
    constructor(bonusPool, employees) {
        this.bonusPool = bonusPool;
        this.employees = employees;
    }

    /**
     * Calculate level-based bonuses
     */
    calculateLevelBonuses() {
        return this.employees.map(emp => ({
            employee: emp,
            levelBonus: emp.calculateBonus()
        }));
    }

    /**
     * Distribute bonus pool by XP ratio
     */
    distributeByXP() {
        const totalXP = this.employees.reduce((sum, e) => sum + e.totalXP, 0);

        return this.employees.map(emp => ({
            employee: emp,
            share: totalXP > 0 ? emp.totalXP / totalXP : 0,
            bonus: totalXP > 0 ?
                Math.round((emp.totalXP / totalXP) * this.bonusPool * 100) / 100 : 0
        }));
    }

    /**
     * Distribute bonus pool equally
     */
    distributeEqually() {
        const perEmployee = this.bonusPool / this.employees.length;

        return this.employees.map(emp => ({
            employee: emp,
            bonus: Math.round(perEmployee * 100) / 100
        }));
    }

    /**
     * Hybrid distribution (50% equal, 50% by performance)
     */
    distributeHybrid() {
        const equalPortion = this.bonusPool * 0.5;
        const performancePortion = this.bonusPool * 0.5;

        const totalXP = this.employees.reduce((sum, e) => sum + e.totalXP, 0);
        const equalPerPerson = equalPortion / this.employees.length;

        return this.employees.map(emp => {
            const performanceBonus = totalXP > 0 ?
                (emp.totalXP / totalXP) * performancePortion : 0;

            return {
                employee: emp,
                equalBonus: Math.round(equalPerPerson * 100) / 100,
                performanceBonus: Math.round(performanceBonus * 100) / 100,
                totalBonus: Math.round((equalPerPerson + performanceBonus) * 100) / 100
            };
        });
    }
}

// =============================================================================
// SECTION 6: DASHBOARD FORMATTER
// =============================================================================

/**
 * Format data for dashboard display
 */
function formatGamificationForDashboard(leaderboard) {
    const teamStats = leaderboard.getTeamStats();
    const topPerformers = leaderboard.getByXP().slice(0, 5);

    return {
        // Header stats
        stats: {
            bonusPool: `$${teamStats.totalBonusPool.toLocaleString()}`,
            teamSize: teamStats.teamSize,
            totalAchievements: teamStats.totalAchievements,
            avgLevel: teamStats.averageLevel.toFixed(1)
        },

        // Leaderboard
        leaderboard: topPerformers.map((emp, index) => ({
            rank: index + 1,
            id: emp.id,
            name: emp.name,
            role: emp.role,
            level: emp.getLevel(),
            xp: emp.totalXP.toLocaleString(),
            levelProgress: emp.getLevelProgress(),
            bonusTier: emp.getBonusTier().name,
            bonus: `$${emp.calculateBonus()}`,
            streak: emp.currentStreak,
            achievements: emp.achievements.length
        })),

        // Available achievements
        achievements: Object.values(ACHIEVEMENTS).map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            xp: a.xp,
            tier: a.tier
        })),

        // Team totals
        teamStats: {
            totalXP: teamStats.totalXP.toLocaleString(),
            totalBonuses: `$${teamStats.totalBonusPool.toLocaleString()}`,
            topPerformer: teamStats.topPerformer
        }
    };
}

// =============================================================================
// SECTION 7: EXPORT
// =============================================================================

const TinySeedGamification = {
    // Classes
    Employee,
    TeamLeaderboard,
    BonusCalculator,

    // Data
    ACHIEVEMENTS,
    CONFIG: GAMIFICATION_CONFIG,

    // Utilities
    formatGamificationForDashboard,

    // Version
    VERSION: '1.0.0',
    LAST_UPDATED: '2026-01-15'
};

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.TinySeedGamification = TinySeedGamification;
    window.Employee = Employee;
    window.TeamLeaderboard = TeamLeaderboard;
    window.BonusCalculator = BonusCalculator;
}

// Export for Node.js/modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinySeedGamification;
}
