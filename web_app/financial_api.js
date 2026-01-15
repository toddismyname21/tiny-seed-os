/**
 * Tiny Seed Farm - Financial API Client
 * =====================================
 * Handles all communication between the Financial Dashboard and Google Apps Script backend.
 *
 * Usage:
 * 1. Update APPS_SCRIPT_URL with your deployed Apps Script web app URL
 * 2. Include this file in your HTML before using any API functions
 *
 * Version: 1.0.0
 * Last Updated: January 2026
 */

// =============================================================================
// CONFIGURATION - UPDATE THIS URL AFTER DEPLOYING APPS SCRIPT
// =============================================================================

const FINANCIAL_API_CONFIG = {
    // Your deployed Apps Script Web App URL
    // Get this from: Google Apps Script > Deploy > Manage deployments
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

    // Local storage keys
    STORAGE_KEYS: {
        DEBTS: 'tinyseed_debts',
        ACCOUNTS: 'tinyseed_accounts',
        BILLS: 'tinyseed_bills',
        INVESTMENTS: 'tinyseed_investments',
        EMPLOYEES: 'tinyseed_employees',
        ROUNDUPS: 'tinyseed_roundups',
        SETTINGS: 'tinyseed_settings',
        LAST_SYNC: 'tinyseed_last_sync'
    },

    // Sync intervals
    SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes

    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // ms
};

// =============================================================================
// API CLIENT CLASS
// =============================================================================

