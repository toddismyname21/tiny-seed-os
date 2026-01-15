/**
 * Tiny Seed Farm - Change Investing (Round-Ups) Module
 * =====================================================
 * Micro-investing system that captures spare change from every farm sale
 * and automatically invests it according to the farm's investment strategy.
 *
 * Features:
 * - Round-up calculations from Shopify/QuickBooks sales
 * - Configurable round-up multipliers (1x, 2x, 3x, 5x, 10x)
 * - Automatic threshold-based investing
 * - Smart allocation following 75/25 Safe/Growth strategy
 * - Seasonal adjustment factors
 * - Transaction tracking and reporting
 * - Integration with investment algorithm
 *
 * Version: 1.0.0
 * Last Updated: January 2026
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CHANGE_INVESTING_CONFIG = {
    // Round-up settings
    roundUpTo: 1.00,                    // Round up to nearest dollar
    defaultMultiplier: 1,               // 1x = just the round-up amount
    availableMultipliers: [1, 2, 3, 5, 10],

    // Investment thresholds
    minimumInvestment: 5.00,            // Minimum amount before investing
    autoInvestThreshold: 25.00,         // Auto-invest when this amount reached
    maximumDailyRoundup: 50.00,         // Cap daily round-ups

    // Allocation strategy (mirrors main investment algorithm)
    allocation: {
        safe: 0.75,                     // 75% to safe assets
        growth: 0.25                    // 25% to growth
    },

    // Safe asset breakdown (within the 75%)
    safeBreakdown: {
        treasuryBonds: 0.40,            // 40% of safe = 30% total
        stableDividend: 0.35,           // 35% of safe = 26.25% total
        moneyMarket: 0.25               // 25% of safe = 18.75% total
    },

    // Growth asset breakdown (within the 25%)
    growthBreakdown: {
        totalMarket: 0.50,              // 50% of growth = 12.5% total
        international: 0.30,            // 30% of growth = 7.5% total
        emergingMarkets: 0.20           // 20% of growth = 5% total
    },

    // Seasonal multipliers (farm-specific)
    seasonalMultipliers: {
        harvest: { months: [9, 10, 11], multiplier: 1.5, name: 'Harvest Season' },
        planting: { months: [3, 4, 5], multiplier: 0.75, name: 'Planting Season' },
        winter: { months: [12, 1, 2], multiplier: 0.5, name: 'Winter Season' },
        growing: { months: [6, 7, 8], multiplier: 1.0, name: 'Growing Season' }
    },

    // Data sources
    sources: {
        shopify: { enabled: true, name: 'Shopify Sales' },
        quickbooks: { enabled: true, name: 'QuickBooks Invoices' },
        farmStand: { enabled: true, name: 'Farm Stand Cash Sales' },
        wholesale: { enabled: true, name: 'Wholesale Orders' },
        csa: { enabled: true, name: 'CSA Subscriptions' }
    },

    // Recommended ETFs for micro-investing
    etfs: {
        safe: {
            treasuryBonds: { symbol: 'BND', name: 'Vanguard Total Bond Market' },
            stableDividend: { symbol: 'SCHD', name: 'Schwab US Dividend Equity' },
            moneyMarket: { symbol: 'SGOV', name: 'iShares 0-3 Month Treasury' }
        },
        growth: {
            totalMarket: { symbol: 'VTI', name: 'Vanguard Total Stock Market' },
            international: { symbol: 'VXUS', name: 'Vanguard Total International' },
            emergingMarkets: { symbol: 'VWO', name: 'Vanguard Emerging Markets' }
        }
    }
};

// =============================================================================
// TRANSACTION CLASS
// =============================================================================

/**
 * Represents a single sale transaction for round-up calculation
 */
class Transaction {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.source = data.source || 'manual';
        this.description = data.description || '';
        this.originalAmount = parseFloat(data.amount) || 0;
        this.date = data.date ? new Date(data.date) : new Date();
        this.category = data.category || 'general';
        this.customerId = data.customerId || null;
        this.orderId = data.orderId || null;

