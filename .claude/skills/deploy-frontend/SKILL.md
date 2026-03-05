---
name: deploy-frontend
description: Deploy frontend to GitHub Pages via git push, then auto-validate the deploy
---

# Deploy Frontend

Push changes to GitHub Pages and automatically validate the deployment.

## Steps

### Deploy
1. Stage changed files: `git add <specific-files>` (NEVER use `git add -A`)
2. Commit with descriptive message
3. Push: `git push origin main`
4. Wait 60 seconds for GitHub Pages to update

### Post-Deploy Validation (automatic)

5. **HTTP 200 check** — curl each changed HTML page on the live site:
   ```bash
   curl -sL -o /dev/null -w "%{http_code}" https://app.tinyseedfarm.com/[page]
   ```
   Use the full file path including `web_app/` prefix (e.g., `https://app.tinyseedfarm.com/web_app/sales.html`).

6. **Element reference validation** — run on each changed HTML file:
   ```bash
   ./scripts/validate-element-refs.sh [file]
   ```

7. **API URL validation** — ensure no hardcoded API URLs:
   ```bash
   ./scripts/validate-api-urls.sh
   ```

8. **UX preflight** — run on each changed HTML file:
   ```bash
   ./scripts/ux-preflight-audit.sh [file]
   ```

### Report

9. Report results as either:
   - **Deploy VERIFIED** — all checks passed, list pages verified
   - **Deploy WARNING** — some non-blocking issues found, list them
   - **Deploy FAILED** — blocking issues found, list them with details

10. Update CHANGE_LOG.md
