/**
 * ================================================================================
 * TINY SEED DEBT DESTROYER - Advanced Debt Payoff Calculator
 * ================================================================================
 *
 * A comprehensive debt management system that calculates optimal payoff strategies,
 * tracks progress, and provides actionable insights for becoming debt-free.
 *
 * FEATURES:
 * - Avalanche Method (highest interest first - saves most money)
 * - Snowball Method (smallest balance first - fastest wins)
 * - Hybrid Method (weighted balance of both approaches)
 * - Interest savings comparison between strategies
 * - Payoff timeline generation
 * - Monthly payment scheduling
 * - Progress tracking and milestones
 *
 * VERSION: 1.0.0
 * LAST UPDATED: 2026-01-15
 * ================================================================================
 */

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

const DEBT_DESTROYER_CONFIG = {
    // Minimum payment calculation rules
    MINIMUM_PAYMENT: {
        CREDIT_CARD_PERCENT: 0.02,      // 2% of balance or fixed minimum
        CREDIT_CARD_FLOOR: 25,          // Minimum $25
        INSTALLMENT_FOLLOWS_TERMS: true  // Use stated payment for loans
    },

    // Strategy weights for hybrid method
    HYBRID_WEIGHTS: {
        INTEREST_RATE: 0.6,   // 60% weight on interest rate
        BALANCE: 0.4         // 40% weight on balance
    },

    // Milestone thresholds
    MILESTONES: {
        FIRST_PAYOFF: true,
        HALFWAY_BALANCE: 0.5,
        QUARTER_REMAINING: 0.25,
        DEBT_FREE: true
    },

    // Interest calculation
    INTEREST: {
        COMPOUNDS_MONTHLY: true,
        DAYS_IN_MONTH: 30,
        MONTHS_IN_YEAR: 12
    }
};

// =============================================================================
// SECTION 2: DEBT CLASS
// =============================================================================

/**
 * Represents a single debt account
 */
class Debt {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.name = data.name;
        this.type = data.type || 'credit_card';
        this.originalBalance = data.balance;
        this.currentBalance = data.balance;
        this.apr = data.apr;
        this.minimumPayment = data.minimumPayment || this.calculateMinimumPayment(data.balance);
        this.dueDay = data.dueDay || 1;
        this.creditLimit = data.creditLimit || null;
        this.dateAdded = data.dateAdded || new Date();
        this.notes = data.notes || '';
    }

    generateId() {
        return 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    calculateMinimumPayment(balance) {
        if (this.type === 'credit_card') {
            const percentPayment = balance * DEBT_DESTROYER_CONFIG.MINIMUM_PAYMENT.CREDIT_CARD_PERCENT;
            return Math.max(percentPayment, DEBT_DESTROYER_CONFIG.MINIMUM_PAYMENT.CREDIT_CARD_FLOOR);
        }
        return this.minimumPayment || 0;
    }

    getMonthlyInterestRate() {
        return (this.apr / 100) / 12;
    }

    calculateMonthlyInterest() {
        return this.currentBalance * this.getMonthlyInterestRate();
    }

    /**
     * Get utilization rate (for credit cards)
     */
    getUtilization() {
        if (this.creditLimit && this.creditLimit > 0) {
            return this.currentBalance / this.creditLimit;
        }
        return null;
    }

    /**
     * Calculate months to payoff with given payment
     */
    monthsToPayoff(monthlyPayment) {
        if (monthlyPayment <= this.calculateMonthlyInterest()) {
            return Infinity; // Payment doesn't cover interest
        }

        const r = this.getMonthlyInterestRate();
        const P = this.currentBalance;
        const M = monthlyPayment;

        // Formula: n = -log(1 - (P * r) / M) / log(1 + r)
        const months = -Math.log(1 - (P * r) / M) / Math.log(1 + r);
        return Math.ceil(months);
    }

    /**
     * Calculate total interest paid over lifetime of debt
     */
    totalInterestIfMinimumOnly() {
        const months = this.monthsToPayoff(this.minimumPayment);
        if (months === Infinity) return Infinity;

        const totalPaid = months * this.minimumPayment;
        return totalPaid - this.currentBalance;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            originalBalance: this.originalBalance,
            currentBalance: this.currentBalance,
            apr: this.apr,
            minimumPayment: this.minimumPayment,
            dueDay: this.dueDay,
            creditLimit: this.creditLimit,
            dateAdded: this.dateAdded,
            notes: this.notes
        };
    }
}

