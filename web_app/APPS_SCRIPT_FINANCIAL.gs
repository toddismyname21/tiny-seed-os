/**
 * TINY SEED OS - FINANCIAL MODULE (Apps Script)
 * =============================================
 * Add this code to your existing Apps Script project alongside APPS_SCRIPT_CODE.gs
 * This module handles all financial data: debts, banking, investments, and gamification.
 *
 * After pasting, run createFinancialSheets() once to set up the required tabs.
 *
 * Version: 1.0.0
 * Last Updated: January 2026
 */

// =============================================================================
// FINANCIAL CONFIGURATION
// =============================================================================

const FINANCIAL_CONFIG = {
    // Financial sheet ID (can be same as production or separate)
    SHEET_ID: CONFIG?.PRODUCTION_SHEET_ID || '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc',

    // Tab names for financial data
    TABS: {
        DEBTS: 'FIN_DEBTS',
        DEBT_PAYMENTS: 'FIN_DEBT_PAYMENTS',
        BANK_ACCOUNTS: 'FIN_BANK_ACCOUNTS',
        BILLS: 'FIN_BILLS',
        TRANSACTIONS: 'FIN_TRANSACTIONS',
        INVESTMENTS: 'FIN_INVESTMENTS',
        INVESTMENT_HISTORY: 'FIN_INVESTMENT_HISTORY',
        EMPLOYEES: 'FIN_EMPLOYEES',
        EMPLOYEE_XP: 'FIN_EMPLOYEE_XP',
        ACHIEVEMENTS: 'FIN_ACHIEVEMENTS',
        ROUND_UPS: 'FIN_ROUND_UPS',
        ROUND_UP_INVESTMENTS: 'FIN_ROUND_UP_INVESTMENTS',
        FINANCIAL_SETTINGS: 'FIN_SETTINGS',
        FINANCIAL_DASHBOARD: 'FIN_DASHBOARD'
    }
};

// =============================================================================
// EXTEND MAIN ROUTER - Add these cases to handleAction() in APPS_SCRIPT_CODE.gs
// =============================================================================

/**
 * Add these cases to the switch statement in handleAction():
 *
 * // Financial Module
 * case 'getDebts': return getDebts(params);
 * case 'saveDebt': return saveDebt(params);
 * case 'updateDebt': return updateDebt(params);
 * case 'deleteDebt': return deleteDebt(params);
 * case 'recordDebtPayment': return recordDebtPayment(params);
 * case 'getDebtPayments': return getDebtPayments(params);
 * case 'getBankAccounts': return getBankAccounts(params);
 * case 'saveBankAccount': return saveBankAccount(params);
 * case 'updateBankAccount': return updateBankAccount(params);
 * case 'getBills': return getBills(params);
 * case 'saveBill': return saveBill(params);
 * case 'updateBill': return updateBill(params);
 * case 'getInvestments': return getInvestments(params);
 * case 'saveInvestment': return saveInvestment(params);
 * case 'updateInvestment': return updateInvestment(params);
 * case 'getInvestmentHistory': return getInvestmentHistory(params);
 * case 'getEmployees': return getEmployees(params);
 * case 'saveEmployee': return saveEmployee(params);
 * case 'updateEmployee': return updateEmployee(params);
 * case 'addEmployeeXP': return addEmployeeXP(params);
 * case 'getEmployeeXP': return getEmployeeXP(params);
 * case 'unlockAchievement': return unlockAchievement(params);
 * case 'getAchievements': return getAchievements(params);
 * case 'getRoundUps': return getRoundUps(params);
 * case 'saveRoundUp': return saveRoundUp(params);
 * case 'recordRoundUpInvestment': return recordRoundUpInvestment(params);
 * case 'getFinancialDashboard': return getFinancialDashboard(params);
 * case 'getFinancialSettings': return getFinancialSettings(params);
 * case 'saveFinancialSettings': return saveFinancialSettings(params);
 * case 'createFinancialSheets': return createFinancialSheets();
 */

// =============================================================================
// SHEET CREATION - Run once to set up financial sheets
// =============================================================================

