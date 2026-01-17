# Delivery Acceptance Algorithm
## The 10-Minute Rule

**Created:** 2026-01-16
**Rule:** A home delivery address is ONLY accepted if adding it to the current route increases total route time by ≤ 10 minutes.

---

## 1. THE ALGORITHM

### Core Logic

```
WHEN customer requests home delivery:

1. GET current_route = base_route + existing_home_deliveries for that day
2. CALCULATE current_route_time using Google Routes API
3. FIND optimal_insertion_point for new address in route
4. CALCULATE new_route_time with address inserted
5. SET time_increase = new_route_time - current_route_time

IF time_increase <= 10 minutes:
    ACCEPT delivery
    RETURN "Your address is on our route! Delivery fee: $X"
ELSE:
    REJECT delivery
    RETURN "Sorry, your address is outside our current delivery zone."
    OFFER pickup alternatives
```

### Why 10 Minutes?

- Average delivery stop takes 3-5 minutes (park, deliver, depart)
- 10 minutes allows for the stop itself plus reasonable detour
- Keeps routes predictable and profitable
- Prevents single addresses from adding 30+ minute detours

---

## 2. TECHNICAL IMPLEMENTATION

### Step 1: Get Base Route for Day

```javascript
function getBaseRouteForDay(deliveryDay) {
  // Wednesday routes include all CSA pickups and wholesale stops
  const baseStops = {
    'wednesday': [
      { name: 'Farm', address: '257 Zeigler Rd, Rochester, PA 15074', type: 'start' },
      { name: 'Zelienople CSA', address: '358 East New Castle Street, Zelienople, PA 16063', type: 'csa' },
      { name: 'Cafe Verde', address: '111 E Spring St, Zelienople, PA 16037', type: 'wholesale' },
      { name: 'Cranberry CSA', address: '230 Elmhurst Circle, Cranberry Township, PA 16066', type: 'csa' },
      { name: 'Allison Park Simons', address: '4312 Middle Rd, Allison Park, PA 15101', type: 'csa' },
      { name: 'Allison Park St Pauls', address: '1965 Ferguson Rd, Allison Park, PA 15101', type: 'csa' },
      { name: 'Fox Chapel', address: '237 Kittanning Pike, Pittsburgh, PA 15215', type: 'csa' },
      { name: 'Eleven', address: '1150 Smallman St, Pittsburgh, PA 15222', type: 'wholesale' },
      { name: 'Spirit', address: '242 51st Street, Pittsburgh, PA 15201', type: 'wholesale' },
      { name: 'Driftwood Oven', address: '3615 Butler St, Pittsburgh, PA 15201', type: 'wholesale' },
      { name: 'Morcilla', address: '3519 Butler St, Pittsburgh, PA 15201', type: 'wholesale' },
      { name: 'Fet Fisk', address: '4786 Liberty Ave, Pittsburgh, PA 15224', type: 'wholesale' },
      { name: 'APTEKA', address: '4606 Penn Ave, Pittsburgh, PA 15224', type: 'wholesale' },
      { name: 'Highland Park CSA', address: '5901 Bryant St, Pittsburgh, PA 15206', type: 'csa' },
      { name: 'Squirrel Hill CSA', address: '5502 Kamin Street, Pittsburgh, PA 15217', type: 'csa' },
      { name: 'Mt Lebanon CSA', address: '326 Newburn Dr, Pittsburgh, PA 15216', type: 'csa' },
      { name: 'Mediterra', address: '292 Beverly Road, Pittsburgh, PA 15216', type: 'wholesale' },
      { name: 'Farm', address: '257 Zeigler Rd, Rochester, PA 15074', type: 'end' }
    ]
  };

  return baseStops[deliveryDay.toLowerCase()] || [];
}
```

### Step 2: Get Existing Home Deliveries

```javascript
function getExistingHomeDeliveries(date) {
  // Query SALES_DeliveryStops sheet for accepted home deliveries on this date
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SALES_DeliveryStops');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1)
    .filter(row => {
      const rowDate = row[headers.indexOf('Delivery_Date')];
      const stopType = row[headers.indexOf('Stop_Type')];
      return formatDate(rowDate) === date && stopType === 'home_delivery';
    })
    .map(row => ({
      address: row[headers.indexOf('Address')],
      customerName: row[headers.indexOf('Customer_Name')],
      stopOrder: row[headers.indexOf('Stop_Order')]
    }));
}
```

### Step 3: Calculate Route Time

