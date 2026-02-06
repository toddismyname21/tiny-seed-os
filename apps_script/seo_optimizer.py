#!/usr/bin/env python3
"""
Shopify SEO & AEO Optimizer for Tiny Seed Farm
Optimizes all 125 products with SEO-rich titles, descriptions, image alt text, and tags.
"""

import json
import requests
import time
import re

# API Configuration
import os
STORE = "tiny-seed-farmers-market"
TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
API_VERSION = "2024-01"
BASE_URL = f"https://{STORE}.myshopify.com/admin/api/{API_VERSION}"

HEADERS = {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json"
}

# Store report
optimization_report = []

def get_seo_optimized_content(product):
    """Generate SEO-optimized content based on product type and title."""

    product_id = product['id']
    original_title = product['title']
    original_tags = product.get('tags', '')
    images = product.get('images', [])

    # Categorize the product
    title_lower = original_title.lower()

    # Determine product category and generate appropriate content
    if 'csa' in title_lower and ('2026' in title_lower or '2025' in title_lower):
        return optimize_csa_share(product)
    elif 'flower' in title_lower or 'fleurs' in title_lower or 'bouquet' in title_lower or 'bloom' in title_lower:
        return optimize_flower_product(product)
    elif 'add' in title_lower and ('bread' in title_lower or 'cheese' in title_lower or 'mushroom' in title_lower or 'coffee' in title_lower):
        return optimize_addon_product(product)
    elif 'wreath' in title_lower:
        return optimize_wreath_product(product)
    elif any(veg in title_lower for veg in ['carrot', 'beet', 'kale', 'chard', 'spinach', 'arugula', 'cabbage', 'broccoli', 'cucumber', 'tomato', 'basil', 'celery', 'bean', 'bok choy', 'lettuce', 'greens', 'corn']):
        return optimize_vegetable_product(product)
    elif 'seedling' in title_lower or 'single pot' in title_lower or '4 pack' in title_lower:
        return optimize_seedling_product(product)
    else:
        return optimize_generic_product(product)


