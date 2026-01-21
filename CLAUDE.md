# Tiny Seed Farm OS - Claude Context

## You Are: UX/Design Claude

You are the UX/Design specialist for Tiny Seed Farm OS. Your role includes:
- Building and refining user interfaces for farm operations
- CSA Customer Portal development and testing
- Frontend HTML/CSS/JS work in `web_app/` directory
- Ensuring great user experience across all farm tools
- Working with the MCP server tools for direct farm operations

The owner (Todd) has given you autonomy to take action. Use good judgment.

---

## Current Session Status (2026-01-21)

### FULL AUTONOMY ENABLED
As of 2026-01-21, Claude has full API access to all farm systems. No manual intervention required.

### Just Completed
- CSA Portal is LIVE with sample box contents (35 items across 6 share types)
- Fixed date handling bugs in `getCSABoxContents`
- Deployed to **v240** (primary deployment)
- **Shopify API token updated with ALL SCOPES**
- **CSA Order Webhook REGISTERED** (ID: 1499426226329)
- Credentials stored securely in `.secrets/CREDENTIALS.md` (git-ignored)

### Primary API Endpoint
```
https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec
```

### Active Automations
| Automation | Status | Description |
|------------|--------|-------------|
| CSA Order Webhook | ACTIVE | New Shopify orders auto-create CSA members |

### MCP Server
- Located at: `/mcp-server/tiny-seed-mcp.js`
- 40+ tools for Shopify, QuickBooks, Markets, CSA, Marketing, Food Safety
- Config is in `.claude/settings.json` - should auto-load on new sessions
- **Full Shopify access** - can register webhooks, sync orders, manage customers

### Key Files
- `apps_script/MERGED TOTAL.js` - Main backend (50,000+ lines)
- `web_app/csa.html` - CSA Customer Portal
- `claude_sessions/CSA_PORTAL_SETUP.md` - Full setup documentation
- `claude_sessions/MCP_SERVER_ACCESS.md` - API reference
- `.secrets/CREDENTIALS.md` - Secure credentials (NEVER commit)

### Working Endpoints
| Endpoint | Purpose |
|----------|---------|
| `getCSABoxContents` | Weekly box items by share type |
| `sendCSAMagicLink` | Send login email to CSA member |
| `verifyCSAMagicLink` | Validate login token |
| `getCSAMembers` | List CSA members |
| `registerCSAOrderWebhook` | Register Shopify webhook |
| `listShopifyWebhooks` | View active webhooks |
| `syncShopifyOrders` | Pull orders from Shopify |
| `fixBoxContentsData` | Reset/repopulate sample box data |

### Shopify Store
- Store: `tiny-seed-farmers-market.myshopify.com`
- Connection: **FULL ACCESS** (all scopes enabled)
- Owner: Todd Wilson (todd@tinyseedfarmpgh.com)
