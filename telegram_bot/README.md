# Tiny Seed Farm - Telegram Bot for Claude Code Remote Control

Control Claude and manage your farm operations from anywhere via Telegram.

## Quick Setup (5 minutes)

### Step 1: Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat and send `/newbot`
3. Follow the prompts:
   - **Name**: `Tiny Seed Farm Bot` (or whatever you prefer)
   - **Username**: `TinySeedFarmBot` (must be unique and end in 'bot')
4. BotFather will give you a **token** like: `7123456789:AAHfiqksKZ8WmR2zMq8LwPSkAdwgp5sSBYc`
5. **Save this token** - you'll need it in Step 3

### Step 2: Get Your Chat ID

You need your personal Telegram Chat ID so the bot only responds to you.

**Option A - Use @userinfobot:**
1. Search for **@userinfobot** on Telegram
2. Start a chat with it
3. It will reply with your Chat ID (a number like `123456789`)

**Option B - Use @RawDataBot:**
1. Search for **@RawDataBot** on Telegram
2. Forward any message to it
3. Look for `"chat": {"id": 123456789}` in the response

**Option C - Run bot in debug mode:**
1. Complete Step 3 first without setting OWNER_CHAT_ID
2. Send a message to your bot
3. The bot will reply with your Chat ID

### Step 3: Configure the Bot

1. Navigate to the bot directory:
   ```bash
   cd /Users/samanthapollack/Documents/TIny_Seed_OS/telegram_bot
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your values:
   ```bash
   nano .env
   ```

   Fill in:
   ```
   TELEGRAM_BOT_TOKEN=7123456789:AAHfiqksKZ8WmR2zMq8LwPSkAdwgp5sSBYc
   OWNER_CHAT_ID=123456789
   ```

### Step 4: Install and Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the bot:
   ```bash
   npm start
   ```

   For verbose logging:
   ```bash
   npm run dev
   ```

3. The bot will send you a welcome message on Telegram!

## Usage

### Basic Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and quick start |
| `/help` | List all available commands |
| `/status` | Check Claude system status |
| `/tasks` | View pending farm tasks |
| `/weather` | Get weather update |
| `/harvest` | View harvest schedule |
| `/sales` | View sales summary |
| `/urgent [msg]` | Send urgent message to Claude |
| `/id` | Show your Telegram Chat ID |

### Claude Control Commands (NEW)

| Command | Description |
|---------|-------------|
| `/trigger [name]` | Wake a specific Claude session (writes to INBOX) |
| `/triggerall` | Wake ALL Claude sessions at once |
| `/claudes` | List all available Claude session names |
| `/pm [msg]` | Send message directly to Claude Code PM |
| `/checkpm` | Check for PM responses |

**Session Names:** backend, ux, field, financial, sales, inventory, grants, email, security, social, mobile, accounting, business, don

**Example:** `/trigger backend` - Wakes Backend Claude by writing to its INBOX

### Talking to Claude

Just type any message to communicate with Claude:

```
"What's the planting schedule for this week?"
"Add tomato harvest to tomorrow's tasks"
"Send me the weekly sales report"
```

## Running in Background

### Using PM2 (Recommended)

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start the bot:
   ```bash
   pm2 start bot.js --name "tiny-seed-bot"
   ```

3. Set to start on boot:
   ```bash
   pm2 startup
   pm2 save
   ```

4. Useful PM2 commands:
   ```bash
   pm2 logs tiny-seed-bot    # View logs
   pm2 restart tiny-seed-bot # Restart bot
   pm2 stop tiny-seed-bot    # Stop bot
   ```

### Using Screen

1. Start a screen session:
   ```bash
   screen -S telegram-bot
   ```

2. Run the bot:
   ```bash
   npm start
   ```

3. Detach: Press `Ctrl+A` then `D`

4. Reattach later:
   ```bash
   screen -r telegram-bot
   ```

### Using nohup

```bash
nohup node bot.js > bot.log 2>&1 &
```

## Security Notes

- **The bot only responds to the owner** (configured OWNER_CHAT_ID)
- Other users who message the bot will see their Chat ID but cannot interact
- Keep your `.env` file secure and never commit it to git
- The bot token should be kept secret

## Troubleshooting

### Bot doesn't start

1. Check your bot token is correct
2. Ensure Node.js v16+ is installed: `node --version`
3. Run with verbose logging: `npm run dev`

### Bot doesn't respond

1. Verify your OWNER_CHAT_ID is correct
2. Check the API URL is accessible
3. Look at the console logs for errors

### Messages not reaching Claude

1. Check the Google Apps Script API is deployed and accessible
2. Verify the API_URL in your .env file
3. Test the API directly in a browser

### "Unauthorized" message

Your Chat ID doesn't match OWNER_CHAT_ID. The bot will show you your correct Chat ID - update your .env file with it.

## API Integration

The bot communicates with Claude via the Google Apps Script API:

**Send Message:**
```
GET {API_URL}?action=sendClaudeMessage&message={text}&source=telegram
```

**Get Responses:**
```
GET {API_URL}?action=getClaudeResponses&source=telegram&since={timestamp}
```

## File Structure

```
telegram_bot/
├── bot.js           # Main bot script
├── package.json     # Dependencies
├── .env.example     # Example configuration
├── .env             # Your configuration (create this)
└── README.md        # This file
```

## Support

If you encounter issues:
1. Check the logs with `npm run dev`
2. Verify all configuration values
3. Test the API endpoints directly
4. Contact support with the error messages

---

Made for Tiny Seed Farm