        // Calculate round-up
        this.roundUpAmount = this.calculateRoundUp();
    }

    generateId() {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Calculate the round-up amount for this transaction
     */
    calculateRoundUp() {
        const roundTo = CHANGE_INVESTING_CONFIG.roundUpTo;
        const remainder = this.originalAmount % roundTo;

        if (remainder === 0) {
            // If exact dollar amount, round up to next full dollar
            return roundTo;
        }

        return parseFloat((roundTo - remainder).toFixed(2));
    }

    /**
     * Get round-up with multiplier applied
     */
    getRoundUpWithMultiplier(multiplier = 1) {
        return parseFloat((this.roundUpAmount * multiplier).toFixed(2));
    }

    toJSON() {
        return {
            id: this.id,
            source: this.source,
            description: this.description,
            originalAmount: this.originalAmount,
            roundUpAmount: this.roundUpAmount,
            date: this.date.toISOString(),
            category: this.category,
            customerId: this.customerId,
            orderId: this.orderId
        };
    }
}

// =============================================================================
// ROUND-UP POOL CLASS
// =============================================================================

/**
 * Manages the pool of accumulated round-ups waiting to be invested
 */
class RoundUpPool {
    constructor(data = {}) {
        this.balance = parseFloat(data.balance) || 0;
        this.pendingTransactions = (data.pendingTransactions || []).map(t => new Transaction(t));
        this.multiplier = data.multiplier || CHANGE_INVESTING_CONFIG.defaultMultiplier;
        this.autoInvest = data.autoInvest !== undefined ? data.autoInvest : true;
        this.lastInvestment = data.lastInvestment ? new Date(data.lastInvestment) : null;
        this.totalInvested = parseFloat(data.totalInvested) || 0;
        this.totalRoundUps = parseFloat(data.totalRoundUps) || 0;
        this.dailyRoundUps = parseFloat(data.dailyRoundUps) || 0;
        this.dailyDate = data.dailyDate ? new Date(data.dailyDate) : new Date();

        // Statistics
        this.stats = {
            totalTransactions: data.stats?.totalTransactions || 0,
            averageRoundUp: data.stats?.averageRoundUp || 0,
            largestRoundUp: data.stats?.largestRoundUp || 0,
            investmentCount: data.stats?.investmentCount || 0
        };
    }

    /**
     * Add a transaction and accumulate the round-up
     */
    addTransaction(transactionData) {
        const transaction = new Transaction(transactionData);
        const roundUpWithMultiplier = transaction.getRoundUpWithMultiplier(this.multiplier);

        // Check daily cap
        this.checkDailyReset();
        if (this.dailyRoundUps + roundUpWithMultiplier > CHANGE_INVESTING_CONFIG.maximumDailyRoundup) {
            const allowedAmount = CHANGE_INVESTING_CONFIG.maximumDailyRoundup - this.dailyRoundUps;
            if (allowedAmount <= 0) {
                return {
                    success: false,
                    message: 'Daily round-up cap reached',
                    transaction: transaction
                };
            }
            // Partial round-up
            this.balance += allowedAmount;
            this.dailyRoundUps += allowedAmount;
        } else {
            this.balance += roundUpWithMultiplier;
            this.dailyRoundUps += roundUpWithMultiplier;
        }

        this.pendingTransactions.push(transaction);
        this.totalRoundUps += roundUpWithMultiplier;

        // Update stats
        this.stats.totalTransactions++;
        this.stats.averageRoundUp = this.totalRoundUps / this.stats.totalTransactions;
        if (roundUpWithMultiplier > this.stats.largestRoundUp) {
            this.stats.largestRoundUp = roundUpWithMultiplier;
        }

        // Check auto-invest threshold
        let investmentResult = null;
        if (this.autoInvest && this.balance >= CHANGE_INVESTING_CONFIG.autoInvestThreshold) {
            investmentResult = this.triggerInvestment();
        }

        return {
            success: true,
            transaction: transaction,
            roundUpAmount: roundUpWithMultiplier,
            newBalance: this.balance,
            investmentTriggered: investmentResult !== null,
            investmentResult: investmentResult
        };
    }

    /**
     * Add multiple transactions at once (batch import)
     */
    addTransactions(transactions) {
        const results = [];
        for (const txn of transactions) {
            results.push(this.addTransaction(txn));
        }
        return {
            processed: results.length,
            successful: results.filter(r => r.success).length,
            totalAdded: results.reduce((sum, r) => sum + (r.roundUpAmount || 0), 0),
            results: results
        };
    }

