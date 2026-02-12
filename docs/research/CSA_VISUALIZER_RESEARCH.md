# CSA Share Visualizer - Research & Implementation Guide

## Feature Overview

**Goal:** Create a "What's in Your Box" social media graphic generator that takes a list of CSA box items (e.g., "tomatoes, zucchini, basil, bread, eggs") and produces a beautiful flat-lay style image ready for sharing on Instagram, Facebook, and other platforms.

**Target Stack:** Google Apps Script + HTML/JS + Fabric.js Canvas

---

## Table of Contents

1. [AI Image Generation Options](#1-ai-image-generation-options)
2. [Template-Based Approaches](#2-template-based-approaches)
3. [Flat-Lay Composition Rules](#3-flat-lay-composition-rules)
4. [Color Theory for Produce Photography](#4-color-theory-for-produce-photography)
5. [Technical Implementation Approaches](#5-technical-implementation-approaches)
6. [Social Media Specifications](#6-social-media-specifications)
7. [Final Recommendations](#7-final-recommendations)

---

## 1. AI Image Generation Options

### 1.1 OpenAI GPT Image / DALL-E API

**Latest Models (2026):**
- **GPT Image 1.5** - State-of-the-art quality, best prompt following
- **GPT Image 1** - Previous flagship, excellent quality
- **GPT Image 1 Mini** - Budget-friendly option (50-70% cheaper)
- *DALL-E 2/3* - Deprecated, support ending May 2026

**Pricing (Per Image):**
| Quality | GPT Image 1.5 | GPT Image 1 |
|---------|---------------|-------------|
| Low (1024x1024) | ~$0.009 | ~$0.011 |
| Medium | ~$0.04 | ~$0.07 |
| High | ~$0.17-0.20 | ~$0.19-0.25 |

**Best Prompting Practices for Food Flat-Lays:**

```
// GOOD - Natural language description
"A flat lay photograph of fresh produce arranged on a white marble surface:
ripe red tomatoes, green zucchini, fresh basil leaves, artisan bread loaf,
and brown eggs. Soft natural lighting from above, Instagram aesthetic,
editorial food styling, aerial view"

// AVOID - Keyword stuffing
"8k, masterpiece, HDR, photorealistic, 4K resolution" // Less effective

// AVOID - "Photorealistic" as a style
"Photorealistic tomatoes" // Triggers art style interpretation
// BETTER
"Photo of tomatoes" // More natural results
```

**Key Prompt Elements:**
- Specify "flat lay photograph" or "overhead view"
- Mention surface material (marble, wood, linen)
- Include lighting description ("soft natural lighting", "morning light")
- Add mood/aesthetic ("Instagram aesthetic", "editorial food styling")
- List specific items with descriptive adjectives

**Google Apps Script Integration:**

```javascript
function generateImage(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  const endpoint = 'https://api.openai.com/v1/images/generations';

  const payload = {
    model: 'gpt-image-1.5',  // or 'gpt-image-1' for cost savings
    prompt: prompt,
    n: 1,
    size: '1024x1024',
    quality: 'medium'  // low, medium, or high
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const json = JSON.parse(response.getContentText());

  // Returns base64-encoded image (default for GPT Image models)
  return json.data[0].b64_json;
}
```

**Sources:**
- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation)
- [Ben Ronkin - DALL-E with Google Apps Script](https://benronkin.com/blog/use-dall-e-with-google-apps-script-to-convert-text-to-images-automatically.html)
- [OpenAI API Pricing](https://openai.com/api/pricing/)

---

### 1.2 Midjourney

**Strengths:** Exceptional artistic quality, excellent food photography prompts

**Limitations:** No direct API access (requires Discord bot integration or unofficial wrappers)

**Effective Flat-Lay Prompts:**

```
"Flat lay food photography of fresh CSA farm box contents: tomatoes,
zucchini, basil, bread, eggs on rustic wooden table, beautiful sunlight
and shadow, 3-point lighting at 5500k --ar 4:5 --v 6.1"

"Overhead food photography, rustic wooden surface, natural daylight,
fresh ingredients, editorial food styling --ar 1:1 --v 6.1"
```

**Key Parameters:**
- `--ar 4:5` for Instagram vertical posts
- `--ar 1:1` for square posts
- `--v 6.1` for latest version
- Include composition style: "knolling", "symmetrical", "asymmetric"

**Sources:**
- [Midjourney Food Prompts - MyAIForce](https://myaiforce.com/midjourney-food-prompts/)
- [Flat Lay Food Photographs Prompt - PromptBase](https://promptbase.com/prompt/flat-lay-food-photographs)

---

### 1.3 Stable Diffusion via Replicate API

**Pricing:** ~$0.002-0.005 per image (significantly cheaper than OpenAI)

**Models Available:**
- Stable Diffusion 3.5 Large: ~$0.065/image
- Stable Diffusion 3: ~$0.035/image
- Older SD versions: ~$0.002-0.005/image
- FLUX models: ~$0.003-0.01/image

**Implementation with Google Apps Script:**

```javascript
function generateWithReplicate(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('REPLICATE_API_KEY');

  const payload = {
    version: "stability-ai/stable-diffusion:...", // specific version hash
    input: {
      prompt: "RAW photo, " + prompt + ", dslr, soft lighting, high quality, Fujifilm XT",
      negative_prompt: "blurry, distorted, low quality",
      width: 1024,
      height: 1024
    }
  };

  const response = UrlFetchApp.fetch('https://api.replicate.com/v1/predictions', {
    method: 'post',
    headers: {
      'Authorization': 'Token ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  });

  // Returns prediction ID - need to poll for completion
  return JSON.parse(response.getContentText());
}
```

**Best Practices:**
- Add "RAW photo" and "DSLR" for realism
- Use LoRA models like `foodphoto` for better results
- Include camera/lens references for style consistency

**Sources:**
- [Replicate Pricing](https://replicate.com/pricing)
- [Stable Diffusion Prompts for Food - OpenArt](https://openart.ai/blog/post/stable-diffusion-prompts-for-food)
- [Civitai Food Photography LoRA](https://civitai.com/models/45322/food-photography)

---

## 2. Template-Based Approaches

### 2.1 Canva API / Alternatives

**Canva Connect API:**
- Requires Enterprise account for full programmatic access
- Autofill API allows filling templates with dynamic content
- Uses job-based system (not instant generation)

**Better Alternatives for This Use Case:**

**Templated.io:**
- Direct template automation API
- Import Canva templates or create custom ones
- Supports text, images, colors manipulation
- Output: JPG, PNG, WebP, PDF
- Full ownership of generated images

```javascript
// Example Templated.io integration
function generateFromTemplate(items, templateId) {
  const response = UrlFetchApp.fetch('https://api.templated.io/v1/render', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      template_id: templateId,
      layers: {
        'item_list': { text: items.join(', ') },
        'week_date': { text: getCurrentWeek() },
        'farm_logo': { image_url: LOGO_URL }
      }
    })
  });
  return JSON.parse(response).download_url;
}
```

**Switchboard Canvas:**
- Responsive template system
- API and no-code tools (Zapier/Pabbly)
- Good for automated image production

**Sources:**
- [Canva Connect API Documentation](https://www.canva.dev/docs/connect/api-reference/designs/create-design/)
- [Templated.io](https://templated.io/)
- [Switchboard Canvas](https://www.switchboard.ai/canvas/image-generation-api/)

---

### 2.2 Fabric.js Canvas Compositing

**Why Fabric.js?**
- Rich object model for programmatic manipulation
- Layer-based compositing with transparency support
- Export to PNG/JPG at any resolution
- Interactive editing capabilities
- Works entirely client-side (no server costs)

**Core Implementation Pattern:**

```javascript
// Initialize canvas
const canvas = new fabric.Canvas('canvas', {
  width: 1080,
  height: 1350,  // 4:5 ratio for Instagram
  backgroundColor: '#f5f5dc'  // Warm cream background
});

// Load background texture
fabric.Image.fromURL('backgrounds/marble.jpg', function(bg) {
  bg.scaleToWidth(canvas.width);
  canvas.setBackgroundImage(bg, canvas.renderAll.bind(canvas));
});

// Add produce items from PNG library
async function addItem(itemName, position) {
  return new Promise((resolve) => {
    fabric.Image.fromURL(`items/${itemName}.png`, function(img) {
      img.set({
        left: position.x,
        top: position.y,
        scaleX: position.scale,
        scaleY: position.scale,
        angle: position.rotation
      });
      canvas.add(img);
      resolve(img);
    });
  });
}

// Export final image
function exportImage() {
  return canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 2  // 2x resolution for high DPI
  });
}
```

**Layout Algorithm:**

```javascript
// Smart positioning based on item count
function calculatePositions(itemCount) {
  const positions = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  // Golden ratio spiral for organic placement
  const phi = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < itemCount; i++) {
    const angle = i * 2 * Math.PI / phi;
    const r = radius * Math.sqrt(i / itemCount);

    positions.push({
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      rotation: Math.random() * 30 - 15,  // -15 to +15 degrees
      scale: 0.8 + Math.random() * 0.4    // 0.8 to 1.2 scale
    });
  }

  return positions;
}
```

**Sources:**
- [Fabric.js Official Demos](https://fabricjs.com/demos/)
- [Fabric.js GitHub](https://github.com/fabricjs/fabric.js)
- [GeeksforGeeks Fabric.js Tutorial](https://www.geeksforgeeks.org/how-to-create-a-canvas-image-using-fabric-js/)

---

## 3. Flat-Lay Composition Rules

### 3.1 Fundamental Principles

**Rule of Thirds:**
- Divide frame into 9 equal sections with 2 horizontal + 2 vertical lines
- Place key items at intersection points
- Creates visual interest and professional feel

**Rule of Odds:**
- Odd numbers (3, 5, 7) of items are more visually appealing
- Prevents static, symmetric arrangements
- Creates natural flow

**Balance (Not Symmetry):**
- Distribute visual weight across the frame
- Smaller/lighter items can balance larger ones
- Asymmetric balance feels more organic

**Negative Space:**
- Leave 20-30% of frame as empty space
- Prevents overwhelming/cluttered feeling
- Directs eye to focal points
- Creates sophisticated, intentional appearance

### 3.2 Arrangement Techniques

**Diagonal Lines:**
- Create movement and energy
- Diverging diagonals add interest
- Makes arrangement feel "lived-in"

**C-Shape Composition:**
- Natural movement through the frame
- Creates negative space naturally
- Good for 5-7 items

**Geometry & Shapes:**
- Contrast shapes (round foods on square plates)
- Repeat shapes to create rhythm
- Use triangular arrangements for stability

### 3.3 Technical Guidelines

**Camera/View Angle:**
- Flat plane must be perfectly parallel to surface
- All objects equally sharp
- Best for horizontal-aspect foods
- Vertical items (sandwiches, drinks) need side angles

**Optimal Lens (for AI prompts):**
- 50mm equivalent - avoids edge distortion
- Wider than 50mm distorts edges
- Longer than 100mm too compressed

**Best Subjects for Flat-Lay:**
- Spread-out items (produce, ingredients)
- Low-profile foods
- Collections of similar items
- NOT good for: tall items, burgers, drinks

**Sources:**
- [Adobe Flat Lay Photography Guide](https://www.adobe.com/creativecloud/photography/type/flat-lay-photography.html)
- [Digital Photography School - 9 Tips for Flat Lay](https://digital-photography-school.com/flat-lay-food-photography/)
- [Food Photography Academy - Flatlay Techniques](https://foodphotographyacademy.co/blog/composition/composition-improve-your-food-photography-flatlays/)

---

## 4. Color Theory for Produce Photography

### 4.1 Three Main Color Schemes

**Complementary Colors (RECOMMENDED):**
- Colors opposite on color wheel
- Creates visual "pop" and contrast
- Best combinations for produce:
  - **Orange + Blue** (carrots on blue cloth)
  - **Red + Green** (tomatoes with basil)
  - **Yellow + Purple** (lemons with lavender)

**Analogous Colors:**
- 3 colors adjacent on wheel
- Creates harmony and cohesion
- Example: Tomatoes, oranges, peppers (red-orange-yellow)

**Monochromatic:**
- Variations of single color
- Sophisticated, editorial feel
- Example: All green vegetables

### 4.2 Warm vs Cool Psychology

**Warm Colors (Red, Orange, Yellow):**
- Appear to move forward
- Create feelings of comfort, appetite
- Best for hero items

**Cool Colors (Blue, Green, Purple):**
- Appear to recede
- Create feelings of freshness, calm
- Best for backgrounds and accents

**Best Practice:** Warm subjects on cool backgrounds

### 4.3 Practical Palettes for CSA Boxes

**Summer Box:**
- Primary: Warm greens, reds, oranges
- Background: Light blue or white marble
- Accent: Fresh herbs (basil, mint)

**Fall Box:**
- Primary: Oranges, yellows, deep greens
- Background: Warm wood or burlap
- Accent: Rustic textures

**Winter Box:**
- Primary: Deep greens, roots (oranges, purples)
- Background: Dark slate or navy
- Accent: Cream linens

**Spring Box:**
- Primary: Light greens, pastels
- Background: White or light wood
- Accent: Edible flowers

### 4.4 Colors to Avoid

- **Pure primary colors** for backgrounds (too harsh)
- **Bright yellow** - hardest to work with
- **Neon/saturated** backgrounds - compete with food
- Prefer **earth tones** for surfaces and props

**Sources:**
- [Two Loves Studio - Colour Theory in Food Photography](https://twolovesstudio.com/blog/colour-theory-food-photography/)
- [Food Photography Blog - Best and Worst Colors](https://foodphotographyblog.com/the-best-and-worst-colors-for-photographing-food/)
- [Happy Kitchen - Color Theory](https://happykitchen.rocks/color-theory-food-photography/)

---

## 5. Technical Implementation Approaches

### 5.1 Approach Comparison

| Approach | Pros | Cons | Cost | Best For |
|----------|------|------|------|----------|
| **Pure AI Generation** | Unique images, handles any item | Inconsistent, expensive at scale, slower | $0.04-0.20/image | Small farms, occasional use |
| **Template + Pre-cut PNGs** | Fast, consistent, low cost | Limited variety, needs PNG library | $0/image (after setup) | High volume, consistent branding |
| **Hybrid (AI + Template)** | Balance of quality and consistency | Complex implementation | $0.02-0.10/image | Medium farms, quality focus |

### 5.2 Recommended: Hybrid Approach

**Architecture:**

```
User Input (item list)
       ↓
[Item Categorization]
       ↓
┌──────────────────────────────────────┐
│  For each item:                      │
│  1. Check PNG library (fast path)    │
│  2. If missing → AI generate PNG     │
│  3. Cache result for future use      │
└──────────────────────────────────────┘
       ↓
[Layout Engine (Fabric.js)]
       ↓
[Compose final image]
       ↓
[Export at social media dimensions]
```

**Implementation:**

```javascript
// Main composition function
async function generateCSAVisual(items, options = {}) {
  const {
    width = 1080,
    height = 1350,  // 4:5 Instagram vertical
    background = 'marble_white',
    style = 'rustic'
  } = options;

  // Initialize canvas
  const canvas = new fabric.Canvas('canvas', { width, height });

  // Set background
  await setBackground(canvas, background);

  // Get or generate item images
  const itemImages = await Promise.all(
    items.map(item => getItemImage(item))
  );

  // Calculate optimal layout
  const positions = calculateLayout(itemImages.length, { width, height });

  // Place items on canvas
  for (let i = 0; i < itemImages.length; i++) {
    await placeItem(canvas, itemImages[i], positions[i]);
  }

  // Add branding elements
  await addBranding(canvas, options);

  // Export
  return canvas.toDataURL({ format: 'png', quality: 1 });
}

// Smart item image retrieval
async function getItemImage(itemName) {
  const normalized = normalizeItemName(itemName);

  // Check local cache first
  const cached = await checkCache(normalized);
  if (cached) return cached;

  // Check PNG library
  const libraryImage = await checkLibrary(normalized);
  if (libraryImage) return libraryImage;

  // Generate with AI as fallback
  const generated = await generateItemPNG(normalized);
  await cacheImage(normalized, generated);
  return generated;
}

// AI generation for missing items
async function generateItemPNG(itemName) {
  const prompt = `Single ${itemName}, professional food photography,
    isolated on pure white background, studio lighting,
    high resolution, no shadows, product shot`;

  const imageData = await callOpenAIImage(prompt);

  // Remove background if needed (or use AI with white bg)
  return imageData;
}
```

### 5.3 PNG Library Strategy

**Essential Categories for CSA:**

| Category | Common Items | Priority |
|----------|--------------|----------|
| Leafy Greens | lettuce, kale, spinach, chard, arugula | HIGH |
| Root Vegetables | carrots, beets, turnips, radishes, potatoes | HIGH |
| Tomatoes & Peppers | tomatoes, bell peppers, jalape?os | HIGH |
| Squash | zucchini, yellow squash, butternut, acorn | HIGH |
| Alliums | onions, garlic, leeks, scallions | HIGH |
| Herbs | basil, cilantro, parsley, dill, mint | HIGH |
| Fruits | apples, peaches, berries, melons | MEDIUM |
| Eggs & Dairy | eggs (carton/loose), cheese | MEDIUM |
| Baked Goods | bread loaf, rolls, baguette | MEDIUM |
| Preserves | jam jars, honey, pickles | LOW |

**PNG Sources (Free/Commercial):**
- [Freepik Food Transparent](https://www.freepik.com/free-photos-vectors/food-transparent)
- [PNG Maker Food Ingredients](https://pngmaker.io/tag/Food-ingredients)
- [StickPNG Food](https://www.stickpng.com/cat/food)
- [Rawpixel Food PNGs](https://www.rawpixel.com/search/food%20png)

**AI-Generated PNG Library:**
Build custom library using AI with white background prompts:

```javascript
const libraryPrompts = {
  'tomato': 'Single ripe red heirloom tomato, studio food photography, pure white background, no shadow, isolated, high resolution product shot',
  'zucchini': 'Single fresh green zucchini, studio food photography, pure white background, no shadow, isolated, high resolution product shot',
  // ... etc
};
```

---

## 6. Social Media Specifications

### 6.1 Image Dimensions

| Platform | Format | Dimensions | Aspect Ratio | Use Case |
|----------|--------|------------|--------------|----------|
| Instagram | Vertical Post | 1080 x 1350 | 4:5 | **RECOMMENDED** - Best engagement |
| Instagram | Square | 1080 x 1080 | 1:1 | Feed uniformity |
| Instagram | Story/Reel | 1080 x 1920 | 9:16 | Ephemeral content |
| Facebook | Feed | 1200 x 630 | 1.91:1 | Link shares |
| Facebook | Post | 1080 x 1350 | 4:5 | Same as Instagram |
| Facebook | Story | 1080 x 1920 | 9:16 | Stories |

**Recommended Default:** 1080 x 1350 (4:5) - Works well on both Instagram and Facebook

### 6.2 Export Settings

```javascript
function exportForSocial(canvas, platform = 'instagram') {
  const settings = {
    instagram: {
      format: 'jpeg',
      quality: 0.92,  // High quality, reasonable file size
      multiplier: 1,  // Already at 1080px
    },
    instagram_hd: {
      format: 'png',
      quality: 1,
      multiplier: 2,  // 2160px for retina
    },
    facebook: {
      format: 'jpeg',
      quality: 0.9,
      multiplier: 1,
    }
  };

  const config = settings[platform];
  return canvas.toDataURL(config);
}
```

### 6.3 Text Overlay Guidelines

**"What's in Your Box" Header:**
- Position: Top 15% of image
- Font: Clean sans-serif (Montserrat, Open Sans)
- Size: 48-64px at 1080px width
- Color: Dark text on light overlay, or white with shadow

**Item List (Optional):**
- Position: Bottom 20% or side panel
- Font: Same family, lighter weight
- Size: 24-32px
- Format: Comma-separated or vertical list

**Farm Branding:**
- Logo: Corner placement, semi-transparent
- Size: Max 10% of image width
- Position: Bottom right preferred

---

## 7. Final Recommendations

### 7.1 Recommended Implementation Path

**Phase 1: MVP (Template-Based)**
1. Build Fabric.js canvas composer
2. Create 20-30 essential produce PNGs (or source from stock)
3. Implement basic layout algorithms
4. Add text overlay system
5. Export to Instagram-ready dimensions

**Phase 2: AI Enhancement**
1. Integrate OpenAI GPT Image API for missing items
2. Add caching layer for generated images
3. Build PNG library over time from AI generations
4. Implement background variations

**Phase 3: Polish**
1. Add seasonal color palettes
2. Implement multiple layout styles
3. A/B test compositions
4. Add animation for Stories/Reels

### 7.2 Technical Stack Recommendation

```
┌─────────────────────────────────────────────┐
│           Google Apps Script                │
│  - Orchestration & API calls                │
│  - Data management (Sheets integration)     │
│  - Image storage (Drive)                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           HTML Service UI                   │
│  - Fabric.js canvas                         │
│  - Item selection interface                 │
│  - Preview & edit capabilities              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           External APIs (as needed)         │
│  - OpenAI GPT Image (fallback generation)   │
│  - Replicate (budget alternative)           │
└─────────────────────────────────────────────┘
```

### 7.3 Cost Projections

| Scenario | Monthly Images | Approach | Est. Cost |
|----------|----------------|----------|-----------|
| Small CSA (weekly) | 4 | Hybrid | $0-2/mo |
| Medium CSA (2x/week) | 8 | Hybrid | $1-4/mo |
| Large CSA (daily) | 30 | Template-first | $0-5/mo |

*Assumes PNG library covers 80%+ of items after initial setup*

### 7.4 Prompt Templates for AI Generation

**Complete Scene:**
```
A beautiful flat lay photograph of fresh CSA farm box contents
arranged on a [SURFACE]. Items include: [ITEM_LIST].
Soft natural morning light from above, editorial food photography style,
[SEASON] aesthetic, negative space around edges, Instagram-worthy,
professional food styling. Shot with 50mm lens, f/2.8.
```

**Individual Item (for PNG library):**
```
Single [ITEM_NAME], professional food photography, isolated on
pure white background #FFFFFF, studio lighting, sharp focus,
high resolution product shot, no shadows, no reflections
```

**Background Only:**
```
Empty [SURFACE_TYPE] surface texture, overhead view, soft natural
lighting, food photography background, no objects, subtle shadows,
[COLOR_TONE] tones
```

### 7.5 CSA-Specific Marketing Best Practices

**Content Strategy:**
- Post weekly "What's in Your Box" consistently (same day/time)
- Alternate with recipe suggestions using box contents
- Share member photos (user-generated content)
- Behind-the-scenes harvest content
- Countdown posts before enrollment periods

**Visual Consistency:**
- Use consistent background/surface week-to-week
- Maintain brand colors in overlays
- Same font family throughout
- Logo placement consistency

**Engagement Tactics:**
- Ask "What will you make with these?"
- Tag items with recipe hashtags
- Feature one "star item" each week
- Include storage/usage tips in captions

**Sources:**
- [FarmstandApp - Social Media Marketing Strategies](https://www.farmstandapp.com/19939/using-social-media-for-farm-marketing/)
- [MemberAssembler - 47 Marketing Tips for CSA Farms](https://www.memberassembler.com/hub/marketing-tips-for-farmers)
- [LocalLine - Ultimate Guide to Social Media for Farmers](https://www.localline.co/blog/social-media-for-farms)

---

## Appendix: Quick Reference

### AI Prompt Cheat Sheet

| Element | Good | Avoid |
|---------|------|-------|
| Style | "flat lay photograph", "food photography" | "photorealistic", "8K masterpiece" |
| Lighting | "soft natural light", "morning light" | "HDR", "dramatic lighting" |
| View | "overhead view", "aerial shot" | "close-up", "macro" |
| Background | "white marble surface", "rustic wood" | "abstract background" |
| Quality | "professional", "editorial" | "stunning", "amazing" |

### Fabric.js Quick Commands

```javascript
// Add image
fabric.Image.fromURL(url, img => canvas.add(img));

// Position & rotate
img.set({ left: 100, top: 100, angle: 15 });

// Scale to fit
img.scaleToWidth(200);

// Export
canvas.toDataURL({ format: 'png', quality: 1 });

// Clear canvas
canvas.clear();
```

### Color Palette Hex Codes

**Backgrounds:**
- White Marble: `#f5f5f5`
- Warm Wood: `#8B4513`
- Cream Linen: `#f5f5dc`
- Slate Gray: `#708090`
- Navy: `#1a1a2e`

**Accent Colors:**
- Fresh Green: `#4a7c59`
- Tomato Red: `#ff6347`
- Harvest Orange: `#ff8c00`
- Eggplant Purple: `#614051`
- Sky Blue: `#87ceeb`

---

*Research compiled: February 2026*
*For: Tiny Seed OS - CSA Share Visualizer Feature*
