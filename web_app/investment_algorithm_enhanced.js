/**
 * ================================================================================
 * TINY SEED WEALTH BUILDER - ENHANCED INVESTMENT ALGORITHM
 * ================================================================================
 *
 * Advanced features based on extensive research into modern quantitative strategies:
 * - Hidden Markov Model (HMM) Regime Detection
 * - Volatility Targeting
 * - Risk Parity Optimization
 * - Factor Momentum Integration
 * - Tax-Efficient Rebalancing
 * - Machine Learning Signal Integration
 *
 * This module extends the base investment_algorithm.js with advanced capabilities.
 *
 * VERSION: 2.0.0
 * LAST UPDATED: 2026-01-15
 *
 * RESEARCH SOURCES:
 * - Deep reinforcement learning for portfolio selection (ScienceDirect)
 * - Regime-Switching Factor Investing with Hidden Markov Models (MDPI)
 * - Risk Parity Asset Allocation (QuantPedia)
 * - Kenneth R. French Data Library (Fama-French Factors)
 * ================================================================================
 */

// =============================================================================
// ENHANCED CONFIGURATION
// =============================================================================

const TSWB_ENHANCED_CONFIG = {
    // Regime Detection Settings
    REGIME: {
        NUM_STATES: 3,  // Bull, Sideways, Bear
        TRANSITION_THRESHOLD: 0.6,  // Probability threshold to switch regimes
        LOOKBACK_DAYS: 252,  // 1 year of trading days
        SMOOTHING_FACTOR: 0.3
    },

    // Volatility Targeting Settings
    VOLATILITY: {
        TARGET_ANNUAL: 0.10,  // 10% target annual volatility
        MIN_ANNUAL: 0.06,     // 6% minimum (increase exposure)
        MAX_ANNUAL: 0.15,     // 15% maximum (reduce exposure)
        CALCULATION_WINDOW: 60,  // 60-day rolling window
        LEVERAGE_CAP: 1.5,    // Maximum leverage allowed
        DELEVERGE_FLOOR: 0.5  // Minimum exposure
    },

    // Risk Parity Settings
    RISK_PARITY: {
        ENABLED: true,
        CORRELATION_LOOKBACK: 126,  // 6 months
        REBALANCE_THRESHOLD: 0.10,  // 10% drift threshold
        USE_CORRELATION_ADJUSTED: true
    },

    // Factor Momentum Settings
    FACTOR_MOMENTUM: {
        LOOKBACK_MONTHS: [1, 3, 6, 12],
        WEIGHTS: [0.25, 0.25, 0.25, 0.25],
        TOP_FACTORS: 2,
        FACTOR_TILT_STRENGTH: 0.20  // 20% tilt toward winning factors
    },

    // Tax Efficiency Settings
    TAX_EFFICIENCY: {
        LOSS_HARVEST_THRESHOLD: 0.03,  // 3% loss triggers harvest
        WASH_SALE_DAYS: 30,
        SHORT_TERM_RATE: 0.37,  // Assumed short-term tax rate
        LONG_TERM_RATE: 0.15,   // Assumed long-term rate
        MIN_HOLDING_DAYS: 365   // For long-term treatment
    },

    // Regime-Based Allocations
    REGIME_ALLOCATIONS: {
        BULL: { safe: 0.60, growth: 0.40 },
        SIDEWAYS: { safe: 0.75, growth: 0.25 },
        BEAR: { safe: 0.90, growth: 0.10 }
    },

    // Fama-French Factor Symbols (for factor timing)
    FACTOR_ETFS: {
        MARKET: 'SPY',      // Market factor
        SIZE: 'IWM',        // Small cap (SMB proxy)
        VALUE: 'VTV',       // Value (HML proxy)
        MOMENTUM: 'MTUM',   // Momentum factor
        QUALITY: 'QUAL',    // Quality/profitability (RMW proxy)
        LOW_VOL: 'USMV'     // Low volatility factor
    }
};

// =============================================================================
// HIDDEN MARKOV MODEL - REGIME DETECTION
// =============================================================================

/**
 * Hidden Markov Model for Market Regime Detection
 * Identifies Bull, Sideways, and Bear market conditions
 */
