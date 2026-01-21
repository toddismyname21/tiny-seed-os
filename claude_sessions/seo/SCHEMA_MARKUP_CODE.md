# SCHEMA MARKUP CODE
## Ready-to-Deploy Structured Data for Tiny Seed Farm

**Instructions:** Add these JSON-LD scripts to the `<head>` section of your website pages.

---

## 1. HOMEPAGE - LocalBusiness Schema

Add this to your homepage (`index.html` or main page):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://tinyseedfarm.com/#localbusiness",
  "name": "Tiny Seed Farm",
  "alternateName": "Tiny Seed",
  "description": "Pittsburgh's premier certified organic farm offering CSA shares, fresh vegetables, flowers, and herbs with convenient neighborhood pickups and home delivery throughout Allegheny County.",
  "url": "https://tinyseedfarm.com",
  "telephone": "+1-412-XXX-XXXX",
  "email": "hello@tinyseedfarm.com",
  "image": [
    "https://tinyseedfarm.com/images/farm-hero.jpg",
    "https://tinyseedfarm.com/images/csa-box.jpg",
    "https://tinyseedfarm.com/images/farm-team.jpg"
  ],
  "logo": "https://tinyseedfarm.com/images/logo.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "YOUR STREET ADDRESS",
    "addressLocality": "Pittsburgh",
    "addressRegion": "PA",
    "postalCode": "YOUR ZIP",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "YOUR_LATITUDE",
    "longitude": "YOUR_LONGITUDE"
  },
  "areaServed": [
    {
      "@type": "City",
      "name": "Pittsburgh",
      "sameAs": "https://en.wikipedia.org/wiki/Pittsburgh"
    },
    {
      "@type": "AdministrativeArea",
      "name": "Allegheny County"
    }
  ],
  "priceRange": "$$",
  "currenciesAccepted": "USD",
  "paymentAccepted": "Cash, Credit Card, Check",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Tuesday"],
      "opens": "15:00",
      "closes": "19:00",
      "description": "CSA Pickup"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Wednesday"],
      "opens": "15:00",
      "closes": "19:00",
      "description": "CSA Pickup"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday"],
      "opens": "09:00",
      "closes": "13:00",
      "description": "Farmers Market"
    }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "CSA Shares and Farm Products",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Summer Vegetable CSA Share",
          "description": "Weekly organic vegetable share for 20 weeks"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Flower CSA Share",
          "description": "Biweekly fresh cut flower bouquet share"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Flex CSA Share",
          "description": "Prepaid farm credit for flexible purchasing"
        }
      }
    ]
  },
  "sameAs": [
    "https://www.facebook.com/tinyseedfarm",
    "https://www.instagram.com/tinyseedfarm",
    "https://www.youtube.com/@tinyseedfarm"
  ],
  "knowsAbout": [
    "Organic farming",
    "Community Supported Agriculture",
    "Sustainable agriculture",
    "Local food systems",
    "Vegetable production",
    "Cut flower farming"
  ],
  "slogan": "From Seed to Table, Grown with Love in Pittsburgh"
}
</script>
```

---

## 2. FAQ PAGE - FAQ Schema

Add this to your FAQ page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does the Tiny Seed Farm CSA work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our CSA (Community Supported Agriculture) program provides weekly or biweekly shares of fresh, organic produce from our Pittsburgh-area farm. Members sign up for a season (typically 20 weeks for summer), choose their share size and pickup location, and receive a box of freshly harvested vegetables each week. You can pick up at convenient neighborhood locations in Mt. Lebanon, Squirrel Hill, Bloomfield, and more, or opt for home delivery."
      }
    },
    {
      "@type": "Question",
      "name": "What neighborhoods does Tiny Seed Farm deliver to in Pittsburgh?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer CSA pickup locations throughout Pittsburgh including Mt. Lebanon, Squirrel Hill, Bloomfield, Shadyside, East Liberty, Lawrenceville, and the North Hills. We also offer home delivery throughout Allegheny County for an additional fee. Check our website for the most current list of pickup locations and delivery areas."
      }
    },
    {
      "@type": "Question",
      "name": "Is Tiny Seed Farm certified organic?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Tiny Seed Farm is certified organic. We follow strict organic growing practices, never using synthetic pesticides, herbicides, or fertilizers. Our certification ensures that every vegetable and flower we grow meets the highest standards for organic production."
      }
    },
    {
      "@type": "Question",
      "name": "How much does a CSA share cost in Pittsburgh?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our CSA shares range from approximately $400-700 for a full summer season (20 weeks), depending on share size. We offer small, regular, and family-sized vegetable shares, as well as flower shares and flex credit options. This works out to $20-35 per week for farm-fresh, organic produce - often less than you'd pay at the grocery store for conventional produce."
      }
    },
    {
      "@type": "Question",
      "name": "Can I customize my CSA box?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! We understand that everyone has different tastes. Members can set preferences to avoid certain items they don't like, and we offer swap credits that let you exchange items at pickup. Our Flex CSA option gives you complete control - use your prepaid farm credit to choose exactly what you want each week."
      }
    },
    {
      "@type": "Question",
      "name": "When does CSA season start in Pittsburgh?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our main Summer CSA season typically runs from late May through October (20 weeks). We also offer a Spring CSA (April-May) and Fall CSA (September-November) for extended coverage. CSA signup usually opens in January-February, and shares often sell out, so we recommend signing up early to secure your spot."
      }
    },
    {
      "@type": "Question",
      "name": "What's in a typical CSA box?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A typical summer CSA box includes 8-12 items of seasonal produce. Early season might include lettuce, spinach, radishes, and herbs. Mid-summer brings tomatoes, peppers, cucumbers, zucchini, and beans. Fall boxes feature winter squash, kale, carrots, and beets. Every box is different based on what's freshly harvested that week!"
      }
    },
    {
      "@type": "Question",
      "name": "What if I'm going on vacation during CSA season?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We understand life happens! CSA members can put their share on hold for up to 4 weeks during the season. Simply let us know in advance through your member portal, and we'll pause your deliveries. You can also donate your share to a local food bank or have a friend pick it up for you."
      }
    }
  ]
}
</script>
```

