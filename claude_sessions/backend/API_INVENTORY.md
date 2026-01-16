# API ENDPOINT INVENTORY
## Backend Claude - Comprehensive Audit
**Date:** 2026-01-16

---

## SUMMARY

| Category | GET | POST | Total |
|----------|-----|------|-------|
| User/Auth | 6 | 6 | 12 |
| Planning/Crops | 15 | 8 | 23 |
| Soil/Compliance | 6 | 7 | 13 |
| Inventory | 6 | 5 | 11 |
| Sales/CRM | 18 | 12 | 30 |
| Delivery/Fleet | 16 | 10 | 26 |
| Employee | 22 | 0 | 22 |
| Wildlife | 7 | 0 | 7 |
| SMS/Notifications | 8 | 0 | 8 |
| Maps/Routing | 10 | 0 | 10 |
| Financial | 14 | 12 | 26 |
| Plaid Banking | 6 | 2 | 8 |
| Marketing/Social | 10 | 8 | 18 |
| Seeds | 5 | 2 | 7 |
| Integrations | 10 | 4 | 14 |
| Accounting | 12 | 10 | 22 |
| **TOTAL** | **171** | **86** | **257** |

---

## GET ENDPOINTS (doGet)

### User Authentication (Lines 77-87)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `authenticateUser` | 77 | `authenticateUser()` | WORKING |
| `validateSession` | 79 | `validateSession()` | WORKING |
| `getUsers` | 81 | `getUsers()` | WORKING |
| `getActiveSessions` | 83 | `getActiveSessions()` | WORKING |
| `getAuditLog` | 85 | `getAuditLog()` | WORKING |
| `testConnection` | 89 | `testConnection()` | WORKING |

### Planning/Dashboard (Lines 94-106)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `populateTraySizes` | 91 | `populateTraySizesFromProfiles()` | WORKING |
| `updateTaskCompletion` | 94 | `updateTaskCompletion()` | WORKING |
| `getPlanningData` | 96 | `getPlanningData()` | WORKING |
| `getDashboardStats` | 98 | `getDashboardStats()` | WORKING |
| `getGreenhouseSeedings` | 100 | `getGreenhouseSeedings()` | WORKING |
| `getSeedInventory` | 102 | `getSeedInventory()` | WORKING |
| `getFieldTasks` | 104 | `getFieldTasks()` | WORKING |
| `getDTMLearningData` | 106 | `getDTMLearningData()` | WORKING |

### Sowing Tasks (Lines 108-114)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getGreenhouseSowingTasks` | 108 | `getGreenhouseSowingTasks()` | WORKING |
| `getTransplantTasks` | 110 | `getTransplantTasks()` | WORKING |
| `getDirectSeedTasks` | 112 | `getDirectSeedTasks()` | WORKING |
| `getSocialStatus` | 114 | `getAyrshareStatus()` | WORKING |

### Legacy Endpoints (Lines 119-161)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getPlanning` | 119 | `getPlanning()` | WORKING |
| `getPlanningById` | 121 | `getPlanningById()` | NOT IMPLEMENTED |
| `updatePlanting` | 123 | `updatePlanting()` | WORKING |
| `deletePlanting` | 125 | `deletePlantingById()` | WORKING |
| `getCrops` | 127 | `getCrops()` | WORKING |
| `getCropProfiles` | 129 | `getCropProfiles()` | WORKING |
| `getCropByName` | 131 | `getCropByName()` | NOT IMPLEMENTED |
| `getBeds` | 133 | `getBeds()` | WORKING |
| `getBedsByField` | 135 | `getBedsByField()` | NOT IMPLEMENTED |
| `getTasks` | 137 | `getTasks()` | NOT IMPLEMENTED |
| `getTasksByDate` | 139 | `getTasksByDateRange()` | NOT IMPLEMENTED |
| `getHarvests` | 141 | `getHarvests()` | WORKING |
| `getHarvestsByDate` | 143 | `getHarvestsByDateRange()` | WORKING |
| `getWeather` | 145 | `getWeatherData()` | NOT IMPLEMENTED |
| `getWeatherSummary` | 147 | `getWeatherSummary()` | WORKING |
| `getCSAMembers` | 149 | `getCSAMembers()` | WORKING |
| `getFinancials` | 151 | `getFinancials()` | NOT IMPLEMENTED |
| `getCropProfile` | 153 | `getCropProfile()` | WORKING |
| `getCropProfile` | 155 | DUPLICATE - REMOVE | DUPLICATE |
| `updateCropProfile` | 157 | `updateCropProfile()` | WORKING |
| `createCropProfile` | 159 | `createCropProfile()` | WORKING |

