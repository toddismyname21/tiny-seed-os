# TinyPM Character Art Tools Research
## High-Quality Character Artwork for 14 Characters (Magic vs Science Theme)

**Research Date:** February 2026
**Purpose:** Identify best tools for creating consistent, scalable character art

---

## Executive Summary

After researching 20+ AI image generation tools, vectorizers, and professional options, here are the **TOP 3 RECOMMENDATIONS** for TinyPM's character art needs:

| Rank | Tool | Best For | Cost | CLI/API |
|------|------|----------|------|---------|
| **1** | **Recraft V3** | Native SVG generation, vector-first | $10/mo or API | Yes |
| **2** | **Leonardo.AI** + Recraft Vectorizer | Character consistency (89%) + vectorization | $12-28/mo | Yes |
| **3** | **Flux 2 on Replicate** + Vectorizer.AI | Maximum quality + pro vectorization | ~$0.01-0.03/img | Yes |

---

## Table of Contents

1. [AI Image Generation Tools (2025-2026)](#1-ai-image-generation-tools-2025-2026)
2. [Character Consistency Tools](#2-character-consistency-tools)
3. [Vector Art / SVG Generation](#3-vector-art--svg-generation)
4. [Professional Illustration Options](#4-professional-illustration-options)
5. [CLI/API Options](#5-cliapi-options)
6. [TinyPM-Specific Recommendations](#6-tinypm-specific-recommendations)
7. [Implementation Plan](#7-implementation-plan)

---

## 1. AI Image Generation Tools (2025-2026)

### Tier 1: Best Overall Quality

#### Midjourney v7
- **Quality:** 9.4/10 artistic quality (highest tested)
- **Strengths:** Exceptional artistic coherence, massive community
- **Weaknesses:** Discord-only (no official API), automation may violate TOS
- **Pricing:** $10-30/month subscription
- **API Access:** No official API; third-party solutions (Apify) exist but risk account termination
- **Best For:** One-off hero images, style exploration

**Sources:** [Medium - Best AI Image Tools 2026](https://jimmacleod.medium.com/the-best-ai-image-tools-for-2026-compared-and-evaluated-4dee99b4b565), [Apify Midjourney](https://apify.com/api/midjourney-api)

#### GPT Image 1.5 (OpenAI)
- **Quality:** Highest LM Arena score (1264)
- **Strengths:** Exceptional text rendering, conversational iteration
- **Weaknesses:** Not optimized for character consistency across sessions
- **Pricing:** $20/mo ChatGPT Plus or API ($0.011-0.25/image)
- **API Access:** Yes, full OpenAI API
- **Best For:** Marketing materials with text, quick iterations

**Sources:** [OpenAI Pricing](https://openai.com/pricing), [CostGoat OpenAI Calculator](https://costgoat.com/pricing/openai-images)

#### DALL-E 3
- **Quality:** 9.2/10 photorealism
- **Strengths:** Great prompt understanding, API available
- **Weaknesses:** Character consistency only 71% in testing
- **Pricing:**
  - Standard 1024x1024: $0.040/image
  - HD 1024x1024: $0.080/image
  - HD 1792x1024: $0.120/image
- **API Access:** Yes, OpenAI API
- **Best For:** Photorealistic elements, quick concepts

**Sources:** [LangDB DALL-E 3](https://langdb.ai/app/providers/openai/dall-e-3), [OpenAI Pricing](https://openai.com/pricing)

#### Flux 2 Max (Black Forest Labs)
- **Quality:** Pinnacle of open-weight image generation
- **Strengths:** Up to 10 reference images, solves "stochastic drift," maintains character consistency
- **Weaknesses:** Requires more setup for local use
- **Pricing:** Via API providers:
  - Replicate: ~$0.01-0.03/image
  - fal.ai: Pay-per-use
  - Together AI: Usage-based
- **API Access:** Yes, multiple providers
- **Best For:** Character consistency, professional-grade generation

**Sources:** [Together AI Flux 2 Max](https://www.together.ai/models/flux-2-max), [fal.ai Flux](https://fal.ai/flux-2), [Replicate SDXL](https://replicate.com/stability-ai/sdxl)

### Tier 2: Character-Specific Tools

#### Leonardo.AI
- **Quality:** 89% character consistency (best in testing)
- **Strengths:** Character reference models, custom model training, consistency across poses
- **Weaknesses:** API pricing separate from subscription, some users report occasional trait drift
- **Pricing:**
  - Starter: $12/mo (annual) or $15/mo (monthly)
  - Creator: $28/mo (annual) or $35/mo (monthly)
  - API: Starting ~$9/mo for developers
- **API Access:** Yes, separate API plans
- **Best For:** Main character generation workflow

**Sources:** [Leonardo.AI Pricing](https://leonardo.ai/pricing/), [TheRightGPT Leonardo Guide](https://therightgpt.com/leonardo-ai-guide/pricing/)

#### Ideogram 3.0
- **Quality:** Best-in-class text rendering
- **Strengths:** Perfect for logos with text, style references (up to 3 images), typography
- **Weaknesses:** Opaque API pricing, enterprise minimum (1M images/month for API)
- **Pricing:**
  - Basic: $7/mo for 400 images
  - Third-party API (WaveSpeed): $0.06/image
- **API Access:** Enterprise only (contact sales) or via third-party
- **Best For:** Character logos, name badges, branded elements

**Sources:** [Ideogram 3.0 Features](https://ideogram.ai/features/3.0), [Ideogram API Pricing](https://ideogram.ai/features/api-pricing)

---

## 2. Character Consistency Tools

### The Character Consistency Problem

When generating 14 unique characters with multiple expressions each, maintaining visual consistency is the #1 challenge. Here's how different tools perform:

| Tool | Consistency Score | Method |
|------|-------------------|--------|
| Leonardo.AI | 89% | Character reference models, custom training |
| DALL-E 3 | 71% | Prompt-based only |
| Midjourney | 67% | Character reference + seed |
| ChatGPT (same session) | 87% | Conversational memory |

### Best Approaches for Consistent Characters

#### 1. Character Reference Models (Leonardo.AI, OpenArt)
- Create and save character profiles
- AI remembers profiles across sessions
- Works across different styles and poses

**Sources:** [NeoLemon Character Generator Guide](https://www.neolemon.com/blog/best-ai-character-generator-for-consistent-characters-2025/)

#### 2. LoRA Training (Stable Diffusion/Flux)
- Train custom model on your character
- 15-30 high-quality reference images needed
- Most robust solution for long-term consistency
- Hardware: 8GB+ VRAM GPU or cloud ($9.99/mo Google Colab Pro)

**Training Settings (Kohya SS for SDXL):**
```
Epochs: 30
LR Scheduler: constant
Optimizer: AdamW
Learning Rate: 3e-05
Resolution: 1024x1024
Network Rank: 32
Network Alpha: 32
```

**Sources:** [Stable Diffusion Art LoRA Guide](https://stable-diffusion-art.com/train-lora/), [PropelRC LoRA Training](https://www.propelrc.com/how-to-train-stable-diffusion-lora-models/)

#### 3. Multi-Reference Image Input (Flux 2)
- Upload up to 10 reference images per generation
- Maintains character consistency automatically
- No training required

**Sources:** [SimpliSmart Flux 2 API](https://simplismart.ai/blog/flux-2-api-simplismart)

#### 4. Prompt Engineering Techniques
- Repeat key phrases exactly ("brown trench coat" not just "coat")
- Specify fixed visual traits ("cybernetic eye on LEFT side")
- Lock camera setup ("50mm lens, low-angle shot")
- Use same seed number for related generations

**Sources:** [SkyWork AI Consistent Characters Guide](https://skywork.ai/blog/how-to-consistent-characters-ai-scenes-prompt-patterns-2025/)

### Dedicated Consistency Platforms

| Platform | Strength | Pricing |
|----------|----------|---------|
| **Scenario** | Sprite sheets, turnarounds, pose conditioning | ~$45/mo |
| **LTX Studio** | Storyboard consistency, outfit variations | Subscription |
| **Dzine.ai** | Unified character design | Freemium |
| **OpenArt** | Multi-style character profiles | Freemium |

---

## 3. Vector Art / SVG Generation

### Native Vector Generation (Text-to-SVG)

#### Recraft V3 (TOP RECOMMENDATION)
- **Capability:** Direct text-to-SVG generation
- **Quality:** Ranked among best text-to-image models
- **Features:**
  - Native SVG output (not rasterized then traced)
  - Logos, icons, illustrations
  - Multiple style support
  - Export: SVG, PNG, JPG, Lottie
- **Pricing:**
  - Free tier: 50 daily credits
  - Pro: $10/mo (annual)
  - Teams: $55/mo (annual)
  - API: Available on Replicate
- **API Access:** Yes (Replicate: recraft-ai/recraft-v3-svg)

**Why Recraft Wins for TinyPM:**
- Only major tool generating TRUE vector output
- Scalable from icon to billboard
- Editable SVGs, not auto-traced raster

**Sources:** [Recraft AI Vector Generator](https://www.recraft.ai/ai-vector-generator), [Replicate Recraft V3 SVG](https://replicate.com/recraft-ai/recraft-v3-svg)

### AI Image Vectorizers (Raster to Vector)

If generating raster first, these tools convert to SVG:

| Tool | Quality | Speed | Pricing | Best For |
|------|---------|-------|---------|----------|
| **Vectorizer.AI** | Excellent | Fast | Subscription | Professional work |
| **Vector Magic** | Excellent | Fast | Subscription | Batch processing (desktop) |
| **Recraft Vectorizer** | Very Good | Fast | Free | Quick conversions |
| **AIVector.ai** | Good | Fast | Free | Budget option |
| **Kittl** | Good | Fast | Free tier | Design integration |

**Vectorizer.AI** stands out with 15 years of experience and deep learning-based tracing that outperforms threshold-based methods.

**Sources:** [Vectorizer.AI](https://vectorizer.ai/), [SVG AI Top 15 Tools](https://www.svgai.org/blog/ai-svg-generation/free-ai-svg-tools-resources)

---

## 4. Professional Illustration Options

### Fiverr/Freelancer Pricing (2025-2026)

| Tier | Price Range | What You Get |
|------|-------------|--------------|
| **Budget** | $25-60/character | Gambling on quality, basic work |
| **Mid-Range** | $60-150/character | Sweet spot, reliable quality |
| **Premium** | $150-500/character | Game industry experience, guaranteed results |
| **Studio** | $800-5000+/character | Full character design package |

**For TinyPM's 14 Characters:**
- Budget: $350-840 total
- Mid-Range: $840-2,100 total
- Premium: $2,100-7,000 total

**Additional Costs:**
- Rush fee (48hr): +25-100%
- Extra revisions: $50-200/round
- Commercial licensing: May double price
- Multiple expressions: +$50-150 each

**Time Estimates:**
- Budget artist: 2-5 days per character
- Mid-range: 3-7 days per character
- Premium: 5-14 days per character
- Full set of 14: 1-3 months

**Sources:** [AnimotionStudio Pricing Guide](https://animotionsstudio.com/how-much-does-a-character-design-cost/), [Fiverr Character Design](https://www.fiverr.com/categories/graphics-design/game-art/character-design)

### Hybrid Approach (Recommended)

1. Generate base characters with AI (Leonardo.AI or Flux)
2. Hire mid-range artist to refine and create expression sheets
3. Vectorize finals with Recraft or Vectorizer.AI

**Cost:** ~$500-1,500 total + 1-2 weeks

---

## 5. CLI/API Options

### Full API Access (Best for Automation)

#### Replicate (RECOMMENDED FOR CLI)
```bash
# Install
pip install replicate

# Generate with Recraft V3 SVG
replicate run recraft-ai/recraft-v3-svg \
  --prompt "magical scientist character, stylized illustration"

# Generate with SDXL
replicate run stability-ai/sdxl \
  --prompt "your prompt here"
```

**Pricing:** Pay per second of compute (~$0.01-0.03/image)

**Sources:** [Replicate Pricing](https://replicate.com/pricing), [Replicate SDXL](https://replicate.com/stability-ai/sdxl)

#### fal.ai (Fast Flux Access)
```python
import fal_client

result = fal_client.run("fal-ai/flux-2-max", {
    "prompt": "your prompt",
    "image_references": ["url1", "url2"]  # Up to 10
})
```

**Sources:** [fal.ai Flux 2](https://fal.ai/flux-2)

#### OpenAI API (DALL-E 3)
```python
from openai import OpenAI
client = OpenAI()

response = client.images.generate(
    model="dall-e-3",
    prompt="your prompt",
    size="1024x1024",
    quality="hd"
)
```

**Sources:** [OpenAI Pricing](https://openai.com/pricing)

#### ComfyUI Headless (Local/Self-Hosted)
```bash
# Install comfy-headless
pip install comfy-headless[standard]

# Python usage
from comfy_headless import ComfyClient
client = ComfyClient()
result = client.generate_image("your prompt")
```

Or via curl:
```bash
curl -X POST --data @workflow.json http://127.0.0.1:8188/prompt
```

**Sources:** [GitHub comfy-headless](https://github.com/mcp-tool-shop/comfy-headless), [Xentoo ComfyUI CLI](https://blog.xentoo.info/2023/07/22/comfyui-batch-run-from-command-line-with-api/)

### Batch Generation Script Example

```python
#!/usr/bin/env python3
"""
TinyPM Character Batch Generator
Generates all 14 characters with multiple expressions
"""

import replicate
import os

CHARACTERS = [
    {"name": "Wizard PM", "theme": "magic", "traits": "flowing robes, glowing staff, mystical aura"},
    {"name": "Data Scientist", "theme": "science", "traits": "lab coat, holographic displays, neural network patterns"},
    # ... 12 more characters
]

EXPRESSIONS = ["neutral", "happy", "thinking", "excited", "concerned"]

BASE_PROMPT = """
Character illustration for project management app.
Magic vs Science theme. Cohesive family look.
Stylized, modern, professional yet playful.
Clean lines suitable for vector conversion.
"""

def generate_character(character, expression):
    prompt = f"""
    {BASE_PROMPT}
    Character: {character['name']}
    Theme: {character['theme']}
    Visual traits: {character['traits']}
    Expression: {expression}
    """

    output = replicate.run(
        "recraft-ai/recraft-v3-svg",
        input={"prompt": prompt}
    )

    filename = f"{character['name'].lower().replace(' ', '_')}_{expression}.svg"
    with open(f"output/{filename}", "w") as f:
        f.write(output)

    return filename

# Generate all combinations
for char in CHARACTERS:
    for expr in EXPRESSIONS:
        print(f"Generating {char['name']} - {expr}...")
        generate_character(char, expr)
```

---

## 6. TinyPM-Specific Recommendations

### Character Requirements Analysis

| Requirement | Solution |
|-------------|----------|
| 14 unique characters | Leonardo.AI character profiles OR LoRA training |
| Magic vs Science aesthetic | Dual-themed prompt templates |
| Multiple expression states | 5 expressions x 14 = 70 images minimum |
| Scalable (icon to hero) | Native SVG via Recraft OR high-res + vectorization |
| Cohesive family look | Consistent style prompt, same base settings |

### Recommended Workflow

#### Option A: Fast & Affordable (Budget: ~$100-200)

1. **Generate with Recraft V3** ($10/mo Pro)
   - Direct SVG output
   - Batch via Replicate API
   - 70 images = ~$2-5 in API costs

2. **Manual refinement** in vector editor (Figma, Illustrator)
   - Touch up any inconsistencies
   - Create expression variants from base

**Total Time:** 1-2 days
**Total Cost:** ~$50-100

#### Option B: Maximum Quality (Budget: ~$300-500)

1. **Generate bases with Leonardo.AI** ($28/mo Creator)
   - Use character reference models
   - Generate at highest resolution

2. **Create consistency with Flux 2** (API ~$50)
   - Use multi-reference input
   - Ensure all characters match

3. **Vectorize with Vectorizer.AI** (~$20)
   - Professional-grade tracing

4. **Final polish** in vector editor

**Total Time:** 3-5 days
**Total Cost:** ~$100-200

#### Option C: Hybrid (Budget: ~$500-1,500)

1. **AI for exploration** (Recraft or Leonardo)
   - Generate concepts
   - Lock down style direction

2. **Hire Fiverr artist** ($60-100/character)
   - Refine AI concepts
   - Create full expression sheets
   - Ensure perfect consistency

3. **Vectorize finals**

**Total Time:** 2-3 weeks
**Total Cost:** ~$500-1,500

### Magic vs Science Style Guide

```
MAGIC CHARACTERS:
- Color palette: Deep purples, ethereal blues, gold accents
- Visual elements: Glowing runes, flowing fabrics, mystical particles
- Style keywords: "arcane", "ethereal", "enchanted", "mystical glow"

SCIENCE CHARACTERS:
- Color palette: Cool blues, electric greens, chrome/silver
- Visual elements: Holographic interfaces, circuit patterns, data streams
- Style keywords: "technological", "precise", "holographic", "neural network"

SHARED ELEMENTS (cohesive family):
- Same illustration style (clean lines, stylized proportions)
- Consistent eye style and facial proportions
- Unified line weight
- Same level of detail/complexity
```

### Prompt Template for TinyPM Characters

```
A stylized character illustration of [CHARACTER_NAME], a [ROLE] in a project management app.

Theme: [magic/science]
Expression: [neutral/happy/thinking/excited/concerned]

Style: Modern illustration, clean vector-friendly lines, cohesive with tech-fantasy aesthetic.
The character embodies the intersection of ancient wisdom and modern innovation.

Visual traits: [SPECIFIC_TRAITS]

Technical requirements:
- Clean edges suitable for SVG conversion
- Scalable from 64px icon to full hero illustration
- Consistent with TinyPM character family
- [Magic: ethereal glow effects, mystical symbols] OR [Science: holographic elements, data visualization accents]
```

---

## 7. Implementation Plan

### Phase 1: Setup (Day 1)

1. Sign up for Recraft Pro ($10/mo)
2. Set up Replicate account (API access)
3. Install CLI tools:
   ```bash
   pip install replicate
   export REPLICATE_API_TOKEN=your_token
   ```

### Phase 2: Style Lock (Day 1-2)

1. Generate 10-20 test images with different prompts
2. Pick the best style direction
3. Document exact prompt that works
4. Save as template

### Phase 3: Batch Generation (Day 2-3)

1. Create all 14 base characters (neutral expression)
2. Review for consistency
3. Iterate on any that don't match
4. Generate remaining expressions

### Phase 4: Refinement (Day 3-4)

1. Export all SVGs
2. Touch up in vector editor if needed
3. Create icon variants (simplified versions)
4. Export in all needed sizes

### Phase 5: Integration (Day 4-5)

1. Add to TinyPM assets
2. Create CSS sprite sheet or icon font if needed
3. Document character usage guidelines

---

## Cost Summary

| Approach | Tools | Est. Cost | Est. Time |
|----------|-------|-----------|-----------|
| **Fast/Cheap** | Recraft Pro + API | $50-100 | 1-2 days |
| **High Quality** | Leonardo + Flux + Vectorizer | $100-200 | 3-5 days |
| **Hybrid AI+Human** | AI + Fiverr artist | $500-1,500 | 2-3 weeks |
| **Full Professional** | Fiverr only | $2,100-7,000 | 1-3 months |

---

## Sources

### AI Image Generation
- [Medium - Best AI Image Tools 2026](https://jimmacleod.medium.com/the-best-ai-image-tools-for-2026-compared-and-evaluated-4dee99b4b565)
- [NeoLemon - Best AI Character Generator](https://www.neolemon.com/blog/best-ai-character-generator-for-consistent-characters-2025/)
- [WaveSpeed AI - Best AI Image Generators 2026](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/)
- [OpenAI Pricing](https://openai.com/pricing)

### Character Consistency
- [Atlabs AI - Create Consistent Characters](https://www.atlabs.ai/blog/create-consistent-characters-with-ai-2025-guide)
- [SkyWork AI - Consistent Characters Guide](https://skywork.ai/blog/how-to-consistent-characters-ai-scenes-prompt-patterns-2025/)
- [Stable Diffusion Art - LoRA Training](https://stable-diffusion-art.com/train-lora/)

### Vector/SVG Tools
- [Recraft AI](https://www.recraft.ai/)
- [Replicate Recraft V3 SVG](https://replicate.com/recraft-ai/recraft-v3-svg)
- [Vectorizer.AI](https://vectorizer.ai/)
- [SVG AI - Top 15 Free Tools](https://www.svgai.org/blog/ai-svg-generation/free-ai-svg-tools-resources)

### API/CLI
- [Replicate Pricing](https://replicate.com/pricing)
- [fal.ai Flux 2](https://fal.ai/flux-2)
- [Together AI Flux 2 Max](https://www.together.ai/models/flux-2-max)
- [GitHub comfy-headless](https://github.com/mcp-tool-shop/comfy-headless)

### Professional Illustration
- [AnimotionStudio - Character Design Pricing](https://animotionsstudio.com/how-much-does-a-character-design-cost/)
- [Fiverr Character Design](https://www.fiverr.com/categories/graphics-design/game-art/character-design)

---

## Quick Decision Matrix

**If you want SPEED:** Use Recraft V3 (native SVG, single tool)

**If you want QUALITY:** Use Leonardo.AI for generation + Vectorizer.AI for conversion

**If you want AUTOMATION:** Use Replicate API with batch scripts

**If you want PERFECTION:** Hire a mid-range Fiverr artist with AI concepts as reference

---

*Document generated by Claude Code research session, February 2026*
