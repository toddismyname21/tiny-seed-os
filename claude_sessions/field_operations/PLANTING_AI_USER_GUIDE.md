# Natural Language Planting Intelligence - User Guide

## Quick Start

**Location:** AI Assistant (web_app/ai-assistant.html)

**How to Use:**
1. Open AI Assistant
2. Switch to "Farm" mode (top right)
3. Type a planting command in natural language
4. Review the confirmation
5. Reply "confirm" or "cancel"

---

## Example Commands

### Basic Examples

```
add four plantings of lettuce weekly starting May 1st
```
Creates 4 lettuce plantings, one per week, starting May 1.

```
plant tomatoes every 2 weeks from June 1 through August 1
```
Creates tomato plantings every 2 weeks within the date range.

```
add a single planting of carrots on June 15
```
Creates one carrot planting on June 15.

```
create 6 plantings Benefine Endive monthly starting May 1st
```
Creates 6 Benefine Endive plantings, one per month.

---

## Supported Patterns

### Quantities
- **Words:** "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "single"
- **Numbers:** "4", "10", "12"
- **Phrases:** "four plantings", "a single planting"

### Frequencies
- **Weekly:** "weekly", "every week", "per week"
- **Biweekly:** "biweekly", "every 2 weeks", "bi-weekly"
- **Monthly:** "monthly", "every month", "per month", "one per month"
- **Custom:** "every 10 days" (any number)

### Dates
- **Full Date:** "May 1st", "May 15", "June 1"
- **Month Only:** "May", "June" (defaults to 1st of month)
- **Start:** "starting May 1st", "from May 1"
- **End:** "through August", "until September"

### Crops
- Uses your existing REF_CropProfiles data
- Case-insensitive matching
- Supports variety names if included

---

## What Happens Automatically

For each planting date, the system:

1. **Creates Greenhouse Sowing**
   - Calculated 28 days before transplant (default)
   - Uses crop profile data for accurate timing
   - Located in "Greenhouse" bed

2. **Creates Field Transplant**
   - On your specified date
   - Auto-assigns batch ID
   - Links to greenhouse sowing

3. **Generates Tasks**
   - Sowing task
   - Transplanting task
   - Harvest reminder tasks

4. **Updates Inventory**
   - Deducts seeds from inventory
   - Tracks seed usage by batch

---

## Confirmation Flow

### Step 1: System Parses Your Request

You: `add four plantings of lettuce weekly starting May 1st`

### Step 2: System Shows Preview

```
I'll create 4 planting(s) of Lettuce with these dates:

1. 2026-05-01
2. 2026-05-08
3. 2026-05-15
4. 2026-05-22

Each planting will include:
- Greenhouse sowing (28 days before transplant)
- Field transplant on scheduled date
- Auto-generated tasks

Reply "confirm" to proceed, or "cancel" to abort.
```

### Step 3: You Confirm

You: `confirm`

### Step 4: System Creates Plantings

```
✓ Success! Created 4 planting(s) of Lettuce with greenhouse sowings

Details:
- 2026-05-01: Lettuce (Batch LET-2605A)
  Sow date: 2026-04-03
- 2026-05-08: Lettuce (Batch LET-2605B)
  Sow date: 2026-04-10
- 2026-05-15: Lettuce (Batch LET-2605C)
  Sow date: 2026-04-17
- 2026-05-22: Lettuce (Batch LET-2605D)
  Sow date: 2026-04-24

Your plantings have been added to the system!
```

---

## Advanced Usage

### Specify Variety

```
add four plantings Benefine Endive monthly starting May 1st
```

The system will search for "Endive" in crop profiles and "Benefine" in variety names.

### Date Ranges

```
plant lettuce every week from May 1 through June 30
```

Creates weekly plantings within the specified range.

### Custom Intervals

```
add plantings of spinach every 10 days starting April 15
```

Creates plantings at 10-day intervals.

---

## Troubleshooting

### "I need more information"

**Problem:** System couldn't parse the crop or dates.

**Solution:**
- Check crop name against your REF_CropProfiles sheet
- Ensure date includes month and day
- Use supported frequency keywords

**Example Fix:**
- ❌ `add plantings starting next week`
- ✅ `add plantings of lettuce starting May 1st`

### "Crop profile not found"

**Problem:** Crop name doesn't match REF_CropProfiles.

**Solution:**
- Check spelling
- Use crop names exactly as they appear in REF_CropProfiles
- Add crop to REF_CropProfiles if missing

### No Confirmation Shown

**Problem:** System went straight to asking clarification questions.

**Solution:**
- Include all required elements: crop, quantity, frequency, date
- Use clear keywords like "add", "create", "plant"

---

## Tips for Best Results

### Be Specific
✅ `add four plantings of romaine lettuce weekly starting May 1st`
❌ `plant some lettuce`

### Use Supported Keywords
✅ `add`, `create`, `plant`, `schedule`
❌ `I want`, `maybe`, `thinking about`

### Include Frequency
✅ `weekly`, `every 2 weeks`, `monthly`
❌ `regularly`, `often`, "sometimes"

### Use Clear Dates
✅ `May 1st`, `June 15`, `starting May 1`
❌ `soon`, `next month`, "later"

### One Crop at a Time
✅ `add lettuce weekly starting May 1`
✅ `add tomatoes every 2 weeks starting June 1`
❌ `add lettuce and tomatoes weekly starting May 1`

---

## Integration with Existing System

### Data Storage
- Plantings saved to: **PLANNING_2026** sheet
- Uses existing column structure
- Compatible with all existing views

### Batch IDs
- Auto-generated: `CROP-YYMM[A-Z]`
- Example: `LET-2605A` (Lettuce, May 2026, sequence A)
- Unique per planting

### Tasks
- Auto-created via `generatePlantingTasks()`
- Assigned based on planting dates
- Visible in employee task views

### Inventory
- Seeds deducted via `deductSeedsForPlanting()`
- Tracks usage by batch
- Non-fatal if seed not in inventory

---

## API Access (For Advanced Users)

### Parse Request Only
```javascript
callAPI('parsePlantingRequest', {
  text: 'add four plantings of lettuce weekly starting May 1st'
});
```

Returns parsed data without creating plantings.

### Create Plantings Directly
```javascript
callAPI('addPlantingsFromAI', {
  crop: 'Lettuce',
  variety: 'Romaine',
  dates: ['2026-05-01', '2026-05-08', '2026-05-15'],
  autoSowing: true,
  plantsNeeded: 100
});
```

Bypasses natural language parsing.

---

## Technical Details

### Default Values
- **Plants per planting:** 100
- **Tray cell count:** 72
- **Days to transplant:** 28 (or from crop profile)
- **Bed assignment:** "Unassigned" (field), "Greenhouse" (sowing)

### Customization
To change defaults, modify:
- `addPlantingsFromAI()` in MERGED TOTAL.js
- Default params: `plantsNeeded`, `daysToTransplant`

### Performance
- Parse time: <100ms
- Creation time: ~50-100ms per planting
- 10 plantings: ~1 second total

---

## Future Enhancements (Planned)

- Bed assignment in natural language: "...in bed A1"
- Quantity specification: "...with 200 plants per planting"
- Relative dates: "starting next Monday"
- Batch templates: "add spring lettuce succession"
- Voice command support

---

## Questions?

This feature was built by Field Operations Claude on 2026-01-24.

For issues or feature requests, contact PM_Architect or check:
- `/claude_sessions/field_operations/OUTBOX.md`
- `/CHANGE_LOG.md` (entry dated 2026-01-24)
