# Crop-to-Content Pipeline Research
## AI-Powered Farm Social Media Content Generation

**Research Date:** February 12, 2026
**Prepared For:** Tiny Seed Farm Social Media Tool
**Target Stack:** Google Apps Script + HTML/JavaScript
**Status:** Research Complete - Ready for Implementation

---

## Executive Summary

This document provides comprehensive research for building a "Crop-to-Content Pipeline" feature that transforms farm produce photos into ready-to-post social media content. The feature workflow:

1. User uploads photo of produce (tomatoes, zucchini, flowers, etc.)
2. AI vision identifies what's in the photo
3. System generates: caption, recipe suggestion, storage tips, nutritional facts
4. Creates ready-to-post social media content

**Recommended Stack:**
- **Vision API:** Claude Vision API (primary) with fallback to GPT-4V
- **Recipe API:** Spoonacular (best overall) or Edamam (nutrition-focused)
- **Nutrition Database:** USDA FoodData Central (free, government-validated)
- **Storage/Freshness:** FSIS FoodKeeper API (USDA data)
- **Caption Generation:** Claude API with farm-specific prompting

---

## Table of Contents

1. [AI Vision APIs for Produce Identification](#1-ai-vision-apis-for-produce-identification)
2. [Recipe APIs and Databases](#2-recipe-apis-and-databases)
3. [Nutritional Databases](#3-nutritional-databases)
4. [Storage and Freshness Databases](#4-storage-and-freshness-databases)
5. [Photo-to-Content Workflow Tools](#5-photo-to-content-workflow-tools)
6. [UX Patterns for This Feature Type](#6-ux-patterns-for-this-feature-type)
7. [Google Apps Script Implementation](#7-google-apps-script-implementation)
8. [Complete Architecture Recommendation](#8-complete-architecture-recommendation)
9. [Cost Analysis](#9-cost-analysis)
10. [Implementation Timeline](#10-implementation-timeline)

---

## 1. AI Vision APIs for Produce Identification

### Option A: Claude Vision API (RECOMMENDED)

**Overview:**
Claude 3.5 Sonnet offers excellent vision capabilities, surpassing Claude 3 Opus on standard vision benchmarks. It excels at visual reasoning tasks and can accurately identify produce, extract text, and provide contextual understanding.

**Key Capabilities:**
- Food and produce categorization
- Object recognition with contextual understanding
- Text extraction from labels
- Spatial reasoning for composition analysis
- Multi-modal analysis combining visual and textual information

**Pros:**
- Excellent accuracy for produce identification
- Strong contextual understanding (can identify ripeness, quality)
- Natural language response generation
- Works well with follow-up prompts
- Already integrated with your stack (you have Anthropic API access)
- Can generate captions AND identify produce in one call

**Cons:**
- May give approximate counts (not precise for large quantities)
- Can struggle with low-quality, rotated, or very small images (<200 pixels)
- Image understanding only (cannot edit images)

**Pricing (2026):**
- Claude 3.5 Sonnet: ~$3/million input tokens, ~$15/million output tokens
- Images: Calculated based on image size (typically 1-2K tokens per image)
- Estimated: ~$0.003-0.01 per image analysis

**API Integration Example (Google Apps Script):**
```javascript
function analyzeProduceWithClaude(base64Image) {
  const ANTHROPIC_API_KEY = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  const payload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64Image
          }
        },
        {
          type: 'text',
          text: `Analyze this farm produce photo and provide:
1. Produce identification (what vegetables/fruits/flowers are shown)
2. Estimated quantity
3. Quality assessment (freshness, ripeness)
4. A brief description suitable for a social media caption
5. Any notable visual characteristics

Format as JSON.`
        }
      ]
    }]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  return JSON.parse(response.getContentText());
}
```

**Sources:**
- [Claude Vision Documentation](https://docs.claude.com/en/docs/build-with-claude/vision)
- [Anthropic Claude Image Analysis](https://docs.contextual.io/documentation-and-resources/services-catalog/all-intro-patterns/anthropic-claude-image-analysis)

---

### Option B: GPT-4V (GPT-4 Vision)

**Overview:**
OpenAI's multimodal model combines NLP and image analysis. Widely adopted with over 1.5 million applications using it.

**Key Capabilities:**
- Object identification in complex scenes
- Image classification and labeling
- Product recognition with detailed descriptions
- Spatial classification for food items
- Text extraction from images

**Pros:**
- Highly accurate produce recognition
- Strong at detailed descriptions
- Can identify brands, features, specifications
- Large ecosystem and community support
- Visual search functionality

**Cons:**
- Separate API key/account required
- Higher cost than Claude for some use cases
- May require additional setup for Google Apps Script

**Pricing:**
- GPT-4V: ~$10/million input tokens (images calculated by resolution)
- Estimated: ~$0.01-0.02 per image analysis

**API Integration:**
```javascript
function analyzeProduceWithGPT4V(base64Image) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const payload = {
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        },
        {
          type: 'text',
          text: 'Identify the produce in this farm photo. Return JSON with: produce_items, quantities, freshness_level, description.'
        }
      ]
    }],
    max_tokens: 500
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  return JSON.parse(response.getContentText());
}
```

**Sources:**
- [OpenAI Vision API Guide](https://platform.openai.com/docs/guides/vision)
- [GPT-4 Vision Complete Guide](https://blog.roboflow.com/gpt-4-vision/)

---

### Option C: Google Cloud Vision API

**Overview:**
Google's computer vision ML with label detection capabilities. Can identify thousands of objects including food categories.

**Key Capabilities:**
- LABEL_DETECTION for general object identification
- Food category support (food, produce, plants)
- High accuracy for common objects
- OCR text extraction

**Pros:**
- Fast and reliable
- Good for categorization
- Integrates well with Google ecosystem
- Strong for batch processing

**Cons:**
- Generic labels (may return "vegetable" instead of "zucchini")
- Less contextual understanding than Claude/GPT-4V
- May require custom model training for specific produce types

**Pricing:**
- First 1,000 units/month: Free
- $1.50 per 1,000 images after

**Note:** Best as a fallback or for basic categorization. For specific produce identification, Claude or GPT-4V are superior.

**Sources:**
- [Google Cloud Vision Documentation](https://cloud.google.com/vision/docs)
- [Vision AI Tools](https://cloud.google.com/vision)

---

### Option D: Specialized Plant/Produce APIs

**Pl@ntNet API:**
- Focused on plant identification (100M+ identifications performed)
- Excellent for flowers, leaves, and botanical identification
- Less suitable for prepared food or cut vegetables
- Free tier available
- Best for: Flower CSA photos, plant disease identification

**plant.id by Kindwise:**
- Outperforms PlantNet in multiple academic comparisons
- Correct species in 9/10 queries within top 3 results
- Better for British/European flora
- Best for: Precise botanical identification

**LogMeal Food AI:**
- Specialized for prepared food recognition
- 1,300+ dish recognition
- Nutritional analysis built-in
- 35+ nutritional indicators
- Best for: If you're also identifying prepared dishes

**Sources:**
- [Pl@ntNet API](https://my.plantnet.org/)
- [plant.id by Kindwise](https://www.kindwise.com/plant-id)
- [LogMeal API](https://logmeal.com/api/)

---

### RECOMMENDATION: Vision API Strategy

```
Primary: Claude Vision API
- Handles identification + caption generation in one call
- Best contextual understanding
- Already integrated with your system

Fallback: GPT-4V
- Use when Claude confidence is low
- Better for certain edge cases

Specialty: Pl@ntNet
- Use specifically for flower identification
- Free tier covers most use cases
```

---

## 2. Recipe APIs and Databases

### Option A: Spoonacular Food API (RECOMMENDED)

**Overview:**
Considered the best overall food, recipe, and nutrition API with 280,000+ active developers.

**Database Size:**
- 5,000+ recipes (extensive database)
- 4 million+ products
- 115,000+ menu items
- 2,600+ ingredients

**Key Features:**
- Search recipes by ingredients
- Nutritional information per recipe
- Dietary filters (vegan, vegetarian, keto, low-FODMAP, Whole30)
- Detailed cooking instructions
- Preparation times and servings
- Images included
- Wine pairing recommendations
- Flavor analysis

**API Endpoints for Crop-to-Content:**
```javascript
// Search recipes by ingredient
GET /recipes/findByIngredients?ingredients=tomatoes,basil&number=5

// Get recipe information
GET /recipes/{id}/information

// Quick recipe summary
GET /recipes/{id}/summary
```

**Pricing (2026):**
- Free: 150 requests/day
- Starter: $10/month (500 requests/day)
- Professional: $50/month (1,500 requests/day)
- Enterprise: $500/month (unlimited)

**Google Apps Script Integration:**
```javascript
function getRecipesByIngredient(ingredient) {
  const SPOONACULAR_KEY = PropertiesService.getScriptProperties().getProperty('SPOONACULAR_API_KEY');

  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredient)}&number=3&apiKey=${SPOONACULAR_KEY}`;

  const response = UrlFetchApp.fetch(url);
  const recipes = JSON.parse(response.getContentText());

  return recipes.map(r => ({
    title: r.title,
    image: r.image,
    usedIngredients: r.usedIngredients.map(i => i.name),
    missedIngredients: r.missedIngredients.map(i => i.name)
  }));
}

function getRecipeDetails(recipeId) {
  const SPOONACULAR_KEY = PropertiesService.getScriptProperties().getProperty('SPOONACULAR_API_KEY');

  const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_KEY}`;

  const response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}
```

**Sources:**
- [Spoonacular API](https://spoonacular.com/food-api)
- [API League Comparison](https://apileague.com/articles/best-recipe-api/)

---

### Option B: Edamam Recipe API

**Overview:**
Focused on nutrition analysis with advanced NLP for dietary queries.

**Database Size:**
- 2.3 million recipes from 500+ sources

**Key Features:**
- Advanced NLP for complex queries ("low-fat vegan brownies without sugar")
- 40+ dietary categories
- Separate nutrition analysis API
- Vision API for food photos (recent addition)

**Pricing:**
- Developer: Free (10 requests/minute, limited)
- Basic: $49/month
- Pro: $499/month

**Best For:** If nutrition analysis is your primary concern

**Sources:**
- [Edamam Recipe API](https://developer.edamam.com/edamam-recipe-api)
- [Edamam Documentation](https://developer.edamam.com/edamam-docs-recipe-api)

---

### RECOMMENDATION: Recipe API

Use **Spoonacular** as your primary recipe API:
- Better free tier for development
- Ingredient-based search is perfect for produce photos
- Includes nutritional data
- Well-documented with many examples

---

## 3. Nutritional Databases

### Option A: USDA FoodData Central (RECOMMENDED - Free)

**Overview:**
Official U.S. government nutritional database with 380,000+ foods and detailed nutrient profiles.

**Key Features:**
- REST API access
- Free with API key
- Public domain data (CC0 1.0)
- Laboratory-validated data
- Quarterly updates
- Food Search and Food Details endpoints

**Rate Limits:**
- 1,000 requests/hour per IP (usually sufficient)
- Free for all use cases

**API Endpoints:**
```javascript
// Search for a food item
GET https://api.nal.usda.gov/fdc/v1/foods/search?query=tomato&api_key=YOUR_KEY

// Get specific food details
GET https://api.nal.usda.gov/fdc/v1/food/{fdcId}?api_key=YOUR_KEY
```

**Google Apps Script Integration:**
```javascript
function getNutritionData(foodName) {
  const USDA_API_KEY = PropertiesService.getScriptProperties().getProperty('USDA_API_KEY');

  // Search for the food
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`;

  const searchResponse = UrlFetchApp.fetch(searchUrl);
  const searchData = JSON.parse(searchResponse.getContentText());

  if (!searchData.foods || searchData.foods.length === 0) {
    return null;
  }

  const food = searchData.foods[0];

  // Extract key nutrients
  const nutrients = {};
  const keyNutrients = ['Energy', 'Protein', 'Total lipid (fat)', 'Carbohydrate, by difference', 'Fiber, total dietary', 'Vitamin C', 'Vitamin A'];

  if (food.foodNutrients) {
    food.foodNutrients.forEach(n => {
      if (keyNutrients.includes(n.nutrientName)) {
        nutrients[n.nutrientName] = {
          value: n.value,
          unit: n.unitName
        };
      }
    });
  }

  return {
    description: food.description,
    brandOwner: food.brandOwner || 'Generic',
    nutrients: nutrients,
    fdcId: food.fdcId
  };
}
```

**Nutritional Facts Template:**
```javascript
function formatNutritionFacts(nutritionData) {
  if (!nutritionData) return 'Nutrition data not available.';

  const n = nutritionData.nutrients;

  return `
**Nutrition Facts (per 100g):**
- Calories: ${n['Energy']?.value || 'N/A'} ${n['Energy']?.unit || ''}
- Protein: ${n['Protein']?.value || 'N/A'}g
- Fat: ${n['Total lipid (fat)']?.value || 'N/A'}g
- Carbs: ${n['Carbohydrate, by difference']?.value || 'N/A'}g
- Fiber: ${n['Fiber, total dietary']?.value || 'N/A'}g
- Vitamin C: ${n['Vitamin C']?.value || 'N/A'}mg
  `.trim();
}
```

**Sources:**
- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/)
- [FDC OpenAPI Documentation](https://fdc.nal.usda.gov/api-spec/fdc_api.html)

---

### Option B: Nutritionix API

**Overview:**
Commercial API with extensive restaurant and branded food data.

**Best For:** If you need restaurant/fast food data (not relevant for farm produce)

**Pricing:** $299+/month for production use

---

### RECOMMENDATION: Nutritional Database

Use **USDA FoodData Central**:
- Free
- Government-validated data
- Perfect for raw produce (your primary use case)
- Sufficient rate limits

---

## 4. Storage and Freshness Databases

### Option A: FSIS FoodKeeper Database (RECOMMENDED - Free)

**Overview:**
USDA Food Safety and Inspection Service database with storage guidelines for hundreds of food items. Developed with Cornell University and the Food Marketing Institute.

**Data Available:**
- Refrigerator storage times (min/max)
- Freezer storage times
- Pantry storage times
- Storage tips and methods

**Accessing the Data:**

The FoodKeeper data is available as:
1. Open dataset on data.gov
2. REST API implementations on GitHub

**GitHub Implementation:**
```
https://github.com/jelera/food-shelflife-db
```

**Google Apps Script Integration:**
```javascript
// FoodKeeper data structure (simplified)
const FOODKEEPER_DATA = {
  "tomatoes": {
    category: "Vegetables - Fresh",
    refrigeratorMin: 7,
    refrigeratorMax: 14,
    refrigeratorMetric: "Days",
    freezerMin: null,
    freezerMax: null,
    tips: "Store at room temperature until ripe, then refrigerate. Keep away from direct sunlight.",
    ripening: "Ripen at room temperature, stem-side up"
  },
  "zucchini": {
    category: "Vegetables - Fresh",
    refrigeratorMin: 5,
    refrigeratorMax: 7,
    refrigeratorMetric: "Days",
    freezerMin: 10,
    freezerMax: 12,
    freezerMetric: "Months",
    tips: "Store unwashed in a plastic bag in the crisper drawer. Blanch before freezing."
  },
  "lettuce": {
    category: "Vegetables - Fresh",
    refrigeratorMin: 5,
    refrigeratorMax: 7,
    refrigeratorMetric: "Days",
    freezerMin: null,
    freezerMax: null,
    tips: "Wash and dry thoroughly. Store in a plastic bag with a paper towel to absorb moisture."
  }
  // ... extend with more produce
};

function getStorageTips(produceName) {
  const normalized = produceName.toLowerCase().trim();

  // Direct lookup
  if (FOODKEEPER_DATA[normalized]) {
    return FOODKEEPER_DATA[normalized];
  }

  // Fuzzy match (partial match)
  for (const key in FOODKEEPER_DATA) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return FOODKEEPER_DATA[key];
    }
  }

  // Not found - return generic tips
  return {
    category: "Produce",
    tips: "Store in a cool, dry place. Refrigerate after cutting. Use within a few days for best quality."
  };
}

function formatStorageTips(produceItem) {
  const data = getStorageTips(produceItem);

  let tips = `**Storage Tips for ${produceItem}:**\n`;

  if (data.refrigeratorMin && data.refrigeratorMax) {
    tips += `- Refrigerator: ${data.refrigeratorMin}-${data.refrigeratorMax} ${data.refrigeratorMetric}\n`;
  }

  if (data.freezerMin && data.freezerMax) {
    tips += `- Freezer: ${data.freezerMin}-${data.freezerMax} ${data.freezerMetric}\n`;
  }

  if (data.tips) {
    tips += `- ${data.tips}\n`;
  }

  if (data.ripening) {
    tips += `- Ripening: ${data.ripening}\n`;
  }

  return tips.trim();
}
```

**Data Source:**
- [FSIS FoodKeeper Data (data.gov)](https://catalog.data.gov/dataset/fsis-foodkeeper-data)
- [FoodKeeper App](https://www.foodsafety.gov/keep-food-safe/foodkeeper-app)

---

### Option B: StillTasty.com

**Overview:**
Comprehensive shelf life guide for thousands of foods.

**Access Method:**
No official API, but the data is used by the Shelf-Life GitHub project.

**GitHub Project:**
```
https://github.com/jcomo/shelf-life
```

**Best For:** Supplementing FoodKeeper data with additional items.

---

### Option C: Build a Custom Produce Storage Database

For a farm-specific application, consider building a custom sheet with produce your farm grows:

```javascript
// In Google Sheets: PRODUCE_STORAGE sheet
// Columns: Produce_Name, Category, Refrigerator_Days_Min, Refrigerator_Days_Max,
//          Freezer_Months_Min, Freezer_Months_Max, Storage_Tips, Ripening_Tips, Peak_Season

function getStorageTipsFromSheet(produceName) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('PRODUCE_STORAGE');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const normalized = produceName.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row[0].toString().toLowerCase();

    if (name.includes(normalized) || normalized.includes(name)) {
      const result = {};
      headers.forEach((header, idx) => {
        result[header] = row[idx];
      });
      return result;
    }
  }

  return null;
}
```

---

### RECOMMENDATION: Storage Database

Use a **hybrid approach**:
1. Build a custom Google Sheet with your farm's produce
2. Populate with FoodKeeper data for those items
3. Add farm-specific tips (your growing conditions, varietals)
4. Fall back to USDA FoodKeeper API for items not in your sheet

---

## 5. Photo-to-Content Workflow Tools

### Current Industry Leaders (2026)

**1. PostEverywhere**
- Combines AI content generation + image creation + multi-platform scheduling
- All-in-one dashboard
- AI image generators include Flux and DALL-E

**2. DFIRST AI**
- Visual canvas for campaign building
- Drag-and-drop AI model connections
- Good for complex workflows

**3. Buffer with AI Assistant**
- Caption optimization
- Posting cadence optimization
- Simple, widely-used

**4. Canva Magic Studio**
- AI-powered design features
- Text-to-image generation
- Auto captions with Magic Write

**5. Flick.Social**
- Instagram hashtag analytics
- AI Caption Generator
- Farm-specific caption templates

---

### Farm-Specific Caption Generators

**HIX.AI Farm Captions:**
- 100+ farming captions
- Free Instagram caption generator
- Farm-centric templates

**LocalLine Farm Marketing:**
- Workshop: "Farm Marketing Meets AI"
- ChatGPT workflows for farmers
- 30+ days of Instagram post ideas

---

### Social Media Content Best Practices (2026)

**Caption Strategy:**
- Use AI for inspiration and drafts, but edit for authentic voice
- Review and personalize AI-generated content for brand consistency
- Use AI for administrative tasks (captions, keywords, resizing)

**Hashtag Best Practices:**
- Instagram: Use 3-5 highly relevant hashtags per post
- TikTok: 3-5 targeted hashtags per video
- Focus on quality over quantity
- Place hashtags in captions (increases reach by 36%)

**SEO Optimization:**
- Instagram search pulls from keywords in captions
- Write clear, conversational captions with searchable terms
- "Saves," "Shares," and "Dwell Time" matter more than likes

**Engagement Metrics:**
- AI delivers 80% less time on content creation
- 32% higher engagement with AI-optimized captions
- 300% average ROI on AI social tools

**Sources:**
- [Buffer AI Social Media Tools](https://buffer.com/resources/ai-social-media-content-creation/)
- [Instagram Hashtag Tips 2026](https://skedsocial.com/blog/how-to-use-hashtags-on-instagram-in-2026-hashtag-tips-to-up-your-insta-game)
- [AI in Social Media 2026](https://metricool.com/ai-social-media-marketing/)

---

## 6. UX Patterns for This Feature Type

### AI-Driven UX Design Patterns

**1. Generative Assistance Pattern**
- Use AI to automatically create content based on user input (photo)
- Two modes:
  - **AI Creation:** Generates without additional intervention (quick thumbnails, captions)
  - **Collaborative Co-creation:** User can iterate and refine

**2. Visual Search Pattern**
- Users upload images instead of typing
- AI streamlines discovery with faster, intuitive results

**3. Predictive/Adaptive Interfaces (2026 Trend)**
- Apps predict what user needs next
- Modules reorder based on expected actions
- "You'll likely do Y next, so here's Y now"

### UX Flow for Crop-to-Content

```
┌─────────────────────────────────────────────────────────────┐
│                   CROP-TO-CONTENT FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: CAPTURE                                            │
│  ┌────────────┐  ┌────────────┐                            │
│  │  Take      │  │  Upload    │                            │
│  │  Photo     │  │  from      │                            │
│  │  [Camera]  │  │  Gallery   │                            │
│  └────────────┘  └────────────┘                            │
│                                                             │
│  Step 2: IDENTIFY (AI Processing - Show Loading State)     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Loading Animation]                                │   │
│  │  "Identifying your produce..."                      │   │
│  │                                                     │   │
│  │  Progress: ████████░░░░░░░░ 53%                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 3: CONFIRM & ENRICH                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Image Preview]                                    │   │
│  │                                                     │   │
│  │  Identified: Heirloom Tomatoes (95% confidence)     │   │
│  │  [Edit] [Looks right!]                             │   │
│  │                                                     │   │
│  │  Also detected: Basil leaves, Cutting board        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 4: GENERATE CONTENT                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TABS: [Caption] [Recipe] [Storage] [Nutrition]     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Instagram Caption:                                 │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ "These beauties are straight from the       │   │   │
│  │  │  field! Our Cherokee Purple tomatoes are    │   │   │
│  │  │  at peak ripeness right now. Perfect for    │   │   │
│  │  │  caprese salads or just eating like an      │   │   │
│  │  │  apple. Available at Saturday's market!"    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Hashtags: #farmfresh #heirloomtomatoes            │   │
│  │            #localgrown #pittsburghfarms             │   │
│  │                                                     │   │
│  │  [Regenerate] [Edit] [Copy to Clipboard]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 5: SHARE/SCHEDULE                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Copy for   │  │ Schedule   │  │ Save as    │           │
│  │ Manual     │  │ Post       │  │ Draft      │           │
│  │ Posting    │  │ [Later]    │  │ [Library]  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile-First Considerations

1. **Large Touch Targets:** Camera button should be prominent
2. **One-Handed Operation:** Keep primary actions in thumb zone
3. **Offline Support:** Queue images for processing when connected
4. **Progress Feedback:** Always show what's happening during AI processing
5. **Quick Actions:** One-tap copy to clipboard for captions

### Pattern Library Reference

The Shape of AI (shapeof.ai) provides excellent AI UX patterns:
- Sharing sample generations to educate users
- Getting more info when prompts aren't clear
- Large, open-ended input inviting first interaction
- Structured templates (pre-filled or user-filled)
- Human-in-the-loop for oversight

**Sources:**
- [The Shape of AI - UX Patterns](https://www.shapeof.ai)
- [AI-Driven UX Design Patterns](https://blog.logrocket.com/ux-design/ai-driven-ux-design-patterns/)
- [Mobile App Design Trends 2026](https://uxpilot.ai/blogs/mobile-app-design-trends)

---

## 7. Google Apps Script Implementation

### Complete Backend Implementation

```javascript
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CROP-TO-CONTENT PIPELINE - Google Apps Script Backend
 * ═══════════════════════════════════════════════════════════════════════════
 */

// API Keys (stored in Script Properties)
function getApiKeys() {
  const props = PropertiesService.getScriptProperties();
  return {
    anthropic: props.getProperty('ANTHROPIC_API_KEY'),
    spoonacular: props.getProperty('SPOONACULAR_API_KEY'),
    usda: props.getProperty('USDA_API_KEY')
  };
}

/**
 * Main pipeline function - processes image through all stages
 */
function processProduceImage(base64Image, options = {}) {
  const {
    generateCaption = true,
    getRecipes = true,
    getNutrition = true,
    getStorage = true,
    platform = 'instagram'
  } = options;

  const result = {
    timestamp: new Date().toISOString(),
    success: false,
    identification: null,
    caption: null,
    recipes: null,
    nutrition: null,
    storage: null,
    errors: []
  };

  try {
    // Step 1: Identify produce using Claude Vision
    const identification = identifyProduce(base64Image);
    result.identification = identification;

    if (!identification || !identification.items || identification.items.length === 0) {
      result.errors.push('Could not identify produce in image');
      return result;
    }

    const primaryProduce = identification.items[0].name;

    // Step 2: Generate caption (always includes produce info)
    if (generateCaption) {
      result.caption = generateSocialCaption(identification, platform);
    }

    // Step 3: Get recipes
    if (getRecipes) {
      result.recipes = getRecipesForProduce(primaryProduce);
    }

    // Step 4: Get nutrition data
    if (getNutrition) {
      result.nutrition = getNutritionForProduce(primaryProduce);
    }

    // Step 5: Get storage tips
    if (getStorage) {
      result.storage = getStorageForProduce(primaryProduce);
    }

    result.success = true;

  } catch (error) {
    result.errors.push(error.message);
    Logger.log('Pipeline error: ' + error.message);
  }

  return result;
}

/**
 * Identify produce using Claude Vision API
 */
function identifyProduce(base64Image) {
  const apiKey = getApiKeys().anthropic;

  const payload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64Image
          }
        },
        {
          type: 'text',
          text: `You are analyzing a photo from a small organic farm. Identify all produce visible in this image.

Return a JSON object with this structure:
{
  "items": [
    {
      "name": "produce name (e.g., 'Cherry Tomatoes')",
      "variety": "specific variety if identifiable (e.g., 'Sungold')",
      "quantity": "estimated quantity (e.g., '~2 lbs', 'bunch of 6')",
      "freshness": "fresh/ripe/overripe/unknown",
      "color": "primary color",
      "confidence": 0.95
    }
  ],
  "setting": "description of photo context (e.g., 'harvest basket', 'market display')",
  "visualHighlights": ["notable visual aspects for social media"],
  "suggestedTone": "playful/informative/appetizing/rustic"
}

Be specific with produce names (e.g., "Zucchini" not just "squash").
Only include items you can clearly identify.`
        }
      ]
    }]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  const responseData = JSON.parse(response.getContentText());

  if (responseData.error) {
    throw new Error('Claude API error: ' + responseData.error.message);
  }

  // Parse the JSON from Claude's response
  const content = responseData.content[0].text;

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

/**
 * Generate social media caption using Claude
 */
function generateSocialCaption(identification, platform = 'instagram') {
  const apiKey = getApiKeys().anthropic;

  const platformGuidelines = {
    instagram: {
      maxLength: 2200,
      hashtagCount: '3-5',
      style: 'engaging, emoji-friendly, visual storytelling'
    },
    facebook: {
      maxLength: 500,
      hashtagCount: '1-2',
      style: 'conversational, community-focused'
    },
    twitter: {
      maxLength: 280,
      hashtagCount: '1-2',
      style: 'concise, punchy'
    }
  };

  const guidelines = platformGuidelines[platform] || platformGuidelines.instagram;

  const payload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are a social media manager for a small organic farm in Pittsburgh. Generate a ${platform} caption for this produce photo.

Produce identified:
${JSON.stringify(identification.items, null, 2)}

Photo context: ${identification.setting || 'farm harvest'}
Suggested tone: ${identification.suggestedTone || 'friendly and authentic'}
Visual highlights: ${(identification.visualHighlights || []).join(', ')}

Platform requirements:
- Max length: ${guidelines.maxLength} characters
- Include ${guidelines.hashtagCount} relevant hashtags
- Style: ${guidelines.style}

Return JSON:
{
  "caption": "the full caption text",
  "hashtags": ["hashtag1", "hashtag2"],
  "characterCount": 150,
  "callToAction": "Visit us Saturday at Sewickley Farmers Market!",
  "alternateVersions": [
    "shorter version",
    "question-based version"
  ]
}`
    }]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  const responseData = JSON.parse(response.getContentText());

  const content = responseData.content[0].text;

  // Extract JSON
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

/**
 * Get recipes from Spoonacular
 */
function getRecipesForProduce(produceName) {
  const apiKey = getApiKeys().spoonacular;

  // Search for recipes featuring this produce
  const searchUrl = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(produceName)}&number=3&ranking=2&apiKey=${apiKey}`;

  const searchResponse = UrlFetchApp.fetch(searchUrl);
  const recipes = JSON.parse(searchResponse.getContentText());

  // Get quick summaries for top recipes
  const results = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    usedIngredients: recipe.usedIngredients.map(i => i.name),
    missedIngredientCount: recipe.missedIngredientCount
  }));

  // Get one detailed recipe (the first/best match)
  if (results.length > 0) {
    const detailUrl = `https://api.spoonacular.com/recipes/${results[0].id}/information?apiKey=${apiKey}`;
    const detailResponse = UrlFetchApp.fetch(detailUrl);
    const detail = JSON.parse(detailResponse.getContentText());

    results[0].detail = {
      readyInMinutes: detail.readyInMinutes,
      servings: detail.servings,
      summary: detail.summary?.replace(/<[^>]*>/g, '').substring(0, 300) + '...',
      sourceUrl: detail.sourceUrl
    };
  }

  return results;
}

/**
 * Get nutrition data from USDA FoodData Central
 */
function getNutritionForProduce(produceName) {
  const apiKey = getApiKeys().usda;

  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(produceName)}&pageSize=1&dataType=Foundation,SR%20Legacy&api_key=${apiKey}`;

  const response = UrlFetchApp.fetch(searchUrl);
  const data = JSON.parse(response.getContentText());

  if (!data.foods || data.foods.length === 0) {
    return null;
  }

  const food = data.foods[0];

  // Extract key nutrients
  const keyNutrientIds = {
    'Energy': 1008,
    'Protein': 1003,
    'Total Fat': 1004,
    'Carbohydrates': 1005,
    'Fiber': 1079,
    'Vitamin C': 1162,
    'Vitamin A': 1106,
    'Potassium': 1092,
    'Iron': 1089
  };

  const nutrients = {};

  if (food.foodNutrients) {
    food.foodNutrients.forEach(n => {
      const name = n.nutrientName;
      if (Object.keys(keyNutrientIds).some(key => name.includes(key))) {
        nutrients[name] = {
          value: Math.round(n.value * 10) / 10,
          unit: n.unitName
        };
      }
    });
  }

  return {
    foodName: food.description,
    dataType: food.dataType,
    nutrients: nutrients,
    servingSize: '100g',
    fdcId: food.fdcId,
    // Generate a short nutrition highlight
    highlight: generateNutritionHighlight(nutrients)
  };
}

/**
 * Generate a social-media-friendly nutrition highlight
 */
function generateNutritionHighlight(nutrients) {
  const highlights = [];

  // Check for notable nutrients
  const vitC = Object.entries(nutrients).find(([k,v]) => k.includes('Vitamin C'));
  if (vitC && vitC[1].value > 10) {
    highlights.push(`Good source of Vitamin C (${vitC[1].value}mg)`);
  }

  const fiber = Object.entries(nutrients).find(([k,v]) => k.includes('Fiber'));
  if (fiber && fiber[1].value > 2) {
    highlights.push(`High in fiber (${fiber[1].value}g)`);
  }

  const potassium = Object.entries(nutrients).find(([k,v]) => k.includes('Potassium'));
  if (potassium && potassium[1].value > 200) {
    highlights.push(`Rich in potassium`);
  }

  // Check if low calorie
  const calories = Object.entries(nutrients).find(([k,v]) => k.includes('Energy'));
  if (calories && calories[1].value < 50) {
    highlights.push(`Low calorie (${calories[1].value} cal/100g)`);
  }

  return highlights.length > 0 ? highlights.join(', ') : 'Nutrient-rich produce';
}

/**
 * Get storage tips
 */
function getStorageForProduce(produceName) {
  // First check custom sheet
  const customTips = getStorageTipsFromSheet(produceName);
  if (customTips) {
    return customTips;
  }

  // Fall back to built-in data
  return getStorageTipsBuiltIn(produceName);
}

/**
 * Get storage tips from Google Sheet
 */
function getStorageTipsFromSheet(produceName) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('PRODUCE_STORAGE');

    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const normalized = produceName.toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[0].toString().toLowerCase();

      if (name.includes(normalized) || normalized.includes(name)) {
        const result = {};
        headers.forEach((header, idx) => {
          result[header] = row[idx];
        });
        return result;
      }
    }

    return null;
  } catch (e) {
    Logger.log('Error reading storage sheet: ' + e.message);
    return null;
  }
}

/**
 * Built-in storage tips database
 */
function getStorageTipsBuiltIn(produceName) {
  const storageData = {
    // Fruits & Vegetables
    'tomato': {
      refrigeratorDays: '7-14 (after ripe)',
      roomTemp: '3-5 days (to ripen)',
      tips: 'Store stem-side up at room temperature until ripe. Refrigerate only when fully ripe. Never store below 55F as it damages texture.',
      freezing: 'Yes - blanch first or freeze whole for sauces'
    },
    'tomatoes': {
      refrigeratorDays: '7-14 (after ripe)',
      roomTemp: '3-5 days (to ripen)',
      tips: 'Store stem-side up at room temperature until ripe. Refrigerate only when fully ripe. Never store below 55F as it damages texture.',
      freezing: 'Yes - blanch first or freeze whole for sauces'
    },
    'zucchini': {
      refrigeratorDays: '5-7',
      tips: 'Store unwashed in a plastic bag in crisper drawer. Avoid moisture to prevent soft spots.',
      freezing: 'Yes - slice and blanch first, freezes for 10-12 months'
    },
    'squash': {
      refrigeratorDays: '5-7 (summer), 1-3 months (winter)',
      tips: 'Summer squash in fridge. Winter squash at cool room temperature (50-55F) in dark place.',
      freezing: 'Yes - cube and blanch first'
    },
    'lettuce': {
      refrigeratorDays: '5-7',
      tips: 'Wash and dry thoroughly. Wrap in paper towels and store in plastic bag. Keep away from apples/tomatoes.',
      freezing: 'No - does not freeze well'
    },
    'kale': {
      refrigeratorDays: '5-7',
      tips: 'Store unwashed in plastic bag. Wash just before use.',
      freezing: 'Yes - blanch first, great for smoothies'
    },
    'carrots': {
      refrigeratorDays: '21-28',
      tips: 'Remove green tops before storing (they draw moisture). Store in plastic bag in crisper.',
      freezing: 'Yes - blanch sliced carrots first'
    },
    'beets': {
      refrigeratorDays: '14-21',
      tips: 'Cut off greens leaving 2 inches of stem. Store in plastic bag.',
      freezing: 'Yes - cook first then freeze'
    },
    'peppers': {
      refrigeratorDays: '7-14',
      tips: 'Store unwashed in crisper drawer. Green peppers last longer than colored.',
      freezing: 'Yes - slice and freeze raw (texture changes)'
    },
    'cucumbers': {
      refrigeratorDays: '7-10',
      tips: 'Keep in warmest part of fridge (not too cold). Wrap in paper towel.',
      freezing: 'No - does not freeze well'
    },
    'eggplant': {
      refrigeratorDays: '5-7',
      tips: 'Store at room temp if using within 2 days. Refrigerate in plastic bag otherwise.',
      freezing: 'Yes - slice, blanch, and freeze'
    },
    'beans': {
      refrigeratorDays: '5-7',
      tips: 'Store unwashed in plastic bag. Use promptly for best quality.',
      freezing: 'Yes - blanch first'
    },
    'peas': {
      refrigeratorDays: '3-5',
      tips: 'Keep in pods until ready to use. Store in plastic bag.',
      freezing: 'Yes - shell and blanch first'
    },
    'corn': {
      refrigeratorDays: '1-3',
      tips: 'Use as soon as possible - sugar converts to starch quickly. Keep in husks.',
      freezing: 'Yes - blanch on cob or cut kernels off'
    },
    'onions': {
      pantryWeeks: '4-8',
      tips: 'Store in cool, dark, well-ventilated place. Keep away from potatoes.',
      freezing: 'Yes - chop and freeze raw'
    },
    'garlic': {
      pantryWeeks: '12-24',
      tips: 'Store whole bulbs in cool, dark place with good air circulation.',
      freezing: 'Yes - peel and freeze whole cloves'
    },
    'potatoes': {
      pantryWeeks: '3-5',
      tips: 'Store in cool (45-50F), dark place. Never refrigerate. Keep away from onions.',
      freezing: 'Cooked only'
    },
    // Herbs
    'basil': {
      refrigeratorDays: '5-7',
      tips: 'Treat like flowers - trim stems and place in water at room temp. Cover loosely with plastic.',
      freezing: 'Yes - freeze in olive oil ice cubes'
    },
    'cilantro': {
      refrigeratorDays: '7-10',
      tips: 'Place stems in jar of water, cover with plastic bag, refrigerate.',
      freezing: 'Yes - freeze in ice cube trays with water'
    },
    'parsley': {
      refrigeratorDays: '7-14',
      tips: 'Wrap in damp paper towel, place in plastic bag.',
      freezing: 'Yes - chop and freeze in ice cube trays'
    },
    'mint': {
      refrigeratorDays: '7-10',
      tips: 'Place stems in water like flowers, cover loosely with plastic.',
      freezing: 'Yes - freeze in ice cube trays'
    },
    // Flowers
    'sunflowers': {
      vaseDays: '7-12',
      tips: 'Cut stems at angle, change water every 2 days, remove leaves below water line.',
      drying: 'Yes - hang upside down in dark, dry place'
    },
    'zinnias': {
      vaseDays: '7-10',
      tips: 'Remove lower leaves, cut stems at angle, use flower food.',
      drying: 'No - does not dry well'
    },
    'dahlias': {
      vaseDays: '4-6',
      tips: 'Cut in morning or evening, condition in cool water for several hours.',
      drying: 'No'
    }
  };

  const normalized = produceName.toLowerCase().trim();

  // Direct lookup
  if (storageData[normalized]) {
    return {
      ...storageData[normalized],
      produceName: produceName,
      source: 'built-in'
    };
  }

  // Fuzzy match
  for (const key in storageData) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return {
        ...storageData[key],
        produceName: produceName,
        matchedTo: key,
        source: 'built-in'
      };
    }
  }

  // Default
  return {
    tips: 'Store in a cool, dry place. Most fresh produce keeps 3-7 days in the refrigerator.',
    produceName: produceName,
    source: 'default'
  };
}

/**
 * API endpoint handler for doPost
 */
function handleCropToContent(data) {
  const { image, options } = data;

  if (!image) {
    return { error: 'No image provided' };
  }

  // Remove data URL prefix if present
  let base64Image = image;
  if (image.startsWith('data:image')) {
    base64Image = image.split(',')[1];
  }

  return processProduceImage(base64Image, options || {});
}

// Add to your doPost switch statement:
// case 'processProduceImage':
//   return jsonResponse(handleCropToContent(data));
```

---

### Frontend HTML Component

```html
<!-- crop-to-content.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crop to Content - Tiny Seed Farm</title>
  <script src="api-config.js"></script>
  <style>
    :root {
      --primary: #22c55e;
      --primary-dark: #16a34a;
      --bg: #1a1a2e;
      --surface: #232342;
      --text: #e0e0e0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      margin-bottom: 20px;
      color: var(--primary);
    }

    .upload-zone {
      background: var(--surface);
      border: 2px dashed #444;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .upload-zone:hover {
      border-color: var(--primary);
      background: rgba(34, 197, 94, 0.1);
    }

    .upload-zone.dragover {
      border-color: var(--primary);
      background: rgba(34, 197, 94, 0.2);
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .upload-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 15px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-secondary {
      background: #444;
      color: white;
    }

    .preview-container {
      display: none;
      margin-top: 20px;
    }

    .preview-container.active {
      display: block;
    }

    .preview-image {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 15px;
    }

    .processing {
      text-align: center;
      padding: 40px;
      display: none;
    }

    .processing.active {
      display: block;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #444;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results {
      display: none;
      margin-top: 20px;
    }

    .results.active {
      display: block;
    }

    .tabs {
      display: flex;
      border-bottom: 2px solid #444;
      margin-bottom: 15px;
    }

    .tab {
      padding: 12px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }

    .tab.active {
      border-bottom-color: var(--primary);
      color: var(--primary);
    }

    .tab-content {
      display: none;
      background: var(--surface);
      padding: 20px;
      border-radius: 12px;
    }

    .tab-content.active {
      display: block;
    }

    .caption-box {
      background: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      line-height: 1.6;
    }

    .hashtags {
      color: var(--primary);
      margin-top: 10px;
    }

    .copy-btn {
      width: 100%;
      margin-top: 10px;
    }

    .identification {
      background: var(--surface);
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .produce-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #444;
    }

    .produce-item:last-child {
      border-bottom: none;
    }

    .confidence {
      background: var(--primary);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .recipe-card {
      background: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .recipe-card h4 {
      margin-bottom: 10px;
      color: var(--primary);
    }

    .nutrition-table {
      width: 100%;
      border-collapse: collapse;
    }

    .nutrition-table td {
      padding: 8px;
      border-bottom: 1px solid #444;
    }

    .nutrition-table td:last-child {
      text-align: right;
      color: var(--primary);
    }

    .storage-tips {
      line-height: 1.8;
    }

    .storage-tips strong {
      color: var(--primary);
    }

    .error-message {
      background: #ef4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      display: none;
    }

    .error-message.active {
      display: block;
    }

    input[type="file"] {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Crop to Content</h1>

    <!-- Upload Zone -->
    <div class="upload-zone" id="uploadZone">
      <div class="upload-icon">📸</div>
      <p>Drop your produce photo here</p>
      <p style="color: #666; margin-top: 5px;">or</p>
      <div class="upload-buttons">
        <button class="btn btn-primary" id="cameraBtn">Take Photo</button>
        <button class="btn btn-secondary" id="uploadBtn">Upload</button>
      </div>
      <input type="file" id="fileInput" accept="image/*">
      <input type="file" id="cameraInput" accept="image/*" capture="environment">
    </div>

    <!-- Preview -->
    <div class="preview-container" id="previewContainer">
      <img class="preview-image" id="previewImage" alt="Preview">
      <div class="upload-buttons">
        <button class="btn btn-primary" id="processBtn">Generate Content</button>
        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
      </div>
    </div>

    <!-- Processing -->
    <div class="processing" id="processing">
      <div class="spinner"></div>
      <p id="processingText">Analyzing your produce...</p>
    </div>

    <!-- Results -->
    <div class="results" id="results">
      <!-- Identification Summary -->
      <div class="identification" id="identification"></div>

      <!-- Tabs -->
      <div class="tabs">
        <div class="tab active" data-tab="caption">Caption</div>
        <div class="tab" data-tab="recipes">Recipes</div>
        <div class="tab" data-tab="nutrition">Nutrition</div>
        <div class="tab" data-tab="storage">Storage</div>
      </div>

      <!-- Tab Contents -->
      <div class="tab-content active" id="captionTab"></div>
      <div class="tab-content" id="recipesTab"></div>
      <div class="tab-content" id="nutritionTab"></div>
      <div class="tab-content" id="storageTab"></div>

      <!-- New Photo Button -->
      <button class="btn btn-secondary" id="newPhotoBtn" style="width: 100%; margin-top: 20px;">
        Take Another Photo
      </button>
    </div>

    <!-- Error -->
    <div class="error-message" id="errorMessage"></div>
  </div>

  <script>
    const API_URL = TINY_SEED_API.MAIN_API;
    let currentImageBase64 = null;

    // DOM Elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const processing = document.getElementById('processing');
    const processingText = document.getElementById('processingText');
    const results = document.getElementById('results');
    const errorMessage = document.getElementById('errorMessage');

    // Event Listeners
    document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
    document.getElementById('cameraBtn').addEventListener('click', () => cameraInput.click());
    document.getElementById('processBtn').addEventListener('click', processImage);
    document.getElementById('cancelBtn').addEventListener('click', resetUI);
    document.getElementById('newPhotoBtn').addEventListener('click', resetUI);

    fileInput.addEventListener('change', handleFileSelect);
    cameraInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFile(file);
      }
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
      });
    });

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (file) {
        handleFile(file);
      }
    }

    async function handleFile(file) {
      // Compress if needed
      const compressed = await compressImage(file);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        previewImage.src = currentImageBase64;
        uploadZone.style.display = 'none';
        previewContainer.classList.add('active');
      };
      reader.readAsDataURL(compressed);
    }

    async function compressImage(file) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1280;
          const ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        };
        img.src = URL.createObjectURL(file);
      });
    }

    async function processImage() {
      previewContainer.classList.remove('active');
      processing.classList.add('active');
      errorMessage.classList.remove('active');

      const stages = [
        'Identifying produce...',
        'Generating caption...',
        'Finding recipes...',
        'Looking up nutrition...',
        'Getting storage tips...'
      ];

      let stageIndex = 0;
      const stageInterval = setInterval(() => {
        if (stageIndex < stages.length) {
          processingText.textContent = stages[stageIndex];
          stageIndex++;
        }
      }, 1500);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'processProduceImage',
            image: currentImageBase64,
            options: {
              generateCaption: true,
              getRecipes: true,
              getNutrition: true,
              getStorage: true,
              platform: 'instagram'
            }
          })
        });

        const data = await response.json();
        clearInterval(stageInterval);

        if (data.success) {
          displayResults(data);
        } else {
          throw new Error(data.errors?.join(', ') || 'Processing failed');
        }

      } catch (error) {
        clearInterval(stageInterval);
        showError(error.message);
      }
    }

    function displayResults(data) {
      processing.classList.remove('active');
      results.classList.add('active');

      // Identification
      const idHtml = data.identification.items.map(item => `
        <div class="produce-item">
          <div>
            <strong>${item.name}</strong>
            ${item.variety ? `<br><small>${item.variety}</small>` : ''}
            ${item.quantity ? `<br><small>Qty: ${item.quantity}</small>` : ''}
          </div>
          <span class="confidence">${Math.round(item.confidence * 100)}%</span>
        </div>
      `).join('');
      document.getElementById('identification').innerHTML = `
        <h3 style="margin-bottom: 10px;">Identified Produce</h3>
        ${idHtml}
      `;

      // Caption
      const caption = data.caption;
      document.getElementById('captionTab').innerHTML = `
        <div class="caption-box">
          ${caption.caption}
          <div class="hashtags">${caption.hashtags.map(h => '#' + h).join(' ')}</div>
        </div>
        <button class="btn btn-primary copy-btn" onclick="copyCaption()">
          Copy to Clipboard
        </button>
        ${caption.alternateVersions ? `
          <h4 style="margin-top: 20px; margin-bottom: 10px;">Alternative Versions</h4>
          ${caption.alternateVersions.map(v => `
            <div class="caption-box" style="font-size: 14px;">${v}</div>
          `).join('')}
        ` : ''}
      `;

      // Recipes
      if (data.recipes && data.recipes.length > 0) {
        document.getElementById('recipesTab').innerHTML = data.recipes.map(recipe => `
          <div class="recipe-card">
            <h4>${recipe.title}</h4>
            ${recipe.image ? `<img src="${recipe.image}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
            ${recipe.detail ? `
              <p>${recipe.detail.summary}</p>
              <p style="margin-top: 10px; color: #888;">
                Ready in ${recipe.detail.readyInMinutes} min | Serves ${recipe.detail.servings}
              </p>
            ` : ''}
            <p style="margin-top: 10px;">
              <strong>Uses:</strong> ${recipe.usedIngredients.join(', ')}
            </p>
          </div>
        `).join('');
      } else {
        document.getElementById('recipesTab').innerHTML = '<p>No recipes found for this produce.</p>';
      }

      // Nutrition
      if (data.nutrition && data.nutrition.nutrients) {
        const nutrients = data.nutrition.nutrients;
        document.getElementById('nutritionTab').innerHTML = `
          <h4 style="margin-bottom: 10px;">${data.nutrition.foodName}</h4>
          <p style="color: var(--primary); margin-bottom: 15px;">${data.nutrition.highlight}</p>
          <table class="nutrition-table">
            ${Object.entries(nutrients).map(([name, info]) => `
              <tr>
                <td>${name}</td>
                <td>${info.value} ${info.unit}</td>
              </tr>
            `).join('')}
          </table>
          <p style="margin-top: 15px; color: #888; font-size: 12px;">
            Per 100g serving | Source: USDA FoodData Central
          </p>
        `;
      } else {
        document.getElementById('nutritionTab').innerHTML = '<p>Nutrition data not available.</p>';
      }

      // Storage
      if (data.storage) {
        const storage = data.storage;
        document.getElementById('storageTab').innerHTML = `
          <div class="storage-tips">
            ${storage.refrigeratorDays ? `<p><strong>Refrigerator:</strong> ${storage.refrigeratorDays}</p>` : ''}
            ${storage.roomTemp ? `<p><strong>Room Temperature:</strong> ${storage.roomTemp}</p>` : ''}
            ${storage.pantryWeeks ? `<p><strong>Pantry:</strong> ${storage.pantryWeeks} weeks</p>` : ''}
            ${storage.freezing ? `<p><strong>Freezing:</strong> ${storage.freezing}</p>` : ''}
            ${storage.tips ? `<p style="margin-top: 15px;"><strong>Tips:</strong> ${storage.tips}</p>` : ''}
          </div>
        `;
      } else {
        document.getElementById('storageTab').innerHTML = '<p>Storage tips not available.</p>';
      }
    }

    function copyCaption() {
      const captionText = document.querySelector('.caption-box').textContent.trim();
      navigator.clipboard.writeText(captionText).then(() => {
        TinySeedUtils.showToast('Caption copied!', 'success');
      });
    }

    function showError(message) {
      processing.classList.remove('active');
      errorMessage.textContent = 'Error: ' + message;
      errorMessage.classList.add('active');
      uploadZone.style.display = 'block';
    }

    function resetUI() {
      previewContainer.classList.remove('active');
      processing.classList.remove('active');
      results.classList.remove('active');
      errorMessage.classList.remove('active');
      uploadZone.style.display = 'block';
      currentImageBase64 = null;
      fileInput.value = '';
      cameraInput.value = '';
    }
  </script>
</body>
</html>
```

---

## 8. Complete Architecture Recommendation

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CROP-TO-CONTENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FRONTEND (HTML/JS)                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ crop-to-        │  │ api-config.js   │  │ browser-image-  │        │
│  │ content.html    │──│ (API wrapper)   │  │ compression     │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│           │                    │                                        │
│           ▼                    ▼                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  BACKEND (Google Apps Script)                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     MERGED TOTAL.js                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ processProdu│  │ identifyPro │  │ generateSoc │             │   │
│  │  │ ceImage()   │──│ duce()      │  │ ialCaption()│             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  │         │                │                │                     │   │
│  │         │                ▼                ▼                     │   │
│  │         │         ┌─────────────┐  ┌─────────────┐             │   │
│  │         │         │ getRecipes  │  │ getNutrition│             │   │
│  │         │         │ ForProduce()│  │ ForProduce()│             │   │
│  │         │         └─────────────┘  └─────────────┘             │   │
│  │         │                │                │                     │   │
│  │         │                ▼                ▼                     │   │
│  │         │         ┌─────────────┐  ┌─────────────┐             │   │
│  │         │         │ getStorage  │  │ PRODUCE_    │             │   │
│  │         └────────▶│ ForProduce()│  │ STORAGE     │◀── Custom   │   │
│  │                   └─────────────┘  │ Sheet       │    Data     │   │
│  │                                    └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  EXTERNAL APIs                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Claude      │  │ Spoonacular │  │ USDA        │  │ FoodKeeper  │   │
│  │ Vision API  │  │ Recipe API  │  │ FoodData    │  │ (built-in)  │   │
│  │ (Primary)   │  │             │  │ Central     │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐                                      │
│  │ GPT-4V      │  │ Pl@ntNet    │                                      │
│  │ (Fallback)  │  │ (Flowers)   │                                      │
│  └─────────────┘  └─────────────┘                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Keys Required

Store these in Script Properties:

| Key Name | Service | Signup URL |
|----------|---------|------------|
| `ANTHROPIC_API_KEY` | Claude Vision | https://console.anthropic.com/ |
| `SPOONACULAR_API_KEY` | Spoonacular | https://spoonacular.com/food-api/console |
| `USDA_API_KEY` | USDA FoodData | https://fdc.nal.usda.gov/api-key-signup/ |
| `OPENAI_API_KEY` (optional) | GPT-4V fallback | https://platform.openai.com/ |
| `PLANTNET_API_KEY` (optional) | Flower ID | https://my.plantnet.org/ |

---

## 9. Cost Analysis

### Monthly Cost Projection (1,000 images/month)

| Service | Usage | Cost |
|---------|-------|------|
| Claude Vision API | 1,000 images | ~$3-10/month |
| Spoonacular | 1,000 recipe lookups | Free tier (150/day) or $10/month |
| USDA FoodData | 1,000 lookups | Free |
| FSIS FoodKeeper | N/A (built-in data) | Free |

**Total: $3-20/month** (depending on usage patterns and free tier utilization)

### Cost Optimization Strategies

1. **Batch Processing:** Process multiple images in queue during off-peak
2. **Caching:** Cache nutritional and storage data for common produce
3. **Smart Fallbacks:** Use cheaper APIs first, escalate only when needed
4. **Local Data:** Build comprehensive PRODUCE_STORAGE sheet to reduce API calls

---

## 10. Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Set up API keys in Script Properties
- [ ] Implement `identifyProduce()` with Claude Vision
- [ ] Create basic frontend with image upload
- [ ] Test end-to-end image identification

### Phase 2: Content Generation (Week 2)
- [ ] Implement `generateSocialCaption()`
- [ ] Add platform-specific caption formatting
- [ ] Build caption tab in frontend
- [ ] Add copy-to-clipboard functionality

### Phase 3: Enrichment (Week 3)
- [ ] Integrate Spoonacular for recipes
- [ ] Integrate USDA FoodData for nutrition
- [ ] Create PRODUCE_STORAGE sheet with farm produce
- [ ] Implement storage tips lookup

### Phase 4: Polish & Launch (Week 4)
- [ ] Mobile optimization
- [ ] Error handling and edge cases
- [ ] Add to main navigation
- [ ] User testing and feedback

---

## Sources

### Vision APIs
- [Claude Vision Documentation](https://docs.claude.com/en/docs/build-with-claude/vision)
- [OpenAI Vision API Guide](https://platform.openai.com/docs/guides/vision)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Pl@ntNet API](https://my.plantnet.org/)
- [LogMeal Food AI](https://logmeal.com/api/)

### Recipe & Nutrition APIs
- [Spoonacular Food API](https://spoonacular.com/food-api)
- [Edamam Recipe API](https://developer.edamam.com/edamam-recipe-api)
- [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/)

### Storage Data
- [FSIS FoodKeeper Data](https://catalog.data.gov/dataset/fsis-foodkeeper-data)
- [FoodKeeper App](https://www.foodsafety.gov/keep-food-safe/foodkeeper-app)
- [StillTasty](https://www.stilltasty.com/)

### Social Media Best Practices
- [Buffer AI Tools](https://buffer.com/resources/ai-social-media-content-creation/)
- [Instagram Hashtag Tips 2026](https://skedsocial.com/blog/how-to-use-hashtags-on-instagram-in-2026-hashtag-tips-to-up-your-insta-game)
- [AI in Social Media Marketing](https://metricool.com/ai-social-media-marketing/)

### UX Patterns
- [The Shape of AI](https://www.shapeof.ai)
- [AI-Driven UX Patterns](https://blog.logrocket.com/ux-design/ai-driven-ux-design-patterns/)
- [Mobile App Design Trends 2026](https://uxpilot.ai/blogs/mobile-app-design-trends)

### Google Apps Script
- [Claude API via Google Apps Script](https://gist.github.com/estevecastells/08ffa9064b57ab34a622dee16c32b629)
- [UrlFetchApp Documentation](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
- [External APIs in Apps Script](https://developers.google.com/apps-script/guides/services/external)

---

**Document prepared by:** Research Agent
**Date:** February 12, 2026
**For:** Tiny Seed Farm Social Media Tool
