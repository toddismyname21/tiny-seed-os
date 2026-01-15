/**
 * ================================================================================
 * TINY SEED WEALTH BUILDER - PROPRIETARY INVESTMENT ALGORITHM
 * ================================================================================
 *
 * A dual-allocation investment system designed specifically for small farm businesses
 * with seasonal cash flow patterns.
 *
 * ARCHITECTURE:
 * - 75% SAFE Allocation (Modified All-Weather Strategy)
 * - 25% GROWTH Allocation (Dual Momentum + Factor Tilt)
 *
 * VERSION: 1.0.0
 * LAST UPDATED: 2026-01-15
 *
 * DISCLAIMER: This algorithm is for educational and planning purposes.
 * Consult a licensed financial advisor before implementing.
 * ================================================================================
 */

// =============================================================================
// SECTION 1: CONFIGURATION CONSTANTS
// =============================================================================

const TSWB_CONFIG = {
    // Core Allocation Split
    SAFE_ALLOCATION: 0.75,      // 75% to Safe Strategy
    GROWTH_ALLOCATION: 0.25,   // 25% to Growth Strategy

    // Farm Seasonal Configuration
    FARM_SEASONS: {
        HARVEST_HIGH: ['June', 'July', 'August', 'September', 'October'],
        PLANTING: ['March', 'April', 'May'],
        WINTER_LOW: ['November', 'December', 'January', 'February']
    },

    // Contribution Multipliers by Season
    CONTRIBUTION_MULTIPLIERS: {
        HARVEST_HIGH: 1.5,     // 150% of base contribution during harvest
        PLANTING: 0.75,       // 75% during planting (cash needed for inputs)
        WINTER_LOW: 0.25      // 25% during winter (minimal farm income)
    },

    // Emergency Reserve Requirements
    EMERGENCY_RESERVE: {
        MIN_MONTHS_EXPENSES: 6,
        TARGET_MONTHS_EXPENSES: 12,
        MONTHLY_FARM_EXPENSES: 8000  // Configurable per farm
    },

    // Risk Thresholds
    RISK_THRESHOLDS: {
        MAX_PORTFOLIO_DRAWDOWN: 0.15,      // 15% max drawdown before defensive
        GROWTH_DEFENSIVE_TRIGGER: 0.10,    // 10% drawdown triggers growth defensive
        RECOVERY_THRESHOLD: 0.05,          // 5% recovery before resuming growth
        VOLATILITY_CEILING: 0.25           // 25% annualized vol triggers caution
    },

    // Rebalancing Rules
    REBALANCING: {
        THRESHOLD_PERCENT: 0.05,   // 5% drift threshold
        MIN_DAYS_BETWEEN: 30,      // Minimum 30 days between rebalances
        TAX_LOSS_THRESHOLD: 0.03,  // 3% loss threshold for harvesting
        USE_CONTRIBUTIONS_FIRST: true
    }
};

// =============================================================================
// SECTION 2: SAFE ALLOCATION STRATEGY (75%)
// =============================================================================

/**
 * SAFE STRATEGY: Modified All-Weather Portfolio
 *
 * Philosophy: Capital preservation with steady growth, designed to perform
 * reasonably well in all economic environments (growth, recession, inflation, deflation)
 *
 * Expected Annual Return: 5-7%
 * Maximum Expected Drawdown: 12-15%
 * Standard Deviation: 7-10%
 */

const SAFE_ALLOCATION_STRATEGY = {
    name: 'Modified All-Weather for Farm Business',

    // Core ETF Allocations (within the 75% safe bucket)
    allocations: {
        // STOCKS (30% of Safe = 22.5% of total)
        'VTI': {
            name: 'Vanguard Total Stock Market ETF',
            targetPercent: 0.20,
            category: 'US_EQUITY',
            role: 'Growth engine, inflation hedge',
            expenseRatio: 0.03
        },
        'VXUS': {
            name: 'Vanguard Total International Stock ETF',
            targetPercent: 0.10,
            category: 'INTL_EQUITY',
            role: 'Diversification, currency hedge',
            expenseRatio: 0.07
        },

        // BONDS (45% of Safe = 33.75% of total)
        'BND': {
            name: 'Vanguard Total Bond Market ETF',
            targetPercent: 0.20,
            category: 'US_BONDS',
            role: 'Deflation hedge, stability',
            expenseRatio: 0.03
        },
        'TIP': {
            name: 'iShares TIPS Bond ETF',
            targetPercent: 0.15,
            category: 'TIPS',
            role: 'Inflation protection',
            expenseRatio: 0.19
        },
        'GOVT': {
            name: 'iShares U.S. Treasury Bond ETF',
            targetPercent: 0.10,
            category: 'TREASURIES',
            role: 'Flight to safety, deflation hedge',
            expenseRatio: 0.05
        },

        // COMMODITIES & ALTERNATIVES (15% of Safe = 11.25% of total)
        'GLD': {
            name: 'SPDR Gold Shares',
            targetPercent: 0.075,
            category: 'GOLD',
            role: 'Crisis hedge, inflation protection',
            expenseRatio: 0.40
        },
        'DBC': {
            name: 'Invesco DB Commodity Index',
            targetPercent: 0.05,
            category: 'COMMODITIES',
            role: 'Inflation hedge, farm input correlation',
            expenseRatio: 0.85
        },

        // SHORT-TERM RESERVES (10% of Safe = 7.5% of total)
        'SHY': {
            name: 'iShares 1-3 Year Treasury Bond ETF',
            targetPercent: 0.10,
            category: 'SHORT_TERM',
            role: 'Liquidity, emergency access',
            expenseRatio: 0.15
        }
    },

    // Economic Environment Tilts
    environmentTilts: {
        GROWTH: { VTI: 0.02, VXUS: 0.01, BND: -0.02, GLD: -0.01 },
        RECESSION: { BND: 0.03, GOVT: 0.02, VTI: -0.03, VXUS: -0.02 },
        INFLATION: { TIP: 0.03, DBC: 0.02, GLD: 0.02, BND: -0.05, GOVT: -0.02 },
        DEFLATION: { GOVT: 0.04, BND: 0.03, VTI: -0.03, DBC: -0.02, GLD: -0.02 }
    },

    // Rebalancing Rules
    rebalancingRules: {
        frequency: 'QUARTERLY_OR_THRESHOLD',
        thresholdPercent: 0.05,
        taxEfficientOrder: ['SHY', 'BND', 'GOVT', 'TIP', 'VTI', 'VXUS', 'GLD', 'DBC']
    },

    // Expected Performance Metrics
    expectedMetrics: {
        annualReturn: { min: 0.05, target: 0.065, max: 0.08 },
        maxDrawdown: { expected: 0.12, worst: 0.18 },
        standardDeviation: { expected: 0.08, max: 0.12 },
        sharpeRatio: { expected: 0.65, target: 0.75 }
    }
};

