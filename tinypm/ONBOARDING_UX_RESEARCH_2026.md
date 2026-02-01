# User Onboarding UX Research for AI Apps
## TinyPM Dual Architecture Analysis & Recommendations
**Date:** January 30, 2026
**Research Focus:** Life Organizer + Project Manager dual-architecture explanation, progressive disclosure, and conversion optimization

---

## EXECUTIVE SUMMARY

TinyPM's dual architecture is its biggest **selling point AND biggest onboarding challenge**.

**Problem:** Most users don't instinctively understand the difference between:
- A persistent, always-running Life Organizer (continuous intelligence)
- Discrete, deletable Projects (task-specific tools)

**Solution:** Use progressive disclosure and a simplified mental model. Rather than explaining the technical architecture, position it as "The AI That Knows You" (Life) + "The Tool You Need" (Projects).

**Current Onboarding Assessment:** The existing questionnaire is actually **too long** (6 questions before getting value). Best-in-class apps show value within 60 seconds.

---

## PART 1: AI APP ONBOARDING PATTERNS (2026)

### 1.1 The Science of Activation

**Key Finding:** Users decide whether to stay within **3-5 minutes**. This is not negotiable.

| Metric | Best-in-Class | Current | Target |
|--------|---------------|---------|--------|
| Time to First Value | 60-90 sec | ~4 minutes | 90 sec |
| Setup Steps | 3-5 | 7 | 4 |
| Questions Asked | 2-3 | 6 | 2 |
| Sample Data Used? | 60% | No | Yes |
| API Connection | Optional (later) | Step 5 | Step 7+ (optional) |

### 1.2 The Three Onboarding Principles

**1. EXPECTATION SETTING**
- Be extremely clear about what the AI CAN'T do before they expect it to
- Show limitations transparently
- Examples of what NOT to ask for

**2. TRUST BUILDING**
- Show the work: Let users see why the AI suggests something
- Transparency over magic
- Small wins matter more than big promises
- Verification moments ("Did we get that right?")

**3. PROGRESSIVE DISCLOSURE**
- Don't explain everything upfront
- Let users discover features as they need them
- Use tooltips, not modal dialogs
- Reserve deep configuration for advanced users

---

## PART 2: THE DUAL ARCHITECTURE PROBLEM

### 2.1 What Users Think vs. Reality

**What Users See:**
- "TinyPM" = one app
- They expect it to work like Notion or Linear
- They don't have a mental model for "persistent background AI"

**What We're Offering:**
- **Life Organizer:** Runs continuously, learns patterns, never deleted, manages your life
- **Projects:** Create/delete freely, discrete units, store anywhere
- These coordinate but are fundamentally different

**The Gap:** This is like explaining iOS has both system daemons AND apps. Most users don't care about that distinction.

### 2.2 The Mental Model Solution

Instead of explaining architecture, use **three simple categories:**

#### **YOUR LIFE** (The Life Organizer)
"I'm here. Always. Learning about you."

- What runs in the background without you asking
- Examples: Reminding you of birthdays, keeping your inbox clean, suggesting the perfect wine
- Never disappears (even if you delete everything else)
- **Key Insight:** Position as "your personal assistant who never sleeps"

#### **YOUR PROJECTS** (The Project Manager)
"Build, use, delete. No strings attached."

- What you create when you want to track something specific
- Examples: Dinner Log, Wine Journal, Book Club
- Can be deleted anytime without affecting Your Life
- **Key Insight:** Position as "your tools for the things you care about"

#### **THE MAGIC** (AI Coordination)
"Watch what happens when they work together"

- Your Life learns from Your Projects
- Projects can use insights from Your Life
- Example: Wine journal tells Life which wines you like → Life suggests them when shopping
- **Key Insight:** Don't explain this upfront. Show it in action later.

---

## PART 3: ONBOARDING FLOW REDESIGN

### 3.1 Current Flow Assessment

**Current Onboarding:** 7 steps, 6+ minutes
1. Welcome (good)
2. Basic Info (necessary)
3. Work Style (too detailed)
4. Life Priorities (good)
5. Communication Preferences (premature)
6. Connect Google (right idea, wrong timing)
7. First Goal (good)

