# INBOX: Sales/CRM Claude - CSA Data Integration
## From: PM_Architect
## Priority: P1 - CRITICAL

**Created:** 2026-01-18
**Dependencies:** Works alongside Backend Claude's webhook system

---

## MISSION STATEMENT

Ensure the CSA member data flows correctly between all systems:
- Shopify orders
- Customer_Bridge (owner's existing system)
- SALES_Customers sheet
- CSA_Members sheet
- Weekly order generation

**Owner's existing Customer_Bridge is WEEKS of work - preserve and enhance it.**

---

## EXISTING SYSTEM REFERENCE

### Owner's Customer_Bridge IDX (40+ fields)
The owner has an existing Customer_Bridge sheet with these critical fields:
```
Customer_ID, Contact_Name, Email, Phone,
Veg_Share_Code (0/1/2), Floral_Share_Code (0/1/2),
Start_Date, End_Date, Total_Weeks,
Pickup_Day, Pickup_Location, Is_Delivery,
Vacation_Weeks, Vacation_Dates,
Swap_Credits, Preferences,
Payment_Status, Amount_Paid,
Shopify_Order_ID, Created_Date, Last_Modified
```

### Owner's Existing Functions
```javascript
// From owner's pasted code - these patterns should be followed:
autoProcessShopifyData()     // Parses Shopify orders
pushSmartCSAToLog()          // Generates weekly CSA orders
syncInventoryToShopify()     // Two-way sync
```

---

## TASK 1: Verify Sheet Structure

### Audit Current Sheets
1. Check `SALES_Customers` exists and has correct columns
2. Check `CSA_Members` exists and has correct columns
3. Compare to owner's Customer_Bridge structure
4. Document any gaps

### Expected CSA_Members Columns
```
Member_ID
Customer_ID
Share_Type           (Vegetable, Flower, Flex)
Share_Size           (Small, Regular, Large, Family, Petite, Full)
Season               (2026)
Start_Date
End_Date
Total_Weeks
Weeks_Remaining
Pickup_Day           (Tuesday, Wednesday, Saturday)
Pickup_Location
Delivery_Address
Customization_Allowed
Swap_Credits
Vacation_Weeks_Used
Vacation_Weeks_Max
Status               (Active, On Hold, Completed, Cancelled)
Payment_Status       (Paid, Pending, Partial)
Amount_Paid
Frequency            (Weekly, Biweekly)
Veg_Code             (0, 1, 2)
Floral_Code          (0, 1, 2)
Preferences          (JSON: dislikes, allergies)
Is_Onboarded         (Boolean)
Last_Pickup_Date
Next_Pickup_Date
Notes
Shopify_Order_ID
Created_Date
Last_Modified
```

### Action Items
- [ ] Create missing columns
- [ ] Migrate data from Customer_Bridge if needed
- [ ] Update all API functions to use correct column names

---

## TASK 2: Weekly Order Generation

The owner has `pushSmartCSAToLog()` - we need an equivalent that:

1. Runs weekly (trigger: Sunday evening)
2. For each active CSA member:
   - Check if this is their pickup week (weekly vs biweekly)
   - Check if they have a vacation hold
   - If due for box: create order in Master_Order_Log
3. Link orders to pack sheets and delivery routes

### Implementation Pattern
```javascript
function generateWeeklyCSAOrders(weekDate) {
  const members = getActiveCSAMembers();
  const orders = [];

  for (const member of members) {
    // Skip if vacation hold
    if (hasVacationHold(member, weekDate)) continue;

    // Skip if biweekly and not their week
    if (member.frequency === 'Biweekly' && !isMemberWeek(member, weekDate)) continue;

    // Generate order
    const order = {
      Order_ID: generateOrderId('CSA', weekDate),
      Customer_ID: member.customerId,
      Member_ID: member.memberId,
      Order_Type: 'CSA',
      Order_Date: new Date(),
      Delivery_Date: getPickupDate(member.pickupDay, weekDate),
      Items: getBoxContentsForMember(member),
      Status: 'Pending',
      Pickup_Location: member.pickupLocation,
      Is_Delivery: !!member.deliveryAddress
    };

    orders.push(order);
    logOrder(order);
  }

  return { generated: orders.length, weekDate: weekDate };
}
```

---

## TASK 3: Biweekly Scheduling Logic

Critical for members who have biweekly shares:

### Rules
- Biweekly members alternate weeks
- Need to track "A Week" vs "B Week" groups
- Or track based on start date parity

### Implementation
```javascript
function isMemberWeek(member, targetDate) {
  // Calculate weeks since member start
  const startDate = new Date(member.startDate);
  const target = new Date(targetDate);
  const weeksSinceStart = Math.floor((target - startDate) / (7 * 24 * 60 * 60 * 1000));

  // Even weeks = their week (or odd, depending on start)
  return weeksSinceStart % 2 === 0;
}
```

---

## TASK 4: Pickup Location Management

### Current Locations (from Shopify data)
```
Mt. Lebanon (CSA CUSTOMER PORCH)
Allison Park (TBD)
Squirrel Hill (CSA CUSTOMER PORCH)
Bloomfield (SATURDAY FARMER'S MARKET)
```

### Location Sheet Structure
Create `CSA_Pickup_Locations` if needed:
```
Location_ID
Location_Name
Address
Day                 (Tuesday, Wednesday, Saturday)
Time_Start
Time_End
Is_Delivery_Zone
Max_Capacity
Current_Members
Host_Name
Host_Phone
Notes
```

### Pickup Assignment Logic
```javascript
function assignPickupLocation(member, requestedLocation) {
  const location = getLocationByName(requestedLocation);

  // Check capacity
  if (location.currentMembers >= location.maxCapacity) {
    return { success: false, error: 'Location at capacity' };
  }

  // Update member
  updateMember(member.memberId, {
    pickupLocation: location.locationName,
    pickupDay: location.day
  });

  // Update location count
  incrementLocationCount(location.locationId);

  return { success: true, location: location };
}
```

---

## TASK 5: CSA Products Sync

Ensure CSA products in system match Shopify products.

### Current Products (from Shopify export)
```
2026 Tiny Seed Fleurs Petite Bloom Bouquet Share (BIWEEKLY)
2026 SPRING CSA SHARE (LIMITED QUANTITIES)
2026 Flex CSA Share ($150, $300 options)
2026 Tiny Seed Fleurs Full Bloom Bouquet Share (BIWEEKLY)
2026 Small Summer CSA Share (BIWEEKLY)
2026 Friends and Family Summer CSA Share (BIWEEKLY)
```

### Products Sheet Structure
Create/update `CSA_Products`:
```
Product_ID
Product_Name
Shopify_Product_ID
Category            (Vegetable, Flower, Flex)
Size                (Small, Regular, Large, Family, Petite, Full)
Season              (Spring, Summer, Fall, Year-Round)
Frequency           (Weekly, Biweekly)
Price
Veg_Code            (0, 1, 2)
Floral_Code         (0, 1, 2)
Start_Date
End_Date
Total_Weeks
Max_Members
Current_Members
Is_Active
Description
```

---

## TASK 6: Member Metrics Dashboard Data

Provide data for dashboard showing:

### Key Metrics
- Total active members by share type
- Members by pickup location
- Weekly pickup schedule
- Vacation holds this week
- Members needing attention (payment, onboarding)
- Season completion rates

### API Endpoint
```javascript
function getCSAMetrics() {
  return {
    totalMembers: countActiveMembers(),
    byShareType: {
      vegetable: countByShareType('Vegetable'),
      flower: countByShareType('Flower'),
      flex: countByShareType('Flex')
    },
    byLocation: getCountsByLocation(),
    thisWeek: {
      totalPickups: countPickupsThisWeek(),
      vacationHolds: countVacationHoldsThisWeek()
    },
    needsAttention: {
      unpaid: countUnpaidMembers(),
      notOnboarded: countNotOnboarded()
    }
  };
}
```

---

## TASK 7: Data Migration (If Needed)

If owner has existing data in Customer_Bridge that needs to move to CSA_Members:

### Migration Script
```javascript
function migrateCustomerBridgeToCSA() {
  const bridge = getSheetData('Customer_Bridge');
  const csaSheet = getSheet('CSA_Members');

  let migrated = 0;
  let skipped = 0;

  for (const row of bridge) {
    // Check if already migrated
    if (existsInCSAMembers(row.email, row.shareType)) {
      skipped++;
      continue;
    }

    // Map fields
    const member = {
      memberId: 'CSA-MIG-' + Date.now() + '-' + migrated,
      customerId: row.customerId,
      shareType: mapShareType(row.vegCode, row.floralCode),
      shareSize: mapShareSize(row.vegCode, row.floralCode),
      season: row.season || '2026',
      startDate: row.startDate,
      endDate: row.endDate,
      // ... map all fields
    };

    appendToCSAMembers(member);
    migrated++;
  }

  return { migrated, skipped };
}
```

---

## DELIVERABLES

### Required:
1. **Sheet Audit Report** - Document current vs required structure
2. **Weekly Order Generation** - `generateWeeklyCSAOrders()` function
3. **Biweekly Logic** - `isMemberWeek()` function
4. **Metrics Endpoint** - `getCSAMetrics()` function

### If Needed:
5. **Migration Script** - If Customer_Bridge data needs moving
6. **Location Management** - Pickup location assignment system

### Documentation:
7. **OUTBOX.md Update** - All changes documented
8. **Data Flow Diagram** - How data moves between sheets

---

## DATA FLOW DIAGRAM

```
SHOPIFY ORDER
     |
     v
[Backend: Webhook Handler]
     |
     +---> SALES_Customers (create/update)
     |
     +---> CSA_Members (create)
     |
     +---> [Trigger: Welcome Email]
     |
     v
WEEKLY TRIGGER (Sunday)
     |
     v
[Sales/CRM: generateWeeklyCSAOrders()]
     |
     +---> Check vacation holds
     +---> Check biweekly schedule
     +---> Generate orders
     |
     v
Master_Order_Log
     |
     +---> Pick/Pack sheets
     +---> Delivery routes
```

---

## CRITICAL REQUIREMENTS

1. **Preserve existing data** - Never overwrite owner's Customer_Bridge
2. **Idempotent operations** - Running twice doesn't create duplicates
3. **Audit trail** - Log all data changes
4. **Validation** - Check data integrity before writes
5. **Timezone awareness** - Pittsburgh is EST/EDT

---

## COORDINATION

- Backend Claude is building Shopify webhook - coordinate on data format
- UX Claude needs member data for portal - expose via API
- Read COORDINATION_RULES.md before making changes
- Update OUTBOX.md when complete

---

*Sales/CRM Claude - Keep CSA member data clean, consistent, and flowing correctly*
