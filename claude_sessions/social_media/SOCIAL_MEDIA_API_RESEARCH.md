# Social Media Direct API Integration Research

**Date:** 2026-01-29
**Author:** Social Media Claude
**Status:** READY FOR IMPLEMENTATION

---

## EXECUTIVE SUMMARY

**NO THIRD-PARTY SERVICES.** This document outlines direct API integration for all social media platforms. We are connecting DIRECTLY to:

| Platform | API | Account |
|----------|-----|---------|
| **Instagram** | Meta Graph API | @tinyseedfarm |
| **Facebook** | Meta Graph API | Tiny Seed Farm Page |
| **Threads** | Meta Threads API | @tinyseedfarm |
| **TikTok** | Content Posting API | @TinySeedEnergy |
| **YouTube** | Data API v3 | @TinySeedFarm |
| **Pinterest** | API v5 | tinyseedfarm |
| **SMS** | Twilio | ✅ ALREADY INTEGRATED |

**Cost Comparison:**
| Approach | Annual Cost |
|----------|-------------|
| Ayrshare (third-party) | $1,200/year |
| **Direct API Integration** | **$0/year** |

**Savings:** $1,200/year

---

## PLATFORM-BY-PLATFORM BREAKDOWN

---

### 1. INSTAGRAM + FACEBOOK (Meta Graph API)

**Status:** ✅ CODE ALREADY WRITTEN (see MARKETING_INTELLIGENCE_SYSTEM.md)

#### Overview
Instagram and Facebook use the same Meta Graph API. One integration handles both platforms.

#### Existing Code (from MARKETING_INTELLIGENCE_SYSTEM.md)

```javascript
const INSTAGRAM_CONFIG = {
  accounts: [
    { name: 'Tiny Seed Farm', igUserId: 'IG_USER_ID_1', accessToken: 'STORED_IN_PROPERTIES', fbPageId: 'FB_PAGE_ID_1' },
    { name: 'Tiny Seed Energy', igUserId: 'IG_USER_ID_2', accessToken: 'STORED_IN_PROPERTIES', fbPageId: 'FB_PAGE_ID_2' },
    { name: 'Tiny Seed Market', igUserId: 'IG_USER_ID_3', accessToken: 'STORED_IN_PROPERTIES', fbPageId: 'FB_PAGE_ID_3' }
  ],
  apiVersion: 'v21.0',
  baseUrl: 'https://graph.facebook.com'
};

function postToInstagram(accountIndex, mediaType, content) {
  const account = INSTAGRAM_CONFIG.accounts[accountIndex];
  const baseUrl = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}`;

  // Step 1: Create media container
  const containerUrl = `${baseUrl}/${account.igUserId}/media`;
  const containerPayload = {
    image_url: content.imageUrl,
    caption: content.caption,
    access_token: account.accessToken
  };

  if (mediaType === 'VIDEO') {
    containerPayload.video_url = content.videoUrl;
    containerPayload.media_type = 'VIDEO';
    delete containerPayload.image_url;
  }

  const containerResponse = UrlFetchApp.fetch(containerUrl, {
    method: 'post',
    payload: containerPayload
  });

  const containerId = JSON.parse(containerResponse.getContentText()).id;

  // Step 2: Publish container
  const publishUrl = `${baseUrl}/${account.igUserId}/media_publish`;
  const publishPayload = {
    creation_id: containerId,
    access_token: account.accessToken
  };

  const publishResponse = UrlFetchApp.fetch(publishUrl, {
    method: 'post',
    payload: publishPayload
  });

  return JSON.parse(publishResponse.getContentText());
}

