# API Setup Tutorials: YouTube, Pinterest, TikTok

**For Tiny Seed Farm OS - Marketing Command Center**
**Created: 2026-01-30**

Work through these offline to connect your remaining social platforms.

---

# 1. YOUTUBE DATA API v3

## Overview
- **Purpose**: Upload videos, manage playlists, post content
- **API Version**: v3
- **Daily Quota**: 10,000 units (1 video upload = 1,600 units, so ~6 uploads/day max)
- **Cost**: FREE

## Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **New Project**
3. Name it: `Tiny Seed Farm YouTube`
4. Click **Create**
5. Wait for project to be created, then select it

### Step 2: Enable YouTube Data API v3

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for `YouTube Data API v3`
3. Click on it → Click **Enable**
4. Wait for it to enable

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. You may be prompted to configure the **OAuth consent screen** first:
   - Choose **External** (unless you have Google Workspace)
   - App name: `Tiny Seed Farm`
   - User support email: `todd@tinyseedfarmpgh.com`
   - Developer contact: `todd@tinyseedfarmpgh.com`
   - Click **Save and Continue** through the steps
   - Add scopes: `https://www.googleapis.com/auth/youtube.upload`
   - Add test users: Your Gmail address
   - Click **Save**

4. Now create the OAuth client:
   - Application type: **Web application**
   - Name: `Tiny Seed YouTube Client`
   - Authorized redirect URIs: Add your callback URL
     ```
     https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
     ```
   - Click **Create**

5. **SAVE YOUR CREDENTIALS:**
   - Client ID: `xxxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxxx`

### Step 4: Get Authorization Token

1. Build the authorization URL:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=https://www.googleapis.com/auth/youtube.upload&
  access_type=offline
```

2. Open this URL in your browser
3. Sign in with the Google account that owns your YouTube channel
4. Authorize the app
5. You'll get a `code` in the redirect - save it!

### Step 5: Exchange Code for Tokens

Make a POST request to get access token:
```
POST https://oauth2.googleapis.com/token

Body (form-urlencoded):
  code=YOUR_AUTH_CODE
  client_id=YOUR_CLIENT_ID
  client_secret=YOUR_CLIENT_SECRET
  redirect_uri=YOUR_REDIRECT_URI
  grant_type=authorization_code
```

You'll receive:
- `access_token` (expires in 1 hour)
- `refresh_token` (use to get new access tokens)

### Step 6: Upload a Video (Test)

```
POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json

Body:
{
  "snippet": {
    "title": "Test Video from Tiny Seed Farm",
    "description": "Testing YouTube API integration",
    "tags": ["farm", "Pittsburgh", "local food"],
    "categoryId": "22"
  },
  "status": {
    "privacyStatus": "private"
  }
}
```

### Important Notes

- **Unverified apps**: Videos will be private until you complete Google's audit
- **Quota**: 10,000 units/day, uploads cost 1,600 each
- **Verification**: Required to make videos public - takes 4-6 weeks

### Credentials to Store in Apps Script

```javascript
// Add to Script Properties:
YOUTUBE_CLIENT_ID = "your-client-id"
YOUTUBE_CLIENT_SECRET = "your-client-secret"
YOUTUBE_REFRESH_TOKEN = "your-refresh-token"
YOUTUBE_CHANNEL_ID = "your-channel-id"
```

### Resources
- [Official Upload Guide](https://developers.google.com/youtube/v3/guides/uploading_a_video)
- [Videos:insert Reference](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube API Overview](https://developers.google.com/youtube/v3)

---

# 2. PINTEREST API v5

## Overview
- **Purpose**: Create pins, manage boards, post images/videos
- **API Version**: v5
- **Token Validity**: Access token 30 days, Refresh token 365 days
- **Cost**: FREE

## Step-by-Step Setup

### Step 1: Create Pinterest Developer Account

1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Click **Get Started** or **Apps** in the top menu
3. Log in with your Pinterest business account
4. You'll land on the Apps Dashboard

### Step 2: Create an App

1. Click **+ Create app** (or "Connect app")
2. Fill in details:
   - App name: `Tiny Seed Farm OS`
   - Description: `Marketing automation for Tiny Seed Farm`
   - Website URL: `https://app.tinyseedfarm.com`
3. Click **Create**

### Step 3: Request API Access (Trial)

1. In your app settings, look for **Request trial access**
2. Fill out the form explaining your use case:
   ```
   We're building a marketing command center for Tiny Seed Farm
   to schedule and post organic Pins promoting our local farm
   products, flowers, and mushrooms to our audience.
   ```
