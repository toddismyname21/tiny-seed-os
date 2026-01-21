# MCP SERVER ACCESS - ALL CLAUDE SESSIONS

**Created:** 2026-01-21
**Status:** ACTIVE - Use this for direct farm operations

---

## WHAT IS THIS?

The Tiny Seed MCP Server gives all Claude sessions direct access to:
- Send emails
- Run Apps Script functions
- Read/write farm data
- Manage CSA members
- Check system status

**No more asking the user to run functions manually.**

---

## AVAILABLE TOOLS

### Email Tools
| Tool | Description |
|------|-------------|
| `send_season_announcement` | Send the 2026 Season email to Todd |
| `send_email` | Send a custom email (to, subject, body) |

### CSA Member Tools
| Tool | Description |
|------|-------------|
| `get_csa_dashboard` | Retention dashboard with health scores |
| `get_at_risk_members` | Members at risk of churning |
| `get_member_health` | Health score for specific member |
| `recalculate_health_scores` | Bulk recalculate all health scores |
| `get_churn_alerts` | Priority-sorted churn alerts |

### Farm Operations
| Tool | Description |
|------|-------------|
| `get_planning_data` | Crop planning data |
| `get_greenhouse_tasks` | Current greenhouse tasks |
| `get_harvest_predictions` | AI harvest predictions |
| `get_weather` | Weather forecast |

### Sales & Customers
| Tool | Description |
|------|-------------|
| `get_sales_dashboard` | Sales overview |
| `get_customers` | Customer list |

### System
| Tool | Description |
|------|-------------|
| `health_check` | API status check |
| `get_system_status` | Full system status |

---

## HOW TO USE (For Claude Sessions)

If MCP is configured, you can call these tools directly. Example:

```
Use the send_season_announcement tool to send the email.
```

If MCP is not available, fall back to the HTTP API:

```bash
curl -sL "https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec?action=sendSeasonAnnouncement"
```

---

## API ENDPOINT REFERENCE

### PRIMARY API (v229 - Latest Features)
Use this for CSA Portal, Magic Links, and newer features:
```
https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec
```

### LEGACY API (v223 - Stable)
Use this for basic operations:
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
```

### CSA Portal Endpoints (v229+ only)
| Action | Parameters |
|--------|------------|
| `?action=sendCSAMagicLink` | `email` - Send login link to CSA member |
| `?action=verifyCSAMagicLink` | `email`, `token` - Validate login token |
| `?action=getCSABoxContents` | `weekDate`, `shareType` (optional) |
| `?action=getCSAPickupHistory` | `customerId` |

### POST Endpoints (v229+ only)
| Action | Body |
|--------|------|
| `updateCSAMemberPreferences` | `{ memberId, preferences: {...} }` |

### General GET Endpoints
| Action | Parameters |
|--------|------------|
| `?action=sendSeasonAnnouncement` | None |
| `?action=getCSARetentionDashboard` | None |
| `?action=getAtRiskCSAMembers` | `threshold` (optional) |
| `?action=getCSAMemberHealth` | `memberId` |
| `?action=getCSAChurnAlerts` | None |
| `?action=recalculateAllMemberHealth` | None |
| `?action=healthCheck` | None |
| `?action=getSystemStatus` | None |

---

## OWNER'S MANDATE

> "I WANT TO TRUST YOU ALL AND GIVE YOU MORE AND MORE ACCESS AND AUTONOMY"

The owner wants Claudes to:
1. Take action when appropriate
2. Not wait for permission on routine tasks
3. Send emails, run reports, update data
4. Be proactive about farm operations

**Use good judgment. When in doubt, ask. But don't be afraid to act.**

---

## ADDING NEW FUNCTIONS

To add a new function that Claude can call:

1. Add the function to `MERGED TOTAL.js`
2. Add a case in the `doGet` switch statement
3. Add to the approved list in the `runFunction` endpoint
4. Update this documentation
5. Push with `clasp push`
6. Deploy with `clasp deploy -i DEPLOYMENT_ID -d "description"`

---

## DEPLOYMENT NOTES (2026-01-21)

### Version Limit Reached
Apps Script has a 200 version limit. We're at 229 versions.
**Action Required:** Delete old versions via Apps Script UI before creating new deployments.

### Pending Code (Pushed but not deployed)
The following functions have been pushed via `clasp push` but cannot be deployed until old versions are deleted:

| Function | Purpose |
|----------|---------|
| `populateSampleBoxContents` | Create sample CSA box data for portal testing |
| `getBoxContentsPreview` | Preview all share type box contents |
| Fix for `getCSAMembers` | Was calling non-existent secured function |

### How to Delete Old Versions
1. Go to Apps Script IDE: https://script.google.com
2. Open the Tiny Seed OS project
3. Click on "Deploy" > "Manage deployments"
4. Delete unused deployments
5. Or go to File > Project history and delete old versions

---

*This file should be read by all Claude sessions working on Tiny Seed Farm.*
