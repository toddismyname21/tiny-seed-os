# API REFERENCE
## Tiny Seed OS API Documentation

**Last Updated:** 2026-02-03
**Base URL:** `https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Request Format](#request-format)
4. [Response Format](#response-format)
5. [Task Management APIs](#task-management-apis)
6. [Employee & Time APIs](#employee--time-apis)
7. [Planning APIs](#planning-apis)
8. [Harvest & Crop APIs](#harvest--crop-apis)
9. [Dashboard APIs](#dashboard-apis)
10. [Weather APIs](#weather-apis)
11. [Sales & Customer APIs](#sales--customer-apis)
12. [Error Handling](#error-handling)

---

# OVERVIEW

The Tiny Seed OS API is built on Google Apps Script and provides endpoints for all farm management operations. The API uses a single endpoint with action-based routing.

## API Configuration

All frontend files should use the centralized API configuration:

```javascript
// Import the config
<script src="web_app/api-config.js"></script>

// Use the API URL
const API_URL = TINY_SEED_API.MAIN_API;
```

**Never hardcode the API URL directly in HTML files.**

---

# AUTHENTICATION

Most endpoints require authentication via the auth-guard system.

## Session-Based Auth

Include the session token in requests:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-Session-Token': sessionStorage.getItem('sessionToken')
};
```

## Role-Based Access

Endpoints check user roles. Common roles:
- `Admin` - Full access
- `Manager` - Operational access
- `FieldLead` - Field operations
- `Employee` - Basic access
- `Driver` - Delivery access
- `Customer` - Customer portal access

---

# REQUEST FORMAT

## GET Requests

```javascript
fetch(`${API_URL}?action=getTaskPriorities&status=pending&limit=50`)
  .then(response => response.json())
  .then(data => console.log(data));
```

### Parameters
- `action` (required): The endpoint action name
- Additional parameters vary by endpoint

## POST Requests

```javascript
fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'createUnifiedTask',
    title: 'Harvest Tomatoes',
    type: 'harvest',
    assignee: 'maria',
    dueDate: '2026-02-04'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

---

# RESPONSE FORMAT

## Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-03T14:30:00Z"
}
```

## Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

## Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

# TASK MANAGEMENT APIs

## getTaskPriorities

Get AI-sorted task list with priority scores.

### Request

```
GET ?action=getTaskPriorities
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (pending, completed, cancelled) |
| `assignee` | string | No | Filter by assignee ID |
| `task_type` | string | No | Filter by type (harvest, transplant, etc.) |
| `date` | string | No | Filter by due date (YYYY-MM-DD) |
| `limit` | number | No | Max results (default 50) |
| `offset` | number | No | Pagination offset |

### Response

```json
{
  "success": true,
  "data": [
    {
      "Task_ID": "TSK-1738505600000",
      "Title": "Harvest Roma Tomatoes",
      "Task_Type": "harvest",
      "Priority_Score": 94,
      "Priority_Manual": "high",
      "At_Risk": true,
      "At_Risk_Reason": "GDD 98% - harvest immediately",
      "Assignee_Name": "Maria",
      "Due_Date": "2026-02-03",
      "Estimated_Minutes": 120,
      "Status": "scheduled",
      "Location": "Field 2, Beds 4-8"
    }
  ],
  "stats": {
    "total": 24,
    "critical": 3,
    "atRisk": 5
  }
}
```

---

## getUnifiedTasks

Get tasks with flexible filtering.

### Request

```
GET ?action=getUnifiedTasks
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Status filter |
| `assignee` | string | No | Assignee filter |
| `field` | string | No | Field/location filter |
| `dateFrom` | string | No | Start date range |
| `dateTo` | string | No | End date range |

### Response

```json
{
  "success": true,
  "data": [
    {
      "Task_ID": "TSK-123",
      "Title": "Transplant Peppers",
      "Description": "Move pepper seedlings to Field 3",
      "Task_Type": "transplant",
      "Batch_ID": "2026-PEP-001",
      "Field_ID": "field_3",
      "Assignee_ID": "emp_001",
      "Assignee_Name": "Jose",
      "Due_Date": "2026-02-04",
      "Due_Time": "10:00",
      "Priority_Manual": "medium",
      "Priority_Score": 67,
      "Status": "scheduled",
      "Estimated_Minutes": 180,
      "Created_At": "2026-02-01T08:00:00Z"
    }
  ]
}
```