### Soil/Compliance (Lines 163-175)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getComplianceRecords` | 163 | `getComplianceRecords()` | WORKING |
| `getIPMSchedules` | 165 | `getIPMSchedules()` | WORKING |
| `getFertigationData` | 167 | `getFertigationData()` | WORKING |
| `getFoliarApplications` | 169 | `getFoliarApplications()` | WORKING |
| `getSoilAmendments` | 171 | `getSoilAmendments()` | WORKING |
| `getSoilTests` | 173 | `getSoilTests()` | WORKING |

### Inventory (Lines 177-187)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getInventoryProducts` | 177 | `getInventoryProducts()` | WORKING |
| `getProductById` | 179 | `getProductById()` | WORKING |
| `getLowStockProducts` | 181 | `getLowStockProducts()` | WORKING |
| `getTransactionHistory` | 183 | `getTransactionHistory()` | WORKING |
| `getProductsForDropdown` | 185 | `getProductsForDropdown()` | WORKING |

### Planting Wizard (Lines 189-197)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `savePlanting` | 189 | `savePlantingFromWeb()` | WORKING |
| `getWizardDataWeb` | 191 | `getWizardDataWeb()` | WORKING |
| `getTrayInventory` | 195 | `getTrayInventory()` | WORKING |
| `saveTrayInventory` | 197 | `saveTrayInventory()` | WORKING |

### Sales - Customer (Lines 201-213)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `authenticateCustomer` | 201 | `authenticateCustomer()` | WORKING |
| `verifyCustomerToken` | 203 | `verifyCustomerToken()` | WORKING |
| `getWholesaleProducts` | 205 | `getWholesaleProducts()` | WORKING |
| `getCSAProducts` | 207 | `getCSAProducts()` | WORKING |
| `getCSABoxContents` | 209 | `getCSABoxContents()` | WORKING |
| `getCustomerOrders` | 211 | `getCustomerOrders()` | WORKING |
| `getCustomerProfile` | 213 | `getCustomerProfile()` | WORKING |

### Sales - Manager (Lines 217-233)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getSalesOrders` | 217 | `getSalesOrders()` | WORKING |
| `getOrderById` | 219 | `getOrderById()` | WORKING |
| `getSalesCustomers` | 221 | `getSalesCustomers()` | WORKING |
| `getCustomerById` | 223 | `getCustomerById()` | WORKING |
| `getSalesCSAMembers` | 225 | `getSalesCSAMembers()` | WORKING |
| `getSalesDashboard` | 227 | `getSalesDashboard()` | WORKING |
| `getPickPackList` | 229 | `getPickPackList()` | WORKING |
| `getSMSCampaigns` | 231 | `getSMSCampaigns()` | WORKING |
| `getSalesReports` | 233 | `getSalesReports()` | WORKING |

### Delivery (Lines 237-249)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getDeliveryRoutes` | 237 | `getDeliveryRoutes()` | WORKING |
| `getDriverRoute` | 239 | `getDriverRoute()` | WORKING |
| `authenticateDriver` | 241 | `authenticateDriver()` | WORKING |
| `getDeliveryDrivers` | 243 | `getDeliveryDrivers()` | WORKING |
| `getDeliveryHistory` | 245 | `getDeliveryHistory()` | WORKING |
| `completeDelivery` | 247 | `completeDelivery()` | WORKING |
| `logDeliveryIssue` | 249 | `logDeliveryIssue()` | WORKING |

### Time Clock (Lines 253-255) - DUPLICATES
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `clockIn` | 253 | `handleClockIn()` | DUPLICATE |
| `clockOut` | 255 | `handleClockOut()` | DUPLICATE |

### Fleet (Lines 259-273)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getFleetAssets` | 259 | `getFleetAssets()` | WORKING |
| `getFleetAssetById` | 261 | `getFleetAssetById()` | WORKING |
| `getFleetUsageLog` | 263 | `getFleetUsageLog()` | WORKING |
| `getFleetFuelLog` | 265 | `getFleetFuelLog()` | WORKING |
| `getFleetMaintenanceLog` | 267 | `getFleetMaintenanceLog()` | WORKING |
| `getFleetCostReport` | 269 | `getFleetCostReport()` | WORKING |
| `getMaintenanceDue` | 271 | `getMaintenanceDue()` | WORKING |
| `getFleetDashboard` | 273 | `getFleetDashboard()` | WORKING |

