---
name: POST routing for all API endpoints
description: When frontend calls syncToBackend(), the endpoint MUST be in the POST router whitelist — not just the GET router
type: feedback
---

When adding new frontend features that call backend endpoints via `syncToBackend()`, the endpoint must be registered in BOTH the POST router switch block AND the POST allowed-actions whitelist in MERGED TOTAL.js.

**Why:** Integration watcher caught that `addField` was only in the GET router (line ~15942) but soil-tests.html called it via POST through `syncToBackend()`. The call failed silently — field appeared in local memory but never persisted to Google Sheets.

**How to apply:** Every time a new or existing endpoint is called from frontend via `syncToBackend()` (POST):
1. Check the POST whitelist (~line 18144-18164)
2. Check the POST switch block (~line 18300+)
3. If the endpoint is only in the GET router, add it to BOTH POST locations
4. Always run integration-watcher after adding cross-system API calls
