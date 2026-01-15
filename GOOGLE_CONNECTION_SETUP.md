# Google Apps Script Connection Setup

## Quick Reference

### If Clasp Stops Working

**Reinstall clasp:**
```bash
export PATH="/opt/homebrew/bin:$PATH"
npm install -g @google/clasp
```

**Re-authenticate (if tokens expire):**
```bash
export PATH="/opt/homebrew/bin:$PATH"
clasp login --creds /Users/samanthapollack/Documents/TIny_Seed_OS/creds.json
```

---

## Key Files

| File | Purpose |
|------|---------|
| `creds.json` | OAuth client credentials (client_id, client_secret) |
| `~/.clasprc.json` | Authentication tokens (access_token, refresh_token) |
| `.clasp.json` | Project link to Apps Script (script ID) |
| `apps_script/` | Local copy of Apps Script code |

---

## Common Commands

```bash
# Always set PATH first in Claude Code
export PATH="/opt/homebrew/bin:$PATH"

# Pull latest code from Google
cd /Users/samanthapollack/Documents/TIny_Seed_OS
clasp pull

# Push local changes to Google
clasp push

# Open in browser
clasp open

# Deploy new version
clasp deploy

# View logs
clasp logs
```

---

## Project IDs

- **Apps Script Project:** `1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec`
- **Google Cloud Project:** `tinyseed-clasp`
- **Production Sheet:** `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc`
- **Sales Sheet:** `1S7FNi11NItqeaWol_e6TUehQ9JwFFf0pgPj6G0DlYf4`

---

## Troubleshooting

### "command not found: npm" or "command not found: node"
Run: `export PATH="/opt/homebrew/bin:$PATH"` before npm/clasp commands

### "Authorization required"
Run: `clasp login --creds /Users/samanthapollack/Documents/TIny_Seed_OS/creds.json`

### "Script doesn't have a parent, but is required to"
The script may need to be bound to a Google Sheet. Open in browser with `clasp open`.

---

*Last verified: January 15, 2026*
