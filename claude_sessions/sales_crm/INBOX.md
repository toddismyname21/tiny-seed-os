# INBOX: Sales_CRM Claude
## From: PM_Architect

**Updated:** 2026-01-22
**PRIORITY:** HIGH - Wholesale Portal Standing Orders

---

## NEW MISSION: WHOLESALE STANDING ORDERS SYSTEM

**Owner Directive:** Chefs need to sign up for standing orders and get automatic notifications when we can't fulfill them.

### Task 1: Standing Order Data Model

Add to Google Sheet or create new sheet `WHOLESALE_STANDING_ORDERS`:

```
| Standing_Order_ID | Customer_ID | Product_ID | Product_Name | Quantity | Unit | Frequency | Day_of_Week | Start_Date | End_Date | Status | Last_Fulfilled | Notes |
```

**Frequency options:** WEEKLY, BIWEEKLY, MONTHLY

### Task 2: Backend API Endpoints

Add to `MERGED TOTAL.js`:

```javascript
case 'createStandingOrder':
case 'getStandingOrders':       // by customer
case 'updateStandingOrder':
case 'cancelStandingOrder':
case 'getStandingOrdersDue':    // for fulfillment planning
case 'markStandingOrderFulfilled':
case 'markStandingOrderShorted': // triggers notification
```

### Task 3: Auto-Notification System

When we CAN'T fulfill a standing order:

1. **SMS notification** (via existing Twilio):
   - "Hi [Chef Name], we're unable to fulfill your standing order for [Product] this week due to [reason]. We apologize for the inconvenience. -Tiny Seed Farm"

2. **Email notification** (via GmailApp):
   - More detailed message with alternatives if available
   - Option to substitute or skip

3. **Shortage reasons** (dropdown):
   - Weather damage
   - Crop failure
   - Sold out
   - Season ended
   - Other

### Task 4: Wholesale Portal UI Updates

Update `web_app/wholesale.html` to add:

1. **"Standing Orders" tab** in nav
2. **Create standing order form:**
   - Select product
   - Quantity
   - Frequency (Weekly/Biweekly/Monthly)
   - Preferred delivery day
   - Start/End dates (or ongoing)

3. **Manage standing orders:**
   - View active standing orders
   - Pause/Resume
   - Edit quantity
   - Cancel

### Task 5: Fulfillment Dashboard Integration

Create view for farm staff showing:
- All standing orders due this week
- Total quantities needed by product
- Flag items at risk (low inventory)
- One-click "fulfilled" or "shorted" buttons

### Deliverables

1. `WHOLESALE_STANDING_ORDERS` sheet created with headers
2. API endpoints added and deployed
3. Notification functions (SMS + Email)
4. UI updates to wholesale.html
5. Document in OUTBOX.md

---

## URGENT TASK 2: Chef Invitation System

**DEADLINE: TODAY - Owner wants to invite chefs tonight**

### Create Chef Invite Flow

1. **Invitation API endpoint:**
```javascript
case 'inviteChef':
  // Params: email, company_name, contact_name, phone
  // Creates chef account in WHOLESALE_CUSTOMERS
  // Sends magic link via email AND SMS
  // Returns: { success, customerId, inviteUrl }
```

2. **Invitation Email Template:**
Create `/apps_script/emails/ChefInvitation.html`:
```html
Subject: You're Invited - Order Fresh from Tiny Seed Farm

Hi [Chef Name],

[Farm Owner] has invited you to order fresh, organic produce directly from Tiny Seed Farm.

🌱 See what's fresh this week
📱 Order from your phone in seconds
🚚 Reliable delivery to your kitchen

[BUTTON: Start Ordering →]

Or copy this link: [Magic Link URL]
```

3. **Invitation SMS:**
```
"Hi [Name]! You're invited to order fresh produce from Tiny Seed Farm. Start here: [short link] -Todd"
```

4. **Bulk Invite Function:**
```javascript
function inviteMultipleChefs(chefList) {
  // chefList: [{ email, name, company, phone }, ...]
  // Sends all invites
  // Returns summary
}
```

### Chef Data to Collect (minimum):
- Email (required - for login)
- Company/Restaurant Name
- Contact Name
- Phone (for SMS)
- Delivery Address

---

### Files to Modify

- `/apps_script/MERGED TOTAL.js` - API endpoints
- `/web_app/wholesale.html` - UI updates
- Create: `/apps_script/StandingOrdersModule.js` - Business logic

### Deployment

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Standing Orders for Wholesale"
```

Then commit to GitHub:
```bash
git add . && git commit -m "Add wholesale standing orders system" && git push
```

---

## PREVIOUS TASKS (Lower Priority)

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: PRODUCT FORMALIZATION & STANDARDIZATION

Owner needs products and availability formalized so they're consistent across ALL platforms (Shopify, QB, farmers markets, CSA).

#### Task 1: Product Master List

Create `/claude_sessions/sales_crm/PRODUCT_MASTER_LIST.md`:

**Research from existing data:**
- What products does Tiny Seed sell? (vegetables, flowers, bundles)
- What are standard market prices?
- What's seasonal availability?
- What units are used (bunch, pound, each, flat)?

**Build the master product list:**
```
| Product | Category | Unit | Price | Season | Shopify SKU | QB Item |
|---------|----------|------|-------|--------|-------------|---------|
| Tomatoes, Heirloom | Vegetables | lb | $4.00 | Jun-Oct | TOM-HEIR-LB | ... |
```

**Include:**
- All vegetable crops
- All flower varieties
- CSA shares (if applicable)
- Bundles/specialty items

#### Task 2: Availability Calendar

Create `/claude_sessions/sales_crm/AVAILABILITY_CALENDAR.md`:

**Map products to seasons:**
- What's available when?
- Early season (March-May)
- Peak season (June-August)
- Late season (September-November)
- Storage crops (year-round)

#### Task 3: Platform Sync Spec

Create `/claude_sessions/sales_crm/PLATFORM_SYNC_SPEC.md`:

**Design how products sync across platforms:**
- Shopify product structure
- QuickBooks item structure
- How to keep inventory in sync
- Price change propagation
- Availability updates

#### Deliverable: MORNING PRODUCT BRIEF

Create `/claude_sessions/sales_crm/MORNING_PRODUCT_BRIEF.md`:
- Product count summary
- Categories overview
- Recommended standardization changes
- Questions for owner about pricing/availability

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't find product data or hit permissions:

**Sales Channel Analysis**
- Research best practices for multi-channel farm sales
- Shopify vs Square vs other platforms
- How successful farms manage inventory across channels
- Recommendations for Tiny Seed

---

### CREDENTIALS STATUS

Still waiting for owner to provide:
- Shopify: Store name, API key, API secret, access token
- QuickBooks: Client ID, Client secret, Company ID

Integration code is ready. Note this in your OUTBOX.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Product list research complete
2. Master list drafted
3. Availability calendar done
4. Morning brief ready

**PM_Architect will check your OUTBOX.**

---

*Sales_CRM Claude - Standardize products for multi-channel consistency*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
