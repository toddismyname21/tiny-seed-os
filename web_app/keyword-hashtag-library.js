/**
 * Unified Keyword/Hashtag Library
 * Shared between Marketing Command Center and SEO Dashboard
 *
 * This module provides:
 * - SEO keywords organized by category
 * - Hashtag sets for social media
 * - Mapping between keywords and hashtags
 * - AI caption generation prompts
 * - Monthly content themes
 *
 * Usage:
 *   <script src="keyword-hashtag-library.js"></script>
 *   const library = KeywordHashtagLibrary;
 *   const hashtags = library.getHashtagsForKeyword('CSA pittsburgh');
 */

const KeywordHashtagLibrary = (function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION DATA (mirrors keyword_hashtag_library.json)
    // =========================================================================

    const seoKeywordCategories = {
        core_csa: {
            displayName: "Core CSA",
            icon: "fa-box-open",
            color: "#22c55e",
            priority: 1,
            keywords: [
                { keyword: "CSA pittsburgh", target: 1, searchVolume: "high", difficulty: "medium" },
                { keyword: "best CSA pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "farm share pittsburgh", target: 1, searchVolume: "medium", difficulty: "low" },
                { keyword: "pittsburgh CSA", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "community supported agriculture pittsburgh", target: 3, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["csa", "pittsburgh", "farmlife"]
        },
        farm: {
            displayName: "Farm",
            icon: "fa-tractor",
            color: "#16a34a",
            priority: 2,
            keywords: [
                { keyword: "farm pittsburgh", target: 1, searchVolume: "high", difficulty: "high" },
                { keyword: "organic farm pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "local farm pittsburgh", target: 1, searchVolume: "medium", difficulty: "low" },
                { keyword: "local produce pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" }
            ],
            mappedHashtagSets: ["farmlife", "organic", "pittsburgh"]
        },
        farmers_market: {
            displayName: "Farmers Market",
            icon: "fa-store",
            color: "#f4a261",
            priority: 2,
            keywords: [
                { keyword: "pittsburgh farmers market", target: 1, searchVolume: "high", difficulty: "high" },
                { keyword: "farmers market pittsburgh", target: 1, searchVolume: "high", difficulty: "high" },
                { keyword: "best farmers market pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "saturday farmers market pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "sewickley farmers market", target: 1, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["farmlife", "pittsburgh", "seasonal"]
        },
        farm_to_table: {
            displayName: "Farm to Table",
            icon: "fa-utensils",
            color: "#e76f51",
            priority: 3,
            keywords: [
                { keyword: "farm to table pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "pittsburgh farm to table", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "farm to table delivery pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "farm fresh pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" }
            ],
            mappedHashtagSets: ["farmlife", "pittsburgh", "organic"]
        },
        flowers: {
            displayName: "Flowers & Florals",
            icon: "fa-seedling",
            color: "#ec4899",
            priority: 2,
            keywords: [
                { keyword: "flower CSA pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "florist pittsburgh", target: 1, searchVolume: "high", difficulty: "high" },
                { keyword: "pittsburgh florals", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "local flowers pittsburgh", target: 1, searchVolume: "medium", difficulty: "low" },
                { keyword: "wedding florals pittsburgh", target: 1, searchVolume: "medium", difficulty: "high" },
                { keyword: "flower subscription pittsburgh", target: 1, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["flowers", "pittsburgh", "seasonal"]
        },
        mushrooms: {
            displayName: "Mushrooms",
            icon: "fa-leaf",
            color: "#8b5cf6",
            priority: 3,
            keywords: [
                { keyword: "pittsburgh mushrooms", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "local mushrooms pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "gourmet mushrooms pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "oyster mushrooms pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "lions mane pittsburgh", target: 1, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["mushrooms", "organic", "pittsburgh"]
        },
        delivery: {
            displayName: "Delivery",
            icon: "fa-truck",
            color: "#4361ee",
            priority: 2,
            keywords: [
                { keyword: "farm delivery pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "local produce delivery pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "vegetable delivery pittsburgh", target: 3, searchVolume: "medium", difficulty: "high" },
                { keyword: "organic delivery pittsburgh", target: 1, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["csa", "pittsburgh", "farmlife"]
        },
        pick_your_own: {
            displayName: "Pick Your Own",
            icon: "fa-hand-holding-heart",
            color: "#f59e0b",
            priority: 4,
            keywords: [
                { keyword: "pick your own pittsburgh", target: 1, searchVolume: "medium", difficulty: "medium" },
                { keyword: "pick your own flowers pittsburgh", target: 1, searchVolume: "low", difficulty: "low" },
                { keyword: "u-pick farm pittsburgh", target: 1, searchVolume: "low", difficulty: "low" }
            ],
            mappedHashtagSets: ["flowers", "farmlife", "seasonal"]
        }
    };

    const hashtagSets = {
        farmlife: {
            displayName: "Farm Life",
            icon: "fa-tractor",
            color: "#22c55e",
            description: "General farming and agriculture hashtags",
            hashtags: [
                "#FarmLife", "#FarmersOfInstagram", "#SmallFarm", "#OrganicFarming",
                "#FarmTok", "#ModernFarmer", "#SustainableFarming", "#FarmersMarket",
                "#GrowYourOwn", "#FromFarmToTable"
            ],
            relatedKeywords: ["farm", "farmers_market", "core_csa", "farm_to_table"]
        },
        pittsburgh: {
            displayName: "Pittsburgh Local",
            icon: "fa-city",
            color: "#ffd700",
            description: "Pittsburgh and local PA hashtags",
            hashtags: [
                "#Pittsburgh", "#PittsburghFood", "#EatPittsburgh", "#LocalPGH",
                "#PittsburghFoodie", "#SteelCity", "#PghEats", "#SupportLocalPGH",
                "#PittsburghLocal", "#412Food"
            ],
            relatedKeywords: ["all"]
        },
        csa: {
            displayName: "CSA & Farm Share",
            icon: "fa-box-open",
            color: "#2a9d8f",
            description: "Community Supported Agriculture specific",
            hashtags: [
                "#CSA", "#CommunitySupported", "#FarmShare", "#CSABox", "#WeeklyHarvest",
                "#FarmFresh", "#LocalFood", "#EatLocal", "#FarmToTable", "#FreshProduce"
            ],
            relatedKeywords: ["core_csa", "delivery"]
        },
        seasonal: {
            displayName: "Seasonal",
            icon: "fa-calendar-alt",
            color: "#e9c46a",
            description: "Seasonal eating and harvest hashtags",
            hashtags: [
                "#SeasonalEating", "#EatTheSeason", "#HarvestTime", "#FreshPicked",
                "#InSeason", "#SeasonalProduce", "#GardenFresh", "#JustHarvested"
            ],
            relatedKeywords: ["farmers_market", "flowers", "pick_your_own"],
            seasonalVariants: {
                spring: ["#SpringHarvest", "#SpringGarden", "#PlantingSeason"],
                summer: ["#SummerHarvest", "#SummerVeggies", "#PeakSeason"],
                fall: ["#FallHarvest", "#AutumnBounty", "#HarvestSeason"],
                winter: ["#WinterGarden", "#WinterGreens", "#SeasonExtension"]
            }
        },
        organic: {
            displayName: "Organic & Natural",
            icon: "fa-leaf",
            color: "#4ade80",
            description: "Organic certification and clean eating",
            hashtags: [
                "#Organic", "#OrganicFood", "#OrganicProduce", "#USDA", "#Certified",
                "#CleanEating", "#NoGMO", "#ChemicalFree", "#NaturalFood", "#HealthyEating"
            ],
            relatedKeywords: ["farm", "mushrooms", "farm_to_table"]
        },
        flowers: {
            displayName: "Flowers & Florals",
            icon: "fa-seedling",
            color: "#ec4899",
            description: "Flower farming and floral design",
            hashtags: [
                "#FlowersOfInstagram", "#FlowerFarmer", "#LocallyGrownFlowers", "#SlowFlowers",
                "#FlowerCSA", "#SeasonalFlowers", "#FarmFlowers", "#FieldToVase",
                "#FloralDesign", "#CutFlowers"
            ],
            relatedKeywords: ["flowers", "pick_your_own"],
            seasonalVariants: {
                spring: ["#SpringBlooms", "#Tulips", "#Daffodils", "#Peonies"],
                summer: ["#SummerFlowers", "#Dahlias", "#Zinnias", "#Sunflowers"],
                fall: ["#FallFlowers", "#Chrysanthemums", "#AutumnArrangements"],
                winter: ["#WinterGreens", "#HolidayFlorals", "#Evergreens"]
            }
        },
        mushrooms: {
            displayName: "Mushrooms & Fungi",
            icon: "fa-cloud",
            color: "#8b5cf6",
            description: "Gourmet and medicinal mushrooms",
            hashtags: [
                "#MushroomFarm", "#GourmetMushrooms", "#OysterMushrooms", "#LionsMane",
                "#Shiitake", "#FungiPerfecti", "#MushroomGrowing", "#UrbanMushrooms",
                "#MedicinalMushrooms", "#MyceliumMagic"
            ],
            relatedKeywords: ["mushrooms"]
        },
        wellness: {
            displayName: "Health & Wellness",
            icon: "fa-heart",
            color: "#ef4444",
            description: "Health-focused food and nutrition",
            hashtags: [
                "#HealthyEating", "#PlantBased", "#WholeFoods", "#NutrientDense",
                "#FoodIsMedicine", "#EatClean", "#FarmToFork", "#RealFood",
                "#FreshFood", "#NourishYourBody"
            ],
            relatedKeywords: ["organic", "core_csa", "mushrooms"]
        },
        engagement: {
            displayName: "Engagement Boosters",
            icon: "fa-fire",
            color: "#f97316",
            description: "High-engagement hashtags for reach",
            hashtags: [
                "#SupportSmallBusiness", "#ShopLocal", "#SmallBusiness", "#LocalLove",
                "#CommunityFirst", "#FamilyFarm", "#KnowYourFarmer", "#MeetYourFarmer"
            ],
            relatedKeywords: ["all"]
        }
    };

    const keywordToHashtagMapping = {
        "CSA pittsburgh": ["csa", "pittsburgh", "farmlife"],
        "best CSA pittsburgh": ["csa", "pittsburgh", "engagement"],
        "farm share pittsburgh": ["csa", "pittsburgh", "farmlife"],
        "organic farm pittsburgh": ["organic", "farmlife", "pittsburgh"],
        "pittsburgh farmers market": ["farmlife", "pittsburgh", "seasonal"],
        "farm to table pittsburgh": ["farmlife", "pittsburgh", "wellness"],
        "flower CSA pittsburgh": ["flowers", "csa", "pittsburgh"],
        "florist pittsburgh": ["flowers", "pittsburgh", "engagement"],
        "pittsburgh mushrooms": ["mushrooms", "pittsburgh", "wellness"],
        "farm delivery pittsburgh": ["csa", "pittsburgh", "engagement"],
        "pick your own pittsburgh": ["seasonal", "flowers", "farmlife"]
    };

    const aiCaptionPrompts = {
        core_csa: {
            keywords: ["CSA", "farm share", "weekly box", "community supported agriculture"],
            toneGuidance: "Emphasize community connection, seasonal variety, and supporting local",
            callToAction: "Join our CSA | Sign up for farm share | Reserve your spot",
            samplePhrases: [
                "Your weekly farm-fresh delivery",
                "Straight from our fields to your table",
                "Community supported, locally grown"
            ]
        },
        farm: {
            keywords: ["organic", "sustainable", "family farm", "local"],
            toneGuidance: "Focus on farming practices, land stewardship, and behind-the-scenes",
            callToAction: "Visit the farm | Shop local | Support family farms",
            samplePhrases: [
                "From our family farm to yours",
                "Grown with care in Pittsburgh",
                "Sustainable farming in action"
            ]
        },
        flowers: {
            keywords: ["seasonal blooms", "locally grown flowers", "field to vase"],
            toneGuidance: "Romantic, artistic, emphasize seasonality and local sourcing",
            callToAction: "Order a bouquet | Subscribe to flower share | Book wedding flowers",
            samplePhrases: [
                "Fresh from the flower field",
                "Seasonal blooms, locally grown",
                "Field to vase beauty"
            ]
        },
        mushrooms: {
            keywords: ["gourmet mushrooms", "oyster", "lions mane", "locally grown fungi"],
            toneGuidance: "Educational, health-focused, emphasize unique varieties",
            callToAction: "Try our mushrooms | Add to your CSA | Visit at market",
            samplePhrases: [
                "Gourmet fungi, grown local",
                "Medicinal mushrooms from our farm",
                "Fresh-picked mushroom magic"
            ]
        },
        farmers_market: {
            keywords: ["farmers market", "fresh produce", "local vendors", "weekend market"],
            toneGuidance: "Community-focused, lively, highlight market experience",
            callToAction: "See you at market | Find us this Saturday | Shop fresh",
            samplePhrases: [
                "Find us at the market this weekend",
                "Fresh picks from the farm stand",
                "Market day is the best day"
            ]
        },
        delivery: {
            keywords: ["farm delivery", "doorstep delivery", "local delivery"],
            toneGuidance: "Convenience-focused, emphasize freshness and ease",
            callToAction: "Schedule delivery | Order now | Sign up for weekly delivery",
            samplePhrases: [
                "Farm fresh, delivered to your door",
                "Skip the store, get farm direct",
                "Your weekly harvest, delivered"
            ]
        }
    };

    const contentThemes = {
        january: { theme: "New Year, New CSA", focusKeywords: ["core_csa", "delivery"], focusHashtags: ["csa", "wellness", "engagement"] },
        february: { theme: "Valentine's Flowers", focusKeywords: ["flowers"], focusHashtags: ["flowers", "engagement"] },
        march: { theme: "Spring Planning", focusKeywords: ["core_csa", "farm"], focusHashtags: ["farmlife", "seasonal", "csa"] },
        april: { theme: "Earth Month", focusKeywords: ["farm", "organic"], focusHashtags: ["organic", "farmlife", "wellness"] },
        may: { theme: "Mother's Day & Spring Blooms", focusKeywords: ["flowers", "pick_your_own"], focusHashtags: ["flowers", "seasonal", "engagement"] },
        june: { theme: "Peak Season Launch", focusKeywords: ["farmers_market", "core_csa"], focusHashtags: ["farmlife", "seasonal", "pittsburgh"] },
        july: { theme: "Summer Abundance", focusKeywords: ["farm_to_table", "delivery"], focusHashtags: ["seasonal", "farmlife", "wellness"] },
        august: { theme: "Harvest Festival", focusKeywords: ["farmers_market", "pick_your_own"], focusHashtags: ["seasonal", "flowers", "farmlife"] },
        september: { theme: "Fall Transition", focusKeywords: ["core_csa", "mushrooms"], focusHashtags: ["seasonal", "mushrooms", "csa"] },
        october: { theme: "Autumn Harvest", focusKeywords: ["farm", "pick_your_own"], focusHashtags: ["seasonal", "farmlife", "pittsburgh"] },
        november: { theme: "Thanksgiving & Gratitude", focusKeywords: ["farm_to_table", "core_csa"], focusHashtags: ["engagement", "farmlife", "pittsburgh"] },
        december: { theme: "Holiday & Winter Planning", focusKeywords: ["flowers", "mushrooms"], focusHashtags: ["flowers", "engagement", "wellness"] }
    };

    // =========================================================================
    // PUBLIC API METHODS
    // =========================================================================

    /**
     * Get all SEO keyword categories
     * @returns {Object} All keyword categories with their keywords
     */
    function getKeywordCategories() {
        return seoKeywordCategories;
    }

    /**
     * Get all hashtag sets
     * @returns {Object} All hashtag sets with their hashtags
     */
    function getHashtagSets() {
        return hashtagSets;
    }

    /**
     * Get a specific hashtag set by name
     * @param {string} setName - Name of the hashtag set
     * @returns {Object|null} The hashtag set or null if not found
     */
    function getHashtagSet(setName) {
        return hashtagSets[setName] || null;
    }

    /**
     * Get hashtags for a specific SEO keyword
     * @param {string} keyword - The SEO keyword
     * @returns {string[]} Array of hashtags for content creation
     */
    function getHashtagsForKeyword(keyword) {
        const mapping = keywordToHashtagMapping[keyword];
        if (!mapping) {
            // Try to find the keyword in categories and use mapped sets
            for (const [catKey, category] of Object.entries(seoKeywordCategories)) {
                const found = category.keywords.find(k => k.keyword === keyword);
                if (found) {
                    return combineHashtagSets(category.mappedHashtagSets);
                }
            }
            return [];
        }
        return combineHashtagSets(mapping);
    }

    /**
     * Combine multiple hashtag sets into a single array
     * @param {string[]} setNames - Array of hashtag set names
     * @returns {string[]} Combined hashtags (deduplicated)
     */
    function combineHashtagSets(setNames) {
        const combined = new Set();
        setNames.forEach(setName => {
            const set = hashtagSets[setName];
            if (set && set.hashtags) {
                set.hashtags.forEach(tag => combined.add(tag));
            }
        });
        return Array.from(combined);
    }

    /**
     * Get hashtags for a keyword category
     * @param {string} categoryKey - Category key (e.g., 'core_csa')
     * @returns {string[]} Array of hashtags
     */
    function getHashtagsForCategory(categoryKey) {
        const category = seoKeywordCategories[categoryKey];
        if (!category) return [];
        return combineHashtagSets(category.mappedHashtagSets);
    }

    /**
     * Get AI caption prompts for a keyword category
     * @param {string} categoryKey - Category key
     * @returns {Object|null} AI prompt configuration
     */
    function getAICaptionPrompt(categoryKey) {
        return aiCaptionPrompts[categoryKey] || null;
    }

    /**
     * Get all keywords flattened into a single array (for SEO dashboard compatibility)
     * @returns {Array} Array of keyword objects with keyword and target
     */
    function getAllKeywordsFlat() {
        const keywords = [];
        Object.values(seoKeywordCategories).forEach(category => {
            category.keywords.forEach(kw => {
                keywords.push(kw);
            });
        });
        return keywords;
    }

    /**
     * Get content theme for a specific month
     * @param {string} month - Month name (lowercase)
     * @returns {Object|null} Content theme configuration
     */
    function getContentTheme(month) {
        return contentThemes[month.toLowerCase()] || null;
    }

    /**
     * Get current month's content theme
     * @returns {Object} Current month's theme
     */
    function getCurrentContentTheme() {
        const months = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
        const currentMonth = months[new Date().getMonth()];
        return contentThemes[currentMonth];
    }

    /**
     * Get seasonal hashtag variants for a set
     * @param {string} setName - Hashtag set name
     * @param {string} season - Season name (spring, summer, fall, winter)
     * @returns {string[]} Seasonal hashtag variants
     */
    function getSeasonalHashtags(setName, season) {
        const set = hashtagSets[setName];
        if (!set || !set.seasonalVariants) return [];
        return set.seasonalVariants[season] || [];
    }

    /**
     * Get current season
     * @returns {string} Current season name
     */
    function getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    /**
     * Build optimized hashtag string for a post
     * @param {string} keywordCategory - Keyword category key
     * @param {Object} options - Options for hashtag selection
     * @param {number} options.maxHashtags - Maximum number of hashtags (default 5 per Instagram best practice)
     * @param {boolean} options.includeSeasonal - Include seasonal variants
     * @param {boolean} options.includePittsburgh - Always include Pittsburgh hashtags
     * @returns {string} Formatted hashtag string
     */
    function buildHashtagString(keywordCategory, options = {}) {
        const { maxHashtags = 5, includeSeasonal = true, includePittsburgh = true } = options;

        const category = seoKeywordCategories[keywordCategory];
        if (!category) return '';

        const hashtags = new Set();

        // Add mapped hashtags
        category.mappedHashtagSets.forEach(setName => {
            const set = hashtagSets[setName];
            if (set) {
                // Add first 2 from each set
                set.hashtags.slice(0, 2).forEach(tag => hashtags.add(tag));
            }
        });

        // Add seasonal if requested
        if (includeSeasonal) {
            const season = getCurrentSeason();
            category.mappedHashtagSets.forEach(setName => {
                const seasonalTags = getSeasonalHashtags(setName, season);
                if (seasonalTags.length > 0) {
                    hashtags.add(seasonalTags[0]);
                }
            });
        }

        // Always include Pittsburgh if requested
        if (includePittsburgh && hashtagSets.pittsburgh) {
            hashtags.add(hashtagSets.pittsburgh.hashtags[0]); // #Pittsburgh
        }

        // Convert to array and limit
        const hashtagArray = Array.from(hashtags).slice(0, maxHashtags);
        return hashtagArray.join(' ');
    }

    /**
     * Find keyword category for a given SEO keyword
     * @param {string} keyword - The keyword to search for
     * @returns {string|null} Category key or null
     */
    function findCategoryForKeyword(keyword) {
        for (const [catKey, category] of Object.entries(seoKeywordCategories)) {
            const found = category.keywords.find(k =>
                k.keyword.toLowerCase() === keyword.toLowerCase()
            );
            if (found) return catKey;
        }
        return null;
    }

    /**
     * Track hashtag usage for SEO correlation
     * @param {string[]} hashtagsUsed - Hashtags used in the post
     * @returns {string[]} Related SEO keywords to track
     */
    function getRelatedSEOKeywords(hashtagsUsed) {
        const relatedKeywords = new Set();

        // Normalize hashtags to lowercase
        const normalizedTags = hashtagsUsed.map(t => t.toLowerCase().replace('#', ''));

        // Check each hashtag set to see if any hashtags match
        Object.entries(hashtagSets).forEach(([setName, set]) => {
            const setTags = set.hashtags.map(t => t.toLowerCase().replace('#', ''));
            const hasMatch = normalizedTags.some(tag => setTags.includes(tag));

            if (hasMatch && set.relatedKeywords) {
                if (set.relatedKeywords.includes('all')) {
                    // Add all keywords
                    Object.keys(seoKeywordCategories).forEach(cat => relatedKeywords.add(cat));
                } else {
                    set.relatedKeywords.forEach(kw => relatedKeywords.add(kw));
                }
            }
        });

        // Expand category keys to actual keyword strings
        const expandedKeywords = [];
        relatedKeywords.forEach(catKey => {
            const category = seoKeywordCategories[catKey];
            if (category) {
                category.keywords.forEach(kw => expandedKeywords.push(kw.keyword));
            }
        });

        return expandedKeywords;
    }

    /**
     * Generate AI caption with SEO keywords
     * @param {string} categoryKey - Keyword category
     * @param {string} baseCaption - User's initial caption
     * @returns {Object} Enhanced caption data
     */
    function enhanceCaptionWithSEO(categoryKey, baseCaption) {
        const prompt = aiCaptionPrompts[categoryKey];
        const hashtags = buildHashtagString(categoryKey);

        return {
            originalCaption: baseCaption,
            suggestedKeywords: prompt ? prompt.keywords : [],
            suggestedCallToAction: prompt ? prompt.callToAction : '',
            samplePhrases: prompt ? prompt.samplePhrases : [],
            toneGuidance: prompt ? prompt.toneGuidance : '',
            recommendedHashtags: hashtags,
            fullCaption: baseCaption + '\n\n' + hashtags
        };
    }

    // =========================================================================
    // UI HELPER METHODS
    // =========================================================================

    /**
     * Render hashtag set buttons HTML
     * @param {Function} onClickHandler - Click handler function name as string
     * @returns {string} HTML string for hashtag set buttons
     */
    function renderHashtagSetButtons(onClickHandler = 'addHashtagSet') {
        let html = '';
        Object.entries(hashtagSets).forEach(([setName, set]) => {
            html += `
                <button class="hashtag-set-btn" onclick="${onClickHandler}('${setName}')"
                        title="${set.description}" style="border-color: ${set.color}; color: ${set.color};">
                    <i class="fas ${set.icon}"></i> ${set.displayName}
                </button>
            `;
        });
        return html;
    }

    /**
     * Render keyword category grid HTML for SEO dashboard
     * @param {Object} rankingData - Current ranking data for each keyword
     * @returns {string} HTML string for category grid
     */
    function renderKeywordCategoryGrid(rankingData = {}) {
        let html = '';
        Object.entries(seoKeywordCategories).forEach(([catKey, category]) => {
            const keywords = category.keywords;
            let ranked = 0, top3 = 0, top10 = 0;

            keywords.forEach(kw => {
                const data = rankingData[kw.keyword];
                if (data && data.currentRank) {
                    ranked++;
                    if (data.currentRank <= 3) top3++;
                    else if (data.currentRank <= 10) top10++;
                }
            });

            const score = Math.round(((top3 * 100) + (top10 * 50)) / keywords.length);
            const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

            html += `
                <div class="category-tile" style="border-left: 4px solid ${category.color};">
                    <h4><i class="fas ${category.icon}" style="color: ${category.color};"></i> ${category.displayName}</h4>
                    <div class="category-stats">
                        <div class="category-stat">
                            <div class="value" style="color: var(--success);">${top3}</div>
                            <div class="label">Top 3</div>
                        </div>
                        <div class="category-stat">
                            <div class="value" style="color: var(--warning);">${top10}</div>
                            <div class="label">Top 10</div>
                        </div>
                        <div class="category-stat">
                            <div class="value">${keywords.length}</div>
                            <div class="label">Total</div>
                        </div>
                    </div>
                    <div class="category-progress">
                        <div class="category-progress-fill" style="width: ${score}%; background: ${color};"></div>
                    </div>
                </div>
            `;
        });
        return html;
    }

    // =========================================================================
    // EXPORT PUBLIC API
    // =========================================================================

    return {
        // Data accessors
        getKeywordCategories,
        getHashtagSets,
        getHashtagSet,
        getAllKeywordsFlat,

        // Keyword-Hashtag mapping
        getHashtagsForKeyword,
        getHashtagsForCategory,
        combineHashtagSets,
        findCategoryForKeyword,

        // AI Caption support
        getAICaptionPrompt,
        enhanceCaptionWithSEO,

        // Content themes
        getContentTheme,
        getCurrentContentTheme,

        // Seasonal support
        getSeasonalHashtags,
        getCurrentSeason,

        // Utilities
        buildHashtagString,
        getRelatedSEOKeywords,

        // UI helpers
        renderHashtagSetButtons,
        renderKeywordCategoryGrid,

        // Version info
        version: '1.0.0'
    };

})();

// Make available globally if not using modules
if (typeof window !== 'undefined') {
    window.KeywordHashtagLibrary = KeywordHashtagLibrary;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordHashtagLibrary;
}