3. Submit and wait for approval (usually 1-3 business days)

### Step 4: Get Your Credentials

Once approved:
1. Go to your app in the dashboard
2. Find and copy:
   - **App ID**: `xxxxxx`
   - **App Secret**: `xxxxxx`

### Step 5: Set Up OAuth

1. In your app settings, add **Redirect URI**:
   ```
   https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
   ```

2. Build authorization URL:
```
https://www.pinterest.com/oauth/?
  client_id=YOUR_APP_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=boards:read,boards:write,pins:read,pins:write&
  state=random_string
```

3. Open URL, authorize app, get the `code` from redirect

### Step 6: Exchange Code for Tokens

```
POST https://api.pinterest.com/v5/oauth/token

Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Basic base64(APP_ID:APP_SECRET)

Body:
  grant_type=authorization_code
  code=YOUR_AUTH_CODE
  redirect_uri=YOUR_REDIRECT_URI
```

Response:
```json
{
  "access_token": "pina_xxxxx",
  "token_type": "bearer",
  "expires_in": 2592000,
  "refresh_token": "pinr_xxxxx",
  "scope": "boards:read boards:write pins:read pins:write"
}
```

### Step 7: Get Your Board IDs

```
GET https://api.pinterest.com/v5/boards

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
```

Save your board IDs - you'll need them to create pins.

### Step 8: Create a Pin (Test)

```
POST https://api.pinterest.com/v5/pins

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json

Body:
{
  "board_id": "YOUR_BOARD_ID",
  "media_source": {
    "source_type": "image_url",
    "url": "https://example.com/your-image.jpg"
  },
  "title": "Fresh Vegetables from Tiny Seed Farm",
  "description": "Farm fresh produce from Pittsburgh's local farm",
  "link": "https://app.tinyseedfarm.com"
}
```

### Credentials to Store in Apps Script

```javascript
// Add to Script Properties:
PINTEREST_APP_ID = "your-app-id"
PINTEREST_APP_SECRET = "your-app-secret"
PINTEREST_ACCESS_TOKEN = "your-access-token"
PINTEREST_REFRESH_TOKEN = "your-refresh-token"
PINTEREST_BOARD_ID_FARM = "board-id-for-farm-content"
PINTEREST_BOARD_ID_FLOWERS = "board-id-for-flower-content"
```

