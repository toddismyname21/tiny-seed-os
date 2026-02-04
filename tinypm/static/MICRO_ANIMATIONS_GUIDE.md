# TinyPM Micro-Animations Integration Guide

**Created:** 2026-02-03
**Team:** Micro-animations & Delight
**Files:**
- `/tinypm/static/css/micro-animations.css` - Complete CSS animation library
- `/tinypm/static/js/micro-animations.js` - JavaScript helpers
- `/tinypm/static/js/animated-checkbox.js` - Checkbox component

---

## Quick Start

### 1. Include the Files

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="/tinypm/static/css/micro-animations.css">

<!-- Before closing body tag -->
<script src="/tinypm/static/js/micro-animations.js"></script>
<script src="/tinypm/static/js/animated-checkbox.js"></script>
```

### 2. Basic Usage

```javascript
// Task completion with celebration
TinyAnimations.completeTask(taskElement, {
    confetti: true,      // Show confetti
    sound: true,         // Play sound (if enabled)
    removeAfter: true    // Slide out after completion
});

// Show a toast notification
TinyAnimations.showToast({
    message: 'Task completed!',
    type: 'success',     // success, error, warning, info
    duration: 3000
});

// Spawn confetti anywhere
TinyAnimations.spawnConfetti({
    count: 50,
    origin: { x: window.innerWidth / 2, y: 300 }
});
```

---

## Component Reference

### Task Checkboxes

Create beautiful animated checkboxes:

```javascript
// Create a new checkbox
const checkbox = AnimatedCheckbox.create(container, {
    checked: false,
    size: 'medium',      // small, medium, large
    onComplete: (checked) => {
        console.log('Task completed!');
    }
});

// Upgrade existing input checkboxes
AnimatedCheckbox.upgradeAll(document.getElementById('task-list'));
```

**HTML Structure:**
```html
<div class="task-card">
    <div class="task-checkbox">
        <svg class="checkmark" viewBox="0 0 16 16">
            <path d="M3 8.5L6.5 12L13 4"/>
        </svg>
    </div>
    <span class="task-title">My Task</span>
</div>
```

### Task Cards

Add hover effects and transitions:

```html
<div class="task-card">
    <!-- Card content -->
</div>
```

The CSS automatically applies:
- Subtle lift on hover
- Border glow on hover
- Press-down effect on click

**Animation Classes:**
- `.entering` - Fade/slide in when created
- `.completing` - Green glow pulse
- `.completed-exit` - Slide out when done
- `.deleting` - Scale down and fade

```javascript
// Animate new card
TinyAnimations.enterCard(cardElement);

// Animate deletion
TinyAnimations.deleteCard(cardElement, () => {
    cardElement.remove();
});
```

### Progress Bars

```html
<div class="progress-bar">
    <div class="progress-bar-fill" style="width: 45%"></div>
    <div class="progress-milestone" data-milestone="25" style="left: 25%"></div>
    <div class="progress-milestone" data-milestone="50" style="left: 50%"></div>
    <div class="progress-milestone" data-milestone="75" style="left: 75%"></div>
    <div class="progress-milestone" data-milestone="100" style="left: 100%"></div>
</div>
```

```javascript
// Update progress with animation
TinyAnimations.updateProgress(progressBar, 75, {
    animate: true,
    checkMilestones: true  // Auto-celebrate milestones
});
```

### Loading States

**Skeleton Screens:**
```javascript
// Show skeleton loading
TinyAnimations.showSkeleton(container, 'list'); // card, list, text

// With rotating messages
const cleanup = TinyAnimations.showLoadingWithMessages(container, [
    'Loading your tasks...',
    'Almost there...',
    'Fetching data...'
]);

// Later: cleanup() to remove
```

**CSS Classes:**
```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-text short"></div>
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton skeleton-card"></div>
```

### Empty States

```html
<div class="empty-state">
    <div class="empty-state-icon">&#128203;</div>
    <h3>No tasks yet</h3>
    <p>Create your first task to get started</p>
    <button class="empty-state-cta">Create Task</button>
</div>
```

The icon will gently float, and the CTA button has a nice hover effect.

### Button Feedback

```javascript
// Success flash (green glow)
TinyAnimations.buttonSuccess(button);

// Error shake
TinyAnimations.buttonError(button);

// Ripple effect on click
button.addEventListener('click', (e) => {
    TinyAnimations.ripple(button, e);
});
```

### Tab Transitions

```javascript
// Transition between tabs
TinyAnimations.transitionTabs(currentTab, newTab, 'right');

