# No-Code Admin Dashboard Patterns

## The Goal

Build an admin interface that lets non-technical users manage the Tiny Seed OS without touching code or using the terminal.

---

## What Makes Great Admin UX

### Key Principles (from WeWeb, Notion, Shopify)

1. **Clean layouts** - Only show relevant info on main screen
2. **Customizable widgets** - Let users rearrange
3. **Role-based views** - Different users see different things
4. **Guided setup wizards** - Reduce overwhelm
5. **Contextual help** - Tooltips and pop-ups

---

## Admin Modules Needed

| Module | Function | Priority |
|--------|----------|----------|
| **Feature Toggles** | Enable/disable features | High |
| **Content Editor** | Edit text, messages, templates | High |
| **User Management** | Roles, permissions, access | Medium |
| **System Health** | Errors, performance, uptime | Medium |
| **Audit Log** | Who changed what, when | Medium |
| **Notifications** | Configure alerts and SMS | Low |

---

## Module 1: Feature Toggles

```html
<div class="admin-card">
  <h3>Feature Flags</h3>
  <p class="subtitle">Enable or disable features without code changes</p>

  <div class="toggle-list">
    <div class="toggle-item">
      <div class="toggle-info">
        <h4>Grants Dashboard</h4>
        <p>Grant management and application tracking</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-feature="grants_dashboard" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="toggle-item">
      <div class="toggle-info">
        <h4>Paid Ads Tab</h4>
        <p>Meta Ads integration in Marketing</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-feature="paid_ads_tab" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="toggle-item">
      <div class="toggle-info">
        <h4>Satellite Imagery</h4>
        <p>Crop health monitoring from satellite</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-feature="satellite_imagery">
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <button class="btn btn-primary" onclick="saveFeatureFlags()">
    Save Changes
  </button>
</div>
```

---

## Module 2: Content Editor

```html
<div class="admin-card">
  <h3>Messages & Content</h3>

  <div class="content-tabs">
    <button class="tab active" data-tab="emails">Email Templates</button>
    <button class="tab" data-tab="sms">SMS Messages</button>
    <button class="tab" data-tab="ui">UI Text</button>
  </div>

  <div class="content-editor">
    <div class="message-list">
      <div class="message-item" onclick="editMessage('welcome_email')">
        <span class="message-name">Welcome Email</span>
        <span class="message-status active">Active</span>
      </div>
      <div class="message-item" onclick="editMessage('order_confirm')">
        <span class="message-name">Order Confirmation</span>
        <span class="message-status active">Active</span>
      </div>
    </div>

    <div class="editor-pane">
      <label>Subject Line</label>
      <input type="text" id="messageSubject" value="Welcome to Tiny Seed Farm!">

      <label>Message Body</label>
      <textarea id="messageBody" rows="10">
Thanks for joining our CSA family!

Your first delivery will be on {{delivery_date}}.

Questions? Reply to this email or call us at 717-725-5177.
      </textarea>

      <div class="editor-help">
        <strong>Available variables:</strong>
        {{customer_name}}, {{delivery_date}}, {{order_id}}, {{pickup_location}}
      </div>

      <button class="btn btn-primary">Save Template</button>
      <button class="btn btn-secondary">Send Test</button>
    </div>
  </div>
</div>
```

---

## Module 3: System Health Dashboard

