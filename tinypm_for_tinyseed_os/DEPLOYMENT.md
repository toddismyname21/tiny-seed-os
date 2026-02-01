# TinyPM Deployment Guide

Deploy TinyPM to production in minutes. This guide covers multiple platforms so you can choose the fastest path.

## Quick Start (Choose One)

| Platform | Time to Deploy | Free Tier | Best For |
|----------|---------------|-----------|----------|
| **Railway** | 2 min | $5 credit | Fastest, easiest |
| **Render** | 5 min | Yes (sleeps) | Free hobby projects |
| **Fly.io** | 5 min | Yes | Edge deployment |
| **VPS** | 15 min | No | Full control |

---

## Option 1: Railway (Recommended - Fastest)

Railway auto-detects Python and deploys in ~2 minutes.

### One-Command Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy from tinypm directory
cd /path/to/tinypm
railway init
railway up
```

### Environment Variables

Set these in Railway Dashboard > Variables:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://YOUR-APP.railway.app/oauth/callback
PRODUCTION_DOMAIN=https://YOUR-APP.railway.app
```

### Custom Domain

```bash
railway domain
```

### Verify Deployment

```bash
curl https://YOUR-APP.railway.app/api/health
# Should return: {"status": "ok", "version": "1.0.0", ...}
```

---

## Option 2: Render (Free Tier Available)

Render's free tier sleeps after 15 min of inactivity but is truly free.

### Deploy with render.yaml

1. Push to GitHub
2. Go to [render.com/new](https://render.com/new)
3. Select "Blueprint" and point to your repo
4. Render reads `render.yaml` automatically

### Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" > "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python web_server.py --port $PORT`
   - **Health Check Path**: `/api/health`

### Environment Variables

Add in Render Dashboard > Environment:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
GOOGLE_REDIRECT_URI=https://YOUR-APP.onrender.com/oauth/callback
PRODUCTION_DOMAIN=https://YOUR-APP.onrender.com
```

---

## Option 3: Fly.io (Edge Deployment)

Fly.io runs your app at the edge, closest to users.

### Deploy

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (from tinypm directory)
fly launch

# Deploy
fly deploy
```

### Set Secrets

```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set SUPABASE_URL=https://xxx.supabase.co
fly secrets set SUPABASE_ANON_KEY=eyJ...
fly secrets set GOOGLE_CLIENT_ID=xxx
fly secrets set GOOGLE_CLIENT_SECRET=xxx
```

---

## Option 4: Heroku

### Deploy

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create tinypm-yourname

# Deploy
git push heroku main

# Set config
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set SUPABASE_URL=https://xxx.supabase.co
```

---

## Option 5: Manual VPS (Ubuntu/Debian)

For full control on DigitalOcean, Linode, AWS EC2, etc.

### Setup

```bash
# SSH to your server
ssh root@your-server-ip

# Install Python 3.11
apt update && apt install -y python3.11 python3.11-venv python3-pip

# Clone repo
git clone https://github.com/YOUR/tinypm.git
cd tinypm

# Create venv
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env
nano .env  # Fill in your values
```

### Run with systemd

Create `/etc/systemd/system/tinypm.service`:

```ini
[Unit]
Description=TinyPM Web Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tinypm
Environment=PATH=/opt/tinypm/venv/bin
Environment=PORT=8000
ExecStart=/opt/tinypm/venv/bin/python web_server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable tinypm
sudo systemctl start tinypm

# Check status
sudo systemctl status tinypm
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name tinypm.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tinypm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL with Certbot
sudo certbot --nginx -d tinypm.yourdomain.com
```

---

## Post-Deployment Configuration

### 1. Update Google OAuth Redirect URIs

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Select your OAuth 2.0 Client
2. Add to "Authorized redirect URIs":
   - `https://YOUR-PRODUCTION-DOMAIN/oauth/callback`

### 2. Update Supabase Allowed Origins

Go to Supabase Dashboard > Settings > API:

1. Add your production domain to "Additional redirect URLs"
2. Example: `https://tinypm.railway.app`

### 3. Verify Health Endpoint

```bash
curl https://YOUR-PRODUCTION-DOMAIN/api/health
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

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port to listen on (set by platform) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `SUPABASE_SERVICE_KEY` | No | Supabase service key (server-side) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth callback URL |
| `PRODUCTION_DOMAIN` | No | Your production URL |
| `TINYPM_AUTONOMY_LEVEL` | No | Default: 2 (1-5 scale) |
| `TINYPM_DEBUG` | No | Enable debug logging |
| `A2A_API_KEYS` | No | A2A authentication keys |

---

## Troubleshooting

### App crashes on startup

Check logs:
- Railway: `railway logs`
- Render: Dashboard > Logs
- Fly.io: `fly logs`

Common issues:
- Missing environment variables
- Python version mismatch (needs 3.11+)
- Missing dependencies

### Health check fails

Ensure `/api/health` returns 200:
```bash
curl -v https://YOUR-DOMAIN/api/health
```

### OAuth redirect fails

1. Check GOOGLE_REDIRECT_URI matches exactly
2. Verify domain is in Google Cloud Console
3. Check for trailing slashes

### Database connection fails

1. Verify SUPABASE_URL format: `https://xxx.supabase.co`
2. Check SUPABASE_ANON_KEY is correct
3. Verify Supabase project is active

---

## Monitoring

### Health Check URLs

- **Main health**: `/api/health`
- **A2A health**: `/a2a/health`

### Recommended Monitoring

- [UptimeRobot](https://uptimerobot.com) - Free monitoring
- [Better Uptime](https://betteruptime.com) - Status pages

---

## Scaling

### Railway
```bash
railway scale web=2
```

### Render
Upgrade to paid plan for scaling options.

### Fly.io
```bash
fly scale count 2
```

---

## Security Checklist

- [ ] All API keys are in environment variables, not code
- [ ] PRODUCTION_DOMAIN is set correctly
- [ ] A2A_API_KEYS is set if using A2A endpoints
- [ ] HTTPS is enabled (automatic on Railway/Render)
- [ ] OAuth redirect URIs are limited to your domains
- [ ] Supabase RLS policies are configured

---

## Support

- GitHub Issues: [your-repo/issues](https://github.com/your/tinypm/issues)
- Docs: [your-docs-url](https://docs.example.com)

---

Last updated: 2026-01-30
