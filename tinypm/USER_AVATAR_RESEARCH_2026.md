# TinyPM User Avatar System - Research Document 2026

**Research Date:** February 2026
**Researcher:** TinyPM Research Agent
**Purpose:** Technical research for implementing a hybrid user avatar system

---

## Executive Summary

This document provides comprehensive research for implementing a hybrid user avatar system where:
1. Users upload a photo of themselves
2. AI analyzes the photo and suggests a TinyPM-style avatar
3. Users can customize the AI-generated suggestion

The recommended approach is a **privacy-first, browser-based facial analysis** combined with a **component-based SVG avatar builder** that supports the TinyPM "Magic vs Science" aesthetic.

---

## 1. Photo-to-Avatar AI Technologies (2025-2026)

### 1.1 Commercial APIs Ranked by Feasibility

| Service | Type | Best For | Cost | API Available |
|---------|------|----------|------|---------------|
| **face-api.js** | Open Source | Browser-based detection | Free | Yes (client-side) |
| **MediaPipe Face Landmarker** | Open Source | 478 facial landmarks | Free | Yes |
| **AWS Rekognition** | Cloud API | Production facial analysis | $1/1000 images | Yes |
| **DiceBear** | Open Source | SVG avatar generation | Free | Yes |
| **Ready Player Me** | Commercial | 3D avatars | Free for devs | Yes |
| **HeyGen** | Commercial | Video avatars | $$$ | Yes |

### 1.2 AI Avatar Generation Services

**HeyGen (Avatar IV)**
- Generates stylized avatars from photos, illustrations, and even hand-drawn portraits
- Supports human, anime, and animal avatars in portrait and full-body formats
- Designed for video/animation use cases - may be overkill for static avatars

**Tavus**
- Creates ultra-realistic digital twins from ~2 minutes of video
- Focused on video experiences - not suitable for simple avatar generation

**LightX AI Avatar Generator**
- Converts photos into realistic custom avatars
- Consumer-focused, limited developer API options

**Lensa AI**
- Popular consumer app using Stable Diffusion
- **No public developer API available**
- Pricing: $3.99 for 50 avatars, $5.99 for 100, $7.99 for 200
- Not suitable for integration

### 1.3 Recommendation for TinyPM

**DO NOT use heavy AI image generation APIs** for this use case. Instead:
1. Use **browser-based facial analysis** to extract features
2. Map features to **predefined TinyPM avatar components**
3. Let users customize the result

This approach is:
- More privacy-friendly (no photos sent to external servers)
- More cost-effective (no per-image API costs)
- More consistent (all avatars match TinyPM style)
- More performant (instant results vs. API latency)

---

## 2. Facial Feature Extraction

### 2.1 Browser-Based Solutions (Recommended)

**face-api.js (Top Recommendation)**
- JavaScript API built on TensorFlow.js
- 68-point facial landmark detection
- Models as small as 80KB (tiny) to 350KB (standard)
- Detects: face shape, eye positions, nose, mouth, eyebrows
- Additional features: age estimation, gender prediction, expression detection
- **All processing happens in the browser - maximum privacy**

Key models:
- `tiny_face_detector_model` - 190KB, real-time performance
- `face_landmark_68_model` - 350KB, accurate landmarks
- `age_gender_model` - Age and gender estimation
- `face_expression_model` - Expression detection

**Google MediaPipe Face Landmarker**
- 478 3D facial landmarks (more detailed than face-api.js)
- Detects facial expressions
- Real-time performance
- Free and open source

**OpenCV.js (WebAssembly)**
- OpenCV compiled to WebAssembly
- Order of magnitude faster than pure JavaScript
- Face detection and analysis
- All processing client-side

### 2.2 Cloud APIs (For Server-Side Processing)

**AWS Rekognition**
- Comprehensive facial analysis
- Detects: emotions, age range, gender, facial landmarks
- Pricing: $1.00 per 1,000 images (first million)
- Free tier: 1,000 images/month for 12 months

**Azure Face API**
- Face landmarks detection
- Requires `detectionModel: Detection03`
- Part of Azure Cognitive Services

**MxFace API**
- 128 distinct facial landmarks
- 1 millisecond processing time
- Unlimited faces per image

### 2.3 Feature Mapping for TinyPM Avatars

Extracted features should map to TinyPM avatar elements:

| Detected Feature | TinyPM Avatar Element |
|------------------|----------------------|
| Face shape (oval/round/square) | Base head shape |
| Eye color | Eye color (with magic/science variation) |
| Hair color | Hair color options |
| Hair style indicators | Hair style category |
| Skin tone | Skin tone palette |
| Age estimation | Character style (youthful/mature) |
| Expression | Default expression |
| Glasses detected | Accessory suggestion |