function createFinancialSheets() {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const results = [];

    // Debts sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.DEBTS, [
        'Debt_ID', 'Name', 'Type', 'Current_Balance', 'Original_Balance',
        'APR', 'Min_Payment', 'Due_Day', 'Account_Number', 'Lender',
        'Status', 'Priority', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Debt Payments sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS, [
        'Payment_ID', 'Debt_ID', 'Payment_Date', 'Amount', 'Principal',
        'Interest', 'New_Balance', 'Method', 'Confirmation', 'Notes', 'Recorded_At'
    ]));

    // Bank Accounts sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS, [
        'Account_ID', 'Name', 'Type', 'Institution', 'Account_Number_Last4',
        'Current_Balance', 'Available_Balance', 'APY', 'Status',
        'Is_Primary', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Bills sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.BILLS, [
        'Bill_ID', 'Name', 'Category', 'Amount', 'Due_Day', 'Frequency',
        'Account_ID', 'Auto_Pay', 'Status', 'Last_Paid', 'Next_Due',
        'Reminder_Days', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Transactions sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.TRANSACTIONS, [
        'Transaction_ID', 'Date', 'Account_ID', 'Type', 'Category',
        'Description', 'Amount', 'Balance_After', 'Source', 'Reference',
        'Tags', 'Notes', 'Created_At'
    ]));

    // Investments sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.INVESTMENTS, [
        'Investment_ID', 'Symbol', 'Name', 'Type', 'Category', 'Shares',
        'Cost_Basis', 'Current_Price', 'Current_Value', 'Gain_Loss',
        'Gain_Loss_Pct', 'Account', 'Purchase_Date', 'Notes', 'Updated_At'
    ]));

    // Investment History sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY, [
        'History_ID', 'Date', 'Action', 'Symbol', 'Shares', 'Price',
        'Total', 'Account', 'Source', 'Notes', 'Created_At'
    ]));

    // Employees sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.EMPLOYEES, [
        'Employee_ID', 'Name', 'Email', 'Role', 'Department', 'Start_Date',
        'XP_Total', 'Level', 'Current_Streak', 'Best_Streak', 'Bonus_Tier',
        'Total_Bonus_Earned', 'Status', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Employee XP History sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.EMPLOYEE_XP, [
        'XP_ID', 'Employee_ID', 'Activity', 'XP_Amount', 'Category',
        'Description', 'Recorded_By', 'Notes', 'Created_At'
    ]));

    // Achievements sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ACHIEVEMENTS, [
        'Achievement_ID', 'Employee_ID', 'Achievement_Code', 'Achievement_Name',
        'Category', 'XP_Reward', 'Unlocked_At', 'Notes'
    ]));

    // Round-ups sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ROUND_UPS, [
        'RoundUp_ID', 'Date', 'Source', 'Original_Amount', 'RoundUp_Amount',
        'Multiplier', 'Final_Amount', 'Order_ID', 'Customer_ID',
        'Description', 'Status', 'Created_At'
    ]));

    // Round-up Investments sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ROUND_UP_INVESTMENTS, [
        'Investment_ID', 'Date', 'Total_Amount', 'Safe_Amount', 'Growth_Amount',
        'Transaction_Count', 'Season', 'Multiplier', 'Allocation_Details',
        'Status', 'Notes', 'Created_At'
    ]));

    // Financial Settings sheet
    results.push(createSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS, [
        'Setting_Key', 'Setting_Value', 'Category', 'Description', 'Updated_At'
    ]));

    // Initialize default settings
    initializeDefaultSettings(ss);

    return {
        success: true,
        message: 'Financial sheets created successfully',
        results: results
    };
}

function createSheetIfNotExists(ss, sheetName, headers) {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a472a');
        sheet.getRange(1, 1, 1, headers.length).setFontColor('#ffffff');
        sheet.setFrozenRows(1);

        return { sheet: sheetName, status: 'created', columns: headers.length };
    }

    return { sheet: sheetName, status: 'exists', columns: headers.length };
}

function initializeDefaultSettings(ss) {
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    if (data.length > 1) return; // Settings already exist

    const defaults = [
        ['debt_strategy', 'avalanche', 'debt', 'Debt payoff strategy: avalanche or snowball'],
        ['roundup_multiplier', '1', 'roundups', 'Round-up multiplier (1x, 2x, 3x, 5x, 10x)'],
        ['auto_invest_threshold', '25', 'roundups', 'Auto-invest when round-ups reach this amount'],
        ['safe_allocation', '0.75', 'investments', 'Percentage allocated to safe investments'],
        ['growth_allocation', '0.25', 'investments', 'Percentage allocated to growth investments'],
        ['gamification_enabled', 'true', 'employees', 'Enable employee gamification features'],
        ['bonus_pool_percentage', '0.05', 'employees', 'Percentage of profits for bonus pool'],
        ['emergency_fund_target', '10000', 'goals', 'Target emergency fund amount'],
        ['sep_ira_percentage', '0.25', 'investments', 'SEP-IRA contribution percentage'],
        ['dashboard_refresh_interval', '300', 'system', 'Dashboard refresh interval in seconds']
    ];

    defaults.forEach(setting => {
        sheet.appendRow([...setting, new Date().toISOString()]);
    });
}

// =============================================================================
// DEBT MANAGEMENT
// =============================================================================

