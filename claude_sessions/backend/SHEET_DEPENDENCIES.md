# SHEET DEPENDENCY MAP
## Backend Claude - Overnight Audit
**Date:** 2026-01-16

---

## SUMMARY

| Category | Sheets | Status |
|----------|--------|--------|
| Core Planning | 6 | ACTIVE |
| Reference Data | 9 | ACTIVE |
| Inventory | 4 | ACTIVE |
| Sales/CRM | 8 | ACTIVE |
| Delivery/Fleet | 5 | ACTIVE |
| Financial | 12 | ACTIVE |
| Employee | 3 | ACTIVE |
| Wildlife | 3 | ACTIVE |
| Marketing | 3 | ACTIVE |
| Integrations | 6 | ACTIVE |
| System/Logs | 8 | ACTIVE |
| Accounting | 11 | ACTIVE |
| **TOTAL** | **78** | - |

---

## CORE PLANNING SHEETS

### PLANNING_2026
**Primary planning sheet - Most referenced**
| Function | Line | Operation |
|----------|------|-----------|
| `getPlanningData()` | 1561 | READ |
| `populateTraySizesFromProfiles()` | 1620 | READ |
| `savePlantingFromWeb()` | 1730 | WRITE |
| `getWizardData()` | 4726 | READ |
| `submitPlanting()` | 4785 | WRITE |
| `getDashboardStats()` | 2194 | READ |
| `getGreenhouseSeedings()` | 2263 | READ |
| `saveSuccessionPlan()` | 2972 | WRITE |
| `getPlanning()` | 3060 | READ |
| `addPlanting()` | 3108 | WRITE |
| `deletePlantingById()` | 3220 | DELETE |
| `recordHarvest()` | 3288 | WRITE |
| `getGreenhouseSowingTasks()` | 5627 | READ |
| `getTransplantTasks()` | 5881 | READ |
| `getDirectSeedTasks()` | 5967 | READ |
| `getEmployeeTasks()` | 11822 | READ |

### DAILY_TASKS_GENERATED
| Function | Line | Operation |
|----------|------|-----------|
| `getDashboardStats()` | 2228 | READ |
| `getFieldTasks()` | 2865 | READ |
| `generateDailyTasks()` | 4133 | WRITE |

### DTM_LEARNING
| Function | Line | Operation |
|----------|------|-----------|
| `getDTMLearningData()` | 2924 | READ |
| `recordHarvest()` | 3389 | WRITE |
| `getLearnedDTM()` | 3503 | READ |

### HARVEST_LOG / HARVESTS
**Note: Two names used interchangeably**
| Function | Line | Operation |
|----------|------|-----------|
| `getHarvests()` | 3125 | READ |
| `getHarvestsByDateRange()` | 3153 | READ |
| `recordHarvest()` | 3432 | WRITE |
| `getSeasonSummary()` | 14244 | READ |

### MASTER_LOG
| Function | Line | Operation |
|----------|------|-----------|
| `completeTask()` | 3025 | WRITE |
| `registerSelectedPlanting()` | 4244 | READ |
| `registerHarvest()` | 4257 | READ |
| `generateAuditPDF()` | 4180 | READ |

### SUCCESSION_PLANS
| Function | Line | Operation |
|----------|------|-----------|
| `saveSuccessionPlan()` | 2972 | WRITE |

---

## REFERENCE DATA SHEETS

### REF_CropProfiles
| Function | Line | Operation |
|----------|------|-----------|
| `populateTraySizesFromProfiles()` | 1621 | READ |
| `getWizardDataWeb()` | 1951 | READ |
| `getGreenhouseSeedings()` | 2264 | READ |
| `getCrops()` | 3076 | READ |
| `getCropProfiles()` | 6517 | READ |
| `createCropProfile()` | 6467 | WRITE |
| `getCropTemplate()` | 4909 | READ |
| `saveNewCropProfile()` | 4965 | WRITE |

### REF_Beds
| Function | Line | Operation |
|----------|------|-----------|
| `getWizardDataWeb()` | 1950 | READ |
| `getBeds()` | 3092 | READ |
| `getDuplicateInitData()` | 4545 | READ |
| `generateVisualMap()` | 5163 | READ |