### Resources
- [Pinterest API v5 Docs](https://developers.pinterest.com/docs/api/v5/)
- [Create Pin Endpoint](https://developers.pinterest.com/docs/api/v5/pins-create/)
- [API Quickstart (GitHub)](https://github.com/pinterest/api-quickstart)
- [Developer Portal](https://developers.pinterest.com/)

---

# 3. TIKTOK CONTENT POSTING API

## Overview
- **Purpose**: Upload videos and photos directly to TikTok
- **Supports**: Videos AND Photos (as of 2024)
- **Important**: Unaudited apps = private videos only until audit approved
- **Cost**: FREE

## Step-by-Step Setup

### Step 1: Create TikTok Developer Account

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Click **Log in** or **Sign up**
3. Use your TikTok account or create a new developer account
4. Complete developer registration

### Step 2: Create an App

1. Go to **My Apps** in the developer portal
2. Click **Create an app** or **+ Create**
3. Fill in details:
   - App name: `Tiny Seed Farm`
   - Description: `Marketing automation for posting farm content`
   - App icon: Upload your logo
   - Category: Select appropriate category
4. Click **Create**

### Step 3: Add Content Posting API Product

1. In your app dashboard, go to **Products** or **Add products**
2. Find **Content Posting API**
3. Click **Add** or **Enable**
4. Enable **Direct Post** configuration (required to post publicly)

### Step 4: Configure OAuth

1. Go to your app's **Settings** → **Platform settings**
2. Add **Redirect URI**:
   ```
   https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
   ```

3. Note your credentials:
   - **Client Key**: `xxxxxx`
   - **Client Secret**: `xxxxxx`

### Step 5: Request video.upload Scope

1. In app settings, go to **Scopes** or **Permissions**
2. Request the `video.upload` scope
3. Explain your use case:
   ```
   Tiny Seed Farm needs to upload farm content videos and photos
   to share our local produce, flowers, and mushrooms with our
   TikTok audience.
   ```
4. Submit for review (may take a few days)

### Step 6: Get Authorization

1. Build authorization URL:
```
https://www.tiktok.com/v2/auth/authorize/?
  client_key=YOUR_CLIENT_KEY&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=user.info.basic,video.upload,video.publish&
  state=random_string
```

2. Open URL, authorize with your TikTok account
3. Get the `code` from redirect URL

### Step 7: Exchange Code for Tokens

```
POST https://open.tiktokapis.com/v2/oauth/token/

Headers:
  Content-Type: application/x-www-form-urlencoded

Body:
  client_key=YOUR_CLIENT_KEY
  client_secret=YOUR_CLIENT_SECRET
  code=YOUR_AUTH_CODE
  grant_type=authorization_code
  redirect_uri=YOUR_REDIRECT_URI
```

Response:
```json
{
  "access_token": "act.xxxxx",
  "expires_in": 86400,
  "open_id": "xxxxx",
  "refresh_token": "rft.xxxxx",
  "refresh_expires_in": 31536000,
  "scope": "user.info.basic,video.upload,video.publish",
  "token_type": "Bearer"
}
```

### Step 8: Query Creator Info (Required Before Posting)

```
POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json
```

This returns the creator's posting permissions and restrictions.

### Step 9: Upload a Video (Test)

**Option A: File Upload**
```
POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json

Body:
{
  "post_info": {
    "title": "Fresh from Tiny Seed Farm!",
    "privacy_level": "SELF_ONLY",
    "disable_duet": false,
    "disable_comment": false,
    "disable_stitch": false
  },
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 50000000,
    "chunk_size": 10000000,
    "total_chunk_count": 5
  }
}
```

**Option B: Pull from URL**
```
POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json

Body:
{
  "post_info": {
    "title": "Fresh from Tiny Seed Farm!",
    "privacy_level": "SELF_ONLY"
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "video_url": "https://your-domain.com/video.mp4"
  }
}
```

### Step 10: Publish the Video

After upload completes:
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/

Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Content-Type: application/json

Body:
{
  "post_info": {
    "title": "Fresh from Tiny Seed Farm!",
    "privacy_level": "PUBLIC_TO_EVERYONE"
  },
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_upload_id": "video_id_from_previous_step"
  }
}
```

### Important Notes

- **Unaudited apps**: All content will be PRIVATE until audit approved
- **Audit process**: Submit for review once you've tested successfully
- **Video requirements**: MP4 + H.264, max 4GB, 3-60 seconds for feed
- **Photo posting**: Use different endpoint `/v2/post/publish/content/init/`

### Credentials to Store in Apps Script

```javascript
// Add to Script Properties:
TIKTOK_CLIENT_KEY = "your-client-key"
TIKTOK_CLIENT_SECRET = "your-client-secret"
TIKTOK_ACCESS_TOKEN = "your-access-token"
TIKTOK_REFRESH_TOKEN = "your-refresh-token"
TIKTOK_OPEN_ID = "your-open-id"
```

### Resources
- [Content Posting API Get Started](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [Direct Post Reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [Media Transfer Guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide)
- [TikTok Developer Portal](https://developers.tiktok.com/)

---

# QUICK REFERENCE: ALL CREDENTIALS NEEDED

After completing setup, you should have:

## YouTube
```
YOUTUBE_CLIENT_ID = ""
YOUTUBE_CLIENT_SECRET = ""
YOUTUBE_REFRESH_TOKEN = ""
YOUTUBE_CHANNEL_ID = ""
```

## Pinterest
```
PINTEREST_APP_ID = ""
PINTEREST_APP_SECRET = ""
PINTEREST_ACCESS_TOKEN = ""
PINTEREST_REFRESH_TOKEN = ""
PINTEREST_BOARD_ID_FARM = ""
PINTEREST_BOARD_ID_FLOWERS = ""
```

## TikTok
```
TIKTOK_CLIENT_KEY = ""
TIKTOK_CLIENT_SECRET = ""
TIKTOK_ACCESS_TOKEN = ""
TIKTOK_REFRESH_TOKEN = ""
TIKTOK_OPEN_ID = ""
```

---

# NEXT STEPS AFTER SETUP

1. **Fill in credentials above** as you complete each setup
2. **Run `setupYouTubeCredentials_ONETIME()`** in Apps Script
3. **Run `setupPinterestCredentials_ONETIME()`** in Apps Script
4. **Run `setupTikTokCredentials_ONETIME()`** in Apps Script
5. **Test each platform** with a private/draft post
6. **Submit for audits** (YouTube, TikTok) to enable public posting

---

**Good luck! These APIs will complete your Marketing Command Center.**

*Tutorial created: 2026-01-30 by Social Media Claude*