    /**
     * Reset daily counter if it's a new day
     */
    checkDailyReset() {
        const today = new Date();
        if (this.dailyDate.toDateString() !== today.toDateString()) {
            this.dailyRoundUps = 0;
            this.dailyDate = today;
        }
    }

    /**
     * Change the round-up multiplier
     */
    setMultiplier(multiplier) {
        if (!CHANGE_INVESTING_CONFIG.availableMultipliers.includes(multiplier)) {
            throw new Error(`Invalid multiplier. Choose from: ${CHANGE_INVESTING_CONFIG.availableMultipliers.join(', ')}`);
        }
        this.multiplier = multiplier;
        return this.multiplier;
    }

    /**
     * Trigger investment of accumulated round-ups
     */
    triggerInvestment(forceAmount = null) {
        const investAmount = forceAmount || this.balance;

        if (investAmount < CHANGE_INVESTING_CONFIG.minimumInvestment) {
            return {
                success: false,
                message: `Minimum investment is $${CHANGE_INVESTING_CONFIG.minimumInvestment}. Current balance: $${this.balance.toFixed(2)}`
            };
        }

        // Calculate allocation
        const allocation = this.calculateAllocation(investAmount);

        // Create investment record
        const investment = {
            id: 'inv_' + Date.now(),
            date: new Date(),
            amount: investAmount,
            allocation: allocation,
            transactionCount: this.pendingTransactions.length,
            multiplierUsed: this.multiplier,
            seasonalFactor: this.getCurrentSeasonalFactor()
        };

        // Update state
        this.balance -= investAmount;
        this.totalInvested += investAmount;
        this.lastInvestment = new Date();
        this.stats.investmentCount++;
        this.pendingTransactions = [];

        return {
            success: true,
            investment: investment,
            remainingBalance: this.balance
        };
    }

    /**
     * Calculate how to allocate the investment
     */
    calculateAllocation(amount) {
        const config = CHANGE_INVESTING_CONFIG;
        const safeAmount = amount * config.allocation.safe;
        const growthAmount = amount * config.allocation.growth;

        return {
            total: amount,
            safe: {
                total: safeAmount,
                breakdown: {
                    treasuryBonds: {
                        amount: safeAmount * config.safeBreakdown.treasuryBonds,
                        etf: config.etfs.safe.treasuryBonds
                    },
                    stableDividend: {
                        amount: safeAmount * config.safeBreakdown.stableDividend,
                        etf: config.etfs.safe.stableDividend
                    },
                    moneyMarket: {
                        amount: safeAmount * config.safeBreakdown.moneyMarket,
                        etf: config.etfs.safe.moneyMarket
                    }
                }
            },
            growth: {
                total: growthAmount,
                breakdown: {
                    totalMarket: {
                        amount: growthAmount * config.growthBreakdown.totalMarket,
                        etf: config.etfs.growth.totalMarket
                    },
                    international: {
                        amount: growthAmount * config.growthBreakdown.international,
                        etf: config.etfs.growth.international
                    },
                    emergingMarkets: {
                        amount: growthAmount * config.growthBreakdown.emergingMarkets,
                        etf: config.etfs.growth.emergingMarkets
                    }
                }
            }
        };
    }

    /**
     * Get current seasonal factor based on date
     */
    getCurrentSeasonalFactor() {
        const month = new Date().getMonth() + 1; // 1-12
        const seasons = CHANGE_INVESTING_CONFIG.seasonalMultipliers;

        for (const [key, season] of Object.entries(seasons)) {
            if (season.months.includes(month)) {
                return {
                    season: key,
                    name: season.name,
                    multiplier: season.multiplier
                };
            }
        }

        return { season: 'growing', name: 'Growing Season', multiplier: 1.0 };
    }

