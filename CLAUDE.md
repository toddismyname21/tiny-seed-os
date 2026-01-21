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

### Just Completed
- CSA Portal is LIVE with sample box contents (35 items across 6 share types)
- Fixed date handling bugs in `getCSABoxContents`
- Deployed to **v240** (primary deployment)
- Cleaned up old deployments (now only 3 remain)
- Added Shopify webhook registration functions

### Primary API Endpoint
```
https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec
```

### Immediate Next Task
**Register Shopify Webhook** for CSA order automation.

The API token doesn't have `read_orders` scope, so manual registration is needed:
1. Go to: https://tiny-seed-farmers-market.myshopify.com/admin/settings/notifications
2. Scroll to Webhooks → Create webhook
3. Event: `Order creation`
4. Format: `JSON`
5. URL: `https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=shopifyWebhook&topic=orders/create`

### MCP Server
- Located at: `/mcp-server/tiny-seed-mcp.js`
- 40+ tools for Shopify, QuickBooks, Markets, CSA, Marketing, Food Safety
- Config is in `.claude/settings.json` - should auto-load on new sessions

### Key Files
- `apps_script/MERGED TOTAL.js` - Main backend (50,000+ lines)
- `web_app/csa.html` - CSA Customer Portal
- `claude_sessions/CSA_PORTAL_SETUP.md` - Full setup documentation
- `claude_sessions/MCP_SERVER_ACCESS.md` - API reference

### Working Endpoints
| Endpoint | Purpose |
|----------|---------|
| `getCSABoxContents` | Weekly box items by share type |
| `sendCSAMagicLink` | Send login email to CSA member |
| `verifyCSAMagicLink` | Validate login token |
| `getCSAMembers` | List CSA members |
| `registerCSAOrderWebhook` | Register Shopify webhook (needs API scope) |
| `fixBoxContentsData` | Reset/repopulate sample box data |

### Shopify Store
- Store: `tiny-seed-farmers-market.myshopify.com`
- Connection: Working (tested via `testShopifyConnection`)
- Limitation: Current API token lacks `read_orders` scope for webhook registration
