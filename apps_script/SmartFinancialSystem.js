// =============================================================================
// SMART FINANCIAL SYSTEM - WISHLIST, BILLS, ASSETS, INVESTMENTS, PAYMENT PLANS
// Production-ready financial management for Tiny Seed Farm
// =============================================================================

const FINANCIAL_SHEET_NAME = 'FinancialData';

/**
 * Get or create the Financial Data sheet
 */
function getFinancialSheet() {
    const ss = SpreadsheetApp.openById('128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc');
    let sheet = ss.getSheetByName(FINANCIAL_SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(FINANCIAL_SHEET_NAME);
        sheet.getRange('A1:D1').setValues([['DataType', 'Data', 'LastUpdated', 'Version']]);
    }
    return sheet;
}

/**
 * Get data by type from Financial sheet
 */
function getFinancialData(dataType) {
    try {
        const sheet = getFinancialSheet();
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === dataType) {
                return JSON.parse(data[i][1] || '[]');
            }
        }
        return [];
    } catch (e) {
        console.error('Error getting financial data:', e);
        return [];
    }
}

/**
 * Save data by type to Financial sheet
 */
function saveFinancialData(dataType, data) {
    try {
        const sheet = getFinancialSheet();
        const allData = sheet.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < allData.length; i++) {
            if (allData[i][0] === dataType) {
                sheet.getRange(i + 1, 2, 1, 2).setValues([[JSON.stringify(data), new Date().toISOString()]]);
                found = true;
                break;
            }
        }

        if (!found) {
            sheet.appendRow([dataType, JSON.stringify(data), new Date().toISOString(), '1.0']);
        }

        return { success: true };
    } catch (e) {
        console.error('Error saving financial data:', e);
        return { success: false, error: e.message };
    }
}

// ==================== WISHLIST FUNCTIONS ====================