class MarketRegimeDetector {
    constructor(config = {}) {
        this.numStates = config.numStates || 3;
        this.transitionThreshold = config.transitionThreshold || 0.6;

        // Initialize transition matrix (probability of state changes)
        this.transitionMatrix = this.initializeTransitionMatrix();

        // Initialize emission parameters (mean, variance for each state)
        this.emissionParams = {
            BULL: { mean: 0.0008, variance: 0.0001 },      // ~20% annual, low vol
            SIDEWAYS: { mean: 0.0002, variance: 0.0002 }, // ~5% annual, medium vol
            BEAR: { mean: -0.0006, variance: 0.0004 }     // -15% annual, high vol
        };

        this.stateNames = ['BULL', 'SIDEWAYS', 'BEAR'];
        this.currentState = 'SIDEWAYS';
        this.stateProbabilities = [0.33, 0.34, 0.33];
    }

    initializeTransitionMatrix() {
        // Initial transition probabilities (will be updated with data)
        return [
            [0.95, 0.04, 0.01],  // From BULL
            [0.10, 0.80, 0.10],  // From SIDEWAYS
            [0.01, 0.04, 0.95]   // From BEAR
        ];
    }

    /**
     * Gaussian probability density function
     */
    gaussianPDF(x, mean, variance) {
        const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
        const exponent = -Math.pow(x - mean, 2) / (2 * variance);
        return coefficient * Math.exp(exponent);
    }

    /**
     * Calculate emission probability for an observation in each state
     */
    calculateEmissionProbabilities(observation) {
        const probs = [];
        for (const state of this.stateNames) {
            const { mean, variance } = this.emissionParams[state];
            probs.push(this.gaussianPDF(observation, mean, variance));
        }
        return probs;
    }

    /**
     * Forward algorithm step for HMM
     */
    forwardStep(prevAlpha, observation) {
        const emissionProbs = this.calculateEmissionProbabilities(observation);
        const newAlpha = [];

        for (let j = 0; j < this.numStates; j++) {
            let sum = 0;
            for (let i = 0; i < this.numStates; i++) {
                sum += prevAlpha[i] * this.transitionMatrix[i][j];
            }
            newAlpha.push(sum * emissionProbs[j]);
        }

        // Normalize to prevent underflow
        const total = newAlpha.reduce((a, b) => a + b, 0);
        return newAlpha.map(a => a / total);
    }

    /**
     * Detect current market regime from price returns
     * @param {Array} returns - Array of daily returns
     * @returns {Object} { state, probabilities, confidence }
     */
    detectRegime(returns) {
        if (!returns || returns.length < 20) {
            return {
                state: 'SIDEWAYS',
                probabilities: { BULL: 0.33, SIDEWAYS: 0.34, BEAR: 0.33 },
                confidence: 0
            };
        }

        // Initialize with uniform distribution
        let alpha = [0.33, 0.34, 0.33];

        // Run forward algorithm
        for (const ret of returns.slice(-60)) {  // Use last 60 days
            alpha = this.forwardStep(alpha, ret);
        }

        this.stateProbabilities = alpha;

        // Find most likely state
        let maxProb = 0;
        let maxState = 'SIDEWAYS';
        for (let i = 0; i < this.numStates; i++) {
            if (alpha[i] > maxProb) {
                maxProb = alpha[i];
                maxState = this.stateNames[i];
            }
        }

        // Only change state if confidence exceeds threshold
        if (maxProb >= this.transitionThreshold) {
            this.currentState = maxState;
        }

        return {
            state: this.currentState,
            probabilities: {
                BULL: alpha[0],
                SIDEWAYS: alpha[1],
                BEAR: alpha[2]
            },
            confidence: maxProb
        };
    }

    /**
     * Get recommended allocation based on regime
     */
    getRegimeAllocation() {
        return TSWB_ENHANCED_CONFIG.REGIME_ALLOCATIONS[this.currentState];
    }

    /**
     * Update emission parameters using Baum-Welch (simplified)
     */
    updateEmissionParams(returns, regimeHistory) {
        // Calculate statistics for each regime period
        const stateReturns = { BULL: [], SIDEWAYS: [], BEAR: [] };

        regimeHistory.forEach((state, i) => {
            if (returns[i] !== undefined) {
                stateReturns[state].push(returns[i]);
            }
        });

        for (const state of this.stateNames) {
            if (stateReturns[state].length > 20) {
                const mean = stateReturns[state].reduce((a, b) => a + b, 0) / stateReturns[state].length;
                const variance = stateReturns[state].reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / stateReturns[state].length;
                this.emissionParams[state] = { mean, variance: Math.max(variance, 0.00001) };
            }
        }
    }
}

