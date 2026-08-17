---
name: no-business-data-public-pages
description: Logged-out / public-facing pages must NOT expose internal business metrics (member counts, full pickup-location lists, box contents, revenue, etc.)
metadata:
  type: feedback
---

Public / pre-login pages should be sign-in only. Do NOT surface internal business data to logged-out visitors.

**Why:** On 2026-05-20 Todd flagged the CSA portal landing page (`apps/csa-portal/src/pages/index.astro`) for showing the live active-member count (245) and the full list of pickup locations with cities/days/times. His point: "WHY do all of the members need to know how many active members we have?" That data tells competitors the exact size of the CSA and maps the entire distribution network publicly. It was leftover Day-2 proof-of-concept content (live counts existed only to prove the Supabase→Astro→Vercel pipeline worked).

**How to apply:** Any logged-out / public page (CSA landing, future wholesale portal landing, marketing pages) should default to sign-in + contact only. Internal metrics — member/customer counts, full location lists, box contents, revenue, order volumes — go BEHIND auth. A marketing teaser (e.g., a sample box to entice prospects) is allowed ONLY as a deliberate, designed feature, never as a default data dump. When building or reviewing a public page, ask "would a competitor benefit from seeing this?" — if yes, gate it behind login. Related: [[project_csa_no_ai_moat]].