// =============================================================================
// SECTION 3: DEBT DESTROYER ENGINE
// =============================================================================

/**
 * Main Debt Destroyer Calculator
 */
class DebtDestroyer {
    constructor(debts = [], extraMonthlyPayment = 0) {
        this.debts = debts.map(d => d instanceof Debt ? d : new Debt(d));
        this.extraMonthlyPayment = extraMonthlyPayment;
        this.paymentHistory = [];
        this.milestones = [];
    }

    // -------------------------------------------------------------------------
    // STRATEGY SORTING METHODS
    // -------------------------------------------------------------------------

    /**
     * Avalanche Method: Sort by highest APR first
     * Mathematically optimal - saves the most money
     */
    sortByAvalanche() {
        return [...this.debts].sort((a, b) => b.apr - a.apr);
    }

    /**
     * Snowball Method: Sort by lowest balance first
     * Psychologically optimal - quick wins build momentum
     */
    sortBySnowball() {
        return [...this.debts].sort((a, b) => a.currentBalance - b.currentBalance);
    }

    /**
     * Hybrid Method: Weighted combination of APR and balance
     * Balances financial optimization with psychological benefits
     */
    sortByHybrid() {
        const weights = DEBT_DESTROYER_CONFIG.HYBRID_WEIGHTS;

        // Normalize APR and balance to 0-1 scale
        const maxApr = Math.max(...this.debts.map(d => d.apr));
        const maxBalance = Math.max(...this.debts.map(d => d.currentBalance));
        const minBalance = Math.min(...this.debts.map(d => d.currentBalance));

        return [...this.debts].sort((a, b) => {
            // Higher score = pay off first
            const scoreA = (a.apr / maxApr) * weights.INTEREST_RATE +
                           (1 - (a.currentBalance - minBalance) / (maxBalance - minBalance || 1)) * weights.BALANCE;
            const scoreB = (b.apr / maxApr) * weights.INTEREST_RATE +
                           (1 - (b.currentBalance - minBalance) / (maxBalance - minBalance || 1)) * weights.BALANCE;
            return scoreB - scoreA;
        });
    }

    // -------------------------------------------------------------------------
    // PAYOFF CALCULATION
    // -------------------------------------------------------------------------