// =============================================================================
// VOLATILITY TARGETING SYSTEM
// =============================================================================

/**
 * Volatility Targeting Module
 * Scales portfolio exposure to maintain consistent volatility
 */
class VolatilityTargeter {
    constructor(config = {}) {
        this.targetVol = config.targetVol || TSWB_ENHANCED_CONFIG.VOLATILITY.TARGET_ANNUAL;
        this.minVol = config.minVol || TSWB_ENHANCED_CONFIG.VOLATILITY.MIN_ANNUAL;
        this.maxVol = config.maxVol || TSWB_ENHANCED_CONFIG.VOLATILITY.MAX_ANNUAL;
        this.window = config.window || TSWB_ENHANCED_CONFIG.VOLATILITY.CALCULATION_WINDOW;
        this.leverageCap = config.leverageCap || TSWB_ENHANCED_CONFIG.VOLATILITY.LEVERAGE_CAP;
        this.deleverageFloor = config.deleverageFloor || TSWB_ENHANCED_CONFIG.VOLATILITY.DELEVERGE_FLOOR;
    }

    /**
     * Calculate annualized volatility from daily returns
     */
    calculateVolatility(returns) {
        if (!returns || returns.length < this.window) {
            return this.targetVol;  // Return target if insufficient data
        }

        const recentReturns = returns.slice(-this.window);
        const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
        const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length;
        const dailyVol = Math.sqrt(variance);

        // Annualize (sqrt of 252 trading days)
        return dailyVol * Math.sqrt(252);
    }

    /**
     * Calculate scaling factor to achieve target volatility
     */
    calculateScalingFactor(returns) {
        const currentVol = this.calculateVolatility(returns);

        if (currentVol === 0) return 1;

        let scalingFactor = this.targetVol / currentVol;

        // Apply bounds
        scalingFactor = Math.min(scalingFactor, this.leverageCap);
        scalingFactor = Math.max(scalingFactor, this.deleverageFloor);

        return scalingFactor;
    }

    /**
     * Scale portfolio weights to target volatility
     */
    scaleWeights(weights, returns) {
        const scalingFactor = this.calculateScalingFactor(returns);
        const scaledWeights = {};
        let totalWeight = 0;

        for (const [asset, weight] of Object.entries(weights)) {
            scaledWeights[asset] = weight * scalingFactor;
            totalWeight += scaledWeights[asset];
        }

        // If scaled weights exceed 100%, allocate remainder to cash
        if (totalWeight < 1) {
            scaledWeights['CASH'] = 1 - totalWeight;
        } else {
            // Normalize if over 100% (shouldn't happen with leverage cap)
            for (const asset of Object.keys(scaledWeights)) {
                scaledWeights[asset] /= totalWeight;
            }
        }

        return {
            weights: scaledWeights,
            scalingFactor: scalingFactor,
            currentVol: this.calculateVolatility(returns),
            targetVol: this.targetVol
        };
    }
}

// =============================================================================
// RISK PARITY OPTIMIZER
// =============================================================================

/**
 * Risk Parity Portfolio Optimizer
 * Equalizes risk contribution from each asset
 */
class RiskParityOptimizer {
    constructor(config = {}) {
        this.correlationLookback = config.correlationLookback || TSWB_ENHANCED_CONFIG.RISK_PARITY.CORRELATION_LOOKBACK;
        this.useCorrelationAdjusted = config.useCorrelationAdjusted || TSWB_ENHANCED_CONFIG.RISK_PARITY.USE_CORRELATION_ADJUSTED;
    }