// =============================================================================
// SECTION 3: GROWTH ALLOCATION STRATEGY (25%)
// =============================================================================

/**
 * GROWTH STRATEGY: Dual Momentum + Factor Tilt
 *
 * Philosophy: Capture upside during favorable conditions, move to safety during
 * unfavorable conditions. Uses both absolute and relative momentum.
 *
 * Expected Annual Return: 8-15% (with significant variance)
 * Maximum Expected Drawdown: 20-30%
 * Standard Deviation: 15-20%
 */

const GROWTH_ALLOCATION_STRATEGY = {
    name: 'Dual Momentum Factor Strategy',

    // Primary Growth ETFs (Offensive Positions)
    offensiveAllocations: {
        'QQQ': {
            name: 'Invesco QQQ Trust (Nasdaq-100)',
            maxPercent: 0.35,
            category: 'TECH_GROWTH',
            momentumLookback: 12,
            role: 'High growth exposure'
        },
        'VUG': {
            name: 'Vanguard Growth ETF',
            maxPercent: 0.25,
            category: 'US_GROWTH',
            momentumLookback: 12,
            role: 'Broad growth exposure'
        },
        'MTUM': {
            name: 'iShares MSCI USA Momentum Factor ETF',
            maxPercent: 0.25,
            category: 'MOMENTUM_FACTOR',
            momentumLookback: 6,
            role: 'Momentum factor tilt'
        },
        'VBK': {
            name: 'Vanguard Small-Cap Growth ETF',
            maxPercent: 0.15,
            category: 'SMALL_CAP_GROWTH',
            momentumLookback: 6,
            role: 'Small cap premium'
        }
    },

    // Defensive Position (When Momentum Fails)
    defensiveAllocation: {
        'SHY': {
            name: 'iShares 1-3 Year Treasury Bond ETF',
            targetPercent: 1.0,
            category: 'CASH_EQUIVALENT',
            role: 'Capital preservation during drawdowns'
        },
        'BIL': {
            name: 'SPDR Bloomberg 1-3 Month T-Bill ETF',
            alternatePercent: 1.0,
            category: 'T_BILLS',
            role: 'Ultra-safe alternative'
        }
    },

    // Momentum Signal Configuration
    momentumSignals: {
        // Absolute Momentum (vs cash)
        absoluteMomentum: {
            lookbackMonths: 12,
            benchmark: 'SHY',
            threshold: 0  // Must beat cash return
        },

        // Relative Momentum (rank assets)
        relativeMomentum: {
            lookbackMonths: [1, 3, 6, 12],  // Multiple timeframes
            weights: [0.25, 0.25, 0.25, 0.25],  // Equal weight
            topN: 2  // Hold top 2 performers
        },

        // Composite Signal Weights
        signalWeights: {
            absoluteMomentum: 0.5,
            relativeMomentum: 0.5
        }
    },

    // Expected Performance Metrics
    expectedMetrics: {
        annualReturn: { min: 0.04, target: 0.12, max: 0.20 },
        maxDrawdown: { expected: 0.20, worst: 0.35 },
        standardDeviation: { expected: 0.18, max: 0.25 },
        sharpeRatio: { expected: 0.55, target: 0.70 }
    }
};

// =============================================================================
// SECTION 4: SIGNAL CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate momentum score for a given asset
 * @param {Array} priceHistory - Array of { date, price } objects
 * @param {number} lookbackMonths - Number of months to look back
 * @returns {number} Momentum score (percentage return)
 */
function calculateMomentumScore(priceHistory, lookbackMonths) {
    if (!priceHistory || priceHistory.length < lookbackMonths * 21) {
        return null;  // Insufficient data (approx 21 trading days/month)
    }

    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const lookbackDays = lookbackMonths * 21;
    const pastPrice = priceHistory[priceHistory.length - 1 - lookbackDays].price;

    return (currentPrice - pastPrice) / pastPrice;
}

/**
 * Calculate composite momentum score using multiple timeframes
 * @param {Array} priceHistory - Price history array
 * @param {Array} lookbackPeriods - Array of lookback periods in months
 * @param {Array} weights - Weight for each lookback period
 * @returns {number} Weighted composite momentum score
 */