    /**
     * Get pool summary
     */
    getSummary() {
        const seasonalFactor = this.getCurrentSeasonalFactor();
        const projectedMonthly = this.stats.averageRoundUp * 30 * this.multiplier * seasonalFactor.multiplier;
        const projectedYearly = projectedMonthly * 12;

        return {
            currentBalance: this.balance,
            multiplier: this.multiplier,
            autoInvest: this.autoInvest,
            autoInvestThreshold: CHANGE_INVESTING_CONFIG.autoInvestThreshold,
            percentToThreshold: Math.min(100, (this.balance / CHANGE_INVESTING_CONFIG.autoInvestThreshold) * 100),
            pendingTransactions: this.pendingTransactions.length,
            totalInvested: this.totalInvested,
            totalRoundUps: this.totalRoundUps,
            dailyRoundUps: this.dailyRoundUps,
            dailyCap: CHANGE_INVESTING_CONFIG.maximumDailyRoundup,
            dailyCapRemaining: CHANGE_INVESTING_CONFIG.maximumDailyRoundup - this.dailyRoundUps,
            lastInvestment: this.lastInvestment,
            currentSeason: seasonalFactor,
            projections: {
                monthly: projectedMonthly,
                yearly: projectedYearly,
                fiveYear: projectedYearly * 5 * 1.07 // Assume 7% growth
            },
            stats: this.stats
        };
    }

    toJSON() {
        return {
            balance: this.balance,
            pendingTransactions: this.pendingTransactions.map(t => t.toJSON()),
            multiplier: this.multiplier,
            autoInvest: this.autoInvest,
            lastInvestment: this.lastInvestment?.toISOString(),
            totalInvested: this.totalInvested,
            totalRoundUps: this.totalRoundUps,
            dailyRoundUps: this.dailyRoundUps,
            dailyDate: this.dailyDate.toISOString(),
            stats: this.stats
        };
    }
}

// =============================================================================
// SHOPIFY INTEGRATION
// =============================================================================

/**
 * Handles Shopify order imports for round-up calculation
 */
class ShopifyIntegration {
    constructor(config = {}) {
        this.enabled = config.enabled !== undefined ? config.enabled : true;
        this.shopName = config.shopName || '';
        this.lastSync = config.lastSync ? new Date(config.lastSync) : null;
        this.totalSynced = config.totalSynced || 0;
    }

    /**
     * Parse Shopify orders into transactions
     * Expects format from Shopify API or CSV export
     */
    parseOrders(orders) {
        return orders.map(order => ({
            id: 'shopify_' + (order.id || order.order_number),
            source: 'shopify',
            description: `Shopify Order #${order.order_number || order.name}`,
            amount: parseFloat(order.total_price || order.total || 0),
            date: order.created_at || order.processed_at || new Date(),
            category: 'online_sales',
            customerId: order.customer?.id || order.customer_id,
            orderId: order.id || order.order_number
        }));
    }

    /**
     * Import orders from Shopify CSV export
     */
    parseCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const orders = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const order = {};

            headers.forEach((header, index) => {
                order[header] = values[index];
            });

            // Map common Shopify CSV fields
            orders.push({
                id: order['name'] || order['order number'] || order['id'],
                order_number: order['name'] || order['order number'],
                total_price: order['total'] || order['total price'],
                created_at: order['created at'] || order['date'],
                customer_id: order['customer id'] || order['customer']
            });
        }

        return this.parseOrders(orders);
    }

    /**
     * Parse a CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }

    /**
     * Simulate API connection (for future implementation)
     */
    async connectAPI(apiKey, apiSecret, shopDomain) {
        // Placeholder for actual Shopify API connection
        return {
            success: true,
            message: 'API connection configured. Use webhooks for real-time order sync.',
            config: {
                shopDomain: shopDomain,
                webhookEndpoint: '/api/webhooks/shopify/order-created'
            }
        };
    }
}

// =============================================================================
// QUICKBOOKS INTEGRATION
// =============================================================================

/**
 * Handles QuickBooks invoice imports for round-up calculation
 */
class QuickBooksIntegration {
    constructor(config = {}) {
        this.enabled = config.enabled !== undefined ? config.enabled : true;
        this.companyId = config.companyId || '';
        this.lastSync = config.lastSync ? new Date(config.lastSync) : null;
        this.totalSynced = config.totalSynced || 0;
    }

    /**
     * Parse QuickBooks invoices into transactions
     */
    parseInvoices(invoices) {
        return invoices.map(invoice => ({
            id: 'qb_' + (invoice.Id || invoice.DocNumber),
            source: 'quickbooks',
            description: `Invoice #${invoice.DocNumber} - ${invoice.CustomerRef?.name || 'Customer'}`,
            amount: parseFloat(invoice.TotalAmt || invoice.Balance || 0),
            date: invoice.TxnDate || invoice.MetaData?.CreateTime || new Date(),
            category: 'invoices',
            customerId: invoice.CustomerRef?.value,
            orderId: invoice.DocNumber
        }));
    }

