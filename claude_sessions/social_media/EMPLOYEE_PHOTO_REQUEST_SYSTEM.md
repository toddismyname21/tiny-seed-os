# EMPLOYEE PHOTO REQUEST SYSTEM
## Complete System Design for Field Worker Content Capture

**Created:** 2026-02-11
**Author:** Product Design Claude
**Status:** Design Complete - Ready for Implementation

---

## EXECUTIVE SUMMARY

This system enables busy field workers to easily capture and submit authentic farm content moments. The design prioritizes:
- **Minimal friction** - 2 taps maximum from SMS notification to photo submission
- **Field-friendly UX** - Large buttons, works with gloves, offline-capable
- **Smart timing** - Requests when workers are in the right place/context
- **Fun incentives** - Gamification without feeling corporate

---

## 1. REQUEST TRIGGER SYSTEM

### 1.1 Trigger Types

```
+------------------+------------------------+----------------------------------+
| TRIGGER TYPE     | WHEN                   | WHY                              |
+------------------+------------------------+----------------------------------+
| Weekly Rotation  | Wed 8am (field day)    | Reliable, expected cadence       |
| Context-Aware    | GPS in specific field  | Right place = right moment       |
| Content Gap      | AI detects need        | Fill inventory gaps              |
| Event-Based      | First harvest, bloom   | Capture milestones               |
| Weather-Driven   | Golden hour, storms    | Dramatic lighting opportunities  |
+------------------+------------------------+----------------------------------+
```

### 1.2 Weekly Photo Request Schedule

**Wednesday 8:00 AM** - Primary request (mid-week, deep in field work)
**Optional Friday 7:00 AM** - Harvest day request (seasonal)

```
WEEKLY ROTATION CATEGORIES:
Week 1: "Action Shot" - Someone actively working
Week 2: "Field Beauty" - Landscape or crop close-up
Week 3: "Team Moment" - People together (candid)
Week 4: "Behind Scenes" - Equipment, process, setup
```

### 1.3 Context-Aware Triggers

Using the existing employee.html GPS functionality:

```javascript
// Trigger logic (pseudo-code)
if (employee.location.isInField("M-05") && !photoRequestedToday()) {
    if (field.currentCrop === "tomatoes" && tomatoes.status === "ripe") {
        triggerPhotoRequest({
            type: "harvest",
            prompt: "Those Cherokee Purples look ready! Snap one?",
            category: "harvest_action"
        });
    }
}
```

### 1.4 Content Gap Detection

AI analyzes photo library weekly:
- No flower photos in 2 weeks? Request flowers
- No team photos this month? Request team
- Holiday coming? Request seasonal content

---

## 2. SMS REQUEST TEMPLATES

### 2.1 Primary Weekly Request

```
TINY SEED PHOTO REQUEST

Hey [NAME]! It's Photo Wednesday.

This week's theme: [CATEGORY]
Example: A shot of [SPECIFIC_EXAMPLE]

Tap to capture: [LINK]

Reply SKIP if you're swamped today.
```

### 2.2 Context-Aware Request

```
Perfect timing! You're in the [FIELD_NAME].

Those [CROP] look amazing right now.
Quick snap? 2 taps, done.

[PHOTO_CAPTURE_LINK]
```

### 2.3 Milestone Moment

```
FIRST HARVEST OF THE SEASON!

[CROP] is ready - this is gold content.

Capture it now: [LINK]
(Our followers LOVE first harvests)
```

### 2.4 Weather/Light Opportunity

```
That golden hour light right now...

Perfect for field shots.
Quick capture: [LINK]

No pressure if you're busy!
```

### 2.5 Low-Pressure Reminder (24h after request)

```
Still time to grab a photo!
Theme: [CATEGORY]

[LINK]

Or reply PASS to skip this week.
```

---

## 3. SUBMISSION FLOW

### 3.1 Flow Options Comparison

