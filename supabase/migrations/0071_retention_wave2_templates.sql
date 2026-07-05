-- ============================================================================
-- 0071_retention_wave2_templates.sql
--
-- PHASE 2 · WAVE 2 of the CSA retention layer (Todd's ask, 2026-07-05).
-- Spec: docs/audits/CSA_GAP_RESEARCH_2026-07.md (gaps 2/3) +
--       CSA_MASTER_PROPOSAL_2026-07.md (2.4 renewal campaigns / 2.5 win-back).
--
-- This is a DATA-ONLY migration: it seeds six reusable campaign_templates
-- (table + RLS defined in migration 0034) into the EXISTING campaign email
-- system. No new tables, no schema changes — the renewal/win-back audience
-- SEGMENTS are computed in application code (lib/campaign-segments.ts) and the
-- segment is carried in each template's recipient_filter JSONB.
--
--   RENEWAL (segment='renewal_window' — active members ≤N delivery weeks from
--            season end; N in each template's recipient_filter):
--     • Renewal — Early bird   (~30 days out · ≤4 weeks left)
--     • Renewal — Reminder     (~14 days out · ≤2 weeks left)
--     • Renewal — Last call    (final week   · ≤1 week left)
--
--   WIN-BACK (segment='lapsed' — former members with no active share, opt-outs
--             excluded in code):
--     • Win-back — What's growing now
--     • Win-back — We saved you a spot
--     • Win-back — Final note
--
-- ── COPY ─────────────────────────────────────────────────────────────────────
-- Bodies follow the customer-comms voice rule (docs/CSA_GLOSSARY_OF_TRUTH.md):
-- state WHAT THEY GET, HOW to act (one button), and WHY it's good for everyone —
-- no self-referential "we're excited / we rebuilt" framing. Bodies are HTML (a
-- leading <p> makes lib/campaign formatBodyAsHtml pass them through untouched)
-- with two substitutions the send/preview code fills in:
--     {{first_name}}   — the recipient's first name (existing).
--     {{renewal_url}}  — portal_settings.renewal_url, injected at send time
--                        (Phase 2 Wave 2 — lib/campaign fetchRenewalUrl +
--                        personalize). The CTA button href is {{renewal_url}}.
-- Todd reviews + edits every campaign in the composer before sending; these are
-- starting points, not autosends.
--
-- ── CATEGORY ─────────────────────────────────────────────────────────────────
-- category is constrained by 0034 to (announcement,weekly,reminder,wholesale,
-- welcome). Renewal notes use 'reminder'; win-back notes use 'announcement'.
-- (No new category is introduced — that would require altering the CHECK.)
--
-- ── IDEMPOTENCY ──────────────────────────────────────────────────────────────
-- ON CONFLICT (name) DO NOTHING — campaign_templates.name is UNIQUE (0034).
-- Re-running never duplicates and never clobbers an admin's later edits. The
-- names ARE the stable join key the /admin/campaigns playbook cards deep-link to
-- (RENEWAL_TEMPLATE_NAMES / WINBACK_TEMPLATE_NAMES in lib/campaign-segments.ts —
-- keep in sync). No transaction wrapper / NO trailing ROLLBACK: the Management
-- API runner wraps each submission in one implicit txn, and these seeds must
-- PERSIST (data, not DDL). Ends with a read-only verify SELECT.
-- ============================================================================

INSERT INTO campaign_templates (name, category, subject, preview_text, body_html, recipient_filter)
VALUES
  -- ── RENEWAL — Early bird (~30 days out) ──────────────────────────────────
  (
    'Renewal — Early bird',
    'reminder',
    'Reserve your Tiny Seed share for next season 🌱',
    'A few weeks left this season — renew now to hold your spot and help the field get planned.',
    $body$<p>Hi {{first_name}},</p>
<p>Your share has a few weeks left this season — and next season's planting is already being mapped out. Renewing now holds your exact spot before the field is planned around it.</p>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Reserve my spot for next season →</a></div>
<p><strong>What renewing gets you:</strong></p>
<ul>
<li>Your same share, held for you — no scramble if shares fill up</li>
<li>First pick of pickup day and location before new members choose</li>
<li>Your preferences and pickup carry straight over — nothing to set up again</li>
</ul>
<p><strong>Why early helps the whole CSA:</strong> every renewal tells the crew what to seed and how much to plant. The earlier the numbers are in, the better the field is planned — which means fuller boxes and less waste for everyone.</p>
<p>Questions about next season? Just reply — happy to help.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "renewal_window", "renewal_weeks_threshold": 4}'::jsonb
  ),

  -- ── RENEWAL — Reminder (~14 days out) ────────────────────────────────────
  (
    'Renewal — Reminder',
    'reminder',
    'Two weeks left — hold your Tiny Seed spot 🌱',
    'Your season is almost up. Renew now so your share carries into next season without a gap.',
    $body$<p>Hi {{first_name}},</p>
<p>You're down to the last couple of weeks of the season. Renewing now keeps your share going into next season with no gap — same box, same pickup, nothing to re-set-up.</p>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Hold my spot →</a></div>
<p><strong>What carries over:</strong></p>
<ul>
<li>Your share and pickup, exactly as they are now</li>
<li>Your saved preferences — allergies and dislikes come with you</li>
<li>No lapse — you pick up right where this season leaves off</li>
</ul>
<p><strong>Why it helps everyone:</strong> knowing who's coming back lets the crew plant the right amount — fuller boxes, less waste, and your spot stays yours.</p>
<p>Anything you're wondering about? Just reply.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "renewal_window", "renewal_weeks_threshold": 2}'::jsonb
  ),

  -- ── RENEWAL — Last call (final week) ─────────────────────────────────────
  (
    'Renewal — Last call',
    'reminder',
    'Last call to keep your Tiny Seed share 🌱',
    'This is the final week of your season — renew now to keep your spot for next season.',
    $body$<p>Hi {{first_name}},</p>
<p>This is the final week of your season — and the last easy moment to keep your spot for next season before it opens to new members.</p>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Keep my spot →</a></div>
<p>One click holds everything you already have: your share size, your pickup, and your preferences. Nothing to redo.</p>
<p><strong>Why now:</strong> once the season closes, open spots go to the waitlist. Renewing keeps yours yours — and helps the crew lock in next season's planting.</p>
<p>Want to change your share or pickup for next season? Just reply and we'll sort it out together.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "renewal_window", "renewal_weeks_threshold": 1}'::jsonb
  ),

  -- ── WIN-BACK — What's growing now ────────────────────────────────────────
  (
    'Win-back — What''s growing now',
    'announcement',
    'Here''s what''s coming out of the field right now 🌱',
    'A quick look at what''s in season at Tiny Seed — and how to get a box again.',
    $body$<p>Hi {{first_name}},</p>
<p>The field is in full swing right now — and there's room for you at the table again.</p>
<p>Coming out of the ground this stretch of the season:</p>
<ul>
<li>Sweet summer tomatoes and peppers at their peak</li>
<li>Crisp greens, cucumbers, and fresh-cut herbs</li>
<li>Whatever's ripening that week — picked the morning it goes in your box</li>
</ul>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Get a box again →</a></div>
<p><strong>Why it's a good time:</strong> a share now means the freshest stretch of the season, and it helps the crew plan how much to keep harvesting. Your spot is easy to pick back up.</p>
<p>Questions about jumping back in? Just reply.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "lapsed", "renewal_weeks_threshold": null}'::jsonb
  ),

  -- ── WIN-BACK — We saved you a spot ───────────────────────────────────────
  (
    'Win-back — We saved you a spot',
    'announcement',
    'There''s a Tiny Seed share with your name on it 🌱',
    'Your spot is easy to pick back up — same fresh box, same simple pickup.',
    $body$<p>Hi {{first_name}},</p>
<p>Coming back is simple — your spot is ready whenever you are, with the same weekly box of just-picked produce and the same easy pickup.</p>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Claim my spot →</a></div>
<p><strong>What you get again:</strong></p>
<ul>
<li>A weekly box picked at peak freshness</li>
<li>Pickup close to you, on your schedule</li>
<li>Produce that's planned and grown for members like you</li>
</ul>
<p><strong>Why it works for everyone:</strong> a returning member helps the crew plant with confidence — the more shares are spoken for, the fuller every box gets and the less good food goes to waste.</p>
<p>Want to tweak your share or pickup before you rejoin? Just reply.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "lapsed", "renewal_weeks_threshold": null}'::jsonb
  ),

  -- ── WIN-BACK — Final note ────────────────────────────────────────────────
  (
    'Win-back — Final note',
    'announcement',
    'One last note from the field 🌱',
    'No pressure — just an open door whenever you''d like a box again.',
    $body$<p>Hi {{first_name}},</p>
<p>This is the last note about rejoining — no pressure at all. The door stays open whenever a weekly box of fresh-picked produce sounds good again.</p>
<div style="text-align:center;margin:24px 0"><a href="{{renewal_url}}" style="display:inline-block;background:#166534;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:10px">Come back when you're ready →</a></div>
<p>If now's not the time, that's completely fine. Whenever you'd like back in, your spot is a click away — and a quick reply to this email gets you a hand with anything.</p>
<p>Wishing you good eating, from all of us in the field.</p>
<p>— Farmer Todd and the Tiny Seed Crew</p>$body$,
    '{"share_types": [], "newsletter_opt_in": true, "segment": "lapsed", "renewal_weeks_threshold": null}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ── Verification (read-only) ────────────────────────────────────────────────
SELECT name, category, recipient_filter ->> 'segment' AS segment
FROM campaign_templates
WHERE name IN (
  'Renewal — Early bird',
  'Renewal — Reminder',
  'Renewal — Last call',
  'Win-back — What''s growing now',
  'Win-back — We saved you a spot',
  'Win-back — Final note'
)
ORDER BY category, name;
