# Marketing Dashboard Integration Plan

**Date:** 2026-01-29
**Author:** Social Media Claude
**Status:** ⚠️ SUPERSEDED - SEE SOCIAL_MEDIA_API_RESEARCH.md

---

## ⚠️ THIS DOCUMENT IS OUTDATED

**Per owner directive:** We are NOT using Ayrshare or any third-party service.

**See instead:** `SOCIAL_MEDIA_API_RESEARCH.md` for the DIRECT API integration plan.

---

## ORIGINAL CONTENT (For Reference Only)

---

## EXECUTIVE SUMMARY

**GOOD NEWS:** The Marketing Dashboard is 90% complete. The Ayrshare API is already integrated and the API key is stored. Todd just needs to connect his social accounts through Ayrshare's web interface.

---

## CURRENT STATE ASSESSMENT

### What's Already Built

#### Frontend (`web_app/marketing-command-center.html`)
| Feature | Status | Description |
|---------|--------|-------------|
| Field Mode Quick Post | ✅ BUILT | Drag-and-drop media upload, voice recording |
| AI Caption Generator | ✅ BUILT | Generates captions for posts |
| Multi-Platform Posting | ✅ BUILT | Instagram, Facebook, TikTok, YouTube, Pinterest, Threads |
| Post Scheduling | ✅ BUILT | Schedule posts for future dates |
| Draft Saving | ✅ BUILT | Save drafts locally |
| Farm Photos Gallery | ✅ BUILT | Approve/use employee photos |
| Character Count | ✅ BUILT | Per-platform character limits |
| App Feed Posting | ✅ BUILT | Post to internal app feed |

#### Backend (`apps_script/MERGED TOTAL.js`)
| Endpoint | Status | Description |
|----------|--------|-------------|
| `publishSocialPost` | ✅ BUILT | Publishes to Ayrshare platforms |
| `getSocialAnalytics` | ✅ BUILT | Gets analytics from Ayrshare |
| `deleteSocialPost` | ✅ BUILT | Deletes posts via Ayrshare |
| `checkAyrshareStatus` | ✅ BUILT | Checks if API is configured |
| `updateFollowerCounts` | ✅ BUILT | Manual follower count updates |
| `getMarketingDashboard` | ✅ BUILT | Dashboard data |

#### API Configuration
| Item | Status | Value |
|------|--------|-------|
| Ayrshare API Key | ✅ STORED | `1068DEEC-7FAB4064-BBA8F6C7-74CD7A3F` |
| API Integration | ✅ COMPLETE | Full Ayrshare REST API integration |

### What's NOT Connected

| Item | Status | What Todd Needs to Do |
|------|--------|----------------------|
| Instagram Account | ❌ NOT LINKED | Link @tinyseedfarm (or actual handle) in Ayrshare |
| Facebook Page | ❌ NOT LINKED | Link Tiny Seed Farm page in Ayrshare |
| TikTok Account | ❌ NOT LINKED | Link TikTok in Ayrshare (if they have one) |

---

## AYRSHARE: THE INTEGRATION SOLUTION

### Why Ayrshare?
Ayrshare is a social media posting API that handles all the complexity of multi-platform publishing. Instead of managing separate API keys for Meta, TikTok, etc., you connect accounts once in Ayrshare's dashboard and then use their single API.

### Already Configured:
- API Key is stored in Apps Script properties
- All backend functions are built and deployed
- Frontend is connected to backend

### What's Missing:
**Todd needs to log into Ayrshare and connect his social accounts.**

---

## TODD'S ACTION CHECKLIST

### Step 1: Log into Ayrshare (5 minutes)
```
URL: https://app.ayrshare.com
API Key: 1068DEEC-7FAB4064-BBA8F6C7-74CD7A3F
```

If you don't have an account linked to this API key, you may need to:
1. Create an account at https://app.ayrshare.com/signup
2. Use the existing API key, OR
3. Generate a new key and update the Apps Script property

### Step 2: Connect Social Accounts (10 minutes each)

#### Instagram (via Meta Business Suite)
1. In Ayrshare, click "Link Account" → Instagram
2. Log in with Facebook (Meta controls Instagram API)
3. Select your Instagram Business or Creator account
4. Grant permissions

**Requirements:**
- Instagram account must be Business or Creator type
- Must be connected to a Facebook Page

