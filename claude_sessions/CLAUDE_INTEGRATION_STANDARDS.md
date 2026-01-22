# Claude Integration Standards for Tiny Seed OS

## CRITICAL: Read Before Making ANY Changes

This document establishes mandatory standards for all Claude sessions working on Tiny Seed OS. **Breaking these rules can break the live website.**

---

## 1. NO SAMPLE/DEMO DATA FALLBACKS

### The Problem
When API calls fail, some code falls back to "sample data" or "demo mode". This masks real problems and makes it impossible to diagnose issues.

### The Rule
**NEVER** add catch blocks that fall back to fake/sample data. Instead:

```javascript
// BAD - DO NOT DO THIS
try {
    const result = await api.get('getProducts');
    renderProducts(result.products);
} catch (error) {
    // Demo mode fallback - THIS IS WRONG
    renderProducts(sampleProducts);
}

// GOOD - DO THIS INSTEAD
try {
    const result = await api.get('getProducts');
    if (result.success) {
        renderProducts(result.products);
    } else {
        showError('Failed to load products: ' + result.error);
    }
} catch (error) {
    console.error('API Error:', error);
    showError('Could not connect to server. Please try again.');
}
```

### Before Editing Any File
1. Search for `Demo mode`, `sample`, `fallback` patterns
2. If you find them, FIX THEM - don't add more

---

## 2. USE THE SHARED API CONFIGURATION

### The Rule
All API calls MUST use `api-config.js`. **Never hardcode API URLs.**

```javascript
// Include in your HTML
<script src="api-config.js"></script>

// Use the API classes
const api = new TinySeedAPI();
const salesApi = new SalesAPI();
const customerApi = new CustomerPortalAPI('Wholesale');
```

### Available API Classes
- `TinySeedAPI` - Base class with get/post methods
- `SalesAPI` - Sales, orders, customers, fleet
- `CustomerPortalAPI` - Wholesale/CSA customer operations
- `DriverAPI` - Driver app operations
- `EmployeeAPI` - Employee app operations

---

## 3. TEST BEFORE DEPLOYING

### Before Every Deployment
1. **Check API connectivity** - Open browser console, verify API calls succeed
2. **Test on mobile** - The website must work on phones
3. **Test all affected features** - Not just what you changed

### Deployment Checklist
```bash
# 1. Test the API
curl "https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=testConnection"

# 2. Push to Apps Script (if backend changed)
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Description"

# 3. Push to GitHub (for frontend)
git add .
git commit -m "Description of changes"
git push origin main
```

---

## 4. RECONCILIATION BEFORE CHANGES

### Before Modifying ANY File
1. **Read the current file** - Understand what's there
2. **Check for patterns** - Are there anti-patterns to fix?
3. **Don't break existing functionality** - Test before and after

### Cross-File Dependencies
| File | Depends On | Used By |
|------|------------|---------|
| `api-config.js` | Nothing | ALL HTML files |
| `wholesale.html` | `api-config.js` | Chefs, Admins |
| `chef-order.html` | `api-config.js` | Chefs |
| `MERGED TOTAL.js` | Google Sheets | All frontends |

### When Adding New API Endpoints
1. Add handler to `MERGED TOTAL.js` (doGet or doPost)
2. Test endpoint directly with curl
3. Add to appropriate frontend
4. Update this documentation

---

## 5. ERROR HANDLING STANDARDS

### Always Show Real Errors
```javascript
// Show the user what went wrong
function showError(message) {
    const container = document.getElementById('content');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 48px;">⚠️</div>
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>`;
}
```

### Log Errors for Debugging
```javascript
catch (error) {
    console.error('Function name error:', error);
    // Then show user-friendly message
}
```

---

## 6. GOOGLE SHEETS DATA STRUCTURE

### Main Spreadsheet
ID: `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc`

### Key Sheets
| Sheet | Purpose |
|-------|---------|
| `REF_Crops` | Master crop/product list |
| `REF_Beds` | Field bed definitions |
| `REF_Fields` | Field definitions |
| `PLANNING_2026` | What's planted where |
| `HARVEST_LOG` | Harvest records |
| `WHOLESALE_CUSTOMERS` | Chef/wholesale customer data |
| `WHOLESALE_ORDERS` | Orders from chefs |
| `WHOLESALE_STANDING_ORDERS` | Recurring orders |

### Before Changing Sheet Structure
1. Document the change
2. Update all code that reads/writes to that sheet
3. Test that nothing breaks

---

## 7. COMMUNICATION PROTOCOL

### When You Complete Work
1. Update your OUTBOX.md with:
   - What you built
   - Files modified
   - How to test it
   - Any issues found

### When You Find Problems
1. Document in your OUTBOX.md
2. Create a ticket in the appropriate Claude's INBOX
3. Don't just fix and hope - communicate!

---

## 8. FORBIDDEN ACTIONS

### NEVER Do These Things
1. **Never** add demo/sample data fallbacks
2. **Never** hardcode API URLs (use api-config.js)
3. **Never** skip error handling
4. **Never** deploy without testing
5. **Never** modify sheets structure without updating all dependent code
6. **Never** assume - verify first

---

## 9. QUICK REFERENCE

### API URL (Single Source of Truth)
```
https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec
```

### Deployment ID
```
AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc
```

### GitHub Pages URL
```
https://toddismyname21.github.io/tiny-seed-os/web_app/
```

---

## 10. CHECKLIST FOR EVERY SESSION

Before starting work:
- [ ] Read this document
- [ ] Check INBOX for current tasks
- [ ] Understand what you're changing

Before deploying:
- [ ] Tested API calls work
- [ ] No demo/sample fallbacks added
- [ ] Error messages show real errors
- [ ] Works on mobile

After completing:
- [ ] Updated OUTBOX.md
- [ ] Git commit with clear message
- [ ] Verified live site still works

---

*Last Updated: 2026-01-22*
*Maintained by: PM_Architect*