### 2.4 Privacy Considerations

**Browser-Based (Recommended)**
- Photos never leave the user's device
- No server storage of facial data
- GDPR compliant by design
- User controls their data completely

**Cloud-Based (If Required)**
- Must obtain explicit consent
- Must document data retention policies
- Must allow users to delete their data
- Consider: photos become biometric data when technically processed for identification
- GDPR fines up to 20M EUR or 4% of global revenue for violations

---

## 3. Avatar Builder Systems

### 3.1 How Existing Builders Work

**Nintendo Mii**
- 20 years of development history
- Component-based: skin tones, eye shapes (48+), hair, facial hair
- 3D modeling with minimal hardware demands
- Wii U version added camera-based generation
- Modern Switch 2: gender-free, reads avatar properties programmatically

**Bitmoji/Snapchat**
- Photo upload -> server processing -> cartoon avatar
- User customizes: skin tone, hairstyles, face shapes, clothing
- Cloud storage for cross-device access
- Advanced: Snapmoji system converts selfie to avatar in 0.9 seconds
- Pipeline: Gaussian Domain Adaptation -> stylization -> 3D Gaussian avatar

**Replika**
- 3D customizable avatars
- Options: hairstyle, eye color, skin tone, body type, clothing
- Avatar reacts during conversations
- Virtual room decoration adds engagement
- Free: basic customization; Pro: full control

### 3.2 Technical Approaches

**SVG Component System (Recommended for TinyPM)**
- Each avatar part is an SVG element
- Parts stored as JSON configuration
- Layered rendering (back to front)
- Easy customization and storage
- Resolution independent
- Small file sizes

Example configuration:
```json
{
  "avatarId": "user_123",
  "style": "magic",
  "components": {
    "head": { "shape": "oval", "skinTone": "#f5d0c5" },
    "hair": { "style": "wavy", "color": "#4a3728" },
    "eyes": {
      "left": { "style": "magic", "color": "#7b68ee" },
      "right": { "style": "science", "color": "#00ced1" }
    },
    "accessories": ["glasses_round", "earring_crystal"],
    "expression": "friendly"
  }
}
```

**Canvas-Based**
- Fast rendering
- Breaks server-side rendering
- Accessibility challenges
- Good for real-time manipulation

**Hybrid (Avatune approach)**
- SVG for structure and accessibility
- Canvas for effects and animations
- 10 themes, multiple framework support
- In-browser ML for feature detection

### 3.3 Storage Solutions

**JSON Configuration (Recommended)**
- Store only component indices, not images
- Tiny storage footprint (~500 bytes per avatar)
- Easy to version and migrate
- Example: svg_avatar npm package

**LocalStorage for Drafts**
- 5MB per domain
- Serialize avatar config to JSON string
- Good for work-in-progress before saving

**Supabase Storage (For TinyPM)**
- Integrate with existing TinyPM infrastructure
- Row Level Security for privacy
- Pre-signed URLs for secure access
- Recommended: store JSON config in database, not images

---

## 4. TinyPM-Specific Implementation

### 4.1 Magic vs Science Aesthetic

The TinyPM brand features a dual "Magic vs Science" theme. This should inform avatar design:

**Magic Elements:**
- Mystical eye styles (sparkles, unusual pupils)
- Ethereal color palettes (purples, teals, golds)
- Flowing, organic shapes
- Accessories: crystals, feathers, nature elements

**Science Elements:**
- Technical eye styles (circuit patterns, data streams)
- Digital color palettes (neon greens, electric blues)
- Geometric, precise shapes
- Accessories: goggles, tech gadgets, measurement tools

### 4.2 Dual-Eye Concept Implementation

Users could choose:
1. **Both Magic** - Fully mystical character
2. **Both Science** - Fully technical character
3. **One of Each** - Balanced hybrid (signature TinyPM look)
4. **Let Photo Decide** - AI suggests based on detected personality indicators

Implementation:
```javascript
const eyeConfig = {
  leftEye: {
    style: "magic",  // or "science"
    color: detectEyeColor(photo) || "#7b68ee",
    effects: ["sparkle", "glow"]
  },
  rightEye: {
    style: "science",
    color: detectEyeColor(photo) || "#00ced1",
    effects: ["circuit", "pulse"]
  }
};
```

### 4.3 TinyPM Character Family Cohesion

To maintain visual consistency across all TinyPM avatars:

1. **Shared Design Language**
   - Consistent line weights
   - Same color palette options (curated, not arbitrary)
   - Matching proportions and style

2. **Limited but Expressive Options**
   - 6-8 face shapes (not infinite)
   - 15-20 hairstyles per category
   - Curated color options that all work together
   - Signature "TinyPM eyes" as the recognizable element

3. **Style Guide Enforcement**
   - All components designed by same artist/system
   - Automated validation that combinations work
   - Preview before saving

### 4.4 Accessories and Customization

**Suggested Categories:**

| Category | Magic Options | Science Options | Neutral Options |
|----------|--------------|-----------------|-----------------|
| Eyewear | Crystal monocle, Mystic glasses | Tech goggles, HUD visor | Round glasses, Sunglasses |
| Headwear | Flower crown, Witch hat | Antenna, Headphones | Baseball cap, Beanie |
| Jewelry | Crystal pendant, Feather earring | LED earring, Circuit bracelet | Simple studs, Watch |
| Props | Wand, Book of spells | Tablet, Microscope | Coffee cup, Plant |

---

## 5. Technical Requirements

### 5.1 Frontend Stack

**Core Technologies:**
```javascript
// Recommended stack
const techStack = {
  faceDetection: "face-api.js",           // Browser-based analysis
  avatarRendering: "SVG + Canvas hybrid",  // Flexibility + performance
  stateManagement: "React Context or Zustand",
  preview: "Real-time SVG manipulation",
  imageUpload: "HTML5 File API + Canvas resize"
};
```

**Image Upload Flow:**
1. User selects/captures photo
2. Client-side resize to max 800x800 (reduce processing time)
3. face-api.js detects landmarks
4. Map landmarks to avatar suggestions
5. Display editable preview
6. Save JSON config to Supabase

**Real-Time Preview:**
```javascript
// Pseudo-code for preview system
function AvatarPreview({ config }) {
  return (
    <svg viewBox="0 0 200 200">
      <Layer component="background" />
      <Layer component="body" shape={config.bodyShape} />
      <Layer component="head" shape={config.headShape} skin={config.skinTone} />
      <Layer component="hair-back" style={config.hairStyle} color={config.hairColor} />
      <Layer component="face" expression={config.expression} />
      <Layer component="eyes" left={config.leftEye} right={config.rightEye} />
      <Layer component="eyebrows" style={config.eyebrowStyle} />
      <Layer component="mouth" expression={config.expression} />
      <Layer component="nose" style={config.noseStyle} />
      <Layer component="hair-front" style={config.hairStyle} color={config.hairColor} />
      <Layer component="accessories" items={config.accessories} />
    </svg>
  );
}
```

### 5.2 Backend Requirements

**Minimal Backend Needed:**
- Photo processing happens client-side
- Store only JSON configuration
- Serve pre-built SVG component assets
- Generate PNG/WebP exports on-demand

**Supabase Integration:**
```sql
-- Avatar configuration table
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

-- Users can only access their own avatars
CREATE POLICY "Users can manage own avatars" ON user_avatars
  FOR ALL USING (auth.uid() = user_id);
```

### 5.3 Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Photo analysis | < 2 seconds | "Feels magical" |
| Avatar preview update | < 100ms | Real-time feedback |
| Initial load (models) | < 5 seconds | One-time, cacheable |
| Config save | < 500ms | Quick confirmation |
| Avatar render | < 50ms | Instant display |

### 5.4 Privacy Implementation

**Client-Side Only (Recommended):**
```javascript
const privacyConfig = {
  photoStorage: "none",           // Never store original photos
  processingLocation: "browser",  // All analysis client-side
  dataRetention: "config_only",   // Only save avatar JSON
  userConsent: "explicit",        // Clear opt-in required
  deleteCapability: "instant"     // User can delete anytime
};
```

**Privacy Notice Template:**
```
Your photo is processed entirely on your device.
We never upload, store, or transmit your photo.
Only your avatar preferences are saved to your account.
You can delete your avatar data at any time.
```

---

## 6. Inspiration & Best Practices

### 6.1 What Makes Avatar Builders "Sticky"

**The Hook Model (Nir Eyal):**
1. **Investment** - Time spent customizing creates ownership
2. **Trigger** - Prompt to update/customize
3. **Action** - Easy one-tap changes
4. **Reward** - Delight in the result

**Key Engagement Drivers:**

| Factor | Implementation |
|--------|----------------|
| Customization depth | Many options but curated |
| Social presence | Show avatars in app interactions |
| Unlockable content | Reward engagement with new options |
| Personality expression | Magic/Science choice reflects user |
| Easy sharing | Export for social media |
| Progress investment | Avatar "levels up" over time |

