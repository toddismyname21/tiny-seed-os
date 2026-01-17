# Safe Automation Guide
## Enabling Claude Autonomy While Maintaining Security
## Date: 2026-01-17

---

## Owner Directive

> "Minimize restrictions so we can throw the safe stuff on autopilot."

This guide defines what can be safely automated and what requires human approval.

---

## 1. Safe to Automate (GREEN ZONE)

These operations can run fully autonomously with no human approval required.

### Read-Only Operations

| Operation | Example | Risk |
|-----------|---------|------|
| Fetch planning data | `getPlanningData` | NONE |
| Get inventory levels | `getInventoryProducts` | NONE |
| Read weather data | `getWeather` | NONE |
| Get task lists | `getTasks` | NONE |
| Read harvest logs | `getHarvests` | NONE |
| Get dashboard stats | `getDashboardStats` | NONE |
| View crop profiles | `getCropProfiles` | NONE |
| Check system health | `healthCheck` | NONE |

### Internal Data Processing

| Operation | Example | Risk |
|-----------|---------|------|
| Calculate statistics | Sum, average, trends | NONE |
| Generate reports | PDF/CSV creation | NONE |
| Format data | Date/currency formatting | NONE |
| Filter/sort data | Query operations | NONE |
| Aggregate data | Combine from multiple sheets | NONE |

### Notifications (Read-Only Recipients)

| Operation | Example | Risk |
|-----------|---------|------|
| Generate alert content | "Low stock alert" | NONE |
| Prepare notification | Format message | NONE |
| Queue for review | Add to pending queue | NONE |

### File Operations (Internal)

| Operation | Example | Risk |
|-----------|---------|------|
| Create temporary files | Working calculations | NONE |
| Read configuration | Load settings | NONE |
| Write to scratchpad | Session notes | NONE |
| Generate previews | Show before save | NONE |

---

## 2. Requires Confirmation (YELLOW ZONE)

These operations should show a preview and require user confirmation before executing.

### Data Modifications

| Operation | Confirmation Required | Why |
|-----------|----------------------|-----|
| Update planting | "Update Batch #123?" | Affects schedules |
| Add harvest | "Log 50 lbs tomatoes?" | Financial impact |
| Adjust inventory | "Remove 10 units?" | Stock tracking |
| Create task | "Create task for Team A?" | Assigns work |
| Modify schedule | "Move to Wednesday?" | Affects operations |

### Bulk Operations

| Operation | Confirmation Required | Why |
|-----------|----------------------|-----|
| Import CSV | "Import 500 rows?" | Data integrity |
| Batch update | "Update 50 records?" | Hard to undo |
| Archive records | "Archive 2024 data?" | Data access |

### External Communications (Non-Critical)

| Operation | Confirmation Required | Why |
|-----------|----------------------|-----|
| Send reminder | "Send reminder to CSA?" | Customer facing |
| Post to social | "Post harvest update?" | Public facing |
| Email report | "Send weekly report?" | External |

---

## 3. Requires Human Approval (RED ZONE)

These operations MUST have explicit human authorization. Claude should NEVER execute these autonomously.

### Financial Operations

| Operation | Approval Level | Why |
|-----------|---------------|-----|
| Create invoice | Manager+ | Financial commitment |
| Process payment | Admin | Money movement |
| Refund customer | Admin | Money out |
| Update pricing | Admin | Revenue impact |
| Connect bank (Plaid) | Admin | Financial access |
| Transfer funds | Admin | Money movement |

### User Management

| Operation | Approval Level | Why |
|-----------|---------------|-----|
| Create user | Admin | System access |
| Delete user | Admin | Irreversible |
| Change role | Admin | Permission escalation |
| Reset PIN | Admin | Security |

### Data Deletion

| Operation | Approval Level | Why |
|-----------|---------------|-----|
| Delete records | Manager+ | Irreversible |
| Clear history | Admin | Audit trail |
| Remove customer | Admin | Relationship |
| Purge old data | Admin | Compliance |

### External API Calls (Money/Legal)

| Operation | Approval Level | Why |
|-----------|---------------|-----|
| QuickBooks sync | Admin | Financial system |
| Shopify orders | Manager+ | E-commerce |
| Send SMS | Manager+ | Costs money |
| Third-party integrations | Admin | Data sharing |

### System Configuration

| Operation | Approval Level | Why |
|-----------|---------------|-----|
| Change settings | Admin | System behavior |
| Modify permissions | Admin | Security |
| Update API keys | Admin | Access |
| Deploy code | Admin | System stability |

---

## 4. Claude Autonomy Levels

### Level 1: Observer (Current Default)

- Can read all non-sensitive data
- Can analyze and report
- Can suggest actions
- Cannot modify anything

### Level 2: Assistant (Recommended)

- All Level 1 capabilities
- Can make GREEN ZONE changes
- Requires confirmation for YELLOW ZONE
- Cannot access RED ZONE

### Level 3: Operator (For Trusted Claudes)