### REF_Fields
| Function | Line | Operation |
|----------|------|-----------|
| `generateFieldTabs()` | 3966 | READ |
| `recalculateAllFieldMath()` | 4361 | READ/WRITE |
| `applyFieldColors()` | 4105 | WRITE |
| `getFields()` | 12463 | READ |

### REF_Trays
| Function | Line | Operation |
|----------|------|-----------|
| `setupAllTables()` | 3731 | READ |
| `runBedCalculations()` | 4276 | READ |
| `updateTrayDropdowns()` | 5459 | READ |

### REF_Settings
| Function | Line | Operation |
|----------|------|-----------|
| `runFrostSafetyCheck()` | 5479 | READ |

### REF_Pricing
| Function | Line | Operation |
|----------|------|-----------|
| `generatePriceProjections()` | 4215 | READ |

### REF_Vendors
| Function | Line | Operation |
|----------|------|-----------|
| `fixAndEnrichVendors()` | 5548 | READ/WRITE |

### REF_Crops
| Function | Line | Operation |
|----------|------|-----------|
| `getProductsFromCrops()` | 8460 | READ |
| `syncFarmInventoryToShopify()` | 18811 | READ |

---

## INVENTORY SHEETS

### SEED_INVENTORY
| Function | Line | Operation |
|----------|------|-----------|
| `initSeedInventorySheet()` | 2384 | CREATE |
| `getSeedInventory()` | 2517 | READ |
| `getSeedByQR()` | 2592 | READ |
| `useSeedFromLot()` | 2641 | WRITE |
| `addSeedLot()` | 2432 | WRITE |

### SEED_USAGE_LOG
| Function | Line | Operation |
|----------|------|-----------|
| `logSeedUsage()` | 2722 | WRITE |
| `getSeedUsageHistory()` | 2760 | READ |

### INVENTORY_PRODUCTS
| Function | Line | Operation |
|----------|------|-----------|
| `deductSeedsForPlanting()` | 1820 | READ |
| `getInventoryProducts()` | 7308 | READ |
| `saveProduct()` | 7481 | WRITE |

### INVENTORY_TRANSACTIONS
| Function | Line | Operation |
|----------|------|-----------|
| `deductSeedsForPlanting()` | 1821 | WRITE |
| `getTransactionHistory()` | 7432 | READ |
| `recordTransaction()` | 7541 | WRITE |

### TRAY_INVENTORY
| Function | Line | Operation |
|----------|------|-----------|
| `getTrayInventory()` | 2093 | READ |
| `saveTrayInventory()` | 2147 | WRITE |

---

## SALES/CRM SHEETS

### SALES_ORDERS / SALES_Orders
| Function | Line | Operation |
|----------|------|-----------|
| `getSalesOrders()` | 8211 | READ |
| `getOrderById()` | 8253 | READ |
| `createSalesOrder()` | 8299 | WRITE |
| `updateSalesOrder()` | 8378 | WRITE |
| `getPickListForToday()` | 12564 | READ |
| `getPackingList()` | 12695 | READ |
| `completePackingOrder()` | 12741 | WRITE |
| `createInvoiceFromOrder()` | 19106 | READ |

### SALES_OrderItems
| Function | Line | Operation |
|----------|------|-----------|
| `getOrderItems()` | 8279 | READ |
| `createInvoiceFromOrder()` | 19107 | READ |

### SALES_CUSTOMERS
| Function | Line | Operation |
|----------|------|-----------|
| `getSalesCustomers()` | 8072 | READ |
| `getCustomerById()` | 8107 | READ |
| `createSalesCustomer()` | 8132 | WRITE |
| `updateSalesCustomer()` | 8176 | WRITE |

### CSA_MEMBERS
| Function | Line | Operation |
|----------|------|-----------|
| `getCSAMembers()` | 8524 | READ |
| `getSalesCSAMembers()` | 8556 | READ |
| `createCSAMember()` | 8560 | WRITE |
| `updateCSAMember()` | 8595 | WRITE |

### CSA_BoxContents
| Function | Line | Operation |
|----------|------|-----------|
| `getCSABoxContents()` | 8632 | READ |
| `customizeCSABox()` | 8664 | WRITE |

