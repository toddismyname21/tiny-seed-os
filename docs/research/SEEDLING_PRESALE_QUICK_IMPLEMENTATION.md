# Seedling Presale Landing Page — Quick Implementation Guide

**Use this checklist to implement the research above. All techniques work in a single HTML file with inline CSS.**

---

## Color Palette (Copy-Paste Ready)

```css
:root {
  /* Organic Brand Colors */
  --green-primary: #6b8e23;      /* Moss green — primary brand */
  --green-dark: #556b2f;         /* Deep forest for hover states */
  --green-dark-text: #2d5016;    /* Text headings */
  
  --neutral-cream: #f5f1e8;      /* Warm cream background */
  --neutral-light: #ede4d3;      /* Slightly darker cream */
  --neutral-border: #e0d5c7;     /* Card borders */
  
  --accent-terracotta: #c85a54;  /* Warm accent */
  --accent-sage: #a8a89e;        /* Muted secondary */
  
  /* Functional */
  --text-primary: #3a3a3a;       /* Body text */
  --text-secondary: #666666;     /* Secondary text */
  --text-muted: #999999;         /* Muted labels */
}
```

---

## Fonts (Google Fonts — Free)

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<style>
  h1, h2, h3 { font-family: 'Playfair Display', serif; }
  body, p, button, input { font-family: 'Inter', sans-serif; }
</style>
```

---

## Hero Section Template

```html
<style>
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f1e8 0%, #e8dcc8 50%, #d4c5a9 100%);
    position: relative;
    overflow: hidden;
    padding: 40px 20px;
    text-align: center;
  }

  /* Organic SVG pattern overlay */
  .hero::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 60%;
    height: 100%;
    background: url('data:image/svg+xml;charset=utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="rgba(107,142,35,0.08)" stroke-width="1"/><path d="M100,20 Q150,50 150,100 Q150,150 100,180" fill="none" stroke="rgba(107,142,35,0.06)" stroke-width="2"/></svg>') repeat;
    background-size: 200px 200px;
    opacity: 0.6;
    z-index: 0;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 700px;
  }

  .hero h1 {
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: #2d5016;
    margin: 0 0 20px 0;
  }

  .hero p {
    font-size: clamp(16px, 2vw, 20px);
    color: #3a3a3a;
    line-height: 1.6;
    margin: 0 0 40px 0;
  }
</style>

<section class="hero">
  <div class="hero-content">
    <h1>Reserve Your Spring Seedlings Now</h1>
    <p>90+ organic heirloom varieties. Pickup April 12–15 at your local Pittsburgh market.</p>
    <button class="cta-primary">Start Your Order</button>
  </div>
</section>
```

---

## Product Card Grid (Copy-Paste Ready)

```html
<style>
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    padding: 40px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .variety-card {
    background: #ffffff;
    border: 1px solid #e0d5c7;
    border-radius: 12px;
    padding: 24px;
    transition: all 300ms ease;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .variety-card:hover {
    border-color: #8b7355;
    box-shadow: 0 12px 24px rgba(107, 142, 35, 0.1);
    transform: translateY(-4px);
  }

  .variety-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #f5f1e8, #e8dcc8);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  .variety-title {
    font-size: 18px;
    font-weight: 700;
    color: #2d5016;
    margin: 0;
  }

  .variety-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    margin: 0;
  }

  .variety-price {
    font-weight: 600;
    color: #8b7355;
    font-variant-numeric: tabular-nums;
    margin: 8px 0;
  }

  .add-btn {
    background: #6b8e23;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 200ms ease;
    margin-top: auto;
    font-family: 'Inter', sans-serif;
  }

  .add-btn:hover {
    background: #556b2f;
  }

  .add-btn:focus {
    outline: 2px solid #6b8e23;
    outline-offset: 2px;
  }
</style>

