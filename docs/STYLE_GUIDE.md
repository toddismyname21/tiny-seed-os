# Tiny Seed OS - Style Guide

**Version:** 1.0
**Last Updated:** 2026-01-15
**Maintained By:** UX/Design Claude

---

## Design Philosophy

Tiny Seed OS is built for **farmers in the field**. Every design decision should consider:

1. **Dirty hands** - Touch targets must be large enough to tap with work gloves
2. **Bright sun** - High contrast so screens are readable outdoors
3. **Quick glances** - Information at a glance, minimal reading required
4. **Spotty connection** - Offline-first, sync when possible
5. **Bilingual workforce** - English and Spanish support required

---

## Color Palette

### CSS Variables (Dark Theme - Primary)

```css
:root {
    /* Brand Colors */
    --primary: #2d5a27;          /* Dark green - buttons, accents */
    --primary-light: #4a7c43;    /* Light green - hover states, highlights */
    --primary-dark: #1e3d1a;     /* Darker green - gradients */
    --secondary: #f4a261;        /* Orange - secondary actions, harvest */

    /* Semantic Colors */
    --success: #22c55e;          /* Green - success, completed, clock in */
    --success-bg: rgba(34, 197, 94, 0.15);
    --warning: #f59e0b;          /* Amber - warnings, overdue */
    --warning-bg: rgba(245, 158, 11, 0.15);
    --danger: #ef4444;           /* Red - errors, delete, clock out */
    --danger-bg: rgba(239, 68, 68, 0.15);
    --info: #3b82f6;             /* Blue - information, links */

    /* Background Colors */
    --bg-dark: #0f172a;          /* Main background */
    --bg-card: #1e293b;          /* Card backgrounds */
    --bg-elevated: #334155;      /* Elevated elements, inputs */
    --bg-input: #1e293b;         /* Form inputs */

    /* Text Colors */
    --text-primary: #f8fafc;     /* Main text - white */
    --text-secondary: #94a3b8;   /* Secondary text - gray */
    --text-muted: #64748b;       /* Muted text - darker gray */

    /* Borders */
    --border: rgba(255, 255, 255, 0.1);
    --border-active: rgba(74, 124, 67, 0.5);
}
```

### Color Usage Rules

| Use Case | Color | Variable |
|----------|-------|----------|
| Primary buttons | Green | `--primary` |
| Clock In button | Green | `--success` |
| Clock Out button | Red | `--danger` |
| Delete/Remove actions | Red | `--danger` |
| Warnings/Overdue | Amber | `--warning` |
| Info messages | Blue | `--info` |
| Harvest actions | Orange | `--secondary` |

---

## Typography

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Font Sizes

| Element | Size | Usage |
|---------|------|-------|
| Display/Hero | 2.5rem (40px) | Clock time |
| H1/Page Title | 1.5rem (24px) | Login title |
| H2/Section Title | 1.1rem (17.6px) | Card headers |
| H3/Subsection | 1rem (16px) | Section titles |
| Body | 1rem (16px) | Default text |
| Small | 0.85rem (13.6px) | Labels, hints |
| Tiny | 0.75rem (12px) | Timestamps, badges |

### Font Weights

- `400` - Regular body text
- `500` - Labels, subtle emphasis
- `600` - Buttons, card titles
- `700` - Headlines, important values

---

## Spacing System

Base unit: **8px**

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps, icon margins |
| `sm` | 8px | Default gap |
| `md` | 12px | Card internal padding |
| `lg` | 16px | Section margins, content padding |
| `xl` | 20px | Form card padding |
| `2xl` | 24px | Large card padding |

### Padding Guidelines

- **Cards:** 16-24px padding
- **Buttons:** 12-16px vertical, 16-20px horizontal
- **Form inputs:** 12px vertical, 16px horizontal
- **Main content:** 16px margin from edges

---

## Touch Targets (CRITICAL)

### Minimum Sizes

```css
:root {
    --touch-min: 48px;           /* MINIMUM for all interactive elements */
    --touch-comfortable: 56px;   /* Preferred size for primary actions */
}
```

### Rules

1. **ALL interactive elements must be at least 44px** (Apple HIG minimum)
2. **Primary action buttons should be 48-56px tall**
3. **PIN pad buttons should be 70-80px** (excellent for gloved hands)
4. **Small icons in buttons are OK if the button itself is 44px+**