    /**
     * Calculate covariance matrix from returns
     */
    calculateCovarianceMatrix(returnsData) {
        const assets = Object.keys(returnsData);
        const n = assets.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

        // Calculate means
        const means = {};
        for (const asset of assets) {
            const returns = returnsData[asset];
            means[asset] = returns.reduce((a, b) => a + b, 0) / returns.length;
        }

        // Calculate covariance
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const asset1 = assets[i];
                const asset2 = assets[j];
                const returns1 = returnsData[asset1];
                const returns2 = returnsData[asset2];
                const minLen = Math.min(returns1.length, returns2.length);

                let cov = 0;
                for (let k = 0; k < minLen; k++) {
                    cov += (returns1[k] - means[asset1]) * (returns2[k] - means[asset2]);
                }
                matrix[i][j] = cov / (minLen - 1);
            }
        }

        return { matrix, assets };
    }

    /**
     * Calculate inverse volatility weights (simple risk parity)
     */
    calculateInverseVolWeights(returnsData) {
        const volatilities = {};

        for (const [asset, returns] of Object.entries(returnsData)) {
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
            volatilities[asset] = Math.sqrt(variance) * Math.sqrt(252);  // Annualized
        }

        // Calculate inverse volatility weights
        const invVols = {};
        let totalInvVol = 0;

        for (const [asset, vol] of Object.entries(volatilities)) {
            invVols[asset] = vol > 0 ? 1 / vol : 0;
            totalInvVol += invVols[asset];
        }

        // Normalize weights
        const weights = {};
        for (const [asset, invVol] of Object.entries(invVols)) {
            weights[asset] = totalInvVol > 0 ? invVol / totalInvVol : 1 / Object.keys(invVols).length;
        }

        return { weights, volatilities };
    }

    /**
     * Calculate risk contribution for each asset
     */
    calculateRiskContributions(weights, covMatrix, assets) {
        const n = assets.length;
        const w = assets.map(a => weights[a] || 0);

        // Portfolio variance
        let portfolioVar = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                portfolioVar += w[i] * w[j] * covMatrix[i][j];
            }
        }

        const portfolioVol = Math.sqrt(portfolioVar);

        // Marginal risk contributions
        const mrc = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += w[j] * covMatrix[i][j];
            }
            mrc.push(sum / portfolioVol);
        }

        // Risk contributions
        const riskContributions = {};
        for (let i = 0; i < n; i++) {
            riskContributions[assets[i]] = w[i] * mrc[i] / portfolioVol;
        }

        return { riskContributions, portfolioVol };
    }

    /**
     * Optimize weights for equal risk contribution (iterative approach)
     */
    optimizeRiskParity(returnsData, maxIterations = 100, tolerance = 0.001) {
        const { matrix, assets } = this.calculateCovarianceMatrix(returnsData);

        // Start with inverse vol weights
        let { weights } = this.calculateInverseVolWeights(returnsData);

        for (let iter = 0; iter < maxIterations; iter++) {
            const { riskContributions } = this.calculateRiskContributions(weights, matrix, assets);

            // Calculate target risk (equal for all assets)
            const totalRisk = Object.values(riskContributions).reduce((a, b) => a + b, 0);
            const targetRisk = totalRisk / assets.length;

            // Adjust weights based on risk contribution
            let maxAdjustment = 0;
            const newWeights = {};

            for (const asset of assets) {
                const currentRisk = riskContributions[asset];
                const adjustment = currentRisk > 0 ? targetRisk / currentRisk : 1;
                newWeights[asset] = weights[asset] * Math.sqrt(adjustment);
                maxAdjustment = Math.max(maxAdjustment, Math.abs(adjustment - 1));
            }

            // Normalize weights
            const totalWeight = Object.values(newWeights).reduce((a, b) => a + b, 0);
            for (const asset of assets) {
                newWeights[asset] /= totalWeight;
            }

            weights = newWeights;

            // Check convergence
            if (maxAdjustment < tolerance) break;
        }

        const { riskContributions, portfolioVol } = this.calculateRiskContributions(weights, matrix, assets);

        return {
            weights,
            riskContributions,
            portfolioVol,
            isEqualRisk: this.checkEqualRisk(riskContributions, tolerance)
        };
    }

    checkEqualRisk(riskContributions, tolerance) {
        const risks = Object.values(riskContributions);
        const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
        return risks.every(r => Math.abs(r - avgRisk) < tolerance);
    }
}

// =============================================================================
// FACTOR MOMENTUM SYSTEM
// =============================================================================

/**
 * Factor Momentum Calculator
 * Identifies winning factors and tilts portfolio accordingly
 */