    /**
     * Parse QuickBooks sales receipts
     */
    parseSalesReceipts(receipts) {
        return receipts.map(receipt => ({
            id: 'qb_sr_' + (receipt.Id || receipt.DocNumber),
            source: 'quickbooks',
            description: `Sales Receipt #${receipt.DocNumber}`,
            amount: parseFloat(receipt.TotalAmt || 0),
            date: receipt.TxnDate || new Date(),
            category: 'sales_receipts',
            customerId: receipt.CustomerRef?.value,
            orderId: receipt.DocNumber
        }));
    }

    /**
     * Parse from QuickBooks CSV export
     */
    parseCSV(csvContent, type = 'invoice') {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const items = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = this.parseCSVLine(lines[i]);
            const item = {};

            headers.forEach((header, index) => {
                item[header] = values[index];
            });

            items.push({
                Id: item['num'] || item['invoice no'] || item['id'],
                DocNumber: item['num'] || item['invoice no'],
                TotalAmt: item['amount'] || item['total'] || item['balance'],
                TxnDate: item['date'] || item['invoice date'],
                CustomerRef: { name: item['customer'] || item['name'] }
            });
        }

        return type === 'invoice' ? this.parseInvoices(items) : this.parseSalesReceipts(items);
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }
}

// =============================================================================
// FARM STAND INTEGRATION
// =============================================================================

/**
 * Handles farm stand cash sales tracking
 */
class FarmStandIntegration {
    constructor(config = {}) {
        this.enabled = config.enabled !== undefined ? config.enabled : true;
        this.location = config.location || 'Main Farm Stand';
        this.totalSales = config.totalSales || 0;
    }

    /**
     * Record a cash sale
     */
    recordSale(amount, description = '', category = 'farm_stand') {
        return {
            id: 'fs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            source: 'farmStand',
            description: description || `Farm Stand Sale`,
            amount: parseFloat(amount),
            date: new Date(),
            category: category
        };
    }

    /**
     * Record multiple sales from a daily sheet
     */
    recordDailySales(sales) {
        return sales.map(sale => this.recordSale(
            sale.amount,
            sale.description || `Farm Stand - ${sale.item || 'General'}`,
            sale.category || 'farm_stand'
        ));
    }
}

// =============================================================================
// CHANGE INVESTING MANAGER
// =============================================================================

/**
 * Main manager class that coordinates all change investing functionality
 */
class ChangeInvestingManager {
    constructor(savedState = null) {
        // Initialize pool
        this.pool = new RoundUpPool(savedState?.pool);

        // Initialize integrations
        this.integrations = {
            shopify: new ShopifyIntegration(savedState?.integrations?.shopify),
            quickbooks: new QuickBooksIntegration(savedState?.integrations?.quickbooks),
            farmStand: new FarmStandIntegration(savedState?.integrations?.farmStand)
        };

        // Investment history
        this.investmentHistory = savedState?.investmentHistory || [];

        // Goals
        this.goals = savedState?.goals || {
            monthly: 100,
            yearly: 1200,
            emergency: 1000
        };
    }

    // =========================================================================
    // TRANSACTION METHODS
    // =========================================================================

    /**
     * Add a single transaction from any source
     */
    addTransaction(transaction) {
        return this.pool.addTransaction(transaction);
    }

    /**
     * Import Shopify orders
     */
    importShopifyOrders(orders) {
        const transactions = this.integrations.shopify.parseOrders(orders);
        return this.pool.addTransactions(transactions);
    }

    /**
     * Import from Shopify CSV
     */
    importShopifyCSV(csvContent) {
        const transactions = this.integrations.shopify.parseCSV(csvContent);
        return this.pool.addTransactions(transactions);
    }

    /**
     * Import QuickBooks invoices
     */
    importQuickBooksInvoices(invoices) {
        const transactions = this.integrations.quickbooks.parseInvoices(invoices);
        return this.pool.addTransactions(transactions);
    }

    /**
     * Import from QuickBooks CSV
     */
    importQuickBooksCSV(csvContent, type = 'invoice') {
        const transactions = this.integrations.quickbooks.parseCSV(csvContent, type);
        return this.pool.addTransactions(transactions);
    }