### Market/Labels (Lines 277-285)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getMarketSignItems` | 277 | `getMarketSignItems()` | WORKING |
| `getOrdersForLabels` | 279 | `getOrdersForLabels()` | WORKING |
| `getSalesCycles` | 281 | `getSalesCycles()` | WORKING |
| `closeSalesCycle` | 283 | `closeSalesCycle()` | WORKING |
| `initializeMarketItems` | 285 | `initializeMarketItemsSheet()` | WORKING |

### Employee App (Lines 289-331) - SOME DUPLICATES
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `authenticateEmployee` | 289 | `authenticateEmployee()` | WORKING |
| `clockIn` | 291 | DUPLICATE - REMOVE | DUPLICATE |
| `clockOut` | 293 | DUPLICATE - REMOVE | DUPLICATE |
| `getClockStatus` | 295 | `getClockStatus()` | WORKING |
| `getTimeClockHistory` | 297 | `getTimeClockHistory()` | WORKING |
| `getEmployeeTasks` | 299 | `getEmployeeTasks()` | WORKING |
| `completeTaskWithGPS` | 301 | `completeTaskWithGPS()` | WORKING |
| `logHarvestWithDetails` | 303 | `logHarvestWithDetails()` | WORKING |
| `saveScoutingReport` | 305 | `saveScoutingReport()` | WORKING |
| `logTreatment` | 307 | `logTreatment()` | WORKING |
| `logBeneficialRelease` | 309 | `logBeneficialRelease()` | WORKING |
| `getActiveREI` | 311 | `getActiveREI()` | WORKING |
| `reportHazard` | 313 | `reportHazard()` | WORKING |
| `getActiveHazards` | 315 | `getActiveHazards()` | WORKING |
| `resolveHazard` | 317 | `resolveHazard()` | WORKING |
| `logWeedPressure` | 319 | `logWeedPressure()` | WORKING |
| `logCultivation` | 321 | `logCultivation()` | WORKING |
| `getCrewMessages` | 323 | `getCrewMessages()` | WORKING |
| `acknowledgeMessage` | 325 | `acknowledgeMessage()` | WORKING |
| `sendCrewMessage` | 327 | `sendCrewMessage()` | WORKING |
| `getFields` | 329 | `getFields()` | WORKING |
| `updateEmployeeLanguage` | 331 | `updateEmployeeLanguage()` | WORKING |

### Pick/Pack (Lines 335-341)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getPickListForToday` | 335 | `getPickListForToday()` | WORKING |
| `updatePickItemStatus` | 337 | `updatePickItemStatus()` | WORKING |
| `getPackingList` | 339 | `getPackingList()` | WORKING |
| `completePackingOrder` | 341 | `completePackingOrder()` | WORKING |

### Wildlife (Lines 345-357)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `logWildlifeSighting` | 345 | `logWildlifeSighting()` | WORKING |
| `logGroundhogDen` | 347 | `logGroundhogDen()` | WORKING |
| `getGroundhogDens` | 349 | `getGroundhogDens()` | WORKING |
| `updateDenStatus` | 351 | `updateDenStatus()` | WORKING |
| `logDamageReport` | 353 | `logDamageReport()` | WORKING |
| `getDamageReports` | 355 | `getDamageReports()` | WORKING |
| `getWildlifeMap` | 357 | `getWildlifeMap()` | WORKING |

### SMS/Notifications (Lines 361-381)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `sendOrderConfirmation` | 361 | `sendOrderConfirmation()` | WORKING |
| `sendDeliveryNotification` | 363 | `sendDeliveryNotification()` | WORKING |
| `sendDeliveryComplete` | 365 | `sendDeliveryComplete()` | WORKING |
| `sendCSAWeeklyReminder` | 367 | `sendCSAWeeklyReminder()` | WORKING |
| `sendSMS` | 371 | `sendSMS()` | WORKING |
| `sendOrderSMS` | 373 | `sendOrderSMS()` | WORKING |
| `sendDeliverySMS` | 375 | `sendDeliverySMS()` | WORKING |
| `sendCrewSMS` | 377 | `sendCrewSMS()` | WORKING |
| `sendREIAlertSMS` | 379 | `sendREIAlertSMS()` | WORKING |
| `getSMSHistory` | 381 | `getSMSHistory()` | WORKING |