function getDebts(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: true, data: [], count: 0, message: 'Debts sheet not found. Run createFinancialSheets() first.' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debts = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const debt = {};
        headers.forEach((header, index) => {
            debt[header] = row[index];
        });

        // Calculate interest and payoff info
        debt.monthlyInterest = (parseFloat(debt.Current_Balance) * (parseFloat(debt.APR) / 100)) / 12;

        debts.push(debt);
    }

    // Sort by strategy if requested
    if (params.sortBy === 'avalanche') {
        debts.sort((a, b) => parseFloat(b.APR) - parseFloat(a.APR));
    } else if (params.sortBy === 'snowball') {
        debts.sort((a, b) => parseFloat(a.Current_Balance) - parseFloat(b.Current_Balance));
    }

    // Filter by status
    let filtered = debts;
    if (params.status) {
        filtered = debts.filter(d => d.Status === params.status);
    }

    // Calculate totals
    const totals = {
        totalBalance: filtered.reduce((sum, d) => sum + parseFloat(d.Current_Balance || 0), 0),
        totalMinPayment: filtered.reduce((sum, d) => sum + parseFloat(d.Min_Payment || 0), 0),
        totalMonthlyInterest: filtered.reduce((sum, d) => sum + (d.monthlyInterest || 0), 0),
        averageAPR: filtered.length > 0 ?
            filtered.reduce((sum, d) => sum + parseFloat(d.APR || 0), 0) / filtered.length : 0
    };

    return {
        success: true,
        data: filtered,
        count: filtered.length,
        totals: totals
    };
}

function saveDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found. Run createFinancialSheets() first.' };
    }

    const debtId = params.id || 'DEBT_' + Date.now();
    const now = new Date().toISOString();

    const newRow = [
        debtId,
        params.name || '',
        params.type || 'Credit Card',
        parseFloat(params.balance) || 0,
        parseFloat(params.originalBalance) || parseFloat(params.balance) || 0,
        parseFloat(params.apr) || 0,
        parseFloat(params.minPayment) || 0,
        parseInt(params.dueDay) || 1,
        params.accountNumber || '',
        params.lender || '',
        params.status || 'Active',
        params.priority || 'Normal',
        params.notes || '',
        now,
        now
    ];

    sheet.appendRow(newRow);

    return {
        success: true,
        message: 'Debt saved successfully',
        debtId: debtId
    };
}

function updateDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debtIdCol = headers.indexOf('Debt_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][debtIdCol] === params.debtId) {
            // Update each field if provided
            const updatedFields = [];

            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'debtId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                    updatedFields.push(key);
                }
            });

            // Update timestamp
            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return {
                success: true,
                message: 'Debt updated',
                updatedFields: updatedFields
            };
        }
    }

    return { success: false, error: 'Debt not found' };
}

function deleteDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debtIdCol = headers.indexOf('Debt_ID');
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
        if (data[i][debtIdCol] === params.debtId) {
            // Soft delete - mark as Deleted
            if (statusCol >= 0) {
                sheet.getRange(i + 1, statusCol + 1).setValue('Deleted');
            }

            return {
                success: true,
                message: 'Debt marked as deleted'
            };
        }
    }

    return { success: false, error: 'Debt not found' };
}

function recordDebtPayment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const paymentSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS);
    const debtSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!paymentSheet || !debtSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    // Get current debt balance
    const debtData = debtSheet.getDataRange().getValues();
    const debtHeaders = debtData[0];
    const debtIdCol = debtHeaders.indexOf('Debt_ID');
    const balanceCol = debtHeaders.indexOf('Current_Balance');
    const aprCol = debtHeaders.indexOf('APR');

    let debtRow = -1;
    let currentBalance = 0;
    let apr = 0;

    for (let i = 1; i < debtData.length; i++) {
        if (debtData[i][debtIdCol] === params.debtId) {
            debtRow = i + 1;
            currentBalance = parseFloat(debtData[i][balanceCol]) || 0;
            apr = parseFloat(debtData[i][aprCol]) || 0;
            break;
        }
    }

    if (debtRow < 0) {
        return { success: false, error: 'Debt not found' };
    }

    // Calculate principal and interest
    const amount = parseFloat(params.amount) || 0;
    const monthlyInterest = (currentBalance * (apr / 100)) / 12;
    const interest = Math.min(amount, monthlyInterest);
    const principal = amount - interest;
    const newBalance = Math.max(0, currentBalance - principal);

    // Record payment
    const paymentId = 'PAY_' + Date.now();
    const now = new Date().toISOString();

    paymentSheet.appendRow([
        paymentId,
        params.debtId,
        params.paymentDate || now.split('T')[0],
        amount,
        principal,
        interest,
        newBalance,
        params.method || 'Manual',
        params.confirmation || '',
        params.notes || '',
        now
    ]);

    // Update debt balance
    debtSheet.getRange(debtRow, balanceCol + 1).setValue(newBalance);

    // Update debt status if paid off
    if (newBalance <= 0) {
        const statusCol = debtHeaders.indexOf('Status');
        if (statusCol >= 0) {
            debtSheet.getRange(debtRow, statusCol + 1).setValue('Paid Off');
        }
    }

    return {
        success: true,
        message: 'Payment recorded',
        paymentId: paymentId,
        principal: principal,
        interest: interest,
        newBalance: newBalance,
        paidOff: newBalance <= 0
    };
}

function getDebtPayments(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const payments = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const payment = {};
        headers.forEach((header, index) => {
            payment[header] = row[index];
        });

        // Filter by debt if provided
        if (params.debtId && payment.Debt_ID !== params.debtId) continue;

        payments.push(payment);
    }

    // Sort by date descending
    payments.sort((a, b) => new Date(b.Payment_Date) - new Date(a.Payment_Date));

    return {
        success: true,
        data: payments,
        count: payments.length
    };
}

