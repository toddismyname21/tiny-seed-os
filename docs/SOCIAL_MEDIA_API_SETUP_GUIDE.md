# Social Media API Setup Guide

## Tiny Seed Farm - Marketing Command Center

This guide covers setting up YouTube, TikTok, Pinterest, and Shopify connections for the Marketing Command Center.

**Last Updated:** 2026-02-11
**Status:** Instagram is CONNECTED, others need setup

---

## Quick Reference: What's Already Working

| Platform | Status | Method |
|----------|--------|--------|
| Instagram (x3) | Connected | Meta Graph API v24.0 |
| Facebook (x3) | Connected | Meta Graph API v24.0 |
| YouTube | NOT Connected | Needs YouTube Data API v3 |
| TikTok | NOT Connected | Needs TikTok Content Posting API |
| Pinterest | NOT Connected | Needs Pinterest API v5 |
| Shopify | Connected (Orders) | Has Admin API, needs blog/post setup |

---

## 1. YouTube Data API v3 Setup

### What You Need
- Google Cloud Project (you likely already have one for Apps Script)
- YouTube channel associated with a Google account
- OAuth 2.0 credentials

### Step-by-Step Setup

#### A. Enable the API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Library**
4. Search for "YouTube Data API v3"
5. Click **Enable**

#### B. Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Tiny Seed Marketing"
5. Authorized redirect URIs:
   - `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
6. Save the **Client ID** and **Client Secret**

#### C. Required Scopes for Posting
```
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.force-ssl
https://www.googleapis.com/auth/youtube
```

#### D. Store Credentials in Apps Script
In the Apps Script editor, run:
```javascript
function setupYouTubeCredentials() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('YOUTUBE_CLIENT_ID', 'YOUR_CLIENT_ID');
  props.setProperty('YOUTUBE_CLIENT_SECRET', 'YOUR_CLIENT_SECRET');
  props.setProperty('YOUTUBE_CHANNEL_ID', 'YOUR_CHANNEL_ID');
}
```

### Posting Capabilities
- Upload videos (requires video file URL)
- Create community posts (text + images)
- Update video metadata
- Get channel analytics

### Limitations
- Videos must be hosted at a publicly accessible URL
- Processing time required for videos
- Rate limits: 10,000 units/day (1 upload = ~1,600 units)

---

## 2. TikTok Content Posting API Setup

### What You Need
- TikTok Business Account
- TikTok Developer Account
- App approved for Content Posting API

### Step-by-Step Setup

#### A. Create TikTok Developer Account
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Log in with your TikTok Business account
3. Create a new app

#### B. Request Content Posting API Access
1. In your app dashboard, go to **Products**
2. Add **Content Posting API**
3. Submit for review (required for posting)
4. Wait for approval (can take 1-3 weeks)

#### C. Required Scopes
```
video.publish
video.upload
user.info.basic
```

#### D. OAuth 2.0 Flow
TikTok uses server-side OAuth:
1. Redirect user to TikTok authorization URL
2. User approves permissions
3. TikTok redirects back with authorization code
4. Exchange code for access token

#### E. Store Credentials
```javascript
function setupTikTokCredentials() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('TIKTOK_CLIENT_KEY', 'YOUR_CLIENT_KEY');
  props.setProperty('TIKTOK_CLIENT_SECRET', 'YOUR_CLIENT_SECRET');
  props.setProperty('TIKTOK_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN');
  props.setProperty('TIKTOK_REFRESH_TOKEN', 'YOUR_REFRESH_TOKEN');
}
```

### Posting Capabilities
- Upload videos (direct upload or pull from URL)
- Set captions and hashtags
- Enable/disable comments
- Set video privacy settings

### Limitations
- Content Posting API requires review/approval
- Videos only (no photo posts via API)
- Max 1 minute for direct upload, 10 minutes for URL pull
- Token expires every 24 hours (use refresh token)

### Alternative: Manual Posting
Until API is approved, you can:
1. Generate content in the Command Center
2. Download/copy captions
3. Post manually via TikTok app

---

## 3. Pinterest API v5 Setup

### What You Need
- Pinterest Business Account
- Pinterest Developer Account
- App with approved access

### Step-by-Step Setup

#### A. Convert to Business Account
1. Go to [Pinterest Business](https://business.pinterest.com/)
2. Convert your account or create new business account

#### B. Create Developer App
1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Create a new app
3. Get your App ID and Secret

#### C. Required Scopes
```
pins:read
pins:write
boards:read
boards:write
user_accounts:read
```

#### D. OAuth 2.0 Setup
Pinterest uses standard OAuth 2.0:
```
Authorization URL: https://www.pinterest.com/oauth/
Token URL: https://api.pinterest.com/v5/oauth/token
```

#### E. Store Credentials
```javascript
function setupPinterestCredentials() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PINTEREST_APP_ID', 'YOUR_APP_ID');
  props.setProperty('PINTEREST_APP_SECRET', 'YOUR_APP_SECRET');
  props.setProperty('PINTEREST_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN');
  props.setProperty('PINTEREST_REFRESH_TOKEN', 'YOUR_REFRESH_TOKEN');
}
```

### Posting Capabilities
- Create pins (image + description)
- Create video pins
- Create idea pins
- Pin to specific boards
- Schedule pins (via API)

### Limitations
- Rate limit: 1000 requests/minute
- Access token expires every 30 days
- Some features require Pinterest Business verification

---

## 4. Shopify Integration (Enhanced)

### Current Status
Shopify is already connected for:
- Order sync
- Product management
- Customer data
- Financial data

### Adding Blog/Social Post Features

Shopify can't post directly to social media, but you can:

#### A. Create Blog Posts
Already have page management. Can add blog post API:
```javascript
function createShopifyBlogPost(blogId, title, content, author) {
  const endpoint = `blogs/${blogId}/articles.json`;
  const payload = {
    article: {
      title: title,
      body_html: content,
      author: author,
      published: true
    }
  };
  return shopifyApiCall(endpoint, 'POST', payload);
}
```

#### B. Sync Product Posts
Create social content from Shopify products:
1. Generate Instagram-ready images from product photos
2. Auto-create captions from product descriptions
3. Link back to Shopify product pages

#### C. Store Credentials (Already Set)
```javascript
// Already in PropertiesService:
// SHOPIFY_ACCESS_TOKEN
// SHOPIFY_STORE_NAME
```

---

## Quick Start: Post Today

### Immediate Options (No Setup Required)

1. **Instagram/Facebook** - Already working!
   - Use the Marketing Command Center
   - Post from Farm Pics tab
   - Use Post Creator tab

2. **Manual Cross-Posting**
   - Create content in Command Center
   - Copy caption text
   - Post manually to TikTok/YouTube/Pinterest

### Setup Priority (If You Have Time)

| Priority | Platform | Time to Setup | Posting Available |
|----------|----------|---------------|-------------------|
| 1 | YouTube | 30 min | Immediately after setup |
| 2 | Pinterest | 30 min | Immediately after setup |
| 3 | TikTok | 30 min + review wait | 1-3 weeks for approval |

---

## Script Properties Reference

All credentials are stored securely in Apps Script Properties:

```javascript
// View all configured properties
function listAllSocialCredentials() {
  const props = PropertiesService.getScriptProperties();
  const keys = [
    // Instagram (WORKING)
    'META_APP_ID',
    'META_APP_SECRET',
    'INSTAGRAM_APP_ID',
    'INSTAGRAM_APP_SECRET',
    'instagram_accounts',
    'ig_token_0', 'ig_token_1', 'ig_token_2',

    // YouTube (TO CONFIGURE)
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'YOUTUBE_ACCESS_TOKEN',
    'YOUTUBE_REFRESH_TOKEN',
    'YOUTUBE_CHANNEL_ID',

    // TikTok (TO CONFIGURE)
    'TIKTOK_CLIENT_KEY',
    'TIKTOK_CLIENT_SECRET',
    'TIKTOK_ACCESS_TOKEN',
    'TIKTOK_REFRESH_TOKEN',

    // Pinterest (TO CONFIGURE)
    'PINTEREST_APP_ID',
    'PINTEREST_APP_SECRET',
    'PINTEREST_ACCESS_TOKEN',
    'PINTEREST_REFRESH_TOKEN',

    // Shopify (WORKING)
    'SHOPIFY_ACCESS_TOKEN'
  ];

  const status = {};
  keys.forEach(key => {
    const value = props.getProperty(key);
    status[key] = value ? 'CONFIGURED' : 'NOT SET';
  });

  Logger.log(JSON.stringify(status, null, 2));
  return status;
}
```

---

## Troubleshooting

### Common Issues

1. **Token Expired**
   - Refresh tokens for YouTube/TikTok/Pinterest
   - Run the appropriate refresh function

2. **Rate Limited**
   - Wait and retry
   - Space out posts (use scheduling)

3. **Permission Denied**
   - Check scopes in OAuth setup
   - Verify business account status

4. **Video Processing Failed**
   - Check video format (MP4 recommended)
   - Verify file size limits
   - Ensure URL is publicly accessible

### Support Resources

- YouTube: [API Documentation](https://developers.google.com/youtube/v3)
- TikTok: [Developer Portal](https://developers.tiktok.com/doc)
- Pinterest: [API Documentation](https://developers.pinterest.com/docs/api/v5)
- Shopify: [Admin API Reference](https://shopify.dev/docs/api/admin-rest)

---

## Next Steps

1. Choose which platform to set up first
2. Follow the setup guide above
3. Store credentials in Script Properties
4. Test with a simple post
5. Integrate with Marketing Command Center auto-posting
