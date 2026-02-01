# COMPREHENSIVE CHECKLIST: Taking TinyPM from Idea to App Store, Google Play, and Desktop

## Everything You Need — Zero Surprises

This document covers every step, requirement, cost, and gotcha for launching an AI-powered project management app that uses Anthropic's Claude API on Apple App Store, Google Play, and Desktop (macOS + Windows).

---

## PHASE 1: BUSINESS FORMATION (Do This First — Everything Depends On It)

### 1.1 Choose Business Structure: LLC vs Corporation

**What it is:** Your legal entity that separates personal assets from business liability.

**Recommendation for TinyPM:**
- **Start as an LLC** (simpler, cheaper, pass-through taxation, flexible)
- **Elect S-Corp tax status** once profitable (saves self-employment tax)
- **Convert to C-Corp later** only if seeking VC funding (VCs strongly prefer C-Corps, especially Delaware C-Corps)

**Why LLC first:**
- Pass-through taxation (no double taxation)
- $0-$500 formation cost depending on state
- Less paperwork than a corporation
- Can be taxed as S-Corp for payroll tax savings
- Can convert to C-Corp later if needed for investors

**Cost:** $50-$500 (state filing fees vary; Delaware LLC is ~$90 + $300 annual franchise tax; Wyoming LLC is ~$100 + $60 annual)

**Timeline:** 1-7 business days depending on state

**Gotchas:**
- If you plan to raise venture capital within the first year, skip the LLC and go straight to a **Delaware C-Corp**
- Some states (California) charge an $800 annual minimum franchise tax regardless of revenue
- Apple requires a "legal entity" for organization developer accounts — LLCs qualify

**Order of operations:** Do this FIRST. Everything below depends on having a legal entity.

---

### 1.2 Employer Identification Number (EIN)

**What it is:** A federal tax ID number from the IRS — like a Social Security number for your business.

**Why required:** Needed for business bank accounts, tax filings, Apple Developer Program (organization), Google Play (organization), hiring employees, and opening a Stripe account.

**Cost:** FREE (apply directly at IRS.gov)

**Timeline:** Instant if applied online (available Mon-Fri, 7am-10pm ET)

**Gotchas:**
- You can only apply once per day per responsible party
- The online application must be completed in one session — it times out
- You need your LLC/Corp formation documents first

**Order of operations:** After LLC formation, before bank account.

---

### 1.3 D-U-N-S Number

**What it is:** A unique 9-digit identifier assigned by Dun & Bradstreet (D&B) that identifies your business.

**Why required:**
- **Apple Developer Program (Organization):** Mandatory for enrolling as an organization
- **Google Play (Organization, starting 2026):** Google now requires a D-U-N-S number for organization developer accounts