### Examples of Correct Touch Targets

```css
/* Good - Button meets minimum */
.task-checkbox {
    width: 44px;
    height: 44px;
}

/* Good - Primary action is comfortable */
.btn-primary {
    height: var(--touch-comfortable); /* 56px */
}

/* Good - Large PIN buttons */
.pin-btn {
    width: 80px;
    height: 80px;
}
```

### Common Mistakes to Avoid

```css
/* BAD - Too small! */
.tiny-button {
    width: 28px;  /* NEVER do this */
    height: 28px;
}

/* GOOD - Fixed */
.properly-sized-button {
    width: 44px;
    height: 44px;
}
```

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
    height: var(--touch-comfortable);  /* 56px */
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
    color: white;
    font-size: 1rem;
    font-weight: 600;
}
```

#### Secondary Button
```css
.btn-secondary {
    padding: 14px 20px;
    border-radius: 10px;
    background: var(--bg-elevated);
    color: var(--text-primary);
}
```

#### Filter Chips
```css
.filter-chip {
    padding: 10px 16px;
    border-radius: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    min-height: 44px;  /* Touch target! */
}
```

### Cards

```css
.card {
    background: var(--bg-card);
    border-radius: 12-16px;
    padding: 16-24px;
    border: 1px solid var(--border);
}
```

### Form Inputs

```css
.form-input {
    width: 100%;
    min-height: var(--touch-min);  /* 48px */
    padding: 12px 16px;
    background: var(--bg-dark);
    border: 2px solid var(--border);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 1rem;
}

.form-input:focus {
    border-color: var(--primary-light);
}
```

### Toast Notifications

```css
.toast {
    position: fixed;
    bottom: calc(80px + var(--safe-bottom));
    left: 16px;
    right: 16px;
    padding: 16px 20px;
    background: var(--bg-elevated);
    border-radius: 12px;
    border-left: 4px solid var(--success|--danger|--warning);
}
```

---

## Safe Area Insets

Always account for device notches and home indicators:

```css
:root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
}

.app-header {
    height: calc(56px + var(--safe-top));
    padding-top: var(--safe-top);
}

.tab-bar {
    height: calc(64px + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
}
```

---

## States

### Loading State

Always show a loading indicator for async operations:

```css
.loading-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### Empty State

Provide helpful empty states, never blank screens:

```html
<div class="empty-state">
    <i class="fas fa-inbox"></i>
    <h3>No messages</h3>
    <p>Check back later for updates</p>
</div>
```

### Offline State

Show clear offline indicator:

```css
.offline-indicator {
    background: var(--warning);
    color: #000;
    padding: 8px 16px;
    text-align: center;
    font-weight: 600;
}
```

---

## Accessibility

### Contrast Requirements

- Text on dark backgrounds: Use `--text-primary` (#f8fafc)
- Secondary text: Use `--text-secondary` (#94a3b8)
- Never use `--text-muted` for important information

### Touch Feedback

```css
/* Always provide active state feedback */
.button:active {
    transform: scale(0.98);
}

/* Or background change */
.card:active {
    background: var(--bg-elevated);
}
```

### Disable Tap Highlight (Mobile)

```css
* {
    -webkit-tap-highlight-color: transparent;
}
```

---

## Internationalization

Always use data-i18n attributes for translatable text:

```html
<span data-i18n="clock.clockIn">Clock In</span>
```

Never hardcode English-only text in the UI.

---

## Checklist for New Components

Before shipping any new UI:

- [ ] All interactive elements are at least 44px
- [ ] Colors use CSS variables, not hardcoded values
- [ ] Loading state is shown for async operations
- [ ] Empty state is defined
- [ ] Translatable text uses data-i18n
- [ ] Tested in bright light (high contrast OK?)
- [ ] Works offline (shows cached data or helpful message)
- [ ] Safe area insets considered for fixed positioning

---

## Reference Files

- **employee.html** - Best example of mobile-first design
- **login.html** - PIN pad pattern
- **web_app/api-config.js** - API configuration pattern

---

*This guide is maintained by UX/Design Claude. Update as patterns evolve.*