// =============================================================================
// BANK ACCOUNTS
// =============================================================================

function getBankAccounts(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accounts = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const account = {};
        headers.forEach((header, index) => {
            account[header] = row[index];
        });

        // Filter by type if provided
        if (params.type && account.Type !== params.type) continue;
        if (params.status && account.Status !== params.status) continue;

        accounts.push(account);
    }

    // Calculate totals
    const totals = {
        totalBalance: accounts.reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0),
        checking: accounts.filter(a => a.Type === 'Checking').reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0),
        savings: accounts.filter(a => a.Type === 'Savings').reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0)
    };

    return {
        success: true,
        data: accounts,
        count: accounts.length,
        totals: totals
    };
}

function saveBankAccount(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: false, error: 'Bank accounts sheet not found' };
    }

    const accountId = params.id || 'ACCT_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        accountId,
        params.name || '',
        params.type || 'Checking',
        params.institution || '',
        params.last4 || '',
        parseFloat(params.balance) || 0,
        parseFloat(params.availableBalance) || parseFloat(params.balance) || 0,
        parseFloat(params.apy) || 0,
        params.status || 'Active',
        params.isPrimary || false,
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Bank account saved',
        accountId: accountId
    };
}

function updateBankAccount(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: false, error: 'Bank accounts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accountIdCol = headers.indexOf('Account_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][accountIdCol] === params.accountId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'accountId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Bank account updated' };
        }
    }

    return { success: false, error: 'Account not found' };
}

// =============================================================================
// BILLS
// =============================================================================

function getBills(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const bills = [];
    const today = new Date();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const bill = {};
        headers.forEach((header, index) => {
            bill[header] = row[index];
        });

        // Calculate next due date
        bill.nextDueDate = calculateNextDueDate(bill.Due_Day, bill.Frequency, bill.Last_Paid);
        bill.daysUntilDue = Math.ceil((new Date(bill.nextDueDate) - today) / (1000 * 60 * 60 * 24));
        bill.isOverdue = bill.daysUntilDue < 0;
        bill.isDueSoon = bill.daysUntilDue >= 0 && bill.daysUntilDue <= 7;

        // Filter by status
        if (params.status && bill.Status !== params.status) continue;
        if (params.dueSoon && !bill.isDueSoon && !bill.isOverdue) continue;

        bills.push(bill);
    }

    // Sort by next due date
    bills.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

    // Calculate totals
    const totals = {
        monthlyTotal: bills.reduce((sum, b) => {
            const freq = b.Frequency || 'Monthly';
            const amount = parseFloat(b.Amount) || 0;
            if (freq === 'Weekly') return sum + (amount * 4);
            if (freq === 'Bi-Weekly') return sum + (amount * 2);
            if (freq === 'Quarterly') return sum + (amount / 3);
            if (freq === 'Annually') return sum + (amount / 12);
            return sum + amount;
        }, 0),
        overdue: bills.filter(b => b.isOverdue).length,
        dueSoon: bills.filter(b => b.isDueSoon).length
    };

    return {
        success: true,
        data: bills,
        count: bills.length,
        totals: totals
    };
}

function calculateNextDueDate(dueDay, frequency, lastPaid) {
    const today = new Date();
    let nextDue = new Date(today);

    if (frequency === 'Weekly') {
        // Next occurrence of that day of week
        const targetDay = parseInt(dueDay) || 0; // 0 = Sunday
        const daysUntil = (targetDay - today.getDay() + 7) % 7;
        nextDue.setDate(today.getDate() + (daysUntil || 7));
    } else if (frequency === 'Bi-Weekly') {
        const lastPaidDate = lastPaid ? new Date(lastPaid) : new Date(today.setDate(today.getDate() - 14));
        nextDue = new Date(lastPaidDate);
        nextDue.setDate(nextDue.getDate() + 14);
        while (nextDue < new Date()) {
            nextDue.setDate(nextDue.getDate() + 14);
        }
    } else if (frequency === 'Quarterly') {
        nextDue.setDate(parseInt(dueDay) || 1);
        while (nextDue <= today) {
            nextDue.setMonth(nextDue.getMonth() + 3);
        }
    } else if (frequency === 'Annually') {
        nextDue.setDate(parseInt(dueDay) || 1);
        if (nextDue <= today) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
    } else {
        // Monthly (default)
        nextDue.setDate(parseInt(dueDay) || 1);
        if (nextDue <= today) {
            nextDue.setMonth(nextDue.getMonth() + 1);
        }
    }

    return formatDateForSheet(nextDue);
}

function saveBill(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: false, error: 'Bills sheet not found' };
    }

    const billId = params.id || 'BILL_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        billId,
        params.name || '',
        params.category || 'Utilities',
        parseFloat(params.amount) || 0,
        parseInt(params.dueDay) || 1,
        params.frequency || 'Monthly',
        params.accountId || '',
        params.autoPay || false,
        params.status || 'Active',
        params.lastPaid || '',
        calculateNextDueDate(params.dueDay, params.frequency, params.lastPaid),
        parseInt(params.reminderDays) || 3,
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Bill saved',
        billId: billId
    };
}