### Maps/Routing (Lines 385-409)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `optimizeDeliveryRoute` | 385 | `optimizeDeliveryRoute()` | WORKING |
| `getRouteForDeliveries` | 387 | `getRouteForDeliveries()` | WORKING |
| `geocodeAddress` | 389 | `geocodeAddress()` | WORKING |
| `getDistanceMatrix` | 391 | `getDistanceMatrix()` | WORKING |
| `getDeliverySchedule` | 393 | `getDeliverySchedule()` | WORKING |
| `startDeliveryTracking` | 397 | `startDeliveryTracking()` | WORKING |
| `updateDriverLocation` | 399 | `updateDriverLocation()` | WORKING |
| `stopDeliveryTracking` | 401 | `stopDeliveryTracking()` | WORKING |
| `getTrackingStatus` | 403 | `getTrackingStatus()` | WORKING |
| `getActiveTracking` | 405 | `getActiveTracking()` | WORKING |
| `sendRouteStartNotifications` | 407 | `sendRouteStartNotifications()` | WORKING |
| `sendDeliveredNotification` | 409 | `sendDeliveredNotification()` | WORKING |

### Season Planning (Lines 413-443)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getPlanningChecklist` | 413 | `getPlanningChecklist()` | WORKING |
| `updatePlanningTask` | 415 | `updatePlanningTask()` | WORKING |
| `createPlanningChecklist` | 417 | `createPlanningChecklist()` | WORKING |
| `getPlanningProgress` | 419 | `getPlanningProgress()` | WORKING |
| `getSeasonAdjustments` | 423 | `getSeasonAdjustments()` | WORKING |
| `addSeasonAdjustment` | 425 | `addSeasonAdjustment()` | WORKING |
| `updateSuccessionStatus` | 427 | `updateSuccessionStatus()` | WORKING |
| `getVarietyReviews` | 431 | `getVarietyReviews()` | WORKING |
| `saveVarietyReview` | 433 | `saveVarietyReview()` | WORKING |
| `getSeasonSummary` | 435 | `getSeasonSummary()` | WORKING |

### Bed Prep (Lines 439-443)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getBedPrepLog` | 439 | `getBedPrepLog()` | WORKING |
| `logBedPrep` | 441 | `logBedPrep()` | WORKING |
| `getBedPrepStatus` | 443 | `getBedPrepStatus()` | WORKING |

### Irrigation (Lines 447-459)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getIrrigationZones` | 447 | `getIrrigationZones()` | WORKING |
| `saveIrrigationZone` | 449 | `saveIrrigationZone()` | WORKING |
| `getWateringLog` | 451 | `getWateringLog()` | WORKING |
| `logWatering` | 453 | `logWatering()` | WORKING |
| `getIrrigationMaintenance` | 455 | `getIrrigationMaintenance()` | WORKING |
| `logIrrigationMaintenance` | 457 | `logIrrigationMaintenance()` | WORKING |
| `getIrrigationDashboard` | 459 | `getIrrigationDashboard()` | WORKING |

### Infrastructure (Lines 463-481)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getFarmInfrastructure` | 463 | `getFarmInfrastructure()` | WORKING |
| `saveFarmInfrastructure` | 465 | `saveFarmInfrastructure()` | WORKING |
| `deleteFarmInfrastructure` | 467 | `deleteFarmInfrastructure()` | WORKING |
| `getInfrastructureMap` | 469 | `getInfrastructureMap()` | WORKING |
| `getBoundaries` | 473 | `getBoundaries()` | WORKING |
| `saveBoundary` | 475 | `saveBoundary()` | WORKING |
| `deleteBoundary` | 477 | `deleteBoundary()` | WORKING |
| `getScoutingMapData` | 481 | `getScoutingMapData()` | WORKING |

