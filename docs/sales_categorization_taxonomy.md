# Tiny Seed Farm Sales Categorization Taxonomy

## AI Parser Reference Document
**Version:** 1.0
**Last Updated:** 2026-02-07
**Purpose:** Enable intelligent classification of any product name or transaction into the correct revenue category

---

## Overview

This document defines the comprehensive taxonomy for categorizing Tiny Seed Farm's revenue streams. The AI parser should use these rules in order of specificity (most specific match wins) with fuzzy matching for variations.

---

## Category Hierarchy

```
Revenue
├── CSA_SUBSCRIPTIONS (Community Supported Agriculture)
│   ├── Vegetable Shares
│   │   ├── Summer CSA
│   │   ├── Fall CSA
│   │   ├── Spring CSA
│   │   └── Thanksgiving CSA
│   └── Size Variants
│       ├── Full/Family/Friends & Family (Large)
│       ├── Half/Regular/Standard
│       ├── Small/Single/Petite
│       └── Flex
│
├── FLOWER_SUBSCRIPTIONS
│   ├── Standard Weekly Bouquets
│   ├── Full Bloom (Premium)
│   ├── Petite Bloom (Small)
│   └── Dahlia CSA (Specialty)
│
├── PARTNER_ADDONS (Resold Products)
│   ├── Mushrooms
│   ├── Bread
│   ├── Cheese (Goat Rodeo)
│   ├── Coffee (Redhawk)
│   ├── Eggs
│   └── Honey
│
├── FARMERS_MARKET
│   ├── Vegetables
│   ├── Flowers
│   ├── Herbs
│   └── Prepared Items
│
├── WHOLESALE_RESTAURANT
│   ├── Restaurant Sales
│   ├── Bulk Orders
│   └── Chef Accounts
│
└── DIRECT_SALES
    ├── Farm Stand
    ├── Online Orders
    └── Pickup/Delivery
```

---

## 1. CSA SUBSCRIPTIONS

### Primary Keywords (MUST contain at least one)
```python
CSA_PRIMARY_KEYWORDS = [
    'csa', 'share', 'subscription', 'veggie share', 'vegetable share',
    'farm share', 'produce share', 'community supported'
]
```

### Season Detection
```python
SEASON_PATTERNS = {
    'summer': ['summer', 'smr'],
    'fall': ['fall', 'autumn', 'thanksgiving'],
    'spring': ['spring', 'spr'],
    'winter': ['winter', 'holiday']
}
```

### Size Detection (Priority Order - first match wins)
```python
SIZE_PATTERNS = {
    'family': ['family', 'friends and family', 'f&f', 'large', 'full'],
    'half': ['half', 'medium', 'regular', 'standard', 'couple'],
    'small': ['small', 'single', 'petite', 'mini'],
    'flex': ['flex']
}
```

### Frequency Detection
```python
FREQUENCY_PATTERNS = {
    'weekly': ['weekly', 'every week', 'each week'],
    'biweekly': ['biweekly', 'bi-weekly', 'every other', 'alternate', 'eow']
}
```

### Delivery Type Detection
```python
DELIVERY_PATTERNS = {
    'home_delivery': ['home delivery', 'delivery', 'delivered'],
    'pickup': ['pickup', 'pick up', 'pick-up']
}
```

### Real Product Name Examples (from Shopify)
```
"2023 Tiny Seed Farm CSA" → CSA_SUBSCRIPTION.VEGETABLE
"2024 Tiny Seed Farm Summer CSA" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER
"2025 Fall CSA" → CSA_SUBSCRIPTION.VEGETABLE.FALL
"2025 Spring CSA (LIMITED EDITION)" → CSA_SUBSCRIPTION.VEGETABLE.SPRING
"2026 Friends and Family Summer CSA Share (BIWEEKLY)" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.FAMILY.BIWEEKLY
"2026 Friends and Family Summer CSA Share (WEEKLY)" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.FAMILY.WEEKLY
"2026 Small Summer CSA Share (BIWEEKLY)" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.SMALL.BIWEEKLY
"2026 Small Summer CSA Share (WEEKLY)" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.SMALL.WEEKLY
"2026 Flex CSA Share" → CSA_SUBSCRIPTION.VEGETABLE.FLEX
"2026 SPRING CSA SHARE (LIMITED QUANTITIES)" → CSA_SUBSCRIPTION.VEGETABLE.SPRING
"2025 Weekly Large Summer Veggie Share--Late Start" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.FAMILY.WEEKLY
"2025 Small Summer Veggie Share (WEEKLY HOME DELIVERY)" → CSA_SUBSCRIPTION.VEGETABLE.SUMMER.SMALL.WEEKLY.HOME_DELIVERY
```