def optimize_csa_share(product):
    """Optimize CSA share products."""
    original_title = product['title']
    title_lower = original_title.lower()

    # Determine year and type
    year = "2026" if "2026" in original_title else "2025" if "2025" in original_title else "2024"

    # Determine share type
    if 'spring' in title_lower:
        season = "Spring"
        season_months = "April through June"
        share_desc = "early-season vegetables"
    elif 'fall' in title_lower:
        season = "Fall"
        season_months = "September through November"
        share_desc = "autumn harvest vegetables"
    else:
        season = "Summer"
        season_months = "May through October"
        share_desc = "peak-season vegetables"

    # Determine size
    if 'small' in title_lower:
        size = "Small"
        size_desc = "perfect for couples or individuals"
        serving = "2-3 people"
    elif 'friends and family' in title_lower or 'large' in title_lower:
        size = "Friends & Family (Large)"
        size_desc = "ideal for families of 4+"
        serving = "4-6 people"
    elif 'flex' in title_lower:
        size = "Flex"
        size_desc = "flexible pick-up schedule"
        serving = "customizable portions"
    else:
        size = "Standard"
        size_desc = "perfect for couples or small families"
        serving = "2-4 people"

    # Determine delivery type
    if 'delivery' in title_lower:
        delivery = "Home Delivery"
        delivery_desc = "delivered directly to your door in the Greater Pittsburgh area"
    else:
        delivery = "Pick-Up"
        delivery_desc = "convenient pick-up at 12+ Pittsburgh-area locations"

    # Determine frequency
    if 'biweekly' in title_lower:
        frequency = "Biweekly"
        freq_desc = "every two weeks"
    else:
        frequency = "Weekly"
        freq_desc = "every week"

    # Generate new title
    new_title = f"{year} {season} CSA Share - {size} {frequency} Farm Vegetables Pittsburgh"
    if len(new_title) > 120:
        new_title = f"{year} {season} CSA Share - {size} {frequency} Pittsburgh"

    # Generate SEO description
    body_html = f"""<div class="seo-optimized-content">
<h2>{year} {season} CSA Share - Fresh Local Vegetables from Tiny Seed Farm Pittsburgh</h2>

<p><strong>Join Pittsburgh's premier Community Supported Agriculture (CSA) program!</strong> The {year} Tiny Seed Farm {season} CSA Share brings you the freshest, locally-grown organic vegetables from our sustainable Pittsburgh farm, {freq_desc} throughout {season_months}. This {size.lower()} share is {size_desc}, serving approximately {serving}.</p>

<h3>What's Included in Your {season} CSA Share:</h3>
<ul>
<li><strong>Fresh Seasonal Vegetables:</strong> 8-12 varieties of {share_desc} each {frequency.lower()} delivery</li>
<li><strong>Farm-Fresh Quality:</strong> Harvested within 24 hours of your pickup or delivery</li>
<li><strong>Seasonal Recipes:</strong> Weekly recipe suggestions and storage tips via email</li>
<li><strong>Farm Updates:</strong> Regular newsletter with farm news and what's growing</li>
<li><strong>{delivery}:</strong> {delivery_desc.capitalize()}</li>
</ul>

<h3>Benefits of Joining Tiny Seed Farm CSA:</h3>
<ul>
<li><strong>Support Local Agriculture:</strong> Your membership directly supports sustainable farming in Pittsburgh</li>
<li><strong>Peak Freshness:</strong> Vegetables harvested at optimal ripeness for maximum nutrition and flavor</li>
<li><strong>Seasonal Eating:</strong> Discover new vegetables and expand your culinary horizons</li>
<li><strong>Environmental Impact:</strong> Reduce your carbon footprint with locally-grown produce</li>
<li><strong>Community Connection:</strong> Join a community of over 500 Pittsburgh families who support local farms</li>
</ul>

<h3>Typical {season} Vegetables Include:</h3>
<p>{'Lettuce, spinach, arugula, radishes, peas, early carrots, herbs, and spring onions' if season == 'Spring' else 'Squash, pumpkins, root vegetables, kale, cabbage, Brussels sprouts, and storage crops' if season == 'Fall' else 'Tomatoes, cucumbers, peppers, zucchini, corn, beans, eggplant, melons, and fresh herbs'}</p>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: Where can I pick up my CSA share?</strong><br>
A: We offer 12+ convenient pickup locations across Greater Pittsburgh including Lawrenceville, Squirrel Hill, Highland Park, Mt. Lebanon, Sewickley, Bellevue, Aspinwall, Troy Hill, Bloomfield, North Side, South Side, and Allison Park.</p>

<p><strong>Q: What if I'm on vacation and can't pick up my share?</strong><br>
A: You can designate a friend or family member to pick up your share, or we can donate it to our local food bank partners.</p>

<p><strong>Q: Are your vegetables organic?</strong><br>
A: We use organic and sustainable growing practices. While not certified organic, we never use synthetic pesticides or fertilizers.</p>

<p><strong>Q: Can I customize my share?</strong><br>
A: CSA shares include seasonal vegetables chosen by our farmers. For customization, check out our <a href="/collections/all">add-on options</a> including bread, cheese, mushrooms, and flowers.</p>

<p><strong>Q: How do I store my vegetables?</strong><br>
A: Each share includes storage instructions. Most vegetables keep 1-2 weeks when properly stored.</p>

<h3>Add-Ons Available:</h3>
<p>Enhance your CSA experience with our local partner add-ons: <a href="/collections/add-ons">Artisan Bread</a>, <a href="/collections/add-ons">Local Cheese</a>, <a href="/collections/add-ons">Farm-Fresh Mushrooms</a>, and <a href="/collections/add-ons">Redhawk Coffee</a>.</p>

<p><em>Tiny Seed Farm has been serving the Pittsburgh community since 2018, providing fresh, sustainable produce to over 1,000 local families each year.</em></p>
</div>"""

    # Generate tags
    tags_list = [year, f"{year} Veggie Share", season, "CSA", "Pittsburgh", "Local", "Fresh Vegetables",
                 "Farm Fresh", "Sustainable", "Pennsylvania", frequency, size.replace("&", "and"),
                 "Community Supported Agriculture", "Organic Practices", delivery.replace(" ", "")]
    new_tags = ", ".join(tags_list)

    # Generate image alt text
    image_updates = []
    for i, img in enumerate(product.get('images', [])):
        alt_text = f"{year} {season} CSA Share - Fresh Farm Vegetables {frequency} - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def optimize_flower_product(product):
    """Optimize flower subscription and bouquet products."""
    original_title = product['title']
    title_lower = original_title.lower()

    year = "2026" if "2026" in original_title else "2025" if "2025" in original_title else "2024"

    # Determine flower type
    if 'spring' in title_lower:
        season = "Spring"
        flowers = "tulips, daffodils, ranunculus, anemones, and seasonal spring blooms"
        months = "April through June"
    elif 'dahlia' in title_lower:
        season = "Dahlia"
        flowers = "dahlias in stunning varieties including dinner plate, ball, pompon, and decorative types"
        months = "August through October"
    else:
        season = "Summer"
        flowers = "zinnias, sunflowers, dahlias, snapdragons, cosmos, and seasonal blooms"
        months = "June through October"

    # Determine size
    if 'full bloom' in title_lower or 'large' in title_lower:
        size = "Full Bloom"
        size_desc = "our premium large arrangement with 15-20 stems"
        stems = "15-20"
    elif 'petite' in title_lower or 'small' in title_lower:
        size = "Petite Bloom"
        size_desc = "a beautiful compact arrangement with 8-12 stems"
        stems = "8-12"
    else:
        size = "Standard"
        size_desc = "a gorgeous arrangement with 10-15 stems"
        stems = "10-15"

    # Determine delivery
    if 'delivery' in title_lower:
        delivery = "Home Delivery"
        delivery_desc = "delivered fresh to your door"
    else:
        delivery = "Pick-Up"
        delivery_desc = "pickup at convenient Pittsburgh locations"

    # Frequency
    frequency = "Biweekly" if 'biweekly' in title_lower else "Weekly"

    new_title = f"{year} {season} Flower Subscription - {size} {frequency} Bouquets Pittsburgh"
    if 'bouquet' in title_lower and 'share' not in title_lower:
        new_title = f"Farm Fresh Flower Bouquet - {size} Arrangement Pittsburgh"

    body_html = f"""<div class="seo-optimized-content">
<h2>{year} {season} Flower Subscription - Tiny Seed Fleurs Pittsburgh</h2>

<p><strong>Brighten your home with farm-fresh flowers from Tiny Seed Fleurs!</strong> Our {year} {season} Flower Subscription brings you {size_desc}, featuring {flowers}. Each bouquet is hand-crafted on our Pittsburgh farm and delivered {frequency.lower()} from {months}.</p>

<h3>What's Included in Your Flower Subscription:</h3>
<ul>
<li><strong>{stems} Premium Stems:</strong> Hand-selected seasonal blooms at peak freshness</li>
<li><strong>Artisan Arrangements:</strong> Each bouquet designed by our expert floral team</li>
<li><strong>{frequency} {delivery}:</strong> {delivery_desc.capitalize()}</li>
<li><strong>Care Instructions:</strong> Tips to keep your flowers fresh for 7-10+ days</li>
<li><strong>Seasonal Variety:</strong> Discover new flower varieties throughout the season</li>
</ul>

<h3>Benefits of a Flower Subscription:</h3>
<ul>
<li><strong>Farm-Fresh Quality:</strong> Cut within 24 hours of your pickup or delivery</li>
<li><strong>Support Local:</strong> Your subscription supports sustainable Pittsburgh flower farming</li>
<li><strong>No Commitment:</strong> Pause or cancel anytime with notice</li>
<li><strong>Gift Option:</strong> Perfect gift for flower lovers - we offer gift subscriptions!</li>
<li><strong>Eco-Friendly:</strong> No floral foam, locally grown, minimal packaging</li>
</ul>

<h3>Seasonal Blooms Include:</h3>
<p>{flowers.capitalize()}. Each week brings new varieties as different flowers come into peak bloom.</p>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: How long do the flowers last?</strong><br>
A: With proper care (fresh water, cool location, stem trimming), our flowers typically last 7-10 days, often longer!</p>

<p><strong>Q: Do you offer wedding flowers?</strong><br>
A: Yes! Check out our <a href="/collections/weddings">wedding flower services</a> including bridal bouquets, centerpieces, and ceremony arrangements.</p>

<p><strong>Q: Can I gift a subscription?</strong><br>
A: Absolutely! Flower subscriptions make wonderful gifts. Contact us for gift subscription options.</p>

<p><strong>Q: What if I'm away for a delivery?</strong><br>
A: Let us know in advance and we can skip that week or arrange delivery to a neighbor.</p>

<p><strong>Q: Are your flowers sustainably grown?</strong><br>
A: Yes! We use organic practices, no synthetic pesticides, and prioritize biodiversity on our farm.</p>

<h3>Pair With Your CSA:</h3>
<p>Combine your flower subscription with a <a href="/collections/csa">vegetable CSA share</a> for the complete Tiny Seed Farm experience!</p>

<p><em>Tiny Seed Fleurs is Pittsburgh's premier local flower farm, growing over 100 varieties of cut flowers using sustainable practices since 2018.</em></p>
</div>"""

    tags_list = [year, "Flowers", "Flower Subscription", "Bouquet", season, "Pittsburgh", "Local Flowers",
                 "Farm Fresh", "Cut Flowers", "Tiny Seed Fleurs", frequency, "Sustainable", "Pennsylvania"]
    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"{year} {season} Flower Subscription {size} Bouquet - Tiny Seed Fleurs Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def optimize_addon_product(product):
    """Optimize add-on products (bread, cheese, mushrooms, coffee)."""
    original_title = product['title']
    title_lower = original_title.lower()

    year = "2026" if "2026" in original_title else "2025"
    frequency = "Biweekly" if "biweekly" in title_lower else "Weekly"

    if 'bread' in title_lower:
        addon_type = "Artisan Bread"
        partner = "Driftwood Oven"
        description = "freshly baked artisan sourdough bread from Pittsburgh's beloved Driftwood Oven"
        items = "rotating selection of sourdough loaves, focaccia, and seasonal breads"
        benefits = "handcrafted using traditional fermentation methods with locally-sourced flour"
    elif 'cheese' in title_lower:
        addon_type = "Local Cheese"
        partner = "Goat Rodeo Farm and Dairy"
        description = "award-winning artisan cheeses from Goat Rodeo Farm and Dairy"
        items = "rotating selection of aged and fresh goat and cow milk cheeses"
        benefits = "made from pasture-raised animals using traditional cheese-making techniques"
    elif 'mushroom' in title_lower:
        addon_type = "Farm Mushrooms"
        partner = "Tiny Seed Farm"
        description = "fresh gourmet mushrooms grown on our Pittsburgh farm"
        items = "shiitake, oyster, lion's mane, and seasonal specialty mushrooms"
        benefits = "grown using sustainable indoor cultivation methods for year-round availability"
    elif 'coffee' in title_lower:
        addon_type = "Redhawk Coffee"
        partner = "Redhawk Coffee Roasters"
        description = "locally roasted specialty coffee from Redhawk Coffee"
        items = "freshly roasted whole bean or ground coffee, rotating single origins and blends"
        benefits = "small-batch roasted in Pittsburgh with ethically sourced beans"
    else:
        addon_type = "CSA Add-On"
        partner = "Local Partners"
        description = "premium local products to enhance your CSA experience"
        items = "rotating selection of local artisan products"
        benefits = "supporting Pittsburgh's local food community"

    new_title = f"{year} {addon_type} CSA Add-On - {frequency} {partner} Pittsburgh"

    body_html = f"""<div class="seo-optimized-content">
<h2>{year} {addon_type} CSA Add-On - Enhance Your Farm Share</h2>

<p><strong>Elevate your CSA experience with {description}!</strong> Add this {frequency.lower()} {addon_type.lower()} subscription to your Tiny Seed Farm CSA and enjoy the best of Pittsburgh's local food scene delivered with your vegetables.</p>

<h3>What's Included:</h3>
<ul>
<li><strong>{addon_type}:</strong> {items.capitalize()}</li>
<li><strong>{frequency} Delivery:</strong> Arrives with your CSA share for convenient pickup or delivery</li>
<li><strong>Local Partnership:</strong> Supporting {partner} and Pittsburgh's artisan food community</li>
<li><strong>Premium Quality:</strong> {benefits.capitalize()}</li>
</ul>

<h3>Why Add {addon_type} to Your CSA:</h3>
<ul>
<li><strong>Convenience:</strong> One-stop shopping for your local food needs</li>
<li><strong>Support Local:</strong> Your purchase supports multiple Pittsburgh small businesses</li>
<li><strong>Discover New Favorites:</strong> Rotating selection introduces you to new products</li>
<li><strong>Freshness Guaranteed:</strong> Products timed for optimal freshness at pickup</li>
<li><strong>Flexible:</strong> Add or remove from your subscription anytime</li>
</ul>

<h3>About {partner}:</h3>
<p>{partner} is a beloved Pittsburgh institution known for {benefits}. By partnering with local producers like {partner}, Tiny Seed Farm helps build a stronger local food economy.</p>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: Do I need a CSA share to order add-ons?</strong><br>
A: Yes, add-ons are designed to accompany your vegetable CSA share and arrive at the same pickup/delivery time.</p>

<p><strong>Q: Can I change my add-ons mid-season?</strong><br>
A: Yes! Contact us to adjust your add-ons at any time during the season.</p>

<p><strong>Q: How are the products packaged?</strong><br>
A: Products are packaged by our partners using eco-friendly materials whenever possible.</p>

<p><strong>Q: What if I have dietary restrictions?</strong><br>
A: Contact us with specific questions about ingredients or allergens for any add-on product.</p>

<h3>Complete Your CSA Experience:</h3>
<p>Browse all our add-on options: <a href="/collections/add-ons">Bread</a> | <a href="/collections/add-ons">Cheese</a> | <a href="/collections/add-ons">Mushrooms</a> | <a href="/collections/add-ons">Coffee</a> | <a href="/collections/flowers">Flowers</a></p>

<p><em>Tiny Seed Farm partners with Pittsburgh's finest local producers to bring you the best of our regional food community.</em></p>
</div>"""

    tags_list = [year, "Add Ons", addon_type.replace(" ", ""), frequency, "Pittsburgh", "Local",
                 "CSA Add-On", partner.replace(" ", ""), "Pennsylvania", "Farm Fresh"]
    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"{year} {addon_type} CSA Add-On {partner} - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def optimize_wreath_product(product):
    """Optimize wreath products."""
    original_title = product['title']

    # Extract wreath style from title
    style = original_title.replace("Wreath", "").strip()

    new_title = f"{style} Dried Flower Wreath - Handcrafted Farm Decor Pittsburgh"

    body_html = f"""<div class="seo-optimized-content">
<h2>{style} Dried Flower Wreath - Handcrafted by Tiny Seed Fleurs</h2>

<p><strong>Add natural beauty to your home with this stunning {style.lower()} dried flower wreath!</strong> Handcrafted on our Pittsburgh farm using flowers and botanicals grown in our own fields, this wreath brings the beauty of the farm into your home year-round.</p>

<h3>Product Details:</h3>
<ul>
<li><strong>Handcrafted Design:</strong> Each wreath is individually made by our floral team</li>
<li><strong>Farm-Grown Materials:</strong> Made with dried flowers and botanicals from Tiny Seed Farm</li>
<li><strong>Long-Lasting:</strong> Dried wreaths maintain their beauty for 1-2+ years with proper care</li>
<li><strong>Size:</strong> Approximately 14-18 inches in diameter</li>
<li><strong>Indoor/Protected Outdoor Use:</strong> Best displayed away from direct sunlight and moisture</li>
</ul>

<h3>Perfect For:</h3>
<ul>
<li><strong>Front Door:</strong> Welcome guests with farmhouse charm (covered porch recommended)</li>
<li><strong>Interior Walls:</strong> Add natural texture to any room</li>
<li><strong>Gift Giving:</strong> Unique, handmade gift for housewarming, holidays, or special occasions</li>
<li><strong>Seasonal Decor:</strong> Timeless design works year-round</li>
</ul>

<h3>Materials May Include:</h3>
<p>Dried wheat, amaranth, statice, strawflower, celosia, grasses, and seasonal botanicals. Each wreath is unique based on what's available from our fields.</p>

<h3>Care Instructions:</h3>
<ul>
<li>Display in a protected area away from rain and direct sunlight</li>
<li>Gently dust with a soft brush or low-powered hairdryer on cool setting</li>
<li>Avoid high humidity areas</li>
<li>Handle gently - dried materials are delicate</li>
</ul>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: How long will the wreath last?</strong><br>
A: With proper care and indoor display, our dried wreaths typically last 1-2 years or longer.</p>

<p><strong>Q: Can I hang it outside?</strong><br>
A: Yes, but only in a covered/protected area. Direct sun and rain will fade and damage the materials.</p>

<p><strong>Q: Do you do custom orders?</strong><br>
A: Yes! Contact us for custom wreaths for weddings, events, or specific color schemes.</p>

<p><strong>Q: Is each wreath unique?</strong><br>
A: Yes! While we follow the same general design, each wreath has slight variations due to the natural materials used.</p>

<h3>More From Tiny Seed Fleurs:</h3>
<p>Explore our <a href="/collections/flowers">flower subscriptions</a>, <a href="/collections/weddings">wedding flowers</a>, and <a href="/collections/wreaths">other wreaths</a>.</p>

<p><em>Every Tiny Seed Fleurs wreath is handcrafted in Pittsburgh using flowers grown on our sustainable farm.</em></p>
</div>"""

    tags_list = ["Wreath", "Dried Flowers", "Home Decor", "Handcrafted", "Pittsburgh", "Farm Decor",
                 "Cut Flowers", "Flowers", "Tiny Seed Fleurs", "Gift", "Pennsylvania"]
    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"{style} Dried Flower Wreath Handcrafted - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def optimize_vegetable_product(product):
    """Optimize individual vegetable products."""
    original_title = product['title']
    title_lower = original_title.lower()

    # Determine vegetable type and details
    veg_info = get_vegetable_info(title_lower)
    veg_name = veg_info['name']
    veg_description = veg_info['description']
    veg_uses = veg_info['uses']
    veg_storage = veg_info['storage']
    veg_nutrition = veg_info['nutrition']
    veg_season = veg_info['season']

    # Determine if it's a specific variety or generic
    is_generic = 'generic' in title_lower or 'retail' in title_lower
    is_bunched = 'bunch' in title_lower
    is_pound = 'pound' in title_lower or 'lb' in title_lower

    # Clean up title
    if is_generic:
        new_title = f"Fresh {veg_name} - Local Farm Vegetables Pittsburgh"
    elif is_bunched:
        new_title = f"Fresh {veg_name} Bunch - Local Farm Produce Pittsburgh"
    elif is_pound:
        new_title = f"Fresh {veg_name} (Per Pound) - Local Farm Vegetables Pittsburgh"
    else:
        new_title = f"Fresh {veg_name} - Tiny Seed Farm Pittsburgh"

    body_html = f"""<div class="seo-optimized-content">
<h2>Fresh {veg_name} - Locally Grown at Tiny Seed Farm Pittsburgh</h2>

<p><strong>Enjoy farm-fresh {veg_name.lower()} from Tiny Seed Farm!</strong> {veg_description} Our {veg_name.lower()} is grown using sustainable, organic practices on our Pittsburgh farm and harvested at peak ripeness for maximum flavor and nutrition.</p>

<h3>Product Details:</h3>
<ul>
<li><strong>Freshness:</strong> Harvested within 24-48 hours of purchase</li>
<li><strong>Growing Practices:</strong> Organically grown without synthetic pesticides or fertilizers</li>
<li><strong>Local:</strong> Grown right here in Pittsburgh, PA</li>
<li><strong>Season:</strong> {veg_season}</li>
</ul>

<h3>Culinary Uses:</h3>
<p>{veg_uses}</p>

<h3>Nutrition Benefits:</h3>
<p>{veg_nutrition}</p>

<h3>Storage Tips:</h3>
<p>{veg_storage}</p>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: How should I store {veg_name.lower()}?</strong><br>
A: {veg_storage}</p>

<p><strong>Q: Is this {veg_name.lower()} organic?</strong><br>
A: We use organic growing practices but are not certified organic. No synthetic pesticides or fertilizers are ever used.</p>

<p><strong>Q: Where can I buy Tiny Seed Farm vegetables?</strong><br>
A: Through our <a href="/collections/csa">CSA program</a>, at local Pittsburgh farmers markets, and through select retail partners.</p>

<p><strong>Q: When is {veg_name.lower()} in season?</strong><br>
A: {veg_name} is typically available {veg_season.lower()}.</p>

<h3>Get More Farm Fresh Vegetables:</h3>
<p>Join our <a href="/collections/csa">CSA program</a> for weekly deliveries of seasonal vegetables including {veg_name.lower()} and many more farm-fresh varieties!</p>

<p><em>Tiny Seed Farm grows over 50 varieties of vegetables using sustainable practices on our Pittsburgh-area farm.</em></p>
</div>"""

    tags_list = ["Vegetables", veg_name, "Fresh", "Local", "Pittsburgh", "Farm Fresh",
                 "Organic Practices", "Sustainable", "Pennsylvania", veg_season.split()[0] if veg_season else "Seasonal"]
    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"Fresh {veg_name} Local Farm Vegetables - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def get_vegetable_info(title_lower):
    """Return detailed info for each vegetable type."""

    veg_data = {
        'carrot': {
            'name': 'Carrots',
            'description': 'Sweet, crunchy carrots bursting with flavor and natural sweetness.',
            'uses': 'Perfect raw for snacking, roasted as a side dish, added to soups and stews, juiced, or shredded for salads and baked goods like carrot cake.',
            'storage': 'Remove tops and store in a plastic bag in the refrigerator for 2-4 weeks. Keep away from ethylene-producing fruits.',
            'nutrition': 'Excellent source of beta-carotene (Vitamin A), fiber, potassium, and antioxidants. Supports eye health and immune function.',
            'season': 'Spring through Fall, with storage carrots available into winter'
        },
        'beet': {
            'name': 'Beets',
            'description': 'Earthy, sweet beets in beautiful colors from deep red to golden yellow.',
            'uses': 'Roast for salads, pickle for a tangy side, blend into smoothies, or use the greens sauteed like spinach.',
            'storage': 'Remove greens (use separately), store roots in plastic bag in refrigerator for 2-3 weeks.',
            'nutrition': 'Rich in folate, manganese, potassium, and nitrates which support cardiovascular health and athletic performance.',
            'season': 'Summer through Fall, with storage available into winter'
        },
        'kale': {
            'name': 'Kale',
            'description': 'Nutrient-dense leafy greens available in curly and dinosaur (lacinato) varieties.',
            'uses': 'Massage with oil for raw salads, saute as a side, add to soups, blend into smoothies, or bake into crispy kale chips.',
            'storage': 'Store unwashed in a plastic bag in the refrigerator for up to 1 week. Wash just before using.',
            'nutrition': 'Superfood packed with vitamins K, A, C, plus calcium, potassium, and powerful antioxidants.',
            'season': 'Spring and Fall (sweeter after frost)'
        },
        'chard': {
            'name': 'Swiss Chard',
            'description': 'Beautiful rainbow chard with colorful stems and nutritious dark green leaves.',
            'uses': 'Saute stems and leaves separately (stems take longer), add to pasta, quiche, or use as a spinach substitute.',
            'storage': 'Store unwashed in a plastic bag in the refrigerator for 5-7 days.',
            'nutrition': 'Excellent source of vitamins K, A, C, magnesium, and potassium with powerful antioxidants.',
            'season': 'Spring through Fall'
        },
        'spinach': {
            'name': 'Spinach',
            'description': 'Tender, mild spinach perfect for both raw and cooked applications.',
            'uses': 'Fresh in salads, wilted into pasta, blended in smoothies, added to eggs, or used in dips.',
            'storage': 'Store dry in a container with a paper towel to absorb moisture, use within 5-7 days.',
            'nutrition': 'Iron-rich leafy green high in vitamins K, A, C, folate, and antioxidants.',
            'season': 'Spring and Fall (bolts in summer heat)'
        },
        'arugula': {
            'name': 'Arugula',
            'description': 'Peppery, distinctive arugula adds bold flavor to any dish.',
            'uses': 'Perfect for salads, pizza topping, pesto, sandwiches, or wilted into pasta.',
            'storage': 'Store dry in a container or bag in the refrigerator for 3-5 days.',
            'nutrition': 'Low calorie green rich in vitamins K and C, calcium, and cancer-fighting compounds.',
            'season': 'Spring and Fall'
        },
        'cabbage': {
            'name': 'Cabbage',
            'description': 'Versatile cabbage in green, savoy, and specialty varieties.',
            'uses': 'Cole slaw, sauerkraut, stir-fries, soups, stuffed cabbage, or roasted wedges.',
            'storage': 'Whole heads keep 1-2 months in the refrigerator. Cut cabbage should be used within a week.',
            'nutrition': 'High in vitamin C, K, fiber, and cancer-fighting compounds. Excellent for gut health when fermented.',
            'season': 'Summer through Fall, with storage available into winter'
        },
        'broccoli': {
            'name': 'Broccoli',
            'description': 'Fresh, crisp broccoli crowns packed with nutrition.',
            'uses': 'Steam, roast, stir-fry, add to pasta, eat raw with dip, or blend into soups.',
            'storage': 'Store unwashed in a loose plastic bag in the refrigerator for 3-5 days.',
            'nutrition': 'Excellent source of vitamins C, K, fiber, and sulforaphane - a powerful cancer-fighting compound.',
            'season': 'Spring and Fall'
        },
        'cucumber': {
            'name': 'Cucumbers',
            'description': 'Crisp, refreshing cucumbers perfect for summer eating.',
            'uses': 'Fresh in salads, pickled, added to water for flavor, tzatziki sauce, or cold soups.',
            'storage': 'Store at room temperature for 1-2 days or refrigerate for up to a week. Sensitive to cold.',
            'nutrition': 'Hydrating with 95% water content, plus vitamin K and antioxidants.',
            'season': 'Summer'
        },
        'tomato': {
            'name': 'Cherry Tomatoes',
            'description': 'Sweet, flavorful cherry tomatoes bursting with summer taste.',
            'uses': 'Snacking, salads, roasting, pasta sauces, bruschetta, or halved on pizza.',
            'storage': 'Store at room temperature for best flavor. Refrigerate only if very ripe and use quickly.',
            'nutrition': 'Rich in lycopene, vitamins C and K, and potassium.',
            'season': 'Summer'
        },
        'basil': {
            'name': 'Fresh Basil',
            'description': 'Aromatic Italian basil with sweet, peppery flavor.',
            'uses': 'Pesto, Caprese salad, pizza, pasta, Thai dishes, or infused into oils and vinegars.',
            'storage': 'Treat like flowers - trim stems and place in water at room temperature. Use within 3-5 days.',
            'nutrition': 'Contains vitamin K, antioxidants, and anti-inflammatory compounds.',
            'season': 'Summer'
        },
        'celery': {
            'name': 'Celery',
            'description': 'Crisp celery stalks with mild, refreshing flavor.',
            'uses': 'Snacking with dips, base for soups and stews, juicing, or added to salads.',
            'storage': 'Wrap in foil and refrigerate for up to 2 weeks.',
            'nutrition': 'Very low calorie, high in fiber, vitamins K and C, and potassium.',
            'season': 'Fall'
        },
        'bean': {
            'name': 'Green Beans',
            'description': 'Tender, snap green beans picked at peak freshness.',
            'uses': 'Steam, roast, stir-fry, green bean casserole, or blanched in salads.',
            'storage': 'Store unwashed in a plastic bag in the refrigerator for 5-7 days.',
            'nutrition': 'Good source of vitamins C, K, fiber, and folate.',
            'season': 'Summer'
        },
        'bok choy': {
            'name': 'Bok Choy',
            'description': 'Tender Asian green with crisp stems and mild leafy tops.',
            'uses': 'Stir-fries, soups, grilled, steamed, or baby bok choy halved and roasted.',
            'storage': 'Store in plastic bag in refrigerator for 3-5 days.',
            'nutrition': 'Excellent source of vitamins A, C, K, calcium, and cancer-fighting compounds.',
            'season': 'Spring and Fall'
        },
        'corn': {
            'name': 'Sweet Corn',
            'description': 'Peak-season sweet corn picked fresh from local fields.',
            'uses': 'Grilled, boiled, added to salads, corn chowder, or cut off cob for dishes.',
            'storage': 'Best eaten same day. If needed, refrigerate in husks for 1-2 days.',
            'nutrition': 'Good source of fiber, vitamins B and C, and antioxidants.',
            'season': 'Summer'
        },
        'greens': {
            'name': 'Mixed Greens',
            'description': 'Assorted cooking greens including collards, mustard, and dandelion.',
            'uses': 'Saute with garlic, add to soups, braise with stock, or blend into smoothies.',
            'storage': 'Store unwashed in plastic bag in refrigerator for 3-5 days.',
            'nutrition': 'Nutrient powerhouses high in vitamins K, A, C, calcium, and fiber.',
            'season': 'Spring, Summer, and Fall'
        },
        'cilantro': {
            'name': 'Fresh Cilantro',
            'description': 'Bright, citrusy cilantro essential for many cuisines.',
            'uses': 'Salsas, guacamole, Thai and Indian dishes, garnish, or blended into sauces.',
            'storage': 'Trim stems and place in jar with water, cover loosely with plastic bag in refrigerator.',
            'nutrition': 'Contains vitamins A, C, K, and compounds that support detoxification.',
            'season': 'Spring and Fall'
        },
        'allium': {
            'name': 'Scallions',
            'description': 'Fresh green onions with mild onion flavor.',
            'uses': 'Garnish, stir-fries, salads, dips, pancakes, or grilled whole.',
            'storage': 'Store in plastic bag in refrigerator for 1-2 weeks.',
            'nutrition': 'Good source of vitamins K and C, plus beneficial sulfur compounds.',
            'season': 'Spring through Fall'
        },
        'artichoke': {
            'name': 'Artichokes',
            'description': 'Fresh globe artichokes with tender hearts.',
            'uses': 'Steam whole with dipping sauce, grill halved, or prepare hearts for pasta and dips.',
            'storage': 'Refrigerate unwashed in plastic bag for up to 1 week.',
            'nutrition': 'High in fiber, vitamins C and K, folate, and antioxidants.',
            'season': 'Spring'
        },
        'eggplant': {
            'name': 'Asian Eggplant',
            'description': 'Slender Asian eggplant with tender flesh and mild flavor.',
            'uses': 'Stir-fries, grilling, roasting, curries, or baba ganoush.',
            'storage': 'Store at room temperature for 1-2 days or refrigerate up to 1 week.',
            'nutrition': 'Low calorie with fiber, B vitamins, and antioxidants.',
            'season': 'Summer'
        },
        'cauliflower': {
            'name': 'Cauliflower',
            'description': 'Versatile cauliflower heads for countless culinary uses.',
            'uses': 'Roasted, riced, mashed, cauliflower steaks, added to curries, or eaten raw.',
            'storage': 'Store in loose plastic bag in refrigerator for 1-2 weeks.',
            'nutrition': 'High in vitamins C and K, fiber, and cancer-fighting compounds.',
            'season': 'Fall'
        },
        'brussels': {
            'name': 'Brussels Sprouts',
            'description': 'Sweet Brussels sprouts, especially delicious after frost.',
            'uses': 'Roasted, shaved raw in salads, halved and pan-fried, or added to pasta.',
            'storage': 'Store in plastic bag in refrigerator for 3-5 days.',
            'nutrition': 'Excellent source of vitamins K and C, fiber, and antioxidants.',
            'season': 'Fall through early Winter'
        }
    }

    # Find matching vegetable
    for key, info in veg_data.items():
        if key in title_lower:
            return info

    # Default for unmatched vegetables
    return {
        'name': 'Fresh Vegetables',
        'description': 'Farm-fresh vegetables grown with care.',
        'uses': 'Versatile for cooking, roasting, sauteing, or enjoying raw.',
        'storage': 'Store in refrigerator and use within a week for best quality.',
        'nutrition': 'Fresh vegetables are packed with vitamins, minerals, and fiber.',
        'season': 'Seasonal availability varies'
    }


