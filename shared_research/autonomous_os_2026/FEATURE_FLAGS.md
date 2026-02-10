# Feature Flags & Backend-Driven Configuration

## What Are Feature Flags?

Conditional statements that enable or disable specific functionalities without changing code or redeploying the application.

---

## Best Practices (2025-2026)

### 1. Security
- Use encryption and strict access controls
- Regular audits for compliance
- Secure coding practices

### 2. Granular Controls
- Design flags that control a single feature
- Avoid all-or-nothing toggles
- Allow percentage rollouts

### 3. Manage Complexity
- Limit the number of active flags
- Clean up old/unused flags regularly
- Document what each flag controls

### 4. Separation of Concerns
- Separate toggle decision point from toggle logic
- Use a Toggle Router pattern

---

## 2026 Trends

| Trend | Description |
|-------|-------------|
| **AI-Driven Management** | Automation reduces manual effort |
| **Server-Side Flagging** | Better control without client-side impact |
| **CI/CD Integration** | Flags integrated into deployment pipelines |
| **Granular Targeting** | User-specific flags based on behavior |
| **Dynamic Management** | Real-time adjustments |

---

## Implementation for Tiny Seed OS

### Google Sheets Structure

Create a sheet called `Config_Features`:

| feature_key | enabled | roles | description | created | updated |
|-------------|---------|-------|-------------|---------|---------|
| grants_dashboard | TRUE | admin,manager | Grant management tab | 2026-02-09 | 2026-02-09 |
| paid_ads_tab | TRUE | admin | Meta Ads integration | 2026-02-09 | 2026-02-09 |
| satellite_imagery | FALSE | all | Satellite crop monitoring | 2026-02-09 | 2026-02-09 |
| ai_recommendations | TRUE | all | Claude AI suggestions | 2026-02-09 | 2026-02-09 |
| offline_mode | TRUE | all | PWA offline support | 2026-02-09 | 2026-02-09 |

### Apps Script Endpoint

```javascript
function getFeatureFlags() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Config_Features');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const flags = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    flags[row[0]] = {
      enabled: row[1] === true || row[1] === 'TRUE',
      roles: row[2] ? row[2].split(',') : ['all'],
      description: row[3]
    };
  }

  // Cache for 5 minutes
  CacheService.getScriptCache().put('feature_flags', JSON.stringify(flags), 300);

  return { success: true, flags: flags };
}
```

### Frontend Implementation

```javascript
// On app load
async function loadFeatureFlags() {
  // Check cache first
  const cached = localStorage.getItem('feature_flags');
  const cacheTime = localStorage.getItem('feature_flags_time');

  if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
    return JSON.parse(cached);
  }

  // Fetch from server
  const response = await fetch(API_URL + '?action=getFeatureFlags');
  const data = await response.json();

  if (data.success) {
    localStorage.setItem('feature_flags', JSON.stringify(data.flags));
    localStorage.setItem('feature_flags_time', Date.now().toString());
    return data.flags;
  }

  return cached ? JSON.parse(cached) : {};
}

// Usage
function showPaidAdsTab() {
  if (featureFlags.paid_ads_tab?.enabled) {
    document.getElementById('paidAdsTab').style.display = 'block';
  }
}
```

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **No code changes** | Toggle features from Google Sheets |
| **Instant rollback** | Disable broken features immediately |
| **Gradual rollout** | Test with subset of users |
| **A/B testing** | Compare feature variants |
| **User-specific** | Different features for different roles |

---

## Sources
- [Flagsmith Best Practices](https://www.flagsmith.com/blog/feature-flags-best-practices)
- [Martin Fowler - Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [LaunchDarkly Documentation](https://launchdarkly.com)