### Classification Logic (Python-style pseudocode)
```python
def classify_csa(product_name):
    name_lower = product_name.lower()

    # Check if it's a CSA product
    if not any(kw in name_lower for kw in CSA_PRIMARY_KEYWORDS):
        return None

    # Check if it's flowers (handle separately)
    if any(kw in name_lower for kw in ['flower', 'floral', 'fleurs', 'bouquet', 'dahlia', 'bloom']):
        return classify_flower_subscription(product_name)

    # Check if it's an add-on (handle separately)
    if any(kw in name_lower for kw in ['add-on', 'addon', 'mushroom', 'bread', 'cheese', 'coffee']):
        return classify_partner_addon(product_name)

    result = {
        'category': 'CSA_SUBSCRIPTION',
        'subcategory': 'VEGETABLE',
        'season': detect_season(name_lower),
        'size': detect_size(name_lower),
        'frequency': detect_frequency(name_lower),
        'delivery_type': detect_delivery(name_lower),
        'year': extract_year(product_name)
    }

    return result
```

---

## 2. FLOWER SUBSCRIPTIONS

### Primary Keywords
```python
FLOWER_PRIMARY_KEYWORDS = [
    'flower', 'floral', 'fleurs', 'bouquet', 'bloom', 'dahlia'
]
```

### Type Detection
```python
FLOWER_TYPE_PATTERNS = {
    'full_bloom': ['full bloom', 'fullbloom', 'premium'],
    'petite_bloom': ['petite bloom', 'petite', 'petit'],
    'standard': ['standard', 'regular', 'weekly bouquet'],
    'dahlia': ['dahlia']
}
```

### Real Product Name Examples
```
"2024 Spring Flower Subscription" → FLOWER_SUBSCRIPTION.STANDARD.SPRING
"2024 Dahlia CSA Share" → FLOWER_SUBSCRIPTION.DAHLIA
"2024 Tiny Seed Fleurs Bouquet CSA" → FLOWER_SUBSCRIPTION.STANDARD
"2025 Tiny Seed Fleurs Full Bloom Bouquet Share (WEEKLY HOME DELIVERY)" → FLOWER_SUBSCRIPTION.FULL_BLOOM.WEEKLY.HOME_DELIVERY
"2025 Tiny Seed Fleurs Petite Bloom Bouquet Share (BIWEEKLY)" → FLOWER_SUBSCRIPTION.PETITE_BLOOM.BIWEEKLY
"2026 Tiny Seed Fleurs Full Bloom Bouquet Share (BIWEEKLY)" → FLOWER_SUBSCRIPTION.FULL_BLOOM.BIWEEKLY
"2026 Tiny Seed Fleurs Petite Bloom Bouquet Share (WEEKLY)" → FLOWER_SUBSCRIPTION.PETITE_BLOOM.WEEKLY
"2025 Spring Flower Subscription (WEEKLY HOME DELIVERY)" → FLOWER_SUBSCRIPTION.STANDARD.SPRING.WEEKLY.HOME_DELIVERY
```

### Classification Logic
```python
def classify_flower_subscription(product_name):
    name_lower = product_name.lower()

    if not any(kw in name_lower for kw in FLOWER_PRIMARY_KEYWORDS):
        return None

    result = {
        'category': 'FLOWER_SUBSCRIPTION',
        'type': detect_flower_type(name_lower),
        'season': detect_season(name_lower),
        'frequency': detect_frequency(name_lower),
        'delivery_type': detect_delivery(name_lower),
        'year': extract_year(product_name)
    }

    return result
```

---

## 3. PARTNER ADD-ONS