function updateBill(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: false, error: 'Bills sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const billIdCol = headers.indexOf('Bill_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][billIdCol] === params.billId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'billId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Bill updated' };
        }
    }

    return { success: false, error: 'Bill not found' };
}

// =============================================================================
// INVESTMENTS
// =============================================================================

function getInvestments(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const investments = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const investment = {};
        headers.forEach((header, index) => {
            investment[header] = row[index];
        });

        // Filter by category
        if (params.category && investment.Category !== params.category) continue;
        if (params.account && investment.Account !== params.account) continue;

        investments.push(investment);
    }

    // Calculate totals
    const totals = {
        totalValue: investments.reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0),
        totalCostBasis: investments.reduce((sum, i) => sum + parseFloat(i.Cost_Basis || 0), 0),
        totalGainLoss: investments.reduce((sum, i) => sum + parseFloat(i.Gain_Loss || 0), 0),
        safeValue: investments.filter(i => i.Category === 'Safe').reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0),
        growthValue: investments.filter(i => i.Category === 'Growth').reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0)
    };

    totals.overallReturnPct = totals.totalCostBasis > 0 ?
        ((totals.totalValue - totals.totalCostBasis) / totals.totalCostBasis) * 100 : 0;

    return {
        success: true,
        data: investments,
        count: investments.length,
        totals: totals
    };
}

function saveInvestment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENTS);

    if (!sheet) {
        return { success: false, error: 'Investments sheet not found' };
    }

    const investmentId = params.id || 'INV_' + Date.now();
    const shares = parseFloat(params.shares) || 0;
    const price = parseFloat(params.price) || 0;
    const costBasis = parseFloat(params.costBasis) || (shares * price);
    const currentPrice = parseFloat(params.currentPrice) || price;
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    sheet.appendRow([
        investmentId,
        params.symbol || '',
        params.name || '',
        params.type || 'ETF',
        params.category || 'Safe',
        shares,
        costBasis,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPct,
        params.account || 'Main',
        params.purchaseDate || formatDateForSheet(new Date()),
        params.notes || '',
        new Date().toISOString()
    ]);

    // Record in history
    recordInvestmentHistory({
        action: 'BUY',
        symbol: params.symbol,
        shares: shares,
        price: price,
        total: costBasis,
        account: params.account,
        source: params.source || 'Manual'
    });

    return {
        success: true,
        message: 'Investment saved',
        investmentId: investmentId
    };
}

function recordInvestmentHistory(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY);

    if (!sheet) return { success: false };

    sheet.appendRow([
        'HIST_' + Date.now(),
        params.date || formatDateForSheet(new Date()),
        params.action || 'BUY',
        params.symbol || '',
        parseFloat(params.shares) || 0,
        parseFloat(params.price) || 0,
        parseFloat(params.total) || 0,
        params.account || '',
        params.source || 'Manual',
        params.notes || '',
        new Date().toISOString()
    ]);

    return { success: true };
}

function getInvestmentHistory(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const history = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = row[index];
        });

        // Filter by symbol
        if (params.symbol && entry.Symbol !== params.symbol) continue;
        if (params.account && entry.Account !== params.account) continue;

        history.push(entry);
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return {
        success: true,
        data: history,
        count: history.length
    };
}

// =============================================================================
// EMPLOYEE GAMIFICATION
// =============================================================================

function getEmployees(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const employees = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const employee = {};
        headers.forEach((header, index) => {
            employee[header] = row[index];
        });

        // Filter by status
        if (params.status && employee.Status !== params.status) continue;
        if (params.department && employee.Department !== params.department) continue;

        // Calculate level from XP
        employee.calculatedLevel = calculateLevel(parseFloat(employee.XP_Total) || 0);

        employees.push(employee);
    }

    // Sort for leaderboard
    if (params.sortBy === 'xp') {
        employees.sort((a, b) => parseFloat(b.XP_Total) - parseFloat(a.XP_Total));
    } else if (params.sortBy === 'level') {
        employees.sort((a, b) => parseInt(b.Level) - parseInt(a.Level));
    }

    return {
        success: true,
        data: employees,
        count: employees.length
    };
}