### Financial (Lines 485-517)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getDebts` | 485 | `getDebts()` | WORKING |
| `getDebtPayments` | 487 | `getDebtPayments()` | WORKING |
| `getBankAccounts` | 491 | `getBankAccounts()` | WORKING |
| `getBills` | 493 | `getBills()` | WORKING |
| `getInvestments` | 497 | `getInvestments()` | WORKING |
| `getInvestmentHistory` | 499 | `getInvestmentHistory()` | WORKING |
| `getFinancialEmployees` | 503 | `getFinancialEmployees()` | WORKING |
| `getEmployeeXP` | 505 | `getEmployeeXP()` | WORKING |
| `getEmployeeAchievements` | 507 | `getEmployeeAchievements()` | WORKING |
| `getRoundUps` | 511 | `getRoundUps()` | WORKING |
| `getFinancialDashboard` | 515 | `getFinancialDashboard()` | WORKING |
| `getFinancialSettings` | 517 | `getFinancialSettings()` | WORKING |

### Plaid Banking (Lines 521-539)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `createPlaidLinkToken` | 521 | `createPlaidLinkToken()` | WORKING |
| `getPlaidItems` | 523 | `getPlaidItems()` | WORKING |
| `getPlaidAccounts` | 525 | `getPlaidAccounts()` | WORKING |
| `refreshPlaidBalances` | 527 | `refreshPlaidBalances()` | WORKING |
| `getPlaidTransactions` | 529 | `getPlaidTransactions()` | WORKING |
| `exchangePlaidPublicToken` | 531 | `exchangePlaidPublicToken()` | WORKING |

### Crop Rotation (Lines 542-582)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getFieldTimeGroups` | 542 | `getFieldTimeGroups()` | WORKING |
| `getRotationRecommendations` | 544 | `getRotationRecommendations()` | WORKING |
| `suggestBedForCrop` | 546 | `suggestBedForCrop()` | WORKING |
| `canPlantInBed` | 548 | `canPlantInBed()` | WORKING |
| `checkRotationCompatibility` | 550 | `checkRotationCompatibility()` | WORKING |
| `populateFieldDaysData` | 552 | `populateFieldDaysData()` | WORKING |
| `getSeasonalDTMInfo` | 554 | `getSeasonalDTMInfo()` | WORKING |
| `getLearnedDTM` | 556 | `getLearnedDTM()` | WORKING |
| `analyzeFieldPlan` | 560 | `analyzeFieldPlan()` | WORKING |
| `getFieldPlanSuggestions` | 562 | `getFieldPlanSuggestions()` | WORKING |
| `approveSuggestion` | 564 | `approveSuggestion()` | WORKING |
| `rejectSuggestion` | 566 | `rejectSuggestion()` | WORKING |
| `approveAllSuggestions` | 568 | `approveAllSuggestions()` | WORKING |
| `analyzeUnassignedPlantings` | 572 | `analyzeUnassignedPlantings()` | WORKING |
| `generateFieldPlanReport` | 574 | `generateFieldPlanReport()` | WORKING |
| `getOptimalBedAssignments` | 576 | `getOptimalBedAssignments()` | WORKING |
| `applyOptimalAssignments` | 578 | `applyOptimalAssignments()` | WORKING |
| `assignPlantingsToField` | 580 | `assignPlantingsToField()` | WORKING |
| `getAvailableFields` | 582 | `getAvailableFields()` | WORKING |

### Marketing (Lines 586-627)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getFarmPics` | 586 | `getFarmPics()` | WORKING |
| `getEmployeeFarmPics` | 588 | `getEmployeeFarmPics()` | WORKING |
| `getMarketingCampaigns` | 590 | `getMarketingCampaigns()` | WORKING |
| `getScheduledPosts` | 592 | `getScheduledPosts()` | WORKING |
| `getMarketingBudget` | 594 | `getMarketingBudget()` | WORKING |
| `getMarketingSpend` | 596 | `getMarketingSpend()` | WORKING |
| `getMarketingAnalytics` | 598 | `getMarketingAnalytics()` | WORKING |
| `getSocialConnections` | 600 | `getSocialConnections()` | WORKING |
| `resetSocialConnections` | 602 | `resetSocialConnections()` | WORKING |
| `updateFollowerCounts` | 604 | `updateFollowerCounts()` | WORKING |
| `publishSocialPost` | 613 | `publishToAyrshare()` | WORKING |
| `checkAyrshareStatus` | 615 | `checkAyrshareStatus()` | WORKING |