// Animate tab indicator
TinyAnimations.moveTabIndicator(indicatorEl, targetTabButton);
```

### Toasts

```javascript
TinyAnimations.showToast({
    message: 'Changes saved!',
    type: 'success',        // success, error, warning, info
    duration: 3000,
    action: () => { /* undo action */ },
    actionLabel: 'Undo'
});
```

### Celebrations

For major achievements:

```javascript
TinyAnimations.celebrate({
    title: 'Sprint Complete!',
    subtitle: 'You finished all 12 tasks',
    icon: '&#127881;',      // Party popper
    confetti: true,
    duration: 4000,
    onClose: () => { /* callback */ }
});
```

---

## CSS Utility Classes

### Fade Animations
- `.fade-in` - Fade in on load
- `.fade-out` - Fade out

### Slide Animations
- `.slide-up` - Slide up and fade in
- `.slide-down` - Slide down and fade in

### Scale
- `.scale-in` - Scale up and fade in

### Attention
- `.pulse-attention` - Pulsing glow (2s loop)
- `.wiggle` - Quick wiggle

### Stagger Children
```html
<div class="stagger-children">
    <div>Item 1</div>  <!-- 0ms delay -->
    <div>Item 2</div>  <!-- 50ms delay -->
    <div>Item 3</div>  <!-- 100ms delay -->
</div>
```

---

## Customization

### CSS Variables

Override in your stylesheet:

```css
:root {
    /* Timing */
    --anim-fast: 150ms;
    --anim-normal: 250ms;
    --anim-slow: 500ms;

    /* Easing */
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

    /* Glow Colors */
    --glow-success: rgba(34, 197, 94, 0.5);
    --glow-error: rgba(239, 68, 68, 0.5);
    --glow-accent: rgba(99, 102, 241, 0.5);

    /* Confetti */
    --confetti-1: #22c55e;
    --confetti-2: #6366f1;
    /* ... etc */
}
```

### JavaScript Configuration

```javascript
// Enable/disable sounds
TinyAnimations.setSoundEnabled(true);

// Disable confetti
TinyAnimations.config.confettiEnabled = false;

// Change celebration threshold
TinyAnimations.config.celebrationThreshold = 10; // Every 10 tasks

// Add custom sounds
TinyAnimations.sounds.complete = '/audio/complete.mp3';
TinyAnimations.sounds.success = '/audio/success.mp3';
```

---

## Accessibility

### Reduced Motion

All animations automatically respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
    /* Animations are disabled */
}
```

The JavaScript also checks:
```javascript
if (TinyAnimations.config.reducedMotion) {
    // Skip animation, apply final state immediately
}
```

### Keyboard Navigation

Checkboxes are fully keyboard accessible:
- `Tab` to focus
- `Space` or `Enter` to toggle
- Focus ring animation on focus

### ARIA

```html
<button class="task-checkbox"
        role="checkbox"
        aria-checked="false"
        aria-label="Complete task: Buy groceries">
```

---

## Sound Effect Recommendations

For maximum delight, add these sounds (not included):

| Sound | Use Case | Recommended Style |
|-------|----------|-------------------|
| `complete.mp3` | Task completion | Soft "pop" or "ding" (0.2s) |
| `success.mp3` | Major achievement | Triumphant flourish (0.5s) |
| `pop.mp3` | Drag & drop | Subtle snap (0.1s) |
| `whoosh.mp3` | Tab transition | Soft whoosh (0.2s) |

**Free Resources:**
- [Zapsplat](https://www.zapsplat.com/)
- [Freesound](https://freesound.org/)
- [Mixkit](https://mixkit.co/free-sound-effects/)

Keep all sounds under 0.5s and at low volume (0.3 default).

---

## Performance Notes

1. **GPU Acceleration**: All animations use `transform` and `opacity` for smooth 60fps
2. **No Layout Thrash**: Animations don't trigger layout recalculation
3. **Confetti Cleanup**: Particles auto-remove after animation
4. **Debounced Events**: Heavy animations are rate-limited

---

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

---

## Integration with TinyPM

### In web_dashboard.html

```html
<!-- Add to head -->
<link rel="stylesheet" href="static/css/micro-animations.css">

<!-- Add before </body> -->
<script src="static/js/micro-animations.js"></script>
<script src="static/js/animated-checkbox.js"></script>

<script>
// Initialize when tasks load
function initTaskAnimations() {
    // Upgrade all checkboxes
    AnimatedCheckbox.upgradeAll(document.getElementById('task-list'));

    // Setup drag and drop
    TinyAnimations.setupDragDrop(document.getElementById('task-list'));

    // Add stagger animation to task list
    TinyAnimations.staggerChildren(document.getElementById('task-list'));
}

// When completing a task
function completeTask(taskId) {
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);

    TinyAnimations.completeTask(taskEl, {
        confetti: taskEl.dataset.priority === 'high',
        removeAfter: true
    });

    // Update backend after animation
    taskEl.addEventListener('animationComplete', () => {
        saveTaskCompletion(taskId);
    }, { once: true });
}
</script>
```

---

## Troubleshooting

**Animations not playing?**
1. Check if `prefers-reduced-motion` is set
2. Verify CSS file is loaded
3. Check browser console for errors

**Confetti not showing?**
1. Check `TinyAnimations.config.confettiEnabled`
2. Verify z-index isn't being overridden

**Sounds not playing?**
1. Enable with `TinyAnimations.setSoundEnabled(true)`
2. Set sound file URLs in `TinyAnimations.sounds`
3. Check browser autoplay policy

---

*Make users FEEL something when they complete tasks. This is what brings them back.*