function calculateLevel(xp) {
    const levels = [
        { level: 1, name: 'Seedling', xpRequired: 0 },
        { level: 2, name: 'Sprout', xpRequired: 100 },
        { level: 3, name: 'Sapling', xpRequired: 300 },
        { level: 4, name: 'Growing', xpRequired: 600 },
        { level: 5, name: 'Budding', xpRequired: 1000 },
        { level: 6, name: 'Blooming', xpRequired: 1500 },
        { level: 7, name: 'Flourishing', xpRequired: 2200 },
        { level: 8, name: 'Thriving', xpRequired: 3000 },
        { level: 9, name: 'Harvester', xpRequired: 4000 },
        { level: 10, name: 'Expert Grower', xpRequired: 5200 },
        { level: 11, name: 'Master Farmer', xpRequired: 6500 },
        { level: 12, name: 'Farm Champion', xpRequired: 8000 },
        { level: 13, name: 'Agricultural Ace', xpRequired: 10000 },
        { level: 14, name: 'Legendary Grower', xpRequired: 12500 },
        { level: 15, name: 'Tiny Seed Legend', xpRequired: 15000 }
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
        if (xp >= levels[i].xpRequired) {
            const nextLevel = levels[i + 1];
            return {
                level: levels[i].level,
                name: levels[i].name,
                currentXP: xp,
                xpForCurrentLevel: levels[i].xpRequired,
                xpForNextLevel: nextLevel ? nextLevel.xpRequired : null,
                progressToNext: nextLevel ?
                    ((xp - levels[i].xpRequired) / (nextLevel.xpRequired - levels[i].xpRequired)) * 100 : 100
            };
        }
    }

    return { level: 1, name: 'Seedling', currentXP: xp };
}

function saveEmployee(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);

    if (!sheet) {
        return { success: false, error: 'Employees sheet not found' };
    }

    const employeeId = params.id || 'EMP_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        employeeId,
        params.name || '',
        params.email || '',
        params.role || '',
        params.department || '',
        params.startDate || formatDateForSheet(new Date()),
        0, // XP Total
        1, // Level
        0, // Current Streak
        0, // Best Streak
        'Bronze', // Bonus Tier
        0, // Total Bonus Earned
        params.status || 'Active',
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Employee saved',
        employeeId: employeeId
    };
}

function addEmployeeXP(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const employeeSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);
    const xpSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEE_XP);

    if (!employeeSheet || !xpSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    const xpAmount = parseInt(params.xp) || 0;
    if (xpAmount <= 0) {
        return { success: false, error: 'XP amount must be positive' };
    }

    // Find employee
    const data = employeeSheet.getDataRange().getValues();
    const headers = data[0];
    const employeeIdCol = headers.indexOf('Employee_ID');
    const xpTotalCol = headers.indexOf('XP_Total');
    const levelCol = headers.indexOf('Level');

    for (let i = 1; i < data.length; i++) {
        if (data[i][employeeIdCol] === params.employeeId) {
            const currentXP = parseFloat(data[i][xpTotalCol]) || 0;
            const newXP = currentXP + xpAmount;

            // Update XP
            employeeSheet.getRange(i + 1, xpTotalCol + 1).setValue(newXP);

            // Calculate and update level
            const levelInfo = calculateLevel(newXP);
            if (levelCol >= 0) {
                employeeSheet.getRange(i + 1, levelCol + 1).setValue(levelInfo.level);
            }

            // Record XP in history
            xpSheet.appendRow([
                'XP_' + Date.now(),
                params.employeeId,
                params.activity || 'General',
                xpAmount,
                params.category || 'Other',
                params.description || '',
                params.recordedBy || 'System',
                params.notes || '',
                new Date().toISOString()
            ]);

            // Check for level up
            const oldLevelInfo = calculateLevel(currentXP);
            const leveledUp = levelInfo.level > oldLevelInfo.level;

            return {
                success: true,
                message: `Added ${xpAmount} XP`,
                newTotal: newXP,
                level: levelInfo,
                leveledUp: leveledUp
            };
        }
    }

    return { success: false, error: 'Employee not found' };
}

function getEmployeeXP(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEE_XP);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const history = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = row[index];
        });

        // Filter by employee
        if (params.employeeId && entry.Employee_ID !== params.employeeId) continue;

        history.push(entry);
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));

    return {
        success: true,
        data: history,
        count: history.length
    };
}

function unlockAchievement(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ACHIEVEMENTS);

    if (!sheet) {
        return { success: false, error: 'Achievements sheet not found' };
    }

    // Check if already unlocked
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][1] === params.employeeId && data[i][2] === params.achievementCode) {
            return { success: false, error: 'Achievement already unlocked' };
        }
    }

    sheet.appendRow([
        'ACH_' + Date.now(),
        params.employeeId,
        params.achievementCode,
        params.achievementName || '',
        params.category || '',
        parseInt(params.xpReward) || 0,
        new Date().toISOString(),
        params.notes || ''
    ]);

    // Add XP reward
    if (params.xpReward) {
        addEmployeeXP({
            employeeId: params.employeeId,
            xp: params.xpReward,
            activity: 'achievement',
            category: 'Achievement',
            description: `Unlocked: ${params.achievementName}`
        });
    }

    return {
        success: true,
        message: 'Achievement unlocked',
        achievement: params.achievementName
    };
}

function getAchievements(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ACHIEVEMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const achievements = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const achievement = {};
        headers.forEach((header, index) => {
            achievement[header] = row[index];
        });

        // Filter by employee
        if (params.employeeId && achievement.Employee_ID !== params.employeeId) continue;

        achievements.push(achievement);
    }

    return {
        success: true,
        data: achievements,
        count: achievements.length
    };
}

// =============================================================================
// ROUND-UPS / CHANGE INVESTING
// =============================================================================

