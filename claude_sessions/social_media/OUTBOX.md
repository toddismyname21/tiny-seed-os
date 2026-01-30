# STATUS: Social Media Claude

**Last Updated:** 2026-01-29 @ API SETUP COMPLETE ✅
**Report To:** PM_Architect

---

## CURRENT SESSION: Meta API Setup - COMPLETE

### All Credentials Retrieved ✅

#### App Credentials
| Platform | Item | Value |
|----------|------|-------|
| **Meta (FB/IG)** | App ID | `1453282209770271` |
| **Meta (FB/IG)** | App Secret | `923bd5e066093def628e01836769e4a5` |
| **Threads** | App ID | `1080497484205906` |
| **Threads** | App Secret | `4e45ad6e506f214158017586a75caac6` |

#### Tiny Seed Farm
| Item | Value |
|------|-------|
| Facebook Page ID | `1760385317513019` |
| Instagram Business ID | `17841403850522` |
| Instagram Handle | @tinyseedfarm |
| Page Access Token | `EAAUpwKHfKx8BQi92G2mojrsPm5iokMIYYcWCYl0oaqY8FX1iCvjjtDgWC0SZB1Td1W5ZC8tmx0eRH7DnXsHo6tkZBE2UgiRC53ZAZCJZATOLiJQZBsq0dKSKLAKD0zZAJYJzRP73iHJvEjoGxf3ZAniNpwynrhv4nIkQUsNjy978K8mzCd29AhXEzJkamfzepmunPFIJziEPEFPhYGXoJDJsreuMqQXtE7OG9l6KM0Wl7CbDn7XVuZAISHCmEZD` |

#### Tiny Seed Fleurs
| Item | Value |
|------|-------|
| Facebook Page ID | `975076245687644` |
| Instagram Business ID | `17841435193515793` |
| Instagram Handle | @tinyseedfleurs |
| Page Access Token | `EAAUpwKHfKx8BQtcLLKvR2VsctslWZBz9DvGmBCWvyiE9nfpSvi2qyvyrBNO7PZAAF2Xr7OhlCxaKc45KKHf3opskTwLZBG9rb0ybUuJWGYbbTRrrMBe8T7YmB0gyTQBwu7W4xrWpj2o2ZCs9yFhCV7vzcL9az8ba9sa5sPZC8snQOCtGSQAkB8kRlrLc5prfZCoNgo8ZCQtkj4VxT2EDKm8ZCbcIyG0TfidrpAaKz8j8fdAdciGMxR1YE4QZD` |

#### Tiny Seed Fungi
| Item | Value |
|------|-------|
| Facebook Page ID | `1025602933961290` |
| Instagram Business ID | `17841464175325954` |
| Instagram Handle | @tinyseedfungi |
| Page Access Token | `EAAUpwKHfKx8BQkhyBRRjrnPDcKsNwKKvwwhttIawkvNycUWsZBUpIw6Fp7psdMfjPPoJ0g0d2a3ZA0ZAq964PpEsw4wAFI8QbtGoX6ReDZAG10c3cUhblzWGIL5YFWuCgXsMpm6aN5mpcpr32OVk3zjJeFkCdvQkZBKQzqy23LjsBwULUIuXkZALxSxowMAyYPOGg5sGLYzux1cIgVZCuJEHqej4IKfZCyvP3RNfH3cycG9wH6zabX5iookZD` |

### App Configuration
| Setting | Value |
|---------|-------|
| App Name | Tiny Seed Farm OS FINAL |
| Contact Email | todd@tinyseedfarmpgh.com |
| Privacy Policy | https://app.tinyseedfarm.com/web_app/privacy-policy.html |
| Data Deletion URL | https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=metaDataDeletion |

---

## PROGRESS UPDATE: 2026-01-29

### Backend Deployed ✅

1. **API Version Updated** - Changed from v21.0 to v24.0 (current)
2. **Setup Function Created** - `setupInstagramCredentials_ONETIME()` added to MERGED TOTAL.js
3. **Test Function Created** - `testInstagramPost()` added for verification
4. **Deployed** - v462 deployed to production
5. **GitHub Updated** - Pushed to main branch

### ACTION REQUIRED: Run Setup Function

To activate Instagram posting, owner must:
1. Open Apps Script: https://script.google.com
2. Open Tiny Seed project
3. Select function: `setupInstagramCredentials_ONETIME`
4. Click ▶️ Run
5. Authorize if prompted

This stores all credentials in Script Properties securely.

---

## NEXT STEPS

1. **~~Store Credentials in Apps Script Properties~~** ✅ FUNCTION CREATED
   - Run `setupInstagramCredentials_ONETIME()` in Apps Script editor

2. **Test Instagram Posting**
   - Run `testInstagramPost()` in Apps Script editor
   - Or POST to API with action: `postToInstagram`

