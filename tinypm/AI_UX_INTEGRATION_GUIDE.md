# AI UX & Guided Rituals - Integration Guide

## Team 3 Deliverables

**Created:** 2026-02-03
**Author:** Claude (AI UX & Guided Rituals Team)

---

## Overview

This guide explains how to integrate the AI UX & Guided Rituals system into TinyPM. The system makes the AI feel like a brilliant, proactive Chief of Staff rather than a basic chatbot.

### Components Created

| File | Purpose | Size |
|------|---------|------|
| `static/js/ai-rituals.js` | Morning Planning & Evening Shutdown Rituals | ~35KB |
| `static/js/ai-nudges.js` | Non-intrusive Proactive Nudge System | ~25KB |
| `static/js/explainable-ai.js` | Explainable AI Decisions & Loading States | ~30KB |
| `static/js/smart-capture.js` | Natural Language Task Entry | ~20KB |

---

## Installation

### 1. Include Scripts in Your HTML

Add these script tags before the closing `</body>` tag:

```html
<!-- AI UX Components -->
<script src="static/js/ai-rituals.js"></script>
<script src="static/js/ai-nudges.js"></script>
<script src="static/js/explainable-ai.js"></script>
<script src="static/js/smart-capture.js"></script>
```

### 2. Ensure LocalStorage is Available

The components use localStorage for:
- `tinypm_user_profile` - User preferences and state
- `tinypm_tasks` - Task data
- `tinypm_nudge_history` - Nudge interaction history
- `tinypm_morning_ritual_dismissed` - Ritual dismissal state
- `tinypm_evening_ritual_dismissed` - Ritual dismissal state

---

## Component Usage

### Morning Planning Ritual

The morning ritual automatically shows between 6 AM - 10 AM if not dismissed recently.

**Manual Trigger:**
```javascript
AIRituals.showMorningRitual();
```

**Features:**
- Step 1: Day overview with stats (overdue, due today, high priority)
- Step 2: AI-powered task prioritization with drag-to-reorder
- Step 3: Ready summary with affirmation and focus mode option

**Customization:**
```javascript
// Change time window
AIRituals.config.morningStart = 5;  // 5 AM
AIRituals.config.morningEnd = 11;   // 11 AM

// Change dismissal duration (hours)
AIRituals.config.ritualDismissHours = 12;
```

---

### Evening Shutdown Ritual

The evening ritual automatically shows between 5 PM - 9 PM.

**Manual Trigger:**
```javascript
AIRituals.showEveningRitual();
```

**Features:**
- Step 1: Day celebration with completion stats
- Step 2: Brain dump for capturing tomorrow's tasks
- Step 3: Tomorrow preview with warnings

---

### Proactive AI Nudges

Nudges appear non-intrusively in the bottom-right corner.

**Show a Custom Nudge:**
```javascript
AINudges.showNudge({
    id: 'unique-nudge-id',
    type: 'ai_insight',  // task_due, task_overdue, achievement, etc.
    title: 'Your nudge title',
    message: 'Detailed message here',
    reasoning: 'Why this matters (optional)',
    actions: [
        { label: 'Do it', action: () => console.log('Action clicked') }
    ],
    confidence: 0.85  // 0-1
});
```

**Available Nudge Types:**
- `task_due` - Orange, for upcoming deadlines
- `task_overdue` - Red, for overdue tasks
- `weather_alert` - Blue, for weather-based suggestions
- `pattern_suggestion` - Purple, for learned patterns
- `achievement` - Green, for celebrations
- `break_reminder` - Purple, for break suggestions
- `ai_insight` - Purple, general AI insights

**Show an Achievement:**
```javascript
AINudges.showAchievement(
    "You're crushing it!",
    "5 tasks completed before noon!"
);
```

**Configuration:**
```javascript
AINudges.config.maxVisible = 2;          // Max nudges at once
AINudges.config.autoDismissDelay = 5000; // 5 seconds
AINudges.config.snoozeMinutes = 30;      // 30 minutes
```

---

### Explainable AI Decisions

When AI makes suggestions, ALWAYS show reasoning.

**Create a Suggestion Card:**
```javascript
const card = ExplainableAI.createSuggestionCard({
    title: "I recommend focusing on [Task X] next",
    subtitle: "Based on your current workload",
    confidence: 0.88,
    reasons: [
        "It's blocking 3 other tasks",
        "Due in 2 days with 4 hours of work estimated",
        "You're most productive on this type of task in the morning"
    ],
    evidence: [
        { type: 'data', label: '3 blocked tasks' },
        { type: 'pattern', label: 'Morning productivity' }
    ],
    alternatives: [
        { title: "Work on Task Y instead", reason: "Also high priority" }
    ],
    onAccept: () => console.log('Accepted'),
    onIgnore: () => console.log('Ignored')
});

// Add to DOM
document.getElementById('suggestions').appendChild(card);
```