    /**
     * Record farm stand sale
     */
    recordFarmStandSale(amount, description) {
        const transaction = this.integrations.farmStand.recordSale(amount, description);
        return this.pool.addTransaction(transaction);
    }

    /**
     * Record daily farm stand sales
     */
    recordDailyFarmStandSales(sales) {
        const transactions = this.integrations.farmStand.recordDailySales(sales);
        return this.pool.addTransactions(transactions);
    }

    // =========================================================================
    // INVESTMENT METHODS
    // =========================================================================

    /**
     * Manually trigger investment
     */
    invest(amount = null) {
        const result = this.pool.triggerInvestment(amount);

        if (result.success) {
            this.investmentHistory.push(result.investment);
        }

        return result;
    }

    /**
     * Get investment recommendation
     */
    getInvestmentRecommendation() {
        const summary = this.pool.getSummary();
        const balance = summary.currentBalance;

        if (balance < CHANGE_INVESTING_CONFIG.minimumInvestment) {
            return {
                recommend: false,
                reason: `Balance ($${balance.toFixed(2)}) is below minimum ($${CHANGE_INVESTING_CONFIG.minimumInvestment})`,
                waitFor: CHANGE_INVESTING_CONFIG.minimumInvestment - balance
            };
        }

        const allocation = this.pool.calculateAllocation(balance);

        return {
            recommend: true,
            amount: balance,
            allocation: allocation,
            seasonalFactor: summary.currentSeason,
            suggestion: balance >= CHANGE_INVESTING_CONFIG.autoInvestThreshold ?
                'Recommended: Invest now - threshold reached' :
                `Optional: Can invest now or wait for threshold ($${CHANGE_INVESTING_CONFIG.autoInvestThreshold})`
        };
    }

    // =========================================================================
    // SETTINGS METHODS
    // =========================================================================

    /**
     * Update multiplier
     */
    setMultiplier(multiplier) {
        return this.pool.setMultiplier(multiplier);
    }

    /**
     * Toggle auto-invest
     */
    toggleAutoInvest(enabled) {
        this.pool.autoInvest = enabled;
        return this.pool.autoInvest;
    }

    /**
     * Update goals
     */
    setGoals(goals) {
        this.goals = { ...this.goals, ...goals };
        return this.goals;
    }

    /**
     * Enable/disable integration
     */
    toggleIntegration(name, enabled) {
        if (this.integrations[name]) {
            this.integrations[name].enabled = enabled;
            return true;
        }
        return false;
    }

    // =========================================================================
    // REPORTING METHODS
    // =========================================================================

    /**
     * Get comprehensive dashboard data
     */
    getDashboardData() {
        const summary = this.pool.getSummary();
        const recommendation = this.getInvestmentRecommendation();

        // Calculate goal progress
        const goalProgress = {
            monthly: {
                target: this.goals.monthly,
                current: this.getMonthlyInvested(),
                percent: Math.min(100, (this.getMonthlyInvested() / this.goals.monthly) * 100)
            },
            yearly: {
                target: this.goals.yearly,
                current: this.getYearlyInvested(),
                percent: Math.min(100, (this.getYearlyInvested() / this.goals.yearly) * 100)
            }
        };

        // Get source breakdown
        const sourceBreakdown = this.getSourceBreakdown();

        return {
            pool: summary,
            recommendation: recommendation,
            goals: goalProgress,
            sources: sourceBreakdown,
            investmentHistory: this.investmentHistory.slice(-10), // Last 10
            integrations: {
                shopify: { enabled: this.integrations.shopify.enabled },
                quickbooks: { enabled: this.integrations.quickbooks.enabled },
                farmStand: { enabled: this.integrations.farmStand.enabled }
            }
        };
    }