```javascript
function calculateRouteTime(addresses) {
  // Use existing getRouteForDeliveries function
  const result = getRouteForDeliveries({
    addresses: JSON.stringify(addresses),
    returnToFarm: 'true'
  });

  if (result.success) {
    // Parse "XX minutes" to integer
    return parseInt(result.totalDuration);
  }

  throw new Error('Could not calculate route time');
}
```

### Step 4: Find Optimal Insertion Point

```javascript
function findOptimalInsertion(currentRoute, newAddress) {
  let bestPosition = -1;
  let bestTimeIncrease = Infinity;

  // Try inserting at each position
  for (let i = 1; i < currentRoute.length; i++) {
    const testRoute = [
      ...currentRoute.slice(0, i),
      newAddress,
      ...currentRoute.slice(i)
    ];

    const newTime = calculateRouteTime(testRoute.map(s => s.address));
    const timeIncrease = newTime - calculateRouteTime(currentRoute.map(s => s.address));

    if (timeIncrease < bestTimeIncrease) {
      bestTimeIncrease = timeIncrease;
      bestPosition = i;
    }
  }

  return {
    position: bestPosition,
    timeIncrease: bestTimeIncrease
  };
}
```

### Step 5: Complete Validation Function

```javascript
/**
 * Validate if a home delivery address should be accepted
 * @param {Object} params - { address, deliveryDate }
 * @returns {Object} - { accepted, timeIncrease, message, fee, alternatives }
 */
function validateHomeDeliveryAddress(params) {
  try {
    const { address, deliveryDate } = params;
    const MAX_TIME_INCREASE = 10; // minutes

    // 1. Get base route for the day
    const dayOfWeek = new Date(deliveryDate).toLocaleDateString('en-US', { weekday: 'long' });
    const baseRoute = getBaseRouteForDay(dayOfWeek);

    if (baseRoute.length === 0) {
      return {
        accepted: false,
        message: 'No delivery route scheduled for this day.',
        alternatives: getAlternativePickupLocations()
      };
    }

    // 2. Get existing home deliveries
    const existingDeliveries = getExistingHomeDeliveries(deliveryDate);

    // 3. Build current route (base + existing home deliveries)
    const currentRoute = [...baseRoute];
    existingDeliveries.forEach(d => {
      currentRoute.splice(d.stopOrder, 0, { address: d.address, type: 'home_delivery' });
    });

    // 4. Calculate current route time
    const currentAddresses = currentRoute.map(s => s.address);
    const currentTime = calculateRouteTime(currentAddresses);

    // 5. Find optimal insertion for new address
    const geocodeResult = geocodeAddress({ address });
    if (!geocodeResult.success) {
      return {
        accepted: false,
        message: 'Could not verify address. Please check and try again.',
        error: 'geocode_failed'
      };
    }

    const insertion = findOptimalInsertion(currentRoute, {
      address: geocodeResult.formatted_address,
      type: 'home_delivery'
    });

    // 6. Apply the 10-minute rule
    if (insertion.timeIncrease <= MAX_TIME_INCREASE) {
      // ACCEPTED
      const deliveryFee = calculateDeliveryFee(insertion.timeIncrease);

      return {
        accepted: true,
        timeIncrease: insertion.timeIncrease,
        insertPosition: insertion.position,
        message: `Great news! Your address is on our delivery route.`,
        fee: deliveryFee,
        formattedAddress: geocodeResult.formatted_address,
        coordinates: { lat: geocodeResult.lat, lng: geocodeResult.lng }
      };
    } else {
      // REJECTED
      return {
        accepted: false,
        timeIncrease: insertion.timeIncrease,
        message: 'Sorry, your address is outside our current delivery zone.',
        reason: `Adding your address would increase our route by ${Math.round(insertion.timeIncrease)} minutes.`,
        alternatives: getAlternativePickupLocations(geocodeResult.lat, geocodeResult.lng)
      };
    }

  } catch (error) {
    return {
      accepted: false,
      error: error.toString(),
      message: 'Unable to validate address. Please contact us directly.'
    };
  }
}
```

---

## 3. DELIVERY FEE STRUCTURE

Based on time increase:

| Time Increase | Delivery Fee | Zone |
|---------------|--------------|------|
| 0-3 minutes | $5.00 | Green (ideal) |
| 4-7 minutes | $7.50 | Yellow (acceptable) |
| 8-10 minutes | $10.00 | Orange (edge) |
| >10 minutes | REJECTED | Red (outside zone) |

```javascript
function calculateDeliveryFee(timeIncrease) {
  if (timeIncrease <= 3) return 5.00;
  if (timeIncrease <= 7) return 7.50;
  if (timeIncrease <= 10) return 10.00;
  return null; // Should be rejected
}
```

