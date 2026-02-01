# TinyPM Production Deployment Checklist

Complete, step-by-step guide to deploying TinyPM on Railway.

---

## Pre-Deployment Requirements

Before starting, ensure you have:

- [ ] GitHub account with this repository pushed
- [ ] Railway account (railway.app - free tier works)
- [ ] Supabase account with project created
- [ ] Google Cloud Console project with OAuth configured
- [ ] Anthropic API key

---

## Step 1: Push to GitHub

```bash
# Ensure all changes are committed
cd /path/to/tinypm
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `tinypm` directory as the root (if monorepo)

Railway will automatically detect:
- `railway.json` for configuration
- `requirements.txt` for Python dependencies
- Nixpacks for building

---

## Step 3: Add Environment Variables

In Railway dashboard, go to your service > Variables tab.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public key | `eyJhbG...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-...` |

### After Getting Your Domain

Once Railway assigns your domain (or you add a custom one):

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION_DOMAIN` | Your Railway URL | `https://tinypm-xxx.up.railway.app` |
| `GOOGLE_REDIRECT_URI` | OAuth callback | `https://tinypm-xxx.up.railway.app/oauth/callback` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TINYPM_AUTONOMY_LEVEL` | AI autonomy (1-5) | `2` |
| `TINYPM_DEBUG` | Enable debug logs | `false` |
| `A2A_API_KEYS` | A2A auth keys | (empty = public) |
| `A2A_RATE_LIMIT` | Requests/min | `100` |
| `CORS_ALLOWED_ORIGINS` | CORS origins | Uses PRODUCTION_DOMAIN |

---

## Step 4: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services > Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   ```
   https://your-railway-domain.up.railway.app/oauth/callback
   ```
5. Click Save

**Important**: The redirect URI must EXACTLY match what's in `GOOGLE_REDIRECT_URI`

---

## Step 5: Update Supabase Allowed Origins

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: Settings > API
4. Under "Additional Redirect URLs" or CORS settings, add:
   ```
   https://your-railway-domain.up.railway.app
   ```

### Supabase Tables Required

Ensure these tables exist in your Supabase database:

```sql
-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    role TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory table
CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens (TinyPM specific)
CREATE TABLE IF NOT EXISTS tinypm_oauth_tokens (
    id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    scope TEXT,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    messages JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoints (for LangGraph)
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Step 6: Deploy and Get Domain

1. Railway will auto-deploy when you push
2. Wait for deployment to complete (check Deployments tab)
3. Click "Settings" > "Networking" > "Generate Domain"
4. Copy your `*.up.railway.app` URL
5. Go back and update:
   - `PRODUCTION_DOMAIN` environment variable
   - `GOOGLE_REDIRECT_URI` environment variable
6. Trigger a redeploy (or push a small change)

---

## Step 7: Verify Health Endpoint

```bash
# Replace with your actual domain
curl https://your-railway-domain.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "service": "tinypm",
  "timestamp": "2026-01-30T12:00:00.000000"
}
```

---

## Step 8: Test Full OAuth Flow

1. Visit: `https://your-domain/oauth/google`
2. You should be redirected to Google consent screen
3. Approve calendar and email access
4. You should be redirected back with success message
5. Calendar and email features should now work

---

## Step 9: Test Dashboard

1. Visit: `https://your-domain/`
2. Dashboard should load
3. Try sending a message to the PM
4. Verify response comes back

---

## Monitoring & Maintenance

### Railway Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Health Check URL

Add to your monitoring system (UptimeRobot, Better Uptime, etc.):
```
https://your-domain/api/health
```

Expected: HTTP 200 with JSON body containing `"status": "ok"`

### Manual Redeploy

In Railway dashboard: Deployments > three-dot menu > Redeploy

Or push any change to trigger auto-deploy.

---

## Troubleshooting

### Deployment Fails

1. Check Railway build logs
2. Verify `requirements.txt` has no typos
3. Ensure Python version compatibility (3.11)

### OAuth Not Working

1. Verify redirect URI EXACTLY matches in Google Console
2. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. Ensure `PRODUCTION_DOMAIN` has `https://` prefix

### Supabase Connection Fails

1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_ANON_KEY` has correct value
3. Ensure tables exist in database
4. Check CORS/allowed origins in Supabase

### Health Check Fails

1. Check if application actually started (logs)
2. Verify PORT is being read correctly
3. Look for startup errors in logs

### Memory/Performance Issues

Railway free tier has 512MB RAM. If issues:
1. Upgrade to paid tier
2. Or reduce concurrent operations
3. Check for memory leaks in logs

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Dashboard | `https://your-domain/` |
| Health Check | `https://your-domain/api/health` |
| OAuth Start | `https://your-domain/oauth/google` |
| OAuth Callback | `https://your-domain/oauth/callback` |
| Agent Card | `https://your-domain/.well-known/agent.json` |

---

## Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] Dashboard loads without errors
- [ ] PM chat works (messages send/receive)
- [ ] OAuth flow completes successfully
- [ ] Calendar integration works
- [ ] Email integration works
- [ ] Tasks sync to Supabase
- [ ] Monitoring/alerting configured

---

## Security Hardening

After deployment is working:

1. **Enable A2A Authentication**
   ```bash
   # Generate API key
   python3 a2a_auth.py generate
   # Add to Railway: A2A_API_KEYS=your-generated-key
   ```

2. **Review CORS Settings**
   - Set `CORS_ALLOWED_ORIGINS` to only your domains

3. **Rotate API Keys**
   - Periodically rotate `ANTHROPIC_API_KEY`
   - Rotate `A2A_API_KEYS`

4. **Enable Logging**
   - Monitor Railway logs for suspicious activity
   - Set up alerts for error spikes

---

*Last updated: 2026-01-30*