    /**
     * Get amount invested this month
     */
    getMonthlyInvested() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return this.investmentHistory
            .filter(inv => new Date(inv.date) >= startOfMonth)
            .reduce((sum, inv) => sum + inv.amount, 0);
    }

    /**
     * Get amount invested this year
     */
    getYearlyInvested() {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);

        return this.investmentHistory
            .filter(inv => new Date(inv.date) >= startOfYear)
            .reduce((sum, inv) => sum + inv.amount, 0);
    }

    /**
     * Get breakdown by source
     */
    getSourceBreakdown() {
        const breakdown = {
            shopify: 0,
            quickbooks: 0,
            farmStand: 0,
            manual: 0,
            other: 0
        };

        for (const txn of this.pool.pendingTransactions) {
            const source = txn.source.toLowerCase();
            if (breakdown.hasOwnProperty(source)) {
                breakdown[source] += txn.roundUpAmount;
            } else {
                breakdown.other += txn.roundUpAmount;
            }
        }

        // Calculate percentages
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
        const percentages = {};
        for (const [key, value] of Object.entries(breakdown)) {
            percentages[key] = {
                amount: value,
                percent: (value / total) * 100
            };
        }

        return percentages;
    }

    /**
     * Generate report for date range
     */
    generateReport(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const periodInvestments = this.investmentHistory.filter(inv => {
            const date = new Date(inv.date);
            return date >= start && date <= end;
        });

        const totalInvested = periodInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const transactionCount = periodInvestments.reduce((sum, inv) => sum + inv.transactionCount, 0);

        // Calculate allocation breakdown
        const allocationTotals = {
            safe: 0,
            growth: 0
        };

        for (const inv of periodInvestments) {
            allocationTotals.safe += inv.allocation.safe.total;
            allocationTotals.growth += inv.allocation.growth.total;
        }

        return {
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            summary: {
                totalInvested: totalInvested,
                investmentCount: periodInvestments.length,
                transactionCount: transactionCount,
                averageInvestment: periodInvestments.length > 0 ? totalInvested / periodInvestments.length : 0
            },
            allocation: allocationTotals,
            investments: periodInvestments
        };
    }

    // =========================================================================
    // PERSISTENCE
    // =========================================================================

    /**
     * Export state for saving
     */
    toJSON() {
        return {
            pool: this.pool.toJSON(),
            integrations: {
                shopify: {
                    enabled: this.integrations.shopify.enabled,
                    shopName: this.integrations.shopify.shopName,
                    lastSync: this.integrations.shopify.lastSync?.toISOString(),
                    totalSynced: this.integrations.shopify.totalSynced
                },
                quickbooks: {
                    enabled: this.integrations.quickbooks.enabled,
                    companyId: this.integrations.quickbooks.companyId,
                    lastSync: this.integrations.quickbooks.lastSync?.toISOString(),
                    totalSynced: this.integrations.quickbooks.totalSynced
                },
                farmStand: {
                    enabled: this.integrations.farmStand.enabled,
                    location: this.integrations.farmStand.location,
                    totalSales: this.integrations.farmStand.totalSales
                }
            },
            investmentHistory: this.investmentHistory,
            goals: this.goals
        };
    }

    /**
     * Load from saved state
     */
    static fromJSON(json) {
        return new ChangeInvestingManager(json);
    }
}

// =============================================================================
// DASHBOARD FORMATTER
// =============================================================================

/**
 * Format data for the main financial dashboard
 */