```
+--------------------+------------+-------------+------------------+
| METHOD             | FRICTION   | QUALITY     | RECOMMENDATION   |
+--------------------+------------+-------------+------------------+
| Reply SMS w/photo  | LOWEST     | Medium      | Android primary  |
| Web capture page   | LOW        | High        | iOS primary      |
| PWA w/ camera      | LOW        | High        | Future ideal     |
| Native app         | HIGH       | Highest     | NOT WORTH IT     |
+--------------------+------------+-------------+------------------+
```

### 3.2 Primary Flow: Quick Web Capture

**Step 1: SMS Received**
```
[Employee receives SMS with unique link]
Tap here to capture: tiny.farm/snap/abc123
```

**Step 2: Capture Page Loads** (2-3 seconds max)
```
+------------------------------------------------+
|                                                |
|    [TINY SEED LOGO]                            |
|                                                |
|    PHOTO REQUEST                               |
|    Theme: Harvest Action                       |
|                                                |
|    +--------------------------------------+    |
|    |                                      |    |
|    |                                      |    |
|    |        [ CAMERA PREVIEW ]            |    |
|    |                                      |    |
|    |                                      |    |
|    +--------------------------------------+    |
|                                                |
|    +-----------------------------------------+ |
|    |                                         | |
|    |    [CAMERA ICON]  TAKE PHOTO           | |
|    |                                         | |
|    +-----------------------------------------+ |
|                                                |
|    or                                          |
|                                                |
|    +-----------------------------------------+ |
|    |    [GALLERY]  CHOOSE FROM CAMERA ROLL  | |
|    +-----------------------------------------+ |
|                                                |
+------------------------------------------------+
```

**Step 3: Photo Captured - Review/Submit**
```
+------------------------------------------------+
|                                                |
|    [BACK]                      [RETAKE]        |
|                                                |
|    +--------------------------------------+    |
|    |                                      |    |
|    |                                      |    |
|    |        [ CAPTURED PHOTO ]            |    |
|    |                                      |    |
|    |                                      |    |
|    +--------------------------------------+    |
|                                                |
|    Quick note (optional):                      |
|    +--------------------------------------+    |
|    |  Cherokee Purples, first pick!       |    |
|    +--------------------------------------+    |
|                                                |
|    +-----------------------------------------+ |
|    |                                         | |
|    |      [CHECKMARK]  SUBMIT PHOTO         | |
|    |                                         | |
|    +-----------------------------------------+ |
|                                                |
+------------------------------------------------+
```

**Step 4: Success Confirmation**
```
+------------------------------------------------+
|                                                |
|              [LARGE GREEN CHECK]               |
|                                                |
|              PHOTO SUBMITTED!                  |
|                                                |
|         You're now entered for Photo           |
|         of the Week recognition                |
|                                                |
|         Your total this month: 4               |
|                                                |
|    +-----------------------------------------+ |
|    |         ADD ANOTHER PHOTO               | |
|    +-----------------------------------------+ |
|                                                |
|    +-----------------------------------------+ |
|    |           DONE FOR NOW                  | |
|    +-----------------------------------------+ |
|                                                |
+------------------------------------------------+
```

### 3.3 Alternative Flow: SMS Reply with Photo (Android-friendly)

```
Employee: [Sends photo via SMS/MMS reply]

System: Got it! Caption?
        Reply with a quick note or send "OK" to submit as-is.

Employee: First tomato harvest!

System: Perfect! Submitted. You're at 4 photos this month.
```

### 3.4 Technical Implementation

**Unique Link Structure:**
```
https://tiny.farm/snap/{token}

Token encodes:
- Employee ID (hashed)
- Request date
- Category/theme
- Expiration (7 days)
- HMAC signature
```

**Backend Flow:**
```
1. SMS sent via Twilio with unique token link
2. Employee taps link -> photo_capture.html loads
3. MediaDevices API opens camera
4. Photo captured -> compressed to <1MB (existing photo_upload.py)
5. Uploaded to Supabase Storage
6. Metadata saved to Google Sheets "Employee_Photos" tab
7. Confirmation SMS sent
8. Photo appears in owner's Sunday review queue
```