### Primary Keywords (Each partner has specific identifiers)
```python
PARTNER_ADDON_PATTERNS = {
    'mushroom': {
        'keywords': ['mushroom', 'shroom'],
        'partner': 'Local Mushroom Grower',
        'category': 'PARTNER_ADDON.MUSHROOM'
    },
    'bread': {
        'keywords': ['bread', 'loaf', 'bakery'],
        'partner': 'Local Bakery',
        'category': 'PARTNER_ADDON.BREAD'
    },
    'cheese': {
        'keywords': ['cheese', 'goat rodeo', 'dairy'],
        'partner': 'Goat Rodeo',
        'category': 'PARTNER_ADDON.CHEESE'
    },
    'coffee': {
        'keywords': ['coffee', 'redhawk'],
        'partner': 'Redhawk Coffee',
        'category': 'PARTNER_ADDON.COFFEE'
    },
    'eggs': {
        'keywords': ['egg', 'dozen'],
        'partner': 'Local Farm',
        'category': 'PARTNER_ADDON.EGGS'
    },
    'honey': {
        'keywords': ['honey', 'bee', 'apiary'],
        'partner': 'Local Apiary',
        'category': 'PARTNER_ADDON.HONEY'
    }
}
```

### Real Product Name Examples
```
"2024 CSA Add-ons (FLOWERS, MUSHROOMS, BREAD, CHEESE, COFFEE)" → PARTNER_ADDON.MIXED
"2026 LOCAL BREAD CSA ADD ON (BIWEEKLY)" → PARTNER_ADDON.BREAD.BIWEEKLY
"2026 LOCAL BREAD CSA ADD ON (WEEKLY)" → PARTNER_ADDON.BREAD.WEEKLY
"2026 LOCAL CHEESE CSA ADD ON (BIWEEKLY)" → PARTNER_ADDON.CHEESE.BIWEEKLY
"2026 LOCAL CHEESE CSA ADD ON (WEEKLY)" → PARTNER_ADDON.CHEESE.WEEKLY
"2026 LOCAL REDHAWK COFFEE CSA ADD ON (BIWEEKLY)" → PARTNER_ADDON.COFFEE.BIWEEKLY
"2026 LOCAL REDHAWK COFFEE CSA ADD ON (WEEKLY)" → PARTNER_ADDON.COFFEE.WEEKLY
"2026 MUSHROOM CSA ADD ON (BIWEEKLY)" → PARTNER_ADDON.MUSHROOM.BIWEEKLY
"2026 MUSHROOM CSA ADD ON (WEEKLY)" → PARTNER_ADDON.MUSHROOM.WEEKLY
"Copy of CSA Add-ons (BREAD, MUSHROOMS, CHEESE, FLOWERS)" → PARTNER_ADDON.MIXED
```

### Classification Logic
```python
def classify_partner_addon(product_name):
    name_lower = product_name.lower()

    # Check for add-on indicator
    addon_indicators = ['add-on', 'addon', 'add on']
    is_addon = any(ind in name_lower for ind in addon_indicators)

    # Identify the partner/product type
    for addon_type, config in PARTNER_ADDON_PATTERNS.items():
        if any(kw in name_lower for kw in config['keywords']):
            return {
                'category': 'PARTNER_ADDON',
                'subcategory': addon_type.upper(),
                'partner': config['partner'],
                'frequency': detect_frequency(name_lower),
                'year': extract_year(product_name)
            }

    # Check for mixed add-on products
    if is_addon and sum(1 for p in PARTNER_ADDON_PATTERNS.values()
                        if any(kw in name_lower for kw in p['keywords'])) > 1:
        return {
            'category': 'PARTNER_ADDON',
            'subcategory': 'MIXED',
            'year': extract_year(product_name)
        }

    return None
```

---

## 4. FARMERS MARKET SALES

### Market Location Detection
```python
MARKET_LOCATIONS = {
    'lawrenceville': {
        'keywords': ['lawrenceville', 'lawv', 'lville'],
        'day': 'Tuesday',
        'type': 'farmers_market'
    },
    'sewickley': {
        'keywords': ['sewickley', 'swick'],
        'day': 'Saturday',
        'type': 'farmers_market'
    },
    'bloomfield': {
        'keywords': ['bloomfield', 'bloom'],
        'day': 'Saturday',
        'type': 'farmers_market'
    },
    'squirrel_hill': {
        'keywords': ['squirrel hill', 'squirrel', 'sq hill'],
        'day': 'Sunday',
        'type': 'farmers_market'
    },
    'highland_park': {
        'keywords': ['highland park', 'highland', 'bryant'],
        'day': 'Saturday',
        'type': 'farmers_market'
    }
}
```