<div class="product-grid">
  <div class="variety-card">
    <div class="variety-icon">🍅</div>
    <h3 class="variety-title">Early Girl Tomato</h3>
    <p class="variety-desc">Classic early-season favorite, reliable yields</p>
    <p class="variety-price">$6.00 each</p>
    <button class="add-btn">Add to Cart</button>
  </div>

  <div class="variety-card">
    <div class="variety-icon">🌶️</div>
    <h3 class="variety-title">Hot Pepper Mix</h3>
    <p class="variety-desc">Serrano, Thai, Scotch Bonnet varieties</p>
    <p class="variety-price">$6.00 each</p>
    <button class="add-btn">Add to Cart</button>
  </div>

  <div class="variety-card">
    <div class="variety-icon">🌿</div>
    <h3 class="variety-title">Herb Collection</h3>
    <p class="variety-desc">Basil, Parsley, Cilantro, Oregano</p>
    <p class="variety-price">$6.00 each</p>
    <button class="add-btn">Add to Cart</button>
  </div>

  <!-- Repeat for each variety -->
</div>
```

---

## Primary CTA Button

```css
.cta-primary {
  background: linear-gradient(135deg, #6b8e23, #556b2f);
  color: #ffffff;
  padding: 16px 40px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 4px 12px rgba(107, 142, 35, 0.3);
  font-family: 'Inter', sans-serif;
  text-transform: none;
  letter-spacing: 0;
  display: inline-block;
  min-height: 44px;
  min-width: 44px;
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(107, 142, 35, 0.4);
}

.cta-primary:active {
  transform: translateY(0);
}

.cta-primary:focus {
  outline: 2px solid #6b8e23;
  outline-offset: 2px;
}
```

---

## USDA Organic Seal Display

```html
<style>
  .trust-block {
    display: flex;
    align-items: center;
    gap: 40px;
    padding: 40px;
    background: #f5f1e8;
    border-radius: 12px;
  }

  .organic-seal-container {
    flex-shrink: 0;
  }

  .organic-seal-container img {
    width: 120px;
    height: 120px;
    display: block;
  }

  .trust-text h3 {
    margin: 0 0 12px 0;
    color: #2d5016;
  }

  .trust-text p {
    margin: 0;
    line-height: 1.6;
    color: #3a3a3a;
  }

  @media (max-width: 640px) {
    .trust-block {
      flex-direction: column;
      text-align: center;
    }
  }
</style>

<div class="trust-block">
  <div class="organic-seal-container">
    <!-- Download from USDA: https://www.ams.usda.gov/rules-regulations/organic/organic-seal -->
    <img src="/images/usda-organic-seal-full-color.svg" alt="USDA Certified Organic seal" width="120" height="120">
  </div>
  <div class="trust-text">
    <h3>USDA Certified Organic</h3>
    <p>Tiny Seed Farm has been USDA Certified Organic since 2018. All seedlings are grown from certified organic seeds using organic practices — zero synthetic pesticides or fertilizers.</p>
    <p><strong>Certified by:</strong> Pennsylvania Certified Organic (PCO)</p>
  </div>
</div>
```

---

## Urgency Block (Legitimate Scarcity)

```html
<style>
  .urgency-block {
    background: linear-gradient(135deg, #f5f1e8, #e8dcc8);
    border: 2px solid #8b7355;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    margin: 40px 0;
  }

  .urgency-block h3 {
    font-size: 32px;
    color: #2d5016;
    margin: 0 0 12px 0;
  }

  .countdown {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin: 20px 0;
    flex-wrap: wrap;
  }

  .countdown-item {
    text-align: center;
    background: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e0d5c7;
    flex: 0 1 auto;
  }

  .countdown-number {
    display: block;
    font-size: 32px;
    font-weight: 700;
    color: #6b8e23;
    font-family: 'Playfair Display', serif;
    margin: 0;
  }

  .countdown-label {
    display: block;
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    margin-top: 8px;
  }

  .urgency-note {
    font-size: 14px;
    color: #666;
    margin-top: 20px;
  }
</style>

<div class="urgency-block">
  <h3>Presale Closes April 2</h3>
  <p>Orders lock in to guarantee April 12–15 pickup at your local market.</p>
  
  <div class="countdown">
    <div class="countdown-item">
      <span class="countdown-number">14</span>
      <span class="countdown-label">Days Left</span>
    </div>
    <div class="countdown-item">
      <span class="countdown-number">8</span>
      <span class="countdown-label">Hours</span>
    </div>
    <div class="countdown-item">
      <span class="countdown-number">32</span>
      <span class="countdown-label">Minutes</span>
    </div>
  </div>
  
  <p class="urgency-note">After April 2, orders shift to standby availability.</p>
</div>
```

---

## FAQ Section

```html
<style>
  .faq-container {
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
  }

  .faq-item {
    background: #ffffff;
    border: 1px solid #e0d5c7;
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
  }

  .faq-question {
    padding: 20px;
    background: #f5f1e8;
    cursor: pointer;
    font-weight: 600;
    color: #2d5016;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 200ms ease;
  }

  .faq-question:hover {
    background: #ede4d3;
  }

  .faq-toggle {
    font-size: 20px;
    color: #6b8e23;
  }

  .faq-answer {
    padding: 0 20px;
    max-height: 0;
    overflow: hidden;
    transition: all 300ms ease;
  }

  .faq-item.open .faq-answer {
    padding: 20px;
    max-height: 500px;
  }

  .faq-answer p {
    margin: 0;
    line-height: 1.6;
    color: #3a3a3a;
  }
</style>

<div class="faq-container">
  <h2 style="text-align: center; margin-bottom: 30px; color: #2d5016;">Common Questions</h2>
  
  <div class="faq-item open">
    <div class="faq-question">
      <span>What size are the seedlings at pickup?</span>
      <span class="faq-toggle">▼</span>
    </div>
    <div class="faq-answer">
      <p>All seedlings are grown in 3-inch pots and will be 6-10 inches tall at pickup, with strong root systems ready for transplanting to garden or field.</p>
    </div>
  </div>

  <div class="faq-item">
    <div class="faq-question">
      <span>Can I cancel or modify my order?</span>
      <span class="faq-toggle">▼</span>
    </div>
    <div class="faq-answer">
      <p>Full refund available until April 2. After that, we'll issue store credit. To modify varieties, email todd@tinyseedfarmpgh.com before April 2.</p>
    </div>
  </div>

  <div class="faq-item">
    <div class="faq-question">
      <span>Are the seedlings organic?</span>
      <span class="faq-toggle">▼</span>
    </div>
    <div class="faq-answer">
      <p>Yes! Tiny Seed Farm is USDA Certified Organic. All seedlings are grown with organic seeds and practices — no synthetic pesticides or fertilizers, ever.</p>
    </div>
  </div>
</div>

<script>
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      question.parentElement.classList.toggle('open');
    });
  });