---

## 4. CONTENT TYPES & CATEGORIES

### 4.1 Category System

```yaml
HARVEST_ACTION:
  description: "Someone actively harvesting"
  examples:
    - "Hands picking tomatoes"
    - "Loading crates onto wagon"
    - "Cutting flower stems"
  best_time: "7am-10am, 4pm-6pm"
  frequency: "Weekly during season"
  ai_prompt: "Action shot of harvest in progress"

FIELD_BEAUTY:
  description: "Landscape or crop close-ups"
  examples:
    - "Row of sunflowers at golden hour"
    - "Morning dew on lettuce"
    - "Aerial view of planted field"
  best_time: "Golden hour (6-7am, 5-6pm)"
  frequency: "2x per week"
  ai_prompt: "Beautiful farm landscape or crop detail"

TEAM_MOMENTS:
  description: "Candid team interactions"
  examples:
    - "Crew taking water break"
    - "High-five after completing row"
    - "Teaching moment with new employee"
  best_time: "Any"
  frequency: "1x per week"
  ai_prompt: "Authentic team moment, not posed"

BEHIND_SCENES:
  description: "Equipment, process, setup"
  examples:
    - "Irrigation system running"
    - "Packing boxes with care"
    - "Greenhouse propagation trays"
  best_time: "Any"
  frequency: "1x per week"
  ai_prompt: "Behind-the-scenes farm operations"

BEFORE_AFTER:
  description: "Transformation shots"
  examples:
    - "Empty field -> planted field"
    - "Seedling -> mature plant"
    - "Full cooler -> empty after market"
  best_time: "Scheduled"
  frequency: "Monthly"
  ai_prompt: "Before and after comparison"

WEATHER_SEASONS:
  description: "Weather events, seasonal changes"
  examples:
    - "First frost on pumpkins"
    - "Rain on crops"
    - "Sunrise over misty field"
  best_time: "Weather-dependent"
  frequency: "As occurs"
  ai_prompt: "Dramatic weather or seasonal moment"
```

### 4.2 Seasonal Content Calendar

```
SPRING (March-May):
- Greenhouse starts
- First plantings
- Soil prep
- Baby plants

SUMMER (June-August):
- Peak harvest
- Flower blooms
- Market prep
- Team action

FALL (September-November):
- Pumpkins, squash
- Color change
- Storage crops
- Season wind-down

WINTER (December-February):
- Planning/rest
- Greenhouse prep
- Equipment maintenance
- Off-season activities
```

---

## 5. INCENTIVE SYSTEM

### 5.1 Photo of the Week Recognition

**Every Sunday during owner planning session:**
- Review all submitted photos
- Select "Photo of the Week"
- Winner announced in Monday morning team text

```
MONDAY TEAM TEXT:

PHOTO OF THE WEEK: Maria!

Her shot of sunrise over the dahlias was PERFECT.
Posted to Instagram - already 200+ likes!

Maria gets a $10 farm store credit.

Keep those phones ready!
```

### 5.2 Monthly Leaderboard

```
+------------------+--------+----------+
| EMPLOYEE         | PHOTOS | FEATURED |
+------------------+--------+----------+
| Maria G.         | 12     | 3        |
| Carlos R.        | 9      | 1        |
| Sarah M.         | 7      | 2        |
| David K.         | 5      | 0        |
+------------------+--------+----------+

Top contributor gets "Photographer" badge
and $25 bonus on month-end paycheck.
```

### 5.3 Reward Structure

```
INSTANT RECOGNITION:
- Photo submitted -> "Thanks!" SMS
- Photo posted -> "Your photo is live!" SMS with link

WEEKLY:
- Photo of Week: $10 farm credit
- Public recognition in team chat

MONTHLY:
- Top contributor: $25 cash bonus
- "Photographer of the Month" title
- Name on social media "Photo by..."

SEASONAL:
- Best overall photo: $50 bonus
- Featured on farm marketing materials
```