### Product Category Detection for Market Sales
```python
MARKET_PRODUCT_CATEGORIES = {
    'vegetable': {
        'keywords': ['tomato', 'pepper', 'cucumber', 'squash', 'zucchini',
                     'lettuce', 'kale', 'spinach', 'chard', 'carrot',
                     'beet', 'radish', 'turnip', 'cabbage', 'broccoli',
                     'cauliflower', 'onion', 'garlic', 'potato', 'corn',
                     'beans', 'peas', 'eggplant', 'celery', 'bok choy',
                     'arugula', 'salad', 'greens', 'veg']
    },
    'leafy_greens': {
        'keywords': ['lettuce', 'kale', 'spinach', 'chard', 'arugula',
                     'collards', 'mustard greens', 'greens', 'salad mix']
    },
    'root_vegetables': {
        'keywords': ['carrot', 'beet', 'radish', 'turnip', 'potato',
                     'celeriac', 'parsnip', 'root']
    },
    'flower': {
        'keywords': ['flower', 'bouquet', 'sunflower', 'zinnia', 'dahlia',
                     'marigold', 'bloom', 'floral', 'wreath', 'dried']
    },
    'herb': {
        'keywords': ['basil', 'cilantro', 'parsley', 'dill', 'mint',
                     'oregano', 'thyme', 'rosemary', 'herb']
    },
    'prepared': {
        'keywords': ['jam', 'pickle', 'sauce', 'pesto', 'prepared',
                     'preserved', 'canned']
    },
    'seedlings': {
        'keywords': ['seedling', '4 pack', '4-pack', 'plant', 'starter',
                     'single pot']
    }
}
```

### Real Product Name Examples
```
"Tomatoes" → FARMERS_MARKET.VEGETABLE
"Cherry Tomatoes (Pound)" → FARMERS_MARKET.VEGETABLE
"Arugula" → FARMERS_MARKET.LEAFY_GREENS
"Carrots (Pound)" → FARMERS_MARKET.ROOT_VEGETABLES
"Bunched Greens-Curly Kale" → FARMERS_MARKET.LEAFY_GREENS
"Bouquet-Full Bloom" → FARMERS_MARKET.FLOWER
"Sunflowers" → FARMERS_MARKET.FLOWER
"Mixed Bouquet" → FARMERS_MARKET.FLOWER
"Bearded Wheat Wreath" → FARMERS_MARKET.FLOWER.DRIED
"Asymmetrical Amaranth Wreath" → FARMERS_MARKET.FLOWER.DRIED
"Basil (Ounce)" → FARMERS_MARKET.HERB
"Basil 4 Packs (Seedling)" → FARMERS_MARKET.SEEDLINGS
```

### POS/Market Session Detection
```python
def is_market_sale(transaction):
    """
    Detect if a transaction is from a farmers market based on:
    1. Source name is 'pos' (Shopify POS)
    2. Location ID matches known market locations
    3. Transaction date matches market schedule
    """
    indicators = [
        transaction.get('source_name') == 'pos',
        transaction.get('location_id') in MARKET_LOCATION_IDS,
        is_market_day(transaction.get('date'), transaction.get('location'))
    ]
    return any(indicators)
```

---

## 5. WHOLESALE/RESTAURANT SALES

### Wholesale Identifiers
```python
WHOLESALE_INDICATORS = {
    'customer_type': ['wholesale', 'restaurant', 'chef', 'commercial'],
    'payment_terms': ['net30', 'net 30', 'invoice', 'terms'],
    'order_size': ['bulk', 'case', 'wholesale'],
    'customer_tags': ['wholesale', 'restaurant', 'chef', 'business']
}
```

### Classification Logic
```python
def is_wholesale_sale(transaction, customer):
    """
    Wholesale sales identified by:
    1. Customer has wholesale/restaurant tags
    2. Order is bulk quantity
    3. Payment terms indicate business relationship
    """
    customer_type = customer.get('type', '').lower()
    tags = customer.get('tags', '').lower()

    return (
        customer_type in ['wholesale', 'restaurant'] or
        any(tag in tags for tag in WHOLESALE_INDICATORS['customer_tags']) or
        transaction.get('payment_terms') in ['Net 30', 'Invoice']
    )
```