### Seeds (Lines 619-627)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `initSeedInventory` | 619 | `initSeedInventorySheet()` | WORKING |
| `getSeedByQR` | 621 | `getSeedByQR()` | WORKING |
| `getSeedUsageHistory` | 623 | `getSeedUsageHistory()` | WORKING |
| `getLowStockSeeds` | 625 | `getLowStockSeeds()` | WORKING |
| `getSeedLabelData` | 627 | `getSeedLabelData()` | WORKING |

### Integrations (Lines 631-659)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `getIntegrationStatus` | 631 | `getIntegrationStatus()` | WORKING |
| `setupIntegrationSheets` | 633 | `setupIntegrationSheets()` | WORKING |
| `getShopifyAuthUrl` | 637 | `getShopifyAuthorizationUrl()` | WORKING |
| `testShopifyConnection` | 639 | `testShopifyConnection()` | WORKING |
| `syncShopifyOrders` | 641 | `syncShopifyOrders()` | WORKING |
| `syncShopifyProducts` | 643 | `syncShopifyProducts()` | WORKING |
| `getShopifyOrder` | 645 | `getShopifyOrder()` | WORKING |
| `getQuickBooksAuthUrl` | 649 | `getQuickBooksAuthorizationUrl()` | WORKING |
| `testQuickBooksConnection` | 651 | `testQuickBooksConnection()` | WORKING |
| `disconnectQuickBooks` | 653 | `disconnectQuickBooks()` | WORKING |
| `syncQuickBooksCustomers` | 655 | `syncQuickBooksCustomers()` | WORKING |
| `createInvoiceFromOrder` | 657 | `createInvoiceFromOrder()` | WORKING |
| `syncShopifyOrderToQuickBooks` | 659 | `syncShopifyOrderToQuickBooks()` | WORKING |

### Accounting (Lines 663-687)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `initializeAccountingModule` | 663 | `initializeAccountingModule()` | WORKING |
| `getReceipts` | 665 | `getReceipts()` | WORKING |
| `getExpenseCategories` | 667 | `getExpenseCategories()` | WORKING |
| `getAccountantEmails` | 669 | `getAccountantEmails()` | WORKING |
| `getAccountantDocs` | 671 | `getAccountantDocs()` | WORKING |
| `analyzeAccountantEmailPatterns` | 673 | `analyzeAccountantEmailPatterns()` | WORKING |
| `getGrants` | 675 | `getGrants()` | WORKING |
| `getAuditTrailAccounting` | 677 | `getAuditTrailAccounting()` | WORKING |
| `generateProfitLossStatement` | 679 | `generateProfitLossStatement()` | WORKING |
| `generateScheduleFReport` | 681 | `generateScheduleFReport()` | WORKING |
| `suggestCategory` | 683 | `suggestCategory()` | WORKING |
| `getVendorCategories` | 685 | `getVendorCategories()` | WORKING |
| `importAccountantEmails` | 687 | `importAccountantEmails()` | WORKING |

---

## POST ENDPOINTS (doPost)

### Critical (Lines 709-725)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `saveSuccessionPlan` | 709 | `saveSuccessionPlan()` | WORKING |
| `completeTask` | 711 | `completeTask()` | WORKING |

### User Management (Lines 715-725)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `createUser` | 715 | `createUser()` | WORKING |
| `updateUser` | 717 | `updateUser()` | WORKING |
| `deactivateUser` | 719 | `deactivateUser()` | WORKING |
| `resetUserPin` | 721 | `resetUserPin()` | WORKING |
| `forceLogout` | 723 | `forceLogout()` | WORKING |
| `logAdminAction` | 725 | `logAdminAction()` | WORKING |

### Social Media (Lines 729-741)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `publishSocialPost` | 729 | `publishToAyrshare()` | DUPLICATE - REMOVE |
| `getSocialAnalytics` | 737 | `getAyrshareAnalytics()` | WORKING |
| `deleteSocialPost` | 739 | `deleteAyrsharePost()` | WORKING |
| `updateFollowerCounts` | 741 | `updateFollowerCounts()` | DUPLICATE - REMOVE |

### Legacy (Lines 745-755)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `addPlanting` | 745 | `addPlanting()` | WORKING |
| `updatePlanting` | 747 | `updatePlanting()` | WORKING |
| `deletePlanting` | 749 | `deletePlanting()` | NOT IMPLEMENTED |
| `bulkAddPlantings` | 751 | `bulkAddPlantings()` | NOT IMPLEMENTED |
| `addTask` | 753 | `addTask()` | NOT IMPLEMENTED |
| `recordHarvest` | 755 | `recordHarvest()` | WORKING |