    /**
     * Calculate complete payoff schedule for a given strategy
     * @param {string} strategy - 'avalanche', 'snowball', or 'hybrid'
     * @returns {Object} Complete payoff analysis
     */
    calculatePayoff(strategy = 'avalanche') {
        // Clone debts for simulation
        let simulatedDebts;
        switch (strategy) {
            case 'snowball':
                simulatedDebts = this.sortBySnowball().map(d => new Debt(d.toJSON()));
                break;
            case 'hybrid':
                simulatedDebts = this.sortByHybrid().map(d => new Debt(d.toJSON()));
                break;
            case 'avalanche':
            default:
                simulatedDebts = this.sortByAvalanche().map(d => new Debt(d.toJSON()));
        }

        const schedule = [];
        const payoffOrder = [];
        let currentDate = new Date();
        let totalInterestPaid = 0;
        let availableExtra = this.extraMonthlyPayment;
        let monthNumber = 0;

        // Calculate total minimum payments
        const totalMinimum = simulatedDebts.reduce((sum, d) => sum + d.minimumPayment, 0);

        while (simulatedDebts.length > 0 && monthNumber < 600) { // Max 50 years
            monthNumber++;
            const monthlyPayments = [];
            let monthInterest = 0;

            // Process each debt
            for (const debt of simulatedDebts) {
                // Calculate interest for this month
                const interest = debt.calculateMonthlyInterest();
                monthInterest += interest;
                totalInterestPaid += interest;
                debt.currentBalance += interest;
            }

            // Apply minimum payments to all debts
            for (const debt of simulatedDebts) {
                const payment = Math.min(debt.minimumPayment, debt.currentBalance);
                debt.currentBalance -= payment;
                monthlyPayments.push({
                    debtId: debt.id,
                    debtName: debt.name,
                    payment,
                    type: 'minimum',
                    balanceAfter: debt.currentBalance
                });
            }

            // Apply extra payment to target debt (first in sorted list)
            if (simulatedDebts.length > 0 && availableExtra > 0) {
                const targetDebt = simulatedDebts[0];
                const extraPayment = Math.min(availableExtra, targetDebt.currentBalance);
                if (extraPayment > 0) {
                    targetDebt.currentBalance -= extraPayment;
                    monthlyPayments.push({
                        debtId: targetDebt.id,
                        debtName: targetDebt.name,
                        payment: extraPayment,
                        type: 'extra',
                        balanceAfter: targetDebt.currentBalance
                    });
                }
            }

            // Check for paid-off debts
            const paidOff = [];
            simulatedDebts = simulatedDebts.filter(debt => {
                if (debt.currentBalance <= 0.01) { // Account for floating point
                    paidOff.push({
                        id: debt.id,
                        name: debt.name,
                        originalBalance: debt.originalBalance,
                        paidOffMonth: monthNumber,
                        paidOffDate: new Date(currentDate)
                    });
                    // Roll freed-up minimum payment into extra
                    availableExtra += debt.minimumPayment;
                    return false;
                }
                return true;
            });

            payoffOrder.push(...paidOff);

            // Record month in schedule
            schedule.push({
                month: monthNumber,
                date: new Date(currentDate),
                payments: monthlyPayments,
                interestPaid: Math.round(monthInterest * 100) / 100,
                debtsPaidOff: paidOff,
                remainingDebts: simulatedDebts.length,
                totalRemaining: simulatedDebts.reduce((sum, d) => sum + d.currentBalance, 0)
            });

            // Advance date
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Calculate summary statistics
        const totalOriginalDebt = this.debts.reduce((sum, d) => sum + d.originalBalance, 0);
        const debtFreeDate = schedule.length > 0 ? schedule[schedule.length - 1].date : null;

        return {
            strategy,
            schedule,
            payoffOrder,
            summary: {
                totalOriginalDebt: Math.round(totalOriginalDebt * 100) / 100,
                totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
                monthsToDebtFree: monthNumber,
                debtFreeDate,
                totalMinimumPayment: totalMinimum,
                extraPayment: this.extraMonthlyPayment,
                effectiveMonthlyPayment: totalMinimum + this.extraMonthlyPayment
            }
        };
    }

    /**
     * Compare all strategies and return recommendations
     */
    compareStrategies() {
        const avalanche = this.calculatePayoff('avalanche');
        const snowball = this.calculatePayoff('snowball');
        const hybrid = this.calculatePayoff('hybrid');

        // Find the best strategy
        const strategies = [avalanche, snowball, hybrid];
        const bestInterest = strategies.reduce((best, s) =>
            s.summary.totalInterestPaid < best.summary.totalInterestPaid ? s : best
        );
        const fastestPayoff = strategies.reduce((best, s) =>
            s.summary.monthsToDebtFree < best.summary.monthsToDebtFree ? s : best
        );

        // Calculate savings vs minimum payments only
        const minimumOnlyCalc = new DebtDestroyer(this.debts, 0);
        const minimumOnly = minimumOnlyCalc.calculatePayoff('avalanche');

        return {
            avalanche: {
                ...avalanche.summary,
                payoffOrder: avalanche.payoffOrder,
                recommendation: 'Best for saving money on interest'
            },
            snowball: {
                ...snowball.summary,
                payoffOrder: snowball.payoffOrder,
                recommendation: 'Best for motivation with quick wins'
            },
            hybrid: {
                ...hybrid.summary,
                payoffOrder: hybrid.payoffOrder,
                recommendation: 'Balanced approach'
            },
            analysis: {
                bestForSavings: bestInterest.strategy,
                interestSavingsVsWorst: Math.max(
                    snowball.summary.totalInterestPaid - avalanche.summary.totalInterestPaid,
                    avalanche.summary.totalInterestPaid - snowball.summary.totalInterestPaid
                ),
                interestSavingsVsMinimumOnly: minimumOnly.summary.totalInterestPaid - bestInterest.summary.totalInterestPaid,
                timeSavingsVsMinimumOnly: minimumOnly.summary.monthsToDebtFree - fastestPayoff.summary.monthsToDebtFree,
                firstPayoffStrategy: snowball.strategy,
                firstPayoffMonths: snowball.payoffOrder[0]?.paidOffMonth || null,
                firstPayoffDebt: snowball.payoffOrder[0]?.name || null
            },
            recommendation: this.generateRecommendation(avalanche, snowball, hybrid)
        };
    }

    /**
     * Generate personalized recommendation based on debt profile
     */
    generateRecommendation(avalanche, snowball, hybrid) {
        const interestDiff = snowball.summary.totalInterestPaid - avalanche.summary.totalInterestPaid;
        const timeDiff = avalanche.summary.monthsToDebtFree - snowball.summary.monthsToDebtFree;
        const avgApr = this.debts.reduce((sum, d) => sum + d.apr, 0) / this.debts.length;

        // If significant interest savings with avalanche
        if (interestDiff > 500 && avgApr > 15) {
            return {
                strategy: 'avalanche',
                reason: `Avalanche saves you $${interestDiff.toFixed(0)} in interest due to high APR debts.`,
                confidence: 'high'
            };
        }

        // If debts are similar in size and APR
        if (this.debts.length > 3 && Math.abs(timeDiff) < 2) {
            return {
                strategy: 'snowball',
                reason: 'With many debts, snowball provides motivating quick wins.',
                confidence: 'medium'
            };
        }

        // If one debt is much smaller, suggest snowball for quick win
        const smallestDebt = Math.min(...this.debts.map(d => d.currentBalance));
        const avgDebt = this.debts.reduce((sum, d) => sum + d.currentBalance, 0) / this.debts.length;
        if (smallestDebt < avgDebt * 0.3) {
            return {
                strategy: 'snowball',
                reason: `Pay off ${this.sortBySnowball()[0].name} quickly for an early win!`,
                confidence: 'medium'
            };
        }

        // Default to avalanche for mathematical optimization
        return {
            strategy: 'avalanche',
            reason: 'Avalanche is mathematically optimal for your debt profile.',
            confidence: 'high'
        };
    }

    // -------------------------------------------------------------------------
    // PROGRESS TRACKING
    // -------------------------------------------------------------------------

    /**
     * Calculate current progress toward debt freedom
     */
    calculateProgress() {
        const originalTotal = this.debts.reduce((sum, d) => sum + d.originalBalance, 0);
        const currentTotal = this.debts.reduce((sum, d) => sum + d.currentBalance, 0);
        const paidOff = originalTotal - currentTotal;
        const percentPaid = originalTotal > 0 ? (paidOff / originalTotal) * 100 : 0;

        // Calculate projected savings if continuing current plan
        const comparison = this.compareStrategies();

        return {
            originalTotal: Math.round(originalTotal * 100) / 100,
            currentTotal: Math.round(currentTotal * 100) / 100,
            amountPaid: Math.round(paidOff * 100) / 100,
            percentPaid: Math.round(percentPaid * 10) / 10,
            remainingDebts: this.debts.filter(d => d.currentBalance > 0).length,
            totalDebts: this.debts.length,
            projectedDebtFreeDate: comparison[comparison.recommendation.strategy]?.debtFreeDate,
            projectedInterestSaved: comparison.analysis.interestSavingsVsMinimumOnly
        };
    }

    /**
     * Get upcoming milestones
     */
    getMilestones() {
        const milestones = [];
        const progress = this.calculateProgress();
        const comparison = this.compareStrategies();
        const bestStrategy = comparison[comparison.recommendation.strategy];

        // Next debt payoff
        if (bestStrategy.payoffOrder && bestStrategy.payoffOrder.length > 0) {
            const nextPayoff = bestStrategy.payoffOrder[0];
            milestones.push({
                type: 'NEXT_PAYOFF',
                title: `Pay off ${nextPayoff.name}`,
                date: nextPayoff.paidOffDate,
                monthsAway: nextPayoff.paidOffMonth,
                description: `First victory! ${nextPayoff.name} will be paid off.`
            });
        }

        // Halfway point
        if (progress.percentPaid < 50) {
            const halfwayMonth = Math.ceil(bestStrategy.monthsToDebtFree / 2);
            const halfwayDate = new Date();
            halfwayDate.setMonth(halfwayDate.getMonth() + halfwayMonth);
            milestones.push({
                type: 'HALFWAY',
                title: 'Halfway to Debt Free',
                date: halfwayDate,
                monthsAway: halfwayMonth,
                description: '50% of your debt will be eliminated!'
            });
        }

        // Debt free
        milestones.push({
            type: 'DEBT_FREE',
            title: 'DEBT FREE!',
            date: bestStrategy.debtFreeDate,
            monthsAway: bestStrategy.monthsToDebtFree,
            description: 'Total financial freedom achieved!'
        });

        return milestones.sort((a, b) => a.monthsAway - b.monthsAway);
    }

    // -------------------------------------------------------------------------
    // UTILITY METHODS
    // -------------------------------------------------------------------------

    /**
     * Add a new debt
     */
    addDebt(debtData) {
        const debt = new Debt(debtData);
        this.debts.push(debt);
        return debt;
    }

    /**
     * Update an existing debt
     */
    updateDebt(debtId, updates) {
        const debt = this.debts.find(d => d.id === debtId);
        if (debt) {
            Object.assign(debt, updates);
            return debt;
        }
        return null;
    }

    /**
     * Make a payment on a debt
     */
    makePayment(debtId, amount, date = new Date()) {
        const debt = this.debts.find(d => d.id === debtId);
        if (debt) {
            debt.currentBalance = Math.max(0, debt.currentBalance - amount);
            this.paymentHistory.push({
                debtId,
                amount,
                date,
                balanceAfter: debt.currentBalance
            });
            return true;
        }
        return false;
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        const totalDebt = this.debts.reduce((sum, d) => sum + d.currentBalance, 0);
        const totalMinimum = this.debts.reduce((sum, d) => sum + d.minimumPayment, 0);
        const weightedApr = this.debts.reduce((sum, d) =>
            sum + (d.apr * d.currentBalance), 0) / totalDebt || 0;
        const monthlyInterest = this.debts.reduce((sum, d) =>
            sum + d.calculateMonthlyInterest(), 0);

        return {
            numberOfDebts: this.debts.length,
            totalDebt: Math.round(totalDebt * 100) / 100,
            totalMinimumPayment: Math.round(totalMinimum * 100) / 100,
            extraPayment: this.extraMonthlyPayment,
            totalMonthlyPayment: Math.round((totalMinimum + this.extraMonthlyPayment) * 100) / 100,
            weightedAverageApr: Math.round(weightedApr * 100) / 100,
            monthlyInterestCharge: Math.round(monthlyInterest * 100) / 100,
            annualInterestCharge: Math.round(monthlyInterest * 12 * 100) / 100
        };
    }

    /**
     * Export all data to JSON
     */
    toJSON() {
        return {
            debts: this.debts.map(d => d.toJSON()),
            extraMonthlyPayment: this.extraMonthlyPayment,
            paymentHistory: this.paymentHistory,
            summary: this.getSummary(),
            comparison: this.compareStrategies(),
            progress: this.calculateProgress(),
            milestones: this.getMilestones(),
            exportDate: new Date().toISOString()
        };
    }
}

// =============================================================================
// SECTION 4: FORMATTING UTILITIES
// =============================================================================

const DebtFormatter = {
    /**
     * Format currency
     */
    currency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    /**
     * Format percentage
     */
    percent(value) {
        return `${value.toFixed(2)}%`;
    },

    /**
     * Format date
     */
    date(date) {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long'
        }).format(new Date(date));
    },

    /**
     * Format months to readable duration
     */
    duration(months) {
        if (months === Infinity) return 'Never (payment too low)';
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (years === 0) return `${months} months`;
        if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
        return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
};

