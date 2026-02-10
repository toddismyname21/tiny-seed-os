# Google Sheets as CMS & Database

## Why Google Sheets?

| Advantage | Description |
|-----------|-------------|
| **Simplicity** | Non-technical users can edit directly |
| **Cost** | Free with Google Workspace |
| **Multiplatform** | Access from any device |
| **Collaboration** | Multiple editors, real-time |
| **Version History** | Built-in backup and rollback |
| **Flexibility** | Add columns on the fly |

---

## Recommended Sheet Structure for Tiny Seed OS

### Tab 1: Config_Features
Feature flags (see FEATURE_FLAGS.md)

### Tab 2: Config_Settings
```
| setting_key | value | type | description |
|-------------|-------|------|-------------|
| company_name | Tiny Seed Farm | string | Display name |
| owner_phone | 717-725-5177 | string | Todd's phone |
| sms_enabled | TRUE | boolean | Send SMS notifications |
| ai_model | claude-sonnet | string | Which AI model to use |
| max_daily_emails | 50 | number | Email limit |
```

### Tab 3: Content_Messages
```
| message_key | title | body | active |
|-------------|-------|------|--------|
| welcome_email | Welcome to Tiny Seed! | Thanks for joining... | TRUE |
| order_confirm | Order Confirmed | Your order #{{id}}... | TRUE |
| delivery_reminder | Delivery Tomorrow | Your CSA box... | TRUE |
```

### Tab 4: Content_Neighborhoods
```
| neighborhood | active | delivery_day | zone | closest_stop |
|--------------|--------|--------------|------|--------------|
| Squirrel Hill | TRUE | Tuesday | Zone A | Bryant St Market |
| Shadyside | TRUE | Tuesday | Zone A | Bryant St Market |
| Fox Chapel | TRUE | Thursday | Zone B | Oakmont |
```

### Tab 5: Content_Grants
```
| grant_id | name | organization | deadline | status |
|----------|------|--------------|----------|--------|
| fvpg_2026 | Farm Vitality | PA Dept of Ag | 2026-05-19 | active |
| vapg_2026 | Value Added | USDA | Rolling | active |
```

### Tab 6: System_Audit
```
| timestamp | user | action | details |
|-----------|------|--------|---------|
| 2026-02-09 10:30 | admin | feature_toggle | enabled: paid_ads_tab |
| 2026-02-09 11:15 | system | health_check | all_ok |
```

---

## Performance Considerations

### Limitations
- **Rate limits** on published sheets
- **1000+ rows** slow down parsing
- **No server-side queries** - all filtering client-side
- **Public sheets** = no sensitive data

### Optimization Strategies

1. **Aggressive Caching**
```javascript
// Cache in Apps Script PropertiesService
const cache = CacheService.getScriptCache();
cache.put('config_data', JSON.stringify(data), 300); // 5 min

// Cache in browser localStorage
localStorage.setItem('config', JSON.stringify(data));
localStorage.setItem('config_time', Date.now());
```

2. **Batch Reads**
```javascript
// Read entire sheet at once, not row by row
const allData = sheet.getDataRange().getValues();
```

3. **Separate Sheets by Update Frequency**
- Frequently changing → separate sheet
- Rarely changing → cache longer

---

## Ideal Use Cases

**Good for:**
- Feature flags and settings
- Content/messaging templates
- Lists (neighborhoods, products)
- Simple data (under 1000 rows)
- Non-sensitive data

**Not good for:**
- High-traffic real-time data
- Complex relationships
- Sensitive/private data
- Transaction logs (use real DB)

---

## Migration Path

When Sheets becomes insufficient:

| Stage | Trigger | Solution |
|-------|---------|----------|
| **Stage 1** | Current | Google Sheets |
| **Stage 2** | 5000+ rows or need real-time | Firebase Realtime DB |
| **Stage 3** | Complex queries needed | Supabase (PostgreSQL) |
| **Stage 4** | Enterprise scale | Dedicated PostgreSQL |

**Hybrid Approach:** Keep Sheets as admin UI, sync to Firebase for production reads.

---

## Sample Apps Script Functions

```javascript
// Get all config as JSON
function getConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const config = {};

  // Features
  config.features = sheetToObject(ss.getSheetByName('Config_Features'));

  // Settings
  config.settings = sheetToKeyValue(ss.getSheetByName('Config_Settings'));

  // Messages
  config.messages = sheetToObject(ss.getSheetByName('Content_Messages'));

  return { success: true, config: config };
}

function sheetToObject(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = data[i][idx]);
    result.push(obj);
  }
  return result;
}

function sheetToKeyValue(sheet) {
  const data = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < data.length; i++) {
    result[data[i][0]] = data[i][1];
  }
  return result;
}
```

---

## Sources
- [Google Sheets as CMS - Medium](https://medium.com/@alyssax/how-to-use-google-sheets-as-a-cms-or-a-database-f9d8e736fdce)
- [Enterspeed - Sheets as CMS](https://www.enterspeed.com/blog/using-google-sheets-as-your-cms)
- [freeCodeCamp - Sheets + React](https://www.freecodecamp.org/news/how-to-build-a-basic-cms-with-google-sheets-and-reactjs/)