### 5.4 Gamification Elements

```
ACHIEVEMENTS (unlock badges):
- First Photo: "Camera Ready"
- 5 Photos: "Regular Contributor"
- 10 Photos: "Content Creator"
- 25 Photos: "Farm Photographer"
- Photo of Week: "Featured Artist"
- 3 POW wins: "Triple Crown"

STREAKS:
- Submit 3 weeks in a row: Bonus entry for gift card
- Submit all 4 weeks: Priority for schedule requests

NO SHAME:
- Never call out people who don't participate
- Positive reinforcement only
- "Skip" option always available
```

---

## 6. PROCESSING & REVIEW WORKFLOW

### 6.1 Immediate Processing (Automated)

```
PHOTO RECEIVED:
1. Compress to standard size (max 1MB)
2. Extract EXIF data (date, GPS, device)
3. Generate thumbnail (200x200)
4. Store in Supabase bucket: photos/employee/{year}/{month}/
5. Add to Google Sheet "Employee_Photos" tab
6. Send confirmation SMS to employee
7. Add to owner's Sunday review queue
```

### 6.2 AI Enhancement (Automated)

```
FOR EACH PHOTO:
1. Run through Claude Vision API
2. Generate 3 caption options:
   - Professional/informative
   - Casual/friendly
   - Story-driven
3. Suggest relevant hashtags
4. Detect content category
5. Rate photo quality (1-10)
6. Flag any issues (blur, dark, people unclear)
```

### 6.3 Owner Sunday Review Interface

Integrated into existing Sunday Planning workflow:

```
+------------------------------------------------------------+
|  EMPLOYEE PHOTOS THIS WEEK                          [7 new] |
+------------------------------------------------------------+
|                                                             |
|  +------------+  +------------+  +------------+             |
|  | [PHOTO 1]  |  | [PHOTO 2]  |  | [PHOTO 3]  |             |
|  | Maria G.   |  | Carlos R.  |  | Sarah M.   |             |
|  | Tomatoes   |  | Team shot  |  | Flowers    |             |
|  | Score: 9   |  | Score: 7   |  | Score: 8   |             |
|  +------------+  +------------+  +------------+             |
|                                                             |
|  QUICK ACTIONS:                                             |
|  [APPROVE ALL FOR LIBRARY]    [SELECT FOR POST QUEUE]       |
|                                                             |
+------------------------------------------------------------+

SELECTED PHOTO DETAIL:
+------------------------------------------------------------+
|  [LARGE PHOTO PREVIEW]                                      |
|                                                             |
|  Submitted by: Maria G.                                     |
|  Date: Wed Feb 12, 8:23 AM                                  |
|  Category: Harvest Action                                   |
|  Note: "First Cherokee Purples of the season!"              |
|                                                             |
|  AI CAPTION OPTIONS:                                        |
|  [ ] First harvest of Cherokee Purple tomatoes - these      |
|      heirlooms are worth the wait!                          |
|  [ ] Our team worked hard all summer for this moment.       |
|      Cherokee Purples, ready for your table.                |
|  [x] She's here. Cherokee Purple season has officially      |
|      begun at Tiny Seed Farm.                               |
|                                                             |
|  ACTIONS:                                                   |
|  [QUEUE FOR INSTAGRAM]  [QUEUE FOR FACEBOOK]  [SAVE ONLY]   |
|  [MARK AS POW]  [NEED EDIT]  [SKIP]                         |
|                                                             |
+------------------------------------------------------------+
```

---

## 7. DATA MODEL

### 7.1 Employee_Photos Google Sheet