function getWishlistItems() {
    try {
        const items = getFinancialData('wishlist');
        return { success: true, items: items };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function saveWishlistItems(params) {
    try {
        const items = params.items ? JSON.parse(params.items) : params.data?.items || [];
        saveFinancialData('wishlist', items);
        return { success: true, message: 'Wishlist saved' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function addWishlistItem(params) {
    try {
        const items = getFinancialData('wishlist');
        const newItem = {
            id: Date.now(),
            name: params.name,
            category: params.category || 'equipment',
            cost: parseFloat(params.cost) || 0,
            priority: params.priority || 'medium',
            method: params.method || 'auto',
            notes: params.notes || '',
            targetDate: params.targetDate || '',
            createdAt: new Date().toISOString(),
            status: 'analyzing'
        };
        items.push(newItem);
        saveFinancialData('wishlist', items);
        return { success: true, item: newItem };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function removeWishlistItem(id) {
    try {
        let items = getFinancialData('wishlist');
        items = items.filter(item => item.id !== parseInt(id));
        saveFinancialData('wishlist', items);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== BILLS FUNCTIONS ====================

function getBillItems() {
    try {
        const items = getFinancialData('bills');
        return { success: true, bills: items };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function saveBillItems(params) {
    try {
        const items = params.bills ? JSON.parse(params.bills) : params.data?.bills || [];
        saveFinancialData('bills', items);
        return { success: true, message: 'Bills saved' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function addBillItem(params) {
    try {
        const items = getFinancialData('bills');
        const newBill = {
            id: Date.now(),
            vendor: params.vendor,
            amount: parseFloat(params.amount) || 0,
            dueDate: params.dueDate,
            accountNumber: params.accountNumber || '',
            category: params.category || 'other',
            isRecurring: params.isRecurring === 'true' || params.isRecurring === true,
            paid: false,
            createdAt: new Date().toISOString()
        };
        items.push(newBill);
        saveFinancialData('bills', items);
        return { success: true, bill: newBill };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function markBillPaid(id) {
    try {
        const items = getFinancialData('bills');
        const bill = items.find(b => b.id === parseInt(id));
        if (bill) {
            bill.paid = true;
            bill.paidAt = new Date().toISOString();
            saveFinancialData('bills', items);
            return { success: true };
        }
        return { success: false, error: 'Bill not found' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== ASSET TRACKING FUNCTIONS ====================

function getAssetItems() {
    try {
        const items = getFinancialData('assets');
        return { success: true, assets: items };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function saveAssetItems(params) {
    try {
        const items = params.assets ? JSON.parse(params.assets) : params.data?.assets || [];
        saveFinancialData('assets', items);
        return { success: true, message: 'Assets saved' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function addAssetItem(params) {
    try {
        const items = getFinancialData('assets');
        const newAsset = {
            id: Date.now(),
            name: params.name,
            category: params.category || 'equipment',
            purchasePrice: parseFloat(params.purchasePrice) || 0,
            purchaseDate: params.purchaseDate || '',
            currentValue: parseFloat(params.currentValue) || parseFloat(params.purchasePrice) || 0,
            condition: params.condition || 'good',
            serial: params.serial || '',
            location: params.location || '',
            depreciation: params.depreciation || '5year',
            createdAt: new Date().toISOString()
        };
        items.push(newAsset);
        saveFinancialData('assets', items);
        return { success: true, asset: newAsset };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function generateAssetSchedule() {
    try {
        const assets = getFinancialData('assets');
        const schedule = {
            equipment: { items: [], total: 0 },
            vehicles: { items: [], total: 0 },
            infrastructure: { items: [], total: 0 },
            inventory: { items: [], total: 0 },
            other: { items: [], total: 0 }
        };

        assets.forEach(asset => {
            const depreciatedValue = calculateAssetDepreciation(asset);
            const category = asset.category === 'vehicle' ? 'vehicles' :
                            asset.category === 'equipment' ? 'equipment' :
                            asset.category === 'infrastructure' ? 'infrastructure' :
                            asset.category === 'inventory' ? 'inventory' : 'other';

            schedule[category].items.push({
                name: asset.name,
                purchasePrice: asset.purchasePrice,
                currentValue: depreciatedValue,
                purchaseDate: asset.purchaseDate,
                serial: asset.serial,
                condition: asset.condition
            });
            schedule[category].total += depreciatedValue;
        });

        const grandTotal = Object.values(schedule).reduce((sum, cat) => sum + cat.total, 0);

        return {
            success: true,
            schedule: schedule,
            grandTotal: grandTotal,
            generatedAt: new Date().toISOString()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function calculateAssetDepreciation(asset) {
    if (!asset.purchaseDate || !asset.purchasePrice) return asset.currentValue || 0;

    const purchaseDate = new Date(asset.purchaseDate);
    const yearsOwned = (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    switch (asset.depreciation) {
        case '5year':
            const rates5 = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
            return calculateMACRS(asset.purchasePrice, yearsOwned, rates5);
        case '7year':
            const rates7 = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446];
            return calculateMACRS(asset.purchasePrice, yearsOwned, rates7);
        case 'straight':
            const depreciationPerYear = asset.purchasePrice / 10;
            return Math.max(0, asset.purchasePrice - (depreciationPerYear * yearsOwned));
        default:
            return asset.currentValue || asset.purchasePrice;
    }
}

function calculateMACRS(purchasePrice, yearsOwned, rates) {
    let totalDepreciation = 0;
    for (let i = 0; i < Math.floor(yearsOwned) && i < rates.length; i++) {
        totalDepreciation += purchasePrice * rates[i];
    }
    return Math.max(0, purchasePrice - totalDepreciation);
}

function generateBalanceSheet() {
    try {
        const assetSchedule = generateAssetSchedule();
        // Get Plaid data for cash/debt
        let plaidAccounts;
        try {
            plaidAccounts = getPlaidAccounts({}) || { accounts: [] };
        } catch (e) {
            plaidAccounts = { accounts: [] };
        }

        let cash = 0, investments = 0, creditUsed = 0, loans = 0;

        if (plaidAccounts.accounts) {
            plaidAccounts.accounts.forEach(acct => {
                const balance = acct.balance_current || 0;
                const subtype = (acct.subtype || '').toLowerCase();
                const type = (acct.type || '').toLowerCase();

                if (subtype === 'checking' || subtype === 'savings' || type === 'depository') {
                    cash += balance;
                } else if (type === 'investment') {
                    investments += balance;
                } else if (subtype === 'credit card' || type === 'credit') {
                    creditUsed += Math.abs(balance);
                } else if (type === 'loan') {
                    loans += Math.abs(balance);
                }
            });
        }

        const totalAssets = cash + investments + (assetSchedule.grandTotal || 0);
        const totalLiabilities = creditUsed + loans;

        return {
            success: true,
            assets: {
                cash: cash,
                investments: investments,
                equipment: assetSchedule.schedule?.equipment?.total || 0,
                vehicles: assetSchedule.schedule?.vehicles?.total || 0,
                infrastructure: assetSchedule.schedule?.infrastructure?.total || 0,
                inventory: assetSchedule.schedule?.inventory?.total || 0,
                other: assetSchedule.schedule?.other?.total || 0,
                total: totalAssets
            },
            liabilities: {
                creditCards: creditUsed,
                loans: loans,
                total: totalLiabilities
            },
            equity: totalAssets - totalLiabilities,
            generatedAt: new Date().toISOString()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== ALPACA CONFIG FUNCTIONS ====================

function getAlpacaConfig() {
    try {
        const config = getFinancialData('alpaca_config');
        return { success: true, config: config.length > 0 ? config[0] : null };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function saveAlpacaConfig(params) {
    try {
        const config = params.config ? JSON.parse(params.config) : params.data?.config || {};
        saveFinancialData('alpaca_config', [config]);
        return { success: true, message: 'Alpaca config saved' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== ROUND-UP INVESTING ====================

function getRoundUpPool() {
    try {
        const pool = getFinancialData('roundup_pool');
        return { success: true, pool: pool.length > 0 ? pool[0] : { total: 0, history: [] } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function calculateRoundUpsFromOrders() {
    try {
        // Get recent Shopify orders
        let orders;
        try {
            orders = syncShopifyOrders({ days: 30 });
        } catch (e) {
            orders = { success: false, orders: [] };
        }

        let totalRoundUps = 0;
        const roundUpHistory = [];

        (orders.orders || []).forEach(order => {
            const total = parseFloat(order.total_price) || 0;
            const roundedUp = Math.ceil(total);
            const roundUp = roundedUp - total;

            if (roundUp > 0 && roundUp < 1) {
                totalRoundUps += roundUp;
                roundUpHistory.push({
                    orderId: order.order_number,
                    orderTotal: total,
                    roundUp: roundUp,
                    date: order.created_at
                });
            }
        });

        // Save to pool
        const pool = {
            total: totalRoundUps,
            history: roundUpHistory,
            lastCalculated: new Date().toISOString()
        };
        saveFinancialData('roundup_pool', [pool]);

        return {
            success: true,
            total: totalRoundUps,
            orderCount: roundUpHistory.length,
            message: `$${totalRoundUps.toFixed(2)} in round-ups from ${roundUpHistory.length} orders`
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== PAYMENT PLANS FUNCTIONS ====================

function getPaymentPlans() {
    try {
        const plans = getFinancialData('payment_plans');
        return { success: true, plans: plans };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function savePaymentPlans(params) {
    try {
        const plans = params.plans ? JSON.parse(params.plans) : params.data?.plans || [];
        saveFinancialData('payment_plans', plans);
        return { success: true, message: 'Payment plans saved' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function createPaymentPlan(params) {
    try {
        const plans = getFinancialData('payment_plans');

        const totalAmount = parseFloat(params.totalAmount) || 0;
        const downPaymentPercent = parseInt(params.downPaymentPercent) || 20;
        const installments = parseInt(params.installments) || 4;
        const interestRate = parseInt(params.interestRate) || 5;

        const downPayment = totalAmount * (downPaymentPercent / 100);
        const remaining = totalAmount - downPayment;
        const interest = remaining * (interestRate / 100);
        const installmentAmount = (remaining + interest) / installments;

        const payments = [];

        // Down payment
        if (downPayment > 0) {
            payments.push({
                number: 0,
                type: 'down_payment',
                amount: Math.round(downPayment * 100) / 100,
                dueDate: new Date().toISOString().split('T')[0],
                paid: false
            });
        }

        // Installments
        const startDate = new Date();
        for (let i = 1; i <= installments; i++) {
            startDate.setMonth(startDate.getMonth() + 1);
            payments.push({
                number: i,
                type: 'installment',
                amount: Math.round(installmentAmount * 100) / 100,
                dueDate: startDate.toISOString().split('T')[0],
                paid: false
            });
        }

        const newPlan = {
            id: Date.now(),
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            totalAmount: totalAmount,
            downPaymentPercent: downPaymentPercent,
            installments: installments,
            interestRate: interestRate,
            planType: params.planType || 'csa',
            finalDueDate: params.finalDueDate || '',
            payments: payments,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        plans.push(newPlan);
        saveFinancialData('payment_plans', plans);

        return { success: true, plan: newPlan };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function recordPaymentPlanPayment(params) {
    try {
        const plans = getFinancialData('payment_plans');
        const plan = plans.find(p => p.id === parseInt(params.planId));

        if (!plan) {
            return { success: false, error: 'Plan not found' };
        }

        const payment = plan.payments.find(p => p.number === parseInt(params.paymentNumber));
        if (payment) {
            payment.paid = true;
            payment.paidAt = new Date().toISOString();

            // Check if plan is complete
            if (plan.payments.every(p => p.paid)) {
                plan.status = 'completed';
                plan.completedAt = new Date().toISOString();
            }

            saveFinancialData('payment_plans', plans);
            return { success: true, message: 'Payment recorded' };
        }

        return { success: false, error: 'Payment not found' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getOverduePaymentPlans() {
    try {
        const plans = getFinancialData('payment_plans');
        const today = new Date();
        const overdue = [];

        plans.forEach(plan => {
            if (plan.status !== 'active') return;
            plan.payments.forEach(payment => {
                if (!payment.paid && new Date(payment.dueDate) < today) {
                    overdue.push({
                        planId: plan.id,
                        customer: plan.customerName,
                        email: plan.customerEmail,
                        payment: payment
                    });
                }
            });
        });

        return { success: true, overdue: overdue };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== FINANCIAL HEALTH SCORE ====================

function getFinancialHealthScore() {
    try {
        const balanceSheet = generateBalanceSheet();
        const bills = getFinancialData('bills');

        if (!balanceSheet.success) {
            return { success: false, error: 'Could not generate balance sheet' };
        }

        let score = 50; // Base score
        const components = {};

        // Emergency Fund Score (20%)
        const monthlyExpenses = 3000; // Default estimate
        const emergencyMonths = balanceSheet.assets.cash / monthlyExpenses;
        if (emergencyMonths >= 6) {
            components.emergencyFund = 100;
            score += 10;
        } else if (emergencyMonths >= 3) {
            components.emergencyFund = 75;
            score += 7;
        } else if (emergencyMonths >= 1) {
            components.emergencyFund = 50;
            score += 3;
        } else {
            components.emergencyFund = 25;
            score -= 5;
        }

        // Debt-to-Asset Ratio (25%)
        const debtRatio = balanceSheet.assets.total > 0 ?
            (balanceSheet.liabilities.total / balanceSheet.assets.total) * 100 : 100;
        if (debtRatio < 20) {
            components.debtRatio = 100;
            score += 12;
        } else if (debtRatio < 40) {
            components.debtRatio = 75;
            score += 8;
        } else if (debtRatio < 60) {
            components.debtRatio = 50;
            score += 3;
        } else {
            components.debtRatio = 25;
            score -= 5;
        }

        // Net Worth Trend (20%)
        if (balanceSheet.equity > 50000) {
            components.netWorth = 100;
            score += 10;
        } else if (balanceSheet.equity > 10000) {
            components.netWorth = 75;
            score += 7;
        } else if (balanceSheet.equity > 0) {
            components.netWorth = 50;
            score += 3;
        } else {
            components.netWorth = 25;
            score -= 5;
        }

        // Bill Payment (15%)
        const unpaidBills = bills.filter(b => !b.paid).length;
        const overdueBills = bills.filter(b => !b.paid && new Date(b.dueDate) < new Date()).length;
        if (overdueBills === 0 && unpaidBills < 3) {
            components.billPayment = 100;
            score += 8;
        } else if (overdueBills === 0) {
            components.billPayment = 75;
            score += 5;
        } else if (overdueBills < 3) {
            components.billPayment = 50;
        } else {
            components.billPayment = 25;
            score -= 5;
        }

        // Cap score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        return {
            success: true,
            score: Math.round(score),
            components: components,
            balanceSheet: balanceSheet,
            calculatedAt: new Date().toISOString()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getFinancialRecommendations() {
    try {
        const healthScore = getFinancialHealthScore();
        const recommendations = [];

        if (!healthScore.success) {
            return { success: false, error: 'Could not calculate health score' };
        }

        const bs = healthScore.balanceSheet;
        const components = healthScore.components;

        // Emergency Fund Recommendations
        if (components.emergencyFund < 75) {
            const monthlyExpenses = 3000;
            const target = monthlyExpenses * 3;
            const needed = target - bs.assets.cash;
            recommendations.push({
                type: 'warning',
                title: 'Build Emergency Fund',
                description: `Target 3 months expenses ($${target.toLocaleString()}). Save $${Math.max(0, needed).toLocaleString()} more.`,
                priority: 'high'
            });
        }

        // Debt Recommendations
        if (bs.liabilities.creditCards > 0) {
            recommendations.push({
                type: 'warning',
                title: 'Pay Down Credit Cards',
                description: `You have $${bs.liabilities.creditCards.toLocaleString()} in credit card debt. Use avalanche method for fastest payoff.`,
                priority: 'high'
            });
        }

        // Positive Cash Flow
        if (bs.assets.cash > bs.liabilities.total + 5000) {
            recommendations.push({
                type: 'success',
                title: 'Invest Surplus',
                description: `You have surplus cash. Consider investing in your 75/25 portfolio.`,
                priority: 'medium'
            });
        }

        return {
            success: true,
            score: healthScore.score,
            recommendations: recommendations
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function calculateNetWorth() {
    try {
        const balanceSheet = generateBalanceSheet();
        if (!balanceSheet.success) {
            return { success: false, error: 'Could not generate balance sheet' };
        }

        return {
            success: true,
            netWorth: balanceSheet.equity,
            assets: balanceSheet.assets.total,
            liabilities: balanceSheet.liabilities.total,
            breakdown: balanceSheet
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== PDF EXPORT FOR LOAN APPLICATIONS ====================

/**
 * Generate a complete loan application package as HTML (for PDF conversion)
 * Google Apps Script doesn't have native PDF generation, so we generate
 * professional HTML that can be printed/saved as PDF
 */
function generateLoanPackage() {
    try {
        const balanceSheet = generateBalanceSheet();
        const assetSchedule = generateAssetSchedule();
        const businessName = 'Tiny Seed Farm';
        const generatedDate = new Date().toLocaleDateString();

        if (!balanceSheet.success || !assetSchedule.success) {
            return { success: false, error: 'Could not generate financial data' };
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Loan Application Package - ${businessName}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; color: #333; }
        h1 { color: #1a5f2a; border-bottom: 3px solid #1a5f2a; padding-bottom: 10px; }
        h2 { color: #2d8a3e; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        .currency { text-align: right; font-family: monospace; }
        .total-row { background: #e8f5e9; font-weight: bold; }
        .grand-total { background: #1a5f2a; color: white; font-size: 1.1em; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 50px; padding-top: 5px; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <h1>${businessName} - Loan Application Package</h1>

    <div class="header-info">
        <div>
            <strong>Prepared:</strong> ${generatedDate}<br>
            <strong>Business:</strong> Tiny Seed Farm<br>
            <strong>Owner:</strong> Todd Wilson
        </div>
    </div>

    <h2>BALANCE SHEET</h2>
    <table>
        <tr><th colspan="2">ASSETS</th></tr>
        <tr><td>Cash & Bank Accounts</td><td class="currency">$` + balanceSheet.assets.cash.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Investment Accounts</td><td class="currency">$` + balanceSheet.assets.investments.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Equipment (Depreciated)</td><td class="currency">$` + balanceSheet.assets.equipment.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Vehicles</td><td class="currency">$` + balanceSheet.assets.vehicles.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Infrastructure</td><td class="currency">$` + balanceSheet.assets.infrastructure.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Inventory</td><td class="currency">$` + balanceSheet.assets.inventory.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Other Assets</td><td class="currency">$` + balanceSheet.assets.other.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr class="total-row"><td><strong>TOTAL ASSETS</strong></td><td class="currency"><strong>$` + balanceSheet.assets.total.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</strong></td></tr>

        <tr><th colspan="2">LIABILITIES</th></tr>
        <tr><td>Credit Cards</td><td class="currency">$` + balanceSheet.liabilities.creditCards.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr><td>Loans</td><td class="currency">$` + balanceSheet.liabilities.loans.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</td></tr>
        <tr class="total-row"><td><strong>TOTAL LIABILITIES</strong></td><td class="currency"><strong>$` + balanceSheet.liabilities.total.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</strong></td></tr>

        <tr class="grand-total"><td><strong>OWNER'S EQUITY (Net Worth)</strong></td><td class="currency"><strong>$` + balanceSheet.equity.toLocaleString('en-US', {minimumFractionDigits: 2}) + `</strong></td></tr>
    </table>

    <h2>ASSET SCHEDULE (Detailed)</h2>
    ` + generateAssetScheduleHTML(assetSchedule) + `

    <div style="margin-top: 60px;">
        <p>I certify that the information provided above is accurate and complete.</p>
        <div class="signature-line">
            Owner Signature / Date
        </div>
    </div>

    <div style="margin-top: 30px; font-size: 0.9em; color: #666;">
        <p>Generated by Tiny Seed Farm Financial System | ` + generatedDate + `</p>
    </div>
</body>
</html>
        `;

        return {
            success: true,
            html: html,
            summary: {
                totalAssets: balanceSheet.assets.total,
                totalLiabilities: balanceSheet.liabilities.total,
                netWorth: balanceSheet.equity
            },
            generatedAt: new Date().toISOString()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function generateAssetScheduleHTML(schedule) {
    const categories = [
        { key: 'equipment', label: 'Equipment' },
        { key: 'vehicles', label: 'Vehicles' },
        { key: 'infrastructure', label: 'Infrastructure' },
        { key: 'inventory', label: 'Inventory' },
        { key: 'other', label: 'Other Assets' }
    ];

    let html = '';

    categories.forEach(cat => {
        const data = schedule.schedule[cat.key];
        if (data.items.length > 0) {
            html += '<h3>' + cat.label + '</h3><table><tr><th>Item</th><th>Serial #</th><th>Condition</th><th>Purchase Date</th><th>Current Value</th></tr>';
            data.items.forEach(item => {
                html += '<tr><td>' + item.name + '</td><td>' + (item.serial || 'N/A') + '</td><td>' + (item.condition || 'Good') + '</td><td>' + (item.purchaseDate || 'N/A') + '</td><td class="currency">$' + item.currentValue.toLocaleString('en-US', {minimumFractionDigits: 2}) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="4"><strong>Subtotal - ' + cat.label + '</strong></td><td class="currency"><strong>$' + data.total.toLocaleString('en-US', {minimumFractionDigits: 2}) + '</strong></td></tr></table>';
        }
    });

    html += '<table><tr class="grand-total"><td><strong>TOTAL ALL ASSETS</strong></td><td class="currency"><strong>$' + schedule.grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2}) + '</strong></td></tr></table>';

    return html;
}

/**
 * Save loan package to Google Drive as HTML file
 */
function saveLoanPackageToHTML() {
    try {
        const loanPackage = generateLoanPackage();
        if (!loanPackage.success) {
            return loanPackage;
        }

        const fileName = 'Tiny_Seed_Farm_Loan_Package_' + new Date().toISOString().split('T')[0] + '.html';
        const folder = DriveApp.getRootFolder();
        const file = folder.createFile(fileName, loanPackage.html, MimeType.HTML);

        return {
            success: true,
            fileId: file.getId(),
            fileName: fileName,
            url: file.getUrl(),
            downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
            message: 'Loan package saved. Open in browser and print to PDF.'
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Generate Debt Schedule for loan applications
 */
function generateDebtSchedule() {
    try {
        let plaidAccounts;
        try {
            plaidAccounts = getPlaidAccounts({}) || { accounts: [] };
        } catch (e) {
            plaidAccounts = { accounts: [] };
        }

        const debts = [];
        let totalDebt = 0;
        let totalMinPayments = 0;

        if (plaidAccounts.accounts) {
            plaidAccounts.accounts.forEach(acct => {
                const balance = Math.abs(acct.balance_current || 0);
                const type = (acct.type || '').toLowerCase();
                const subtype = (acct.subtype || '').toLowerCase();

                if (type === 'credit' || subtype === 'credit card' || type === 'loan') {
                    const minPayment = balance * 0.02; // Estimate 2% minimum
                    debts.push({
                        creditor: acct.name || 'Unknown',
                        type: subtype || type,
                        balance: balance,
                        minPayment: minPayment,
                        apr: acct.apr || 0,
                        accountLast4: acct.mask || ''
                    });
                    totalDebt += balance;
                    totalMinPayments += minPayment;
                }
            });
        }

        return {
            success: true,
            debts: debts,
            totalDebt: totalDebt,
            totalMinPayments: totalMinPayments,
            debtCount: debts.length,
            generatedAt: new Date().toISOString()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