3. **Update Marketing Command Center**
   - Replace Ayrshare integration with direct Meta Graph API
   - Fix account names (@tinyseedfleurs, @tinyseedfungi)
   - Remove Ayrshare dependencies

4. **Convert to Long-Lived Tokens**
   - Current tokens expire in ~60 days
   - Exchange for long-lived tokens
   - Set up automatic refresh trigger

---

## API Integration Status

| Platform | API | Status |
|----------|-----|--------|
| Instagram | Meta Graph API | ✅ **READY** - All credentials collected |
| Facebook | Meta Graph API | ✅ **READY** - All credentials collected |
| Threads | Meta Threads API | ⏳ Pending |
| TikTok | Content Posting API | ⏳ Pending |
| YouTube | Data API v3 | ⏳ Pending |
| Pinterest | API v5 | ⏳ Pending |
| SMS | Twilio | ✅ Working |

---

## HOW TO POST TO INSTAGRAM (Reference)

### Step 1: Create Media Container
```
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/media
?image_url={public-image-url}
&caption={your-caption}
&access_token={page-access-token}
```

### Step 2: Publish Media
```
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/media_publish
?creation_id={container-id-from-step-1}
&access_token={page-access-token}
```

---

## CONTENT SOURCES FOR SOCIAL MEDIA POSTS

These files contain valuable content for generating authentic social media posts:

| File | Content Type | Use For |
|------|--------------|---------|
| `claude_sessions/business_foundation/OUTBOX.md` | Farm mission, values, story | Brand posts, about us content, mission statements |
| `CHANGE_LOG.md` | New features & updates | Announcements, "what's new" posts, tech updates |
| `apps_script/MarketModule.js` | Market schedules & locations | Market day reminders, location posts, schedule updates |
| `web_app/csa.html` | CSA program details | CSA promotion, member benefits, signup CTAs |

### Other OUTBOX Files (Real-Time Activity Logs)

| Claude Session | OUTBOX Location | Content Gold |
|----------------|-----------------|--------------|
| PM_Architect | `claude_sessions/pm_architect/OUTBOX.md` | System updates, big picture news |
| Sales CRM | `claude_sessions/sales_crm/OUTBOX.md` | Customer wins, sales milestones |
| Field Operations | `claude_sessions/field_operations/OUTBOX.md` | Harvest updates, field activity |
| Backend | `claude_sessions/backend/OUTBOX.md` | Technical achievements |

**Pro Tip:** Check OUTBOX files before generating posts - they contain real-time farm activity that makes authentic content.

---

## ⚠️ URGENT: TOKEN EXPIRATION - 2026-01-30

### TOKENS EXPIRE TODAY AT 1:00 AM

The current Page Access Tokens expire at **2026-01-30 01:00:00**.

### Issues Found During Testing

1. **Tokens expire today** - Must regenerate immediately
2. **Missing `instagram_basic` permission** - Tokens have `instagram_content_publish` but NOT `instagram_basic`
3. **Can't verify Instagram Business Account IDs** - Without `instagram_basic`, we cannot confirm the correct IDs

### ACTION REQUIRED - Owner Must Complete

1. **Go to Meta Developer Console**: https://developers.facebook.com/apps/1453282209770271/
2. **Generate New Tokens** via Graph API Explorer:
   - Go to Tools → Graph API Explorer
   - Select App: "Tiny Seed Farm OS FINAL"
   - Click "Generate Access Token"
   - **CRITICAL**: Select BOTH permissions:
     - `instagram_basic` (needed to query Instagram accounts)
     - `instagram_content_publish` (needed to post)
   - Select all 3 Pages (Farm, Fleurs, Fungi)
3. **Get Page Access Tokens** for each page
4. **Exchange for Long-Lived Tokens**:
   ```
   GET https://graph.facebook.com/v24.0/oauth/access_token
   ?grant_type=fb_exchange_token
   &client_id=1453282209770271
   &client_secret=923bd5e066093def628e01836769e4a5
   &fb_exchange_token={YOUR_SHORT_LIVED_USER_TOKEN}
   ```
5. **Get Never-Expiring Page Tokens** using the long-lived user token:
   ```
   GET https://graph.facebook.com/v24.0/me/accounts
   ?access_token={LONG_LIVED_USER_TOKEN}
   ```
6. **Update Script Properties** with new tokens via:
   ```
   ?action=setupInstagramCredentials
   ```

### After Getting New Tokens - Verify Instagram IDs

With `instagram_basic` permission, run this to get correct Instagram Business Account IDs:
```
GET https://graph.facebook.com/v24.0/{page_id}
?fields=instagram_business_account
&access_token={new_page_token}
```

---

*Report updated: 2026-01-30 00:25*
