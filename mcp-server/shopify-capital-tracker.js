/**
 * SHOPIFY CAPITAL LOAN TRACKER
 *
 * Since Shopify doesn't expose Capital data via API, this module:
 * 1. Stores loan details manually (from CSV export)
 * 2. Calculates daily payments based on 17% of sales
 * 3. Tracks remaining balance
 * 4. Syncs with Google Sheets for persistence
 *
 * Loan Details (from contract):
 * - Original Amount: $22,000.00
 * - Total Payment Amount: $24,787.40 (includes all monthly fees)
 * - Repayment Rate: 17% of daily sales
 * - Monthly Fee: $317.00 (charged on 21st of each month)
 * - Maximum Term: 18 months
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Capital Loan Configuration (from your contract)
const CAPITAL_LOAN = {
  originalAmount: 22000.00,
  totalPaymentAmount: 24787.40,  // Includes all monthly fees
  repaymentRate: 0.17,           // 17% of daily sales
  monthlyFee: 317.00,
  startDate: '2025-04-21',
  maxTermMonths: 18
};

// Apps Script API for sheet operations
const API_BASE = process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzQGqay-b2A97ThL33YSnLa4MBdu_48ReQMXV_ndtvfSzoYVhURlZy5cWbXQ2hDPx2d/exec';

/**
 * Parse CSV line handling quoted values with commas
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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
 * Parse currency value like "$11,397.41 USD" or "-$102.00 USD"
 */
function parseCurrency(value) {
  if (!value || value === '""' || value === '') return 0;
  const cleaned = String(value).replace(/[$,USD\s"]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Parse the Capital transactions CSV
 */
function parseCapitalCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = parseCSVLine(lines[0]);

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const txn = {};

    headers.forEach((header, idx) => {
      txn[header.trim()] = values[idx] || '';
    });

    transactions.push({
      date: txn['Date'],
      type: txn['Transaction Type'],
      totalSales: parseCurrency(txn['Total Sales']),
      amount: parseCurrency(txn['Amount']),
      transferDate: txn['Transfer Date'],
      status: txn['Status'],
      balance: parseCurrency(txn['Balance'])
    });
  }

  return transactions;
}

/**
 * Get the current Capital loan status from the most recent CSV data
 */
function getCapitalStatusFromCSV(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const transactions = parseCapitalCSV(csvContent);

    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found in CSV' };
    }

    // Get the most recent transaction for current balance
    const lastTxn = transactions[transactions.length - 1];

    // Calculate totals
    let totalPaid = 0;
    let totalInterest = 0;
    let totalPayments = 0;

    transactions.forEach(txn => {
      if (txn.type === 'payment' && txn.amount < 0) {
        totalPayments += Math.abs(txn.amount);
      } else if (txn.type === 'interest') {
        totalInterest += txn.amount;
      }
    });

    // Get pending payments
    const pendingPayments = transactions.filter(t => t.status === 'pending');
    const pendingAmount = pendingPayments.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    return {
      success: true,
      loan: {
        originalAmount: CAPITAL_LOAN.originalAmount,
        totalPaymentAmount: CAPITAL_LOAN.totalPaymentAmount,
        repaymentRate: CAPITAL_LOAN.repaymentRate,
        monthlyFee: CAPITAL_LOAN.monthlyFee,
        startDate: CAPITAL_LOAN.startDate
      },
      currentBalance: lastTxn.balance,
      totalPaid: totalPayments,
      totalInterestAccrued: totalInterest,
      pendingPayments: pendingAmount,
      lastUpdated: lastTxn.date,
      transactionCount: transactions.length,
      percentagePaid: ((CAPITAL_LOAN.originalAmount - lastTxn.balance + totalInterest) / CAPITAL_LOAN.totalPaymentAmount * 100).toFixed(1)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Calculate expected Capital payment from daily sales
 */
function calculateCapitalPayment(dailySales) {
  return dailySales * CAPITAL_LOAN.repaymentRate;
}

/**
 * Get Capital loan summary for the Financial Dashboard
 */
async function getCapitalLoanSummary() {
  // First try to read from the most recent CSV if available
  const csvPath = path.join(__dirname, '..', 'data', 'capital_transactions_latest.csv');

  // Check if we have a stored CSV
  if (fs.existsSync(csvPath)) {
    const status = getCapitalStatusFromCSV(csvPath);
    if (status.success) {
      return status;
    }
  }

  // Fallback: Return loan details with estimated balance
  // (In production, this would query the Google Sheet for stored data)
  return {
    success: true,
    loan: {
      originalAmount: CAPITAL_LOAN.originalAmount,
      totalPaymentAmount: CAPITAL_LOAN.totalPaymentAmount,
      repaymentRate: CAPITAL_LOAN.repaymentRate,
      monthlyFee: CAPITAL_LOAN.monthlyFee,
      startDate: CAPITAL_LOAN.startDate
    },
    currentBalance: 11397.41,  // Last known balance from CSV (Jan 21, 2026)
    message: 'Using last known balance. Upload new CSV for current data.',
    dataSource: 'manual'
  };
}

/**
 * Import Capital transactions from CSV to Google Sheets
 */
async function importCapitalTransactions(csvContent) {
  const transactions = parseCapitalCSV(csvContent);

  if (transactions.length === 0) {
    return { success: false, error: 'No transactions found in CSV' };
  }

  // Save CSV for local reference
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const csvPath = path.join(dataDir, 'capital_transactions_latest.csv');
  fs.writeFileSync(csvPath, csvContent);

  // Get status from the imported data
  const status = getCapitalStatusFromCSV(csvPath);

  return {
    success: true,
    imported: transactions.length,
    ...status
  };
}

/**
 * Estimate daily Capital payments from Shopify sales
 * This calculates what SHOULD be deducted based on the 17% rate
 */
async function estimateCapitalPayments(salesData) {
  const payments = salesData.map(day => ({
    date: day.date,
    sales: day.totalSales,
    estimatedPayment: calculateCapitalPayment(day.totalSales),
    rate: CAPITAL_LOAN.repaymentRate
  }));

  const totalEstimated = payments.reduce((sum, p) => sum + p.estimatedPayment, 0);

  return {
    success: true,
    payments: payments,
    totalEstimatedPayments: totalEstimated,
    repaymentRate: `${CAPITAL_LOAN.repaymentRate * 100}%`
  };
}

module.exports = {
  CAPITAL_LOAN,
  parseCapitalCSV,
  getCapitalStatusFromCSV,
  getCapitalLoanSummary,
  importCapitalTransactions,
  estimateCapitalPayments,
  calculateCapitalPayment
};