### PICK_LIST
| Function | Line | Operation |
|----------|------|-----------|
| `updatePickItemStatus()` | 12655 | WRITE |

### SMS_CAMPAIGNS
| Function | Line | Operation |
|----------|------|-----------|
| `getSMSCampaigns()` | 10780 | READ |
| `createSMSCampaign()` | 10810 | WRITE |
| `sendSMSCampaign()` | 10842 | WRITE |

### MAGIC_LINKS
| Function | Line | Operation |
|----------|------|-----------|
| `sendCustomerMagicLink()` | 7911 | WRITE |
| `verifyCustomerToken()` | 8005 | READ |

---

## DELIVERY & FLEET SHEETS

### DELIVERY_ROUTES
| Function | Line | Operation |
|----------|------|-----------|
| `getDeliveryRoutes()` | 8798 | READ |
| `createDeliveryRoute()` | 9318 | WRITE |
| `assignDeliveryRoute()` | 9367 | WRITE |

### DELIVERY_STOPS
| Function | Line | Operation |
|----------|------|-----------|
| `getRouteStops()` | 8831 | READ |
| `completeDelivery()` | 9097 | WRITE |
| `logDeliveryIssue()` | 9161 | WRITE |
| `updateDeliveryStopStatus()` | 9509 | WRITE |

### DELIVERY_LOG
| Function | Line | Operation |
|----------|------|-----------|
| `completeDelivery()` | 9069 | WRITE |
| `logDeliveryIssue()` | 9133 | WRITE |

### TIME_CLOCK
| Function | Line | Operation |
|----------|------|-----------|
| `handleClockIn()` | 9201 | WRITE |
| `handleClockOut()` | 9262 | WRITE |

### FLEET_ASSETS
| Function | Line | Operation |
|----------|------|-----------|
| `getFleetAssets()` | 10210 | READ |
| `createFleetAsset()` | 10270 | WRITE |
| `updateFleetAsset()` | 10306 | WRITE |

### FLEET_USAGE
| Function | Line | Operation |
|----------|------|-----------|
| `getFleetUsageLog()` | 10341 | READ |
| `logFleetUsage()` | 10380 | WRITE |

### FLEET_FUEL
| Function | Line | Operation |
|----------|------|-----------|
| `getFleetFuelLog()` | 10452 | READ |
| `logFleetFuel()` | 10484 | WRITE |

### FLEET_MAINTENANCE
| Function | Line | Operation |
|----------|------|-----------|
| `getFleetMaintenanceLog()` | 10516 | READ |
| `logFleetMaintenance()` | 10548 | WRITE |

---

## FINANCIAL SHEETS

### FIN_Debts
| Function | Line | Operation |
|----------|------|-----------|
| `getDebts()` | 15378 | READ |
| `saveDebt()` | 15435 | WRITE |
| `updateDebt()` | 15473 | WRITE |
| `deleteDebt()` | 15515 | DELETE |

### FIN_DebtPayments
| Function | Line | Operation |
|----------|------|-----------|
| `recordDebtPayment()` | 15545 | WRITE |
| `getDebtPayments()` | 15625 | READ |

### FIN_BankAccounts
| Function | Line | Operation |
|----------|------|-----------|
| `getBankAccounts()` | 15666 | READ |
| `saveBankAccount()` | 15709 | WRITE |
| `updateBankAccount()` | 15743 | WRITE |

### FIN_Bills
| Function | Line | Operation |
|----------|------|-----------|
| `getBills()` | 15780 | READ |
| `saveBill()` | 15878 | WRITE |
| `updateBill()` | 15914 | WRITE |

### FIN_Investments
| Function | Line | Operation |
|----------|------|-----------|
| `getInvestments()` | 15951 | READ |
| `saveInvestment()` | 15999 | WRITE |
| `updateInvestment()` | 16052 | WRITE |

### FIN_InvestmentHistory
| Function | Line | Operation |
|----------|------|-----------|
| `recordInvestmentHistory()` | 16085 | WRITE |
| `getInvestmentHistory()` | 16108 | READ |

