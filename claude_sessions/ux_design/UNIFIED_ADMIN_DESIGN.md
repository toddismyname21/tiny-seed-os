# Unified Admin Design Specification

**Created:** 2026-01-16
**By:** UX/Design Claude
**Version:** 1.0

---

## Design Vision

Create a **cohesive, professional admin experience** where every page feels like part of the same application. Users should never feel "lost" or wonder which app they're in.

**Design Principles:**
1. **Consistency** - Same patterns everywhere
2. **Efficiency** - Minimal clicks to any feature
3. **Clarity** - Information hierarchy is obvious
4. **Dark Mode First** - Outdoor/low-light optimized

---

## Color System

### Primary Palette

```css
:root {
    /* Brand Greens */
    --primary: #2d5a27;           /* Main actions, sidebar active */
    --primary-light: #4a7c43;     /* Hover states, highlights */
    --primary-dark: #1e3d1a;      /* Pressed states */

    /* Semantic Colors */
    --success: #2a9d8f;           /* Completed, good status */
    --warning: #e9c46a;           /* Attention needed */
    --danger: #e63946;            /* Errors, destructive actions */
    --info: #3b82f6;              /* Informational */
    --secondary: #f4a261;         /* Secondary accents */

    /* Background Hierarchy */
    --bg-dark: #1a1a2e;           /* Main background */
    --bg-card: #16213e;           /* Cards, sidebar */
    --bg-light: #0f3460;          /* Elevated elements */
    --bg-input: #1e293b;          /* Form inputs */

    /* Text */
    --text-primary: #edf2f4;      /* Primary text */
    --text-secondary: #8d99ae;    /* Labels, secondary */
    --text-muted: #64748b;        /* Hints, disabled */

    /* Borders */
    --border: rgba(255,255,255,0.1);
    --border-active: rgba(74, 124, 67, 0.5);
}
```

### Usage Rules

| Use Case | Color |
|----------|-------|
| Primary buttons | `--primary` gradient |
| Sidebar active state | `--primary-light` |
| Success indicators | `--success` |
| Warnings/Overdue | `--warning` |
| Errors/Delete | `--danger` |
| Card backgrounds | `--bg-card` |
| Page background | `--bg-dark` |

---

## Typography

```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Scale */
--font-xs: 0.7rem;      /* 11.2px - labels, badges */
--font-sm: 0.85rem;     /* 13.6px - secondary text */
--font-base: 1rem;      /* 16px - body text */
--font-lg: 1.25rem;     /* 20px - section titles */
--font-xl: 1.5rem;      /* 24px - page titles */
--font-2xl: 2rem;       /* 32px - stats, heroes */
--font-3xl: 2.5rem;     /* 40px - large numbers */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

---

## Layout Architecture

### Overall Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APP SHELL                                    │
├────────────┬────────────────────────────────────────────────────────┤
│            │  HEADER (Fixed)                                        │
│            │  ┌──────────────────────────────────────────────────┐  │
│  SIDEBAR   │  │ Page Title    │ Search │ Notifications │ User   │  │
│  (Fixed)   │  └──────────────────────────────────────────────────┘  │
│            ├────────────────────────────────────────────────────────┤
│  260px     │  MAIN CONTENT (Scrollable)                            │
│            │                                                        │
│  Logo      │  ┌──────────────────────────────────────────────────┐  │
│  ────────  │  │  Stats Bar / KPIs                                │  │
│  Nav Items │  └──────────────────────────────────────────────────┘  │
│            │                                                        │
│  Dashboard │  ┌──────────────────────────────────────────────────┐  │
│  Planning  │  │                                                  │  │
│  Growing   │  │  PRIMARY CONTENT                                 │  │
│  Operations│  │  (Tables, Charts, Forms, etc.)                   │  │
│  Team      │  │                                                  │  │
│  ────────  │  │                                                  │  │
│  Settings  │  │                                                  │  │
│            │  └──────────────────────────────────────────────────┘  │
│            │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

### Dimensions

```css
--sidebar-width: 260px;
--header-height: 64px;
--content-max-width: 1600px;
--content-padding: 2rem;
--card-border-radius: 12px;
--button-border-radius: 10px;
```

---

## Sidebar Navigation

### ASCII Wireframe

```
┌──────────────────────┐
│  🌱 Tiny Seed OS     │  <- Logo area
│                      │
├──────────────────────┤
│  + Quick Add         │  <- Primary CTA (green button)
├──────────────────────┤
│  ⌘K Search...        │  <- Command palette trigger
├──────────────────────┤
│  OVERVIEW            │  <- Section label
│  ○ Dashboard         │
│  ○ Calendar          │
│  ○ Tasks             │
├──────────────────────┤
│  PLANNING            │
│  ● Crop Plan  (12)   │  <- Active state + badge
│  ○ Successions       │
│  ○ Bed Assignment    │
├──────────────────────┤
│  GROWING             │
│  ○ Greenhouse  ⚠     │  <- Warning indicator
│  ○ Seeds             │
│  ○ Fields            │
├──────────────────────┤
│  OPERATIONS          │
│  ○ Labels            │
│  ○ Sowing Sheets     │
│  ○ Harvest Log       │
│  ○ Soil Tests        │
├──────────────────────┤
│  TEAM                │
│  ○ Employees         │
│  ○ Time Tracking     │
│  ○ Messages          │
├──────────────────────┤
│  ────────────────    │
│  ○ Settings          │
│  ○ Help              │
└──────────────────────┘
```

### Nav Item States

| State | Visual |
|-------|--------|
| Default | Gray text, no background |
| Hover | Light background, white text |
| Active | Green background, green left border, white text |
| With Badge | Red/green pill on right |
| With Warning | Yellow warning icon |

---

## Header Component

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    📅 Calendar View                    🔔  👤 John D.   │
│            └─ Page title with icon              │    └─ Avatar  │
│                                                 └─ Notifications │
└─────────────────────────────────────────────────────────────────┘
```