| Column | Type | Description |
|--------|------|-------------|
| photo_id | UUID | Unique identifier |
| employee_id | String | Employee reference |
| employee_name | String | Display name |
| submitted_at | DateTime | Submission timestamp |
| request_id | UUID | Link to original request |
| category | String | Content category |
| caption_raw | Text | Employee's note |
| storage_url | URL | Supabase photo URL |
| thumbnail_url | URL | Supabase thumbnail URL |
| exif_date | DateTime | Camera timestamp |
| exif_gps | String | Lat/Long if available |
| exif_device | String | Phone model |
| ai_quality_score | Integer | 1-10 quality rating |
| ai_caption_1 | Text | Generated caption option |
| ai_caption_2 | Text | Generated caption option |
| ai_caption_3 | Text | Generated caption option |
| ai_hashtags | Text | Suggested hashtags |
| status | Enum | pending/approved/featured/archived |
| featured_platform | String | instagram/facebook/etc |
| featured_date | DateTime | When posted |
| is_photo_of_week | Boolean | POW winner |
| reviewed_by | String | Owner who reviewed |
| reviewed_at | DateTime | Review timestamp |

### 7.2 Photo_Requests Sheet

| Column | Type | Description |
|--------|------|-------------|
| request_id | UUID | Unique identifier |
| employee_id | String | Target employee |
| sent_at | DateTime | When SMS sent |
| trigger_type | Enum | weekly/context/gap/event/weather |
| category | String | Requested category |
| prompt_text | Text | SMS content sent |
| token | String | Unique capture link token |
| expires_at | DateTime | Link expiration |
| status | Enum | pending/completed/skipped/expired |
| response_photo_id | UUID | Link to submitted photo |
| response_at | DateTime | When responded |

---

## 8. INTEGRATION POINTS

### 8.1 Existing Systems

```
SMS SYSTEM (sms_intelligence):
- Use existing Twilio integration
- Add photo request templates
- Handle MMS replies (Android)

PHOTO UPLOAD (photo_upload.py):
- Use existing compression logic
- Use existing Supabase upload
- Use existing thumbnail generation

EMPLOYEE APP (employee.html):
- Add "Quick Photo" button to nav
- GPS context for smart prompts
- View my submissions history

SUNDAY PLANNING:
- Add photo review section
- Integrate with post queue
- Connect to content calendar
```

### 8.2 New Components Needed

```
1. photo_capture.html
   - Mobile-optimized capture page
   - Camera API integration
   - Minimal UI, large buttons
   - Offline-capable (submit when reconnected)

2. employee_photo_request_daemon.py
   - Weekly scheduled requests
   - Context-aware triggers
   - Content gap detection
   - Response handling

3. photo_review_panel.js
   - Sunday planning integration
   - Bulk approval workflow
   - AI caption selection
   - Post queue integration

4. Google Sheets tabs:
   - Employee_Photos
   - Photo_Requests
   - Photo_Leaderboard
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: MVP (Week 1-2)
- [ ] Create photo_capture.html (minimal viable)
- [ ] Add Employee_Photos sheet
- [ ] Basic SMS request (Wednesday schedule)
- [ ] Photo upload to Supabase
- [ ] Simple confirmation SMS
- [ ] Basic Sunday review interface

### Phase 2: Smart Requests (Week 3-4)
- [ ] Context-aware GPS triggers
- [ ] Content gap detection
- [ ] Multiple category support
- [ ] AI caption generation
- [ ] Photo quality scoring

### Phase 3: Gamification (Week 5-6)
- [ ] Photo of Week system
- [ ] Monthly leaderboard
- [ ] Achievement badges
- [ ] Reward tracking
- [ ] Team announcements

### Phase 4: Optimization (Week 7+)
- [ ] MMS reply handling
- [ ] Offline submission queue
- [ ] Employee submission history
- [ ] Analytics dashboard
- [ ] A/B test request timing

---

## 10. SUCCESS METRICS

### 10.1 Participation

| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly submission rate | 60%+ | Photos submitted / employees requested |
| Skip rate | <20% | Explicit skips / requests sent |
| Ignore rate | <20% | No response / requests sent |

### 10.2 Content Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI quality score avg | 7+ | Average of all submissions |
| Photos used | 70%+ | Approved / total submitted |
| Post engagement | +25% | Employee photos vs stock |

### 10.3 Program Health

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to submit | <60 sec | SMS receipt to submission |
| Employee satisfaction | 8+/10 | Monthly survey |
| Content pipeline days | 14+ | Photos in queue / daily posts |

---

## 11. RISK MITIGATION

### 11.1 Potential Issues

| Risk | Mitigation |
|------|------------|
| Employees feel surveilled | Never require, always make fun |
| Photo quality too low | AI pre-screening, gentle feedback |
| Privacy concerns | Clear policy, blur faces option |
| Reward gaming | Human review of all submissions |
| Request fatigue | Max 2x/week, always skippable |
| Technical failures | Offline queue, SMS fallback |

### 11.2 Employee Opt-Out

Always respect employee choice:
- Text "STOP PHOTOS" to opt out permanently
- Text "PAUSE" to skip for 2 weeks
- Never penalize non-participants
- Celebrate contributors, don't shame others

---

## APPENDIX A: SMS SCRIPT LIBRARY

### Request Messages

```
STANDARD WEEKLY:
"Photo Wednesday at Tiny Seed! This week: [CATEGORY]. Quick snap? [LINK] Reply SKIP if busy."

