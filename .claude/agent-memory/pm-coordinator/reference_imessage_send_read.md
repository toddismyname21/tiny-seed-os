---
name: imessage-send-read
description: Texting WORKS from Todd's Mac — send via AppleScript/Messages, read+decode chat.db. Twilio is not needed and never worked.
metadata:
  type: reference
---

# Texting from Todd's Mac — SEND and READ both work

Proven 2026-08-31 with two real deliveries (`sent=1 delivered=1`).

## SEND — AppleScript → Messages

```applescript
tell application "Messages"
  set svc to 1st service whose service type = iMessage
  set bud to buddy "+1XXXXXXXXXX" of svc
  send "body text" to bud
end tell
```

Run via `osascript <<'AS' ... AS` (quoted heredoc so the shell doesn't eat `$`).
Goes out **from Todd's own number, into the existing thread**, so replies land
where he already talks to that person. No Twilio, no A2P, no per-message cost.

**Twilio has never worked here and is not needed for this.** Do not propose it.

Note `tell application "Messages" to get name of every service` errors with
-1728 on this macOS; `1st service whose service type = iMessage` works.

## READ — `~/Library/Messages/chat.db` (SQLite, open read-only)

Two traps that silently return nothing:

1. **Most messages have NO `.text`.** Only ~3 of 638 recent rows did; the rest
   live in `attributedBody` as a binary blob. Extract with
   `re.search(r'NSString\x01\x94\x84\x01\+(.*?)\x86', blob.decode('utf-8','ignore'), re.S)`
   and fall back to a looser `NSString...([\x20-\x7e\n]{4,})` match.
2. **Date math must CAST.** `strftime('%s', ...)` returns TEXT; comparing it to
   the numeric Apple epoch silently matches nothing. Use
   `(m.date/1000000000 + 978307200) > CAST(strftime('%s','now','-12 days') AS INTEGER)`.

Also: `JOIN handle` drops sent messages whose `handle_id` is 0 — use LEFT JOIN
when you want both directions.

## Identifying WHO a number belongs to

- `config/verified_facts.json` — 24 named numbers, split into
  `farm_contact_phones` (ours) and `third_party_phones` (theirs). This is the
  registry the send-gate uses.
- `wholesale_account_contacts.phone` — 12 more, by name and role.
- `wholesale_accounts.phone` — 13 accounts.

**Crew numbers are in there too.** Ben Finley (412-862-0215) texts harvest
counts that read exactly like orders — see [[project_text_to_order_build]].

## Related
- Sending an SMS deep link instead (no automation permission needed):
  `/admin/text-stop` and `/admin/text-chef` build `sms:+1XXXXXXXXXX?&body=…`
- [[feedback_confirm_texts_before_send]]