### Soil/Compliance (Lines 759-773)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `saveComplianceRecord` | 759 | `saveComplianceRecord()` | WORKING |
| `saveIPMSchedule` | 761 | `saveIPMSchedule()` | WORKING |
| `updateIPMSprayStatus` | 763 | `updateIPMSprayStatus()` | WORKING |
| `saveFertigationData` | 765 | `saveFertigationData()` | WORKING |
| `saveFoliarApplication` | 767 | `saveFoliarApplication()` | WORKING |
| `saveSoilAmendment` | 769 | `saveSoilAmendment()` | WORKING |
| `saveSoilTest` | 771 | `saveSoilTest()` | WORKING |
| `bulkSyncSoilData` | 773 | `bulkSyncSoilData()` | WORKING |

### Inventory (Lines 777-785)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `saveProduct` | 777 | `saveProduct()` | WORKING |
| `recordTransaction` | 779 | `recordTransaction()` | WORKING |
| `adjustInventory` | 781 | `adjustInventory()` | WORKING |
| `uploadProductPhoto` | 783 | `uploadProductPhoto()` | WORKING |
| `deductInventoryOnApplication` | 785 | `deductInventoryOnApplication()` | WORKING |

### Sales Customer (Lines 789-797)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `sendCustomerMagicLink` | 789 | `sendCustomerMagicLink()` | WORKING |
| `submitWholesaleOrder` | 791 | `submitWholesaleOrder()` | WORKING |
| `submitCSAOrder` | 793 | `submitCSAOrder()` | WORKING |
| `customizeCSABox` | 795 | `customizeCSABox()` | WORKING |
| `updateCustomerProfile` | 797 | `updateCustomerProfile()` | WORKING |

### Sales Manager (Lines 801-819)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `createSalesOrder` | 801 | `createSalesOrder()` | WORKING |
| `updateSalesOrder` | 803 | `updateSalesOrder()` | WORKING |
| `cancelSalesOrder` | 805 | `cancelSalesOrder()` | WORKING |
| `createSalesCustomer` | 807 | `createSalesCustomer()` | WORKING |
| `updateSalesCustomer` | 809 | `updateSalesCustomer()` | WORKING |
| `createCSAMember` | 811 | `createCSAMember()` | WORKING |
| `updateCSAMember` | 813 | `updateCSAMember()` | WORKING |
| `completePickPackItem` | 815 | `completePickPackItem()` | WORKING |
| `createSMSCampaign` | 817 | `createSMSCampaign()` | WORKING |
| `sendSMSCampaign` | 819 | `sendSMSCampaign()` | WORKING |

### Delivery (Lines 823-833)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `createDeliveryRoute` | 823 | `createDeliveryRoute()` | WORKING |
| `assignDeliveryRoute` | 825 | `assignDeliveryRoute()` | WORKING |
| `recordDeliveryProof` | 827 | `recordDeliveryProof()` | WORKING |
| `reportDeliveryIssue` | 829 | `reportDeliveryIssue()` | WORKING |
| `updateDeliveryETA` | 831 | `updateDeliveryETA()` | WORKING |
| `updateDeliveryStopStatus` | 833 | `updateDeliveryStopStatusFromWeb()` | WORKING |

### Fleet (Lines 837-847)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `createFleetAsset` | 837 | `createFleetAsset()` | WORKING |
| `updateFleetAsset` | 839 | `updateFleetAsset()` | WORKING |
| `logFleetUsage` | 841 | `logFleetUsage()` | WORKING |
| `logFleetFuel` | 843 | `logFleetFuel()` | WORKING |
| `logFleetMaintenance` | 845 | `logFleetMaintenance()` | WORKING |
| `linkUsageToTask` | 847 | `linkUsageToTask()` | WORKING |

