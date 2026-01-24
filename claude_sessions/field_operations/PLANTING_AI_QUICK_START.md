# Natural Language Planting - Quick Start

## 🎯 What You Can Do Now

Create plantings by just telling the AI what you want!

## 📍 Where

**AI Assistant** → Switch to "Farm" mode
- URL: `web_app/ai-assistant.html`

## 💬 Examples

```
add four plantings Benefine Endive one per month starting May 1st
```

```
plant lettuce every 2 weeks from May through August
```

```
add a single planting of carrots on June 1
```

## ✨ What Happens

1. System parses your request
2. Shows you what it will create
3. Asks for confirmation
4. Creates all plantings + greenhouse sowings
5. Auto-generates tasks
6. Deducts seeds from inventory

## 🔄 Confirmation Flow

**You:** `add four plantings of lettuce weekly starting May 1st`

**AI:** Shows 4 dates, asks for confirmation

**You:** `confirm`

**AI:** Creates all plantings and shows batch IDs

## 📝 Pattern

```
[add/create/plant] [number] plantings of [crop] [frequency] starting [date]
```

**Frequencies:**
- weekly
- biweekly / every 2 weeks
- monthly
- every 10 days (any number)

**Dates:**
- May 1st, May 1, May 15
- starting May 1
- from May through August

## ⚡ Quick Tips

✅ **DO:**
- Be specific: "add four plantings of romaine lettuce"
- Use clear dates: "starting May 1st"
- Confirm before creation

❌ **DON'T:**
- Be vague: "plant some stuff"
- Use unclear dates: "soon" or "later"
- Try multiple crops at once

## 🎬 Try It Now

1. Open AI Assistant
2. Click "Farm" mode
3. Click the quick action: "Try: Add plantings"
4. See the example populate
5. Press send
6. Reply "confirm" or "cancel"

---

**Built:** 2026-01-24 by Field Operations Claude
**Full Guide:** `PLANTING_AI_USER_GUIDE.md`