function calculateCompositeMomentum(priceHistory, lookbackPeriods, weights) {
    let compositeScore = 0;
    let validWeightSum = 0;

    for (let i = 0; i < lookbackPeriods.length; i++) {
        const score = calculateMomentumScore(priceHistory, lookbackPeriods[i]);
        if (score !== null) {
            compositeScore += score * weights[i];
            validWeightSum += weights[i];
        }
    }

    return validWeightSum > 0 ? compositeScore / validWeightSum : null;
}

/**
 * Determine if absolute momentum signal is positive
 * (Asset outperforming cash/T-bills)
 */
function isAbsoluteMomentumPositive(assetReturn, cashReturn) {
    return assetReturn > cashReturn;
}

/**
 * Rank assets by composite momentum and return top N
 * @param {Object} assetScores - { ticker: momentumScore }
 * @param {number} topN - Number of top assets to return
 * @returns {Array} Array of top N tickers
 */
function getTopMomentumAssets(assetScores, topN) {
    const sorted = Object.entries(assetScores)
        .filter(([ticker, score]) => score !== null)
        .sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, topN).map(([ticker]) => ticker);
}

/**
 * Generate the complete growth allocation signal
 * @param {Object} priceData - { ticker: priceHistoryArray }
 * @returns {Object} { mode: 'OFFENSIVE'|'DEFENSIVE', allocations: { ticker: percent } }
 */
function generateGrowthSignal(priceData) {
    const config = GROWTH_ALLOCATION_STRATEGY.momentumSignals;
    const offensiveTickers = Object.keys(GROWTH_ALLOCATION_STRATEGY.offensiveAllocations);

    // Calculate cash benchmark return
    const cashReturn = calculateMomentumScore(
        priceData['SHY'],
        config.absoluteMomentum.lookbackMonths
    );

    // Calculate composite momentum for all offensive assets
    const assetScores = {};
    for (const ticker of offensiveTickers) {
        assetScores[ticker] = calculateCompositeMomentum(
            priceData[ticker],
            config.relativeMomentum.lookbackMonths,
            config.relativeMomentum.weights
        );
    }

    // Get top momentum assets
    const topAssets = getTopMomentumAssets(assetScores, config.relativeMomentum.topN);

    // Check absolute momentum for top assets
    const assetsPassingAbsolute = topAssets.filter(ticker => {
        const assetReturn = calculateMomentumScore(
            priceData[ticker],
            config.absoluteMomentum.lookbackMonths
        );
        return isAbsoluteMomentumPositive(assetReturn, cashReturn);
    });

    // Decision: Go defensive if no assets pass absolute momentum
    if (assetsPassingAbsolute.length === 0) {
        return {
            mode: 'DEFENSIVE',
            allocations: { 'SHY': 1.0 },
            reason: 'No assets passing absolute momentum filter'
        };
    }

    // Allocate equally among assets passing both filters
    const allocPerAsset = 1.0 / assetsPassingAbsolute.length;
    const allocations = {};
    for (const ticker of assetsPassingAbsolute) {
        allocations[ticker] = allocPerAsset;
    }

    return {
        mode: 'OFFENSIVE',
        allocations,
        topAssets: assetsPassingAbsolute,
        scores: assetScores
    };
}

// =============================================================================
// SECTION 5: FARM SEASONAL ADJUSTMENT SYSTEM
// =============================================================================

/**
 * Get current farm season based on month
 * @param {Date} date - Current date
 * @returns {string} 'HARVEST_HIGH' | 'PLANTING' | 'WINTER_LOW'
 */
function getFarmSeason(date) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[date.getMonth()];

    if (TSWB_CONFIG.FARM_SEASONS.HARVEST_HIGH.includes(currentMonth)) {
        return 'HARVEST_HIGH';
    } else if (TSWB_CONFIG.FARM_SEASONS.PLANTING.includes(currentMonth)) {
        return 'PLANTING';
    } else {
        return 'WINTER_LOW';
    }
}

/**
 * Calculate adjusted contribution amount based on season
 * @param {number} baseContribution - Standard monthly contribution
 * @param {Date} date - Current date
 * @returns {Object} { amount, season, multiplier }
 */
function calculateSeasonalContribution(baseContribution, date) {
    const season = getFarmSeason(date);
    const multiplier = TSWB_CONFIG.CONTRIBUTION_MULTIPLIERS[season];

    return {
        amount: baseContribution * multiplier,
        season,
        multiplier,
        explanation: getSeasonalExplanation(season)
    };
}

function getSeasonalExplanation(season) {
    const explanations = {
        'HARVEST_HIGH': 'Peak revenue season - maximize contributions to capture farm profits',
        'PLANTING': 'Cash needed for seeds, supplies, and labor - reduced contributions',
        'WINTER_LOW': 'Minimal farm income - preserve cash for operations'
    };
    return explanations[season];
}

/**
 * Generate annual contribution schedule
 * @param {number} baseMonthlyContribution - Base monthly amount
 * @param {number} year - Year for schedule
 * @returns {Array} Monthly contribution schedule
 */
function generateAnnualContributionSchedule(baseMonthlyContribution, year) {
    const schedule = [];

    for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const contribution = calculateSeasonalContribution(baseMonthlyContribution, date);

        schedule.push({
            month: month + 1,
            monthName: date.toLocaleString('default', { month: 'long' }),
            ...contribution
        });
    }

    // Calculate annual totals
    const totalContributions = schedule.reduce((sum, m) => sum + m.amount, 0);

    return {
        schedule,
        annualTotal: totalContributions,
        averageMonthly: totalContributions / 12,
        baseMonthly: baseMonthlyContribution
    };
}