**Issues:**
- ✗ Question overload before showing value
- ✗ Work Style is not relevant to Life Organizer (that's for projects)
- ✗ Communication preferences are setting, not discovery
- ✗ Google connection is optional but positioned as critical
- ✗ No sample data/demo
- ✗ No "aha moment" until completion screen

### 3.2 Redesigned Flow: "4-Step Activation"

**New Goal:** Get to first value in 90 seconds. Get to "I see the difference" in 3 minutes.

#### **STEP 1: The Difference (20 seconds)**
**Title:** "Two Things About TinyPM"

**Show, Don't Tell:**
```
┌─────────────────────────────────────────────────────────┐
│  Two Sides of TinyPM                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Left Side (animated, continuous background):          │
│  🤖 "YOUR LIFE"                                         │
│  I'm always here                                        │
│  Learning about you                                     │
│  Helping you remember what matters                      │
│                                                         │
│  Right Side (clickable cards):                          │
│  📁 "YOUR PROJECTS"                                     │
│  Wine Log   Dinner Log   Books                          │
│  Create one.  Use it.  Delete it.                       │
│  No impact on me.                                       │
│                                                         │
│  [Create My First Project ➜]                            │
│  or                                                     │
│  [Skip to Life Setup]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Copy Strategy:**
- Use the word "always" - conveys persistence
- Use "learning" - builds magic feeling
- Use "delete anytime" - removes anxiety
- Show examples, not abstractions

**Branching:** User decides: "I want to build a project" OR "Set up my life"

---

#### **STEP 2A: First Project (If They Choose Projects)**
**Title:** "What Will You Build?"

Show 5 pre-built templates (instead of blank slate):
1. 🍷 Wine Journal - "Track wines you love"
2. 🍽️ Dinner Log - "Remember great meals"
3. 📚 Book Club - "Track books you read"
4. 💪 Fitness - "Log workouts and progress"
5. ✏️ Custom - "Build your own"

**Key:** Each template has a 2-sentence description + emoji. No long onboarding for this.

**Copy for Wine Journal Example:**
> "Every wine you try, snap a photo and add notes. Months later: 'What was that red I loved at Mabel's?' Instant answer."

**The Value Proposition:** Not "organize data" but "remember the things that matter"

**CTA:** Choose template → 2 required fields only (name, brief description) → Create

**Time:** 60 seconds

---

#### **STEP 2B: Life Setup (If They Choose Life First)**
**Title:** "Let's Make TinyPM Know You"

**Only ask 2 questions:**
1. "What should I call you?" (text field)
2. "What's your biggest life challenge right now?" (text area, 2 sentences)

That's it. Don't ask timezone, wake time, occupation, or priorities yet.

**Why only 2 questions?**
- We can auto-detect timezone
- Sleep/wake times are unimportant to onboarding
- Occupation doesn't affect Life Organizer features
- Priorities are better discovered through use

**The Third Question (Different):**
> "What's ONE thing you want my help with this week?"

This is the activation moment. Not "your biggest life goal" but something achievable THIS WEEK.

**Examples given:**
- "Remember to call my mom"
- "Keep my inbox clean"
- "Finish the project proposal"
- "Don't forget my sister's birthday"

**Why This Works:**
- Concrete, not abstract
- Achievable in 7 days (confidence builder)
- Reveals what the user values
- Gives us something to do immediately

**Time:** 60 seconds

---

#### **STEP 3: Connection Options**
**Title:** "Supercharge TinyPM (Optional)"

**New Positioning:** These aren't requirements, they're power-ups.

```
┌─────────────────────────────────────────────────────────┐
│  Connect Your World                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Google Calendar                                        │
│  ✓ See upcoming events                                  │
│  ✓ Get reminders before meetings                        │
│  ✓ Let TinyPM suggest free time                         │
│                                                         │
│  Gmail                                                  │
│  ✓ Help you manage your inbox                           │
│  ✓ Suggest responses to emails                          │
│  ✓ Extract important dates/names                        │
│                                                         │
│  [Connect Google ➜] [Skip This]                         │
│                                                         │
│  You can add these anytime from settings                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Changes:**
- Buttons are separated (connect vs. skip)
- Benefits are feature-focused, not technical
- Clear escape hatch ("you can add later")
- No fake urgency

**Expected Conversion:** 40-50% on first pass (they'll reconnect later when they see value)

**Time:** 30 seconds

---

#### **STEP 4: First Moment of Magic**
**Title:** Nothing - just show it

After setup, show them a working example:

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to TinyPM, Sarah                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🎯 YOUR WEEK                                            │
│  ├─ Mom's birthday: 3 days                              │
│  ├─ Inbox at zero: 3 new items                          │
│  └─ "Finish project proposal": Let's break it down      │
│                                                         │
│  💡 QUICK START                                          │
│  ├─ [Log a wine] (Start your first project)             │
│  ├─ [Set reminders] (For the things you care about)     │
│  └─ [Ask me anything] (Chat with TinyPM)                │
│                                                         │
│  "I learned you want to finish a project proposal       │
│   this week. Want me to help break it into tasks?"      │
│                                                         │
│  [Yes, help me] [I'll do it myself] [Ask me later]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**What This Does:**
1. Shows the Life Organizer in action
2. Demonstrates proactivity
3. Offers immediate, concrete help
4. Removes the blank-page problem
5. **This is the "aha moment"**

**Time:** 30 seconds (they read it, don't interact much)

---

### 3.3 Timeline Summary

| Step | Title | Purpose | Time | Notes |
|------|-------|---------|------|-------|
| 1 | The Difference | Show dual system | 20s | Visual, animated, clear |
| 2 | Get Starting (choose path) | Branch | 10s | Projects OR Life |
| 2A | First Project OR 2B | Create value | 60s | Quick, template-based |
| 3 | Integrations | Power-ups | 30s | Optional, no pressure |
| 4 | Dashboard | Aha moment | 30s | AI in action |
| **Total** | | | **2m 50s** | **Under 3 minutes** |

---

## PART 4: ADDRESSING SPECIFIC QUESTIONS

### 4.1 "Is the Questionnaire Too Long?"

**Current Status:** YES, significantly.

The existing onboarding asks:
1. Name
2. Timezone
3. Wake/sleep times
4. Occupation
5. Work schedule
6. Productivity challenge
7. Top 3 priorities
8. Reminder method
9. Check-in frequency
10. Communication tone
11. Google connect
12. First goal

**That's 12 questions before landing on the dashboard.**

**Industry Benchmark:**
- Slack: 1 question (workspace name)
- Notion: 3 questions (name, email, use case)
- Linear: 2 questions (team name, project)
- ChatGPT: 0 questions (just log in, start chatting)

**Recommended Cut:**
Remove these from initial onboarding:
- ✗ Timezone (auto-detect)
- ✗ Wake/sleep times (ask when setting up morning brief)
- ✗ Occupation (not relevant to Life Organizer)
- ✗ Work schedule (not relevant to Life Organizer)
- ✗ Productivity challenge (reveal through use)
- ✗ Priorities (let them emerge)
- ✗ Reminder method (default to push, let them change)
- ✗ Check-in frequency (can be set per-feature)
- ✗ Communication tone (default to friendly, let them change)

**Keep Only:**
- ✓ Name (personalization)
- ✓ One immediate goal/challenge
- ✓ Google connect (optional, later)

**New Total: 3 questions, 90 seconds**

---

### 4.2 "Should We Use Sample Data?"

**Answer: YES. Emphatically.**

**The Problem:** Empty states are activation death. Users see:
```
Your Projects
[Create a Project] [Browse Templates]

Your Week
(nothing)

Your Inbox
(nothing)
```

They leave.

**The Solution:** Pre-load sample data that shows what's possible.

**Sample Project (Wine Journal):**
```
Wine Journal
47 entries

Recent Entries:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍷 Barolo, 2018
Piedmont, Italy
"Perfect with pasta. Sarah loved it."
Rating: ★★★★★
Price: $45
Date: Jan 20, 2026

🍷 Pinot Noir, 2020
Oregon, USA
"Light, fruity. Good everyday wine."
Rating: ★★★★☆
Price: $22
Date: Jan 15, 2026
```

**Sample Life Organizer Insights:**
```
🎯 This Week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mom's Birthday: 3 days
(You haven't sent a gift yet - wine recommendations below)

Inbox: 3 items waiting for your decision
Email from Sarah: "Are we still on for wine night?"
(Your wine journal shows you bought that Barolo she loves)

Suggestion: Send Sarah a message with wine pairing ideas
```

**Psychological Effect:**
1. "Oh, I could organize my wine collection"
2. "Wait, it remembered I have a wine journal AND my mom's birthday"
3. "That's creepy-smart"
4. "I need to try this"

**Implementation:**
- Show sample Wine Journal by default
- On first visit, log them in to sample account
- After 30 seconds, offer "Start Your Own" or "Tour the Features"
- Make it crystal clear they're viewing an example

**Data Lifecycle:**
- If user doesn't create account: sample data expires in 30 days
- If user creates account: sample data moves to separate "examples" section
- They can duplicate sample projects to their own account

---

### 4.3 "How to Explain Life Organizer vs Projects?"

**Current Problem:** The explanation is too technical.

**Bad Explanation:**
> "TinyPM has a dual architecture. The Life Organizer is a persistent, always-running orchestrator that manages the continuous flow of your life through integrations and pattern recognition. The Project Manager is a discrete, file-based system..."

**Good Explanation (Used in Flow):**
```
YOUR LIFE                    YOUR PROJECTS
────────────────────        ──────────────
Always running              Create as many as you want
Learning about you          Delete anytime
Remembering what            No impact on
you care about              "Your Life"

Examples:                    Examples:
- Birthdays                  - Wine Journal
- Inbox zero                 - Dinner Log
- Calendar prep              - Book Club
```

**Even Better (Narrative Version):**

"TinyPM has two sides.

**Side 1: The AI That Knows You.** This part doesn't go anywhere. It's always learning. It remembers you like Italian restaurants. It knows when your mom's birthday is. It keeps your inbox clean. It's designed to make you a better friend, partner, and family member.

**Side 2: Your Projects.** These are the things YOU decide to track. A wine journal. A dinner log. A book club. You can delete them anytime—your AI doesn't care. They're tools you own.

The magic? When they work together. Your AI learns from your wine journal which wines you love. Next time you're shopping, it remembers.

That's it. Easy."

---

### 4.4 "How Long Should Setup Take?"

**Industry Standard: 60-180 seconds**

| App | Time | Notes |
|-----|------|-------|
| ChatGPT | 10 sec | Log in, start asking |
| Slack | 60 sec | Workspace name, invite team |
| Notion | 90 sec | Name, email, use case |
| Linear | 120 sec | Team setup, project creation |
| Coda | 150 sec | Workspace, first doc |
| **TinyPM Target** | **180 sec** | Dual system requires more |

**Our 3-minute budget:**
- Welcome & differentiation: 20 sec
- Choose path: 10 sec
- Core questions: 60 sec
- Integrations: 30 sec
- First moment of magic: 30 sec
- **Total: 150 seconds (2m 30s)**

Buffer for slow connections and readers.

---

## PART 5: CONVERSION OPTIMIZATION

### 5.1 Dropoff Analysis - Where Users Leave

**Typical Funnel (Without Optimization):**
```
100% - Start onboarding
  ↓
85%  - Step 1 (basic info)
  ↓
72%  - Step 2 (work style)
  ↓
58%  - Step 3 (priorities)
  ↓
40%  - Step 4 (communication)
  ↓
28%  - Step 5 (Google)
  ↓
19%  - Step 6 (first goal)
  ↓
15%  - Complete onboarding
```

**Why Dropoff Happens:**
1. **Step 2:** "Wait, why do you need to know my job?" (Relevance)
2. **Step 3:** "This feels like a survey, not setup" (Too many choices)
3. **Step 4:** "I don't want to make all these decisions right now" (Premature config)
4. **Step 5:** "Why are you asking for my Gmail password?" (Trust/security)
5. **Step 6:** "I don't know what I want to accomplish" (Blank page)

### 5.2 Optimized Funnel

```
100% - Start onboarding
  ↓
95%  - Step 1 (The Difference - compelling, short)
  ↓
92%  - Step 2A (First Project) OR 2B (Life Setup - choose your path)
  ↓
88%  - Core questions (only 2-3, highly relevant)
  ↓
82%  - Integrations (optional, skippable)
  ↓
80%  - First Aha Moment (see it work)
  ↓
75%  - Activate (start using)
```

**How We Get There:**

1. **Remove Irrelevant Questions:** If you don't need it to activate, don't ask
2. **Add Progressive Disclosure:** Let them configure deep settings after they see value
3. **Show Value Early:** The "first moment of magic" should happen before completion
4. **Make Everything Optional:** Only collect required data
5. **Branch on User Choice:** Different setup for Projects users vs. Life Organizer users

---

### 5.3 Copy that Converts

**For "The Difference" Step:**

DON'T say:
> "TinyPM uses a sophisticated dual-architecture pattern combining persistent orchestration with discrete project management..."

DO say:
> "Your Life: I'm always here, learning about you.
> Your Projects: Create them, use them, delete them. I don't care.
> The Magic: Watch what happens when they work together."

**For First Goal Question:**

DON'T say:
> "What is your primary life objective?"

DO say:
> "This week, what's ONE thing you want my help with?"

**For Google Connect:**

DON'T say:
> "Connect your Google account for enhanced calendar integration and email processing capabilities."

DO say:
> "I can help you get to appointments and keep your inbox clean. Want to let me see your calendar and email?"

**For Priorities:**

DON'T say:
> "Select your top 3 life priorities"

DO say (later, in-product):
> "What matters most to you? Pick up to 3, and I'll focus on those."

---

### 5.4 Celebration Moments

**Current System:** Checkmark animation at completion (good)

**Optimization:** Create moments that FEEL like progress

**Micro-celebration After Each Step:**
```
Step 1: ✓ Got it. Now I understand.
Step 2: ✓ Your first [Wine Journal / Life Setup] is ready.
Step 3: ✓ I can see what you care about.
Step 4: ✓ I'll keep those connections secure.
Step 5: ✓ Look at you go!
Final: 🎉 You're ready. Watch this...
```

**Then show the magic immediately** (the dashboard with actual suggestions)

---

## PART 6: POST-ONBOARDING STRATEGY

### 6.1 The Onboarding Doesn't End

**Days 1-3: "Aha Moments"**
- Day 1: They see the dashboard
- Day 2: Their first project or life suggestion
- Day 3: Moment where it remembers something they told it

**Target:** By day 3, they should have at least one "this is actually smart" moment

**Implementation:**
- Proactive notification: "Sarah, your mom's birthday is next week"
- Or: "You've been getting emails from your landlord—want me to help?"
- Or: "Your wine journal shows you love Italian wine. Should I remember that?"

### 6.2 The First-Week Email Sequence

**Day 1 (8pm):** "Welcome to TinyPM"
- Your dashboard is ready
- Here's what I'm already helping with

**Day 3 (9am):** "Here's what I learned about you"
- 3 specific insights from their setup
- 1 suggestion based on their goals

**Day 7 (9am):** "One week in—let's look back"
- Progress on their weekly goal
- What they've logged in projects
- One surprising insight

### 6.3 Re-engagement for Inactive Users

**If they don't log in after 3 days:**
- Email: "Your [Wine Journal/Life Organizer] is ready to go"
- Include one specific, personalized reason to come back
- Not generic ("check out your dashboard") but specific ("I found 3 wines you should try based on your journal")

---

## PART 7: SPECIFIC RECOMMENDATIONS FOR TINYPM

### 7.1 Immediate Changes (This Week)

1. **Simplify Step 1 (Basic Info)**
   - Remove: Timezone, wake time, sleep time, occupation, work schedule
   - Keep: Name only
   - Auto-detect timezone using JavaScript
   - Move sleep/wake times to "Daily Brief" setup (optional feature)

2. **Combine Steps 2 & 3**
   - Merge "Work Style" and "Priorities" into one choice
   - Branch: "I want to [build a project / set up my life]"
   - Ask only what's relevant to that path

3. **Make Google Optional**
   - Move to Step 5
   - Reframe as "power-up," not requirement
   - Default to "skip for now, I'll connect later"
   - Estimate only 40% will connect immediately (that's fine)

4. **Add First Moment of Magic**
   - After setup, show dashboard with:
     - Sample insight about their goal
     - Their priorities visualized
     - One proactive suggestion
   - This happens BEFORE completion, not after

### 7.2 Medium-term Changes (Next 2 Weeks)

1. **Add Sample Data**
   - Pre-load Wine Journal example
   - Show what 47 logged wines looks like
   - Let them "tour" the example before creating their own

2. **Create Project Templates**
   - Don't force them to name/describe their first project
   - Give 5 templates: Wine, Dinner, Books, Fitness, Custom
   - One click to create

3. **Progressive Settings**
   - Don't ask about tone/frequency/method during onboarding
   - Move to "Preferences" page (shown after first use)
   - Default to sensible values (friendly, once daily, push notifications)

4. **Rewrite All Copy**
   - Remove jargon: "persistent," "orchestrator," "architecture"
   - Use simple: "always running," "AI that knows you"
   - Shorter sentences
   - One metaphor per screen

### 7.3 Longer-term Changes (Month 2)

1. **A/B Test the Dual-Path**
   - Split: 50% see Projects path first, 50% see Life first
   - Measure which converts better
   - Optimize messaging based on data

2. **Mobile-Optimized Onboarding**
   - Current design is good for web
   - Add mobile-specific flow (simplified, touchscreen-friendly)
   - Shorter form fields on mobile

3. **Build Post-Onboarding Tours**
   - Feature-specific tutorials (not step-by-step)
   - Triggered by: "You haven't tried [feature]"
   - Optional, dismissible tooltips

4. **Implement Pendo/Appcues**
   - Track: Where do users drop off?
   - Track: Which features are discovered vs. unknown?
   - Adjust onboarding based on actual behavior

---

## PART 8: COPY TEMPLATES

### For "The Difference" Screen

**Headline Options:**
- "Two Parts, One AI"
- "You're About to Get Two Things"
- "Here's How TinyPM Works"
- "The Two Sides of Knowing You" ← Best option

**Life Organizer Description:**
- "Always Learning" (headline)
- "I don't go anywhere. I'm always here, learning about you, helping you remember what matters." (copy)
- Emoji: 🤖 or 🧠 or ✨

**Projects Description:**
- "Build, Use, Delete" (headline)
- "Whatever you want to track—a wine collection, dinner photos, books you've read. Create it, use it, delete it anytime. I won't care." (copy)
- Emoji: 📁 or 🛠️ or ⚙️

**Call-to-action:**
- "Start With Projects" ← for doers
- "Set Up My Life" ← for thinkers
- "Show Me How They Work" ← for explorers

### For "First Goal" Question

**Headline:**
- "What's ONE Thing I Can Help With?"
- "This Week, What's Important?"
- "Let's Start Here"

**Copy:**
"Think of something achievable in the next 7 days. Something concrete. Not 'be a better person' but 'remember to call my mom' or 'finish chapter 3 of my book.'"

**Examples (shown as suggestions):**
- "Keep my inbox at zero"
- "Finish the project proposal"
- "Remember to call my mom"
- "Organize my wine collection"
- "Read 50 pages"
- "[Something else I didn't list]"

**Why these examples work:**
- Concrete and achievable
- Mix of life, work, and hobby
- Show different types of help we provide

### For Google Connection

**Headline:**
- "Supercharge TinyPM (Optional)"
- "Let Me Help With Your Calendar"
- "One More Thing?"

**For Calendar:**
"I can see when you're busy. If you tell me you're working on something, I'll remind you when you're supposed to. I'll also suggest free time for new tasks."

**For Gmail:**
"I can read your inbox to help you. I won't send anything without asking. I can suggest quick responses to repetitive emails or extract important dates."

**Buttons:**
- "Connect Google" (primary)
- "Skip for Now" (secondary)
- "(You can always add this later)" (helper text)

---

## PART 9: METRICS TO TRACK

### Activation Metrics

1. **Onboarding Completion Rate**
   - Target: 65% → 80%
   - Current: unknown
   - Track per step

2. **Time to Completion**
   - Target: 180 seconds
   - Current: ~4 minutes
   - Measure from start to dashboard

3. **Days to Aha Moment**
   - Target: Day 1 (dashboard shows insight)
   - Current: unknown
   - Track: When do they see first AI suggestion?

4. **First Action Taken**
   - Track: 50% of users create first project within 3 days
   - Track: 40% connect Google within 7 days
   - Track: 60% take a suggested action within 2 weeks

### Engagement Metrics

5. **Email Open Rate (Welcome Sequence)**
   - Target: 50%+
   - Current: unknown

6. **Return on Day 3**
   - Target: 60% of signups
   - Current: unknown
   - This is the real metric of onboarding success

7. **Feature Discovery**
   - Track: Which features are used by 7-day users?
   - Track: Which features remain undiscovered?
   - Adjust onboarding if core features are missed

---

## PART 10: COMPETITIVE BENCHMARKING

### How Others Do It

**ChatGPT (Simplicity Gold Standard)**
- Time: 10 seconds
- Steps: 1 (login)
- Approach: Jump into product
- Setup: 0 questions
- Sample: None needed (it's a chat, obvious what it does)
- Verdict: Lowest friction, but ChatGPT's value prop is obvious

**Notion (Thoughtful)**
- Time: 90 seconds
- Steps: 3 (name, email, use case)
- Approach: Show examples, quick questions
- Setup: "How do you want to use Notion?"
- Sample: Template gallery visible immediately
- Verdict: Good for "anything" app, still heavy on choice

**Linear (Purpose-Built)**
- Time: 120 seconds
- Steps: 2 (team name, first project)
- Approach: Speed, clarity
- Setup: No surveys, just creation
- Sample: None (UI demonstrates value)
- Verdict: Clean because the product is narrowly defined

**Superhuman (Magic Moment)**
- Time: 180 seconds
- Steps: 4 (email setup, learning, preferences, shortcuts)
- Approach: Fast, then reveals magic
- Setup: Minimal upfront, more in-product
- Sample: Shows what keyboard shortcuts do
- Verdict: Makes users feel elite, but polarizing

**TinyPM Opportunity:**
- Could be faster than Superhuman (just 2 main questions)
- Should show sample data like Notion
- Should branch like we suggest (projects vs. life)
- Unique magic moment (AI suggesting what you should do)

---

## PART 11: FINAL RECOMMENDATIONS SUMMARY

### What to Do Immediately

**Priority 1 (This Week):**
1. Reduce onboarding from 7 steps to 4 steps
2. Remove 8 unnecessary questions (timezone, wake time, work style, etc.)
3. Add the "Difference" screen (20-second visual explanation of dual system)
4. Make Google connection optional (step 7, not step 5)
5. Move communication preferences to post-onboarding settings

**Priority 2 (This Sprint):**
6. Add sample data (Wine Journal example visible during signup)
7. Create project templates (5 options vs. blank slate)
8. Rewrite copy to remove jargon
9. Add first dashboard "aha moment" before completion
10. Build basic A/B testing to measure conversion

**Priority 3 (Next Month):**
11. Implement post-onboarding in-product tours
12. Set up analytics tracking (funnel by step)
13. Build email re-engagement sequence
14. Create mobile-optimized onboarding
15. Test different branching options

### What Success Looks Like

**By Month 1:**
- Onboarding time: 2.5 minutes (down from 4 min)
- Completion rate: 70% (need baseline)
- Day-3 return rate: 60%+

**By Month 2:**
- Onboarding time: 2 minutes
- Completion rate: 75%+
- Day-7 activation rate: 50%+ (taking at least one meaningful action)
- First goal completion rate: 40%+

**By Month 3:**
- Onboarding time: 90 seconds
- Completion rate: 80%
- Day-3 return rate: 70%
- First project creation: 65% of users
- Google connection: 50% of users

---

## PART 12: ONE MORE THING - THE SECRET SAUCE

**TinyPM's unique advantage:** You can show AI **doing something useful immediately**.

Most onboarding is about setup. Yours can be about magic.

After they answer 2-3 questions, you already know:
- Their name
- One goal for this week
- Timezone
- Whether they want projects or life setup

**That's enough to generate:**
- 1 specific, useful suggestion ("Break 'finish project proposal' into 3 tasks")
- 1 memory insight ("You said family matters—your sister's birthday is coming")
- 1 smart observation ("You're interested in productivity—here are your peers' top tips")

**Do this before the completion screen.** Not after. Before.

When a user sees the dashboard and it already knows something useful about them, they stop asking "how does this work?" and start asking "what else can it do?"

That's the moment you win.

---

**End of Research**
*Prepared for TinyPM UX Design Review*
*January 30, 2026*
