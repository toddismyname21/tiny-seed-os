# TinyPM Dual Architecture: Life Organizer + Project Manager

## The Vision

TinyPM has TWO distinct parts that work together but serve different purposes:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TinyPM Application                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    THE LIFE ORGANIZER                              │ │
│  │                  "The Great Orchestrator"                          │ │
│  │                                                                    │ │
│  │  • Always running - NEVER stops                                    │ │
│  │  • Manages the continuous flow of your life                        │ │
│  │  • Persistent state, learns over time                              │ │
│  │  • One instance per user, forever                                  │ │
│  │                                                                    │ │
│  │  Features:                                                         │ │
│  │  ├── Email Zero: Keeps your inbox clean                            │ │
│  │  ├── Calendar Guardian: Gets you to appointments                   │ │
│  │  ├── Relationship Memory: Remembers what people appreciate         │ │
│  │  ├── Proactive Nudges: Helps you be a better person                │ │
│  │  ├── Daily Brief: What you need to know each morning               │ │
│  │  └── Life Patterns: Learns your rhythms and preferences            │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ↕                                           │
│                    (coordinates with)                                    │
│                              ↕                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    THE PROJECT MANAGER                             │ │
│  │                  "Discrete File-Based Projects"                    │ │
│  │                                                                    │ │
│  │  • Each project = a discrete file/folder                           │ │
│  │  • Create as many as you want                                      │ │
│  │  • Delete anytime without affecting Life Organizer                 │ │
│  │  • Store anywhere: cloud OR local                                  │ │
│  │                                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │ 🍽️ Dinner    │  │ 🍷 Wine      │  │ 📚 Books    │  ...          │ │
│  │  │    Log       │  │   Journal    │  │   I've Read  │              │ │
│  │  │              │  │              │  │              │              │ │
│  │  │ Log dinner   │  │ Take photo   │  │ Track books  │              │ │
│  │  │ every night  │  │ Log thoughts │  │ Add notes    │              │ │
│  │  │ Photos/notes │  │ Remember     │  │ Ratings      │              │ │
│  │  │              │  │ favorites    │  │              │              │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: The Life Organizer (The Great Orchestrator)

### Core Philosophy
> "It doesn't stop. It just goes and goes and goes."

The Life Organizer is your persistent AI companion that:
- Runs continuously in the background
- Learns your patterns over time
- Never gets deleted (it IS you)
- Accumulates wisdom about your life

### Features

#### 1. Email Zero Guardian
- Monitors inbox continuously
- Auto-categorizes, auto-responds where appropriate
- Surfaces what needs YOUR attention
- Never lets things fall through the cracks

#### 2. Calendar Guardian
- Ensures you get to appointments
- Prep reminders before meetings
- Travel time calculations
- Conflict detection and resolution

#### 3. Relationship Memory
- Remembers what friends/family appreciate
- Tracks important dates (birthdays, anniversaries)
- Notes conversation topics to follow up on
- "Your sister mentioned she was stressed about X last week"

#### 4. Proactive Life Coach
- Nudges you to be a better person
- "You haven't called your mom in 2 weeks"
- "It's your friend's birthday tomorrow"
- "You said you wanted to exercise more - it's been 3 days"

#### 5. Daily Brief
- Morning summary of what matters today
- Upcoming deadlines
- Relationship opportunities
- Weather/travel alerts

### Technical Implementation

```
life_organizer/
├── core/
│   ├── orchestrator.py      # Main always-running loop
│   ├── memory.py            # Long-term memory store
│   └── patterns.py          # Life pattern learning
├── integrations/
│   ├── email.py             # Email Zero
│   ├── calendar.py          # Calendar Guardian
│   └── contacts.py          # Relationship Memory
├── agents/
│   ├── email_agent.py
│   ├── calendar_agent.py
│   └── relationship_agent.py
└── data/
    └── life_memory.db       # Persistent, never deleted
```

---

## Part 2: The Project Manager (Discrete Projects)

### Core Philosophy
> "Each project is a file. Create, use, delete. The Life Organizer keeps going."

Projects are discrete units of organization for specific goals:
- Self-contained files/folders
- Can be stored ANYWHERE (cloud or local)
- Can be deleted without losing Life Organizer data
- Each project has its own structure

### Example Projects

#### 🍽️ Dinner Log Project
```
dinner_log/
├── project.json           # Project metadata
├── entries/
│   ├── 2026-01-15.json   # What I had, photo, notes
│   ├── 2026-01-16.json
│   └── ...
├── photos/
│   ├── 2026-01-15_dinner.jpg
│   └── ...
└── stats/
    └── favorites.json     # Most common dishes, ratings
```

**User Experience:**
- "Log tonight's dinner" → opens camera, logs meal
- "What did I have last Tuesday?" → instant recall
- "Show me my favorite restaurants this month"