---

## createUnifiedTask

Create a new task.

### Request

```
POST action=createUnifiedTask
```

### Body

```json
{
  "action": "createUnifiedTask",
  "title": "Weed Row 4",
  "description": "Remove weeds from tomato beds",
  "type": "weed",
  "assignee": "carlos",
  "dueDate": "2026-02-05",
  "dueTime": "14:00",
  "priority": "medium",
  "estimatedMinutes": 90,
  "field": "field_2",
  "beds": "4-8"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Task name |
| `type` | string | Task category |
| `dueDate` | string | Due date (YYYY-MM-DD) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Detailed instructions |
| `assignee` | string | Assignee ID |
| `dueTime` | string | Due time (HH:MM) |
| `priority` | string | critical/high/medium/low |
| `estimatedMinutes` | number | Expected duration |
| `field` | string | Field ID |
| `beds` | string | Bed numbers |
| `batchId` | string | Link to planning batch |

### Response

```json
{
  "success": true,
  "data": {
    "Task_ID": "TSK-1738600000000",
    "message": "Task created successfully"
  }
}
```

---

## updateUnifiedTask

Update an existing task.

### Request

```
POST action=updateUnifiedTask
```

### Body

```json
{
  "action": "updateUnifiedTask",
  "taskId": "TSK-123",
  "status": "completed",
  "actualMinutes": 75,
  "notes": "Completed ahead of schedule"
}
```

### Updatable Fields

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | Required - Task to update |
| `status` | string | New status |
| `assignee` | string | New assignee |
| `priority` | string | New priority |
| `dueDate` | string | New due date |
| `dueTime` | string | New due time |
| `actualMinutes` | number | Actual time spent |
| `notes` | string | Completion notes |

### Status Values

| Status | Description |
|--------|-------------|
| `backlog` | Not yet scheduled |
| `scheduled` | Has date, waiting |
| `in_progress` | Currently working |
| `weather_hold` | Weather delay |
| `blocked` | Waiting on dependency |
| `review` | Needs verification |
| `completed` | Done |
| `cancelled` | Removed |

---

## bulkUpdateTasks

Update multiple tasks in one operation.

### Request

```
POST action=bulkUpdateTasks
```

### Body

```json
{
  "action": "bulkUpdateTasks",
  "taskIds": ["TSK-001", "TSK-002", "TSK-003"],
  "updates": {
    "status": "completed",
    "completedAt": "2026-02-03T16:30:00Z"
  }
}
```

### Bulk Operations

| Operation | Example updates object |
|-----------|------------------------|
| Complete All | `{ "status": "completed" }` |
| Assign All | `{ "assignee": "maria" }` |
| Cancel All | `{ "status": "cancelled" }` |
| Change Priority | `{ "priority": "high" }` |

### Response

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0,
    "message": "3 tasks updated successfully"
  }
}
```

---

## getAtRiskTasks

Get only tasks flagged as at-risk.

### Request

```
GET ?action=getAtRiskTasks
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "Task_ID": "TSK-001",
      "Title": "Harvest Lettuce",
      "At_Risk": true,
      "At_Risk_Reason": "TIME: Need 120min, only 60min available",
      "Risk_Severity": "HIGH",
      "Priority_Score": 88
    }
  ]
}
```

---

## getProactiveAlerts

Get AI-generated proactive alerts.

### Request

```
GET ?action=getProactiveAlerts
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-001",
      "type": "WARNING",
      "category": "weather",
      "title": "Frost Warning",
      "message": "32F expected tonight. Protect sensitive crops.",
      "severity": "high",
      "actionable": true,
      "suggestedTask": {
        "title": "Frost Protection Setup",
        "dueDate": "2026-02-03",
        "dueTime": "16:00"
      },
      "createdAt": "2026-02-03T08:00:00Z"
    }
  ]
}
```

---

## getTeamWorkloadBalance

Get team capacity and workload distribution.

### Request

