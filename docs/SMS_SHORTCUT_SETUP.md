# iOS Shortcut Setup for SMS Commitment Tracking

This guide will help you set up automatic text message forwarding to capture commitments and promises.

## API Endpoint

Your webhook URL:
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
```

---

## Option 1: Manual Share Shortcut (Recommended to Start)

This creates a Share Sheet action so you can manually forward important texts.

### Steps:

1. **Open Shortcuts app** on your iPhone

2. **Create New Shortcut** → tap the **+** button

3. **Add these actions in order:**

   **Action 1: Receive Input**
   - Search for "Receive" → Select "Receive input from Share Sheet"
   - Tap "Any" → Select only "Text"

   **Action 2: Get Contents of URL**
   - Search for "URL" → Select "Get Contents of URL"
   - URL: `https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec`
   - Method: **POST**
   - Request Body: **JSON**
   - Add these fields:
     - `action` = `receiveSMS` (Text)
     - `message` = `Shortcut Input` (Select Variable)
     - `direction` = `OUTBOUND` (Text) ← Your messages
     - `senderName` = `Todd` (Text) ← Your name

   **Action 3: Show Notification**
   - Search for "Show" → Select "Show Notification"
   - Title: "Text Logged"
   - Body: "Commitment tracked!"

4. **Name it:** "Log This Text"

5. **Enable Share Sheet:**
   - Tap the **ⓘ** info button at top
   - Enable "Show in Share Sheet"
   - Under "Share Sheet Types" select "Text"

### How to Use:
1. In Messages, **long-press** a message you sent
2. Tap **Share** → **Log This Text**
3. Done! The system will analyze it for commitments.

---

## Option 2: Auto-Forward from Specific Contacts

For automatic forwarding of all texts from key customers.

### Steps:

1. **Open Shortcuts app**

2. **Go to Automation tab** (bottom)

3. **Create Personal Automation**
   - Tap **+** → **Create Personal Automation**
   - Select **Message**
   - Choose "Message Contains" or select **Sender**
   - Add your key customer contacts
   - Choose "is Received" (for incoming texts)

4. **Add Actions:**

   **Action 1: Get Contents of URL**
   - URL: (same as above)
   - Method: **POST**
   - Request Body: **JSON**
   - Fields:
     - `action` = `receiveSMS`
     - `message` = `Shortcut Input` (message content)
     - `sender` = `Sender` (from message)
     - `senderName` = `Sender` (contact name)
     - `direction` = `INBOUND`
     - `timestamp` = `Current Date`

5. **Disable "Ask Before Running"**
   - This makes it fully automatic

6. **Save**

---

## Option 3: Log Your Own Promises (Outbound)

Create a quick shortcut to log promises you make.

### Steps:

1. **Create New Shortcut**

2. **Add Actions:**

   **Action 1: Ask for Input**
   - Question: "What did you promise?"
   - Input Type: Text

   **Action 2: Ask for Input**
   - Question: "Who did you promise?"
   - Input Type: Text

   **Action 3: Get Contents of URL**
   - URL: (same webhook)
   - Method: POST
   - JSON Body:
     - `action` = `receiveSMS`
     - `message` = `Provided Input` (first input)
     - `senderName` = `Provided Input` (second input)
     - `direction` = `OUTBOUND`

   **Action 4: Show Notification**
   - "Promise logged!"

3. **Add to Home Screen** for quick access

---

## What Gets Tracked

The system automatically detects:

| Type | Example Phrases |
|------|-----------------|
| **Promise to Deliver** | "I'll send", "I'll bring", "will drop off" |
| **Promise to Call** | "I'll call", "get back to you", "reach out" |
| **Promise to Do** | "I'll take care of", "I'll handle", "will definitely" |
| **Scheduling** | "let's meet", "how about", "are you free" |
| **Product Reserve** | "save you", "set aside", "hold for you" |
| **Follow-up Needed** | "let me check", "I'll find out" |

---

## Viewing Your Commitments

### In the Dashboard:
1. Go to **Admin Panel** → **System Status**
2. Or use the API: `?action=getSMSDashboard`

### Via MCP (Claude):
Claude can now access:
- `sms_get_dashboard` - See all SMS stats
- `sms_get_commitments` - List open commitments
- `sms_complete_commitment` - Mark done

---

## Testing

After setup, test by:

1. Send yourself a text: "I'll bring you tomatoes tomorrow"
2. Run the Share shortcut on that message
3. Check the Google Sheet `COS_SMS_Log` to confirm it logged
4. Check `COS_SMS_Commitments` for extracted commitment

---

## Troubleshooting

**Shortcut not working?**
- Make sure "Allow Untrusted Shortcuts" is enabled in Settings → Shortcuts
- Test the URL in browser first: add `?action=healthCheck` to verify API is up

**Not detecting commitments?**
- The system looks for specific phrases
- For edge cases, add context like "I promise to..."

**Need help?**
- Check the `COS_SMS_Log` sheet for error messages
- The `AI_Analysis` column shows what was detected