### 6.2 Best Practices from Research

**From Character.AI:**
- Users spend 2+ hours per visit with high avatar engagement
- Rename, re-voice, and visually style options
- Avatar that "grows richer" with interaction

**From Replika:**
- Avatar reacts during conversations (smiles, gestures)
- Virtual room decoration adds engagement layer
- "Selfie" generation creates delight

**From Nintendo Mii:**
- Simplicity enables wide adoption
- Camera-based creation reduces friction
- Cross-game presence builds attachment

**From Bitmoji:**
- Extensive wardrobe/situation stickers
- Integration with messaging apps
- Seasonal/trending content keeps fresh

### 6.3 Gamification Recommendations

**2025 Best Practices:**
- Gamification boosts engagement 100-150%
- Generic gamification fails - personalization is key
- Use engagement loops, not one-off rewards
- Make it feel optional, fun, and empowering

**For TinyPM:**
1. **Starter Pack** - Basic avatar on signup
2. **Unlock by Usage** - New accessories as user engages
3. **Seasonal Items** - Limited-time options
4. **Achievement Badges** - Special items for milestones
5. **Social Sharing** - Easy export encourages virality

---

## 7. Cost Estimates

### 7.1 Development Cost Components

| Component | Estimated Hours | Notes |
|-----------|-----------------|-------|
| Face detection integration | 8-12 | Using face-api.js |
| SVG component library | 40-60 | Design + development |
| Avatar builder UI | 24-32 | React/Vue component |
| Real-time preview | 8-12 | Canvas/SVG manipulation |
| Backend integration | 8-12 | Supabase config storage |
| Testing & polish | 16-24 | Cross-browser, edge cases |
| **Total** | **104-152 hours** | |

### 7.2 Ongoing Costs

**Recommended Approach (Browser-Based):**
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| face-api.js | $0 | Open source, client-side |
| DiceBear (reference) | $0 | Open source |
| Supabase storage | ~$0-25 | For JSON configs only |
| CDN for SVG assets | ~$5-20 | Static asset hosting |
| **Total** | **$5-45/month** | Scales with users |

**Alternative Cloud Approach:**
| Service | Cost per 10K users | Notes |
|---------|-------------------|-------|
| AWS Rekognition | $10/month | 10K avatar creations |
| Cloud storage | $5-10/month | Photo + config storage |
| **Total** | **$15-20/month** | Per 10K monthly users |

### 7.3 Comparison: Build vs. Buy

| Approach | Initial Cost | Monthly Cost | Control | Privacy |
|----------|--------------|--------------|---------|---------|
| Custom Build (Recommended) | $10-15K dev | $5-45 | Full | Excellent |
| Ready Player Me | $0 dev | Free-Custom | Limited | Good |
| Cloud API Integration | $5-8K dev | $15-50+ | Medium | Fair |

**Recommendation:** Custom build using open-source tools provides best balance of cost, control, and privacy for TinyPM's needs.

---

## 8. Recommended Architecture

### 8.1 High-Level Architecture

```
                    [User's Browser]
                          |
    +--------------------+--------------------+
    |                    |                    |
[Photo Upload]    [Avatar Builder]    [Preview Display]
    |                    |                    |
    v                    v                    v
[face-api.js]     [Component Selector]   [SVG Renderer]
    |                    |                    |
    +--------------------+--------------------+
                         |
                    [Avatar Config JSON]
                         |
                    [Supabase DB]
                         |
                    [CDN Export]
```

### 8.2 Component Diagram

```
TinyPM Avatar System
├── Frontend (React/Vue)
│   ├── PhotoUploader
│   │   ├── Camera capture
│   │   ├── File upload
│   │   └── Image resize
│   ├── FaceAnalyzer
│   │   ├── face-api.js integration
│   │   ├── Feature extraction
│   │   └── Suggestion mapping
│   ├── AvatarBuilder
│   │   ├── ComponentPicker
│   │   │   ├── HeadShapes
│   │   │   ├── HairStyles
│   │   │   ├── EyeStyles (Magic/Science)
│   │   │   ├── Accessories
│   │   │   └── Colors
│   │   ├── PreviewCanvas
│   │   └── ConfigManager
│   └── ExportModule
│       ├── PNG export
│       ├── WebP export
│       └── Share links
├── Backend (Minimal)
│   ├── Supabase
│   │   ├── user_avatars table
│   │   └── RLS policies
│   └── CDN
│       └── SVG component assets
└── Assets
    ├── SVG Components
    │   ├── heads/
    │   ├── hair/
    │   ├── eyes/
    │   ├── accessories/
    │   └── effects/
    └── face-api models
        ├── tiny_face_detector
        └── face_landmark_68
```