// Token refresh every 50 days (tokens last 60 days)
function refreshInstagramTokens() {
  const props = PropertiesService.getScriptProperties();

  INSTAGRAM_CONFIG.accounts.forEach((account, index) => {
    const currentToken = props.getProperty(`IG_TOKEN_${index}`);
    const refreshUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${currentToken}`;

    const response = UrlFetchApp.fetch(refreshUrl);
    const newToken = JSON.parse(response.getContentText()).access_token;
    props.setProperty(`IG_TOKEN_${index}`, newToken);
  });
}
```

#### Required Permissions (Scopes)
| Scope | Purpose |
|-------|---------|
| `instagram_basic` | Read profile info |
| `instagram_content_publish` | Post photos/videos |
| `instagram_manage_insights` | Analytics access |
| `pages_read_engagement` | Facebook Page access |
| `pages_manage_posts` | Post to Facebook Page |

#### API Endpoints
| Action | Endpoint |
|--------|----------|
| Create Media Container | `POST /{ig-user-id}/media` |
| Publish Media | `POST /{ig-user-id}/media_publish` |
| Get Insights | `GET /{ig-user-id}/insights` |
| Post to Facebook | `POST /{page-id}/feed` |

#### Rate Limits
- 25 API calls per Instagram account per day for content creation
- 200 API calls per hour for general endpoints
- Token refresh: Once every 60 days (auto-refresh at 50 days)

#### Setup Steps for Todd

1. **Create Meta Developer App**
   - Go to: https://developers.facebook.com
   - Create new app → Select "Business" type
   - Add Instagram Graph API product

2. **Connect Instagram Business Account**
   - Instagram must be Professional (Business or Creator)
   - Must be connected to a Facebook Page
   - Grant app permissions in Business Settings

3. **Generate Access Tokens**
   - Use Graph API Explorer to generate initial token
   - Exchange for long-lived token (60 days)
   - Store in Apps Script Properties

4. **Get User IDs**
   - Use Graph API to get Instagram User ID
   - Use Graph API to get Facebook Page ID
   - Store in INSTAGRAM_CONFIG

---

### 2. THREADS (Meta Threads API)

**Status:** 🔧 NEEDS NEW CODE (but similar to Instagram)

#### Overview
Threads uses Meta's Graph API infrastructure, similar patterns to Instagram/Facebook. Publishing is a two-step process: create container, then publish.

#### API Capabilities
| Feature | Support |
|---------|---------|
| Text Posts | ✅ Yes |
| Image Posts | ✅ Yes |
| Video Posts | ✅ Yes |
| Reply to Posts | ✅ Yes |
| Repost/Quote | ✅ Yes |
| Analytics | ✅ Yes (views, likes, replies, reposts) |

#### Required Scopes
| Scope | Purpose |
|-------|---------|
| `threads_basic` | Read profile info |
| `threads_content_publish` | Create and publish posts |
| `threads_manage_insights` | View analytics |
| `threads_manage_replies` | Reply management |

#### API Endpoints
| Action | Endpoint |
|--------|----------|
| Create Container | `POST /{threads-user-id}/threads` |
| Publish Thread | `POST /{threads-user-id}/threads_publish` |
| Get Insights | `GET /{threads-media-id}/insights` |
| Reply to Thread | `POST /{threads-user-id}/threads` (with reply_to_id) |

#### Proposed Code Structure

```javascript
const THREADS_CONFIG = {
  userId: 'STORED_IN_PROPERTIES',
  accessToken: 'STORED_IN_PROPERTIES',
  apiVersion: 'v21.0',
  baseUrl: 'https://graph.threads.net'
};

function postToThreads(text, imageUrl = null) {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('THREADS_ACCESS_TOKEN');
  const userId = props.getProperty('THREADS_USER_ID');

  const baseUrl = `${THREADS_CONFIG.baseUrl}/${THREADS_CONFIG.apiVersion}`;

  // Step 1: Create media container
  const containerUrl = `${baseUrl}/${userId}/threads`;
  const containerPayload = {
    text: text,
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    access_token: accessToken
  };

  if (imageUrl) {
    containerPayload.image_url = imageUrl;
  }

  const containerResponse = UrlFetchApp.fetch(containerUrl, {
    method: 'post',
    payload: containerPayload
  });

  const containerId = JSON.parse(containerResponse.getContentText()).id;

  // Step 2: Publish container
  const publishUrl = `${baseUrl}/${userId}/threads_publish`;
  const publishPayload = {
    creation_id: containerId,
    access_token: accessToken
  };

  const publishResponse = UrlFetchApp.fetch(publishUrl, {
    method: 'post',
    payload: publishPayload
  });

  return JSON.parse(publishResponse.getContentText());
}
```

#### Setup Steps for Todd
- **Uses same Meta Developer App as Instagram**
- Add Threads API product to existing app
- Authorize Threads permissions
- Threads uses Instagram login (@tinyseedfarm)

---

### 3. TIKTOK (Content Posting API)

**Status:** 🔧 NEEDS NEW CODE

#### Overview
TikTok's Content Posting API allows direct video and photo posting to user accounts.

#### API Capabilities
| Feature | Support |
|---------|---------|
| Video Posts | ✅ Yes |
| Photo Posts | ✅ Yes (new feature!) |
| Captions | ✅ Yes |
| Hashtags | ✅ Yes |
| Privacy Settings | ✅ Yes |
| Scheduling | ❌ No (post immediately only) |

#### Required Scopes
| Scope | Purpose |
|-------|---------|
| `video.publish` | Post videos to TikTok |
| `user.info.basic` | Get user info for UI rendering |

#### API Endpoints
| Action | Endpoint |
|--------|----------|
| Query Creator Info | `POST /v2/post/publish/creator_info/query/` |
| Initialize Direct Post | `POST /v2/post/publish/content/init/` |
| Check Post Status | `POST /v2/post/publish/status/fetch/` |

#### Rate Limits
- ~15 posts per day per creator account
- 24-hour active creator cap (varies by audit approval)
- Rate limits shared across all API clients

#### CRITICAL REQUIREMENTS

1. **Audit Required**
   - All unaudited apps post to PRIVATE mode only
   - Must complete TikTok audit to post publicly
   - Audit verifies Terms of Service compliance

2. **UX Requirements (Mandatory)**
   - Must show content preview before posting
   - Must get explicit user consent
   - Must display: "By posting, you agree to TikTok's Music Usage Confirmation"

3. **Content Guidelines**
   - No watermarks or brand logos on content
   - Must be original content
   - Cannot copy content from other platforms

#### Proposed Code Structure

```javascript
const TIKTOK_CONFIG = {
  clientKey: 'STORED_IN_PROPERTIES',
  clientSecret: 'STORED_IN_PROPERTIES',
  accessToken: 'STORED_IN_PROPERTIES',
  openId: 'STORED_IN_PROPERTIES',
  baseUrl: 'https://open.tiktokapis.com'
};

function postToTikTok(videoUrl, caption, privacyLevel = 'PUBLIC_TO_EVERYONE') {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('TIKTOK_ACCESS_TOKEN');

  const initUrl = `${TIKTOK_CONFIG.baseUrl}/v2/post/publish/content/init/`;

  const initPayload = {
    post_info: {
      title: caption.substring(0, 150),
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_stitch: false,
      disable_comment: false,
      video_cover_timestamp_ms: 1000
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl
    },
    post_mode: 'DIRECT_POST',
    media_type: 'VIDEO'
  };

  const response = UrlFetchApp.fetch(initUrl, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(initPayload)
  });

  return JSON.parse(response.getContentText());
}

function postPhotoToTikTok(imageUrls, caption) {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('TIKTOK_ACCESS_TOKEN');

  const initUrl = `${TIKTOK_CONFIG.baseUrl}/v2/post/publish/content/init/`;

  const initPayload = {
    post_info: {
      title: caption.substring(0, 150),
      privacy_level: 'PUBLIC_TO_EVERYONE'
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_images: imageUrls
    },
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO'
  };

  const response = UrlFetchApp.fetch(initUrl, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(initPayload)
  });

  return JSON.parse(response.getContentText());
}
```

#### Setup Steps for Todd

1. **Create TikTok Developer App**
   - Go to: https://developers.tiktok.com
   - Create new app
   - Select "Content Posting API" product

2. **Configure App Settings**
   - Add redirect URI for OAuth
   - Request `video.publish` scope

3. **Complete Audit Process**
   - Submit for TikTok review
   - Provide usage estimates
   - Wait for approval (required for public posts)

4. **Connect @TinySeedEnergy Account**
   - OAuth flow to authorize app
   - Get access token and open_id
   - Store credentials in Apps Script

---

### 4. YOUTUBE (Data API v3)

**Status:** 🔧 NEEDS NEW CODE

#### Overview
YouTube Data API v3 allows video uploads to authenticated channels. Uses Google OAuth 2.0.

#### API Capabilities
| Feature | Support |
|---------|---------|
| Video Uploads | ✅ Yes |
| Thumbnails | ✅ Yes |
| Titles/Descriptions | ✅ Yes |
| Tags | ✅ Yes |
| Privacy Settings | ✅ Yes |
| Playlists | ✅ Yes |
| Analytics | ✅ Yes (via YouTube Analytics API) |

#### CRITICAL REQUIREMENTS

1. **Quota Limits**
   - Default: 10,000 units/day
   - **Video upload costs 1,600 units** (huge!)
   - This means ~6 videos/day maximum
   - Can request quota increase

2. **Verification Required**
   - Unverified apps: videos upload as PRIVATE
   - Must complete Google OAuth verification to upload public videos
   - Requires privacy policy and demo video

#### Required Scopes
| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/youtube.upload` | Upload videos |
| `https://www.googleapis.com/auth/youtube` | Full channel management |
| `https://www.googleapis.com/auth/youtube.readonly` | Read-only access |

#### API Endpoints
| Action | Endpoint |
|--------|----------|
| Upload Video | `POST https://www.googleapis.com/upload/youtube/v3/videos` |
| Update Video | `PUT https://www.googleapis.com/youtube/v3/videos` |
| Set Thumbnail | `POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set` |
| List Playlists | `GET https://www.googleapis.com/youtube/v3/playlists` |

#### Proposed Code Structure

```javascript
const YOUTUBE_CONFIG = {
  clientId: 'STORED_IN_PROPERTIES',
  clientSecret: 'STORED_IN_PROPERTIES',
  accessToken: 'STORED_IN_PROPERTIES',
  refreshToken: 'STORED_IN_PROPERTIES',
  channelId: 'STORED_IN_PROPERTIES'
};

function uploadToYouTube(videoBlob, title, description, tags = [], privacyStatus = 'public') {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('YOUTUBE_ACCESS_TOKEN');

  const metadata = {
    snippet: {
      title: title,
      description: description,
      tags: tags,
      categoryId: '22' // People & Blogs
    },
    status: {
      privacyStatus: privacyStatus, // public, private, unlisted
      selfDeclaredMadeForKids: false
    }
  };

  const boundary = 'foo_bar_baz';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: video/*\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    Utilities.base64Encode(videoBlob.getBytes()) +
    closeDelim;

  const response = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'multipart/related; boundary=' + boundary
      },
      payload: multipartRequestBody,
      muteHttpExceptions: true
    }
  );

  return JSON.parse(response.getContentText());
}

function refreshYouTubeToken() {
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('YOUTUBE_REFRESH_TOKEN');

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      client_id: props.getProperty('YOUTUBE_CLIENT_ID'),
      client_secret: props.getProperty('YOUTUBE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }
  });

  const newToken = JSON.parse(response.getContentText()).access_token;
  props.setProperty('YOUTUBE_ACCESS_TOKEN', newToken);
  return newToken;
}
```

#### Setup Steps for Todd

1. **Enable YouTube Data API**
   - Go to: https://console.cloud.google.com
   - Create or select project
   - Enable YouTube Data API v3

2. **Create OAuth Credentials**
   - Create OAuth 2.0 Client ID
   - Set authorized redirect URIs
   - Download client credentials

3. **Complete OAuth Verification** (for public uploads)
   - Submit app for Google verification
   - Provide privacy policy URL
   - Create demo video showing the integration

4. **Connect @TinySeedFarm Channel**
   - Complete OAuth flow
   - Store access token and refresh token
   - Note: Same Google account as farm Gmail

---

### 5. PINTEREST (API v5)

**Status:** 🔧 NEEDS NEW CODE

#### Overview
Pinterest API v5 allows programmatic Pin creation and Board management.

#### API Capabilities
| Feature | Support |
|---------|---------|
| Create Pins | ✅ Yes |
| Upload Images | ✅ Yes |
| Board Management | ✅ Yes |
| Analytics | ✅ Yes |
| Product Pins | ✅ Yes (e-commerce) |

#### CRITICAL REQUIREMENTS

1. **Standard Access Required**
   - Sandbox mode for testing only
   - Must apply for Standard Access for production
   - Requires video walkthrough of integration
   - Manual review by Pinterest

2. **Content Best Practices**
   - Vertical images (2:3 ratio) perform best
   - Rich Pins for products
   - Link to destination URL required

#### Required Scopes
| Scope | Purpose |
|-------|---------|
| `boards:read` | Read board info |
| `boards:write` | Create/modify boards |
| `pins:read` | Read pin info |
| `pins:write` | Create/modify pins |
| `user_accounts:read` | Read user profile |

#### API Endpoints
| Action | Endpoint |
|--------|----------|
| Create Pin | `POST /v5/pins` |
| List Boards | `GET /v5/boards` |
| Get Analytics | `GET /v5/user_account/analytics` |
| Upload Media | `POST /v5/media` |

#### Proposed Code Structure

```javascript
const PINTEREST_CONFIG = {
  accessToken: 'STORED_IN_PROPERTIES',
  baseUrl: 'https://api.pinterest.com/v5'
};

function createPinterestPin(boardId, title, description, imageUrl, destinationLink) {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('PINTEREST_ACCESS_TOKEN');

  const pinData = {
    board_id: boardId,
    title: title,
    description: description,
    media_source: {
      source_type: 'image_url',
      url: imageUrl
    },
    link: destinationLink,
    alt_text: title
  };

  const response = UrlFetchApp.fetch(`${PINTEREST_CONFIG.baseUrl}/pins`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(pinData)
  });

  return JSON.parse(response.getContentText());
}

function getPinterestBoards() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('PINTEREST_ACCESS_TOKEN');

  const response = UrlFetchApp.fetch(`${PINTEREST_CONFIG.baseUrl}/boards`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return JSON.parse(response.getContentText());
}
```

#### Setup Steps for Todd

1. **Create Pinterest Developer Account**
   - Go to: https://developers.pinterest.com
   - Create new app

2. **Configure OAuth**
   - Add redirect URI
   - Request necessary scopes

3. **Apply for Standard Access**
   - Create video walkthrough
   - Submit for review
   - Wait for approval

4. **Connect tinyseedfarm Account**
   - Complete OAuth flow
   - Store access token
   - Get board IDs for posting

---

### 6. TWILIO (SMS) - ALREADY INTEGRATED

**Status:** ✅ ALREADY WORKING

#### Current Configuration
| Item | Value |
|------|-------|
| Account SID | AC85c921ca82cb00ef4f009eefbad6d071 |
| Phone Number | +1 (412) 866-2259 |
| Status | Active and working |

#### Existing Capabilities
- SMS sending to customers
- Delivery confirmations
- Flash sale alerts
- Market reminders

**No additional work needed for Twilio.**

---

## CREDENTIAL CHECKLIST FOR TODD

### ☐ Meta (Instagram + Facebook + Threads)

| Item | Status | How to Get |
|------|--------|------------|
| Meta Developer Account | ☐ | https://developers.facebook.com |
| Meta Business App | ☐ | Create in Developer Portal |
| Facebook App ID | ☐ | From App Settings |
| Facebook App Secret | ☐ | From App Settings |
| Instagram User ID (@tinyseedfarm) | ☐ | Graph API Explorer |
| Facebook Page ID (Tiny Seed Farm) | ☐ | Graph API Explorer |
| Threads User ID | ☐ | From Meta API |
| Long-Lived Access Token | ☐ | Exchange short-lived token |

**Account Requirements:**
- ☐ Instagram @tinyseedfarm is Business or Creator type
- ☐ Instagram is connected to Facebook Page
- ☐ Todd is admin of Facebook Page
- ☐ Threads account linked to Instagram

### ☐ TikTok

| Item | Status | How to Get |
|------|--------|------------|
| TikTok Developer Account | ☐ | https://developers.tiktok.com |
| TikTok App | ☐ | Create in Developer Portal |
| Client Key | ☐ | From App Settings |
| Client Secret | ☐ | From App Settings |
| Access Token | ☐ | OAuth flow with @TinySeedEnergy |
| Open ID | ☐ | From OAuth response |
| Audit Approval | ☐ | Submit and wait for review |

**Account Requirements:**
- ☐ TikTok @TinySeedEnergy is Business Account

### ☐ YouTube

| Item | Status | How to Get |
|------|--------|------------|
| Google Cloud Project | ☐ | https://console.cloud.google.com |
| YouTube Data API Enabled | ☐ | Enable in Cloud Console |
| OAuth Client ID | ☐ | Create in Cloud Console |
| OAuth Client Secret | ☐ | Create in Cloud Console |
| Access Token | ☐ | OAuth flow |
| Refresh Token | ☐ | OAuth flow |
| Channel ID (@TinySeedFarm) | ☐ | From YouTube Studio |
| OAuth Verification | ☐ | Submit for Google review |

**Account Requirements:**
- ☐ YouTube channel @TinySeedFarm exists
- ☐ Same Google account as farm Gmail

### ☐ Pinterest

| Item | Status | How to Get |
|------|--------|------------|
| Pinterest Developer Account | ☐ | https://developers.pinterest.com |
| Pinterest App | ☐ | Create in Developer Portal |
| Access Token | ☐ | OAuth flow |
| Board IDs | ☐ | From Pinterest API |
| Standard Access Approval | ☐ | Submit video walkthrough |

**Account Requirements:**
- ☐ Pinterest tinyseedfarm is Business Account

### ✅ Twilio (SMS) - ALREADY CONFIGURED

| Item | Status |
|------|--------|
| Account SID | ✅ AC85c921ca82cb00ef4f009eefbad6d071 |
| Auth Token | ✅ Stored in Apps Script |
| Phone Number | ✅ +1 (412) 866-2259 |

---

## IMPLEMENTATION PLAN

### Phase 1: Meta (Instagram + Facebook + Threads) - PRIORITY
**Effort:** Low (code already exists for IG/FB, Threads is similar)

| Step | Action |
|------|--------|
| 1 | Todd creates Meta Developer App |
| 2 | Todd connects Instagram + Facebook accounts |
| 3 | Add Threads API to same app |
| 4 | Todd generates long-lived access token |
| 5 | Store credentials in Apps Script Properties |
| 6 | Deploy existing code from MARKETING_INTELLIGENCE_SYSTEM.md |
| 7 | Add Threads posting function |
| 8 | Test posting to all three platforms |

### Phase 2: TikTok
**Effort:** Medium (new code + audit required)

| Step | Action |
|------|--------|
| 1 | Todd creates TikTok Developer Account |
| 2 | Todd creates TikTok App |
| 3 | Submit for Content Posting API audit |
| 4 | Implement TikTok posting code |
| 5 | Connect @TinySeedEnergy via OAuth |
| 6 | Test posting (will be private until audit passes) |
| 7 | Wait for audit approval |

### Phase 3: YouTube
**Effort:** Medium (new code + verification required)

| Step | Action |
|------|--------|
| 1 | Todd creates Google Cloud Project |
| 2 | Enable YouTube Data API v3 |
| 3 | Create OAuth credentials |
| 4 | Implement YouTube upload code |
| 5 | Complete OAuth verification (for public uploads) |
| 6 | Connect @TinySeedFarm channel |
| 7 | Test video uploads |

### Phase 4: Pinterest
**Effort:** Medium (new code + standard access required)

| Step | Action |
|------|--------|
| 1 | Todd creates Pinterest Developer Account |
| 2 | Create Pinterest App |
| 3 | Implement Pin creation code |
| 4 | Create video walkthrough for review |
| 5 | Apply for Standard Access |
| 6 | Connect tinyseedfarm account |
| 7 | Test Pin creation |

### Phase 5: Unified Dashboard
**Effort:** Medium (frontend updates)

| Step | Action |
|------|--------|
| 1 | Update Marketing Command Center to use new direct APIs |
| 2 | Remove Ayrshare integration |
| 3 | Add all 6 platforms to posting interface |
| 4 | Implement unified analytics |
| 5 | Full integration testing |

---

## COST COMPARISON

| Platform | Third-Party (Ayrshare) | Direct Integration |
|----------|------------------------|-------------------|
| Instagram | Included | Free (Graph API) |
| Facebook | Included | Free (Graph API) |
| Threads | Included | Free (Threads API) |
| TikTok | Included | Free (Content Posting API) |
| YouTube | Included | Free (Data API v3) |
| Pinterest | Included | Free (API v5) |
| **Monthly Cost** | **$100/month** | **$0/month** |
| **Annual Total** | **$1,200** | **$0** |

**Savings: $1,200/year**

---

## PLATFORM SUMMARY TABLE

| Platform | Account | API | Code Status | Audit/Verification |
|----------|---------|-----|-------------|-------------------|
| Instagram | @tinyseedfarm | Meta Graph API | ✅ EXISTS | None required |
| Facebook | Tiny Seed Farm | Meta Graph API | ✅ EXISTS | None required |
| Threads | @tinyseedfarm | Meta Threads API | 🔧 NEEDED | None required |
| TikTok | @TinySeedEnergy | Content Posting API | 🔧 NEEDED | ⚠️ AUDIT REQUIRED |
| YouTube | @TinySeedFarm | Data API v3 | 🔧 NEEDED | ⚠️ VERIFICATION REQUIRED |
| Pinterest | tinyseedfarm | API v5 | 🔧 NEEDED | ⚠️ STANDARD ACCESS REQUIRED |
| SMS | +14128662259 | Twilio | ✅ WORKING | N/A |

---

## TECHNICAL NOTES

### Token Management
- Instagram/Facebook/Threads: 60-day tokens, auto-refresh at 50 days
- TikTok: Variable, set up refresh mechanism
- YouTube: Use refresh tokens (access tokens expire in 1 hour)
- Pinterest: Long-lived tokens, periodic refresh

### Error Handling
All API calls should include:
- Retry logic with exponential backoff
- Rate limit detection
- Token expiration detection
- Error logging to spreadsheet

### Analytics Integration
Each platform provides native analytics:
- Instagram: Insights API
- Facebook: Page Insights API
- Threads: Insights API
- TikTok: Video stats endpoint
- YouTube: YouTube Analytics API
- Pinterest: Analytics API

---

## SOURCES

- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Developer Guidelines](https://developers.tiktok.com/doc/our-guidelines-developer-guidelines)
- [YouTube Data API v3](https://developers.google.com/youtube/v3/docs)
- [YouTube Upload Guide](https://developers.google.com/youtube/v3/guides/uploading_a_video)
- [Pinterest API v5](https://developers.pinterest.com/docs/api/v5/)
- [Pinterest Create Pin](https://developers.pinterest.com/docs/api/v5/pins-create/)
- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)

---

## SUMMARY

**Direct API integration covers ALL 7 platforms:**

| Platform | Status |
|----------|--------|
| Instagram | ✅ Code exists |
| Facebook | ✅ Code exists |
| Threads | 🔧 Easy (similar to IG) |
| TikTok | 🔧 New code + audit |
| YouTube | 🔧 New code + verification |
| Pinterest | 🔧 New code + review |
| SMS (Twilio) | ✅ Already working |

**Todd's Priority Action Items:**
1. Create Meta Developer App (covers Instagram, Facebook, Threads)
2. Apply for TikTok Developer access + submit for audit
3. Create Google Cloud Project + enable YouTube API
4. Create Pinterest Developer Account + apply for Standard Access

**Once credentials provided, implementation can begin immediately.**

---

*Document created by Social Media Claude - 2026-01-29*