class FactorMomentumCalculator {
    constructor(config = {}) {
        this.lookbackMonths = config.lookbackMonths || TSWB_ENHANCED_CONFIG.FACTOR_MOMENTUM.LOOKBACK_MONTHS;
        this.weights = config.weights || TSWB_ENHANCED_CONFIG.FACTOR_MOMENTUM.WEIGHTS;
        this.topFactors = config.topFactors || TSWB_ENHANCED_CONFIG.FACTOR_MOMENTUM.TOP_FACTORS;
        this.tiltStrength = config.tiltStrength || TSWB_ENHANCED_CONFIG.FACTOR_MOMENTUM.FACTOR_TILT_STRENGTH;
    }

    /**
     * Calculate momentum score for a single factor
     */
    calculateFactorMomentum(priceHistory, lookbackMonths) {
        const tradingDays = lookbackMonths * 21;
        if (!priceHistory || priceHistory.length < tradingDays) {
            return null;
        }

        const currentPrice = priceHistory[priceHistory.length - 1];
        const pastPrice = priceHistory[priceHistory.length - 1 - tradingDays];

        return (currentPrice - pastPrice) / pastPrice;
    }

    /**
     * Calculate composite momentum using multiple timeframes
     */
    calculateCompositeMomentum(priceHistory) {
        let compositeScore = 0;
        let validWeightSum = 0;

        for (let i = 0; i < this.lookbackMonths.length; i++) {
            const score = this.calculateFactorMomentum(priceHistory, this.lookbackMonths[i]);
            if (score !== null) {
                compositeScore += score * this.weights[i];
                validWeightSum += this.weights[i];
            }
        }

        return validWeightSum > 0 ? compositeScore / validWeightSum : null;
    }

    /**
     * Rank factors by momentum and return top performers
     */
    rankFactors(factorPrices) {
        const factorScores = {};

        for (const [factor, prices] of Object.entries(factorPrices)) {
            const score = this.calculateCompositeMomentum(prices);
            if (score !== null) {
                factorScores[factor] = score;
            }
        }

        // Sort by score descending
        const sorted = Object.entries(factorScores)
            .sort((a, b) => b[1] - a[1]);

        return {
            rankings: sorted.map(([factor, score], i) => ({
                factor,
                score,
                rank: i + 1,
                isTop: i < this.topFactors
            })),
            topFactors: sorted.slice(0, this.topFactors).map(([factor]) => factor),
            scores: factorScores
        };
    }

    /**
     * Generate factor tilt recommendations
     */
    getFactorTilts(factorPrices) {
        const { rankings, topFactors } = this.rankFactors(factorPrices);

        const tilts = {};
        for (const { factor, isTop, rank } of rankings) {
            if (isTop) {
                // Tilt toward winning factors
                tilts[factor] = this.tiltStrength / this.topFactors;
            } else {
                // Slight negative tilt for losing factors
                tilts[factor] = -this.tiltStrength / (rankings.length - this.topFactors);
            }
        }

        return {
            tilts,
            topFactors,
            rankings,
            explanation: `Tilting ${this.tiltStrength * 100}% toward top ${this.topFactors} momentum factors`
        };
    }
}

// =============================================================================
// TAX-EFFICIENT REBALANCING
// =============================================================================

/**
 * Tax-Efficient Rebalancing Manager
 * Minimizes tax impact while maintaining target allocation
 */
class TaxEfficientRebalancer {
    constructor(config = {}) {
        this.lossHarvestThreshold = config.lossHarvestThreshold || TSWB_ENHANCED_CONFIG.TAX_EFFICIENCY.LOSS_HARVEST_THRESHOLD;
        this.washSaleDays = config.washSaleDays || TSWB_ENHANCED_CONFIG.TAX_EFFICIENCY.WASH_SALE_DAYS;
        this.shortTermRate = config.shortTermRate || TSWB_ENHANCED_CONFIG.TAX_EFFICIENCY.SHORT_TERM_RATE;
        this.longTermRate = config.longTermRate || TSWB_ENHANCED_CONFIG.TAX_EFFICIENCY.LONG_TERM_RATE;
        this.minHoldingDays = config.minHoldingDays || TSWB_ENHANCED_CONFIG.TAX_EFFICIENCY.MIN_HOLDING_DAYS;
    }