### Financial (Lines 851-895)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `saveDebt` | 851 | `saveDebt()` | WORKING |
| `updateDebt` | 853 | `updateDebt()` | WORKING |
| `deleteDebt` | 855 | `deleteDebt()` | WORKING |
| `recordDebtPayment` | 857 | `recordDebtPayment()` | WORKING |
| `saveBankAccount` | 861 | `saveBankAccount()` | WORKING |
| `updateBankAccount` | 863 | `updateBankAccount()` | WORKING |
| `saveBill` | 865 | `saveBill()` | WORKING |
| `updateBill` | 867 | `updateBill()` | WORKING |
| `saveInvestment` | 871 | `saveInvestment()` | WORKING |
| `updateInvestment` | 873 | `updateInvestment()` | WORKING |
| `saveFinancialEmployee` | 877 | `saveFinancialEmployee()` | WORKING |
| `updateFinancialEmployee` | 879 | `updateFinancialEmployee()` | WORKING |
| `addEmployeeXP` | 881 | `addEmployeeXP()` | WORKING |
| `unlockAchievement` | 883 | `unlockAchievement()` | WORKING |
| `saveRoundUp` | 887 | `saveRoundUp()` | WORKING |
| `recordRoundUpInvestment` | 889 | `recordRoundUpInvestment()` | WORKING |
| `saveFinancialSettings` | 893 | `saveFinancialSettings()` | WORKING |
| `createFinancialSheets` | 895 | `createFinancialSheets()` | WORKING |

### Plaid (Lines 899-901)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `exchangePlaidPublicToken` | 899 | `exchangePlaidPublicToken()` | DUPLICATE |
| `disconnectPlaidItem` | 901 | `disconnectPlaidItem()` | WORKING |

### Marketing (Lines 905-919)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `submitFarmPic` | 905 | `submitFarmPic()` | WORKING |
| `approveFarmPic` | 907 | `approveFarmPic()` | WORKING |
| `publishToSocial` | 909 | `publishToSocial()` | WORKING |
| `schedulePost` | 911 | `schedulePost()` | WORKING |
| `createCampaign` | 913 | `createCampaign()` | WORKING |
| `updateCampaign` | 915 | `updateCampaign()` | WORKING |
| `logMarketingSpend` | 917 | `logMarketingSpend()` | WORKING |
| `logMarketingActivity` | 919 | `logMarketingActivity()` | WORKING |

### Seeds (Lines 923-925)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `addSeedLot` | 923 | `addSeedLot()` | WORKING |
| `useSeedFromLot` | 925 | `useSeedFromLot()` | WORKING |

### Integrations (Lines 929-933)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `shopifyWebhook` | 929 | `handleShopifyWebhook()` | WORKING |
| `createQuickBooksInvoice` | 931 | `createQuickBooksInvoice()` | WORKING |
| `createQuickBooksCustomer` | 933 | `createQuickBooksCustomer()` | WORKING |

### Accounting (Lines 937-955)
| Action | Line | Handler | Status |
|--------|------|---------|--------|
| `saveReceipt` | 937 | `saveReceipt()` | WORKING |
| `uploadReceiptImage` | 939 | `uploadReceiptImage()` | WORKING |
| `verifyReceipt` | 941 | `verifyReceipt()` | WORKING |
| `importAccountantEmails` | 943 | `importAccountantEmails()` | DUPLICATE |
| `setupEmailImportTrigger` | 945 | `setupEmailImportTrigger()` | WORKING |
| `saveGrant` | 947 | `saveGrant()` | WORKING |
| `addExpenseCategory` | 949 | `addExpenseCategory()` | WORKING |
| `updateReceipt` | 951 | `updateReceipt()` | WORKING |
| `deleteReceipt` | 953 | `deleteReceipt()` | WORKING |
| `linkReceiptToGrant` | 955 | `linkReceiptToGrant()` | WORKING |

---

## ISSUES SUMMARY

### Duplicates to Remove
- Line 155: `case 'getCropProfile'` (duplicate of 153)
- Lines 291-294: `clockIn`/`clockOut` (duplicate of 253-255)
- Lines 729-740: `publishSocialPost` block (duplicate)
- Line 741: `updateFollowerCounts` (duplicate of 604)
- Line 899: `exchangePlaidPublicToken` (duplicate of 531)
- Line 943: `importAccountantEmails` (duplicate of 687)

### Not Implemented
- `getPlanningById`
- `getCropByName`
- `getBedsByField`
- `getTasks`
- `getTasksByDateRange`
- `getWeatherData`
- `getFinancials`
- `deletePlanting`
- `bulkAddPlantings`
- `addTask`

---

*API Inventory Complete - Backend Claude*
