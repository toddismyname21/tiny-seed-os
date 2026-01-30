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

*Report updated: 2026-01-29*
