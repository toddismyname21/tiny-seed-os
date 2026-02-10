# Progressive Disclosure - 2026 Best Practices

## What Is Progressive Disclosure?

A design pattern that sequences information and actions across several screens to reduce cognitive load. Show only what's needed NOW; reveal more as users demonstrate readiness.

---

## The 4 Levels

| Level | Content | Trigger | Example |
|-------|---------|---------|---------|
| **Immediate** | Core, most-used features | Always visible | Task title, status, due date |
| **First interaction** | Common options | User clicks/hovers | Priority, assignee, tags |
| **Demonstrated readiness** | Advanced features | User scrolls/explores | Subtasks, attachments, history |
| **Expert mode** | Power features | Keyboard shortcuts, settings | Automation rules, API access |

---

## Implementation Patterns

### 1. Accordions / Collapsibles
- Click header to expand
- Good for: Settings, additional details
- Example: "More options" sections

### 2. Tabs
- Organize content across panels
- Good for: Different categories of same data
- Maximum: 5 tabs (ideally 3-4)

### 3. Dropdown Menus
- Appear on button/link interaction
- Good for: Actions, filters, selections
- Keep to 7 items max per menu

### 4. Scroll-Based Revelation
- Natural progressive disclosure as users scroll
- Good for: Long-form content, feeds
- Example: Notion's AI feature page

### 5. Contextual Menus
- Right-click or hover to reveal
- Good for: Power user actions
- Always have keyboard equivalent

### 6. Details/Summary (HTML)
```html
<details>
  <summary>Advanced Settings</summary>
  <div>Hidden content here</div>
</details>
```

---

## Best Practices

### DO:
- Identify essential vs. advanced through USER RESEARCH (not assumptions)
- Keep important information visible - never hide critical actions
- Use card sorting and task analysis to determine hierarchy
- Group additional features logically before revealing
- Test with real users to validate hierarchy

### DON'T:
- Hide primary actions behind menus
- Require more than 2 clicks for common tasks
- Use progressive disclosure as an excuse for poor information architecture
- Make users hunt for basic features
- Assume what's "advanced" without data

---

## Notion's Approach (Gold Standard)

1. **Database views** show simple tables first
2. **Filters, sorting, layouts** hidden behind menus
3. **Properties** expand on click
4. **Templates** only appear when creating
5. **API/advanced** buried in settings

Result: Complexity available but never overwhelming.

---

## How to Decide What to Hide

### Always Visible (Level 1):
- Primary action (Create, Save, Submit)
- Current status/state
- Navigation to main sections
- Search

### On Interaction (Level 2):
- Secondary actions
- Filters and sorting
- Edit/modify options
- Sharing

### Behind "More" (Level 3):
- Rarely-used features
- Configuration
- History/logs
- Export/import

### Settings Only (Level 4):
- Integrations
- API access
- Automation
- Developer tools

---

## Sources
- Interaction Design Foundation (IxDF)
- Nielsen Norman Group - "Progressive Disclosure"
- Notion Design Philosophy
- Linear App Case Study