// =============================================================================
// SECTION 6: EMERGENCY RESERVE MANAGEMENT
// =============================================================================

/**
 * Emergency Reserve Status and Recommendations
 */
function calculateEmergencyReserveStatus(currentReserve, monthlyExpenses) {
    const config = TSWB_CONFIG.EMERGENCY_RESERVE;
    const monthsCovered = currentReserve / monthlyExpenses;
    const minRequired = config.MIN_MONTHS_EXPENSES * monthlyExpenses;
    const targetAmount = config.TARGET_MONTHS_EXPENSES * monthlyExpenses;

    let status, recommendation, priority;

    if (monthsCovered < config.MIN_MONTHS_EXPENSES) {
        status = 'CRITICAL';
        priority = 1;
        recommendation = `Build emergency fund to ${config.MIN_MONTHS_EXPENSES} months ($${minRequired.toLocaleString()}) before investing`;
    } else if (monthsCovered < config.TARGET_MONTHS_EXPENSES) {
        status = 'ADEQUATE';
        priority = 2;
        recommendation = `Consider allocating 25% of contributions to reach ${config.TARGET_MONTHS_EXPENSES} month target`;
    } else {
        status = 'OPTIMAL';
        priority = 3;
        recommendation = 'Emergency fund at target level - maximize investment contributions';
    }

    return {
        currentReserve,
        monthlyExpenses,
        monthsCovered: Math.round(monthsCovered * 10) / 10,
        minRequired,
        targetAmount,
        shortfall: Math.max(0, minRequired - currentReserve),
        status,
        priority,
        recommendation
    };
}

// =============================================================================
// SECTION 7: REBALANCING ENGINE
// =============================================================================

/**
 * Calculate current allocation drift from targets
 * @param {Object} currentHoldings - { ticker: currentValue }
 * @param {Object} targetAllocations - { ticker: targetPercent }
 * @returns {Object} Drift analysis
 */
function calculateAllocationDrift(currentHoldings, targetAllocations) {
    const totalValue = Object.values(currentHoldings).reduce((sum, val) => sum + val, 0);
    const drift = {};
    let maxDrift = 0;

    for (const [ticker, targetPercent] of Object.entries(targetAllocations)) {
        const currentValue = currentHoldings[ticker] || 0;
        const currentPercent = totalValue > 0 ? currentValue / totalValue : 0;
        const driftAmount = currentPercent - targetPercent;

        drift[ticker] = {
            targetPercent,
            currentPercent,
            driftPercent: driftAmount,
            driftDollars: driftAmount * totalValue,
            needsRebalance: Math.abs(driftAmount) >= TSWB_CONFIG.REBALANCING.THRESHOLD_PERCENT
        };

        maxDrift = Math.max(maxDrift, Math.abs(driftAmount));
    }

    return {
        drift,
        totalValue,
        maxDrift,
        rebalanceRequired: maxDrift >= TSWB_CONFIG.REBALANCING.THRESHOLD_PERCENT
    };
}

/**
 * Generate rebalancing trades
 * Uses contribution-first strategy when possible
 */
function generateRebalancingTrades(currentHoldings, targetAllocations, newContribution = 0) {
    const analysis = calculateAllocationDrift(currentHoldings, targetAllocations);
    const trades = [];

    if (!analysis.rebalanceRequired && newContribution === 0) {
        return { trades: [], reason: 'No rebalancing required' };
    }

    const newTotalValue = analysis.totalValue + newContribution;

    // Calculate target dollar amounts
    const targetDollars = {};
    const currentDollars = {};
    const differences = {};

    for (const [ticker, targetPercent] of Object.entries(targetAllocations)) {
        targetDollars[ticker] = newTotalValue * targetPercent;
        currentDollars[ticker] = currentHoldings[ticker] || 0;
        differences[ticker] = targetDollars[ticker] - currentDollars[ticker];
    }

    // Strategy 1: Use new contributions to rebalance (tax-efficient)
    if (newContribution > 0 && TSWB_CONFIG.REBALANCING.USE_CONTRIBUTIONS_FIRST) {
        let remainingContribution = newContribution;

        // Sort by most underweight first
        const sortedByNeed = Object.entries(differences)
            .filter(([ticker, diff]) => diff > 0)
            .sort((a, b) => b[1] - a[1]);

        for (const [ticker, need] of sortedByNeed) {
            if (remainingContribution <= 0) break;

            const buyAmount = Math.min(need, remainingContribution);
            if (buyAmount > 10) {  // Minimum trade size $10
                trades.push({
                    ticker,
                    action: 'BUY',
                    amount: Math.round(buyAmount * 100) / 100,
                    reason: 'Contribution-based rebalancing',
                    taxEfficient: true
                });
                remainingContribution -= buyAmount;
                differences[ticker] -= buyAmount;
            }
        }

        // If contribution didn't cover all needs, note remainder
        if (remainingContribution > 0) {
            // Distribute remainder proportionally
            const totalPositiveDiff = sortedByNeed.reduce((sum, [, diff]) => sum + Math.max(0, diff), 0);
            if (totalPositiveDiff > 0) {
                for (const [ticker] of sortedByNeed) {
                    const proportion = Math.max(0, differences[ticker]) / totalPositiveDiff;
                    const additionalBuy = remainingContribution * proportion;
                    if (additionalBuy > 10) {
                        trades.push({
                            ticker,
                            action: 'BUY',
                            amount: Math.round(additionalBuy * 100) / 100,
                            reason: 'Proportional distribution of remaining contribution',
                            taxEfficient: true
                        });
                    }
                }
            }
        }
    }

    // Strategy 2: Sell/Buy trades if drift still significant (less tax-efficient)
    const postContributionDrift = calculateAllocationDrift(
        Object.fromEntries(
            Object.entries(currentHoldings).map(([ticker, value]) => {
                const buyTrades = trades.filter(t => t.ticker === ticker && t.action === 'BUY');
                const addedValue = buyTrades.reduce((sum, t) => sum + t.amount, 0);
                return [ticker, value + addedValue];
            })
        ),
        targetAllocations
    );

    if (postContributionDrift.rebalanceRequired) {
        // Generate sell trades for overweight positions
        for (const [ticker, data] of Object.entries(postContributionDrift.drift)) {
            if (data.driftPercent > TSWB_CONFIG.REBALANCING.THRESHOLD_PERCENT) {
                trades.push({
                    ticker,
                    action: 'SELL',
                    amount: Math.round(Math.abs(data.driftDollars) * 100) / 100,
                    reason: 'Rebalancing overweight position',
                    taxEfficient: false,
                    taxNote: 'Consider tax implications before executing'
                });
            }
        }

        // Generate buy trades for underweight positions
        for (const [ticker, data] of Object.entries(postContributionDrift.drift)) {
            if (data.driftPercent < -TSWB_CONFIG.REBALANCING.THRESHOLD_PERCENT) {
                trades.push({
                    ticker,
                    action: 'BUY',
                    amount: Math.round(Math.abs(data.driftDollars) * 100) / 100,
                    reason: 'Rebalancing underweight position',
                    taxEfficient: false
                });
            }
        }
    }

    return {
        trades,
        preRebalanceAnalysis: analysis,
        newContribution,
        totalValue: newTotalValue
    };
}