**Cost:** FREE (request through Apple's D-U-N-S lookup tool or directly from D&B). Expedited service costs $229.

**Timeline:** Up to 5 business days via Apple's lookup tool; can take up to 30 business days through D&B directly.

**Gotchas:**
- Your business must have a **physical mailing address** (no P.O. boxes)
- Your business website must be **publicly available** and on a domain associated with your organization
- DBAs, fictitious businesses, trade names, and branch offices are NOT accepted — must be the legal entity name
- After receiving your D-U-N-S Number, allow **2 additional business days** for Apple to receive the info from D&B
- A D&B representative may contact you for additional verification

**Order of operations:** After LLC formation and EIN. Before Apple/Google developer account enrollment.

---

### 1.4 Business Bank Account

**What it is:** A separate bank account under the business name for all business transactions.

**Why required:** Legal separation of personal and business finances (protects LLC liability shield), required for Stripe payouts, app store payments, and tax reporting.

**Cost:** $0-$25/month depending on bank (Mercury, Relay, and Novo offer free business accounts for startups)

**Timeline:** 1-3 business days

**Gotchas:**
- You need your EIN and LLC formation documents
- Some banks require a minimum deposit
- Get a debit card — you will need it for Apple Developer Program payment and Google Play registration

**Order of operations:** After EIN. Before Stripe setup or developer program enrollment.

---

### 1.5 Business Insurance

**What it is:** Insurance policies to protect your business from lawsuits and liabilities.

**Recommended policies for an AI app company:**

| Policy | What It Covers | Average Cost | When Needed |
|--------|---------------|--------------|-------------|
| **Errors & Omissions (E&O)** | Claims your software caused financial harm (bugs, data loss, AI errors) | $68-$95/month | Before launch |
| **General Liability** | Physical damages, copyright infringement, defamation | $27-$30/month | Before launch |
| **Cyber Insurance** | Data breaches, cyberattacks, ransomware | ~$170/month | Before processing user data |
| **Business Owner's Policy (BOP)** | Bundles GL + commercial property at discount | $30-$46/month | Alternative to separate policies |

**Why required:**
- E&O is especially important for AI apps — if TinyPM's AI gives bad advice that causes financial harm, E&O covers your defense
- General Liability is often required by landlords, clients, and some contracts
- Cyber insurance is increasingly expected by enterprise customers

**Cost:** ~$100-$300/month total for adequate coverage

**Timeline:** Can be bound same-day through providers like The Hartford, NEXT Insurance, or Embroker

**Gotchas:**
- AI-generated content creates novel liability exposure that standard policies may not fully cover — discuss with your insurance broker
- Some policies exclude AI-related claims — read the fine print
- E&O is critical before launch, not after a lawsuit

---

## PHASE 2: INTELLECTUAL PROPERTY (Start Early — These Take Time)

### 2.1 Trademark Search + Filing

**What it is:** Legal protection for the name "TinyPM" and any associated logos/branding.

**Why required:** Prevents others from using your name and protects you from unknowingly infringing on someone else's trademark.

**Cost:**
- Trademark search (comprehensive): $300-$1,000 (professional) or free (basic USPTO TESS search)
- USPTO filing fee: $350 per class of goods/services
- Attorney fees: $500-$2,000 (recommended but not required)
- Software apps are **Class 009** (downloadable software) and potentially **Class 042** (SaaS) — 2 classes = $700 base

**Timeline:** 12-18 months from filing to registration

**Gotchas:**
- File as **Intent to Use** (Section 1(b)) if you have not yet launched — costs an extra $100 per class
- Filing fees are NON-REFUNDABLE even if your application is refused
- Trademark must be renewed every 10 years ($650/class)
- Start the search NOW — discovering a conflict after building brand equity is devastating

---

### 2.2 Copyright Registration

**Cost:** $65 per registration (online filing via copyright.gov)
**Timeline:** 2-8 months for processing
**Note:** Copyright exists automatically upon creation, but registration is required to sue for infringement and enables statutory damages (up to $150,000 per work).

---

### 2.3 Open Source License Compliance

**What to do:**
- Maintain a Software Bill of Materials (SBOM)
- Watch for "copyleft" licenses (GPL, AGPL) that require derivative works to be open-sourced
- MIT, Apache 2.0, and BSD licenses are generally safe for commercial use but require attribution
- Audit transitive dependencies

**Tools:** FOSSA (free tier), Snyk Open Source, npm audit, pip-licenses

---

### 2.4 Anthropic API Terms of Service Compliance

**Key requirements:**
- Use the API (not consumer product). API terms allow commercial use and do not train on your data by default.
- Under API terms, you own the outputs
- If TinyPM is used for legal, financial, or employment decisions, Anthropic requires human-in-the-loop oversight
- Anthropic provides copyright indemnity for authorized commercial API use
- Review latest Acceptable Use Policy (updated September 15, 2025)

---

## PHASE 3: APPLE APP STORE

### 3.1 Apple Developer Program Enrollment

**Cost:** $99/year
**Timeline:** 1-5 days for individual; up to 2-4 weeks for organization (requires D-U-N-S verification)

**Requirements:**
- Apple ID with two-factor authentication
- For organization: D-U-N-S number, legal entity verification, website associated with organization
- Must have legal authority to bind organization to Apple's agreements

**Gotchas:**
- Organization enrollment takes significantly longer — start early
- Enrollment may be rejected if website is not functional or has minimal content

---

### 3.2 Guideline 5.1.2(i) — AI Data Sharing Consent (CRITICAL)

This is the **most important guideline** for AI apps. You MUST:

1. **Name Anthropic** explicitly — generic "third-party AI" is NOT sufficient
2. **Explain the purpose** of data sharing
3. **Obtain explicit, separate consent** via in-app modal BEFORE sending any data to Claude
4. **Provide ongoing controls** — users must be able to review and revoke AI data sharing in Settings
5. **Disclose storage/training** — state Anthropic does NOT train on API data by default
6. **Granular consent** — each AI feature category may need separate consent

**Consequence of non-compliance:** App rejection, removal, or developer account termination.

---

### 3.3 Privacy Labels (Nutrition Labels)

**For TinyPM, declare:**

| Data Type | Category | Purpose |
|-----------|----------|---------|
| Email address | Contact Info | Account creation |
| Name | Contact Info | Personalization |
| User Content | User Content | Project data sent to Claude API |
| Identifiers | Identifiers | User ID, device ID |
| Usage Data | Usage Data | Analytics |
| Crash Data | Diagnostics | Stability monitoring |

**Gotchas:**
- Must also declare data collected by third-party SDKs
- Third-party SDK vendors must provide privacy manifests (required since Spring 2024)
- Underreporting data collection is grounds for removal

---

### 3.4 In-App Purchases

- **U.S. users (post-May 2025):** Can offer external payment (Stripe) as alternative, BUT must also offer Apple IAP
- **EU users:** Alternative payments allowed under DMA, subject to 5% Core Technology Commission
- **All other regions:** Apple IAP generally required for digital goods
- Apple takes 30% commission (15% if you qualify for Small Business Program — under $1M/year)

---

### 3.5 Other Apple Requirements

- **App Tracking Transparency:** Required if using any cross-app tracking analytics
- **Age Rating:** Must complete updated questionnaire by January 31, 2026. AI chatbot features impact rating — likely 12+ or 13+
- **Account Deletion:** Must be available from within the app
- **Sign in with Apple:** REQUIRED if you offer any social login (Google, Facebook)
- **App Review:** 90% reviewed within 24 hours. Common AI app rejections: missing 5.1.2(i) consent, crashes, missing privacy policy
- **SDK Requirement (April 2026):** All submissions must use iOS 26 SDK or later

---

### 3.6 TestFlight Beta Testing

- **Internal testers:** Up to 100 (no review needed)
- **External testers:** Up to 10,000 (first build requires review, 24-48 hours)
- **Build expiration:** 90 days
- **Gotcha:** TestFlight reviews can sometimes take LONGER than App Store reviews

---

## PHASE 4: GOOGLE PLAY STORE

### 4.1 Google Play Developer Account

**Cost:** One-time $25
**Timeline:** Account creation is quick, verification can take days to weeks

### 4.2 Developer Verification (2026)

Starting **September 2026**: ALL developers must verify identity.

**Organization accounts:**
- D-U-N-S number
- Government-issued photo ID of account owner
- Business documentation
- Legal name must match D&B profile exactly

### 4.3 Key Requirements

- **Data Safety Section:** Declare all data collected, shared, security practices
- **AI-Generated Content Disclosure:** Must provide in-app reporting/flagging for offensive AI content
- **In-App Account Deletion:** Must be accessible from within app AND via web URL
- **Content Rating (IARC):** Complete questionnaire in Play Console
- **Google Play Billing:** Required for digital goods. 15% for first $1M, 30% after. Alternative billing available (10% subs, 25% other)
- **Testing Tracks:** Internal (100 testers), Closed (invite-only), Open (public beta). Minimum 20 testers for 14 days before production.

---

## PHASE 5: DESKTOP DISTRIBUTION

### 5.1 macOS

- **Developer ID certificate** (included in $99/yr Apple Developer membership)
- **Hardened Runtime** required for notarization
- **Notarization:** Submit to Apple via `notarytool`, usually takes minutes
- **Stapling:** Attach notarization ticket to app
- **DMG installer:** Standard drag-to-Applications format

**Without notarization:** macOS Gatekeeper blocks the app with a scary warning.

### 5.2 Windows

- **Azure Artifact Signing:** $9.99/month (~$120/year) — cloud-based, easiest setup
- **Alternative:** Traditional OV certificate ($300-$500/year) or EV ($400-$900/year)
- **Without signing:** SmartScreen warning blocks most users from installing
- **New March 2026:** Max certificate validity reduced to 460 days

### 5.3 Both Platforms

- **Auto-update mechanism:** Tauri has built-in updater, Electron has autoUpdater
- **Installers:** DMG for Mac, NSIS/MSI for Windows (Tauri generates both)

---

## PHASE 6: LEGAL DOCUMENTS

### Required Before Launch

| Document | Cost (Attorney) | Cost (Template) | Must Include |
|----------|-----------------|-----------------|-------------|
| **Privacy Policy** | $500-$3,000 | $50-$200 | Name Anthropic, GDPR rights, CCPA rights, data retention |
| **Terms of Service** | $1,000-$5,000 | $50-$200 | AI output disclaimer, liability limitation, arbitration |
| **EULA** | $500-$2,000 | Included in template | Software license terms, required by Apple |
| **AI Output Disclaimer** | $0 | $0 | "AI may make mistakes, verify before acting" |
| **Acceptable Use Policy** | $0-$500 | $0 | Prohibited uses of AI features |
| **Refund Policy** | $0 | $0 | Apple/Google handle IAP refunds; document direct |
| **Cookie Policy** | $0-$500 | $0 | Required for web app (GDPR/ePrivacy) |

---

## PHASE 7: COMPLIANCE & REGULATIONS

### Critical Compliance Items

| Regulation | When It Applies | Key Requirement | Deadline |
|------------|----------------|-----------------|----------|
| **GDPR** | Any EU users | Consent, DPA with Anthropic, DPIA, 72hr breach notification | Now |
| **CCPA/CPRA** | CA users (if over thresholds) | Right to know/delete/opt-out, GPC support | Now + Jan 2027 ADMT |
| **COPPA** | Children under 13 | State not intended for <13, don't collect their data | Now |
| **CA AI Transparency (SB 942)** | 1M+ users generating images/video/audio | Text-only exemption exists! If text only, NOT covered | Aug 2, 2026 |
| **EU AI Act Art. 50** | EU users | Disclose AI nature, machine-readable marking | Aug 2, 2026 |
| **EU Digital Services Act** | EU users | Transparency reporting, content moderation | Now |
| **State Privacy Laws (20+)** | Various states | Implement GDPR-level as baseline | Ongoing |
| **App Store Age Laws** | TX (Jan 2026), UT/LA (mid-2026) | Age assurance via Apple/Google APIs | Now |

**GDPR Gotcha:** EDPB's April 2025 report clarifies that LLMs rarely achieve anonymization — sending data to Claude = processing personal data under GDPR.

**SOC 2:** NOT required at launch. Needed for enterprise sales ($30K-$150K initial, $20K-$80K renewal). Plan Type I first, then Type II.

---

## PHASE 8: PAYMENTS & BILLING

### Stripe Setup
- 2.9% + $0.30 per transaction
- Stripe Tax: 0.5% per transaction for auto sales tax
- Register for sales tax permits in nexus states BEFORE collecting

### Tax Collection
- 25 U.S. states tax SaaS directly
- Sales tax nexus: generally $100K in sales or 200 transactions per state
- App store purchases: Apple/Google handle tax. You handle direct sales (Stripe/desktop)
- EU VAT: 17-27% on digital services
- Revenue recognition: Subscription revenue recognized ratably over service period (ASC 606)

### PCI DSS v4.0.1
- Use Stripe's tokenized integrations (Checkout, Elements) to avoid handling card data
- Quarterly vulnerability scans now required even for SAQ A merchants
- NEVER build custom payment forms handling raw card numbers

---

## PHASE 9: INFRASTRUCTURE & SECURITY

| Item | Requirement | Cost |
|------|------------|------|
| SSL/TLS | Required by Apple ATS, Google, GDPR, PCI | Free (Let's Encrypt) |
| Data encryption at rest | AES-256 for stored data | Built into Supabase |
| Authentication | OAuth 2.0 + Sign in with Apple (required if social login offered) | Built into Supabase Auth |
| Rate limiting | Protect AI endpoints from cost abuse | Dev time |
| DDoS protection | Cloudflare free tier | Free-$3K/mo |
| Backup strategy | GDPR requires appropriate measures | Supabase Pro ($25/mo) |
| Incident response plan | GDPR 72hr notification, CCPA prompt notification | $0 (document time) |
| Penetration testing | Before enterprise sales, SOC 2 | $5K-$25K |
| Bug bounty | After product-market fit | $500-$10K per vulnerability |

---

## PHASE 10: ACCESSIBILITY (WCAG 2.1 AA)

- **ADA Title II deadline:** April 26, 2026 (public entities with 50K+ population)
- **ADA Title III:** Courts reference WCAG 2.1 AA for private businesses
- **Apple/Google:** Both provide accessibility guidelines and testing tools
- **Key:** Automated tools catch only ~30% of issues. Manual screen reader testing essential.
- **Mobile:** VoiceOver (iOS), TalkBack (Android), Dynamic Type, 44x44pt touch targets
- **Cost:** $5K-$20K for professional audit

---

## PHASE 11: MARKETING COMPLIANCE

- **CAN-SPAM:** Physical address, unsubscribe link, honor opt-outs within 10 days. Penalty: $53,088/email
- **FTC:** No fake testimonials (including AI-generated). Disclose material connections. No exaggerated AI claims.
- **AI in Marketing:** Disclose AI-generated marketing materials. Transparency builds trust.

---

## PHASE 12: ACCOUNTING & TAXES

- **Bookkeeping:** QuickBooks/Xero from day one ($0-$30/mo)
- **Quarterly estimated taxes:** Due Apr 15, Jun 15, Sep 15, Jan 15. Penalty if owe >$1K
- **App store commission:** Record as COGS (Apple 30%/15%, Google 30%/15%). Payout ~33 days after month end.
- **International tax:** Consider advisor if significant international revenue

---

## COST SUMMARY

### One-Time Costs
| Item | Cost |
|------|------|
| LLC Formation | $50-$500 |
| EIN | FREE |
| D-U-N-S Number | FREE |
| Apple Developer Program (year 1) | $99 |
| Google Play Developer Account | $25 |
| Trademark filing (2 classes) | $700-$2,700 |
| Copyright registration | $65 |
| Legal documents (attorney) | $2,000-$10,000 |
| **TOTAL ONE-TIME** | **~$3,000-$14,000** |

### Annual Recurring
| Item | Cost |
|------|------|
| Apple Developer Program | $99 |
| Windows Code Signing | $120 |
| LLC state annual fees | $0-$800 |
| Business insurance (E&O + GL) | $1,200-$1,500 |
| Cyber insurance | ~$2,000 |
| Accounting software | $0-$360 |
| Domain + hosting | $100-$500 |
| SSL certificate | FREE |
| **TOTAL ANNUAL** | **~$3,500-$5,400** |

### When Revenue Grows
| Item | Trigger | Cost |
|------|---------|------|
| SOC 2 Certification | Enterprise sales | $30K-$150K |
| Penetration testing | Annual | $5K-$25K |
| Accessibility audit | Major updates | $5K-$20K |
| International tax advisor | Int'l revenue | $5K-$20K/yr |

---

## KEY DATES & DEADLINES (2026)

| Date | What |
|------|------|
| **Jan 28, 2026** | Google Play alternative billing enrollment deadline (U.S.) |
| **Jan 31, 2026** | Apple age rating questionnaire update deadline |
| **Mar 1, 2026** | Max 460-day cert validity for code signing |
| **Apr 2026** | Apple iOS 26 SDK requirement for submissions |
| **Apr 26, 2026** | ADA Title II WCAG 2.1 AA deadline |
| **May-Jul 2026** | Utah, Louisiana age verification laws |
| **Aug 2, 2026** | EU AI Act transparency obligations (Article 50) |
| **Aug 2, 2026** | CA AI Transparency Act (SB 942) if generating images/video/audio |
| **Sep 2026** | Google Android developer verification global rollout |
| **Jan 1, 2027** | CCPA Automated Decision-Making Technology compliance |

---

*Compiled January 28, 2026 — Sources include Apple Developer Documentation, Google Play Developer Policies, USPTO, IRS, GDPR, CCPA, EU AI Act, FTC, Stripe, and 40+ verified web sources.*
