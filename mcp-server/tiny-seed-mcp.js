#!/usr/bin/env node

/**
 * TINY SEED FARM MCP SERVER
 *
 * This Model Context Protocol server gives Claude direct access to:
 * - Google Apps Script functions
 * - Google Sheets data
 * - Email sending
 * - Farm operations
 *
 * Setup: npm install && node tiny-seed-mcp.js
 */

const https = require('https');
const readline = require('readline');

// API Configuration
const API_BASE = 'https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec';

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
  // FINANCIAL
  // ═══════════════════════════════════════════════════════════════════════════
  financial_get_dashboard: {
    description: "Get financial dashboard with P&L summary",
    parameters: {},
    action: "getFinancialDashboard"
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
          const result = await callAPI(toolConfig.action, params.arguments || {});
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