```
GET ?action=getTeamWorkloadBalance
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Date to check (default today) |

### Response

```json
{
  "success": true,
  "data": {
    "team": [
      {
        "employeeId": "emp_001",
        "name": "Maria",
        "assignedMinutes": 480,
        "availableMinutes": 480,
        "capacityPercent": 100,
        "status": "overloaded",
        "taskCount": 8
      },
      {
        "employeeId": "emp_002",
        "name": "Carlos",
        "assignedMinutes": 180,
        "availableMinutes": 480,
        "capacityPercent": 37,
        "status": "available",
        "taskCount": 3
      }
    ],
    "recommendations": [
      {
        "type": "rebalance",
        "message": "Move 'Weed Row 4' from Maria to Carlos",
        "fromEmployee": "emp_001",
        "toEmployee": "emp_002",
        "taskId": "TSK-005"
      }
    ],
    "summary": {
      "totalCapacity": 1920,
      "totalAssigned": 1440,
      "overallUtilization": 75
    }
  }
}
```

---

## getAIPriorityDashboard

Get combined dashboard data in one call.

### Request

```
GET ?action=getAIPriorityDashboard
```

### Response

```json
{
  "success": true,
  "data": {
    "priorityQueue": [ ... ],
    "alerts": [ ... ],
    "workload": { ... },
    "stats": {
      "todayTotal": 24,
      "todayComplete": 8,
      "atRiskCount": 5,
      "criticalCount": 3
    }
  }
}
```

---

# EMPLOYEE & TIME APIs

## clockIn

Clock an employee in.

### Request

```
POST action=clockIn
```

### Body

```json
{
  "action": "clockIn",
  "userId": "emp_001",
  "latitude": 40.7589,
  "longitude": -80.0526,
  "timestamp": "2026-02-03T07:00:00Z"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "clockInTime": "2026-02-03T07:00:00Z",
    "message": "Clocked in successfully"
  }
}
```

---

## clockOut

Clock an employee out.

### Request

```
POST action=clockOut
```

### Body

```json
{
  "action": "clockOut",
  "userId": "emp_001",
  "timestamp": "2026-02-03T15:30:00Z"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "clockOutTime": "2026-02-03T15:30:00Z",
    "hoursWorked": 8.5,
    "message": "Clocked out successfully"
  }
}
```

---

## completeTaskWithTimeLog

Complete a task with time tracking.

### Request

```
POST action=completeTaskWithTimeLog
```

### Body

```json
{
  "action": "completeTaskWithTimeLog",
  "taskId": "TSK-001",
  "userId": "emp_001",
  "startTime": "2026-02-03T09:00:00Z",
  "endTime": "2026-02-03T11:30:00Z",
  "notes": "Completed all beds"
}
```

---

## logHarvestWithDetails

Log a harvest with full details.

### Request

```
POST action=logHarvestWithDetails
```

### Body

```json
{
  "action": "logHarvestWithDetails",
  "cropId": "crop_tomato",
  "variety": "Roma",
  "quantity": 45.5,
  "unit": "lbs",
  "quality": "A",
  "batchId": "2026-TOM-003",
  "fieldId": "field_2",
  "userId": "emp_001",
  "notes": "Perfect ripeness"
}
```

---

# PLANNING APIs

## getPlanning

Get all planning data.

### Request

```
GET ?action=getPlanning
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Filter by year |
| `status` | string | Filter by status |
| `crop` | string | Filter by crop |

---

## getPlanningById

Get a specific planting batch.

### Request

```
GET ?action=getPlanningById&batchId=2026-TOM-003
```

---

## updatePlanting

Update a planting record.

### Request

```
POST action=updatePlanting
```

### Body

```json
{
  "action": "updatePlanting",
  "batchId": "2026-TOM-003",
  "field": "field_2",
  "beds": "4-8",
  "status": "transplanted",
  "actualTransplantDate": "2026-02-03"
}
```

---

# HARVEST & CROP APIs

## getHarvests

Get harvest records.

### Request

