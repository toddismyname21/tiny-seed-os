# TinyPM Brain Server Deployment Guide

## Option 1: Local Only (Current Setup)
The Brain server runs on your Mac and auto-starts on login.

**Start/Stop Commands:**
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm
./start_brain.sh daemon   # Start in background
./start_brain.sh stop     # Stop server
./start_brain.sh status   # Check status
```

**Auto-Start:** Already configured via LaunchAgent. Brain starts when you log in.

---

## Option 2: Deploy to Cloud (Access from Anywhere)

### Deploy to Render.com (Recommended - Free Tier)

1. **Create Render Account:** https://render.com

2. **Create New Web Service:**
   - Connect your GitHub repo
   - Select the `tinypm` folder
   - Set build command: `pip install -r requirements_brain.txt`
   - Set start command: `python brain_bridge.py --host 0.0.0.0 --port $PORT`

3. **Add Environment Variable:**
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key

4. **Deploy!** You'll get a URL like: `https://tinypm-brain.onrender.com`

5. **Update Frontend:**
   Add this BEFORE the brain-integration.js script in chief-of-staff.html:
   ```html
   <script>window.BRAIN_SERVER_URL = 'https://YOUR-APP.onrender.com';</script>
   ```

### Deploy to Railway.app

1. **Create Railway Account:** https://railway.app

2. **New Project → Deploy from GitHub**

3. **Add Variables:**
   - `ANTHROPIC_API_KEY` = your key
   - `PORT` = 8000

4. **Deploy!**

---

## Updating the Frontend for Cloud

Edit `web_app/chief-of-staff.html` and add before brain-integration.js:

```html
<!-- Brain Server URL (change for cloud deployment) -->
<script>
  // Uncomment and set your cloud URL:
  // window.BRAIN_SERVER_URL = 'https://tinypm-brain.onrender.com';
</script>
<script src="brain-integration.js"></script>
```

---

## Testing

```bash
# Test local
curl http://localhost:8000/api/health

# Test cloud (after deployment)
curl https://your-app.onrender.com/api/health
```

---

## Files Created

| File | Purpose |
|------|---------|
| `start_brain.sh` | Manual start/stop script |
| `Procfile` | Cloud deployment (Heroku/Railway) |
| `render.yaml` | Render.com deployment config |
| `requirements_brain.txt` | Minimal dependencies for cloud |
| `~/Library/LaunchAgents/com.tinyseed.brain.plist` | macOS auto-start |