```html
<div class="admin-card">
  <h3>System Health</h3>

  <div class="health-grid">
    <div class="health-metric good">
      <div class="metric-icon">✓</div>
      <div class="metric-info">
        <span class="metric-value">99.8%</span>
        <span class="metric-label">Uptime (30 days)</span>
      </div>
    </div>

    <div class="health-metric good">
      <div class="metric-icon">⚡</div>
      <div class="metric-info">
        <span class="metric-value">245ms</span>
        <span class="metric-label">Avg Response Time</span>
      </div>
    </div>

    <div class="health-metric warning">
      <div class="metric-icon">⚠️</div>
      <div class="metric-info">
        <span class="metric-value">2,847</span>
        <span class="metric-label">API Quota Remaining</span>
      </div>
    </div>

    <div class="health-metric good">
      <div class="metric-icon">📧</div>
      <div class="metric-info">
        <span class="metric-value">0</span>
        <span class="metric-label">Errors Today</span>
      </div>
    </div>
  </div>

  <h4>Recent Alerts</h4>
  <div class="alerts-list">
    <div class="alert-item resolved">
      <span class="alert-time">2 hours ago</span>
      <span class="alert-message">High API latency detected - auto-resolved</span>
    </div>
    <div class="alert-item resolved">
      <span class="alert-time">Yesterday</span>
      <span class="alert-message">Quota warning at 80% - reset at midnight</span>
    </div>
  </div>
</div>
```

---

## Module 4: Audit Log

```html
<div class="admin-card">
  <h3>Activity Log</h3>

  <div class="filter-bar">
    <select id="auditFilter">
      <option value="all">All Actions</option>
      <option value="config">Config Changes</option>
      <option value="content">Content Updates</option>
      <option value="system">System Events</option>
    </select>
    <input type="date" id="auditDate">
  </div>

  <table class="audit-table">
    <thead>
      <tr>
        <th>Time</th>
        <th>User</th>
        <th>Action</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>10:30 AM</td>
        <td>admin</td>
        <td>feature_toggle</td>
        <td>Enabled: paid_ads_tab</td>
      </tr>
      <tr>
        <td>9:15 AM</td>
        <td>system</td>
        <td>health_check</td>
        <td>All systems operational</td>
      </tr>
      <tr>
        <td>Yesterday 4:00 PM</td>
        <td>admin</td>
        <td>content_update</td>
        <td>Updated: welcome_email template</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## JavaScript Functions

```javascript
// Load feature flags from Google Sheets
async function loadFeatureFlags() {
  const response = await fetch(API_URL + '?action=getFeatureFlags');
  const data = await response.json();

  Object.keys(data.flags).forEach(key => {
    const toggle = document.querySelector(`[data-feature="${key}"]`);
    if (toggle) {
      toggle.checked = data.flags[key].enabled;
    }
  });
}

// Save feature flags to Google Sheets
async function saveFeatureFlags() {
  const flags = {};
  document.querySelectorAll('[data-feature]').forEach(toggle => {
    flags[toggle.dataset.feature] = toggle.checked;
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateFeatureFlags',
      flags: flags
    })
  });

  const result = await response.json();
  if (result.success) {
    showToast('Settings saved!');
    logAuditEvent('feature_toggle', flags);
  }
}

// Log to audit sheet
async function logAuditEvent(action, details) {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'logAudit',
      event: {
        timestamp: new Date().toISOString(),
        user: getCurrentUser(),
        action: action,
        details: JSON.stringify(details)
      }
    })
  });
}
```

---

## Admin Page Structure

```
/admin.html
├── Header (logo, user menu, logout)
├── Sidebar Navigation
│   ├── Dashboard (overview)
│   ├── Features (toggles)
│   ├── Content (messages, templates)
│   ├── Users (if multi-user)
│   ├── System (health, logs)
│   └── Settings (API keys, config)
└── Main Content Area
    └── Selected module content
```

---

## Access Control

```javascript
// Only admins can access /admin.html
const ADMIN_ROLES = ['admin', 'owner'];

function checkAdminAccess() {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    window.location.href = '/unauthorized.html';
    return false;
  }

  return true;
}

// Run on page load
if (!checkAdminAccess()) {
  throw new Error('Unauthorized');
}
```

---

## Sources
- [WeWeb - Admin Dashboard Guide](https://www.weweb.io/blog/admin-dashboard-ultimate-guide-templates-examples)
- [UX Design - B2B Dashboard Design](https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d)
- [Shopify Admin Patterns](https://polaris.shopify.com)