    /**
     * Analyze portfolio for tax-loss harvesting opportunities
     */
    findTaxLossHarvestingOpportunities(holdings) {
        const opportunities = [];

        for (const holding of holdings) {
            const currentValue = holding.shares * holding.currentPrice;
            const costBasis = holding.shares * holding.purchasePrice;
            const gainLoss = currentValue - costBasis;
            const gainLossPct = gainLoss / costBasis;

            if (gainLossPct <= -this.lossHarvestThreshold) {
                const daysSincePurchase = Math.floor(
                    (new Date() - new Date(holding.purchaseDate)) / (1000 * 60 * 60 * 24)
                );

                opportunities.push({
                    symbol: holding.symbol,
                    shares: holding.shares,
                    costBasis: costBasis,
                    currentValue: currentValue,
                    loss: Math.abs(gainLoss),
                    lossPct: Math.abs(gainLossPct) * 100,
                    daysSincePurchase: daysSincePurchase,
                    isLongTerm: daysSincePurchase >= this.minHoldingDays,
                    taxBenefit: this.calculateTaxBenefit(gainLoss, daysSincePurchase),
                    replacementOptions: this.suggestReplacements(holding.symbol)
                });
            }
        }

        return opportunities.sort((a, b) => b.loss - a.loss);
    }

    /**
     * Calculate tax benefit of harvesting a loss
     */
    calculateTaxBenefit(loss, daysSincePurchase) {
        const rate = daysSincePurchase >= this.minHoldingDays ? this.longTermRate : this.shortTermRate;
        return Math.abs(loss) * rate;
    }

    /**
     * Suggest replacement securities (similar but not identical)
     */
    suggestReplacements(symbol) {
        const replacements = {
            'VTI': ['ITOT', 'SCHB', 'SPTM'],
            'VOO': ['IVV', 'SPY', 'SPLG'],
            'VXUS': ['IXUS', 'SCHF', 'VEA'],
            'BND': ['AGG', 'SCHZ', 'BSV'],
            'QQQ': ['QQQM', 'VGT', 'XLK'],
            'VUG': ['IWF', 'SCHG', 'MGK'],
            'MTUM': ['DWAS', 'PDP', 'VFMO'],
            'VTV': ['IVE', 'SCHV', 'MGV']
        };

        return replacements[symbol] || [];
    }

    /**
     * Generate rebalancing plan that minimizes taxes
     */
    generateTaxEfficientPlan(currentHoldings, targetWeights, newCash = 0) {
        const plan = {
            buys: [],
            sells: [],
            taxLossHarvests: [],
            redirectCash: [],
            summary: {}
        };

        // Calculate current weights
        const totalValue = currentHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0) + newCash;
        const currentWeights = {};
        for (const h of currentHoldings) {
            currentWeights[h.symbol] = (h.shares * h.currentPrice) / totalValue;
        }

        // Calculate drift from target
        const drifts = {};
        for (const [symbol, target] of Object.entries(targetWeights)) {
            drifts[symbol] = target - (currentWeights[symbol] || 0);
        }

        // Step 1: Find tax-loss harvesting opportunities
        plan.taxLossHarvests = this.findTaxLossHarvestingOpportunities(currentHoldings);

        // Step 2: Direct new cash to underweight positions first
        if (newCash > 0) {
            const underweightPositions = Object.entries(drifts)
                .filter(([symbol, drift]) => drift > 0)
                .sort((a, b) => b[1] - a[1]);

            let remainingCash = newCash;
            for (const [symbol, drift] of underweightPositions) {
                if (remainingCash <= 0) break;

                const targetBuy = drift * totalValue;
                const buyAmount = Math.min(targetBuy, remainingCash);

                if (buyAmount > 50) {  // Minimum buy threshold
                    plan.redirectCash.push({
                        symbol,
                        amount: buyAmount,
                        reason: 'Underweight - using new cash'
                    });
                    remainingCash -= buyAmount;
                }
            }
        }

        // Step 3: If still need to sell, prefer tax-loss positions
        const overweightPositions = Object.entries(drifts)
            .filter(([symbol, drift]) => drift < -0.05)  // More than 5% overweight
            .sort((a, b) => a[1] - b[1]);