HARVEST MOMENT:
"First [CROP] harvest! This is content gold. 2-tap capture: [LINK]"

GOLDEN HOUR:
"That light right now... perfect for field shots. Quick one? [LINK]"

WEATHER EVENT:
"Rain on the crops - dramatic! Safe spot shot? [LINK]"

GENTLE REMINDER (24h):
"Still time for this week's photo! [CATEGORY] - [LINK] or reply PASS"

LAST CHANCE (48h):
"Last call for Photo Wednesday! Quick snap: [LINK]"
```

### Response Messages

```
PHOTO RECEIVED:
"Got it! Caption? Reply with a note or OK to submit as-is."

SUBMITTED SUCCESS:
"Photo submitted! You're at [N] this month. Thanks [NAME]!"

SKIP ACKNOWLEDGED:
"No problem! See you next week."

PHOTO OF WEEK:
"YOUR PHOTO WON! Photo of the Week - $10 credit coming. Check it out: [POST_LINK]"

POSTED NOTIFICATION:
"Your photo is LIVE on Instagram! [LINK] Already [N] likes!"
```

---

## APPENDIX B: CAPTURE PAGE HTML MOCKUP

```html
<!-- photo_capture.html structure -->
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tiny Seed Photo</title>
    <style>
        body {
            background: #0f172a;
            color: white;
            font-family: system-ui;
            margin: 0;
            min-height: 100vh;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        .theme-badge {
            background: rgba(74, 124, 67, 0.3);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
        }
        .preview {
            width: 100%;
            aspect-ratio: 4/3;
            background: #1e293b;
            border-radius: 12px;
            margin: 20px 0;
        }
        .btn {
            width: 100%;
            padding: 20px;
            font-size: 18px;
            font-weight: 600;
            border: none;
            border-radius: 12px;
            margin: 10px 0;
            cursor: pointer;
        }
        .btn-primary {
            background: #22c55e;
            color: white;
        }
        .btn-secondary {
            background: #334155;
            color: white;
        }
        .note-input {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            color: white;
            margin: 16px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="logo.svg" height="40" alt="Tiny Seed">

        <div class="theme-badge">
            This week: Harvest Action
        </div>

        <div class="preview" id="preview">
            <video id="camera" autoplay playsinline></video>
        </div>

        <button class="btn btn-primary" id="capture">
            Take Photo
        </button>

        <button class="btn btn-secondary" id="gallery">
            Choose from Camera Roll
        </button>
    </div>

    <script>
        // Camera initialization
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            document.getElementById('camera').srcObject = stream;
        });

        // Capture logic...
    </script>
</body>
</html>
```

---

*Employee Photo Request System Design v1.0*
*Ready for implementation review*
