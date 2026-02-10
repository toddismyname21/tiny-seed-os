# Speed & Performance - The #1 Differentiator

## The Core Truth

**Speed is not a feature. Speed IS the product.**

Users equate speed with:
- Quality
- Reliability
- Trust
- Intelligence

---

## Response Time Thresholds

| Time | User Perception |
|------|-----------------|
| **<100ms** | Instantaneous - feels like direct manipulation |
| **100-300ms** | Fast - noticeable but acceptable |
| **300-1000ms** | Sluggish - user notices delay |
| **>1000ms** | Slow - user loses focus, considers leaving |
| **>10s** | Broken - user assumes error, abandons |

---

## The Linear Lesson

Linear (project management tool) reached $400M valuation primarily through speed:

### What They Do:
1. **Optimistic updates** - UI updates immediately, syncs in background
2. **Local-first** - Data stored locally, synced to cloud
3. **Keyboard-first** - No mouse required = faster interactions
4. **Minimal re-renders** - Surgical UI updates only
5. **Edge caching** - Data close to users geographically

### Result:
Everything feels instant. Users describe it as "magical."

---

## Speed Optimization Strategies

### 1. Optimistic UI Updates
Don't wait for server response.
```
User clicks "Complete" →
  1. Immediately update UI ✓
  2. Send request to server (background)
  3. If fails, rollback with error message
```

### 2. Skeleton Screens
Show layout immediately, fill in content.
```
┌─────────────────────┐
│ ████████████        │  ← Gray placeholder
│ ██████ ████████     │
│ ████████████████    │
└─────────────────────┘
```
Better than spinners for perceived speed.

### 3. Prefetching
Load data BEFORE user needs it.
```
- On hover over link: prefetch that page
- On page load: prefetch likely next pages
- On scroll near bottom: prefetch more items
```

### 4. Caching Aggressively
```
Cache layers:
1. Browser cache (static assets)
2. Service worker cache (offline capability)
3. Memory cache (current session)
4. CDN cache (edge locations)
```

### 5. Lazy Loading
Only load what's visible.
```
Images: Load when scrolled into view
Components: Load when needed
Data: Paginate, load on scroll
```

### 6. Debouncing & Throttling
Don't fire on every keystroke.
```
Search: Wait 300ms after typing stops
Scroll: Max one event per 16ms
Resize: Max one event per 100ms
```

---

## Perceived Performance Tricks

### 1. Instant Feedback
Button should respond in <50ms.
```css
button:active {
  transform: scale(0.98);
  transition: transform 50ms;
}
```

### 2. Progress Indicators
For anything >1 second, show progress.
```
Indeterminate: Spinner, pulsing bar
Determinate:   Progress bar with percentage
```

### 3. Background Processing
Do heavy work when user isn't looking.
```
- Prefetch during idle time
- Sync during background
- Process on blur, not on submit
```

### 4. Animation Timing
Keep animations fast but perceptible.
```
Micro-interactions: 100-200ms
Transitions:        200-300ms
Complex animations: 300-500ms max
```

### 5. Loading Prioritization
Load what matters first.
```
1. Critical CSS (above the fold)
2. Main content
3. Images (lazy)
4. Secondary features
5. Analytics/tracking
```

---

## Measuring Speed

### Core Web Vitals (Google's standards)
| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| FID (First Input Delay) | <100ms | 100-300ms | >300ms |
| CLS (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |

### Application-Specific Metrics
- Time to first meaningful paint
- Time to interactive
- API response times (p50, p95, p99)
- Client-side render time

---

## Performance Budget

Set limits and enforce them:
```
JavaScript bundle:  < 200KB (gzipped)
CSS bundle:         < 50KB
Images per page:    < 500KB
API response:       < 200ms (p95)
Page load:          < 3 seconds
```

---

## Keyboard Shortcuts = Speed

Power users demand keyboard navigation.

### Essential Shortcuts:
| Action | Shortcut |
|--------|----------|
| Command palette | Cmd+K / Ctrl+K |
| Search | Cmd+F / / |
| Create new | Cmd+N / C |
| Save | Cmd+S |
| Navigate back | Cmd+[ / Backspace |
| Quick switch | Cmd+1-9 |

### Teaching Shortcuts:
- Show on hover (after 1-2 seconds)
- Include in tooltips
- Command palette shows all
- Cheat sheet accessible via ? key

---

## Speed Checklist

- [ ] Page loads in <3 seconds on 3G
- [ ] First paint in <1 second
- [ ] Time to interactive <5 seconds
- [ ] All interactions respond in <100ms
- [ ] No layout shifts after load
- [ ] Keyboard shortcuts for common actions
- [ ] Optimistic updates for all mutations
- [ ] Skeleton screens (not spinners)
- [ ] Images lazy loaded
- [ ] Service worker for offline/caching

---

## Sources
- Google Web Vitals documentation
- Linear engineering blog
- Vercel edge computing documentation
- Chrome DevTools Performance guides
- "Designing for Performance" by Lara Hogan
