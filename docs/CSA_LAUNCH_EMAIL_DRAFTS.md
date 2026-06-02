# CSA Portal Launch — Email Drafts (V2)

**Date:** 2026-06-02
**Audience:** Existing 2026 CSA members
**Sender:** `hello@tinyseedfarm.com` (reply-to: `todd@tinyseedfarmpgh.com`)
**Personalization tokens:** `{{first_name}}`, `{{email}}` (pre-fills sign-in URL for one-click flow)

**Voice rule applied:** WHAT it does for them → HOW to do it → WHY it's good for all of us. No "we built this." No backstory.

---

## Wave 1 — Summer Veg + Flex (147 deliverable, Week 1 = Wed June 10)

**Subject:** Your CSA at csa.tinyseedfarm.com 🌱
**Preview:** Set allergies, schedule vacations, manage your share. Week 1 starts June 10.

**Body:**

```html
<p>Hi {{first_name}},</p>

<p>You can now manage your whole CSA from your phone at <strong>csa.tinyseedfarm.com</strong>.</p>

<p style="margin: 24px 0; text-align: center;">
  <a href="https://csa.tinyseedfarm.com/login?email={{email}}"
     style="display: inline-block; background: #2e7d32; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
    Sign in →
  </a>
</p>

<p>Sign in with your email — we'll send you a one-time link. No password.</p>

<p><strong>What's there for you:</strong></p>
<ul>
  <li><strong>Set "always avoid" preferences</strong> — tell us once, we'll auto-swap allergies and dislikes every week. No thinking required.</li>
  <li><strong>Schedule a vacation hold</strong> when you're out of town</li>
  <li><strong>Add funds to your Farm Flex wallet</strong> for extras</li>
  <li><strong>Change your pickup location</strong> anytime</li>
</ul>

<p><strong>Why this is better for all of us:</strong> when you tell us your preferences, we pack what you'll actually eat. Less food in the compost. Fewer "please skip my box" emails. More time for everyone to enjoy the actual food.</p>

<p><strong>Week 1 starts Wednesday, June 10.</strong> Pop in before then to set your preferences so your first box comes out right.</p>

<p>Anything off? Just reply — I'll fix it.</p>

<p>— Farmer Todd and the Tiny Seed Crew</p>
```

---

## Wave 2 — Flower CSA (48 deliverable, Week 1 = Wed June 24)

**Subject:** Your Flower CSA at csa.tinyseedfarm.com 🌸
**Preview:** Manage your flower share, schedule vacations, update pickup. Week 1 starts June 24.

**Body:**

```html
<p>Hi {{first_name}},</p>

<p>You can now manage your Flower CSA from your phone at <strong>csa.tinyseedfarm.com</strong>.</p>

<p style="margin: 24px 0; text-align: center;">
  <a href="https://csa.tinyseedfarm.com/login?email={{email}}"
     style="display: inline-block; background: #ad1457; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
    Sign in →
  </a>
</p>

<p>Sign in with your email — we'll send you a one-time link. No password.</p>

<p><strong>What's there for you:</strong></p>
<ul>
  <li><strong>Schedule a vacation</strong> when you're out of town</li>
  <li><strong>Change your pickup location</strong> anytime</li>
  <li><strong>Set notification preferences</strong></li>
  <li>See your share details + weeks remaining</li>
</ul>

<p><strong>Why this is better for all of us:</strong> when you tell us in advance, we can save your bouquet for someone who'll enjoy it instead of composting it. And you get back from vacation to a fresh bouquet on the right week.</p>

<p><strong>Week 1 starts Wednesday, June 24</strong> — two weeks behind the Summer CSA so the field has time to bloom. Sixteen weeks of fresh-cut flowers ahead.</p>

<p>Anything off? Just reply.</p>

<p>— Farmer Todd and the Tiny Seed Crew</p>
```

---

## Notes

| Item | Note |
|------|------|
| Subject 🌱 / 🌸 | Inbox scannability + program signal |
| Pre-filled email in CTA link | Customer hits "Sign in" → portal autofills their email → fewer keystrokes |
| Reply-to → your inbox | Member questions land directly with you |
| First-name token | Adds warmth, takes seconds to render |
| Bullets bolded | Easy mobile scanning |
| "Why this is better for all of us" framing | Mutual benefit — anchors the relationship |
| No "we rebuilt" / "we're excited" | Customer doesn't care about the farm-side story; only what they get |

---

## To approve

Reply "send these" → I have them ready to paste into the campaign sender the moment the build is verified. Or send line edits — I'll incorporate and re-show.
