# Navigation Patterns - 2026 Best Practices

## The Golden Rule

**3-5 primary navigation items maximum.**

More than 5 = decision paralysis, slower task completion, higher cognitive load.

---

## Research-Backed Guidelines

| Context | Recommended Items | Rationale |
|---------|-------------------|-----------|
| **Mobile bottom nav** | 3-5 items | Thumb reach, scannability |
| **Desktop top nav** | 5-7 items max | Hick's Law, visual scanning |
| **Sidebar nav** | 5-9 items with grouping | Can scroll, needs hierarchy |

---

## Primary Navigation Patterns

### 1. Tab Bar (Mobile)
```
[Home] [Search] [Create] [Notifications] [Profile]
```
- Maximum 5 items
- Icons + labels (not icons alone)
- Touch targets: 44px minimum
- Active state clearly visible

### 2. Top Navigation (Desktop)
```
Logo    [Nav1] [Nav2] [Nav3] [Nav4]    [Search] [Profile]
```
- Primary actions left-aligned
- Utility actions right-aligned
- Current page highlighted
- Dropdowns for sub-navigation

### 3. Sidebar Navigation
```
┌─────────────────┐
│ Logo            │
├─────────────────┤
│ ▸ Section 1     │
│   - Item 1.1    │
│   - Item 1.2    │
│ ▸ Section 2     │
│ ▸ Section 3     │
├─────────────────┤
│ Settings        │
│ Help            │
└─────────────────┘
```
- Collapsible sections
- Current item highlighted
- Settings/Help at bottom
- Collapse option for more screen space

---

## Secondary Navigation Patterns

### Command Palette (Cmd+K)
Essential for power users in 2026.
```
┌─────────────────────────────────┐
│ 🔍 Search or type a command... │
├─────────────────────────────────┤
│ Recent                          │
│   ▸ Open Dashboard              │
│   ▸ Create New Task             │
│ Actions                         │
│   ▸ Settings                    │
│   ▸ Export Data                 │
└─────────────────────────────────┘
```
- Fuzzy search
- Keyboard navigation
- Recent/frequent items first
- Context-aware suggestions

### Breadcrumbs
```
Home > Projects > Project Alpha > Task 123
```
- Use for deep hierarchies (3+ levels)
- Each item clickable
- Current page not linked

### "More" Menu
For features that don't fit primary nav:
```
[☰ More]
  ├─ Activity
  ├─ Settings
  ├─ Help & Support
  ├─ Developer Tools
  └─ Log Out
```

---

## Mobile-Specific Patterns

### Bottom Sheet Navigation
Swipe up to reveal:
```
──────────────────
       ─        (drag handle)

  [Action 1]
  [Action 2]
  [Action 3]

  [Cancel]
──────────────────
```

### Gesture Navigation
- Swipe left: Delete/archive
- Swipe right: Complete/favorite
- Long press: Context menu
- Pull down: Refresh

### Tab Bar with FAB
```
[Tab1] [Tab2]  [+]  [Tab3] [Tab4]
                ↑
          Floating Action Button
```

---

## Anti-Patterns to Avoid

### 1. Hamburger Menu as Primary Nav
- Hides all navigation
- Reduces discoverability by 50%+
- Use only for secondary items

### 2. Too Many Top-Level Items
```
Bad:  [Home][Tasks][Projects][Calendar][Team][Reports][Settings][Help][Profile]
Good: [Home][Tasks][Projects][More ▾]
```

### 3. Mystery Icons
```
Bad:  [?] [⚙] [☰] [✎]  (What do these mean?)
Good: [Help] [Settings] [Menu] [Edit]
```

### 4. Inconsistent Placement
If nav is on left on one page, it should be on left everywhere.

### 5. Deep Nesting
```
Bad:  Home > Settings > Advanced > Security > Passwords > Change
Good: Home > Settings > Change Password
```

---

## Navigation Hierarchy Framework

### Level 1: Always Visible
- Primary navigation (3-5 items)
- Current location indicator
- Search (if applicable)
- Profile/account

### Level 2: One Click Away
- Sub-navigation within sections
- Quick actions
- Notifications

### Level 3: Behind Menu/Search
- Settings
- Help & Support
- Less-used features
- Admin functions

### Level 4: Deep Links Only
- Developer tools
- Debug modes
- Legacy features
- API documentation

---

## Testing Navigation

### Card Sorting
Ask users to group features into categories.
Reveals mental models and expected hierarchy.

### Tree Testing
Give users tasks, see if they can find features.
Tests findability without visual design.

### First-Click Testing
Where do users click first for a given task?
First click correct = 87% task success.

### Analytics
- Navigation click patterns
- Search queries (what can't users find?)
- Drop-off points

---

## Sources
- Nielsen Norman Group - Navigation guidelines
- Baymard Institute - E-commerce navigation
- Material Design 3 - Navigation patterns
- Apple HIG - Tab bars and navigation
- Linear, Notion, Figma - Modern SaaS patterns