```
GET ?action=getHarvests
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `dateFrom` | string | Start date |
| `dateTo` | string | End date |
| `crop` | string | Filter by crop |

---

## getHarvestPredictions

Get AI-predicted harvest windows.

### Request

```
GET ?action=getHarvestPredictions
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "batchId": "2026-TOM-003",
      "crop": "Tomato",
      "variety": "Roma",
      "predictedDate": "2026-02-10",
      "confidencePercent": 85,
      "gddProgress": 92,
      "estimatedYield": "150 lbs"
    }
  ]
}
```

---

## getCropProfile

Get crop growing information.

### Request

```
GET ?action=getCropProfile&crop=Tomato
```

### Response

```json
{
  "success": true,
  "data": {
    "name": "Tomato",
    "varieties": ["Roma", "Cherokee Purple", "Sungold"],
    "daysToMaturity": 75,
    "gddRequired": 2500,
    "plantingMethod": "transplant",
    "spacing": "24 inches",
    "rowSpacing": "36 inches",
    "notes": "Requires support"
  }
}
```

---

# DASHBOARD APIs

## getDashboardStats

Get main dashboard statistics.

### Request

```
GET ?action=getDashboardStats
```

### Response

```json
{
  "success": true,
  "data": {
    "tasksToday": 24,
    "tasksCompleted": 12,
    "harvestsToday": "145 lbs",
    "activePlantings": 156,
    "teamOnSite": 5,
    "weather": {
      "temp": 72,
      "condition": "Sunny",
      "precip": 0
    }
  }
}
```

---

## getMorningBrief

Get the morning briefing.

### Request

```
GET ?action=getMorningBrief
```

### Response

```json
{
  "success": true,
  "data": {
    "date": "2026-02-03",
    "weather": { ... },
    "topTasks": [ ... ],
    "alerts": [ ... ],
    "metrics": { ... }
  }
}
```

---

# WEATHER APIs

## getWeather

Get current weather.

### Request

```
GET ?action=getWeather
```

---

## getWeatherForecast

Get multi-day forecast.

### Request

```
GET ?action=getWeatherForecast&days=7
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-03",
      "high": 72,
      "low": 45,
      "condition": "Sunny",
      "precipProb": 0,
      "wind": 8,
      "workable": true
    }
  ]
}
```

---

## getWeatherRecommendations

Get weather-based task recommendations.

### Request

```
GET ?action=getWeatherRecommendations
```

### Response

```json
{
  "success": true,
  "data": {
    "sprayWindow": {
      "available": true,
      "start": "2026-02-04T06:00:00",
      "end": "2026-02-04T10:00:00",
      "reason": "Low wind, no rain"
    },
    "plantingConditions": "good",
    "harvestConditions": "excellent",
    "warnings": []
  }
}
```

---

# SALES & CUSTOMER APIs

## getCSAMembers

Get CSA member list.

### Request

```
GET ?action=getCSAMembers
```

---

## getWholesaleCustomers

Get wholesale customer list.

### Request

```
GET ?action=getWholesaleCustomers
```

---

## submitCSAOrder

Submit a CSA order/customization.

### Request

```
POST action=submitCSAOrder
```

---

## submitWholesaleOrder

Submit a wholesale order.

### Request

```
POST action=submitWholesaleOrder
```

---

# ERROR HANDLING

## Common Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | Not authenticated |
| `ACCESS_DENIED` | Role doesn't have permission |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input data |
| `DUPLICATE` | Resource already exists |
| `SERVER_ERROR` | Internal error |

## Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Handling Errors

```javascript
fetch(`${API_URL}?action=getTaskPriorities`)
  .then(response => response.json())
  .then(data => {
    if (!data.success) {
      // Handle error
      console.error(data.error);
      if (data.code === 'AUTH_REQUIRED') {
        redirectToLogin();
      }
      return;
    }
    // Use data.data
  })
  .catch(error => {
    // Network error
    console.error('Network error:', error);
  });
```

---

# RATE LIMITS

The API has these limits:
- **Per minute**: 60 requests
- **Per hour**: 1000 requests
- **Bulk operations**: 100 items per request

If you exceed limits, you'll receive:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}
```

---

# VERSIONING

Current API version: **1.0**

The API is unversioned in the URL. Breaking changes are avoided when possible. Check CHANGE_LOG.md for API updates.

---

*For additional help, see CHANGE_LOG.md for recent API changes or contact the development team.*
