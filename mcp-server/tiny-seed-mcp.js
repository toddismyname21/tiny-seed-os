#!/usr/bin/env node

/**
 * TINY SEED FARM MCP SERVER
 *
 * This Model Context Protocol server gives Claude direct access to:
 * - Google Apps Script functions
 * - Google Sheets data
 * - Email sending
 * - Farm operations
 * - DIRECT Shopify import (bypasses Apps Script timeout)
 *
 * Setup: npm install && node tiny-seed-mcp.js
 */

// Load environment variables from .env file
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const https = require('https');
const readline = require('readline');

// Direct import module (bypasses Apps Script timeout)
const { importCSAFromShopify } = require('./shopify-direct-import');

// Shopify financial data module (direct API access)
const {
  getShopifyPaymentsBalance,
  getShopifyPayouts,
  getShopifyCapital,
  getShopifyFinancialSummary
} = require('./shopify-financial');

// Shopify Capital loan tracker (from CSV data)
const {
  getCapitalLoanSummary,
  parseCapitalCSV,
  CAPITAL_LOAN
} = require('./shopify-capital-tracker');

// PayPal & Venmo integration
const {
  testPayPalConnection,
  getPayPalBalance,
  getPayPalTransactions,
  getPayPalFinancialSummary
} = require('./paypal-integration');

// Shopify Discount Code Creator
const {
  getCollections,
  getProducts,
  createPriceRule,
  createDiscountCode,
  listDiscountCodes,
  deletePriceRule,
  createNeighborDiscounts
} = require('./shopify-discount');

// API Configuration - CURRENT DEPLOYMENT (Updated 2026-01-22)
const API_BASE = 'https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec';

