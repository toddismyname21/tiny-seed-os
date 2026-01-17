# GMAIL INBOX ORGANIZATION SYSTEM
## Tiny Seed Farm - Never Miss Important Emails Again

**Created:** 2026-01-16
**Problem:** Important emails buried under spam and garbage

---

## THE SYSTEM: Labels + Filters + Priority Inbox

### Step 1: Create These Labels in Gmail

Go to Gmail → Settings (gear) → See all settings → Labels → Create new label

**Create these labels:**

| Label | Color | Purpose |
|-------|-------|---------|
| `🔴 MONEY` | Red | Orders, payments, invoices |
| `🟠 CUSTOMERS` | Orange | Customer inquiries, complaints, requests |
| `🟡 WHOLESALE` | Yellow | Restaurant/wholesale accounts |
| `🟢 FARM-OPS` | Green | Suppliers, seeds, equipment |
| `🔵 GRANTS` | Blue | Grant applications, funding, USDA |
| `🟣 ADMIN` | Purple | Legal, insurance, certifications |
| `⚪ CSA` | Gray | CSA member communications |
| `📅 MARKETS` | Teal | Farmers market communications |

---

## Step 2: Set Up These Filters

Go to Gmail → Settings → Filters and Blocked Addresses → Create a new filter

### FILTER 1: Money/Orders (HIGHEST PRIORITY)
```
From: *@shopify.com OR *@square.com OR *@stripe.com OR *@paypal.com
OR
Subject: order OR payment OR invoice OR receipt OR paid
```
**Action:** Apply label `🔴 MONEY`, Star it, Never send to spam

### FILTER 2: Wholesale/Restaurants
```
From: (list your restaurant contact emails)
OR
Subject: wholesale OR restaurant OR chef OR kitchen
```
**Action:** Apply label `🟡 WHOLESALE`, Star it, Mark important

### FILTER 3: Customer Inquiries
```
Subject: CSA OR delivery OR order OR produce OR vegetables OR farm
(AND NOT from your known business emails)
```
**Action:** Apply label `🟠 CUSTOMERS`, Mark important

### FILTER 4: Grants & Funding
```
From: *@usda.gov OR *@nrcs.gov OR *@pa.gov OR *fsa* OR *eqip*
OR
Subject: grant OR funding OR application OR EQIP OR NRCS
```
**Action:** Apply label `🔵 GRANTS`, Star it, Never send to spam

### FILTER 5: Suppliers/Seeds
```
From: *@johnnyseeds.com OR *@highmowingseeds.com OR *@fedcoseeds.com
OR (add your suppliers)
OR
Subject: seed OR order confirmation OR shipping OR tracking
```
**Action:** Apply label `🟢 FARM-OPS`

### FILTER 6: CSA Members
```
From: (your CSA member list - or domain patterns)
OR
Subject: CSA OR share OR box OR pickup
```
**Action:** Apply label `⚪ CSA`

### FILTER 7: Markets
```
From: *farmers market* OR *@bloomfieldpgh.org OR (market contacts)
OR
Subject: market OR vendor OR booth
```
**Action:** Apply label `📅 MARKETS`

### FILTER 8: SPAM KILLERS (Auto-archive)
```
Subject: unsubscribe OR "click here" OR "limited time" OR "act now"
From: *@marketing* OR *@promo* OR *newsletter*
(that you don't recognize)
```
**Action:** Skip inbox, Apply label `_Bulk`, Mark as read

---

## Step 3: Enable Priority Inbox

1. Gmail → Settings → Inbox
2. Inbox type: **Priority Inbox**
3. Configure sections:
   - Section 1: Important and unread
   - Section 2: Starred
   - Section 3: Everything else

---

## Step 4: Daily Email Routine (5 minutes)

### Morning Check:
1. **🔴 MONEY** - Check first, respond to orders/payments
2. **🟠 CUSTOMERS** - Customer issues = priority
3. **🟡 WHOLESALE** - Restaurant orders
4. **Starred** - Anything flagged

### Quick Scan:
5. **🟢 FARM-OPS** - Supplier updates
6. **🔵 GRANTS** - Deadlines!
7. **⚪ CSA** - Member questions

### Weekly:
8. Review `_Bulk` for false positives
9. Unsubscribe from garbage

---

## Quick Filter Setup Script

Copy/paste these into Gmail filters one at a time:

### Filter: Orders & Money
```
Matches: from:(*@shopify.com OR *@square.com OR *@stripe.com) OR subject:(order OR payment OR invoice)
Do this: Apply label "🔴 MONEY", Star it, Never send to Spam
```

### Filter: Kill Newsletter Spam
```
Matches: subject:(unsubscribe) -from:(shopify OR stripe OR usda OR your-important-domains)
Do this: Skip Inbox, Apply label "_Bulk"
```

### Filter: Wholesale Priority
```
Matches: from:(restaurant1@email.com OR restaurant2@email.com) OR subject:(wholesale order)
Do this: Apply label "🟡 WHOLESALE", Star it, Mark as important
```

---

## ADVANCED: Gmail + Google Apps Script Automation

Want to go further? We can build an auto-sorter:

```javascript
// This would run hourly and auto-label based on content
function autoSortInbox() {
  // Search for unlabeled emails
  // Apply AI classification
  // Auto-label and prioritize
}
```

**If you want this built, let me know and I'll assign it to a Claude.**

---

## Specific Addresses to Whitelist (Never Spam)

Add these to your contacts or create "never spam" filters:

### Government/Grants:
- *@usda.gov
- *@nrcs.usda.gov
- *@fsa.usda.gov
- *@pa.gov
- *@state.pa.us

### Payment Processors:
- *@shopify.com
- *@stripe.com
- *@square.com
- *@paypal.com

### Certifiers:
- *@oeffa.org
- Any organic certifier emails

### Seed Companies:
- *@johnnyseeds.com
- *@highmowingseeds.com
- (add your suppliers)

---

## Emergency: Find Buried Important Email

### Search operators:
```
is:unread label:inbox after:2026/01/01 -category:promotions
```

### Find all orders:
```
subject:(order OR payment) after:2026/01/01
```

### Find grant emails:
```
from:(*@usda.gov OR *@pa.gov) OR subject:grant
```

### Find customer questions:
```
subject:(question OR help OR delivery OR CSA) -from:me
```

---

## Action Items for You (Do This Now)

1. **Create the 8 labels** (2 minutes)
2. **Set up the MONEY filter first** (most important)
3. **Set up the SPAM KILLER filter** (clear the garbage)
4. **Add your wholesale contacts to WHOLESALE filter**
5. **Enable Priority Inbox**

---

*This system will save you hours per week and ensure you never miss an order, customer complaint, or grant deadline.*