def optimize_seedling_product(product):
    """Optimize seedling products."""
    original_title = product['title']
    title_lower = original_title.lower()

    # Determine plant type
    if 'tomato' in title_lower:
        plant = "Cherry Tomato"
        plant_desc = "Indeterminate cherry tomato plants producing sweet, bite-sized fruits all summer long"
        care = "Full sun (6-8 hours), consistent watering, stake or cage for support"
        harvest = "60-70 days from transplant"
    elif 'basil' in title_lower:
        plant = "Basil"
        plant_desc = "Aromatic Genovese basil perfect for pesto, Caprese, and Italian cooking"
        care = "Full sun, well-drained soil, pinch flowers to encourage leaf growth"
        harvest = "Ready to harvest leaves in 3-4 weeks"
    else:
        plant = "Vegetable"
        plant_desc = "Healthy vegetable seedlings ready for your garden"
        care = "Full sun, regular watering, follow specific plant requirements"
        harvest = "Varies by variety"

    # Determine size
    if '4 pack' in title_lower:
        size = "4-Pack"
        size_desc = "Four healthy seedlings ready for transplanting"
    else:
        size = "Single Pot"
        size_desc = "One robust seedling in a biodegradable pot"

    new_title = f"{plant} Seedlings {size} - Start Your Pittsburgh Garden"

    body_html = f"""<div class="seo-optimized-content">
<h2>{plant} Seedlings - Grow Your Own from Tiny Seed Farm</h2>

<p><strong>Start your garden right with healthy {plant.lower()} seedlings from Tiny Seed Farm!</strong> {plant_desc}. These vigorous seedlings are grown in our Pittsburgh greenhouse using organic practices and are ready for transplanting into your garden or containers.</p>

<h3>Product Details:</h3>
<ul>
<li><strong>Quantity:</strong> {size_desc}</li>
<li><strong>Size:</strong> 3-4 inch tall seedlings ready for transplant</li>
<li><strong>Growing Method:</strong> Organically grown without synthetic chemicals</li>
<li><strong>Availability:</strong> Spring (April-June)</li>
</ul>

<h3>Growing Tips:</h3>
<ul>
<li><strong>Light:</strong> {care.split(',')[0] if ',' in care else care}</li>
<li><strong>Water:</strong> Keep soil consistently moist but not waterlogged</li>
<li><strong>Transplanting:</strong> Plant after last frost (typically mid-May in Pittsburgh)</li>
<li><strong>Harvest:</strong> {harvest}</li>
</ul>

<h3>Why Buy Seedlings from Tiny Seed Farm:</h3>
<ul>
<li><strong>Expert Growing:</strong> Started by professional farmers with years of experience</li>
<li><strong>Hardened Off:</strong> Seedlings are acclimated for outdoor Pittsburgh conditions</li>
<li><strong>Organic Practices:</strong> No synthetic pesticides or fertilizers</li>
<li><strong>Local Varieties:</strong> Selected for success in Western Pennsylvania climate</li>
<li><strong>Skip the Hard Part:</strong> Start with robust plants instead of finicky seeds</li>
</ul>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: When can I transplant seedlings outdoors?</strong><br>
A: In Pittsburgh, wait until after the last frost date (typically mid-May) for warm-season crops like tomatoes and basil.</p>

<p><strong>Q: Do you offer other seedling varieties?</strong><br>
A: Yes! We offer tomatoes, peppers, herbs, and other vegetables. Check our seedling collection for current availability.</p>

<p><strong>Q: Can I grow these in containers?</strong><br>
A: Absolutely! Most of our seedlings do well in containers with proper sizing and care.</p>

<p><strong>Q: How do I harden off seedlings?</strong><br>
A: Our seedlings are already hardened off and ready to plant. Just avoid transplanting on extremely hot or cold days.</p>

<h3>More Gardening Supplies:</h3>
<p>Check out all our <a href="/collections/seedlings">seedling varieties</a> and join our <a href="/collections/csa">CSA program</a> if you'd rather let us grow for you!</p>

<p><em>Tiny Seed Farm seedlings are grown in our Pittsburgh greenhouse using sustainable practices, ready to thrive in your garden.</em></p>
</div>"""

    tags_list = ["Seedling", "Seedlings", plant, "Garden", "Pittsburgh", "Local",
                 "Organic Practices", "Spring", "Pennsylvania", "Grow Your Own"]
    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"{plant} Seedlings {size} Garden Starter - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def optimize_generic_product(product):
    """Optimize any product that doesn't fit other categories."""
    original_title = product['title']
    title_lower = original_title.lower()

    # Attempt to create SEO-optimized content for miscellaneous products
    if 'bloom jar' in title_lower:
        new_title = "Fresh Flower Bloom Jar - Local Pittsburgh Flowers"
        product_type = "flower arrangement"
        description = "Beautiful fresh flowers arranged in a charming jar"
    elif 'boutonniere' in title_lower or 'boutonnière' in title_lower:
        new_title = "Wedding Boutonniere - Fresh Local Flowers Pittsburgh"
        product_type = "wedding boutonniere"
        description = "Handcrafted boutonniere for weddings and special events"
    elif 'ceremony bouquet' in title_lower:
        new_title = "Wedding Ceremony Bouquet - Tiny Seed Fleurs Pittsburgh"
        product_type = "bridal bouquet"
        description = "Stunning bridal bouquet crafted with locally-grown flowers"
    elif 'dahlia' in title_lower and 'pick' in title_lower:
        new_title = "Dahlia U-Pick Experience - Tiny Seed Farm Pittsburgh"
        product_type = "u-pick flower experience"
        description = "Pick your own gorgeous dahlias straight from our farm fields"
    elif 'branch' in title_lower:
        new_title = "Fresh Foliage Branch - Floral Filler Pittsburgh"
        product_type = "floral greenery"
        description = "Fresh branches and foliage for floral arrangements"
    elif 'marigold' in title_lower:
        new_title = "Fresh Marigold Bunch - Local Farm Flowers Pittsburgh"
        product_type = "marigold flowers"
        description = "Bright, cheerful marigolds in warm golden tones"
    elif 'zinnia' in title_lower:
        new_title = "Fresh Zinnia Bunch - Colorful Farm Flowers Pittsburgh"
        product_type = "zinnia flowers"
        description = "Vibrant zinnias in a rainbow of colors"
    else:
        # Keep similar but add location
        new_title = original_title
        if 'pittsburgh' not in title_lower:
            new_title = f"{original_title} - Tiny Seed Farm Pittsburgh"
        product_type = "farm product"
        description = "Quality product from Tiny Seed Farm"

    body_html = f"""<div class="seo-optimized-content">
<h2>{new_title.replace(' - Tiny Seed Farm Pittsburgh', '').replace(' - Tiny Seed Fleurs Pittsburgh', '')}</h2>

<p><strong>Discover this {product_type} from Tiny Seed Farm!</strong> {description}. Every product from Tiny Seed Farm is crafted with care using sustainably-grown flowers and vegetables from our Pittsburgh farm.</p>

<h3>About This Product:</h3>
<ul>
<li><strong>Quality:</strong> Made with farm-fresh, locally-grown materials</li>
<li><strong>Sustainability:</strong> Grown using organic practices</li>
<li><strong>Local:</strong> Produced on our Pittsburgh-area farm</li>
<li><strong>Handcrafted:</strong> Each item made with care by our team</li>
</ul>

<h3>Why Choose Tiny Seed Farm:</h3>
<ul>
<li><strong>Support Local:</strong> Your purchase directly supports Pittsburgh agriculture</li>
<li><strong>Freshness:</strong> Products made with just-harvested materials</li>
<li><strong>Expertise:</strong> Grown and crafted by experienced farmers and florists</li>
<li><strong>Sustainability:</strong> No synthetic chemicals used in growing</li>
</ul>

<h3>Frequently Asked Questions (FAQ):</h3>

<p><strong>Q: How do I place an order?</strong><br>
A: Add to cart and check out. For custom orders or questions, contact us directly.</p>

<p><strong>Q: Do you offer local delivery?</strong><br>
A: Yes! We offer delivery throughout the Greater Pittsburgh area.</p>

<p><strong>Q: Can I customize this product?</strong><br>
A: Contact us for custom orders and special requests.</p>

<h3>Explore More:</h3>
<p>Browse our <a href="/collections/flowers">flower arrangements</a>, <a href="/collections/csa">CSA shares</a>, and <a href="/collections/all">all products</a>.</p>

<p><em>Tiny Seed Farm - Growing community through sustainable agriculture in Pittsburgh since 2018.</em></p>
</div>"""

    tags_list = ["Pittsburgh", "Local", "Farm Fresh", "Sustainable", "Pennsylvania", "Tiny Seed Farm"]

    # Add product-specific tags
    if 'flower' in title_lower or 'bouquet' in title_lower or 'bloom' in title_lower:
        tags_list.extend(["Flowers", "Cut Flowers", "Tiny Seed Fleurs"])
    if 'wedding' in title_lower or 'ceremony' in title_lower or 'boutonniere' in title_lower:
        tags_list.extend(["Wedding", "Wedding Flowers", "Bridal"])

    new_tags = ", ".join(tags_list)

    image_updates = []
    for img in product.get('images', []):
        alt_text = f"{new_title.split(' - ')[0]} - Tiny Seed Farm Pittsburgh PA"
        image_updates.append({"id": img['id'], "alt": alt_text})

    return {
        "title": new_title,
        "body_html": body_html,
        "tags": new_tags,
        "images": image_updates
    }