// =============================================================================
// SECTION 5: DASHBOARD INTEGRATION
// =============================================================================

/**
 * Format debt destroyer data for dashboard display
 */
function formatDebtDestroyerForDashboard(debtDestroyer) {
    const comparison = debtDestroyer.compareStrategies();
    const progress = debtDestroyer.calculateProgress();
    const summary = debtDestroyer.getSummary();
    const milestones = debtDestroyer.getMilestones();

    return {
        // Header stats
        stats: {
            totalDebt: DebtFormatter.currency(summary.totalDebt),
            monthlyPayment: DebtFormatter.currency(summary.totalMonthlyPayment),
            monthlyInterest: DebtFormatter.currency(summary.monthlyInterestCharge),
            debtFreeDate: DebtFormatter.date(comparison[comparison.recommendation.strategy].debtFreeDate)
        },

        // Progress bar
        progress: {
            percentPaid: progress.percentPaid,
            amountPaid: DebtFormatter.currency(progress.amountPaid),
            remaining: DebtFormatter.currency(progress.currentTotal)
        },

        // Strategy comparison
        strategies: {
            recommended: comparison.recommendation,
            avalanche: {
                name: 'Avalanche',
                interestPaid: DebtFormatter.currency(comparison.avalanche.totalInterestPaid),
                duration: DebtFormatter.duration(comparison.avalanche.monthsToDebtFree),
                debtFreeDate: DebtFormatter.date(comparison.avalanche.debtFreeDate)
            },
            snowball: {
                name: 'Snowball',
                interestPaid: DebtFormatter.currency(comparison.snowball.totalInterestPaid),
                duration: DebtFormatter.duration(comparison.snowball.monthsToDebtFree),
                debtFreeDate: DebtFormatter.date(comparison.snowball.debtFreeDate)
            }
        },

        // Savings
        savings: {
            vsMinimumOnly: DebtFormatter.currency(comparison.analysis.interestSavingsVsMinimumOnly),
            timeSaved: DebtFormatter.duration(comparison.analysis.timeSavingsVsMinimumOnly)
        },

        // Debt list
        debts: debtDestroyer.debts.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            balance: DebtFormatter.currency(d.currentBalance),
            apr: DebtFormatter.percent(d.apr),
            minimumPayment: DebtFormatter.currency(d.minimumPayment),
            utilization: d.getUtilization() ? DebtFormatter.percent(d.getUtilization() * 100) : null
        })),

        // Timeline
        payoffOrder: comparison[comparison.recommendation.strategy].payoffOrder.map(p => ({
            name: p.name,
            originalBalance: DebtFormatter.currency(p.originalBalance),
            paidOffDate: DebtFormatter.date(p.paidOffDate),
            monthsAway: p.paidOffMonth
        })),

        // Milestones
        milestones: milestones.map(m => ({
            type: m.type,
            title: m.title,
            date: DebtFormatter.date(m.date),
            monthsAway: m.monthsAway,
            description: m.description
        }))
    };
}

// =============================================================================
// SECTION 6: EXPORT
// =============================================================================

const TinySeedDebtDestroyer = {
    // Classes
    Debt,
    DebtDestroyer,

    // Utilities
    DebtFormatter,
    formatDebtDestroyerForDashboard,

    // Configuration
    CONFIG: DEBT_DESTROYER_CONFIG,

    // Version
    VERSION: '1.0.0',
    LAST_UPDATED: '2026-01-15'
};

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.TinySeedDebtDestroyer = TinySeedDebtDestroyer;
    window.Debt = Debt;
    window.DebtDestroyer = DebtDestroyer;
}

// Export for Node.js/modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinySeedDebtDestroyer;
}