---

## 4. CUSTOMER-FACING MESSAGES

### Acceptance Message
```
Great news! Your address is on our delivery route.

Delivery fee: $X.XX
Estimated delivery window: [TIME_WINDOW]

Your delivery day is [DAY]. You'll receive a text message
when our driver is on the way.
```

### Rejection Message
```
Sorry, your address is outside our current delivery zone.

We deliver to addresses within a 10-minute radius of our
established route. Your address would add [X] minutes to
our route.

Here are some alternatives:

NEARBY PICKUP LOCATIONS:
- [Location 1] - [Distance] away
- [Location 2] - [Distance] away
- [Location 3] - [Distance] away

These pickup locations are free and have the same delivery day.
```

---

## 5. ALTERNATIVE PICKUP LOCATIONS

When an address is rejected, suggest the nearest CSA pickup locations:

```javascript
function getAlternativePickupLocations(lat, lng) {
  const pickupLocations = [
    { name: 'Zelienople', address: '358 East New Castle Street, Zelienople, PA 16063', lat: 40.7948, lng: -80.1398 },
    { name: 'Cranberry', address: '230 Elmhurst Circle, Cranberry Township, PA 16066', lat: 40.6864, lng: -80.1018 },
    { name: 'Allison Park - Simons', address: '4312 Middle Rd, Allison Park, PA 15101', lat: 40.5506, lng: -79.9562 },
    { name: 'Allison Park - St Pauls', address: '1965 Ferguson Rd, Allison Park, PA 15101', lat: 40.5589, lng: -79.9612 },
    { name: 'Fox Chapel', address: '237 Kittanning Pike, Pittsburgh, PA 15215', lat: 40.5106, lng: -79.9006 },
    { name: 'Highland Park', address: '5901 Bryant St, Pittsburgh, PA 15206', lat: 40.4784, lng: -79.9219 },
    { name: 'Squirrel Hill', address: '5502 Kamin Street, Pittsburgh, PA 15217', lat: 40.4316, lng: -79.9269 },
    { name: 'Mt. Lebanon', address: '326 Newburn Dr, Pittsburgh, PA 15216', lat: 40.3898, lng: -80.0312 },
    { name: 'Bloomfield Market', address: '5050 Liberty Ave, Pittsburgh, PA 15224', lat: 40.4616, lng: -79.9458, day: 'Saturday' },
    { name: 'Lawrenceville Market', address: '115 41st St, Pittsburgh, PA 15201', lat: 40.4683, lng: -79.9622, day: 'Tuesday' },
    { name: 'Sewickley Market', address: '200 Walnut St, Sewickley, PA 15143', lat: 40.5353, lng: -80.1823, day: 'Saturday' }
  ];

  if (!lat || !lng) return pickupLocations.slice(0, 3);

  // Calculate distance to each and return 3 closest
  return pickupLocations
    .map(loc => ({
      ...loc,
      distance: calculateDistance(lat, lng, loc.lat, loc.lng)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula for distance in miles
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## 6. ADMIN OVERRIDE CAPABILITY

For special cases (VIP customers, test orders, etc.):

```javascript
function overrideDeliveryAcceptance(params) {
  const { address, deliveryDate, adminUserId, reason } = params;

  // Verify admin permissions
  if (!verifyAdminPermission(adminUserId, 'delivery_override')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Log the override
  logDeliveryOverride({
    address,
    deliveryDate,
    adminUserId,
    reason,
    timestamp: new Date().toISOString()
  });

  // Force accept the address
  return {
    success: true,
    accepted: true,
    override: true,
    message: 'Address manually accepted by admin.'
  };
}
```

---

## 7. LOGGING & ANALYTICS

Track all acceptance/rejection decisions:

```javascript
function logDeliveryDecision(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('DELIVERY_DECISIONS');

  if (!sheet) {
    sheet = ss.insertSheet('DELIVERY_DECISIONS');
    sheet.appendRow([
      'Timestamp', 'Address', 'Customer_Email', 'Delivery_Date',
      'Decision', 'Time_Increase', 'Fee', 'Reason', 'Alternatives_Offered'
    ]);
  }

  sheet.appendRow([
    new Date().toISOString(),
    data.address,
    data.customerEmail,
    data.deliveryDate,
    data.accepted ? 'ACCEPTED' : 'REJECTED',
    data.timeIncrease,
    data.fee || '',
    data.reason || '',
    data.alternatives ? JSON.stringify(data.alternatives) : ''
  ]);
}
```

### Analytics Dashboard Data

Query the log for:
- Acceptance rate by area
- Average time increase of accepted addresses
- Most common rejection areas (potential expansion zones)
- Conversion from rejection to pickup signup

---

## 8. INTEGRATION POINTS

### 8.1 Shopify Checkout Integration

```javascript
// Webhook handler for Shopify checkout
function handleShopifyCheckout(data) {
  if (data.shipping_method === 'home_delivery') {
    const validation = validateHomeDeliveryAddress({
      address: formatShopifyAddress(data.shipping_address),
      deliveryDate: data.delivery_date
    });

    if (!validation.accepted) {
      // Reject the checkout with message
      return {
        success: false,
        error: 'delivery_outside_zone',
        message: validation.message,
        alternatives: validation.alternatives
      };
    }

    // Apply delivery fee
    return {
      success: true,
      deliveryFee: validation.fee,
      message: validation.message
    };
  }
}
```

### 8.2 CSA Signup Integration

```javascript
// When customer selects home delivery option in CSA signup
function validateCSAHomeDelivery(params) {
  const { customerAddress, deliveryDay } = params;

  // Find next delivery date for that day
  const nextDeliveryDate = getNextDeliveryDate(deliveryDay);

  const validation = validateHomeDeliveryAddress({
    address: customerAddress,
    deliveryDate: nextDeliveryDate
  });

  return validation;
}
```

### 8.3 API Endpoint

Add to doGet/doPost in MERGED TOTAL.js:

```javascript
case 'validateDeliveryAddress':
  return jsonResponse(validateHomeDeliveryAddress(e.parameter));

case 'checkDeliveryZone':
  return jsonResponse(checkDeliveryZone(e.parameter));
```

---

## 9. VISUALIZATION: DELIVERY ZONE MAP

Create a visual representation of the delivery zone:

```javascript
function getDeliveryZoneData() {
  const farmCoords = GOOGLE_ROUTES_CONFIG.FARM_COORDS;

  // Get base route polyline
  const baseRoute = getBaseRouteForDay('wednesday');
  const addresses = baseRoute.map(s => s.address);
  const routeResult = getRouteForDeliveries({
    addresses: JSON.stringify(addresses),
    returnToFarm: 'true'
  });

  return {
    farmLocation: farmCoords,
    baseRoutePolyline: routeResult.polyline,
    acceptanceZone: generateAcceptanceZonePolygon(routeResult.polyline),
    pickupLocations: getAlternativePickupLocations(),
    wholesaleLocations: getWholesaleLocations()
  };
}

function generateAcceptanceZonePolygon(routePolyline) {
  // Decode polyline and buffer by ~3 miles (approximate 10-minute detour radius)
  // Returns polygon coordinates for map display
  // This would need a proper polygon buffering library in production
}
```

---

## 10. TESTING CHECKLIST

Before deployment:

- [ ] Test address in GREEN zone (should accept, $5 fee)
- [ ] Test address in YELLOW zone (should accept, $7.50 fee)
- [ ] Test address in ORANGE zone (should accept, $10 fee)
- [ ] Test address in RED zone (should reject with alternatives)
- [ ] Test invalid address (should return error gracefully)
- [ ] Test with existing home deliveries on route
- [ ] Test admin override functionality
- [ ] Verify logging to DELIVERY_DECISIONS sheet
- [ ] Test Shopify webhook integration
- [ ] Load test with multiple concurrent requests

---

## 11. CONFIGURATION PARAMETERS

Stored in PropertiesService for easy adjustment:

```javascript
const DELIVERY_CONFIG = {
  MAX_TIME_INCREASE: 10,  // minutes - THE 10-MINUTE RULE
  FEE_TIER_1: 5.00,       // 0-3 minutes
  FEE_TIER_2: 7.50,       // 4-7 minutes
  FEE_TIER_3: 10.00,      // 8-10 minutes
  DELIVERY_DAYS: ['Wednesday'],
  ENABLE_LOGGING: true,
  ENABLE_ANALYTICS: true
};
```

---

## 12. FUTURE ENHANCEMENTS

1. **Dynamic route building** - Routes that adapt based on order density
2. **Time window requests** - "Morning" vs "Afternoon" delivery options
3. **Capacity limits** - Max home deliveries per route
4. **Seasonal zones** - Expand zones during high-volume seasons
5. **Driver assignment** - Multiple drivers with different zones
6. **Real-time tracking** - Update customer when address is next

---

*Algorithm Complete - Ready for Implementation*