class FinancialAPIClient {
    constructor(config = {}) {
        this.baseUrl = config.url || FINANCIAL_API_CONFIG.APPS_SCRIPT_URL;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        this.lastSync = this.getLastSync();

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // =========================================================================
    // CORE API METHODS
    // =========================================================================

    /**
     * Make API request to Apps Script
     */
    async request(action, params = {}, method = 'GET') {
        const url = new URL(this.baseUrl);
        url.searchParams.append('action', action);

        if (method === 'GET') {
            // Add params to URL for GET requests
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
        }

        const options = {
            method: method,
            redirect: 'follow'
        };

        if (method === 'POST') {
            options.body = JSON.stringify(params);
            options.headers = {
                'Content-Type': 'application/json'
            };
        }

        try {
            const response = await fetch(url.toString(), options);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API Error (${action}):`, error);

            // Queue for later if offline
            if (!this.isOnline) {
                this.queueForSync({ action, params, method });
            }

            // Try to return cached data
            return this.getCachedData(action, params);
        }
    }

    /**
     * Test connection to Apps Script
     */
    async testConnection() {
        try {
            const result = await this.request('testConnection');
            return {
                connected: result.success === true,
                message: result.message || 'Connection test complete',
                timestamp: result.timestamp
            };
        } catch (error) {
            return {
                connected: false,
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // =========================================================================
    // DEBT MANAGEMENT
    // =========================================================================

    async getDebts(options = {}) {
        const result = await this.request('getDebts', options);
        if (result.success) {
            this.cacheData('debts', result.data);
        }
        return result;
    }

    async saveDebt(debt) {
        const result = await this.request('saveDebt', debt, 'POST');
        if (result.success) {
            await this.getDebts(); // Refresh cache
        }
        return result;
    }

    async updateDebt(debtId, updates) {
        return await this.request('updateDebt', { debtId, ...updates }, 'POST');
    }

    async deleteDebt(debtId) {
        return await this.request('deleteDebt', { debtId }, 'POST');
    }

    async recordDebtPayment(payment) {
        const result = await this.request('recordDebtPayment', payment, 'POST');
        if (result.success) {
            await this.getDebts(); // Refresh cache
        }
        return result;
    }

    async getDebtPayments(debtId = null) {
        return await this.request('getDebtPayments', debtId ? { debtId } : {});
    }

    // =========================================================================
    // BANK ACCOUNTS
    // =========================================================================

    async getBankAccounts(options = {}) {
        const result = await this.request('getBankAccounts', options);
        if (result.success) {
            this.cacheData('accounts', result.data);
        }
        return result;
    }

    async saveBankAccount(account) {
        const result = await this.request('saveBankAccount', account, 'POST');
        if (result.success) {
            await this.getBankAccounts(); // Refresh cache
        }
        return result;
    }

    async updateBankAccount(accountId, updates) {
        return await this.request('updateBankAccount', { accountId, ...updates }, 'POST');
    }

    // =========================================================================
    // BILLS
    // =========================================================================

    async getBills(options = {}) {
        const result = await this.request('getBills', options);
        if (result.success) {
            this.cacheData('bills', result.data);
        }
        return result;
    }

    async saveBill(bill) {
        const result = await this.request('saveBill', bill, 'POST');
        if (result.success) {
            await this.getBills(); // Refresh cache
        }
        return result;
    }

    async updateBill(billId, updates) {
        return await this.request('updateBill', { billId, ...updates }, 'POST');
    }

    async markBillPaid(billId, paidDate = null) {
        return await this.request('updateBill', {
            billId,
            Last_Paid: paidDate || new Date().toISOString().split('T')[0]
        }, 'POST');
    }

    // =========================================================================
    // INVESTMENTS
    // =========================================================================

    async getInvestments(options = {}) {
        const result = await this.request('getInvestments', options);
        if (result.success) {
            this.cacheData('investments', result.data);
        }
        return result;
    }

    async saveInvestment(investment) {
        return await this.request('saveInvestment', investment, 'POST');
    }

    async getInvestmentHistory(options = {}) {
        return await this.request('getInvestmentHistory', options);
    }

    // =========================================================================
    // EMPLOYEES & GAMIFICATION
    // =========================================================================

    async getEmployees(options = {}) {
        const result = await this.request('getEmployees', options);
        if (result.success) {
            this.cacheData('employees', result.data);
        }
        return result;
    }

    async saveEmployee(employee) {
        return await this.request('saveEmployee', employee, 'POST');
    }

    async updateEmployee(employeeId, updates) {
        return await this.request('updateEmployee', { employeeId, ...updates }, 'POST');
    }

    async addEmployeeXP(employeeId, xp, activity, description = '') {
        return await this.request('addEmployeeXP', {
            employeeId,
            xp,
            activity,
            description
        }, 'POST');
    }

    async getEmployeeXP(employeeId = null) {
        return await this.request('getEmployeeXP', employeeId ? { employeeId } : {});
    }

    async unlockAchievement(employeeId, achievementCode, achievementName, xpReward = 0) {
        return await this.request('unlockAchievement', {
            employeeId,
            achievementCode,
            achievementName,
            xpReward
        }, 'POST');
    }

    async getAchievements(employeeId = null) {
        return await this.request('getAchievements', employeeId ? { employeeId } : {});
    }

    // =========================================================================
    // ROUND-UPS / CHANGE INVESTING
    // =========================================================================

    async getRoundUps(options = {}) {
        const result = await this.request('getRoundUps', options);
        if (result.success) {
            this.cacheData('roundups', result.data);
        }
        return result;
    }

    async saveRoundUp(roundUp) {
        return await this.request('saveRoundUp', roundUp, 'POST');
    }

    async recordRoundUpInvestment(options = {}) {
        return await this.request('recordRoundUpInvestment', options, 'POST');
    }

    // =========================================================================
    // DASHBOARD
    // =========================================================================

    async getFinancialDashboard(options = {}) {
        const result = await this.request('getFinancialDashboard', options);
        if (result.success) {
            this.cacheData('dashboard', result.data);
            this.setLastSync();
        }
        return result;
    }

    // =========================================================================
    // SETTINGS
    // =========================================================================

    async getSettings() {
        const result = await this.request('getFinancialSettings');
        if (result.success) {
            this.cacheData('settings', result.data);
        }
        return result;
    }

    async saveSettings(settings) {
        return await this.request('saveFinancialSettings', settings, 'POST');
    }

    // =========================================================================
    // SETUP
    // =========================================================================

    async createFinancialSheets() {
        return await this.request('createFinancialSheets', {}, 'POST');
    }

    // =========================================================================
    // CACHING & OFFLINE SUPPORT
    // =========================================================================

    cacheData(key, data) {
        try {
            const storageKey = `tinyseed_${key}`;
            localStorage.setItem(storageKey, JSON.stringify({
                data: data,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Failed to cache data:', error);
        }
    }

    getCachedData(action, params) {
        // Map actions to cache keys
        const actionCacheMap = {
            'getDebts': 'debts',
            'getBankAccounts': 'accounts',
            'getBills': 'bills',
            'getInvestments': 'investments',
            'getEmployees': 'employees',
            'getRoundUps': 'roundups',
            'getFinancialDashboard': 'dashboard',
            'getFinancialSettings': 'settings'
        };

        const cacheKey = actionCacheMap[action];
        if (!cacheKey) return { success: false, cached: true, data: null };

        try {
            const storageKey = `tinyseed_${cacheKey}`;
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                return {
                    success: true,
                    cached: true,
                    data: parsed.data,
                    cacheTimestamp: parsed.timestamp
                };
            }
        } catch (error) {
            console.warn('Failed to get cached data:', error);
        }

        return { success: false, cached: true, data: null };
    }

    queueForSync(request) {
        this.pendingSync.push({
            ...request,
            queuedAt: new Date().toISOString()
        });

        // Save to localStorage
        try {
            localStorage.setItem('tinyseed_pending_sync', JSON.stringify(this.pendingSync));
        } catch (error) {
            console.warn('Failed to save pending sync:', error);
        }
    }

    async processPendingSync() {
        if (this.pendingSync.length === 0) return;

        console.log(`Processing ${this.pendingSync.length} pending sync requests...`);

        const results = [];
        for (const request of this.pendingSync) {
            try {
                const result = await this.request(request.action, request.params, request.method);
                results.push({ request, result, success: true });
            } catch (error) {
                results.push({ request, error, success: false });
            }
        }

        // Clear processed requests
        this.pendingSync = results.filter(r => !r.success).map(r => r.request);
        localStorage.setItem('tinyseed_pending_sync', JSON.stringify(this.pendingSync));

        return results;
    }

    getLastSync() {
        try {
            return localStorage.getItem('tinyseed_last_sync');
        } catch {
            return null;
        }
    }

    setLastSync() {
        try {
            const now = new Date().toISOString();
            localStorage.setItem('tinyseed_last_sync', now);
            this.lastSync = now;
        } catch (error) {
            console.warn('Failed to set last sync:', error);
        }
    }

    // =========================================================================
    // ONLINE/OFFLINE HANDLING
    // =========================================================================

    handleOnline() {
        this.isOnline = true;
        console.log('Back online - processing pending sync...');
        this.processPendingSync();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('tinyseed:online'));
    }

    handleOffline() {
        this.isOnline = false;
        console.log('Offline - requests will be queued');

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('tinyseed:offline'));
    }
}

// =============================================================================
// DASHBOARD DATA MANAGER
// =============================================================================

class DashboardDataManager {
    constructor(apiClient) {
        this.api = apiClient;
        this.data = {
            debts: [],
            accounts: [],
            bills: [],
            investments: [],
            employees: [],
            roundUps: [],
            dashboard: null,
            settings: {}
        };
        this.callbacks = {
            onUpdate: [],
            onError: []
        };
    }

    /**
     * Load all dashboard data
     */
    async loadAll() {
        const results = await Promise.allSettled([
            this.api.getFinancialDashboard(),
            this.api.getDebts(),
            this.api.getBankAccounts(),
            this.api.getBills(),
            this.api.getInvestments(),
            this.api.getEmployees({ sortBy: 'xp' }),
            this.api.getRoundUps({ status: 'Pending' }),
            this.api.getSettings()
        ]);

        const [dashboard, debts, accounts, bills, investments, employees, roundUps, settings] = results;

        if (dashboard.status === 'fulfilled' && dashboard.value.success) {
            this.data.dashboard = dashboard.value.data;
        }
        if (debts.status === 'fulfilled' && debts.value.success) {
            this.data.debts = debts.value.data;
        }
        if (accounts.status === 'fulfilled' && accounts.value.success) {
            this.data.accounts = accounts.value.data;
        }
        if (bills.status === 'fulfilled' && bills.value.success) {
            this.data.bills = bills.value.data;
        }
        if (investments.status === 'fulfilled' && investments.value.success) {
            this.data.investments = investments.value.data;
        }
        if (employees.status === 'fulfilled' && employees.value.success) {
            this.data.employees = employees.value.data;
        }
        if (roundUps.status === 'fulfilled' && roundUps.value.success) {
            this.data.roundUps = roundUps.value.data;
        }
        if (settings.status === 'fulfilled' && settings.value.success) {
            this.data.settings = settings.value.data;
        }

        this.notifyUpdate();
        return this.data;
    }

    /**
     * Subscribe to data updates
     */
    onUpdate(callback) {
        this.callbacks.onUpdate.push(callback);
    }

    /**
     * Subscribe to errors
     */
    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    notifyUpdate() {
        this.callbacks.onUpdate.forEach(cb => cb(this.data));
    }

    notifyError(error) {
        this.callbacks.onError.forEach(cb => cb(error));
    }

    /**
     * Get computed dashboard values
     */
    getComputedValues() {
        const d = this.data.dashboard;
        if (!d) return null;

        return {
            netWorth: d.netWorth?.total || 0,
            netWorthFormatted: this.formatCurrency(d.netWorth?.total || 0),

            totalAssets: d.netWorth?.assets || 0,
            totalLiabilities: d.netWorth?.liabilities || 0,

            debtFreeDate: this.calculateDebtFreeDate(),
            investmentAllocation: this.calculateAllocation(),

            monthlyBurn: (d.bills?.monthlyTotal || 0) + (d.debts?.total || 0) / 12,
            savingsRate: this.calculateSavingsRate(),

            healthScore: this.calculateHealthScore()
        };
    }

    calculateDebtFreeDate() {
        const debts = this.data.debts || [];
        if (debts.length === 0) return null;

        const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.Current_Balance || 0), 0);
        const totalMinPayment = debts.reduce((sum, d) => sum + parseFloat(d.Min_Payment || 0), 0);

        if (totalMinPayment <= 0) return null;

        // Rough estimate (doesn't account for interest reduction)
        const monthsToPayoff = Math.ceil(totalDebt / totalMinPayment);
        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

        return payoffDate;
    }

    calculateAllocation() {
        const investments = this.data.investments || [];
        const total = investments.reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0);

        if (total === 0) return { safe: 0, growth: 0 };

        const safeTotal = investments
            .filter(i => i.Category === 'Safe')
            .reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0);

        return {
            safe: (safeTotal / total) * 100,
            growth: ((total - safeTotal) / total) * 100
        };
    }

    calculateSavingsRate() {
        // Would need income data
        return 0;
    }

    calculateHealthScore() {
        let score = 50; // Start at neutral
        const d = this.data.dashboard;

        if (!d) return score;

        // Positive factors
        if (d.netWorth?.total > 0) score += 10;
        if (d.investments?.total > 10000) score += 10;
        if (d.bills?.overdue === 0) score += 10;
        if (d.roundUps?.pendingBalance > 0) score += 5;

        // Negative factors
        if (d.debts?.total > 50000) score -= 20;
        if (d.debts?.averageAPR > 15) score -= 10;
        if (d.bills?.overdue > 0) score -= 15;

        return Math.max(0, Math.min(100, score));
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// =============================================================================
// CHART DATA HELPERS
// =============================================================================

const ChartDataHelpers = {
    /**
     * Generate net worth trend data
     */
    generateNetWorthTrend(history, months = 12) {
        // Would need historical data - return placeholder
        const labels = [];
        const data = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            data.push(0); // Placeholder
        }

        return { labels, data };
    },

    /**
     * Generate debt payoff projection
     */
    generateDebtPayoffProjection(debts, extraPayment = 0) {
        const labels = [];
        const balances = [];

        let totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.Current_Balance || 0), 0);
        const totalMinPayment = debts.reduce((sum, d) => sum + parseFloat(d.Min_Payment || 0), 0);
        const monthlyPayment = totalMinPayment + extraPayment;

        let month = 0;
        while (totalBalance > 0 && month < 120) { // Max 10 years
            labels.push(`Month ${month}`);
            balances.push(totalBalance);

            // Simplified - doesn't account for varying interest rates
            totalBalance = Math.max(0, totalBalance - monthlyPayment + (totalBalance * 0.01)); // Assume ~12% avg APR
            month++;
        }

        return { labels, balances, monthsToPayoff: month };
    },

    /**
     * Generate investment allocation pie chart data
     */
    generateAllocationData(investments) {
        const categories = {};

        investments.forEach(inv => {
            const cat = inv.Category || 'Other';
            categories[cat] = (categories[cat] || 0) + parseFloat(inv.Current_Value || 0);
        });

        return {
            labels: Object.keys(categories),
            data: Object.values(categories),
            colors: Object.keys(categories).map(cat => {
                if (cat === 'Safe') return '#22c55e';
                if (cat === 'Growth') return '#3b82f6';
                return '#6b7280';
            })
        };
    },

    /**
     * Generate round-up progress data
     */
    generateRoundUpProgress(roundUps, threshold = 25) {
        const pending = roundUps.filter(r => r.Status === 'Pending');
        const total = pending.reduce((sum, r) => sum + parseFloat(r.Final_Amount || 0), 0);

        return {
            current: total,
            threshold: threshold,
            percent: Math.min(100, (total / threshold) * 100),
            remaining: Math.max(0, threshold - total)
        };
    }
};

// =============================================================================
// NOTIFICATION HELPERS
// =============================================================================

const NotificationHelpers = {
    /**
     * Check for bills due soon
     */
    checkBillsDueSoon(bills, daysAhead = 7) {
        const today = new Date();
        const alerts = [];

        bills.forEach(bill => {
            if (bill.daysUntilDue <= daysAhead && bill.daysUntilDue >= 0) {
                alerts.push({
                    type: 'warning',
                    title: `${bill.Name} due soon`,
                    message: `$${bill.Amount} due in ${bill.daysUntilDue} days`,
                    action: 'Pay Now'
                });
            } else if (bill.isOverdue) {
                alerts.push({
                    type: 'danger',
                    title: `${bill.Name} overdue!`,
                    message: `$${bill.Amount} was due ${Math.abs(bill.daysUntilDue)} days ago`,
                    action: 'Pay Now'
                });
            }
        });

        return alerts;
    },

    /**
     * Check for round-up investment opportunity
     */
    checkRoundUpReady(roundUps, threshold = 25) {
        const pending = roundUps.filter(r => r.Status === 'Pending');
        const total = pending.reduce((sum, r) => sum + parseFloat(r.Final_Amount || 0), 0);

        if (total >= threshold) {
            return {
                type: 'success',
                title: 'Ready to Invest!',
                message: `$${total.toFixed(2)} in round-ups ready to invest`,
                action: 'Invest Now'
            };
        }

        return null;
    }
};

// =============================================================================
// INITIALIZE GLOBAL INSTANCES
// =============================================================================

// Create global API client instance
const TinySeedFinancialAPI = new FinancialAPIClient();

// Create global data manager instance
const TinySeedDataManager = new DashboardDataManager(TinySeedFinancialAPI);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FinancialAPIClient,
        DashboardDataManager,
        ChartDataHelpers,
        NotificationHelpers,
        TinySeedFinancialAPI,
        TinySeedDataManager,
        FINANCIAL_API_CONFIG
    };
}

// For browser environments
if (typeof window !== 'undefined') {
    window.TinySeedFinancialAPI = TinySeedFinancialAPI;
    window.TinySeedDataManager = TinySeedDataManager;
    window.ChartDataHelpers = ChartDataHelpers;
    window.NotificationHelpers = NotificationHelpers;
}