// =============================================================================
// SECTION 8: RISK MANAGEMENT SYSTEM
// =============================================================================

/**
 * Calculate portfolio drawdown
 */
function calculateDrawdown(currentValue, peakValue) {
    if (peakValue <= 0) return 0;
    return (peakValue - currentValue) / peakValue;
}

/**
 * Calculate rolling volatility (annualized)
 */
function calculateVolatility(returns, lookbackDays = 21) {
    if (returns.length < lookbackDays) return null;

    const recentReturns = returns.slice(-lookbackDays);
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / lookbackDays;
    const squaredDiffs = recentReturns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / lookbackDays;
    const dailyStdDev = Math.sqrt(variance);

    // Annualize (252 trading days)
    return dailyStdDev * Math.sqrt(252);
}

/**
 * Comprehensive risk assessment
 */
function assessPortfolioRisk(portfolioData) {
    const {
        currentValue,
        peakValue,
        dailyReturns,
        safeAllocationValue,
        growthAllocationValue
    } = portfolioData;

    const thresholds = TSWB_CONFIG.RISK_THRESHOLDS;

    // Calculate metrics
    const drawdown = calculateDrawdown(currentValue, peakValue);
    const volatility = calculateVolatility(dailyReturns);
    const growthDrawdown = calculateDrawdown(
        growthAllocationValue,
        portfolioData.growthPeakValue || growthAllocationValue
    );

    // Determine risk status
    let riskStatus = 'NORMAL';
    let actions = [];

    if (drawdown >= thresholds.MAX_PORTFOLIO_DRAWDOWN) {
        riskStatus = 'CRITICAL';
        actions.push({
            action: 'GO_FULLY_DEFENSIVE',
            description: 'Move entire growth allocation to SHY/BIL',
            urgency: 'IMMEDIATE'
        });
    } else if (growthDrawdown >= thresholds.GROWTH_DEFENSIVE_TRIGGER) {
        riskStatus = 'ELEVATED';
        actions.push({
            action: 'GROWTH_TO_DEFENSIVE',
            description: 'Move growth allocation to defensive posture',
            urgency: 'THIS_WEEK'
        });
    } else if (volatility && volatility >= thresholds.VOLATILITY_CEILING) {
        riskStatus = 'CAUTIONARY';
        actions.push({
            action: 'REDUCE_GROWTH_EXPOSURE',
            description: 'Consider reducing growth allocation by 25%',
            urgency: 'NEXT_REBALANCE'
        });
    }

    // Recovery check
    const isRecovering = portfolioData.previousDrawdown &&
                         drawdown < portfolioData.previousDrawdown - thresholds.RECOVERY_THRESHOLD;

    if (isRecovering && portfolioData.currentMode === 'DEFENSIVE') {
        actions.push({
            action: 'CONSIDER_RESUMING_GROWTH',
            description: 'Drawdown recovering - evaluate returning to offensive positions',
            urgency: 'NEXT_REVIEW'
        });
    }

    return {
        metrics: {
            currentDrawdown: Math.round(drawdown * 10000) / 100,  // As percentage
            annualizedVolatility: volatility ? Math.round(volatility * 10000) / 100 : null,
            growthDrawdown: Math.round(growthDrawdown * 10000) / 100
        },
        thresholds: {
            maxDrawdown: thresholds.MAX_PORTFOLIO_DRAWDOWN * 100,
            growthDefensiveTrigger: thresholds.GROWTH_DEFENSIVE_TRIGGER * 100,
            volatilityCeiling: thresholds.VOLATILITY_CEILING * 100
        },
        riskStatus,
        actions,
        isRecovering,
        timestamp: new Date().toISOString()
    };
}

// =============================================================================
// SECTION 9: COMPLETE MONTHLY DECISION ENGINE
// =============================================================================

/**
 * MASTER ALGORITHM: Monthly Investment Decision
 *
 * This is the main entry point that orchestrates all components
 * Call this function monthly to get complete investment guidance
 */