### FIN_Employees
| Function | Line | Operation |
|----------|------|-----------|
| `getFinancialEmployees()` | 16150 | READ |
| `saveFinancialEmployee()` | 16232 | WRITE |
| `updateFinancialEmployee()` | 16269 | WRITE |

### FIN_EmployeeXP
| Function | Line | Operation |
|----------|------|-----------|
| `addEmployeeXP()` | 16302 | WRITE |
| `getEmployeeXP()` | 16367 | READ |

### FIN_Achievements
| Function | Line | Operation |
|----------|------|-----------|
| `unlockAchievement()` | 16404 | WRITE |
| `getEmployeeAchievements()` | 16449 | READ |

### FIN_RoundUps
| Function | Line | Operation |
|----------|------|-----------|
| `getRoundUps()` | 16487 | READ |
| `saveRoundUp()` | 16528 | WRITE |
| `recordRoundUpInvestment()` | 16570 | WRITE |

### FIN_Settings
| Function | Line | Operation |
|----------|------|-----------|
| `getFinancialSettings()` | 16786 | READ |
| `saveFinancialSettings()` | 16813 | WRITE |

---

## USER/EMPLOYEE SHEETS

### USERS
| Function | Line | Operation |
|----------|------|-----------|
| `authenticateUser()` | 1003 | READ |
| `getUsers()` | 1084 | READ |
| `createUser()` | 1163 | WRITE |
| `updateUser()` | 1201 | WRITE |
| `deactivateUser()` | 1248 | WRITE |
| `resetUserPin()` | 1284 | WRITE |
| `authenticateEmployee()` | 11495 | READ |

### SESSIONS
| Function | Line | Operation |
|----------|------|-----------|
| `getActiveSessions()` | 1341 | READ |
| `forceLogout()` | 1381 | DELETE |
| `createSession()` | 1419 | WRITE |

### AUDIT_LOG
| Function | Line | Operation |
|----------|------|-----------|
| `logAdminAction()` | 1468 | WRITE |
| `getAuditLog()` | 1497 | READ |

### EMPLOYEES
| Function | Line | Operation |
|----------|------|-----------|
| `authenticateEmployee()` | 11481 | READ |
| `sendCrewSMS()` | 13517 | READ |

---

## WILDLIFE SHEETS

### WILDLIFE_SIGHTINGS
| Function | Line | Operation |
|----------|------|-----------|
| `logWildlifeSighting()` | 12795 | WRITE |
| `getWildlifeMap()` | 13052 | READ |

### GROUNDHOG_DENS
| Function | Line | Operation |
|----------|------|-----------|
| `logGroundhogDen()` | 12838 | WRITE |
| `getGroundhogDens()` | 12881 | READ |
| `updateDenStatus()` | 12918 | WRITE |
| `getWildlifeMap()` | 13072 | READ |

### DAMAGE_REPORTS
| Function | Line | Operation |
|----------|------|-----------|
| `logDamageReport()` | 12949 | WRITE |
| `getDamageReports()` | 12992 | READ |
| `getWildlifeMap()` | 13092 | READ |

---

## MARKETING SHEETS

### MarketingPosts
| Function | Line | Operation |
|----------|------|-----------|
| `logMarketingPost()` | 6334 | WRITE |

### MARKETING_ActivityLog
| Function | Line | Operation |
|----------|------|-----------|
| `logMarketingActivity()` | 18234 | WRITE |

### FARM_PICS
| Function | Line | Operation |
|----------|------|-----------|
| `submitFarmPic()` | 17552 | WRITE |
| `getFarmPics()` | 17642 | READ |
| `approveFarmPic()` | 17703 | WRITE |

---

## INTEGRATION SHEETS

### PLAID_ITEMS
| Function | Line | Operation |
|----------|------|-----------|
| `savePlaidItem()` | 17013 | WRITE |
| `getPlaidItems()` | 17041 | READ |
| `getPlaidAccounts()` | 17076 | READ |
| `refreshPlaidBalances()` | 17254 | READ |
| `getPlaidTransactions()` | 17296 | READ |
| `disconnectPlaidItem()` | 17418 | DELETE |

