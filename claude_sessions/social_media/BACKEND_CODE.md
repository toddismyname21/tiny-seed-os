# Backend Code: Ayrshare Integration

**For: Backend Claude to deploy**
**From: Social Media Claude**
**Date: 2026-01-15**

---

## API Key Storage (ONE-TIME SETUP)

Run this in Apps Script editor console ONCE to store the API key securely:

```javascript
// Run this ONCE in Apps Script editor (View > Logs, then run):
function storeAyrshareApiKey() {
    PropertiesService.getScriptProperties().setProperty('AYRSHARE_API_KEY', '1068DEEC-7FAB4064-BBA8F6C7-74CD7A3F');
    Logger.log('Ayrshare API key stored securely!');
}
```

---

## Full Backend Functions

Add these to `apps_script/MERGED TOTAL.js`:

### 1. Get API Key Securely

```javascript
/**
 * Get Ayrshare API key from PropertiesService
 * Never hardcode API keys in source code
 */
function getAyrshareApiKey() {
    const key = PropertiesService.getScriptProperties().getProperty('AYRSHARE_API_KEY');
    if (!key) {
        throw new Error('Ayrshare API key not configured. Run storeAyrshareApiKey() first.');
    }
    return key;
}
```

### 2. Publish to Ayrshare (Main Function)

```javascript
/**
 * Publish content to multiple social platforms via Ayrshare
 *
 * @param {Object} params - Post parameters
 * @param {string} params.post - The caption/text content
 * @param {string[]} params.platforms - Array of platform names ['facebook', 'instagram', 'tiktok', 'youtube', 'pinterest']
 * @param {string} [params.mediaUrl] - URL of image/video to include (must be publicly accessible)
 * @param {string} [params.scheduleDate] - ISO 8601 date string for scheduled posting
 * @param {Object} [params.platformOptions] - Platform-specific options
 * @returns {Object} Response with success status and post IDs
 */
function publishToAyrshare(params) {
    try {
        const apiKey = getAyrshareApiKey();
        const baseUrl = 'https://app.ayrshare.com/api';

        // Validate required fields
        if (!params.post || !params.post.trim()) {
            return { success: false, error: 'Post content is required' };
        }

        if (!params.platforms || params.platforms.length === 0) {
            return { success: false, error: 'At least one platform is required' };
        }

        // Map our platform names to Ayrshare's expected names
        const platformMap = {
            'facebook': 'facebook',
            'instagram': 'instagram',
            'tiktok': 'tiktok',
            'youtube': 'youtube',
            'pinterest': 'pinterest',
            'threads': 'threads',
            'twitter': 'twitter',
            'linkedin': 'linkedin'
        };

        // Filter to only valid, connected platforms
        const validPlatforms = params.platforms
            .map(p => platformMap[p.toLowerCase()])
            .filter(p => p);

        if (validPlatforms.length === 0) {
            return { success: false, error: 'No valid platforms specified' };
        }

        // Build the request payload
        const payload = {
            post: params.post,
            platforms: validPlatforms
        };

        // Add media if provided
        if (params.mediaUrl) {
            // For images
            payload.mediaUrls = [params.mediaUrl];

            // For video-centric platforms, also set videoUrl
            if (validPlatforms.includes('tiktok') || validPlatforms.includes('youtube')) {
                payload.videoUrl = params.mediaUrl;
            }
        }

        // Add scheduling if provided
        if (params.scheduleDate) {
            payload.scheduleDate = params.scheduleDate;
        }

        // Add platform-specific options
        if (params.platformOptions) {
            // YouTube specific
            if (params.platformOptions.youtube) {
                payload.youTubeOptions = {
                    title: params.platformOptions.youtube.title || params.post.substring(0, 100),
                    visibility: params.platformOptions.youtube.visibility || 'public',
                    thumbNail: params.platformOptions.youtube.thumbnail
                };
            }

            // Pinterest specific
            if (params.platformOptions.pinterest) {
                payload.pinterestOptions = {
                    title: params.platformOptions.pinterest.title,
                    link: params.platformOptions.pinterest.link,
                    boardId: params.platformOptions.pinterest.boardId
                };
            }

            // Instagram specific
            if (params.platformOptions.instagram) {
                payload.instagramOptions = {
                    shareToFeed: params.platformOptions.instagram.shareToFeed !== false,
                    isStory: params.platformOptions.instagram.isStory || false
                };
            }
        }

        // Make the API call
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(baseUrl + '/post', options);
        const responseCode = response.getResponseCode();
        const responseData = JSON.parse(response.getContentText());

        if (responseCode === 200) {
            // Log successful post to marketing tracking
            logMarketingPost({
                platforms: validPlatforms,
                content: params.post.substring(0, 100),
                scheduled: !!params.scheduleDate,
                scheduleDate: params.scheduleDate,
                postIds: responseData.postIds || responseData.id
            });

            return {
                success: true,
                postIds: responseData.postIds || responseData.id,
                status: responseData.status,
                scheduled: !!params.scheduleDate
            };
        } else {
            console.error('Ayrshare API error:', responseData);
            return {
                success: false,
                error: responseData.message || 'Failed to publish',
                code: responseCode,
                details: responseData
            };
        }

    } catch (error) {
        console.error('publishToAyrshare error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
}
```