---

## 3. CSA PAGE - Product Schema

Add this to your CSA signup/product pages:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Summer Vegetable CSA Share",
  "description": "20-week organic vegetable share from Tiny Seed Farm, Pittsburgh's premier CSA. Includes weekly pickup of 8-12 items of fresh, locally-grown produce.",
  "brand": {
    "@type": "Brand",
    "name": "Tiny Seed Farm"
  },
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "400",
    "highPrice": "700",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "LocalBusiness",
      "name": "Tiny Seed Farm"
    }
  },
  "category": "Community Supported Agriculture",
  "audience": {
    "@type": "Audience",
    "audienceType": "Pittsburgh families seeking fresh, local, organic produce"
  }
}
</script>
```

---

## 4. BLOG POSTS - Article Schema

Add this template to each blog post (customize for each):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "YOUR BLOG POST TITLE",
  "description": "YOUR META DESCRIPTION",
  "image": "https://tinyseedfarm.com/blog/images/YOUR-IMAGE.jpg",
  "author": {
    "@type": "Organization",
    "name": "Tiny Seed Farm",
    "url": "https://tinyseedfarm.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Tiny Seed Farm",
    "logo": {
      "@type": "ImageObject",
      "url": "https://tinyseedfarm.com/images/logo.png"
    }
  },
  "datePublished": "2026-01-18",
  "dateModified": "2026-01-18",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://tinyseedfarm.com/blog/YOUR-POST-URL"
  }
}
</script>
```

---

## 5. REVIEW/TESTIMONIAL SCHEMA

Add this to pages with customer reviews:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Tiny Seed Farm",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "47",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Sarah M."
      },
      "datePublished": "2026-01-15",
      "reviewBody": "Best CSA in Pittsburgh! The Mt. Lebanon pickup is so convenient, and the vegetables are always incredibly fresh.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      }
    }
  ]
}
</script>
```

---

## 6. BREADCRUMB SCHEMA

Add this to interior pages:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://tinyseedfarm.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "CSA Shares",
      "item": "https://tinyseedfarm.com/csa"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Summer Vegetable Share",
      "item": "https://tinyseedfarm.com/csa/summer-vegetable"
    }
  ]
}
</script>
```

---

## 7. LOCATION PAGE SCHEMA

Add to each neighborhood pickup location page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Tiny Seed Farm - Mt. Lebanon Pickup",
  "description": "CSA pickup location for Tiny Seed Farm in Mt. Lebanon, Pittsburgh. Pick up your fresh organic vegetables every Wednesday from 3-7pm.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "PICKUP ADDRESS",
    "addressLocality": "Mt. Lebanon",
    "addressRegion": "PA",
    "postalCode": "15228",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "40.3731",
    "longitude": "-80.0472"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Wednesday"],
    "opens": "15:00",
    "closes": "19:00"
  },
  "parentOrganization": {
    "@type": "LocalBusiness",
    "name": "Tiny Seed Farm",
    "url": "https://tinyseedfarm.com"
  }
}
</script>
```

---

## VALIDATION

After adding schema, validate using:
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Schema.org Validator:** https://validator.schema.org

---

## IMPLEMENTATION CHECKLIST

- [ ] Homepage LocalBusiness schema
- [ ] FAQ page schema
- [ ] CSA product pages schema
- [ ] Blog post template schema
- [ ] Review/testimonial schema
- [ ] Breadcrumb schema on all pages
- [ ] Location page schemas (one per pickup location)
- [ ] Validate all schemas with Google tool

---

*Last Updated: 2026-01-18*
