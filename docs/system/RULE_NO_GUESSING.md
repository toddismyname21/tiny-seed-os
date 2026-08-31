# RULE: Never guess. Act from a source of truth.

> **This file is the TRACKED mirror of `.claude/rules/no-guessing.md`.**
> `.claude/` is gitignored, so the live rule does not survive a machine move —
> which is exactly how `sms_intelligence` ended up pointing at
> `/Users/samanthapollack/` and silently not running. If you are setting up a
> new machine, copy this back to `.claude/rules/no-guessing.md`.

**Set by Todd, 2026-08-31**, after a day in which four separate "fixes" and
claims were built on inference rather than fact.

> Make it a rule that you don't guess. You act from a source of truth always.

## The rule

**Every claim you make and every value you write must have been READ from an
authoritative source in that same action.**

If you cannot read it, you do not state it. You say what you don't know and how
you'd find out.

Inference is not knowledge. A code comment is not a live system. A field that is
usually populated is not a field that is populated. A name that looks like
another name is not that name.

## When there is no source

**Return nothing. Leave it blank. Say "unverified."**

A blank is honest and a human fills it in. A confident wrong answer gets acted
on — someone picks 120 lb of basil instead of 120 bunches, or emails a customer
produce the farm does not have.

Never round a gap up into an answer to look complete.

## Sources of truth

| Question | Read it from |
|---|---|
| Who gets a share this week | `resolveCycle` — never a raw members query |
| What a customer ordered | their actual email or text, re-read in full |
| What we billed | QuickBooks, not `invoiced_at` (37% populated) |
| Whether an email/text sent | `notification_log`, Resend id, or `chat.db` — never recall |
| A phone number | `config/verified_facts.json` |
| A price or unit | `wholesale_products` / `market_offerings`, checking `is_active` |
| Whether a product is available | **ASK TODD.** There is no table for what is actually in the field |
| What is scheduled to run | BOTH `vercel.json` AND the pg_cron migrations |
| What the database contains | the live database — not `database.types.ts`, which lags |
| Whether a page works | fetch the rendered page, not the source |
| Account limits, plans, config | the provider's API — never a code comment |

## Three tests before asserting anything

1. **Did I read this, in this action?** Not last hour, not from the conversation.
2. **Is this source authoritative, or merely available?** `packed_at` and
   `invoiced_at` exist and are mostly empty. Reading them is easy and wrong.
3. **If I'm wrong, who pays?** A packer, a chef, a food bank. Weight the check
   accordingly.

## What this cost on 2026-08-31

Each of these was inference presented as fact:

- **`unit` resolver guessed from the text before an em dash.** Stamped
  `Basil — bunch` as **`lb`**. A pack sheet would have read "120 lb basil."
  Shipped in the morning, producing bad data by lunch.
- **"Resend caps you at ~100/day."** Read from a stale comment in an abandoned
  file. `DAILY_SEND_CAP` is 5000. Told Todd his account had a limit it does not.
- **"$2,345 was never invoiced."** Read `invoiced_at`, which is set on 37% of
  orders. Todd HAD invoiced all of it. That email would have asked a food bank
  for sales-order numbers on invoices they already held.
- **"9 cron endpoints are dead."** Read `vercel.json` alone. Supabase pg_cron
  runs them. "Fixing" it would have double-sent customer email.
- **Offered Center for Hope salad mix and kale.** Every price verified; never
  asked the only question that mattered — *can you actually fill this?*

The through-line: reading one source and generalising. Two of the five were
caught by Todd, not by me.

## Related

- `.claude/rules/verify-before-send.md` — the same rule for outbound facts
- `.claude/rules/active-locks.md` — read the lock file before editing shared files