**Create a Thinking Indicator:**
```javascript
const indicator = ExplainableAI.createThinkingIndicator('analyzing');
document.getElementById('ai-response').appendChild(indicator);

// Update stage
// Stages: 'analyzing', 'thinking', 'processing', 'generating', 'almost'
```

**Stream Text (Typing Effect):**
```javascript
const container = ExplainableAI.createStreamingContainer();
document.getElementById('response').appendChild(container);

await ExplainableAI.streamText(
    container,
    "This is the AI response that will appear word by word...",
    30  // Speed in ms per character
);
```

---

### Smart Quick Capture

Natural language task entry with real-time parsing.

**Open Quick Capture:**
```javascript
SmartCapture.open();
// Or use keyboard shortcut: Cmd/Ctrl + K or Cmd/Ctrl + Q
```

**Supported Natural Language Patterns:**

| Input | Parsed Result |
|-------|---------------|
| "Call John tomorrow at 2pm" | Task: "Call John", Due: Tomorrow 2:00 PM |
| "Finish report #work urgent" | Task: "Finish report", Tag: work, Priority: high |
| "Buy groceries next friday" | Task: "Buy groceries", Due: Next Friday |
| "Review proposal for 2 hours" | Task: "Review proposal", Duration: 120 min |

**Trigger Programmatically:**
```javascript
// Get parsed task data
const parsed = SmartCapture.state.parsedTask;
// { title, dueDate, dueTime, priority, duration, tags, confidence }
```

---

## Event Hooks

The components emit events for integration with other parts of your app:

```javascript
// When a ritual completes
window.addEventListener('ritualComplete', (e) => {
    console.log('Ritual completed:', e.detail.type); // 'morning' or 'evening'
});

// When a task is created via quick capture
window.addEventListener('taskCreated', (e) => {
    console.log('New task:', e.detail);
});

// When focus on a task is requested
window.addEventListener('focusTask', (e) => {
    const taskId = e.detail.taskId;
    // Navigate to task or open task modal
});

// When task editor should open
window.addEventListener('openTaskEditor', (e) => {
    const parsedData = e.detail;
    // Open your task editor with pre-filled data
});
```

---

## Task Data Format

The components expect tasks in this format:

```javascript
{
    id: "uuid-string",
    title: "Task title",
    description: "Optional description",
    status: "pending" | "in_progress" | "completed",
    priority: "high" | "medium" | "low",
    due_date: "2026-02-03",           // YYYY-MM-DD
    due_time: "14:00",                // HH:MM
    completed_at: "2026-02-03T...",   // ISO string
    created_at: "2026-02-03T...",     // ISO string
    tags: ["tag1", "tag2"],
    estimated_duration: 60            // minutes
}
```

---

## Design Principles

### 1. AI Should Feel Helpful, Not Intrusive

- Nudges auto-dismiss after 5 seconds
- Maximum 2 nudges visible at once
- Minimum 2 minutes between nudges
- Snooze option for 30 minutes

### 2. Always Explain AI Decisions

- Show confidence level (high/medium/low)
- Provide reasoning with bullet points
- Offer alternatives when available
- Never hide the "why"

### 3. Respect Task Boundaries

- Morning ritual: 6 AM - 10 AM only
- Evening ritual: 5 PM - 9 PM only
- Don't interrupt mid-task
- Wait for natural pauses

### 4. Smart Loading States

- Never show raw "Loading..."
- Use animated thinking indicators
- Show progress stages when appropriate
- Stream text for long responses

---

## Mobile Responsiveness

All components are mobile-friendly:
- Rituals resize to fit screen
- Nudges slide from bottom on mobile
- Quick capture takes full width
- Touch-friendly tap targets (44px minimum)

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Voice input requires Web Speech API support.

---

## Troubleshooting

### Rituals Not Showing

1. Check time of day is within configured window
2. Check localStorage for recent dismissal
3. Verify `tinypm_user_profile` exists

### Nudges Not Appearing

1. Check `maxVisible` limit
2. Check `minTimeBetweenNudges` setting
3. Verify nudge wasn't recently dismissed

### Quick Capture Not Parsing

1. Ensure input length >= 3 characters
2. Check console for parsing errors
3. Verify patterns match expected format

---

## Dependencies

- No external dependencies required
- Uses native browser APIs
- Self-contained CSS (injected via JavaScript)
- LocalStorage for persistence

---

## Future Enhancements

1. **Calendar Integration** - Connect to Google Calendar for event display
2. **Weather API** - Real-time weather nudges for farm operations
3. **Pattern Learning** - Machine learning for better predictions
4. **Voice Commands** - Full voice control support
5. **Team Nudges** - Cross-user notifications for teams

---

## Credits

- **Reference Products:** Superhuman, Motion, Sunsama
- **Research Base:** `/tinypm/PROACTIVE_AI_RESEARCH_2026.md`
- **Existing Systems:** `/tinypm/nudge_engine.py`, `/tinypm/pm_brain.py`

---

## Support

For issues or questions, check:
- `CLAUDE.md` - Project rules
- `SYSTEM_MANIFEST.md` - System inventory
- `CHANGE_LOG.md` - Recent changes