### Specifications

- Height: 64px
- Background: `--bg-card` with blur backdrop
- Back button: Only shown on sub-pages (not dashboard)
- Search: Global search accessible via `⌘K`
- Notifications: Badge count for unread
- User: Avatar + name, dropdown for settings/logout

---

## Card Component

### Standard Card

```
┌─────────────────────────────────────────────────────────────────┐
│  CARD HEADER                                           Actions  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Card content goes here                                         │
│                                                                 │
│  Can contain:                                                   │
│  - Tables                                                       │
│  - Forms                                                        │
│  - Stats                                                        │
│  - Charts                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CSS

```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
}

.card-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-body {
    padding: 1.5rem;
}
```

---

## Stats Component

### Stat Card Grid

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│     🌿      │ │     📅      │ │     ⚠️      │ │     ✅      │
│    127      │ │     45      │ │     12      │ │    89%      │
│  Plantings  │ │  This Week  │ │  Overdue    │ │  On Track   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### CSS

```css
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
}

.stat-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.stat-value { font-size: 2.5rem; font-weight: 800; }
.stat-label { font-size: 0.85rem; color: var(--text-secondary); }
```

---

## Button System

### Variants

| Variant | Use Case | Background |
|---------|----------|------------|
| Primary | Main actions | Green gradient |
| Secondary | Alternative actions | `--bg-light` |
| Danger | Destructive actions | `--danger` |
| Ghost | Tertiary actions | Transparent |

### Sizes

| Size | Padding | Font |
|------|---------|------|
| sm | 8px 16px | 0.85rem |
| md | 12px 24px | 1rem |
| lg | 16px 32px | 1.1rem |

### CSS

```css
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(45, 90, 39, 0.4);
}
```

---

## Form Components

### Input Field

```
┌─────────────────────────────────────────────────────────────────┐
│  Label                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🔍  Placeholder text...                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Helper text or error message                                   │
└─────────────────────────────────────────────────────────────────┘
```

### CSS

```css
.form-input {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-input);
    border: 2px solid var(--border);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-light);
    background: var(--bg-dark);
}

.form-input.error {
    border-color: var(--danger);
}
```

---

## Table Component

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Crop          │ Field    │ Status     │ Due Date   │ Actions  │
├─────────────────────────────────────────────────────────────────┤
│  Tomatoes      │ A-1      │ ● Active   │ Mar 15     │ ⋮        │
│  Lettuce       │ B-2      │ ○ Planned  │ Mar 18     │ ⋮        │
│  Carrots       │ A-3      │ ⚠ Overdue  │ Mar 10     │ ⋮        │
└─────────────────────────────────────────────────────────────────┘
```

### CSS

```css
.table {
    width: 100%;
    border-collapse: collapse;
}

.table th {
    text-align: left;
    padding: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
}

.table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
}

.table tr:hover {
    background: rgba(255,255,255,0.02);
}
```

---

## Responsive Behavior

### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### Tablet (< 1024px)

- Sidebar collapses to icons only (60px)
- Click to expand sidebar
- Content takes full width minus 60px

### Mobile (< 768px)

- Sidebar becomes bottom sheet (hamburger toggle)
- Single column layouts
- Cards stack vertically
- Tables become card lists

---

## Page Templates

### Dashboard Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Stats Grid (4 columns)                                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │  Today's Tasks        │  │  Recent Activity              │  │
│  │  (list of tasks)      │  │  (activity feed)              │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Upcoming Harvests (table)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### List Page (e.g., Planning)

```
┌─────────────────────────────────────────────────────────────────┐
│  Page Header: Title + Filter Chips + Action Buttons             │
├─────────────────────────────────────────────────────────────────┤
│  Stats Row (mini stats)                                         │
├─────────────────────────────────────────────────────────────────┤
│  View Toggle: Table | Calendar | Gantt                          │
├─────────────────────────────────────────────────────────────────┤
│  Main Table / Calendar / Gantt View                             │
│  (primary content, scrollable)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Detail Page (e.g., Single Planting)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back   Planting: Tomatoes Roma (A-1)        Edit | Delete    │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │  Details Card         │  │  Timeline Card                │  │
│  │  - Crop info          │  │  - Key dates                  │  │
│  │  - Location           │  │  - Progress                   │  │
│  │  - Status             │  │  - Upcoming tasks             │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Activity Log                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Animation & Transitions

### Standard Durations

```css
--transition-fast: 150ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
```

### Patterns

| Element | Transition |
|---------|------------|
| Buttons | `transform 150ms, box-shadow 150ms` |
| Cards (hover) | `transform 200ms` |
| Modals | `opacity 300ms, transform 300ms` |
| Sidebar | `width 200ms` |
| Page content | `opacity 200ms` |

---

## Implementation Notes

### Phase 1: Standardize Existing Files
1. Apply consistent CSS variables to all files
2. Add sidebar component to all desktop pages
3. Unify header component

### Phase 2: Merge Duplicates
4. Consolidate dashboards
5. Create unified timeline view
6. Merge planning tools

### Phase 3: Component Library
7. Extract shared components
8. Create import system
9. Document component API

---

*This specification should be used as the reference for all admin UI development.*