### SHOPIFY_Orders
| Function | Line | Operation |
|----------|------|-----------|
| `syncShopifyOrders()` | 18683 | WRITE |
| `syncShopifyOrderToQuickBooks()` | 19181 | READ |
| `handleShopifyOrderWebhook()` | 19370 | WRITE |

### SHOPIFY_Products
| Function | Line | Operation |
|----------|------|-----------|
| `syncShopifyProducts()` | 18755 | WRITE |
| `syncFarmInventoryToShopify()` | 18812 | WRITE |
| `handleShopifyProductWebhook()` | 19407 | WRITE |

### QB_Customers
| Function | Line | Operation |
|----------|------|-----------|
| `syncQuickBooksCustomers()` | 18961 | WRITE |

### QB_Invoices
| Function | Line | Operation |
|----------|------|-----------|
| `createQuickBooksInvoice()` | 19077 | WRITE |

### INTEGRATION_Log
| Function | Line | Operation |
|----------|------|-----------|
| `logIntegration()` | 19253 | WRITE |

---

## SYSTEM/LOG SHEETS

### LOG_Weather
| Function | Line | Operation |
|----------|------|-----------|
| `logDailyWeather()` | 5299 | WRITE |
| `getWeatherSummaryForPeriod()` | 5352 | READ |

### LOG_Purchases
| Function | Line | Operation |
|----------|------|-----------|
| `generateAuditPDF()` | 4185 | READ |
| `runOrderImport()` | 5059 | WRITE |

### SMS_LOG
| Function | Line | Operation |
|----------|------|-----------|
| `logSMSToSheet()` | 13434 | WRITE |
| `getSMSHistory()` | 13576 | READ |

### SYS_UserManual
| Function | Line | Operation |
|----------|------|-----------|
| `updateProjectLog()` | 3652 | WRITE |
| `logSession()` | 5263 | WRITE |
| `startSession()` | 5280 | WRITE |

### IMPORT_Staging
| Function | Line | Operation |
|----------|------|-----------|
| `quickImportStaging()` | 4995 | READ |
| `analyzeStaging()` | 5067 | READ |
| `executeUniversalImport()` | 5080 | READ |

### VISUAL_FieldMap
| Function | Line | Operation |
|----------|------|-----------|
| `paintVisualMapDirectly()` | 4064 | WRITE |
| `generateVisualMap()` | 5168 | WRITE |

---

## DUPLICATE/AMBIGUOUS SHEET NAMES

| Concept | Name 1 | Name 2 | Recommendation |
|---------|--------|--------|----------------|
| Harvests | `HARVEST_LOG` | `HARVESTS` | Standardize to `HARVESTS` |
| Employees | `EMPLOYEES` | `USERS` | Clarify: USERS=auth, EMPLOYEES=HR |
| Crops | `REF_CropProfiles` | `REF_Crops` | Clarify purpose of each |
| Fields | `REF_Fields` | `FIELD_MAP` | Consolidate |

---

## MISSING SHEETS (Referenced but may not exist)

The following sheets are referenced with fallback patterns, suggesting they may be missing:

```javascript
// Line 13517
ss.getSheetByName('EMPLOYEES') || ss.getSheetByName('USERS')

// Line 14244
ss.getSheetByName('HARVESTS') || ss.getSheetByName('HARVEST_LOG')

// Line 12463
ss.getSheetByName('REF_Fields') || ss.getSheetByName('FIELD_MAP')
```

---

## AUTO-CREATED SHEETS

These sheets are created automatically if missing:

| Sheet | Created By | Line |
|-------|------------|------|
| `USERS` | `createUsersSheet()` | 1115 |
| `SESSIONS` | `createSessionsSheet()` | 1330 |
| `AUDIT_LOG` | `createAuditLogSheet()` | 1457 |
| `SEED_INVENTORY` | `initSeedInventorySheet()` | 2382 |
| `SEED_USAGE_LOG` | `logSeedUsage()` | 2722 |
| `DTM_LEARNING` | `getDTMLearningData()` | 2924 |
| `MarketingPosts` | `logMarketingPost()` | 6334 |
| All FIN_* sheets | `createFinancialSheets()` | 15234 |

---

*Sheet Dependency Map Complete - Backend Claude*