---

## 6. DIRECT SALES

### Direct Sale Channels
```python
DIRECT_SALE_CHANNELS = {
    'farm_stand': ['farm stand', 'on-farm', 'onsite'],
    'online_order': ['web', 'online', 'website'],
    'pickup': ['pickup', 'pick up', 'will call'],
    'delivery': ['delivery', 'deliver', 'ship']
}
```

---

## Fuzzy Matching Strategies

### 1. Year Pattern Extraction
```python
import re

def extract_year(text):
    """Extract 4-digit year from product name"""
    match = re.search(r'\b(20\d{2})\b', text)
    if match:
        return int(match.group(1))
    return None
```

### 2. Normalized Comparison
```python
def normalize_product_name(name):
    """Normalize product name for consistent matching"""
    # Convert to lowercase
    name = name.lower()

    # Remove common noise words
    noise_words = ['tiny seed', 'farm', 'pittsburgh', 'local', 'fresh', 'generic', 'retail']
    for word in noise_words:
        name = name.replace(word, '')

    # Remove punctuation and extra whitespace
    name = re.sub(r'[^\w\s]', ' ', name)
    name = ' '.join(name.split())

    return name
```

### 3. Levenshtein Distance for Typos
```python
def fuzzy_keyword_match(text, keywords, threshold=0.8):
    """
    Match keywords with tolerance for typos.
    Uses Levenshtein distance with threshold.
    """
    from difflib import SequenceMatcher

    text_words = text.lower().split()
    for keyword in keywords:
        for word in text_words:
            ratio = SequenceMatcher(None, word, keyword.lower()).ratio()
            if ratio >= threshold:
                return True
    return False
```

### 4. Token-Based Matching
```python
def token_match_score(text, keywords):
    """
    Calculate match score based on token overlap.
    Useful for multi-word product names.
    """
    text_tokens = set(normalize_product_name(text).split())
    keyword_tokens = set()
    for kw in keywords:
        keyword_tokens.update(kw.lower().split())

    if not keyword_tokens:
        return 0.0

    intersection = text_tokens & keyword_tokens
    return len(intersection) / len(keyword_tokens)
```

---

## Complete Classification Pipeline

```python
def classify_sale(product_name, transaction=None, customer=None):
    """
    Master classification function that determines the category of any sale.

    Priority order:
    1. CSA Subscriptions (vegetable)
    2. Flower Subscriptions
    3. Partner Add-ons
    4. Wholesale/Restaurant
    5. Farmers Market
    6. Direct Sales
    """
    name_lower = product_name.lower()
    normalized = normalize_product_name(product_name)

    # Step 1: Check for CSA subscription indicators
    if any(kw in name_lower for kw in CSA_PRIMARY_KEYWORDS):
        # Check if it's flowers
        if any(kw in name_lower for kw in FLOWER_PRIMARY_KEYWORDS):
            return classify_flower_subscription(product_name)

        # Check if it's an add-on
        if any(kw in name_lower for kw in ['add-on', 'addon', 'add on']):
            return classify_partner_addon(product_name)

        # It's a vegetable CSA
        return classify_csa(product_name)

    # Step 2: Check for flower keywords without CSA
    if any(kw in name_lower for kw in FLOWER_PRIMARY_KEYWORDS):
        # Could be a flower subscription or market flower sale
        if any(kw in name_lower for kw in ['subscription', 'share', 'csa']):
            return classify_flower_subscription(product_name)
        else:
            # Individual flower sale (market or direct)
            return {
                'category': 'FARMERS_MARKET' if is_market_sale(transaction) else 'DIRECT_SALES',
                'subcategory': 'FLOWER',
                'product': extract_product_name(product_name)
            }

    # Step 3: Check for wholesale/restaurant
    if customer and is_wholesale_sale(transaction, customer):
        return {
            'category': 'WHOLESALE_RESTAURANT',
            'customer_type': customer.get('type'),
            'product': product_name
        }

    # Step 4: Check for market sale (POS transaction)
    if is_market_sale(transaction):
        return {
            'category': 'FARMERS_MARKET',
            'subcategory': detect_market_product_category(name_lower),
            'location': detect_market_location(transaction),
            'product': extract_product_name(product_name)
        }

    # Step 5: Default to direct sales
    return {
        'category': 'DIRECT_SALES',
        'subcategory': detect_market_product_category(name_lower),
        'product': extract_product_name(product_name)
    }
```