#### Facebook Page
1. In Ayrshare, click "Link Account" → Facebook
2. Log in with Facebook
3. Select "Tiny Seed Farm" page (or your farm's page)
4. Grant permissions

**Requirements:**
- You must be an admin of the Facebook Page

#### TikTok (Optional)
1. In Ayrshare, click "Link Account" → TikTok
2. Log in with TikTok credentials
3. Grant permissions

### Step 3: Test the Connection (2 minutes)
After linking accounts, go to:
```
https://app.tinyseedfarm.com/web_app/marketing-command-center.html
```

1. Click on "Field Mode" tab
2. Upload a test image
3. Write a test caption
4. Select platforms (Instagram, Facebook)
5. Click "PUBLISH ALL"

If successful, the post should appear on your social accounts!

---

## CREDENTIAL CHECKLIST FOR TODD

### What Todd Needs to Provide/Verify:

| Item | Needed? | Status |
|------|---------|--------|
| Ayrshare Account | Verify | Check if account exists for API key |
| Instagram Business Account | YES | Username: `_____________` |
| Instagram connected to FB Page | YES | Page name: `_____________` |
| Facebook Page Admin Access | YES | Page name: `_____________` |
| TikTok Account (optional) | OPTIONAL | Username: `_____________` |
| YouTube Channel (optional) | OPTIONAL | Channel: `_____________` |

### Information to Collect:
1. **Instagram handle:** @______________
2. **Facebook Page name:** ______________
3. **TikTok handle (if any):** @______________
4. **Are these accounts Business/Creator type?** Yes / No

---

## ALTERNATIVE OPTIONS (If Ayrshare Doesn't Work)

### Option 1: Stay with Ayrshare (RECOMMENDED)
- Already integrated
- Multi-platform support
- Scheduling built-in
- Analytics included
- **Just need to connect accounts**

### Option 2: Meta Business Suite Direct API
- Would require: Facebook App ID, App Secret, Access Token
- More complex setup
- Only covers Facebook + Instagram
- Would require code changes

### Option 3: Buffer/Hootsuite API
- Would require: Complete rewrite of backend
- Monthly subscription fees
- Overkill for needs

### Option 4: Manual Posting
- Use dashboard to compose posts
- Copy/paste to native apps
- Loses automation benefits

**RECOMMENDATION:** Stick with Ayrshare. The integration is complete, just needs account linking.

---

## FEATURES AVAILABLE ONCE CONNECTED

### Immediate Features:
1. **Post to all platforms at once** - One click publishes everywhere
2. **Schedule posts** - Set future date/time for automatic posting
3. **AI Caption Generation** - Generate captions with AI assistance
4. **Voice Notes** - Record voice, transcribe to caption
5. **Draft Saving** - Save posts for later
6. **Farm Photo Gallery** - Use employee-submitted photos

### Analytics (via Ayrshare):
- Post engagement
- Reach/impressions
- Follower growth
- Best posting times

---

## TESTING PROTOCOL

After Todd connects accounts:

### Test 1: Status Check
```
Visit: https://app.tinyseedfarm.com/web_app/marketing-command-center.html
Expected: Dashboard loads, shows connected platforms
```

### Test 2: Test Post
1. Go to "Field Mode" tab
2. Upload any image
3. Type: "Test post from Tiny Seed OS - please ignore!"
4. Select only ONE platform (Instagram)
5. Click "PUBLISH ALL"
6. Check Instagram to confirm

### Test 3: Delete Test Post
- Delete the test post from Instagram
- Or use Ayrshare dashboard to delete

### Test 4: Scheduled Post
1. Compose a post
2. Click "Schedule Post"
3. Set time for 5 minutes in future
4. Verify it posts automatically

---

## TIMELINE

| Step | Time | Who |
|------|------|-----|
| Log into Ayrshare | 5 min | Todd |
| Connect Instagram | 10 min | Todd |
| Connect Facebook | 10 min | Todd |
| Test posting | 5 min | Todd |
| **TOTAL** | **30 min** | |

---

## SUPPORT

If Todd runs into issues:
1. Check Ayrshare documentation: https://docs.ayrshare.com
2. Verify API key is correct in Apps Script
3. Make sure Instagram is Business/Creator account
4. Ensure Facebook Page admin access

---

## SUMMARY

**The Marketing Dashboard is READY.**

All code is complete. All API integration is built. The only missing piece is Todd logging into Ayrshare and connecting his actual social media accounts.

**Time to go live: ~30 minutes**

---

*Document created by Social Media Claude - 2026-01-29*