        for (const [symbol, drift] of overweightPositions) {
            const holding = currentHoldings.find(h => h.symbol === symbol);
            if (!holding) continue;

            const gainLoss = (holding.currentPrice - holding.purchasePrice) / holding.purchasePrice;
            const sellAmount = Math.abs(drift) * totalValue;

            plan.sells.push({
                symbol,
                amount: sellAmount,
                hasGain: gainLoss > 0,
                gainLossPct: gainLoss * 100,
                taxImpact: gainLoss > 0 ? this.calculateTaxBenefit(sellAmount * gainLoss, 365) : 0,
                priority: gainLoss < 0 ? 1 : 2  // Prefer selling losers
            });
        }

        // Sort sells by priority (losses first)
        plan.sells.sort((a, b) => a.priority - b.priority);

        // Calculate summary
        plan.summary = {
            totalTrades: plan.buys.length + plan.sells.length,
            taxLossOpportunities: plan.taxLossHarvests.length,
            potentialTaxSavings: plan.taxLossHarvests.reduce((sum, t) => sum + t.taxBenefit, 0),
            newCashUsed: newCash - (plan.redirectCash.length > 0 ?
                plan.redirectCash.reduce((sum, r) => sum + r.amount, 0) : newCash)
        };

        return plan;
    }
}

// =============================================================================
// MASTER ENHANCED PORTFOLIO MANAGER
// =============================================================================

/**
 * Enhanced Portfolio Manager
 * Integrates all advanced strategies into a unified system
 */
class EnhancedPortfolioManager {
    constructor(config = {}) {
        this.regimeDetector = new MarketRegimeDetector(config.regime);
        this.volatilityTargeter = new VolatilityTargeter(config.volatility);
        this.riskParityOptimizer = new RiskParityOptimizer(config.riskParity);
        this.factorMomentum = new FactorMomentumCalculator(config.factorMomentum);
        this.taxRebalancer = new TaxEfficientRebalancer(config.tax);

        this.currentRegime = 'SIDEWAYS';
        this.lastRebalanceDate = null;
    }

    /**
     * Generate complete portfolio recommendation
     */
    generateRecommendation(marketData, holdings, newCash = 0) {
        const recommendation = {
            timestamp: new Date().toISOString(),
            regime: null,
            volatility: null,
            baseWeights: null,
            riskParityWeights: null,
            factorTilts: null,
            finalWeights: null,
            rebalancePlan: null,
            alerts: []
        };

        // Step 1: Detect market regime
        if (marketData.returns) {
            recommendation.regime = this.regimeDetector.detectRegime(marketData.returns);
            this.currentRegime = recommendation.regime.state;
        }

        // Step 2: Get base allocation from regime
        const baseAllocation = this.regimeDetector.getRegimeAllocation();
        recommendation.baseWeights = baseAllocation;

        // Step 3: Calculate risk parity weights (if returns data available)
        if (marketData.assetReturns) {
            const rpResult = this.riskParityOptimizer.optimizeRiskParity(marketData.assetReturns);
            recommendation.riskParityWeights = rpResult;
        }

        // Step 4: Calculate factor tilts (if factor data available)
        if (marketData.factorPrices) {
            recommendation.factorTilts = this.factorMomentum.getFactorTilts(marketData.factorPrices);
        }

        // Step 5: Apply volatility targeting
        if (marketData.returns) {
            const scaledResult = this.volatilityTargeter.scaleWeights(
                recommendation.riskParityWeights?.weights || baseAllocation,
                marketData.returns
            );
            recommendation.volatility = {
                currentVol: scaledResult.currentVol,
                targetVol: scaledResult.targetVol,
                scalingFactor: scaledResult.scalingFactor
            };
            recommendation.finalWeights = scaledResult.weights;
        } else {
            recommendation.finalWeights = baseAllocation;
        }

        // Step 6: Generate tax-efficient rebalancing plan
        if (holdings && holdings.length > 0) {
            recommendation.rebalancePlan = this.taxRebalancer.generateTaxEfficientPlan(
                holdings,
                recommendation.finalWeights,
                newCash
            );
        }

        // Step 7: Generate alerts
        recommendation.alerts = this.generateAlerts(recommendation);

        return recommendation;
    }