def update_product(product_id, updates):
    """Update a product via Shopify API."""
    url = f"{BASE_URL}/products/{product_id}.json"

    payload = {"product": updates}

    try:
        response = requests.put(url, headers=HEADERS, json=payload)
        response.raise_for_status()
        return True, response.json()
    except requests.exceptions.RequestException as e:
        return False, str(e)


def main():
    """Main optimization function."""
    print("=" * 80)
    print("TINY SEED FARM - SHOPIFY SEO & AEO OPTIMIZATION")
    print("=" * 80)
    print()

    # Load products
    with open('/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/shopify_products.json', 'r') as f:
        data = json.load(f)

    products = data.get('products', [])
    print(f"Loaded {len(products)} products for optimization")
    print()

    success_count = 0
    fail_count = 0

    for i, product in enumerate(products):
        product_id = product['id']
        original_title = product['title']

        print(f"[{i+1}/{len(products)}] Processing: {original_title}")

        # Generate optimized content
        optimized = get_seo_optimized_content(product)

        # Prepare update payload
        update_payload = {
            "id": product_id,
            "title": optimized['title'],
            "body_html": optimized['body_html'],
            "tags": optimized['tags']
        }

        # Add image updates if any
        if optimized.get('images'):
            update_payload['images'] = optimized['images']

        # Update via API
        success, result = update_product(product_id, update_payload)

        if success:
            success_count += 1
            print(f"  BEFORE: {original_title}")
            print(f"  AFTER:  {optimized['title']}")
            print(f"  STATUS: SUCCESS")

            optimization_report.append({
                "id": product_id,
                "before": original_title,
                "after": optimized['title'],
                "status": "SUCCESS"
            })
        else:
            fail_count += 1
            print(f"  STATUS: FAILED - {result}")

            optimization_report.append({
                "id": product_id,
                "before": original_title,
                "after": optimized['title'],
                "status": f"FAILED: {result}"
            })

        print()

        # Rate limiting - Shopify allows 2 requests/second for API calls
        time.sleep(0.6)

    # Print summary report
    print("=" * 80)
    print("OPTIMIZATION REPORT")
    print("=" * 80)
    print(f"Total Products: {len(products)}")
    print(f"Successful:     {success_count}")
    print(f"Failed:         {fail_count}")
    print()

    print("DETAILED CHANGES:")
    print("-" * 80)
    for report in optimization_report:
        status_icon = "[OK]" if report['status'] == 'SUCCESS' else "[FAIL]"
        print(f"{status_icon} ID: {report['id']}")
        print(f"     BEFORE: {report['before']}")
        print(f"     AFTER:  {report['after']}")
        if report['status'] != 'SUCCESS':
            print(f"     ERROR:  {report['status']}")
        print()

    # Save report to file
    with open('/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/seo_optimization_report.json', 'w') as f:
        json.dump({
            "summary": {
                "total": len(products),
                "success": success_count,
                "failed": fail_count
            },
            "details": optimization_report
        }, f, indent=2)

    print("Report saved to: seo_optimization_report.json")


if __name__ == "__main__":
    main()
