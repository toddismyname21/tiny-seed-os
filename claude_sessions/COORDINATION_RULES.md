# CLAUDE COORDINATION RULES

**CRITICAL: READ BEFORE MAKING ANY CHANGES**

## The Problem
Multiple Claude sessions working on the same codebase have been:
- Deleting code other Claudes depend on
- Using inconsistent API URLs
- Not checking what exists before creating new things
- Wasting owner's time and money on redundant work

## MANDATORY RULES

### 1. BEFORE MODIFYING ANY FILE
- Read the file first
- Check OUTBOX.md files in `/claude_sessions/` to see what other Claudes built
- If unsure, ASK the owner before changing

### 2. API URLs - USE THE CANONICAL DEPLOYMENT
**Current Production API:**
```
https://script.google.com/macros/s/AKfycbzvrDVCBUIKO6v-3PDqRX87B94uMYULzuBO6e-G8wMPZBj-egyR2ftgAGrEPU8Z5ZJY/exec
```

**DO NOT** create new deployments unless absolutely necessary.
**DO NOT** use old deployment URLs you find in code - they may be stale.

### 3. WHEN YOU FINISH WORK
Update your OUTBOX.md with:
- What you built
- What files you modified
- What API endpoints you added
- Any dependencies other Claudes need to know about

### 4. BEFORE DELETING ANYTHING
- Search for references to it across the codebase
- Check if other Claudes documented using it
- If in doubt, COMMENT OUT instead of delete

### 5. TEST BEFORE DECLARING DONE
- Actually test the URL/feature works
- Don't just assume - verify

## Current Active Deployments

| Purpose | URL |
|---------|-----|
| Main API | `AKfycbzvrDVCBUIKO6v-3PDqRX87B94uMYULzuBO6e-G8wMPZBj-egyR2ftgAGrEPU8Z5ZJY` |
| Delivery Page | Same URL + `?page=delivery` |
| CSA Portal | `https://toddismyname21.github.io/tiny-seed-os/web_app/csa.html` |

## Files That MUST NOT BE MODIFIED Without Checking
- `MERGED TOTAL.js` - Core backend, all Claudes depend on this
- `api-config.js` - Frontend API configuration
- Any file in `apps_script/` folder

---

## CSA SYSTEM ARCHITECTURE (Added 2026-01-18)

### System Overview
```
SHOPIFY PURCHASE
       |
       v
[Webhook: orders/create]
       |
       v
MERGED TOTAL.js
  - handleShopifyWebhook()
  - importShopifyCSAMembers()
  - parseShopifyShareType()
       |
       +---> SALES_Customers sheet
       +---> CSA_Members sheet
       +---> sendCSAWelcomeEmail()
              |
              v
         MAGIC LINK
              |
              v
         CSA PORTAL (csa.html)
              |
              +---> verifyCSAMagicLink()
              +---> getCSAMember()
              +---> getBoxContents()
              +---> customizeBox()
              +---> scheduleVacationHold()
```

### CSA-Related Sheets
| Sheet | Purpose | Owner |
|-------|---------|-------|
| `SALES_Customers` | Customer master data | Sales/CRM |
| `CSA_Members` | CSA membership records | Sales/CRM |
| `CSA_Products` | CSA share definitions | Sales/CRM |
| `CSA_Pickup_Locations` | Pickup location details | Sales/CRM |
| `Magic_Links` | Auth tokens (temp) | Backend |
| `Master_Order_Log` | Weekly CSA orders | Backend |

### CSA API Endpoints (MERGED TOTAL.js)

**GET Endpoints:**
```
?action=getCSAMembers
?action=getCSABoxContents&memberId=X&weekDate=Y
?action=getCSAPortalSession&token=X&email=Y
?action=getCSAMetrics
```

**POST Endpoints:**
```
{ action: 'importShopifyCSA', csvData: '...' }
{ action: 'sendCSAMagicLink', email: '...' }
{ action: 'verifyCSAMagicLink', token: '...', email: '...' }
{ action: 'customizeCSABox', memberId: '...', swaps: [...] }
{ action: 'scheduleVacationHold', memberId: '...', weekDate: '...' }
{ action: 'shopifyWebhook', topic: '...', payload: {...} }
```

### Shopify Credentials (DO NOT CHANGE)
```
SHOPIFY_DOMAIN = 'tiny-seed-farmers-market.myshopify.com'
SHOPIFY_ACCESS_TOKEN = '[REDACTED - See SOCIAL_CREDENTIALS.md]'
```

### Share Type Codes (Owner's System)
```
Veg Codes:    0 = No veg, 1 = Small/Regular, 2 = Large/Family
Floral Codes: 0 = No flowers, 1 = Petite Bloom, 2 = Full Bloom
```

### Claude Responsibilities

| Claude | CSA Responsibilities |
|--------|---------------------|
| Backend | Webhook handler, magic links, email system, Shopify sync |
| Sales/CRM | Member data, weekly order generation, metrics |
| UX/Frontend | CSA portal UI, onboarding flow, customization |

### Inter-Claude Dependencies
- UX needs Backend's magic link endpoints before portal works
- Sales/CRM needs Backend's webhook to fire before member data exists
- Backend needs Sales/CRM's sheet structure to write data correctly

---

*Created after coordination failures caused wasted work. ALL CLAUDES MUST FOLLOW THESE RULES.*