// Available tools for Claude
const TOOLS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  send_season_announcement: {
    description: "Send the 2026 Season Announcement email to Todd for review",
    parameters: {},
    action: "sendSeasonAnnouncement"
  },
  send_email: {
    description: "Send a custom email",
    parameters: {
      to: "Email recipient",
      subject: "Email subject",
      body: "Email body (HTML supported)"
    },
    action: "sendCustomEmail"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CSA MEMBER TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  get_csa_dashboard: {
    description: "Get CSA retention dashboard with member health scores",
    parameters: {},
    action: "getCSARetentionDashboard"
  },
  get_at_risk_members: {
    description: "Get list of CSA members at risk of churning",
    parameters: {
      threshold: "Health score threshold (default 60)"
    },
    action: "getAtRiskCSAMembers"
  },
  get_member_health: {
    description: "Get health score for a specific CSA member",
    parameters: {
      memberId: "The member ID to check"
    },
    action: "getCSAMemberHealth"
  },
  recalculate_health_scores: {
    description: "Recalculate health scores for all active CSA members",
    parameters: {},
    action: "recalculateAllMemberHealth"
  },
  get_churn_alerts: {
    description: "Get all churn alerts sorted by priority",
    parameters: {},
    action: "getCSAChurnAlerts"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FARM OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  get_planning_data: {
    description: "Get crop planning data for the season",
    parameters: {},
    action: "getPlanningData"
  },
  get_greenhouse_tasks: {
    description: "Get current greenhouse sowing tasks",
    parameters: {},
    action: "getGreenhouseSowingTasks"
  },
  get_harvest_predictions: {
    description: "Get AI-powered harvest predictions",
    parameters: {},
    action: "getHarvestPredictions"
  },
  get_weather: {
    description: "Get weather forecast and growing conditions",
    parameters: {},
    action: "getWeatherForecast"
  },
  get_morning_brief: {
    description: "Get the daily morning intelligence brief",
    parameters: {},
    action: "getMorningBrief"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOPIFY TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  shopify_test_connection: {
    description: "Test Shopify API connection",
    parameters: {},
    action: "testShopifyConnection"
  },
  shopify_get_locations: {
    description: "Get all Shopify POS locations (for farmers market setup)",
    parameters: {},
    action: "getShopifyLocations"
  },
  shopify_sync_orders: {
    description: "Sync recent orders from Shopify",
    parameters: {
      limit: "Number of orders to sync (default 50)",
      status: "Order status filter: any, open, closed, cancelled"
    },
    action: "syncShopifyOrders"
  },
  shopify_get_order: {
    description: "Get a specific Shopify order by ID",
    parameters: {
      orderId: "The Shopify order ID"
    },
    action: "getShopifyOrder"
  },
  shopify_sync_products: {
    description: "Sync all products from Shopify",
    parameters: {},
    action: "syncShopifyProducts"
  },
  shopify_sync_customers: {
    description: "Sync customers from Shopify",
    parameters: {
      limit: "Number of customers to sync"
    },
    action: "syncShopifyCustomers"
  },
  shopify_get_email_subscribers: {
    description: "Get email marketing subscribers from Shopify",
    parameters: {},
    action: "getShopifyEmailSubscribers"
  },
  shopify_register_csa_webhook: {
    description: "Register the CSA order webhook with Shopify (auto-creates CSA members from orders)",
    parameters: {},
    action: "registerCSAOrderWebhook"
  },
  shopify_list_webhooks: {
    description: "List all registered Shopify webhooks",
    parameters: {},
    action: "listShopifyWebhooks"
  },
  shopify_delete_webhook: {
    description: "Delete a Shopify webhook by ID",
    parameters: {
      webhookId: "The webhook ID to delete"
    },
    action: "deleteShopifyWebhook"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOPIFY FINANCIAL TOOLS (Direct API - for Financial Dashboard)
  // ═══════════════════════════════════════════════════════════════════════════
  shopify_get_payments_balance: {
    description: "Get Shopify Payments pending balance (money collected but not yet deposited to bank)",
    parameters: {},
    action: "SHOPIFY_PAYMENTS_BALANCE"
  },
  shopify_get_payouts: {
    description: "Get Shopify payout history (deposits to bank account)",
    parameters: {
      limit: "Number of payouts to retrieve (default 20)",
      status: "Filter by status: paid, pending, in_transit, scheduled, canceled"
    },
    action: "SHOPIFY_PAYOUTS"
  },
  shopify_get_capital: {
    description: "Get Shopify Capital loan/advance information",
    parameters: {},
    action: "SHOPIFY_CAPITAL"
  },
  shopify_get_financial_summary: {
    description: "Get complete Shopify financial summary (balance, payouts, capital) for Financial Dashboard",
    parameters: {},
    action: "SHOPIFY_FINANCIAL_SUMMARY"
  },
  shopify_get_capital_loan: {
    description: "Get Shopify Capital loan status (balance, payments, progress) from imported CSV data",
    parameters: {},
    action: "SHOPIFY_CAPITAL_LOAN"
  },
  shopify_setup_capital_tracking: {
    description: "Set up automated Capital loan tracking triggers (daily payment calc, monthly interest, weekly reconciliation reminder)",
    parameters: {},
    action: "setupCapitalTrackingTriggers"
  },
  shopify_calculate_daily_capital: {
    description: "Manually trigger daily Capital payment calculation from yesterday's Shopify sales",
    parameters: {},
    action: "calculateDailyCapitalPayment"
  },
  shopify_reconcile_capital: {
    description: "Reconcile calculated Capital balance with actual CSV balance",
    parameters: {
      actualBalance: "The actual balance from Shopify Capital CSV export"
    },
    action: "reconcileCapitalBalance"
  },
  shopify_capital_status: {
    description: "Get Capital tracking status including recent transactions and trigger status",
    parameters: {},
    action: "getCapitalTrackingStatus"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOPIFY DISCOUNT TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  shopify_list_discounts: {
    description: "List all existing Shopify discount codes",
    parameters: {},
    action: "SHOPIFY_LIST_DISCOUNTS"
  },
  shopify_get_products: {
    description: "Get all Shopify products (to identify CSA products for discounts)",
    parameters: {},
    action: "SHOPIFY_GET_PRODUCTS"
  },
  shopify_create_neighbor_discounts: {
    description: "Create the NEIGHBOR direct mail campaign discount codes: NEIGHBOR-VEG-FULL ($30 off $600+), NEIGHBOR-VEG-HALF ($15 off $300+), NEIGHBOR-FLORAL ($20 off), and NEIGHBOR ($15 base)",
    parameters: {
      endsAt: "Expiration date in ISO format (default: 2026-03-31)",
      dryRun: "Set to 'true' to preview without creating (default: false)"
    },
    action: "SHOPIFY_CREATE_NEIGHBOR_DISCOUNTS"
  },
  shopify_delete_discount: {
    description: "Delete a Shopify price rule (and its discount codes) by ID",
    parameters: {
      priceRuleId: "The price rule ID to delete"
    },
    action: "SHOPIFY_DELETE_DISCOUNT"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYPAL & VENMO TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  paypal_test_connection: {
    description: "Test PayPal API connection",
    parameters: {},
    action: "PAYPAL_TEST"
  },
  paypal_get_balance: {
    description: "Get PayPal account balance (available and pending)",
    parameters: {},
    action: "PAYPAL_BALANCE"
  },
  paypal_get_transactions: {
    description: "Get PayPal transaction history",
    parameters: {
      days: "Number of days to look back (default 30)"
    },
    action: "PAYPAL_TRANSACTIONS"
  },
  paypal_get_summary: {
    description: "Get complete PayPal financial summary for dashboard",
    parameters: {},
    action: "PAYPAL_SUMMARY"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECT IMPORT TOOLS (Bypass Apps Script 30-second timeout)
  // ═══════════════════════════════════════════════════════════════════════════
  import_csa_from_shopify: {
    description: "DIRECT import of CSA members from Shopify orders (bypasses Apps Script timeout). Uses Shopify Order ID for idempotent imports - safe to run multiple times.",
    parameters: {
      maxItems: "Max number of orders to process (optional, default: all)",
      dryRun: "Set to 'true' to preview without writing (optional)"
    },
    action: "DIRECT_IMPORT" // Special marker for direct handling
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICKBOOKS TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  quickbooks_test_connection: {
    description: "Test QuickBooks API connection",
    parameters: {},
    action: "getQuickBooksConnectionStatus"
  },
  quickbooks_get_dashboard: {
    description: "Get QuickBooks financial dashboard",
    parameters: {},
    action: "getQuickBooksDashboard"
  },
  quickbooks_sync_shopify_order: {
    description: "Sync a Shopify order to QuickBooks as an invoice",
    parameters: {
      shopifyOrderId: "The Shopify order ID to sync"
    },
    action: "syncShopifyOrderToQuickBooks"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FARMERS MARKET TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  market_init: {
    description: "Initialize the farmers market module (creates sheets)",
    parameters: {},
    action: "initMarketModule"
  },
  market_get_locations: {
    description: "Get all configured farmers market locations",
    parameters: {},
    action: "getActiveMarketLocations"
  },
  market_get_upcoming: {
    description: "Get upcoming market sessions with weather forecasts",
    parameters: {
      days: "Number of days to look ahead (default 14)"
    },
    action: "getUpcomingMarkets"
  },
  market_create_session: {
    description: "Create a new market session for planning",
    parameters: {
      locationId: "Market location ID (e.g., MKT-SEW)",
      marketDate: "Date in YYYY-MM-DD format"
    },
    action: "createMarketSession"
  },
  market_get_session: {
    description: "Get full details for a market session",
    parameters: {
      sessionId: "The market session ID"
    },
    action: "getMarketSession"
  },
  market_generate_harvest_plan: {
    description: "Generate smart harvest plan for a market session using GDD predictions",
    parameters: {
      sessionId: "The market session ID",
      regenerate: "Set to true to regenerate existing plan"
    },
    action: "generateMarketHarvestPlan"
  },
  market_sync_shopify_sales: {
    description: "Sync sales from Shopify POS for a market session",
    parameters: {
      sessionId: "The market session ID"
    },
    action: "syncShopifyMarketSales"
  },
  market_get_dashboard: {
    description: "Get market dashboard overview or session-specific stats",
    parameters: {
      sessionId: "Optional session ID for specific session"
    },
    action: "getMarketDashboard"
  },
  market_initiate_settlement: {
    description: "Start end-of-market settlement process",
    parameters: {
      sessionId: "The market session ID"
    },
    action: "initiateSettlement"
  },
  market_complete_settlement: {
    description: "Complete settlement with cash reconciliation",
    parameters: {
      sessionId: "The market session ID",
      startingCash: "Starting cash drawer amount",
      endingCash: "Ending cash count",
      reconciledBy: "Person completing settlement"
    },
    action: "completeSettlement"
  },
  market_get_analytics: {
    description: "Get market performance analytics",
    parameters: {
      locationId: "Optional - filter by location",
      dateRange: "Days of history (default 90)"
    },
    action: "getMarketPerformanceAnalytics"
  },
  market_morning_brief: {
    description: "Get market-specific morning intelligence brief",
    parameters: {},
    action: "getMarketMorningBrief"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SALES & CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════
  get_sales_dashboard: {
    description: "Get sales dashboard overview",
    parameters: {},
    action: "getSalesDashboard"
  },
  get_customers: {
    description: "Get customer list",
    parameters: {},
    action: "getSalesCustomers"
  },
  get_pick_pack_list: {
    description: "Get current pick/pack list for orders",
    parameters: {},
    action: "getPickPackList"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETING INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════
  marketing_get_dashboard: {
    description: "Get marketing intelligence dashboard",
    parameters: {},
    action: "getMarketingDashboard"
  },
  marketing_get_customer_intelligence: {
    description: "Get intelligence for a specific customer (CLV, churn risk, RFM)",
    parameters: {
      customerId: "Customer ID or email"
    },
    action: "getCustomerIntelligence"
  },
  marketing_get_next_best_actions: {
    description: "Get AI-recommended next best actions for customers",
    parameters: {
      limit: "Max number of recommendations"
    },
    action: "getNextBestAction"
  },
  marketing_get_attribution_report: {
    description: "Get multi-touch attribution report by channel",
    parameters: {},
    action: "getAttributionReport"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOD SAFETY & COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  compliance_get_dashboard: {
    description: "Get food safety compliance dashboard",
    parameters: {},
    action: "getComplianceDashboard"
  },
  compliance_get_phi_deadlines: {
    description: "Get active pre-harvest interval deadlines",
    parameters: {},
    action: "getActivePHIDeadlines"
  },
  compliance_log_spray: {
    description: "Log a spray application with automatic PHI calculation",
    parameters: {
      sprayName: "Name of spray product",
      crop: "Crop sprayed",
      field: "Field location",
      amount: "Amount applied",
      applicator: "Person who applied"
    },
    action: "logSprayApplication"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SMS INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  sms_get_dashboard: {
    description: "Get SMS integration dashboard with message stats and commitments",
    parameters: {},
    action: "getSMSDashboard"
  },
  sms_get_commitments: {
    description: "Get open SMS commitments (promises made via text)",
    parameters: {
      status: "Filter by status: OPEN, COMPLETED",
      priority: "Filter by priority: HIGH, MEDIUM, LOW"
    },
    action: "getOpenSMSCommitments"
  },
  sms_complete_commitment: {
    description: "Mark an SMS commitment as completed",
    parameters: {
      commitmentId: "The commitment ID to complete"
    },
    action: "completeSMSCommitment"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCIAL
  // ═══════════════════════════════════════════════════════════════════════════
  financial_get_dashboard: {
    description: "Get financial dashboard with P&L summary",
    parameters: {},
    action: "getFinancialDashboard"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHIEF OF STAFF - AI EMAIL ASSISTANT (11 Modules, 95/100 Score)
  // ═══════════════════════════════════════════════════════════════════════════
  cos_get_ultimate_brief: {
    description: "Get THE ultimate morning brief - combines all AI insights",
    parameters: {},
    action: "getUltimateMorningBrief"
  },
  cos_get_weather: {
    description: "Get current weather with farm-specific recommendations",
    parameters: {},
    action: "getWeatherRecommendations"
  },
  cos_get_style_profile: {
    description: "Get Todd's writing style profile (trained on 1,470 emails)",
    parameters: {},
    action: "getStyleProfile"
  },
  cos_apply_style: {
    description: "Apply Todd's writing style to a draft email",
    parameters: {
      draft: "The email draft to style",
      recipientType: "Type: customer, vendor, personal"
    },
    action: "applyStyleToDraft"
  },
  cos_get_available_agents: {
    description: "Get list of 7 specialized AI agents",
    parameters: {},
    action: "getAvailableAgents"
  },
  cos_run_agent_task: {
    description: "Run a task with a specific AI agent",
    parameters: {
      agentType: "Agent: triage, response, research, scheduling, finance, customer",
      task: "JSON task description"
    },
    action: "runAgentTask"
  },
  cos_get_autonomy_status: {
    description: "Get autonomy system status - 29 actions across L0-L4 levels",
    parameters: {},
    action: "getAutonomyStatus"
  },
  cos_run_proactive_scan: {
    description: "Run proactive intelligence scan for issues",
    parameters: {},
    action: "runProactiveScanning"
  },
  cos_get_active_alerts: {
    description: "Get active proactive alerts",
    parameters: {
      priority: "Filter: CRITICAL, HIGH, MEDIUM, LOW"
    },
    action: "getActiveAlerts"
  },
  cos_recall_contact: {
    description: "Recall everything known about a contact from memory",
    parameters: {
      email: "Contact email address"
    },
    action: "recallContact"
  },
  cos_search_files: {
    description: "Search files using natural language",
    parameters: {
      query: "Natural language query like 'Johnny's seed invoices'"
    },
    action: "searchFilesNaturalLanguage"
  },
  cos_predict_churn: {
    description: "Predict which customers are at risk of churning",
    parameters: {},
    action: "predictCustomerChurn"
  },
  cos_forecast_workload: {
    description: "Forecast email workload for coming days",
    parameters: {
      days: "Number of days to forecast (default 7)"
    },
    action: "forecastWorkload"
  },
  cos_parse_voice: {
    description: "Parse a voice command like 'Hey Chief, what's urgent today?'",
    parameters: {
      transcript: "Voice command transcript"
    },
    action: "parseVoiceCommand"
  },
  cos_verify_system: {
    description: "Verify Chief of Staff system health (should be 100%)",
    parameters: {},
    action: "verifyChiefOfStaffSystem"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  health_check: {
    description: "Check if the Tiny Seed API is running",
    parameters: {},
    action: "healthCheck"
  },
  get_system_status: {
    description: "Get full system status",
    parameters: {},
    action: "getSystemStatus"
  }
};

// Make API request
async function callAPI(action, params = {}) {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams({ action, ...params }).toString();
    const url = `${API_BASE}?${queryParams}`;

    https.get(url, { headers: { 'User-Agent': 'TinySeedMCP/1.0' } }, (res) => {
      let data = '';

      // Handle redirect
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => {
          let data2 = '';
          res2.on('data', chunk => data2 += chunk);
          res2.on('end', () => {
            try {
              resolve(JSON.parse(data2));
            } catch (e) {
              resolve({ raw: data2 });
            }
          });
        }).on('error', reject);
        return;
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    }).on('error', reject);
  });
}

// MCP Server Protocol Handler
class TinySeedMCPServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'tiny-seed-mcp',
              version: '1.0.0'
            },
            capabilities: {
              tools: {}
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Object.entries(TOOLS).map(([name, config]) => ({
              name,
              description: config.description,
              inputSchema: {
                type: 'object',
                properties: Object.fromEntries(
                  Object.entries(config.parameters).map(([k, v]) => [k, { type: 'string', description: v }])
                )
              }
            }))
          }
        };

      case 'tools/call':
        const toolName = params.name;
        const toolConfig = TOOLS[toolName];

        if (!toolConfig) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: ${toolName}` }
          };
        }

        try {
          let result;
          const args = params.arguments || {};

          // Handle direct tools (bypass Apps Script)
          switch (toolConfig.action) {
            case 'DIRECT_IMPORT':
              result = await importCSAFromShopify({
                maxItems: args.maxItems ? parseInt(args.maxItems) : null,
                dryRun: args.dryRun === 'true' || args.dryRun === true
              });
              break;

            case 'SHOPIFY_PAYMENTS_BALANCE':
              result = await getShopifyPaymentsBalance();
              break;

            case 'SHOPIFY_PAYOUTS':
              result = await getShopifyPayouts({
                limit: args.limit ? parseInt(args.limit) : 20,
                status: args.status || ''
              });
              break;

            case 'SHOPIFY_CAPITAL':
              result = await getShopifyCapital();
              break;

            case 'SHOPIFY_FINANCIAL_SUMMARY':
              result = await getShopifyFinancialSummary();
              break;

            case 'SHOPIFY_CAPITAL_LOAN':
              result = await getCapitalLoanSummary();
              break;

            case 'PAYPAL_TEST':
              result = await testPayPalConnection();
              break;

            case 'PAYPAL_BALANCE':
              result = await getPayPalBalance();
              break;

            case 'PAYPAL_TRANSACTIONS':
              result = await getPayPalTransactions({
                days: args.days ? parseInt(args.days) : 30
              });
              break;

            case 'PAYPAL_SUMMARY':
              result = await getPayPalFinancialSummary();
              break;

            // Shopify Discount Tools
            case 'SHOPIFY_LIST_DISCOUNTS':
              result = await listDiscountCodes();
              break;

            case 'SHOPIFY_GET_PRODUCTS':
              result = await getProducts();
              break;

            case 'SHOPIFY_CREATE_NEIGHBOR_DISCOUNTS':
              result = await createNeighborDiscounts({
                endsAt: args.endsAt || '2026-03-31T23:59:59-05:00',
                dryRun: args.dryRun === 'true' || args.dryRun === true
              });
              break;

            case 'SHOPIFY_DELETE_DISCOUNT':
              if (!args.priceRuleId) {
                result = { success: false, error: 'priceRuleId is required' };
              } else {
                result = await deletePriceRule(args.priceRuleId);
              }
              break;

            default:
              // Standard Apps Script API call
              result = await callAPI(toolConfig.action, args);
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            }
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: error.message }
          };
        }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown method: ${method}` }
        };
    }
  }

  start() {
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' }
        }));
      }
    });

    // Keep alive
    process.stdin.resume();
  }
}

// Start server
const server = new TinySeedMCPServer();
server.start();
