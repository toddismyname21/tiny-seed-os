# Planning Assistant UI Research: Conversational Interface Patterns

**Research Date:** January 23, 2026
**Focus:** Best-in-class conversational UI patterns for floating chat bubble assistant
**Sources:** Intercom, Drift, Zendesk, Claude.ai, ChatGPT, Material Design, NN/g

---

## Table of Contents

1. [Floating Chat Bubble Design](#1-floating-chat-bubble-design)
2. [Message Formatting & Rich Content](#2-message-formatting--rich-content)
3. [Action Confirmation UI Patterns](#3-action-confirmation-ui-patterns)
4. [Multi-Step Workflow Design](#4-multi-step-workflow-design)
5. [Context Preservation](#5-context-preservation)
6. [Accessibility](#6-accessibility)
7. [Mobile Responsiveness](#7-mobile-responsiveness)
8. [Additional UI Components](#8-additional-ui-components)
9. [Implementation Recommendations](#9-implementation-recommendations)

---

## 1. Floating Chat Bubble Design

### Core Positioning

The floating action button (FAB) pattern is the foundation of chat bubble design:

```css
.chat-bubble {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.chat-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}
```

### Best Practices from Industry Leaders

| Platform | Key Design Choice | Why It Works |
|----------|------------------|--------------|
| **Intercom** | Always-visible launcher | Users always know help is one click away |
| **Drift** | Proactive messaging | Engages users before they seek help |
| **Zendesk** | Brand-customizable colors | Seamless integration with site design |
| **Claude.ai** | Clean, minimal aesthetic | Reduces cognitive load |

### Visibility Guidelines

**Always Show the Bubble:**
- If users have to click through menus to find chat, you lose convenience value
- The bubble serves as a constant reminder that help is available
- It enables both incoming support and outbound notifications

**Positioning Best Practices:**
- Bottom-right is the standard convention (users expect it there)
- Maintain 16-24px padding from viewport edges
- Consider content overlap - don't cover important CTAs
- On mobile, position is typically fixed to bottom-right

### Animation Patterns

**Expand/Collapse Animation:**
```css
.chat-window {
  transform-origin: bottom right;
  transition: all 0.4s ease-in-out;
  opacity: 0;
  transform: scale(0.8);
}

.chat-window.open {
  opacity: 1;
  transform: scale(1);
}
```

**Attention-Getting (Use Sparingly):**
```css
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.chat-bubble.has-notification {
  animation: pulse 2s infinite;
}
```

### Window Dimensions

| Device | Recommended Size | Notes |
|--------|-----------------|-------|
| Desktop | 380-420px width, 500-600px height | Enough for comfortable reading |
| Tablet | 360px width, 60% viewport height | Adapt to orientation |
| Mobile | Full width, 100% height (bottom sheet) | Use native patterns |

---

## 2. Message Formatting & Rich Content

### Message Bubble Design

**Visual Hierarchy:**
- User messages: Right-aligned, brand accent color (e.g., blue)
- Assistant messages: Left-aligned, neutral background (gray/white)
- System messages: Centered, subtle styling

**Bubble Styling Best Practices:**
```css
.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.message-bubble.user {
  background: #3B82F6;
  color: white;
  border-bottom-right-radius: 4px;
  margin-left: auto;
}

.message-bubble.assistant {
  background: #F3F4F6;
  color: #1F2937;
  border-bottom-left-radius: 4px;
}
```

**Readability Research:**
- Dark blue bubbles with white text show 90% better readability
- Users find blue bubbles more trustworthy than green
- Rounded corners (12-16px) are preferred over sharp edges
- Consistent padding: 16-20px top, 10-12px sides, 12-16px bottom

### Displaying Structured Data

#### Tables in Chat

**When to Use Tables vs Cards:**
- **Tables**: Dense, structured data for comparison (inventory, schedules)
- **Cards**: Visual content, individual items (products, tasks)

**Compact Table Pattern:**
```html
<div class="chat-table">
  <table>
    <thead>
      <tr>
        <th>Crop</th>
        <th>Beds</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Tomatoes</td><td>4</td><td>Mar 15</td></tr>
      <tr><td>Lettuce</td><td>2</td><td>Mar 20</td></tr>
    </tbody>
  </table>
</div>
```

```css
.chat-table {
  overflow-x: auto;
  margin: 8px 0;
  border-radius: 8px;
  background: white;
  border: 1px solid #E5E7EB;
}

.chat-table table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
}

.chat-table th {
  background: #F9FAFB;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
}

.chat-table td {
  padding: 8px 12px;
  border-top: 1px solid #E5E7EB;
}
```

#### Lists in Chat

**Checklist Pattern:**
```html
<div class="chat-checklist">
  <div class="checklist-item">
    <span class="check-icon">&#10003;</span>
    <span>Bed A1 - Tomatoes assigned</span>
  </div>
  <div class="checklist-item pending">
    <span class="check-icon">&#9675;</span>
    <span>Bed A2 - Needs assignment</span>
  </div>
</div>
```

#### Preview Cards

**Task/Item Preview:**
```html
<div class="preview-card">
  <div class="preview-header">
    <span class="preview-type">Sowing Task</span>
    <span class="preview-status status-pending">Pending</span>
  </div>
  <div class="preview-title">Transplant Tomatoes to Bed A1</div>
  <div class="preview-meta">
    <span>Due: March 15</span>
    <span>Priority: High</span>
  </div>
</div>
```

### Markdown Rendering

**Essential Support:**
- **Bold** and *italic* text
- Bulleted and numbered lists
- Code blocks with syntax highlighting
- Links (open in new tab)

**Code Block Pattern (ChatGPT-style):**
```html
<div class="code-block">
  <div class="code-header">
    <span class="code-language">JavaScript</span>
    <button class="copy-button">Copy</button>
  </div>
  <pre><code class="language-javascript">
function calculateDTM(sowDate, harvestDate) {
  return Math.ceil((harvestDate - sowDate) / (1000 * 60 * 60 * 24));
}
  </code></pre>
</div>
```

**Libraries for Markdown:**
- **marked.js** - Fast, lightweight markdown parser
- **Shiki** or **Prism.js** - Syntax highlighting
- Consider bundle size: Full highlighting can add ~1MB

---

## 3. Action Confirmation UI Patterns

### The "Here's What I'll Do" Preview

This is a critical pattern for AI assistants that take actions. Users need to see exactly what will happen before confirming.

**Core Components:**
1. **Title/Question**: Clear statement of the action
2. **Preview Content**: What will change
3. **Impact Indicators**: Visual cues for severity
4. **Action Buttons**: Confirm/Cancel with clear labels

### Confirmation Dialog Pattern

```html
<div class="action-preview">
  <div class="preview-icon warning">
    <!-- Warning icon for destructive actions -->
    <!-- Info icon for informational -->
    <!-- Success icon for positive actions -->
  </div>

  <h3 class="preview-title">Create 3 Sowing Tasks?</h3>

  <p class="preview-description">
    This will add the following tasks to your planning calendar:
  </p>

  <div class="preview-details">
    <div class="detail-item">
      <span class="detail-label">Tomatoes - Bed A1</span>
      <span class="detail-value">March 15, 2026</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Lettuce - Bed B2</span>
      <span class="detail-value">March 20, 2026</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Peppers - Bed A3</span>
      <span class="detail-value">March 22, 2026</span>
    </div>
  </div>

  <div class="preview-actions">
    <button class="btn-secondary">Cancel</button>
    <button class="btn-primary">Create Tasks</button>
  </div>
</div>
```

### Button Design Best Practices

**Button Placement:**
- Primary action (Confirm): **Right side**
- Secondary action (Cancel): **Left side**
- This follows the natural reading flow

**Button Labeling:**
- Use specific action verbs: "Create Tasks" not "OK"
- Match button text to the title/action
- For destructive actions, use red styling

```css
.preview-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.btn-primary {
  background: #3B82F6;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
}

.btn-primary.destructive {
  background: #EF4444;
}

.btn-secondary {
  background: transparent;
  color: #6B7280;
  padding: 10px 20px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
}
```

### When to Show Confirmations

**Always Confirm:**
- Destructive actions (delete, remove, cancel)
- Actions affecting multiple items (bulk operations)
- Irreversible changes
- Actions with external side effects (sending emails, creating tasks)

**Skip Confirmation For:**
- Single, easily undoable actions
- Navigation changes
- Viewing/reading operations

### Alternative: Undo Pattern

For less critical actions, provide undo instead of confirmation:

```html
<div class="undo-toast">
  <span>3 tasks created</span>
  <button class="undo-button">Undo</button>
</div>
```

This reduces friction while maintaining safety.

---

## 4. Multi-Step Workflow Design

### The Parameter Chain Pattern

When collecting multiple pieces of information, use a methodical structure:

```
Step 1: Do we have parameter A?
  - Yes: Go to Step 2
  - No: Ask user, then go to Step 2

Step 2: Do we have parameter B?
  - Yes: Go to Step 3
  - No: Ask user, then go to Step 3

... and so on
```

This eliminates the complexity of trying to handle every possible combination of inputs.

### Progress Indicators

**Step Indicator Pattern:**
```html
<div class="workflow-progress">
  <div class="step completed">
    <span class="step-number">1</span>
    <span class="step-label">Select Crop</span>
  </div>
  <div class="step-connector"></div>
  <div class="step active">
    <span class="step-number">2</span>
    <span class="step-label">Choose Beds</span>
  </div>
  <div class="step-connector"></div>
  <div class="step pending">
    <span class="step-number">3</span>
    <span class="step-label">Set Dates</span>
  </div>
</div>
```

```css
.workflow-progress {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 8px;
  margin-bottom: 12px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.step.completed .step-number {
  background: #10B981;
  color: white;
}

.step.active .step-number {
  background: #3B82F6;
  color: white;
}

.step.pending .step-number {
  background: #E5E7EB;
  color: #6B7280;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #E5E7EB;
  margin: 0 8px;
}
```

### Handling Non-Linear User Behavior

Users don't always follow linear paths. Design for:

1. **Going Back**: Allow users to revisit/change previous answers
2. **Changing Direction**: Support topic switches mid-flow
3. **Clarification**: Handle "wait, I meant..." responses
4. **Escape Hatch**: Always provide a way to cancel/start over

**Back Navigation Pattern:**
```html
<div class="workflow-nav">
  <button class="nav-back" aria-label="Go back">
    <span class="back-icon">&larr;</span>
    Back to crop selection
  </button>
</div>
```

### Quick Input Patterns

**Option Buttons for Limited Choices:**
```html
<div class="quick-options">
  <button class="option-btn">Greenhouse</button>
  <button class="option-btn">Field</button>
  <button class="option-btn">High Tunnel</button>
</div>
```

**Date Picker Integration:**
```html
<div class="date-input-group">
  <input type="date" class="date-input" id="sow-date">
  <div class="quick-dates">
    <button class="quick-date">Today</button>
    <button class="quick-date">Tomorrow</button>
    <button class="quick-date">Next Week</button>
  </div>
</div>
```

### Message Length Guidelines

- Keep messages to 3 lines or fewer when possible
- Send maximum 3 messages before allowing user input
- Break complex information into digestible chunks

---

## 5. Context Preservation

### Session Architecture

Based on industry patterns (Amazon Bedrock, Google ADK, Claude):

```
Session
├── Conversation History (messages)
├── State (temporary data for current conversation)
└── Memory (long-term knowledge/preferences)
```

### Conversation History Management

**Key Strategies:**

1. **Truncation**: Remove oldest messages when history exceeds limit
2. **Summarization**: Condense older messages into summaries
3. **Token-Based**: Track token count, reduce when approaching limit

**Implementation Pattern:**
```javascript
class ConversationManager {
  constructor(maxMessages = 50, maxTokens = 4000) {
    this.messages = [];
    this.maxMessages = maxMessages;
    this.maxTokens = maxTokens;
  }

  addMessage(message) {
    this.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });

    // Truncate if needed
    if (this.messages.length > this.maxMessages) {
      this.summarizeOldMessages();
    }
  }

  summarizeOldMessages() {
    // Keep system message and recent messages
    const systemMsg = this.messages.find(m => m.role === 'system');
    const recentMessages = this.messages.slice(-10);

    // Summarize middle messages
    const summary = this.createSummary(this.messages.slice(1, -10));

    this.messages = [
      systemMsg,
      { role: 'system', content: `Previous context: ${summary}` },
      ...recentMessages
    ];
  }
}
```

### State Management for Planning Context

For a planning assistant, preserve:

```javascript
const planningContext = {
  // Current operation state
  currentWorkflow: null,  // 'bed_assignment', 'crop_planning', etc.
  workflowStep: 0,
  collectedParams: {},

  // User preferences (session)
  preferredView: 'week',
  lastViewedDate: '2026-03-15',
  selectedFilters: ['greenhouse'],

  // Recent entities (for quick reference)
  recentCrops: ['Tomatoes', 'Lettuce', 'Peppers'],
  recentBeds: ['A1', 'B2', 'G3'],

  // Conversation metadata
  messageCount: 0,
  lastInteraction: null
};
```

### Cross-Session Memory

**What to Remember:**
- User preferences (display settings, default values)
- Frequently accessed items
- Past successful operations (for suggestions)

**What NOT to Remember:**
- Sensitive data
- Temporary values
- One-time operations

### UI Indicators for Context

**Show Active Context:**
```html
<div class="context-indicator">
  <span class="context-label">Working on:</span>
  <span class="context-value">March 2026 Planting Plan</span>
  <button class="context-clear" aria-label="Clear context">&times;</button>
</div>
```

---

## 6. Accessibility

### Keyboard Navigation

**Required Keyboard Support:**

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous element |
| `Enter/Space` | Activate buttons, submit input |
| `Escape` | Close chat window, cancel operation |
| `Arrow Up/Down` | Navigate message history |
| `Ctrl+/` or `Cmd+K` | Open chat (global shortcut) |

**Implementation:**
```javascript
// Global keyboard shortcut to open chat
document.addEventListener('keydown', (e) => {
  // Cmd+K or Ctrl+/
  if ((e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === '/')) {
    e.preventDefault();
    toggleChat();
    // Focus input field when opening
    if (chatOpen) {
      document.getElementById('chat-input').focus();
    }
  }

  // Escape to close
  if (e.key === 'Escape' && chatOpen) {
    closeChat();
  }
});

// Arrow key navigation in chat history
chatMessages.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    focusPreviousMessage();
  } else if (e.key === 'ArrowDown') {
    focusNextMessage();
  }
});
```

### Screen Reader Support

**ARIA Labels:**
```html
<button
  class="chat-bubble"
  aria-label="Open planning assistant"
  aria-expanded="false"
  aria-controls="chat-window">
  <span class="sr-only">Chat</span>
  <svg aria-hidden="true">...</svg>
</button>

<div
  id="chat-window"
  role="dialog"
  aria-labelledby="chat-title"
  aria-describedby="chat-description">

  <h2 id="chat-title" class="sr-only">Planning Assistant</h2>
  <p id="chat-description" class="sr-only">
    Chat with the planning assistant to manage your farm operations
  </p>

  <div
    role="log"
    aria-live="polite"
    aria-label="Chat messages"
    id="message-container">
    <!-- Messages -->
  </div>

  <input
    type="text"
    aria-label="Type your message"
    placeholder="Ask me anything...">

  <button aria-label="Send message">Send</button>
</div>
```

**Live Region for New Messages:**
```html
<div
  aria-live="polite"
  aria-atomic="false"
  class="sr-only"
  id="message-announcer">
  <!-- New message text is inserted here for screen reader announcement -->
</div>
```

```javascript
function announceMessage(message) {
  const announcer = document.getElementById('message-announcer');
  announcer.textContent = `${message.sender} says: ${message.text}`;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}
```

### Color and Contrast

- **Minimum contrast ratio**: 4.5:1 for normal text, 3:1 for large text
- **Never rely on color alone** to convey information
- Use icons + color + text for status indicators
- Test with color blindness simulators

**Status Indicator Pattern:**
```html
<!-- Good: Uses icon + color + text -->
<span class="status success">
  <svg class="status-icon" aria-hidden="true">...</svg>
  <span>Task Created</span>
</span>

<!-- Bad: Color only -->
<span style="color: green;">Success</span>
```

### Focus Management

```javascript
// When chat opens, focus the input
function openChat() {
  chatWindow.classList.add('open');
  chatInput.focus();
}

// When chat closes, return focus to trigger
function closeChat() {
  chatWindow.classList.remove('open');
  chatTrigger.focus();
}

// Trap focus within dialog
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}
```

### Skip Link Integration

```html
<div class="skip-links">
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <a href="#chat-input" class="skip-link">Skip to chat assistant</a>
</div>
```

---

## 7. Mobile Responsiveness

### Bottom Sheet Pattern for Mobile

On mobile devices, the chat should expand to a full-height bottom sheet:

```css
/* Desktop */
.chat-window {
  position: fixed;
  bottom: 84px;
  right: 24px;
  width: 380px;
  height: 500px;
  border-radius: 16px;
}

/* Mobile */
@media (max-width: 640px) {
  .chat-window {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 16px 16px 0 0;
  }

  .chat-bubble {
    bottom: 16px;
    right: 16px;
  }
}
```

### Bottom Sheet Design Guidelines

**From Material Design 3:**
- Safe zone: 64px at top when fully expanded
- Drag handle: 4px height, 32px width, centered
- Dismiss via swipe down or tap outside
- Height auto-adjusts to content

```html
<div class="bottom-sheet-chat">
  <div class="drag-handle" aria-hidden="true"></div>
  <div class="chat-header">
    <h2>Planning Assistant</h2>
    <button class="close-btn" aria-label="Close chat">&times;</button>
  </div>
  <div class="chat-messages">...</div>
  <div class="chat-input-area">...</div>
</div>
```

```css
.drag-handle {
  width: 32px;
  height: 4px;
  background: #D1D5DB;
  border-radius: 2px;
  margin: 8px auto;
}

.bottom-sheet-chat {
  touch-action: pan-y;
}
```

### Touch-Friendly Design

**Minimum Touch Targets:**
- Buttons: 44x44px minimum (48x48px recommended)
- Spacing between targets: 8px minimum

```css
.quick-option-btn {
  min-height: 44px;
  padding: 12px 16px;
  margin: 4px;
}

.chat-input {
  min-height: 44px;
  font-size: 16px; /* Prevents zoom on iOS */
}
```

### Input Handling

**Prevent Keyboard Issues:**
```css
/* Prevent iOS zoom on input focus */
.chat-input {
  font-size: 16px;
}

/* Handle virtual keyboard */
.chat-window {
  max-height: calc(100vh - env(keyboard-inset-height, 0px));
}
```

```javascript
// Scroll to input when keyboard appears
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('focus', () => {
  setTimeout(() => {
    chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
});
```

### Responsive Data Display

**Tables on Mobile:**
```css
@media (max-width: 640px) {
  .chat-table {
    font-size: 12px;
  }

  /* Option 1: Horizontal scroll */
  .chat-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Option 2: Stack as cards */
  .chat-table.stack-mobile tr {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #E5E7EB;
    padding: 12px 0;
  }

  .chat-table.stack-mobile td {
    display: flex;
    justify-content: space-between;
  }

  .chat-table.stack-mobile td::before {
    content: attr(data-label);
    font-weight: 600;
  }
}
```

---

## 8. Additional UI Components

### Typing Indicator

**Three-Dot Animation:**
```html
<div class="typing-indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>
```

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #F3F4F6;
  border-radius: 16px;
  width: fit-content;
}

.dot {
  width: 8px;
  height: 8px;
  background: #9CA3AF;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
```

### Quick Reply Chips

```html
<div class="suggestion-chips">
  <button class="chip">Show this week's tasks</button>
  <button class="chip">What beds are available?</button>
  <button class="chip">Add a new sowing</button>
</div>
```

```css
.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.chip {
  padding: 8px 16px;
  background: white;
  border: 1px solid #D1D5DB;
  border-radius: 20px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  background: #F3F4F6;
  border-color: #3B82F6;
}

.chip:focus {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

### Error States

```html
<div class="message-error">
  <div class="error-icon">!</div>
  <div class="error-content">
    <span class="error-text">Unable to create task</span>
    <span class="error-detail">Connection lost. Please try again.</span>
  </div>
  <button class="retry-btn">Retry</button>
</div>
```

```css
.message-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  color: #991B1B;
}

.error-icon {
  width: 24px;
  height: 24px;
  background: #EF4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.retry-btn {
  margin-left: auto;
  padding: 6px 12px;
  background: white;
  border: 1px solid #FECACA;
  border-radius: 4px;
  color: #991B1B;
  cursor: pointer;
}
```

### Loading States for AI

```html
<div class="ai-loading">
  <div class="loading-avatar">
    <img src="assistant-icon.svg" alt="">
    <div class="loading-pulse"></div>
  </div>
  <div class="loading-text">Planning assistant is thinking...</div>
</div>
```

**Best Practices:**
- Don't show loading for under 1 second (causes flickering)
- Use streaming for text responses when possible
- Provide progress indication for multi-step operations

---

## 9. Implementation Recommendations

### Component Architecture

```
ChatWidget/
├── ChatBubble.js          # Floating trigger button
├── ChatWindow.js          # Main container
├── ChatHeader.js          # Title, close button
├── MessageList.js         # Scrollable message area
│   ├── UserMessage.js
│   ├── AssistantMessage.js
│   ├── SystemMessage.js
│   ├── TypingIndicator.js
│   └── ErrorMessage.js
├── MessageContent/        # Rich content renderers
│   ├── MarkdownRenderer.js
│   ├── TableRenderer.js
│   ├── PreviewCard.js
│   └── ActionConfirmation.js
├── ChatInput.js           # Text input + send
├── SuggestionChips.js     # Quick replies
├── WorkflowProgress.js    # Step indicators
└── ContextIndicator.js    # Current context display
```

### State Management

```javascript
const chatState = {
  // UI State
  isOpen: false,
  isLoading: false,
  error: null,

  // Conversation
  messages: [],
  typingIndicator: false,

  // Workflow
  currentWorkflow: null,
  workflowStep: 0,
  collectedParams: {},

  // Context
  activeContext: null,
  suggestions: [],

  // Preferences
  theme: 'light',
  soundEnabled: true
};
```

### CSS Custom Properties for Theming

```css
:root {
  /* Colors */
  --chat-primary: #3B82F6;
  --chat-primary-hover: #2563EB;
  --chat-bg: #FFFFFF;
  --chat-surface: #F3F4F6;
  --chat-text: #1F2937;
  --chat-text-secondary: #6B7280;
  --chat-border: #E5E7EB;
  --chat-error: #EF4444;
  --chat-success: #10B981;

  /* Spacing */
  --chat-padding: 16px;
  --chat-radius: 16px;
  --chat-bubble-radius: 16px;

  /* Typography */
  --chat-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --chat-font-size: 14px;
  --chat-line-height: 1.5;

  /* Sizing */
  --chat-width: 380px;
  --chat-height: 500px;
  --chat-bubble-size: 60px;

  /* Animation */
  --chat-transition: 0.3s ease;
}

/* Dark theme */
[data-theme="dark"] {
  --chat-bg: #1F2937;
  --chat-surface: #374151;
  --chat-text: #F9FAFB;
  --chat-text-secondary: #9CA3AF;
  --chat-border: #4B5563;
}
```

### Performance Considerations

1. **Virtual scrolling** for long message lists
2. **Lazy load** syntax highlighting libraries
3. **Debounce** typing events (300ms recommended)
4. **Message pagination** - load older messages on scroll
5. **Optimize images** in messages

### Integration Points

For the Tiny Seed OS planning assistant:

```javascript
// Listen for planning events
planningAssistant.on('task_created', (task) => {
  // Refresh calendar/gantt views
  window.postMessage({ type: 'PLANNING_TASK_CREATED', task }, '*');
});

// Receive context from main app
window.addEventListener('message', (event) => {
  if (event.data.type === 'SET_PLANNING_CONTEXT') {
    planningAssistant.setContext(event.data.context);
  }
});
```

---

## Sources

### Intercom & Chat Platforms
- [Intercom Messenger Customization](https://www.intercom.com/help/en/articles/6612589-set-up-and-customize-the-messenger)
- [Intercom AI-powered UI Blog](https://www.intercom.com/blog/ai-chatbots-user-interfaces/)
- [Intercom Community Discussions](https://community.intercom.com/)

### Chat UI Design
- [16 Chat UI Design Patterns That Work in 2025](https://bricxlabs.com/blogs/message-screen-ui-deisgn)
- [15 Chatbot UI Examples - Sendbird](https://sendbird.com/blog/chatbot-ui)
- [31 Chatbot UI Examples from Product Designers](https://www.eleken.co/blog-posts/chatbot-ui-examples)
- [7 Best Chatbot UI Design Examples - Tidio](https://www.tidio.com/blog/chatbot-ui/)

### Confirmation & Error UX
- [Confirmation Dialogs - NN/g](https://www.nngroup.com/articles/confirmation-dialog/)
- [Cancel vs Close - NN/g](https://www.nngroup.com/articles/cancel-vs-close/)
- [Error Message Guidelines - NN/g](https://www.nngroup.com/articles/error-message-guidelines/)
- [Error Handling UX Design Patterns](https://medium.com/design-bootcamp/error-handling-ux-design-patterns-c2a5bbae5f8d)

### Accessibility
- [Accessible Live Chats - TestDevLab](https://www.testdevlab.com/blog/accessible-live-chats-tips-for-designing-creating-and-testing)
- [Keyboard Interface - W3C WAI](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [ARIA Attributes - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-keyshortcuts)

### Mobile & Responsive
- [Bottom Sheets - Material Design 3](https://m3.material.io/components/bottom-sheets/overview)
- [Bottom Sheet UX Guidelines - NN/g](https://www.nngroup.com/articles/bottom-sheet/)

### Context & Conversation
- [Session Management - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html)
- [Conversational Context - Google ADK](https://google.github.io/adk-docs/sessions/)
- [Chat History Management - Microsoft Semantic Kernel](https://learn.microsoft.com/en-us/semantic-kernel/concepts/ai-services/chat-completion/chat-history)

### AI Interface Design
- [Conversational AI UI Comparison 2025 - IntuitionLabs](https://intuitionlabs.ai/articles/conversational-ai-ui-comparison-2025)
- [GenAI Loading States - Cloudscape](https://cloudscape.design/patterns/genai/genai-loading-states/)
- [React Components for Conversational AI](https://www.shadcn.io/ai)

### Code & Animation
- [CSS Floating Action Buttons - FreeFrontend](https://freefrontend.com/css-floating-action-buttons/)
- [Building a FAB Component - web.dev](https://web.dev/building-a-fab-component/)
- [Typing Indicator - Flutter Cookbook](https://docs.flutter.dev/cookbook/effects/typing-indicator)
