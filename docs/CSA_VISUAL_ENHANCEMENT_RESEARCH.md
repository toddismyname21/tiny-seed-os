# CSA Box Visual Enhancement Research

**Date:** 2026-02-20
**Researcher:** PM_Architect (Claude)
**Goal:** Make the CSA Box Visual "beautiful, memorable, and totally Tiny Seed farmy"

---

## Table of Contents

1. [Sora Feasibility Assessment](#1-sora-feasibility-assessment)
2. [Nano Banana Findings](#2-nano-banana-findings)
3. [AI Tool Comparison Matrix](#3-ai-tool-comparison-matrix)
4. [Recommended Visual Approach](#4-recommended-visual-approach)
5. [Tiny Seed Farm Brand Aesthetic Guidelines](#5-tiny-seed-farm-brand-aesthetic-guidelines)
6. [Updated Plan Recommendations](#6-updated-plan-recommendations)
7. [Sources](#7-sources)

---

## 1. Sora Feasibility Assessment

### What Is Sora?

Sora is OpenAI's video and image generation model. Sora 2 launched its API on September 30, 2025, and is currently available. As of January 10, 2026, free users can no longer generate images or video -- only Plus ($20/month) and Pro ($200/month) subscribers retain access.

### API Pricing

| Capability | Resolution | Cost |
|------------|-----------|------|
| Sora 2 Video | 720p | $0.10/second |
| Sora 2 Pro Video | 720p | $0.30/second |
| Sora 2 Pro Video | 1024p | $0.50/second |
| Still Image (via ChatGPT Images/GPT Image 1) | 1024x1024 | $0.04-$0.17/image |

A 10-second video costs $1-$5. For the CSA Box Visual, we only need **still images**, not video.

### Feasibility for CSA Visuals

**Verdict: NOT RECOMMENDED as the primary tool.**

Reasons:
- Sora is optimized for **video generation**, not still-image produce photography.
- For still images, OpenAI's image tools (GPT Image 1 / DALL-E 3) are more cost-effective and appropriate.
- The API focuses on video endpoints; still image generation goes through the standard ChatGPT Images pathway.
- At $0.04-$0.17 per image, it is more expensive than alternatives that produce equal or better results for food photography.

**Where Sora COULD be useful:** Generating short 3-5 second animated CSA box reveal videos for Instagram Reels or Stories. This is a future enhancement, not a current priority.

### If We Wanted Sora for Animated Reveals (Future)

A 5-second CSA box "unboxing reveal" video at 720p would cost approximately $0.50-$1.50 per generation. This could be a premium feature for special weekly reveals, but is NOT needed for the static visual redesign.

---

## 2. Nano Banana Findings

### What Is Nano Banana?

**Nano Banana** is Google DeepMind's image generation and editing model, available in two tiers:

| Model | Base Technology | Capabilities |
|-------|----------------|-------------|
| **Nano Banana** (standard) | Gemini 2.5 Flash Image | Fast image generation and editing |
| **Nano Banana Pro** | Gemini 3 Pro Image | Studio-quality, 2K/4K resolution, precise physics control |

### Key Capabilities Relevant to CSA Visuals

1. **Precise Local Edits:** Can modify specific parts of an image while maintaining overall visual harmony. This means we could take a base CSA layout and have the AI enhance individual produce items in-place.

2. **Product Photography:** Designed for studio-quality product photos with customizable lighting, backgrounds, and angles. This is EXACTLY what we need for produce items.

3. **Stability Across Edits:** Keeps faces and objects highly stable across repeated changes. Useful for maintaining consistent visual identity across weekly CSA posts.

4. **Speed:** Edits complete in milliseconds to seconds, enabling real-time preview in the MCC dashboard.

5. **Style Control:** Supports photography, illustration, and multiple aesthetic styles. We can dial in the exact "rustic farm" or "clean modern produce" look we want.

6. **Resolution:** Nano Banana Pro supports up to 4K (4096x4096) output, more than sufficient for our 1080x1350 Instagram format.

### API Integration

Nano Banana is available through the **Gemini API** (Google AI Studio and Vertex AI):

| Detail | Value |
|--------|-------|
| **Model ID (standard)** | `gemini-2.5-flash` (with image generation) |
| **Model ID (Pro)** | `gemini-3-pro-image-preview` |
| **API Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/` |
| **Auth** | Google AI API Key |
| **Output Formats** | PNG, JPEG |
| **Max Resolution** | 4096x4096 (Pro), 1024x1024 (standard) |

### Pricing

| Tier | Cost per Image | Notes |
|------|---------------|-------|
| Nano Banana (standard) | ~$0.039/image (1024x1024) | Free tier available with rate limits |
| Nano Banana Pro | ~$0.10-$0.24/image (up to 4K) | Paid preview, rolling out |
| Google Imagen 4 Fast | ~$0.02/image | Cheapest Google option |

### Free Tier

Google offers a free tier with generous limits: 5-15 requests per minute, 250,000 tokens/minute, up to 1,000 requests/day. For a CSA visual generator that produces 1-5 images per use, the free tier would cover typical usage easily.

### Verdict: HIGHLY RECOMMENDED

Nano Banana (standard) is the top recommendation for the CSA Box Visual because:
- Free tier covers our usage volume
- Fast enough for real-time preview
- Excellent produce photography quality
- Simple API integration (REST endpoint with API key)
- No risk of account bans (unlike unofficial Midjourney APIs)
- Can generate individual produce item photos OR full composed layouts

---

## 3. AI Tool Comparison Matrix

| Tool | Cost/Image | Quality (Food) | Speed | Integration Effort | Free Tier | Risk Level | Best For |
|------|-----------|----------------|-------|--------------------|-----------|------------|----------|
| **Nano Banana (Gemini)** | $0.039 | Excellent | <3s | Low (REST API) | Yes (1000/day) | Low | Individual produce photos, scene generation |
| **Nano Banana Pro** | $0.10-$0.24 | Outstanding | <5s | Low (REST API) | Limited | Low | Premium 4K layouts, hero images |
| **Google Imagen 4 Fast** | $0.02 | Very Good | <2s | Low (REST API) | Yes | Low | Budget bulk generation |
| **GPT Image 1 (OpenAI)** | $0.04-$0.17 | Excellent | 5-15s | Low (REST API) | No | Low | Text-heavy designs, branded graphics |
| **DALL-E 3 (OpenAI)** | $0.04 | Good | 5-10s | Low (REST API) | No | Low | Quick concept images |
| **Recraft V3** | $0.04 | Very Good | <5s | Low (REST API) | Yes (limited) | Low | Food photography, vectors |
| **Stable Diffusion XL** | Free (self-host) | Very Good | 10-30s | High (GPU needed) | N/A | Medium | Offline generation, custom LoRA models |
| **Midjourney** | $0.04-$0.10+ | Outstanding | 30-60s | High (no official API) | No | High (TOS) | Artistic/editorial farm imagery |
| **Photoroom API** | $0.02-$0.10 | N/A (editing) | <2s | Low (REST API) | Yes (1000/mo sandbox) | Low | Background removal specifically |
| **Canva API** | Enterprise only | Good (templates) | <3s | High (Enterprise req.) | No | Low | Template-based batch generation |
| **Claid.ai** | Custom pricing | Very Good | <3s | Medium (REST API) | Trial | Low | Bulk product photo enhancement |

### Top 3 Recommendations (Ranked)

1. **Nano Banana (Gemini 2.5 Flash Image)** -- Best balance of cost, quality, speed, and integration simplicity. Free tier covers CSA use case. Excellent for generating individual produce photos with controlled backgrounds.

2. **Recraft V3** -- Strong alternative at $0.04/image with dedicated food photography capabilities. Good vector support for UI elements. Has a free web tier for testing.

3. **GPT Image 1 (OpenAI)** -- Best text rendering for header overlays and branded typography. Higher cost but unmatched at generating complete composed graphics with text.

### Background Removal Specifically

For the per-item photo upload feature (already in the plan), the recommended stack is:

1. **Client-side canvas pixel manipulation** (free, instant) -- Already planned. Good enough for white/solid backgrounds.
2. **Photoroom API** ($0.02/image) -- For professional-grade removal on complex backgrounds. Free sandbox with 1,000 images/month for testing.

---

## 4. Recommended Visual Approach

### The "Tiny Seed CSA Visual" Pipeline

Based on all research, here is the recommended approach, from simplest to most sophisticated:

### Tier 1: Immediate (No API Keys Required)

This is what the current plan already covers, with refinements:

- **Grid layout** with clean typography (Playfair Display headers, Montserrat labels)
- **Colored circles with initials** as placeholders (already implemented)
- **Per-item photo upload** with client-side background removal
- **Seasonal palettes** and textured backgrounds (wooden_rustic, linen_cream, etc.)
- **Professional canvas composition** via Fabric.js

**Enhancement:** Replace the current solid-color gradient backgrounds with **SVG texture patterns** (linen weave, wood grain, chalkboard) rendered directly in canvas. These are free, zero-API, and dramatically more realistic than flat gradients.

### Tier 2: AI-Generated Produce Photos (Nano Banana Integration)

When no user photo is uploaded for an item, instead of showing a colored circle with an initial letter, generate a beautiful AI produce photo:

```
User adds "tomatoes" to CSA box
  --> No photo uploaded
  --> System calls Nano Banana: "A single ripe heirloom tomato on a clean white background,
      studio lighting, shallow depth of field, farm fresh, dewy, food photography style"
  --> Receives 1024x1024 produce photo
  --> Client-side background removal strips the white bg
  --> Photo placed in circular frame on the CSA layout
```

**Prompt template per produce item:**
```
A single fresh {item_name}, studio food photography, natural lighting,
shallow depth of field, on a clean white background, dewy and vibrant,
organic farm produce, editorial quality
```

**Cost:** $0.039/image on Gemini free tier. A 6-item CSA box = ~$0.23 total (or free within daily limits).

**Cache strategy:** Generate once per produce type, cache the result. Tomatoes look like tomatoes every week -- no need to regenerate. Store in `localStorage` or IndexedDB. Over time, build a library of ~30 AI-generated produce photos covering the full PRODUCE_LIBRARY.

### Tier 3: Full AI-Composed Scene (Premium Feature)

For a "hero" image or special occasion posts, generate the ENTIRE composed scene via AI:

```
"A rustic wooden crate overflowing with fresh farm produce: red heirloom tomatoes,
green zucchini, purple eggplant, orange carrots, and fresh basil. The crate sits on
a weathered farm table with a linen cloth. Soft morning light streams in from the left.
A small chalkboard sign reads 'This Week's CSA Box'. Tiny Seed Farm aesthetic, warm and
inviting, Instagram square format, food photography."
```

This would use **Nano Banana Pro** or **GPT Image 1** for highest quality, at $0.10-$0.17 per generation.

**When to use:** CSA signup season, holiday boxes, special partner collaborations. NOT for every weekly box (too expensive and slow).

### Tier 4: Animated Reveal (Future - Sora)

Short 3-5 second video of the CSA box being revealed, produce items appearing one by one. This is a "wow factor" feature for Instagram Reels.

**Cost:** $0.50-$1.50 per video.
**Timeline:** Future enhancement after Tiers 1-3 are solid.

---

## 5. Tiny Seed Farm Brand Aesthetic Guidelines

### Color Palette

Based on the existing SEASON_PALETTES and brand identity:

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary Green | Earthy forest green | `#4a7c59` | Headers, accents, primary actions |
| Warm Earth | Rich soil brown | `#8b4513` | Wooden backgrounds, grounding elements |
| Cream | Natural linen | `#f5f5dc` | Light backgrounds, text contrast |
| Tomato Red | Warm harvest red | `#ff6347` | Accent, call-to-action, summer items |
| Gold | Honey/wheat gold | `#daa520` | Fall accents, premium feel |
| Sage | Soft herb green | `#90ee90` | Spring accents, fresh feel |

### Typography

| Element | Font | Weight | Size (at 1080px width) |
|---------|------|--------|------------------------|
| Header (farm name) | Playfair Display (serif) | 700 Bold | 54px |
| Subheader (week range) | Montserrat (sans-serif) | 400 Regular | 22px |
| Item labels | Montserrat (sans-serif) | 600 Semi-bold | 20-24px |
| Footer/CTA | Montserrat (sans-serif) | 500 Medium | 18px |

**Note:** The current code uses Georgia as a serif fallback. Playfair Display should be loaded via Google Fonts for production use.

### Photography Style

| Attribute | Target |
|-----------|--------|
| Lighting | Natural, soft, directional (morning golden hour feel) |
| Depth of field | Shallow -- subject sharp, background gently blurred |
| Color grading | Warm, slightly desaturated, earthy tones |
| Composition | Clean, uncluttered, generous white/negative space |
| Texture | Visible wood grain, linen weave, dewy produce surfaces |
| Mood | Wholesome, honest, inviting -- NOT corporate or sterile |

### Visual Identity Elements

1. **Accent bar:** Thin colored bar at top and bottom of each visual (already implemented)
2. **Decorative divider:** Simple line or leaf motif between header and content
3. **Circular produce frames:** Clean circles with subtle drop shadow and thin white border
4. **Seasonal theming:** Background and accent colors shift with season automatically
5. **Footer zone:** Farm name, logo area, call-to-action ("Order your box at tinyseedfarm.com")

### What Makes It "Tiny Seed Farmy"

The brand sits at the intersection of **rustic authenticity** and **modern clean design**:

- NOT "clip art farm" with cartoon tractors and red barns
- NOT "luxury grocery" with black marble and gold foil
- YES "modern farmstead" -- like Kinfolk magazine meets a real working farm
- YES natural textures (wood, linen, kraft paper)
- YES earthy colors grounded in actual soil and produce
- YES generous spacing, letting produce breathe
- YES imperfection as beauty (heirloom tomatoes > perfect round tomatoes)

---

## 6. Updated Plan Recommendations

### Changes to the Existing Plan (`generic-nibbling-deer.md`)

The existing plan is solid for Tier 1. Here are specific additions and modifications:

### 6.1 Add SVG Texture Backgrounds (Replace Flat Gradients)

**Current:** Solid color gradients for backgrounds (wooden_rustic, burlap, etc.)
**Proposed:** Add canvas-rendered texture patterns that simulate real surfaces.

Replace the `BACKGROUNDS` object with richer texture data:

```javascript
const BACKGROUNDS = {
    'wooden_rustic': {
        color: '#8b4513',
        texture: 'wood_grain',  // New: canvas-drawn wood grain lines
        grain_color: 'rgba(0,0,0,0.04)',
        grain_count: 30
    },
    'linen_cream': {
        color: '#f5f5dc',
        texture: 'linen_weave',  // New: crosshatch linen pattern
        weave_color: 'rgba(0,0,0,0.015)',
        weave_spacing: 4
    },
    'chalkboard': {   // New background option
        color: '#2d3436',
        texture: 'chalk_dust',
        dust_color: 'rgba(255,255,255,0.02)',
        dust_density: 500
    },
    'kraft_paper': {  // New background option
        color: '#c4a35a',
        texture: 'paper_fiber',
        fiber_color: 'rgba(0,0,0,0.02)',
        fiber_count: 200
    },
    'marble_white': {
        color: '#f5f5f5',
        texture: 'marble_vein',
        vein_color: 'rgba(0,0,0,0.03)'
    }
};
```

**Cost:** Zero. Pure canvas drawing.
**Impact:** Dramatically more realistic backgrounds.

### 6.2 Add Nano Banana AI Produce Photo Generation

**New feature:** When user adds an item but does NOT upload a photo, offer a "Generate AI Photo" button.

```javascript
async function generateAIProducePhoto(itemName) {
    const prompt = `A single fresh ${itemName}, studio food photography, natural lighting, ` +
        `shallow depth of field, on a clean white background, dewy and vibrant, ` +
        `organic farm produce, editorial quality, centered in frame`;

    // Check cache first
    const cached = localStorage.getItem(`ai_produce_${itemName}`);
    if (cached) return cached;

    // Call Gemini API (Nano Banana)
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                    imageMimeType: 'image/png'
                }
            })
        }
    );

    const data = await response.json();
    const imageBase64 = data.candidates[0].content.parts
        .find(p => p.inlineData)?.inlineData?.data;

    if (imageBase64) {
        const dataUrl = `data:image/png;base64,${imageBase64}`;
        localStorage.setItem(`ai_produce_${itemName}`, dataUrl);
        return dataUrl;
    }
    return null;
}
```

**Requirements:**
- Gemini API key (stored in MCC settings, not hardcoded)
- Fallback to colored-circle-with-initial if no API key configured or generation fails
- localStorage cache per produce item (generate once, reuse forever)
- Loading spinner on the item tag during generation

### 6.3 Add Google Fonts for Typography

**Current:** `Georgia, serif` (system font fallback)
**Proposed:** Load Playfair Display and Montserrat via Google Fonts, then use in canvas:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
```

Update canvas text objects:
```javascript
fontFamily: "'Playfair Display', Georgia, serif"  // Headers
fontFamily: "'Montserrat', Arial, sans-serif"      // Labels
```

**Note:** Fabric.js renders fonts that are loaded in the page. The Google Fonts link must be in the HTML `<head>` and the fonts must be fully loaded before canvas rendering.

### 6.4 Add Footer Zone with CTA

**Current:** The plan mentions Footer (1100-1350px) zone but the implementation is minimal.
**Proposed:** Add a proper footer with:
- Bottom accent bar (matching top)
- Farm logo area (user can upload logo once, stored in localStorage)
- CTA text: "Order your box at tinyseedfarm.com" or custom text
- Optional small produce-leaf decorative elements at corners

### 6.5 Add "AI Scene" Mode (Tier 3 Premium)

**New mode toggle** in the CSA Visualizer: "Layout Mode" vs "AI Scene Mode"

- **Layout Mode** (default): The existing grid layout with circular photos. Fast, predictable, free.
- **AI Scene Mode**: Sends the list of items to Nano Banana Pro with a scene prompt, generating a single composed photograph of all items arranged naturally. Slower, costs $0.10-$0.24, but produces stunning results.

This should be gated behind a "Generate AI Scene" button with a clear cost indicator.

### 6.6 Priority Order for Implementation

| Priority | Feature | Effort | Cost | Impact |
|----------|---------|--------|------|--------|
| P0 | SVG texture backgrounds | Low (canvas drawing) | Free | High -- instant visual upgrade |
| P0 | Google Fonts (Playfair + Montserrat) | Trivial | Free | Medium -- proper typography |
| P1 | AI produce photos (Nano Banana) | Medium (API integration) | Free tier or ~$0.04/img | Very High -- eliminates placeholder circles |
| P1 | Photo cache system | Low (localStorage) | Free | High -- prevents re-generation |
| P2 | Footer zone with CTA | Low (canvas layout) | Free | Medium -- completes the design |
| P2 | Farm logo upload | Low (file input + storage) | Free | Medium -- brand consistency |
| P3 | AI Scene Mode | Medium (API + UI) | $0.10-$0.24/generation | High -- premium wow factor |
| P4 | Sora animated reveal | High (video pipeline) | $0.50-$1.50/video | Medium -- Instagram Reels differentiator |

---

## 7. Sources

### Sora
- [Sora 2 Pricing Calculator & Cost Guide (Feb 2026)](https://costgoat.com/pricing/sora)
- [Sora 2 Discount & Pricing Explained (2026)](https://www.glbgpt.com/hub/sora-2-discount-pricing-explained-2026-official-sora-video-api-costs-and-how-to-save-money/)
- [OpenAI Sora 2 Pricing Policy Update: January 2026](https://help.apiyi.com/en/openai-sora-2-policy-change-plus-pro-only-en.html)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Creating Images on Sora (OpenAI Help)](https://help.openai.com/en/articles/10877094-creating-images-on-sora)
- [Video Generation with Sora API](https://platform.openai.com/docs/guides/video-generation)

### Nano Banana / Gemini Image API
- [Nano Banana Image Generation - Gemini API Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Developers Can Build with Nano Banana Pro (Google Blog)](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/)
- [Nano Banana Pro: Gemini 3 Pro Image Model (Google DeepMind)](https://blog.google/innovation-and-ai/products/nano-banana-pro/)
- [Gemini 3 Pro Image (DeepMind)](https://deepmind.google/models/gemini-image/pro/)
- [Nano Banana Pro for Enterprise (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-pro-available-for-enterprise)
- [Nano Banana Pro Complete Guide 2026 (WaveSpeedAI)](https://wavespeed.ai/blog/posts/google-nano-banana-pro-complete-guide-2026/)
- [Gemini Developer API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Nano Banana Pro API Tutorial (Apiyi)](https://help.apiyi.com/en/nano-banana-pro-api-guide-cheaper-than-kie-ai-en.html)
- [Nano Banana - Pixlr Integration](https://pixlr.com/nano-banana/)
- [Nano Banana Pro on Kie.ai](https://kie.ai/nano-banana-pro)

### GPT Image / DALL-E
- [OpenAI DALL-E & GPT Image Pricing Calculator (Feb 2026)](https://costgoat.com/pricing/openai-images)
- [OpenAI API Pricing Page](https://platform.openai.com/docs/pricing)
- [GPT Image 1 Model Documentation](https://platform.openai.com/docs/models/gpt-image-1)
- [AI Image Pricing 2026: Google Gemini vs OpenAI (IntuitionLabs)](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai)

### Other AI Image Tools
- [Recraft AI - Food Image Generator](https://www.recraft.ai/generate/food)
- [Recraft Pricing](https://www.recraft.ai/pricing)
- [10 Best AI Product Photography Tools 2026 (Nightjar)](https://nightjar.so/blog/best-10-tools-ai-product-photography)
- [9 Best AI Food Photography Tools 2026 (MenuPhotoAI)](https://www.menuphotoai.com/guides/best-ai-food-photography-tools-2026)
- [Best AI Image Generators 2026 (RevolutionInAI)](https://www.revolutioninai.com/2026/01/These-Are-the-Best-AI-for-Image-Generation-in-2026.html)
- [Stable Diffusion XL](https://stablediffusionxl.com/)
- [SDXL Food Photography Prompts (PromptHero)](https://prompthero.com/stable-diffusion-food-photography-prompts)
- [Food Photography LoRA for SD (CivitAI)](https://civitai.com/models/45322/food-photography)
- [Claid.ai Product Photography](https://claid.ai/product/ai-generation)

### Midjourney
- [10 Best Midjourney APIs 2026](https://www.myarchitectai.com/blog/midjourney-apis)
- [7 Best Midjourney APIs for Image Generation 2026](https://apiframe.ai/blog/best-midjourney-apis)

### Photoroom
- [Photoroom API Pricing](https://www.photoroom.com/api/pricing)
- [Photoroom Background Remover API](https://www.photoroom.com/api/remove-background)
- [Photoroom API Product Updates](https://www.photoroom.com/blog/api-product-updates)

### Canva API & Template Tools
- [Canva API Alternatives (Templated)](https://templated.io/canva-api/)
- [Canva Autofill API vs Template Automation](https://templated.io/blog/canva-autofill-api-vs-template-automation-api/)

### Farm Branding & Design
- [Social Media for Farmers Guide (LocalLine)](https://www.localline.co/blog/social-media-for-farms)
- [Farm Website Design Examples (LocalLine)](https://www.localline.co/blog/farm-website-design)
- [Farm Instagram Template Design (Grapevine)](https://www.grapevinelocalmarketing.com/projects/wisconsin-farm-instagram-templates)
- [Farm Branding (Steadfast Farm)](https://www.steadfast-farm.com/branding)
- [Design Farm: Food & Farm Branding](https://www.designfarm.ink/)

---

## Appendix A: Current MCC Data Structures

### PRODUCE_LIBRARY (32 items)

The existing produce library maps item names to Twitter emoji URLs (72x72px), scale factors, and brand colors. These colors are reusable for placeholder circles and accent elements. The items are:

tomatoes, zucchini, basil, eggs, carrots, lettuce, kale, peppers, onions, garlic, bread, flowers, corn, broccoli, potato, mushrooms, strawberries, blueberries, apples, peaches, herbs, squash, beets, radishes, spinach, chard, cucumber, eggplant, honey, cheese, jam, default

### BACKGROUNDS (5 options)

wooden_rustic, marble_white, linen_cream, slate_dark, burlap -- all solid-color CSS gradients.

### SEASON_PALETTES (4 seasons)

Summer (green/red/orange), Fall (orange/gold/purple), Winter (green/purple/slate), Spring (light green/pink/lavender).

### Canvas Dimensions

- Width: 1080px
- Height: 1350px
- Display scale: ~0.37x (fits in dashboard panel)
- Export: Full 1080x1350 PNG

---

## Appendix B: Quick-Start Integration Code (Nano Banana)

For the developer implementing this, here is a minimal working example of calling the Gemini API for produce photo generation:

```javascript
// Configuration (store API key in MCC settings, NOT hardcoded)
const GEMINI_API_KEY = localStorage.getItem('mcc_gemini_api_key') || '';
const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // Nano Banana standard

// Generate a produce photo
async function generateProducePhoto(itemName) {
    if (!GEMINI_API_KEY) {
        console.warn('No Gemini API key configured. Using placeholder.');
        return null;
    }

    const cacheKey = `ai_produce_${itemName.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate a photograph of a single fresh ${itemName}. ` +
                                  `Studio food photography style, soft natural lighting from the left, ` +
                                  `shallow depth of field, placed on a clean white background. ` +
                                  `The produce should look dewy, vibrant, and freshly harvested. ` +
                                  `Organic farm quality. Centered in frame. No text or labels.`
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ['IMAGE', 'TEXT'],
                        imageMimeType: 'image/png'
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return null;
        }

        const data = await response.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart) {
            const dataUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
            // Cache for future use
            try {
                localStorage.setItem(cacheKey, dataUrl);
            } catch (e) {
                // localStorage full -- use IndexedDB or skip caching
                console.warn('Cache full, using IndexedDB fallback');
            }
            return dataUrl;
        }
    } catch (err) {
        console.error('Produce photo generation failed:', err);
    }
    return null;
}
```

### Settings UI Addition

Add a "Gemini API Key" field in the MCC Settings section:

```html
<div class="form-group">
    <label>Gemini API Key (for AI produce photos)</label>
    <input type="password" id="geminiApiKey" class="form-control"
           placeholder="Get free key at ai.google.dev">
    <small class="form-text text-muted">
        Free tier: ~1000 images/day. Get your key at
        <a href="https://ai.google.dev" target="_blank">ai.google.dev</a>
    </small>
</div>
```

---

## Appendix C: Prompt Engineering for Tiny Seed Aesthetic

### Individual Produce Item Prompt Template

```
A single fresh {item_name}, studio food photography, soft natural lighting
from the upper left, shallow depth of field, on a clean white background.
The {item_name} should look dewy, vibrant, and freshly harvested from an
organic farm. Centered in frame. No text, no labels, no other objects.
{season_modifier}
```

**Season modifiers:**
- Summer: "Warm golden light, peak ripeness, vibrant saturated colors."
- Fall: "Warm amber tones, rich earthy colors, harvest mood."
- Winter: "Cool crisp light, hearty root vegetable energy, muted warm tones."
- Spring: "Fresh bright light, tender young greens, soft pastel accents."

### Full Scene Prompt Template (Tier 3)

```
A rustic farm table scene photographed from above at a 45-degree angle.
On a weathered {background_type} surface, arrange these fresh farm produce items
naturally: {comma_separated_items}. Style: modern farmstead editorial photography,
like Kinfolk magazine. Lighting: soft morning golden hour from the left.
Include subtle props: a linen napkin corner, a sprig of herbs, perhaps a vintage
wooden spoon. The mood is wholesome, honest, and inviting. No text overlays.
Color palette: earthy greens, warm browns, with pops of produce color.
Aspect ratio: 4:5 portrait (1080x1350 pixels).
```

### Background Texture Prompt Template (for AI-generated backgrounds)

```
A {texture_type} surface texture, photographed from directly above, flat lay style.
No objects, just the surface. {texture_description}. Even lighting, no harsh shadows.
Suitable as a background for food photography. Seamless, tileable pattern preferred.
```

**Texture descriptions:**
- wooden_rustic: "Weathered barn wood planks with visible grain, warm brown tones."
- linen_cream: "Natural linen fabric with visible weave texture, cream/ivory color."
- chalkboard: "Dark slate chalkboard surface with subtle chalk dust texture."
- kraft_paper: "Brown kraft paper with visible fiber texture, slightly wrinkled."
- marble_white: "White Carrara marble with subtle grey veining, polished surface."