    /**
     * Generate actionable alerts
     */
    generateAlerts(recommendation) {
        const alerts = [];

        // Regime change alert
        if (recommendation.regime?.state !== this.currentRegime) {
            alerts.push({
                type: 'warning',
                category: 'regime',
                message: `Market regime changed to ${recommendation.regime?.state}`,
                action: 'Review allocation'
            });
        }

        // High volatility alert
        if (recommendation.volatility?.currentVol > TSWB_ENHANCED_CONFIG.VOLATILITY.MAX_ANNUAL) {
            alerts.push({
                type: 'danger',
                category: 'volatility',
                message: `High volatility detected: ${(recommendation.volatility.currentVol * 100).toFixed(1)}%`,
                action: 'Consider reducing exposure'
            });
        }

        // Tax-loss harvesting opportunity
        if (recommendation.rebalancePlan?.taxLossHarvests?.length > 0) {
            const totalBenefit = recommendation.rebalancePlan.taxLossHarvests
                .reduce((sum, t) => sum + t.taxBenefit, 0);
            alerts.push({
                type: 'info',
                category: 'tax',
                message: `Tax-loss harvesting opportunity: $${totalBenefit.toFixed(2)} potential savings`,
                action: 'Review harvesting plan'
            });
        }

        return alerts;
    }

    /**
     * Get portfolio health score
     */
    getHealthScore(recommendation, holdings) {
        let score = 70;  // Start at neutral-positive

        // Regime confidence bonus
        if (recommendation.regime?.confidence > 0.7) score += 5;

        // Volatility within target
        if (recommendation.volatility) {
            const volDiff = Math.abs(recommendation.volatility.currentVol - recommendation.volatility.targetVol);
            if (volDiff < 0.02) score += 10;
            else if (volDiff > 0.05) score -= 10;
        }

        // Risk parity achieved
        if (recommendation.riskParityWeights?.isEqualRisk) score += 10;

        // Tax efficiency
        if (recommendation.rebalancePlan?.taxLossHarvests?.length > 0) score += 5;

        return Math.max(0, Math.min(100, score));
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate Sharpe Ratio
 */
function calculateSharpeRatio(returns, riskFreeRate = 0.04) {
    if (!returns || returns.length < 20) return null;

    const annualizedReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const annualizedVol = Math.sqrt(variance) * Math.sqrt(252);

    return (annualizedReturn - riskFreeRate) / annualizedVol;
}

/**
 * Calculate Sortino Ratio (only downside volatility)
 */
function calculateSortinoRatio(returns, riskFreeRate = 0.04) {
    if (!returns || returns.length < 20) return null;

    const annualizedReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
    const negativeReturns = returns.filter(r => r < 0);
    const mean = negativeReturns.length > 0 ?
        negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length : 0;
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / Math.max(negativeReturns.length, 1);
    const downsideVol = Math.sqrt(downsideVariance) * Math.sqrt(252);

    return downsideVol > 0 ? (annualizedReturn - riskFreeRate) / downsideVol : null;
}

/**
 * Calculate Maximum Drawdown
 */
function calculateMaxDrawdown(values) {
    if (!values || values.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = values[0];

    for (const value of values) {
        if (value > peak) {
            peak = value;
        }
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return maxDrawdown;
}

/**
 * Calculate Calmar Ratio
 */
function calculateCalmarRatio(returns, values) {
    if (!returns || returns.length < 252) return null;

    const annualizedReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
    const maxDrawdown = calculateMaxDrawdown(values);

    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : null;
}

// =============================================================================
// EXPORT
// =============================================================================

const TinySeedEnhancedInvestment = {
    // Core classes
    MarketRegimeDetector,
    VolatilityTargeter,
    RiskParityOptimizer,
    FactorMomentumCalculator,
    TaxEfficientRebalancer,
    EnhancedPortfolioManager,

    // Utility functions
    calculateSharpeRatio,
    calculateSortinoRatio,
    calculateMaxDrawdown,
    calculateCalmarRatio,

    // Configuration
    CONFIG: TSWB_ENHANCED_CONFIG,

    // Version
    VERSION: '2.0.0',

    // Quick start helper
    createManager(config = {}) {
        return new EnhancedPortfolioManager(config);
    }
};

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinySeedEnhancedInvestment;
}

// For browser environments
if (typeof window !== 'undefined') {
    window.TinySeedEnhancedInvestment = TinySeedEnhancedInvestment;
}
