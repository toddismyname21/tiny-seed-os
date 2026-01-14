# Tiny Seed Sales Module - Architecture Plan

## Overview

A unified sales system connecting production (what's grown) to sales (what's sold) through multiple channels.

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TINY SEED WEB APPS                           │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│   greenhouse    │    employee     │     sales       │    driver     │
│     .html       │      .html      │     .html       │    .html      │
│   (Planner)     │  (Field Work)   │  (Orders/CRM)   │  (Delivery)   │
├─────────────────┴─────────────────┴─────────────────┴───────────────┤
│                    customer.html (Customer Portal)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE APPS SCRIPT API                         │
│                     (Unified API Gateway)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   PRODUCTION      │   │     SALES         │   │    DELIVERY       │
│   SHEETS          │   │     SHEETS        │   │    SHEETS         │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ • PLANNING_2026   │   │ • CUSTOMERS       │   │ • ROUTES          │
│ • HARVEST_LOG     │   │ • ORDERS          │   │ • DELIVERIES      │
│ • INVENTORY       │   │ • INVOICES        │   │ • PROOF_OF_DELIV  │
│ • TREATMENT_LOG   │   │ • CSA_MEMBERS     │   │ • DRIVER_LOGS     │
│ • FIELD_SCOUTING  │   │ • WHOLESALE       │   │                   │
└───────────────────┘   │ • PRICING         │   └───────────────────┘
                        │ • CAMPAIGNS       │
                        └───────────────────┘
