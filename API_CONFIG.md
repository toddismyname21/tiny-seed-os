# TINY SEED OS - API CONFIGURATION

## CURRENT API URL (Single Source of Truth)

```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
```

**Last Updated:** 2026-01-15

---

## FOR ALL CLAUDE SESSIONS

When the API URL changes:
1. Update `web_app/api-config.js` (the MAIN_API value)
2. Update this file
3. Run the bulk update script below to fix any hardcoded URLs

---

## FOR HTML FILES

**DO NOT hardcode API URLs in HTML files.**

Instead, include the shared config:
```html
<script src="web_app/api-config.js"></script>
```

Then use:
```javascript
const API_URL = TINY_SEED_API.MAIN_API;
```

---

## GOOGLE SHEETS IDS

| Sheet | ID | Purpose |
|-------|-----|---------|
| Main Production | `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc` | Planning, crops, tasks |
| Sales | `1S7FNi11NItqeaWol_e6TUehQ9JwFFf0pgPj6G0DlYf4` | Orders, customers, routes |

---

## CHANGELOG

| Date | Old URL | New URL | Updated By |
|------|---------|---------|------------|
| 2026-01-15 | Various | AKfycbx8syGK5... | Architecture Claude |