- All Level 2 capabilities
- Can make YELLOW ZONE changes without confirmation
- Still requires approval for RED ZONE
- Full audit logging

### Level 4: Administrator (Never Recommended)

- Full access including RED ZONE
- NOT RECOMMENDED for automation
- Reserved for human administrators

---

## 5. Implementation for Claude Sessions

### Safe Operations Claudes Can Do Freely

```javascript
// GREEN ZONE - No approval needed
const SAFE_ACTIONS = [
    'getPlanningData',
    'getInventoryProducts',
    'getSeedInventory',
    'getWeather',
    'getTasks',
    'getHarvests',
    'getCropProfiles',
    'getDashboardStats',
    'getGreenhouseSeedings',
    'healthCheck',
    'testConnection'
];
```

### Operations Requiring Confirmation

```javascript
// YELLOW ZONE - Show preview, ask for confirmation
const CONFIRM_ACTIONS = [
    'updatePlanting',
    'addHarvest',
    'addTask',
    'adjustInventory',
    'createCropProfile',
    'updateCropProfile'
];
```

### Operations Requiring Human Approval

```javascript
// RED ZONE - Never automate
const RESTRICTED_ACTIONS = [
    'createUser',
    'updateUser',
    'deleteUser',
    'createInvoice',
    'sendSMS',
    'postToSocial',
    'createPlaidLinkToken',
    'exchangePlaidToken',
    'syncQuickBooks',
    'processPayment'
];
```

---

## 6. Audit Trail Requirements

### What to Log

| Event Type | Data to Capture |
|------------|-----------------|
| Data Read | Who, what, when |
| Data Write | Who, what, old value, new value, when |
| Failed Attempts | Who, what, why, when |
| Approvals | Who approved, what, when |
| Automated Actions | Which Claude, what, when |

### Log Format

```javascript
{
    timestamp: "2026-01-17T10:30:00Z",
    actor: "Security_Claude",
    action: "updatePlanting",
    target: "BATCH-2026-001",
    details: {
        old_value: { quantity: 100 },
        new_value: { quantity: 150 }
    },
    approval: "owner@farm.com",
    status: "success"
}
```

### Log Retention

- Security events: 2 years
- Financial events: 7 years
- Operational events: 1 year

---

## 7. Guardrails to Keep

Even with automation, maintain these safeguards:

### Always Enforce

1. **Authentication** - Every request must be authenticated
2. **Authorization** - Check role before action
3. **Audit logging** - Log every write operation
4. **Rate limiting** - Prevent runaway automation
5. **Validation** - Validate all inputs

### Never Remove

1. **Human approval for financials** - Money requires eyes
2. **Human approval for user management** - Security requires oversight
3. **Deletion confirmation** - Irreversible actions need thought
4. **External communication review** - Brand protection

---

## 8. Recommended Claude Permissions by Role

### Financial Claude

```javascript
{
    allowed: ['GREEN ZONE', 'read financial data'],
    confirm: ['generate reports'],
    denied: ['write financial data', 'process payments'],
    notes: 'Can analyze but not modify financials'
}
```

### Inventory Claude

```javascript
{
    allowed: ['GREEN ZONE', 'read inventory'],
    confirm: ['adjustInventory', 'addProduct'],
    denied: ['deleteProduct', 'bulkImport'],
    notes: 'Can suggest adjustments, needs confirmation'
}
```

### Field Operations Claude

```javascript
{
    allowed: ['GREEN ZONE', 'read planning', 'read tasks'],
    confirm: ['createTask', 'updateTask'],
    denied: ['deletePlanting', 'modifySchedule'],
    notes: 'Can create tasks with confirmation'
}
```

### Security Claude

```javascript
{
    allowed: ['GREEN ZONE', 'read audit logs', 'read permissions'],
    confirm: [],
    denied: ['modify users', 'modify permissions'],
    notes: 'Read-only security observer'
}
```

---

## 9. Implementation Checklist

### Phase 1: Enable Safe Automation

- [ ] Define GREEN ZONE actions in code
- [ ] Remove unnecessary confirmation prompts for safe reads
- [ ] Implement basic audit logging
- [ ] Test with observer Claude

### Phase 2: Add Confirmation Layer

- [ ] Build confirmation UI for YELLOW ZONE
- [ ] Implement preview functionality
- [ ] Add undo capability where possible
- [ ] Test with assistant Claude

### Phase 3: Lock Down RED ZONE

- [ ] Implement admin-only endpoints
- [ ] Add multi-factor for sensitive operations
- [ ] Set up alert system for unauthorized attempts
- [ ] Full audit trail

---

## 10. Summary

| Zone | Actions | Automation Level |
|------|---------|------------------|
| GREEN | Read-only, calculations, previews | Full automation |
| YELLOW | Data modifications, notifications | Confirm before execute |
| RED | Financials, users, deletions | Human approval required |

**The goal: Let Claudes work autonomously on safe operations while maintaining human oversight for high-impact decisions.**

---

*Guide prepared by Security Claude*
*2026-01-17*