---

## Revenue Attribution Rules

### CSA Revenue Recognition
- **Full Payment at Signup**: Record entire subscription value at purchase date
- **Season Allocation**: Spread revenue across delivery weeks for cash flow analysis
- **Add-ons**: Attribute to partner product category, track margin separately

### Market Revenue Recognition
- **Daily Settlement**: Record all POS transactions daily
- **Cash vs Card**: Track payment method for reconciliation
- **Product Mix**: Categorize each line item separately

### Wholesale Revenue Recognition
- **Invoice Date**: Record revenue at invoice creation
- **Payment Terms**: Track AR by customer for Net 30 accounts
- **Bulk Pricing**: Apply wholesale discount rates

---

## Data Quality Rules

### Required Fields for Classification
```python
REQUIRED_FIELDS = {
    'product_name': 'Cannot be empty',
    'transaction_date': 'Must be valid date',
    'total_amount': 'Must be numeric >= 0'
}

RECOMMENDED_FIELDS = {
    'source_name': 'Helps identify sales channel',
    'customer_id': 'Required for wholesale attribution',
    'location_id': 'Required for market attribution'
}
```

### Validation Rules
```python
def validate_classification(result):
    """Ensure classification meets quality standards"""
    required_keys = ['category']

    if not result:
        return False, 'Classification returned None'

    if result['category'] not in VALID_CATEGORIES:
        return False, f"Invalid category: {result['category']}"

    return True, None
```

---

## Appendix: Complete Keyword Reference

### All Keywords by Category

```python
ALL_KEYWORDS = {
    'CSA_SUBSCRIPTION': {
        'primary': ['csa', 'share', 'subscription', 'veggie share', 'vegetable share',
                    'farm share', 'produce share', 'community supported'],
        'seasons': ['summer', 'fall', 'spring', 'winter', 'thanksgiving'],
        'sizes': ['full', 'half', 'small', 'single', 'family', 'flex',
                  'petite', 'large', 'couple', 'friends and family'],
        'frequency': ['weekly', 'biweekly', 'bi-weekly', 'monthly', 'every other']
    },

    'FLOWER_SUBSCRIPTION': {
        'primary': ['flower', 'floral', 'fleurs', 'bouquet', 'bloom', 'dahlia'],
        'types': ['full bloom', 'petite bloom', 'standard', 'dahlia', 'premium']
    },

    'PARTNER_ADDON': {
        'primary': ['add-on', 'addon', 'add on'],
        'mushroom': ['mushroom', 'shroom'],
        'bread': ['bread', 'loaf', 'bakery'],
        'cheese': ['cheese', 'goat rodeo', 'dairy'],
        'coffee': ['coffee', 'redhawk'],
        'eggs': ['egg', 'dozen'],
        'honey': ['honey', 'bee', 'apiary']
    },

    'FARMERS_MARKET': {
        'locations': ['lawrenceville', 'sewickley', 'bloomfield', 'squirrel hill',
                      'highland park', 'bryant street', 'north side'],
        'vegetables': ['tomato', 'pepper', 'cucumber', 'squash', 'zucchini',
                       'lettuce', 'kale', 'spinach', 'chard', 'carrot',
                       'beet', 'radish', 'turnip', 'cabbage', 'broccoli'],
        'herbs': ['basil', 'cilantro', 'parsley', 'dill', 'mint'],
        'flowers': ['sunflower', 'zinnia', 'dahlia', 'marigold', 'bouquet']
    },

    'WHOLESALE_RESTAURANT': {
        'identifiers': ['wholesale', 'restaurant', 'chef', 'commercial', 'bulk'],
        'payment': ['net30', 'invoice', 'terms']
    }
}
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-07 | Initial taxonomy based on Shopify product analysis |

---

## References

- Shopify product export: `/apps_script/seo_optimization_report.json`
- Existing parser: `/apps_script/ShopifySalesSync.js`
- CSA keywords: `CSA_PRODUCT_KEYWORDS` in ShopifySalesSync.js
- Add-on keywords: `ADDON_KEYWORDS` in ShopifySalesSync.js