function formatChangeInvestingForDashboard(manager) {
    const data = manager.getDashboardData();

    return {
        // Header stats
        header: {
            balance: data.pool.currentBalance,
            balanceFormatted: '$' + data.pool.currentBalance.toFixed(2),
            multiplier: data.pool.multiplier + 'x',
            nextThreshold: data.pool.autoInvestThreshold,
            percentToThreshold: data.pool.percentToThreshold.toFixed(0) + '%'
        },

        // Progress ring data
        progressRing: {
            percent: data.pool.percentToThreshold,
            label: 'To Auto-Invest',
            sublabel: `$${data.pool.currentBalance.toFixed(2)} / $${data.pool.autoInvestThreshold}`
        },

        // Seasonal indicator
        seasonal: {
            name: data.pool.currentSeason.name,
            multiplier: data.pool.currentSeason.multiplier,
            icon: getSeasonalIcon(data.pool.currentSeason.season)
        },

        // Quick stats
        stats: [
            {
                label: 'Total Invested',
                value: '$' + data.pool.totalInvested.toFixed(2),
                icon: '📈'
            },
            {
                label: 'This Month',
                value: '$' + data.goals.monthly.current.toFixed(2),
                subvalue: `${data.goals.monthly.percent.toFixed(0)}% of goal`,
                icon: '📅'
            },
            {
                label: 'Today\'s Round-ups',
                value: '$' + data.pool.dailyRoundUps.toFixed(2),
                subvalue: `$${data.pool.dailyCapRemaining.toFixed(2)} cap remaining`,
                icon: '💰'
            },
            {
                label: 'Avg Round-up',
                value: '$' + data.pool.stats.averageRoundUp.toFixed(2),
                icon: '📊'
            }
        ],

        // Action buttons
        actions: {
            canInvest: data.recommendation.recommend,
            investAmount: data.recommendation.amount,
            recommendation: data.recommendation.suggestion || data.recommendation.reason
        },

        // Source breakdown for chart
        sourceChart: Object.entries(data.sources).map(([key, val]) => ({
            source: formatSourceName(key),
            amount: val.amount,
            percent: val.percent
        })).filter(s => s.amount > 0),

        // Recent activity
        recentActivity: data.investmentHistory.map(inv => ({
            date: new Date(inv.date).toLocaleDateString(),
            amount: '$' + inv.amount.toFixed(2),
            transactions: inv.transactionCount
        })),

        // Goals progress
        goals: [
            {
                name: 'Monthly Goal',
                current: data.goals.monthly.current,
                target: data.goals.monthly.target,
                percent: data.goals.monthly.percent
            },
            {
                name: 'Yearly Goal',
                current: data.goals.yearly.current,
                target: data.goals.yearly.target,
                percent: data.goals.yearly.percent
            }
        ],

        // Projections
        projections: {
            monthly: '$' + data.pool.projections.monthly.toFixed(2),
            yearly: '$' + data.pool.projections.yearly.toFixed(2),
            fiveYear: '$' + data.pool.projections.fiveYear.toFixed(2)
        }
    };
}

/**
 * Get seasonal icon
 */
function getSeasonalIcon(season) {
    const icons = {
        harvest: '🍂',
        planting: '🌱',
        winter: '❄️',
        growing: '☀️'
    };
    return icons[season] || '📅';
}

/**
 * Format source name for display
 */
function formatSourceName(source) {
    const names = {
        shopify: 'Shopify',
        quickbooks: 'QuickBooks',
        farmStand: 'Farm Stand',
        manual: 'Manual Entry',
        other: 'Other'
    };
    return names[source] || source;
}

// =============================================================================
// ROUND-UP CALCULATOR UTILITY
// =============================================================================

/**
 * Quick utility for calculating round-ups
 */
const RoundUpCalculator = {
    /**
     * Calculate single round-up
     */
    calculate(amount, roundTo = 1.00) {
        const remainder = amount % roundTo;
        if (remainder === 0) return roundTo;
        return parseFloat((roundTo - remainder).toFixed(2));
    },

    /**
     * Calculate with multiplier
     */
    calculateWithMultiplier(amount, multiplier = 1, roundTo = 1.00) {
        return this.calculate(amount, roundTo) * multiplier;
    },

    /**
     * Calculate for array of amounts
     */
    calculateBatch(amounts, multiplier = 1) {
        return amounts.map(amount => ({
            original: amount,
            roundUp: this.calculate(amount),
            withMultiplier: this.calculateWithMultiplier(amount, multiplier)
        }));
    },

    /**
     * Get total round-ups for amounts
     */
    getTotal(amounts, multiplier = 1) {
        return amounts.reduce((sum, amt) => sum + this.calculateWithMultiplier(amt, multiplier), 0);
    }
};

// =============================================================================
// EXPORT FOR USE IN OTHER MODULES
// =============================================================================

const TinySeedChangeInvesting = {
    // Core classes
    Transaction,
    RoundUpPool,
    ChangeInvestingManager,

    // Integrations
    ShopifyIntegration,
    QuickBooksIntegration,
    FarmStandIntegration,

    // Utilities
    RoundUpCalculator,
    formatChangeInvestingForDashboard,

    // Configuration
    CONFIG: CHANGE_INVESTING_CONFIG,

    // Version
    VERSION: '1.0.0',

    // Quick start helper
    createManager(savedState = null) {
        return new ChangeInvestingManager(savedState);
    }
};

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinySeedChangeInvesting;
}

// For ES6 module environments
if (typeof window !== 'undefined') {
    window.TinySeedChangeInvesting = TinySeedChangeInvesting;
}
