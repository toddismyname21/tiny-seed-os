# Self-Healing & Autonomous Systems

## What Is Self-Healing Software?

Systems that autonomously detect, diagnose, and rectify issues without human intervention.

---

## The Self-Healing Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. MONITOR ──► 2. DETECT ──► 3. DIAGNOSE                 │
│        ▲                              │                     │
│        │                              ▼                     │
│   5. LEARN ◄──────────────── 4. RECOVER                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. Monitor
- Track system health in real-time
- Log errors, response times, uptime
- Monitor quota usage

### 2. Detect
- AI/rules identify anomalies
- Threshold alerts (error rate > 5%)
- Pattern recognition

### 3. Diagnose
- Automated root cause analysis
- Trace errors to source
- Categorize issue type

### 4. Recover
- Automatic rollback if available
- Restart failed services
- Alert human if can't auto-fix

### 5. Learn
- Refine detection rules
- Improve recovery procedures
- Reduce false positives

---

## Implementation for Google Apps Script

### Automated Health Checks

```javascript
// Run every 5 minutes via time-based trigger
function healthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: []
  };

  // Check 1: API responds
  try {
    const test = UrlFetchApp.fetch(DEPLOYED_URL + '?action=ping');
    results.checks.push({ name: 'api_response', status: 'ok', time: test.getResponseCode() });
  } catch (e) {
    results.checks.push({ name: 'api_response', status: 'error', error: e.message });
    sendAlert('API not responding: ' + e.message);
  }

  // Check 2: Sheets accessible
  try {
    SpreadsheetApp.openById(MAIN_SHEET_ID).getName();
    results.checks.push({ name: 'sheets_access', status: 'ok' });
  } catch (e) {
    results.checks.push({ name: 'sheets_access', status: 'error', error: e.message });
  }

  // Check 3: Quota remaining
  const quotaRemaining = UrlFetchApp.getRemainingDailyQuota();
  if (quotaRemaining < 1000) {
    results.checks.push({ name: 'quota', status: 'warning', remaining: quotaRemaining });
    sendAlert('Low quota warning: ' + quotaRemaining + ' remaining');
  } else {
    results.checks.push({ name: 'quota', status: 'ok', remaining: quotaRemaining });
  }

  // Log results
  logHealthCheck(results);

  return results;
}
```

### Error Logging

```javascript
function logError(error, context) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('System_Errors');
  sheet.appendRow([
    new Date().toISOString(),
    error.name || 'Error',
    error.message,
    error.stack || '',
    JSON.stringify(context),
    'unresolved'
  ]);

  // Alert if critical
  if (isCriticalError(error)) {
    sendSMSAlert('Critical error: ' + error.message);
  }
}

function isCriticalError(error) {
  const criticalPatterns = [
    /quota exceeded/i,
    /permission denied/i,
    /service unavailable/i,
    /payment/i
  ];
  return criticalPatterns.some(p => p.test(error.message));
}
```

### SMS Alerts

```javascript
function sendSMSAlert(message) {
  const twilioSid = PropertiesService.getScriptProperties().getProperty('TWILIO_SID');
  const twilioToken = PropertiesService.getScriptProperties().getProperty('TWILIO_TOKEN');
  const twilioPhone = PropertiesService.getScriptProperties().getProperty('TWILIO_PHONE');
  const ownerPhone = '+17177255177'; // Todd's phone

  const payload = {
    To: ownerPhone,
    From: twilioPhone,
    Body: '[Tiny Seed OS Alert] ' + message
  };

  UrlFetchApp.fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(twilioSid + ':' + twilioToken)
    },
    payload: payload
  });
}
```

---

## Monitoring Dashboard Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| API Response Time | <500ms | 500-2000ms | >2000ms |
| Error Rate | <1% | 1-5% | >5% |
| Daily Quota | >5000 | 1000-5000 | <1000 |
| Failed Health Checks | 0 | 1-2 | >2 |

---

## Scheduled Maintenance Tasks

| Task | Frequency | Purpose |
|------|-----------|---------|
| Health check | Every 5 min | Detect issues early |
| Error review | Hourly | Categorize and alert |
| Log cleanup | Daily | Archive old logs |
| Quota check | Daily morning | Plan for the day |
| Full audit | Weekly | Comprehensive review |

### Setting Up Triggers

```javascript
function setupAutonomousTriggers() {
  // Clear existing
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Health check every 5 minutes
  ScriptApp.newTrigger('healthCheck')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Daily cleanup at 2 AM
  ScriptApp.newTrigger('dailyMaintenance')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  // Weekly audit on Sunday at 3 AM
  ScriptApp.newTrigger('weeklyAudit')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(3)
    .create();
}
```

---

## Auto-Recovery Patterns

### Pattern 1: Retry with Backoff
```javascript
function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return UrlFetchApp.fetch(url, options);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      Utilities.sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

### Pattern 2: Fallback Data
```javascript
function getDataWithFallback() {
  try {
    return fetchLiveData();
  } catch (e) {
    logError(e, { context: 'getDataWithFallback' });
    return getCachedData() || getDefaultData();
  }
}
```

### Pattern 3: Circuit Breaker
```javascript
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  threshold: 5,
  resetTimeout: 60000, // 1 minute

  execute: function(fn) {
    if (this.isOpen()) {
      throw new Error('Circuit breaker open - service unavailable');
    }

    try {
      const result = fn();
      this.reset();
      return result;
    } catch (e) {
      this.recordFailure();
      throw e;
    }
  },

  isOpen: function() {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  },

  recordFailure: function() {
    this.failures++;
    this.lastFailure = Date.now();
  },

  reset: function() {
    this.failures = 0;
  }
};
```

---

## Sources
- [Digital.ai - Self-Healing Software](https://digital.ai/catalyst-blog/self-healing-software-development/)
- [Google Apps Script Dashboard](https://developers.google.com/apps-script/guides/dashboard)
- [NioTechOne - Self-Healing Applications](https://niotechone.com/blog/self-healing-applications-autonomous-software-systems/)