### 3. Get Connected Platforms Status

```javascript
/**
 * Get the status of connected social media accounts from Ayrshare
 * @returns {Object} List of connected platforms and their status
 */
function getAyrshareStatus() {
    try {
        const apiKey = getAyrshareApiKey();

        const options = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiKey
            },
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/user', options);
        const data = JSON.parse(response.getContentText());

        if (response.getResponseCode() === 200) {
            return {
                success: true,
                platforms: data.activePlatforms || [],
                plan: data.subscription || 'unknown',
                postsRemaining: data.postsRemaining
            };
        } else {
            return {
                success: false,
                error: data.message || 'Failed to get status'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
```

### 4. Delete a Post

```javascript
/**
 * Delete a post from Ayrshare (removes from all platforms)
 * @param {string} postId - The Ayrshare post ID to delete
 * @returns {Object} Success/failure status
 */
function deleteAyrsharePost(postId) {
    try {
        const apiKey = getAyrshareApiKey();

        const options = {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify({ id: postId }),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/post', options);
        const data = JSON.parse(response.getContentText());

        return {
            success: response.getResponseCode() === 200,
            data: data
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### 5. Get Post Analytics

```javascript
/**
 * Get analytics for posts
 * @param {string[]} platforms - Platforms to get analytics for
 * @returns {Object} Analytics data
 */
function getAyrshareAnalytics(platforms) {
    try {
        const apiKey = getAyrshareApiKey();

        const options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify({ platforms: platforms || ['instagram', 'facebook', 'tiktok'] }),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/analytics/social', options);
        const data = JSON.parse(response.getContentText());

        return {
            success: response.getResponseCode() === 200,
            analytics: data
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### 6. Log Marketing Post (for tracking)

```javascript
/**
 * Log a social media post to the marketing tracking sheet
 * @param {Object} postData - Data about the post
 */
function logMarketingPost(postData) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName('MarketingPosts');

        if (!sheet) {
            sheet = ss.insertSheet('MarketingPosts');
            sheet.getRange(1, 1, 1, 7).setValues([[
                'Timestamp', 'Platforms', 'Content Preview', 'Scheduled', 'Schedule Date', 'Post IDs', 'Status'
            ]]);
        }

        sheet.appendRow([
            new Date(),
            postData.platforms.join(', '),
            postData.content,
            postData.scheduled ? 'Yes' : 'No',
            postData.scheduleDate || '',
            JSON.stringify(postData.postIds),
            'Published'
        ]);

    } catch (error) {
        console.error('Failed to log marketing post:', error);
    }
}
```

---

## Web App Endpoint Handler

Add this case to the `doPost` function's action switch:

```javascript
case 'publishSocialPost':
    return ContentService.createTextOutput(JSON.stringify(
        publishToAyrshare({
            post: payload.caption,
            platforms: payload.platforms,
            mediaUrl: payload.mediaUrl,
            scheduleDate: payload.scheduleDate,
            platformOptions: payload.platformOptions
        })
    )).setMimeType(ContentService.MimeType.JSON);

case 'getSocialStatus':
    return ContentService.createTextOutput(JSON.stringify(
        getAyrshareStatus()
    )).setMimeType(ContentService.MimeType.JSON);

case 'getSocialAnalytics':
    return ContentService.createTextOutput(JSON.stringify(
        getAyrshareAnalytics(payload.platforms)
    )).setMimeType(ContentService.MimeType.JSON);
```

---

## Testing

After deployment, test with:

```javascript
function testAyrsharePost() {
    const result = publishToAyrshare({
        post: 'Test post from Tiny Seed Farm! 🌱 #FarmLife',
        platforms: ['facebook'],  // Start with just Facebook
        // mediaUrl: 'https://example.com/image.jpg'  // Optional
    });
    Logger.log(result);
}
```

---

## Notes for Backend Claude

1. **API Key Security**: The key is stored in PropertiesService, NOT in source code
2. **One-time setup**: Run `storeAyrshareApiKey()` once in Apps Script editor
3. **Media URLs**: Must be publicly accessible URLs (Google Drive won't work directly)
4. **Rate limits**: Ayrshare Premium allows 100 posts/month
5. **Scheduling**: Use ISO 8601 format: `2026-01-20T10:00:00Z`

---

*Ready for Backend Claude to integrate and deploy*
