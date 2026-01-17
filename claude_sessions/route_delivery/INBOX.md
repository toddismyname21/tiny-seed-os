# INBOX: Route_Delivery Claude
## Assignment from PM_Architect

**Created:** 2026-01-16
**Priority:** HIGH
**Owner Request:** Build smart delivery route system that accepts home deliveries only if they make sense with the base route.

---

## YOUR MISSION

Build an intelligent delivery routing system that:
1. Establishes a "base route" from fixed weekly deliveries (markets, restaurants, CSA pickups)
2. Accepts/rejects home delivery signups based on proximity to base route
3. Optimizes route efficiency
4. Prevents "outlier" deliveries that cost more than they're worth

---

## CONTEXT

### The Problem (From Owner):
> "We accidentally had some outliers last year."

Home delivery customers signed up who were far from the main route, making those deliveries unprofitable and time-consuming.

### The Solution:
A smart algorithm that:
1. Knows the base route (hard-coded weekly stops)
2. When someone signs up for home delivery, calculates distance from route
3. Accepts if within threshold, flags/rejects if outlier
4. Shows driver optimized route including accepted home deliveries

---

## REFERENCE DATA FOLDER

**Drop files here:** `/claude_sessions/route_delivery/reference_data/`

### Data Needed:
1. **Last year's home delivery addresses** - CSV or list
2. **Weekly market locations** - Which markets, which days
3. **Restaurant delivery addresses** - Wholesale accounts
4. **CSA pickup locations** - Fixed pickup spots
5. **Farm address** - Start/end point (257 Zeigler Rd, Rochester PA 15074)

### If You Have It:
- Last year's delivery routes
- Problem addresses (the outliers)
- Approximate time per delivery
- Which days you deliver

---

## WHAT ALREADY EXISTS

### In the Codebase:
1. **Google Routes API integration** - Already configured (deployment v64)
2. **Delivery tracking system** - `SALES_DeliveryRoutes`, `SALES_DeliveryStops` sheets
3. **Driver app** - `web_app/driver.html` with route display
4. **Customer tracking page** - `track.html`
5. **SMS notifications** - Twilio integrated for delivery alerts

### Key Files to Review:
```
/apps_script/MERGED TOTAL.js - Search for:
  - DELIVERY_ROUTES functions (~line 10000+)
  - Google Routes API calls
  - Delivery optimization

/web_app/driver.html - Driver interface
/track.html - Customer tracking
```

### Existing Sheets:
- `SALES_DeliveryRoutes` - Route definitions
- `SALES_DeliveryStops` - Individual stops
- `SALES_Customers` - Customer addresses

---

## DELIVERABLES

### Phase 1: Analysis (First Session)
- [ ] Review last year's delivery data (from reference folder)
- [ ] Identify the "base route" pattern
- [ ] Document which addresses were outliers
- [ ] Create `ROUTE_ANALYSIS_2025.md`

### Phase 2: Algorithm Design (Second Session)
- [ ] Design acceptance algorithm
- [ ] Define distance thresholds
- [ ] Create `DELIVERY_ACCEPTANCE_ALGORITHM.md`
- [ ] Define pricing tiers (closer = cheaper delivery fee?)

### Phase 3: Build (Sessions 3-4)
- [ ] Build route configuration page (admin)
- [ ] Build delivery zone visualization
- [ ] Build signup validation (accept/flag/reject)
- [ ] Integrate with existing driver app

### Phase 4: Optimization (Session 5)
- [ ] Route optimization using Google Routes API
- [ ] Time window handling
- [ ] Multi-day route planning

---

## ALGORITHM REQUIREMENTS

### Base Route Concept:
```
MONDAY: Farm → Market A → Restaurant Cluster → Farm
TUESDAY: Farm → CSA Pickup 1 → CSA Pickup 2 → Farm
WEDNESDAY: Farm → Wholesale Run → Farm
etc.
```

### Home Delivery Acceptance Logic:
```
When new customer signs up for home delivery:
1. Get their address
2. Calculate distance to nearest point on base route
3. If distance < X miles → AUTO-ACCEPT
4. If distance X-Y miles → ACCEPT with surcharge
5. If distance > Y miles → FLAG for manual review or REJECT
```

### Configurable Parameters:
- `AUTO_ACCEPT_RADIUS` - e.g., 2 miles from route
- `SURCHARGE_RADIUS` - e.g., 2-5 miles (add $5)
- `REJECT_RADIUS` - e.g., >5 miles from route
- `MAX_ROUTE_TIME` - Don't exceed X hours
- `MAX_STOPS_PER_DAY` - Capacity limit

---

## VISUALIZATION NEEDS

### For Admin:
- Map showing base route
- Heat map of customer density
- Outlier highlighting

### For Customer Signup:
- "Enter your address to check delivery availability"
- Instant feedback: "You're in our delivery zone!" or "Sorry, outside our area"

### For Driver:
- Optimized turn-by-turn
- Estimated time per stop
- Customer notes visible

---

## INTEGRATION POINTS

1. **Shopify** - When customer checks out, validate address
2. **CSA Signup** - Check address before accepting home delivery option
3. **Driver App** - Display optimized route
4. **Customer Portal** - Show delivery day/window

---

## QUESTIONS TO ANSWER

1. What days do you currently deliver?
2. What's the maximum delivery radius you want?
3. Should outliers be rejected or offered higher delivery fee?
4. What time windows do you offer (morning, afternoon)?
5. How many deliveries can the driver handle per day?

---

## SUCCESS CRITERIA

**The system is complete when:**
1. Base route is defined and visualized
2. New signups are auto-validated against route
3. Driver sees optimized route each delivery day
4. No more "accidental outliers"
5. Delivery acceptance is instant (no manual review for in-zone)

---

*Route_Delivery Claude - Build this right and deliveries become profitable instead of a burden.*