```

---

## New Web Apps to Build

### 1. sales.html - Farm Manager Sales Dashboard
**Target User:** You (and office staff)

| Tab | Features |
|-----|----------|
| **Dashboard** | Today's orders, revenue, pending deliveries, low inventory alerts |
| **Orders** | View all orders, filter by status/customer/date, bulk actions |
| **Customers** | CRM - customer profiles, order history, preferences, notes |
| **Inventory** | Real-time availability, link to harvest data, pricing |
| **CSA** | Member management, share sizes, vacation holds, renewals |
| **Wholesale** | B2B customers, custom pricing, recurring orders |
| **Campaigns** | SMS/Email marketing, templates, scheduling |
| **Pick/Pack** | Generate pick lists from orders, packing labels |
| **Reports** | Sales by crop, customer, week, profit margins |

### 2. customer.html - Customer Ordering Portal
**Target User:** Your customers (wholesale buyers, CSA members)

| Feature | Description |
|---------|-------------|
| **Login** | Email/phone lookup (no password needed) |
| **Available Products** | Real-time inventory with photos |
| **Shopping Cart** | Add items, quantities, delivery date |
| **Order History** | Past orders, reorder favorites |
| **CSA Portal** | Manage subscription, customize box, add-ons |
| **Delivery Tracking** | Real-time van location, ETA |
| **Account Settings** | Address, preferences, payment |

### 3. driver.html - Driver Delivery App
**Target User:** Delivery drivers

| Feature | Description |
|---------|-------------|
| **Route View** | Optimized route with turn-by-turn |
| **Stop List** | Customer name, address, order details |
| **Navigation** | Integrate with Google Maps |
| **Proof of Delivery** | Photo, GPS, timestamp, signature |
| **Issue Reporting** | Missing items, refused, damaged |
| **Customer Contact** | One-tap call/text |
| **ETA Updates** | Auto-notify next customer |

---

## New Google Sheets Required

### CUSTOMERS
| Column | Description |
|--------|-------------|
| Customer_ID | CUST-001 |
| Name | Business or individual name |
| Type | CSA, Wholesale, Retail, Restaurant |
| Email | |
| Phone | |
| Address | Full delivery address |
| City, State, Zip | |
| Delivery_Instructions | Gate code, leave at door, etc. |
| Preferred_Day | Monday, Wednesday, etc. |
| Preferred_Time | Morning, Afternoon |
| Payment_Method | Invoice, Card, Cash |
| Price_Tier | Standard, Wholesale, VIP |
| Notes | |
| Created_Date | |
| Last_Order | |
| Total_Orders | |
| Total_Revenue | |

### ORDERS
| Column | Description |
|--------|-------------|
| Order_ID | ORD-20260115-001 |
| Customer_ID | Link to CUSTOMERS |
| Order_Date | |
| Delivery_Date | |
| Status | Pending, Confirmed, Picking, Packed, Out for Delivery, Delivered |
| Items | JSON of items [{crop, qty, price}] |
| Subtotal | |
| Delivery_Fee | |
| Tax | |
| Total | |
| Payment_Status | Unpaid, Paid, Partial |
| Notes | |
| Assigned_Route | |
| Picked_By | |
| Packed_By | |
| Delivered_By | |
| Delivery_Photo | |
| Delivery_GPS | |
| Delivery_Time | |

### CSA_MEMBERS
| Column | Description |
|--------|-------------|
| Member_ID | CSA-001 |
| Customer_ID | Link to CUSTOMERS |
| Share_Size | Small, Medium, Large, Family |
| Start_Date | |
| End_Date | |
| Status | Active, Paused, Cancelled, Expired |
| Delivery_Day | |
| Pickup_Location | Farm, Market, Dropsite |
| Vacation_Holds | JSON array of date ranges |
| Customizations | JSON of preferences |
| Payment_Plan | Full, Monthly, Biweekly |
| Amount_Paid | |
| Balance_Due | |
| Auto_Renew | TRUE/FALSE |

### INVENTORY
| Column | Description |
|--------|-------------|
| Product_ID | INV-001 |
| Crop | Tomatoes |
| Variety | Cherokee Purple |
| Available_Qty | |
| Unit | lb, bunch, each, pint |
| Retail_Price | |
| Wholesale_Price | |
| CSA_Included | TRUE/FALSE |
| Photo_URL | |
| Description | |
| Storage_Notes | |
| Harvest_Source | Link to HARVEST_LOG |
| Last_Updated | |

### ROUTES
| Column | Description |
|--------|-------------|
| Route_ID | RTE-20260115-1 |
| Date | |
| Driver_ID | |
| Status | Planning, Ready, In Progress, Complete |
| Stops | JSON array of order IDs in sequence |
| Start_Location | Farm address |
| Est_Duration | |
| Est_Distance | |
| Actual_Start | |
| Actual_End | |

---

## Integration Points

### Production → Sales Flow
```
PLANNING_2026 (what we're growing)
        ↓
HARVEST_LOG (what we picked)
        ↓
INVENTORY (what's available)
        ↓
ORDERS (what customers bought)
        ↓
ROUTES (how it gets delivered)
```

### Key Integrations:
1. **Harvest → Inventory**: When harvest is logged, inventory updates automatically
2. **Orders → Inventory**: When order placed, inventory decrements
3. **Orders → Pick Lists**: Generate pick lists organized by field location
4. **Orders → Routes**: Assign orders to delivery routes
5. **CSA → Orders**: Auto-generate weekly CSA orders
6. **Campaigns → SMS**: Twilio integration for notifications

---

## API Endpoints Needed

### Customer Management
```
createCustomer(data) → { customerId }
getCustomer(customerId) → { customer }
updateCustomer(customerId, data) → { success }
searchCustomers(query) → { customers[] }
getCustomerOrders(customerId) → { orders[] }
```

### Orders
```
createOrder(data) → { orderId }
getOrder(orderId) → { order }
updateOrderStatus(orderId, status) → { success }
getOrdersByDate(date) → { orders[] }
getOrdersByStatus(status) → { orders[] }
cancelOrder(orderId) → { success }
```

### Inventory
```
getAvailableInventory() → { products[] }
updateInventory(productId, qty) → { success }
syncFromHarvest() → { success }
getLowStockAlerts() → { alerts[] }
```

### CSA
```
getCSAMembers() → { members[] }
createCSAMember(data) → { memberId }
updateCSAMember(memberId, data) → { success }
setVacationHold(memberId, dates) → { success }
generateWeeklyBoxes() → { orders[] }
```

### Delivery
```
createRoute(date, orders[]) → { routeId }
optimizeRoute(routeId) → { optimizedStops[] }
getDriverRoutes(driverId) → { routes[] }
updateDeliveryStatus(orderId, status, proof) → { success }
getCustomerTrackingInfo(orderId) → { eta, location }
```

### Communication
```
sendSMS(customerId, message) → { success }
sendBulkSMS(customerIds[], message) → { results[] }
sendEmail(customerId, template, data) → { success }
scheduleReminder(type, datetime, recipients) → { success }
```

---

## Phase 1 Build Order (MVP)

### Week 1: Foundation
1. ✅ Set up clasp access to all sheets
2. Create unified API in MERGED TOTAL.js
3. Create CUSTOMERS, ORDERS, INVENTORY sheets
4. Basic sales.html with customer & order management

### Week 2: Customer Portal
1. customer.html ordering interface
2. Real-time inventory display
3. Order placement flow
4. Order confirmation SMS

### Week 3: CSA Module
1. CSA_MEMBERS sheet
2. Member portal in customer.html
3. Weekly box generation
4. Vacation hold management

### Week 4: Delivery System
1. ROUTES sheet
2. driver.html delivery app
3. Proof of delivery
4. Customer tracking page

### Week 5: Integration & Polish
1. Harvest → Inventory sync
2. Pick list generation
3. Packing labels
4. Campaign system

---

## Twilio SMS Setup (Required)

You'll need:
1. Twilio account (twilio.com)
2. Phone number (~$1/month)
3. API credentials (Account SID, Auth Token)

SMS will be sent via Apps Script using UrlFetchApp to Twilio's API.

---

## Next Steps

1. **Finish clasp login** so I can access your existing sheets
2. **Share your script IDs** so I can clone them locally
3. **Export your existing sales sheets as CSV** so I can understand the structure
4. **Start building sales.html** with the MVP features