function generateMonthlyInvestmentDecision(inputData) {
    const {
        currentDate,
        portfolioValue,
        peakPortfolioValue,
        currentHoldings,
        dailyReturns,
        priceData,
        emergencyReserve,
        monthlyExpenses,
        baseMonthlyContribution,
        growthPeakValue,
        previousDrawdown,
        currentMode
    } = inputData;

    const decision = {
        generatedAt: new Date().toISOString(),
        forMonth: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        sections: {}
    };

    // -------------------------------------------------------------------------
    // STEP 1: Emergency Reserve Check
    // -------------------------------------------------------------------------
    decision.sections.emergencyReserve = calculateEmergencyReserveStatus(
        emergencyReserve,
        monthlyExpenses
    );

    // If emergency fund critical, all contributions go there
    if (decision.sections.emergencyReserve.status === 'CRITICAL') {
        decision.primaryAction = {
            type: 'BUILD_EMERGENCY_FUND',
            description: 'Direct all contributions to emergency reserve',
            amount: baseMonthlyContribution,
            investmentContribution: 0
        };
        decision.skipInvestment = true;
        return decision;
    }

    // -------------------------------------------------------------------------
    // STEP 2: Calculate Seasonal Contribution
    // -------------------------------------------------------------------------
    decision.sections.seasonalContribution = calculateSeasonalContribution(
        baseMonthlyContribution,
        currentDate
    );

    // -------------------------------------------------------------------------
    // STEP 3: Risk Assessment
    // -------------------------------------------------------------------------
    decision.sections.riskAssessment = assessPortfolioRisk({
        currentValue: portfolioValue,
        peakValue: peakPortfolioValue,
        dailyReturns,
        safeAllocationValue: portfolioValue * TSWB_CONFIG.SAFE_ALLOCATION,
        growthAllocationValue: portfolioValue * TSWB_CONFIG.GROWTH_ALLOCATION,
        growthPeakValue,
        previousDrawdown,
        currentMode
    });

    // -------------------------------------------------------------------------
    // STEP 4: Generate Growth Signal (unless risk says defensive)
    // -------------------------------------------------------------------------
    let growthSignal;
    if (decision.sections.riskAssessment.riskStatus === 'CRITICAL') {
        growthSignal = {
            mode: 'DEFENSIVE',
            allocations: { 'SHY': 1.0 },
            reason: 'Risk management override - portfolio drawdown exceeds threshold'
        };
    } else {
        growthSignal = generateGrowthSignal(priceData);
    }
    decision.sections.growthSignal = growthSignal;

    // -------------------------------------------------------------------------
    // STEP 5: Build Target Allocations
    // -------------------------------------------------------------------------
    const targetAllocations = {};

    // Safe allocations (75% of portfolio)
    for (const [ticker, config] of Object.entries(SAFE_ALLOCATION_STRATEGY.allocations)) {
        targetAllocations[ticker] = config.targetPercent * TSWB_CONFIG.SAFE_ALLOCATION;
    }

    // Growth allocations (25% of portfolio)
    for (const [ticker, percent] of Object.entries(growthSignal.allocations)) {
        if (targetAllocations[ticker]) {
            targetAllocations[ticker] += percent * TSWB_CONFIG.GROWTH_ALLOCATION;
        } else {
            targetAllocations[ticker] = percent * TSWB_CONFIG.GROWTH_ALLOCATION;
        }
    }

    decision.sections.targetAllocations = targetAllocations;

    // -------------------------------------------------------------------------
    // STEP 6: Generate Rebalancing Trades
    // -------------------------------------------------------------------------
    decision.sections.rebalancing = generateRebalancingTrades(
        currentHoldings,
        targetAllocations,
        decision.sections.seasonalContribution.amount
    );

    // -------------------------------------------------------------------------
    // STEP 7: Generate Summary and Action Items
    // -------------------------------------------------------------------------
    decision.summary = generateDecisionSummary(decision);
    decision.actionItems = generateActionItems(decision);

    return decision;
}

/**
 * Generate human-readable summary
 */
function generateDecisionSummary(decision) {
    const { seasonalContribution, riskAssessment, growthSignal, emergencyReserve } = decision.sections;

    return {
        headline: `${seasonalContribution.season.replace('_', ' ')} Season - ${riskAssessment.riskStatus} Risk`,
        contributionAmount: seasonalContribution.amount,
        growthMode: growthSignal.mode,
        riskLevel: riskAssessment.riskStatus,
        emergencyStatus: emergencyReserve.status,
        keyPoints: [
            `Contributing $${seasonalContribution.amount.toLocaleString()} (${seasonalContribution.multiplier}x base)`,
            `Growth strategy: ${growthSignal.mode}${growthSignal.topAssets ? ` - Holding ${growthSignal.topAssets.join(', ')}` : ''}`,
            `Current drawdown: ${riskAssessment.metrics.currentDrawdown}%`,
            `Emergency fund: ${emergencyReserve.monthsCovered} months covered`
        ]
    };
}

/**
 * Generate prioritized action items
 */