function getRoundUps(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!sheet) {
        return { success: true, data: [], count: 0, balance: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const roundUps = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const roundUp = {};
        headers.forEach((header, index) => {
            roundUp[header] = row[index];
        });

        // Filter by status (pending = not yet invested)
        if (params.status && roundUp.Status !== params.status) continue;
        if (params.source && roundUp.Source !== params.source) continue;

        roundUps.push(roundUp);
    }

    // Calculate pending balance
    const pendingBalance = roundUps
        .filter(r => r.Status === 'Pending')
        .reduce((sum, r) => sum + parseFloat(r.Final_Amount || 0), 0);

    return {
        success: true,
        data: roundUps,
        count: roundUps.length,
        pendingBalance: pendingBalance
    };
}

function saveRoundUp(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!sheet) {
        return { success: false, error: 'Round-ups sheet not found' };
    }

    const originalAmount = parseFloat(params.amount) || 0;
    const roundUpAmount = calculateRoundUp(originalAmount);
    const multiplier = parseFloat(params.multiplier) || 1;
    const finalAmount = roundUpAmount * multiplier;

    sheet.appendRow([
        'RU_' + Date.now(),
        params.date || formatDateForSheet(new Date()),
        params.source || 'Manual',
        originalAmount,
        roundUpAmount,
        multiplier,
        finalAmount,
        params.orderId || '',
        params.customerId || '',
        params.description || '',
        'Pending',
        new Date().toISOString()
    ]);

    return {
        success: true,
        message: 'Round-up recorded',
        roundUpAmount: roundUpAmount,
        finalAmount: finalAmount
    };
}

function calculateRoundUp(amount) {
    const remainder = amount % 1;
    if (remainder === 0) return 1.00;
    return parseFloat((1 - remainder).toFixed(2));
}

function recordRoundUpInvestment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const investmentSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UP_INVESTMENTS);
    const roundUpsSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!investmentSheet || !roundUpsSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    // Get pending round-ups
    const roundUpsData = roundUpsSheet.getDataRange().getValues();
    const roundUpsHeaders = roundUpsData[0];
    const statusCol = roundUpsHeaders.indexOf('Status');
    const finalAmountCol = roundUpsHeaders.indexOf('Final_Amount');

    let totalAmount = 0;
    let transactionCount = 0;
    const rowsToUpdate = [];

    for (let i = 1; i < roundUpsData.length; i++) {
        if (roundUpsData[i][statusCol] === 'Pending') {
            totalAmount += parseFloat(roundUpsData[i][finalAmountCol]) || 0;
            transactionCount++;
            rowsToUpdate.push(i + 1);
        }
    }

    if (totalAmount < 5) {
        return {
            success: false,
            error: 'Minimum investment is $5',
            currentBalance: totalAmount
        };
    }

    // Calculate allocation (75/25 split)
    const safeAmount = totalAmount * 0.75;
    const growthAmount = totalAmount * 0.25;

    // Record investment
    const investmentId = 'RUINV_' + Date.now();
    const season = getCurrentSeason();

    investmentSheet.appendRow([
        investmentId,
        formatDateForSheet(new Date()),
        totalAmount,
        safeAmount,
        growthAmount,
        transactionCount,
        season.name,
        params.multiplier || 1,
        JSON.stringify({
            safe: {
                treasuryBonds: safeAmount * 0.4,
                stableDividend: safeAmount * 0.35,
                moneyMarket: safeAmount * 0.25
            },
            growth: {
                totalMarket: growthAmount * 0.5,
                international: growthAmount * 0.3,
                emergingMarkets: growthAmount * 0.2
            }
        }),
        'Completed',
        params.notes || '',
        new Date().toISOString()
    ]);

    // Update round-ups status
    rowsToUpdate.forEach(row => {
        roundUpsSheet.getRange(row, statusCol + 1).setValue('Invested');
    });

    return {
        success: true,
        message: 'Investment recorded',
        investmentId: investmentId,
        totalAmount: totalAmount,
        safeAmount: safeAmount,
        growthAmount: growthAmount,
        transactionCount: transactionCount
    };
}

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;

    if ([9, 10, 11].includes(month)) return { name: 'Harvest', multiplier: 1.5 };
    if ([3, 4, 5].includes(month)) return { name: 'Planting', multiplier: 0.75 };
    if ([12, 1, 2].includes(month)) return { name: 'Winter', multiplier: 0.5 };
    return { name: 'Growing', multiplier: 1.0 };
}

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