</script>
```

---

## Accessibility Checklist

- [ ] All text meets 4.5:1 contrast ratio (test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/))
- [ ] All buttons have focus indicators (outline visible on keyboard tab)
- [ ] All form inputs have associated labels
- [ ] Images have alt text
- [ ] Keyboard navigation works without mouse (Tab through entire page)
- [ ] Page passes [WAVE Accessibility Checker](https://wave.webaim.org/)

---

## Performance Checklist

- [ ] Total HTML + CSS: <100KB
- [ ] All images compressed to <50KB each
- [ ] Google PageSpeed Insights score: >90 on mobile
- [ ] Load time on 3G: <2 seconds
- [ ] Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1

Test with: [Google PageSpeed Insights](https://pagespeed.web.dev/)

---

## Deployment Checklist

- [ ] Download USDA Organic seal from [USDA AMS](https://www.ams.usda.gov/rules-regulations/organic/organic-seal)
- [ ] Update farm name, phone, email in footer
- [ ] Update pickup dates and locations
- [ ] Update variety list and pricing
- [ ] Update order deadline date
- [ ] Test on mobile (iPhone 12, Samsung Galaxy S21)
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Submit to [Google PageSpeed Insights](https://pagespeed.web.dev/) for final audit
- [ ] Deploy to live site
- [ ] Send to user for presale launch

---

**Ready to implement? Start with the color palette + fonts, then build the hero, then the product grid. Each section is independent.**