#### 🍷 Wine Journal Project
```
wine_journal/
├── project.json
├── entries/
│   ├── wine_001.json     # Name, photo, tasting notes, rating
│   ├── wine_002.json
│   └── ...
├── photos/
│   ├── wine_001_label.jpg
│   └── ...
└── favorites/
    └── top_wines.json    # Your highest rated
```

**User Experience:**
- At restaurant: "Log this wine" → snap photo of label
- "What was that red I loved at the Italian place?"
- "I'm at a wine store, recommend something similar to wines I've liked"

#### 📚 Books I've Read Project
```
books_read/
├── project.json
├── entries/
│   ├── book_001.json    # Title, author, notes, rating
│   └── ...
└── lists/
    ├── want_to_read.json
    └── favorites.json
```

### Project File Format

Each project has a standard `project.json`:

```json
{
  "id": "wine_journal_20260115",
  "name": "Wine Journal",
  "type": "tracking",
  "icon": "🍷",
  "created": "2026-01-15T10:30:00Z",
  "storage": "local",          // or "cloud"
  "storage_path": "/Users/me/TinyPM/projects/wine_journal",
  "schema": {
    "entry_type": "wine",
    "fields": ["name", "photo", "notes", "rating", "price", "occasion"]
  },
  "stats": {
    "total_entries": 47,
    "last_entry": "2026-01-28T20:15:00Z"
  }
}
```

### Storage Options

**Local Storage:**
```
~/TinyPM/projects/
├── dinner_log/
├── wine_journal/
└── books_read/
```

**Cloud Storage (Supabase/S3):**
```
supabase.storage/
└── user_123/
    └── projects/
        ├── dinner_log/
        ├── wine_journal/
        └── books_read/
```

---

## How They Work Together

### Scenario: Wine Dinner

1. **Life Organizer** reminds you: "Dinner with Sarah at 7pm - she mentioned last time she loves Italian food"

2. You're at dinner, you order a wine you love

3. **Project Manager (Wine Journal)**: "Log this wine" → snap photo → "Amazing Barolo, perfect with pasta, Sarah loved it too"

4. **Life Organizer** notes: "Sarah enjoyed the Barolo - remember for future"

5. Next time you're buying wine for Sarah, **Life Organizer** + **Wine Journal** together: "Sarah loved that Barolo from your wine journal"

### The Boundary

| Life Organizer | Project Manager |
|----------------|-----------------|
| Always running | Start/stop per project |
| One instance forever | Many instances, create/delete freely |
| Core life data | Hobby/goal specific data |
| Never deleted | Delete anytime |
| Learns YOU | Tracks THINGS |
| Persistent memory | File-based storage |

---

## Implementation Priority

### Phase 1: Foundation
1. Define project file format standard
2. Create project CRUD operations
3. Build project storage abstraction (local + cloud)
4. Create first example project (Dinner Log or Wine Journal)

### Phase 2: Life Organizer Core
1. Always-running orchestrator loop
2. Email Zero integration
3. Calendar Guardian
4. Relationship Memory database

### Phase 3: Integration
1. Life Organizer <-> Project cross-references
2. "This wine entry relates to dinner with Sarah"
3. Unified search across life + projects

### Phase 4: Project Templates
1. Pre-built project types users can spin up
2. Dinner Log template
3. Wine Journal template
4. Book Tracker template
5. Fitness Log template
6. Custom project builder

---

## The User Experience

### Opening TinyPM

```
┌─────────────────────────────────────────────────────────────────┐
│  TinyPM                                         [Life] [Projects]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Good evening, Sam.                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🌅 TODAY                                                 │   │
│  │  ✓ Email at zero (3 need your decision)                  │   │
│  │  📅 Dinner with Sarah at 7pm (Italian, she loves!)       │   │
│  │  💡 Reminder: Mom's birthday in 3 days                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📁 YOUR PROJECTS                                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │   │
│  │  │ 🍽️      │  │ 🍷      │  │ 📚      │  │  ➕     │      │   │
│  │  │ Dinner  │  │ Wine    │  │ Books   │  │  New    │      │   │
│  │  │ Log     │  │ Journal │  │ Read    │  │ Project │      │   │
│  │  │         │  │         │  │         │  │         │      │   │
│  │  │ 127     │  │ 47      │  │ 23      │  │         │      │   │
│  │  │ entries │  │ entries │  │ entries │  │         │      │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  "Log tonight's dinner"  [🎤]                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Promise

**Life Organizer**: "I'll make you a better friend, partner, and family member by remembering the things that people appreciate and keeping you on top of your life."

**Project Manager**: "Whatever you want to track, log, or remember - create a project. Delete it when you're done. Your life goes on."

**Together**: "Your complete life system. The AI that knows you AND helps you build the habits and collections that matter to you."

---

*Created: 2026-01-30*
*Architecture Version: 1.0*