function getFinancialDashboard(params) {
    // Aggregate all financial data for dashboard
    const debts = getDebts({});
    const accounts = getBankAccounts({});
    const bills = getBills({});
    const investments = getInvestments({});
    const roundUps = getRoundUps({ status: 'Pending' });
    const employees = getEmployees({ sortBy: 'xp' });

    // Calculate net worth
    const totalAssets = (accounts.totals?.totalBalance || 0) + (investments.totals?.totalValue || 0);
    const totalLiabilities = debts.totals?.totalBalance || 0;
    const netWorth = totalAssets - totalLiabilities;

    // Calculate monthly cash flow
    const monthlyIncome = params.monthlyIncome || 0; // Would come from settings
    const monthlyBills = bills.totals?.monthlyTotal || 0;
    const monthlyDebtPayments = debts.totals?.totalMinPayment || 0;
    const monthlyCashFlow = monthlyIncome - monthlyBills - monthlyDebtPayments;

    return {
        success: true,
        data: {
            netWorth: {
                total: netWorth,
                assets: totalAssets,
                liabilities: totalLiabilities
            },
            cashFlow: {
                income: monthlyIncome,
                bills: monthlyBills,
                debtPayments: monthlyDebtPayments,
                available: monthlyCashFlow
            },
            debts: {
                total: debts.totals?.totalBalance || 0,
                count: debts.count || 0,
                monthlyInterest: debts.totals?.totalMonthlyInterest || 0,
                averageAPR: debts.totals?.averageAPR || 0
            },
            banking: {
                total: accounts.totals?.totalBalance || 0,
                checking: accounts.totals?.checking || 0,
                savings: accounts.totals?.savings || 0
            },
            investments: {
                total: investments.totals?.totalValue || 0,
                gainLoss: investments.totals?.totalGainLoss || 0,
                returnPct: investments.totals?.overallReturnPct || 0,
                safe: investments.totals?.safeValue || 0,
                growth: investments.totals?.growthValue || 0
            },
            roundUps: {
                pendingBalance: roundUps.pendingBalance || 0,
                pendingCount: roundUps.count || 0
            },
            bills: {
                monthlyTotal: bills.totals?.monthlyTotal || 0,
                overdue: bills.totals?.overdue || 0,
                dueSoon: bills.totals?.dueSoon || 0
            },
            employees: {
                count: employees.count || 0,
                topPerformers: (employees.data || []).slice(0, 5)
            },
            alerts: generateFinancialAlerts(debts, bills, roundUps)
        },
        timestamp: new Date().toISOString()
    };
}

function generateFinancialAlerts(debts, bills, roundUps) {
    const alerts = [];

    // High interest debt alert
    if (debts.data) {
        const highInterestDebts = debts.data.filter(d => parseFloat(d.APR) > 20);
        if (highInterestDebts.length > 0) {
            alerts.push({
                type: 'warning',
                category: 'debt',
                message: `${highInterestDebts.length} debt(s) with APR over 20%`
            });
        }
    }

    // Overdue bills alert
    if (bills.totals?.overdue > 0) {
        alerts.push({
            type: 'danger',
            category: 'bills',
            message: `${bills.totals.overdue} bill(s) overdue`
        });
    }

    // Bills due soon alert
    if (bills.totals?.dueSoon > 0) {
        alerts.push({
            type: 'info',
            category: 'bills',
            message: `${bills.totals.dueSoon} bill(s) due within 7 days`
        });
    }

    // Round-ups ready to invest
    if (roundUps.pendingBalance >= 25) {
        alerts.push({
            type: 'success',
            category: 'roundups',
            message: `$${roundUps.pendingBalance.toFixed(2)} ready to invest`
        });
    }

    return alerts;
}

// =============================================================================
// SETTINGS
// =============================================================================

function getFinancialSettings(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);

    if (!sheet) {
        return { success: true, data: {} };
    }

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const value = data[i][1];
        if (key) {
            settings[key] = value;
        }
    }

    return {
        success: true,
        data: settings
    };
}

function saveFinancialSettings(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);

    if (!sheet) {
        return { success: false, error: 'Settings sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyCol = headers.indexOf('Setting_Key');
    const valueCol = headers.indexOf('Setting_Value');
    const updatedAtCol = headers.indexOf('Updated_At');

    // Update existing or append new
    Object.keys(params).forEach(key => {
        if (key === 'action') return;

        let found = false;
        for (let i = 1; i < data.length; i++) {
            if (data[i][keyCol] === key) {
                sheet.getRange(i + 1, valueCol + 1).setValue(params[key]);
                if (updatedAtCol >= 0) {
                    sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
                }
                found = true;
                break;
            }
        }

        if (!found) {
            sheet.appendRow([key, params[key], 'custom', '', new Date().toISOString()]);
        }
    });

    return {
        success: true,
        message: 'Settings saved'
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatDateForSheet(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

// =============================================================================
// TEST FINANCIAL MODULE
// =============================================================================

function testFinancialModule() {
    Logger.log('Testing Financial Module...');

    // Test sheet creation
    const createResult = createFinancialSheets();
    Logger.log('Sheet Creation: ' + JSON.stringify(createResult));

    // Test saving a debt
    const debtResult = saveDebt({
        name: 'Test Credit Card',
        type: 'Credit Card',
        balance: 5000,
        apr: 19.99,
        minPayment: 100
    });
    Logger.log('Save Debt: ' + JSON.stringify(debtResult));

    // Test getting debts
    const debtsResult = getDebts({});
    Logger.log('Get Debts: ' + JSON.stringify(debtsResult));

    // Test dashboard
    const dashboardResult = getFinancialDashboard({});
    Logger.log('Dashboard: ' + JSON.stringify(dashboardResult));

    Logger.log('Financial Module tests completed!');
}
