# PWA Icon Specifications

**Created:** 2026-01-15
**For:** Mobile Claude (PWA manifest setup)

---

## Required Icons

### Employee App Icons

| File | Size | Background | Icon | Notes |
|------|------|------------|------|-------|
| `icons/employee-192.png` | 192x192 | `#2d5a27` (dark green) | Seedling + Person silhouette | For app launcher |
| `icons/employee-512.png` | 512x512 | `#2d5a27` (dark green) | Seedling + Person silhouette | For splash screen |

**Design Details:**
- Background: Solid `#2d5a27` (brand dark green)
- Icon: White seedling sprouting from soil, small person silhouette
- Style: Flat, minimalist, no gradients
- Corner radius: 0px (iOS will auto-mask, Android uses square)
- Padding: 15% from edges

### Driver App Icons

| File | Size | Background | Icon | Notes |
|------|------|------------|------|-------|
| `icons/driver-192.png` | 192x192 | `#22c55e` (success green) | Delivery truck | For app launcher |
| `icons/driver-512.png` | 512x512 | `#22c55e` (success green) | Delivery truck | For splash screen |

**Design Details:**
- Background: Solid `#22c55e` (delivery green)
- Icon: White delivery truck facing right, simple side view
- Style: Flat, minimalist, no gradients
- Corner radius: 0px
- Padding: 15% from edges

---

## Icon Guidelines

### Do:
- Use solid background colors (no gradients)
- Keep icons simple and recognizable at small sizes
- Use pure white (`#FFFFFF`) for the icon artwork
- Center the icon both horizontally and vertically
- Test at 16px to ensure it's still recognizable

### Don't:
- Add text to icons (too small to read)
- Use thin lines that disappear at small sizes
- Add shadows or 3D effects
- Use multiple colors in the icon artwork

---

## File Placement

All icons should go in: `/icons/` directory at project root

```
/icons/
  employee-192.png
  employee-512.png
  driver-192.png
  driver-512.png
```

---

## Manifest References

**Employee app** (`employee.html`):
```html
<link rel="apple-touch-icon" href="icons/employee-192.png">
<link rel="manifest" href="manifest-employee.json">
```

**Driver app** (`web_app/driver.html`):
```html
<link rel="apple-touch-icon" href="../icons/driver-192.png">
<link rel="manifest" href="manifest-driver.json">
```

---

## Generation Tools

If design resources are unavailable, these tools can generate icons:

1. **Canva** - Free templates for app icons
2. **Figma** - Design and export at multiple sizes
3. **realfavicongenerator.net** - Upload SVG, generates all sizes
4. **IconKitchen** (icon.kitchen) - Material Design icon generator

---

## Sample SVG Specifications

### Employee Icon (Seedling + Person)
```
- Viewbox: 0 0 512 512
- Seedling: Three leaves, centered, 60% of viewbox
- Small person silhouette: Lower left corner, 25% of viewbox
- Stroke: None (filled shapes only)
- Fill: #FFFFFF
```

### Driver Icon (Truck)
```
- Viewbox: 0 0 512 512
- Truck: Side profile facing right, 70% of viewbox width
- Wheels: Two circular wheels
- Cargo area: Box shape behind cab
- Stroke: None (filled shapes only)
- Fill: #FFFFFF
```

---

*Hand off to designer or use generation tools above.*