### 8.3 Data Flow

1. **Photo Upload**
   - User captures/uploads photo
   - Client resizes to 800x800 max
   - Photo stays in browser memory only

2. **Analysis**
   - face-api.js loads models (cached after first use)
   - Detect face and 68 landmarks
   - Extract features: face shape, approximate coloring, expression

3. **Suggestion**
   - Map detected features to TinyPM components
   - Generate initial avatar config
   - Present to user with "AI suggested this for you"

4. **Customization**
   - User adjusts components
   - Real-time preview updates
   - Changes tracked in local state

5. **Save**
   - JSON config saved to Supabase
   - Original photo discarded (never stored)
   - Avatar can be reconstructed from config

6. **Display**
   - Fetch config from DB
   - Render SVG from components
   - Cache rendered result

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Design TinyPM avatar component library (SVG)
- [ ] Create 3-5 face shapes, 5-10 hairstyles, eye variations
- [ ] Build basic avatar preview component
- [ ] Integrate face-api.js for detection

### Phase 2: Builder UI (Week 3-4)
- [ ] Create component picker interface
- [ ] Implement real-time preview
- [ ] Add color customization
- [ ] Build Magic vs Science toggle system

### Phase 3: Photo Analysis (Week 5)
- [ ] Implement photo upload with resize
- [ ] Create feature-to-component mapping
- [ ] Build "AI suggestion" flow
- [ ] Add privacy notices and consent

### Phase 4: Storage & Export (Week 6)
- [ ] Set up Supabase avatar table
- [ ] Implement save/load functionality
- [ ] Add PNG/WebP export
- [ ] Create share functionality

### Phase 5: Polish & Gamification (Week 7-8)
- [ ] Add unlock system for accessories
- [ ] Implement achievement badges
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] User testing and iteration

---

## 10. Key Sources

### Photo-to-Avatar Technologies
- [Tavus Avatar API Overview](https://www.tavus.io/post/avatar-api)
- [HeyGen Avatar IV](https://www.heygen.com/avatars/avatar-iv)
- [LightX AI Avatar Generator](https://www.lightxeditor.com/api/ai-avatar-generator/)

### Facial Feature Detection
- [face-api.js Documentation](https://justadudewhohacks.github.io/face-api.js/docs/index.html)
- [Google MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
- [AWS Rekognition Pricing](https://aws.amazon.com/rekognition/pricing/)

### Avatar Builder Systems
- [Ready Player Me Documentation](https://docs.readyplayer.me/)
- [DiceBear Avatar Library](https://www.dicebear.com/)
- [Bitmoji Developer Guide](https://developers.snap.com/lens-studio/features/bitmoji-avatar/overview)

### Privacy & Security
- [GDPR for Images](https://gdprlocal.com/gdpr-for-images/)
- [GDPR and Facial Recognition](https://www.gdpr-advisor.com/gdpr-and-facial-recognition-privacy-implications-and-legal-considerations/)
- [Supabase Storage Security](https://supabase.com/docs/guides/storage/security/access-control)

### Avatar Psychology & Engagement
- [Avatar Gamification Design](https://yukaichou.com/advanced-gamification/the-avatar-gamification-design-technique/)
- [Character.AI User Engagement](https://opinly.ai/blog/cai)
- [Factors Affecting Avatar Customization](https://www.mdpi.com/2079-9292/12/10/2286)

---

## 11. Conclusion

The recommended approach for TinyPM's hybrid user avatar system is:

1. **Use face-api.js for browser-based facial analysis** - Free, private, performant
2. **Build a component-based SVG avatar system** - Consistent style, easy customization
3. **Implement the Magic vs Science dual-eye concept** - Unique TinyPM identity
4. **Store only JSON configurations** - Maximum privacy, minimal storage
5. **Add gamification elements gradually** - Unlockables, achievements, seasonal content

This approach balances:
- **Privacy**: No photos leave the user's device
- **Cost**: Minimal ongoing expenses (~$5-45/month)
- **Quality**: Consistent TinyPM aesthetic
- **Performance**: Near-instant results
- **Engagement**: Customization creates ownership

The Builder can use this research to implement the feature with confidence that the technical approach is sound, cost-effective, and aligned with modern privacy expectations.

---

*Document prepared for TinyPM development team - February 2026*