function generateActionItems(decision) {
    const items = [];

    // Risk actions (highest priority)
    for (const action of decision.sections.riskAssessment.actions) {
        items.push({
            priority: action.urgency === 'IMMEDIATE' ? 1 : 2,
            category: 'RISK',
            action: action.action,
            description: action.description
        });
    }

    // Rebalancing actions
    if (decision.sections.rebalancing.trades.length > 0) {
        items.push({
            priority: 3,
            category: 'REBALANCING',
            action: 'EXECUTE_TRADES',
            description: `Execute ${decision.sections.rebalancing.trades.length} rebalancing trades`,
            trades: decision.sections.rebalancing.trades
        });
    }

    // Contribution action
    items.push({
        priority: 4,
        category: 'CONTRIBUTION',
        action: 'MAKE_CONTRIBUTION',
        description: `Contribute $${decision.sections.seasonalContribution.amount.toLocaleString()}`,
        amount: decision.sections.seasonalContribution.amount
    });

    // Emergency fund action if needed
    if (decision.sections.emergencyReserve.status === 'ADEQUATE') {
        items.push({
            priority: 5,
            category: 'EMERGENCY_FUND',
            action: 'TOP_UP_RESERVE',
            description: decision.sections.emergencyReserve.recommendation
        });
    }

    return items.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// SECTION 10: PSEUDOCODE SPECIFICATION
// =============================================================================

/**
 * COMPLETE ALGORITHM PSEUDOCODE
 * =============================
 *
 * MONTHLY_INVESTMENT_DECISION(portfolio_data):
 *
 *     // PHASE 1: SAFETY CHECKS
 *     emergency_status = CHECK_EMERGENCY_RESERVE(current_reserve, monthly_expenses)
 *     IF emergency_status == "CRITICAL":
 *         RETURN { action: "FUND_EMERGENCY_RESERVE", amount: full_contribution }
 *
 *     // PHASE 2: SEASONAL ADJUSTMENT
 *     current_season = GET_FARM_SEASON(current_date)
 *     contribution = base_contribution * SEASON_MULTIPLIER[current_season]
 *
 *     // PHASE 3: RISK ASSESSMENT
 *     drawdown = (peak_value - current_value) / peak_value
 *     volatility = CALCULATE_ROLLING_VOLATILITY(daily_returns, 21_days)
 *
 *     IF drawdown >= 15%:
 *         risk_status = "CRITICAL"
 *         growth_mode = "DEFENSIVE"  // Override momentum
 *     ELSE IF drawdown >= 10%:
 *         risk_status = "ELEVATED"
 *         growth_mode = "DEFENSIVE"
 *     ELSE:
 *         risk_status = "NORMAL"
 *         growth_mode = CALCULATE_MOMENTUM_SIGNAL()
 *
 *     // PHASE 4: MOMENTUM SIGNAL (if not overridden)
 *     IF growth_mode != "DEFENSIVE":
 *         FOR each asset in [QQQ, VUG, MTUM, VBK]:
 *             momentum_score[asset] = COMPOSITE_MOMENTUM(
 *                 weights: [0.25, 0.25, 0.25, 0.25],
 *                 lookbacks: [1, 3, 6, 12 months]
 *             )
 *
 *         top_assets = TOP_N(momentum_score, n=2)
 *         cash_return = MOMENTUM(SHY, 12_months)
 *
 *         passing_assets = FILTER(top_assets, WHERE momentum > cash_return)
 *
 *         IF passing_assets.empty:
 *             growth_mode = "DEFENSIVE"
 *             growth_holdings = { SHY: 100% }
 *         ELSE:
 *             growth_mode = "OFFENSIVE"
 *             growth_holdings = EQUAL_WEIGHT(passing_assets)
 *
 *     // PHASE 5: BUILD TARGET ALLOCATION
 *     target_allocation = {}
 *
 *     // Safe portion (75%)
 *     target_allocation += SAFE_STRATEGY * 0.75
 *     // Specifically:
 *     //   VTI:  15.0% (0.20 * 0.75)
 *     //   VXUS:  7.5% (0.10 * 0.75)
 *     //   BND:  15.0% (0.20 * 0.75)
 *     //   TIP:  11.25% (0.15 * 0.75)
 *     //   GOVT:  7.5% (0.10 * 0.75)
 *     //   GLD:   5.625% (0.075 * 0.75)
 *     //   DBC:   3.75% (0.05 * 0.75)
 *     //   SHY:   7.5% (0.10 * 0.75)
 *
 *     // Growth portion (25%)
 *     target_allocation += growth_holdings * 0.25
 *
 *     // PHASE 6: REBALANCING
 *     drift = CALCULATE_DRIFT(current_holdings, target_allocation)
 *
 *     IF max(drift) >= 5% OR new_contribution > 0:
 *         // Step A: Use contribution to buy underweight (tax-efficient)
 *         underweight = SORT_BY(drift, ascending=true)
 *         FOR each position in underweight WHERE drift < 0:
 *             buy_amount = MIN(position.shortfall, remaining_contribution)
 *             ADD_TRADE(BUY, position, buy_amount)
 *             remaining_contribution -= buy_amount
 *
 *         // Step B: If still drifted, sell/buy (less tax-efficient)
 *         IF still_needs_rebalancing:
 *             FOR each overweight position:
 *                 ADD_TRADE(SELL, position, excess_amount)
 *             FOR each underweight position:
 *                 ADD_TRADE(BUY, position, shortfall_amount)
 *
 *     // PHASE 7: RETURN DECISION
 *     RETURN {
 *         contribution_amount: contribution,
 *         trades: generated_trades,
 *         growth_mode: growth_mode,
 *         risk_status: risk_status,
 *         action_items: prioritized_actions
 *     }
 *
 * =============================
 * END PSEUDOCODE
 */

// =============================================================================
// SECTION 11: DASHBOARD INTEGRATION
// =============================================================================

/**
 * Format decision for dashboard display
 */
function formatForDashboard(decision) {
    return {
        // Header Card
        header: {
            title: 'Tiny Seed Wealth Builder',
            subtitle: decision.forMonth,
            statusBadge: decision.sections.riskAssessment.riskStatus,
            statusColor: getStatusColor(decision.sections.riskAssessment.riskStatus)
        },

        // Quick Stats
        stats: [
            {
                label: 'This Month\'s Contribution',
                value: `$${decision.sections.seasonalContribution.amount.toLocaleString()}`,
                subtext: `${decision.sections.seasonalContribution.season.replace('_', ' ')} season`,
                icon: 'fa-dollar-sign'
            },
            {
                label: 'Growth Mode',
                value: decision.sections.growthSignal.mode,
                subtext: decision.sections.growthSignal.topAssets?.join(', ') || 'Cash position',
                icon: decision.sections.growthSignal.mode === 'OFFENSIVE' ? 'fa-chart-line' : 'fa-shield-alt'
            },
            {
                label: 'Current Drawdown',
                value: `${decision.sections.riskAssessment.metrics.currentDrawdown}%`,
                subtext: `Max allowed: ${decision.sections.riskAssessment.thresholds.maxDrawdown}%`,
                icon: 'fa-chart-bar'
            },
            {
                label: 'Emergency Fund',
                value: `${decision.sections.emergencyReserve.monthsCovered} months`,
                subtext: decision.sections.emergencyReserve.status,
                icon: 'fa-piggy-bank'
            }
        ],

        // Allocation Chart Data
        allocationChart: Object.entries(decision.sections.targetAllocations).map(([ticker, percent]) => ({
            name: ticker,
            value: Math.round(percent * 10000) / 100,
            category: getCategoryForTicker(ticker)
        })),

        // Trade List
        trades: decision.sections.rebalancing.trades,

        // Action Items
        actions: decision.actionItems
    };
}

function getStatusColor(status) {
    const colors = {
        'NORMAL': '#2a9d8f',
        'CAUTIONARY': '#e9c46a',
        'ELEVATED': '#f4a261',
        'CRITICAL': '#e63946'
    };
    return colors[status] || '#8d99ae';
}

function getCategoryForTicker(ticker) {
    const categories = {
        'VTI': 'US Equity', 'VXUS': 'International Equity',
        'BND': 'Bonds', 'TIP': 'TIPS', 'GOVT': 'Treasuries',
        'GLD': 'Gold', 'DBC': 'Commodities', 'SHY': 'Short-Term',
        'QQQ': 'Growth', 'VUG': 'Growth', 'MTUM': 'Momentum', 'VBK': 'Small Cap',
        'BIL': 'Cash'
    };
    return categories[ticker] || 'Other';
}

// =============================================================================
// SECTION 12: EXPORT CONFIGURATION & SUMMARY
// =============================================================================

/**
 * ALGORITHM SUMMARY
 * =================
 *
 * SAFE ALLOCATION (75% of Portfolio):
 * - Strategy: Modified All-Weather
 * - Expected Return: 5-7% annually
 * - Max Drawdown: 12-15%
 * - Composition:
 *   - US Stocks (VTI): 20%
 *   - Int'l Stocks (VXUS): 10%
 *   - US Bonds (BND): 20%
 *   - TIPS (TIP): 15%
 *   - Treasuries (GOVT): 10%
 *   - Gold (GLD): 7.5%
 *   - Commodities (DBC): 5%
 *   - Short-term (SHY): 10%
 *   - Cash Buffer: 2.5%
 *
 * GROWTH ALLOCATION (25% of Portfolio):
 * - Strategy: Dual Momentum + Factor Tilt
 * - Expected Return: 8-15% annually
 * - Max Drawdown: 20-30%
 * - Offensive Holdings: QQQ, VUG, MTUM, VBK
 * - Defensive Holding: SHY
 * - Signal: 12-month absolute momentum + composite relative momentum
 *
 * COMBINED PORTFOLIO:
 * - Blended Expected Return: 6-9% annually
 * - Blended Max Drawdown: 15-18%
 * - Tax-Efficient Rebalancing Priority
 * - Seasonal Contribution Optimization
 *
 * FARM-SPECIFIC FEATURES:
 * - Harvest season (Jun-Oct): 150% contributions
 * - Planting season (Mar-May): 75% contributions
 * - Winter (Nov-Feb): 25% contributions
 * - 6-12 month emergency reserve requirement
 * - Automatic defensive mode during high drawdowns
 */

// Export all components for use in dashboard
const TinySeedWealthBuilder = {
    // Configuration
    CONFIG: TSWB_CONFIG,
    SAFE_STRATEGY: SAFE_ALLOCATION_STRATEGY,
    GROWTH_STRATEGY: GROWTH_ALLOCATION_STRATEGY,

    // Core Functions
    calculateMomentumScore,
    calculateCompositeMomentum,
    generateGrowthSignal,

    // Farm Seasonality
    getFarmSeason,
    calculateSeasonalContribution,
    generateAnnualContributionSchedule,

    // Emergency Reserve
    calculateEmergencyReserveStatus,

    // Rebalancing
    calculateAllocationDrift,
    generateRebalancingTrades,

    // Risk Management
    calculateDrawdown,
    calculateVolatility,
    assessPortfolioRisk,

    // Main Decision Engine
    generateMonthlyInvestmentDecision,

    // Dashboard Integration
    formatForDashboard,

    // Version Info
    VERSION: '1.0.0',
    LAST_UPDATED: '2026-01-15'
};

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.TinySeedWealthBuilder = TinySeedWealthBuilder;
}

// Export for Node.js/modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinySeedWealthBuilder;
}
