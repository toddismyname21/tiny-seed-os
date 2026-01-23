# Planning Assistant Research Part 4: Optimization Algorithms

## Executive Summary

This research document covers the algorithmic foundations for intelligent crop planning, covering succession planning, field/bed assignment, crop rotation, harvest scheduling, resource leveling, conflict detection, and what-if analysis. The goal is to identify algorithms and approaches that can transform the Tiny Seed OS from reactive record-keeping to prescriptive, intelligent farm planning.

---

## 1. Succession Planning Algorithms

### Core Problem
Given target harvest dates and crop characteristics (DTM, harvest windows), calculate optimal planting schedules to ensure continuous supply without gaps or overwhelming harvest weeks.

### Key Algorithmic Approaches

#### 1.1 GDD-Based Back-Calculation
The current SmartSuccessionPlanner.js uses Growing Degree Days (GDD) accumulation to back-calculate planting dates from target harvest dates.

**Algorithm:**
```
function calculatePlantDate(targetHarvest, gddRequired, baseTemp):
    accumulatedGDD = 0
    currentDate = targetHarvest

    while accumulatedGDD < gddRequired:
        currentDate = currentDate - 1 day
        dailyGDD = max(0, (highTemp + lowTemp) / 2 - baseTemp)
        accumulatedGDD += dailyGDD

    return currentDate
```

**Key Parameters:**
- Days to Maturity (DTM) or GDD requirement
- Base temperature for the crop
- Harvest window duration (picking window)
- Overlap factor (0.5-0.9) - succession interval relative to harvest window

**Research Finding:** [ATTRA](https://attra.ncat.org/publication/scheduling-vegetable-plantings-for-continuous-harvest/) recommends that "the timing between plantings should be approximately the same as the expected picking window during which the crop is fully productive."

#### 1.2 Weeks-to-Maturity (WTM) Simplification
For practical planning, [Sierra Flower Farm](https://www.sierraflowerfarm.com/blog/2021/1/26/succession-planting-for-the-flower-farmer) recommends converting DTM to Weeks to Maturity:

```
WTM = ceil(DTM / 7)
plantingDate = targetHarvestDate - WTM weeks - 2 weeks (germination buffer)
```

#### 1.3 Two-Stage Optimization Model
Academic research ([Frontiers](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2022.762446/full)) proposes a two-stage model:

**Stage 1:** Predict maturity date using GDD accumulation
**Stage 2:** Optimize planting schedule to achieve even weekly harvest quantities within storage capacity

**Solver:** Gurobi optimizer with Python/MATLAB implementation

#### 1.4 Seasonal Adjustment System
The existing CropRotation.js implements a sophisticated seasonal DTM multiplier system:

```javascript
const SEASONAL_DTM_MULTIPLIERS = {
  'EarlySpring': 1.35,  // 35% longer
  'LateSpring':  1.15,  // 15% longer
  'Summer':      1.0,   // Baseline
  'LateSummer':  1.1,   // 10% longer
  'Fall':        1.25,  // 25% longer
  'LateFall':    1.5    // 50% longer
};
```

**Priority Hierarchy for DTM Data:**
1. **Learned Data** - Real harvest data from DTM_LEARNING sheet (most accurate)
2. **Crop Profile** - DTM_Spring/Summer/Fall from CROPS sheet
3. **Default Multiplier** - Seasonal factors (least reliable)

### Recommended Enhancements

1. **Multi-Variety Succession:** Plant early, mid, and late-season varieties simultaneously
2. **Dynamic Adjustment:** Tighten succession intervals after midsummer as days grow shorter
3. **Harvest Quantity Targets:** Optimize for consistent weekly supply quantities, not just harvest dates

---

## 2. Field/Bed Assignment Optimization

### Core Problem
Assign crops to beds/fields based on multiple constraints: rotation rules, soil type, irrigation availability, sun exposure, proximity to processing, and historical performance.

### Algorithmic Approaches

#### 2.1 Integer Linear Programming (ILP)
[ScienceDirect research](https://www.sciencedirect.com/science/article/abs/pii/S0305054816303033) shows ILP is effective for crop selection and allocation.

**Decision Variables:**
- x[c,f,t] = 1 if crop c is assigned to field f at time t

**Objective Function:**
```
Maximize: SUM(yield[c,f] * x[c,f,t] - cost[c,f] * x[c,f,t])
```

**Constraints:**
- Rotation: x[c,f,t] = 0 if same family planted in f within rotation years
- Capacity: SUM(x[c,f,t]) <= beds_available[f]
- Demand: SUM(x[c,f,t]) >= demand[c,t]

#### 2.2 Constraint Satisfaction Problem (CSP) Formulation
Per [Cambridge Core research](https://www.cambridge.org/core/journals/rairo-operations-research/article/abs/solving-the-crop-allocation-problemusing-hard-and-soft-constraints/928250B2BF7802F29B31EE47D2FD9993):

**Variables:** Bed assignments (which crop goes where)
**Domains:** Available crops for each bed
**Constraints:**
- Hard: Rotation rules, soil compatibility
- Soft: Preference weights for optimal sequences

**Solvers:**
- toulbar2 (WCSP solver)
- NumberJack/SCIP (ILP solver)

#### 2.3 Weighted CSP (WCSP) Formulation
Allows soft constraints with penalty weights:

```
Hard Constraints (must satisfy):
- No same family in same bed within rotation period
- Soil pH/type compatibility

Soft Constraints (minimize violations):
- Proximity preferences (weight: 10)
- Irrigation grouping (weight: 5)
- Historical yield performance (weight: 15)
```

#### 2.4 Connectivity-Aware Assignment
[Springer research](https://link.springer.com/article/10.1007/s10479-022-04685-5) considers field proximity for machinery routing:

```
Minimize: assignment_cost + travel_cost_between_fields
Subject to: rotation_constraints, capacity_constraints
```

### Practical Implementation for Tiny Seed OS

**Bed Assignment Score Function:**
```javascript
function scoreBedAssignment(crop, bed, history) {
  let score = 100;

  // Rotation penalty (hard constraint)
  if (violatesRotation(crop, bed, history)) score -= 1000;

  // Soil match bonus
  score += soilCompatibility(crop, bed.soilType) * 20;

  // Sun requirement match
  score += sunMatch(crop.sunNeed, bed.sunExposure) * 15;

  // Historical performance
  score += historicalYield(crop, bed) * 10;

  // Proximity to irrigation
  if (bed.hasIrrigation && crop.waterNeed === 'high') score += 10;

  return score;
}
```

---

## 3. Crop Rotation Rules Engine

### Core Problem
Enforce rotation constraints that prevent disease buildup, nutrient depletion, and pest cycles while maximizing beneficial sequences.

### Existing Implementation (CropRotation.js)

The system already has:

**Crop Family Definitions:**
```javascript
const CROP_FAMILIES = {
  'Solanaceae': ['Tomatoes', 'Peppers', 'Eggplant', 'Potatoes'],
  'Brassicaceae': ['Broccoli', 'Cabbage', 'Kale', 'Radish', 'Arugula'],
  'Cucurbitaceae': ['Cucumber', 'Squash', 'Pumpkins'],
  'Fabaceae': ['Beans', 'Peas'],
  'Alliaceae': ['Onions', 'Garlic', 'Leeks'],
  'Apiaceae': ['Carrots', 'Celery', 'Parsley', 'Dill', 'Cilantro'],
  'Amaranthaceae': ['Beets', 'Spinach', 'Swiss Chard'],
  'Asteraceae': ['Lettuce', 'Endive', 'Sunflowers'],
  'Poaceae': ['Corn']
};
```

**Minimum Rotation Years:**
```javascript
const ROTATION_YEARS = {
  'Solanaceae': 4,
  'Brassicaceae': 5,  // Most important to rotate
  'Cucurbitaceae': 4,
  'Fabaceae': 3,
  'Alliaceae': 4,
  'Apiaceae': 3,
  'Amaranthaceae': 3,
  'Asteraceae': 2,
  'Poaceae': 2
};
```

**Compatibility Matrix:**
```
Score: 2 = Highly beneficial (plant after)
       1 = Neutral
       0 = Avoid
      -1 = Strongly avoid (same family)
```

### Research-Based Rotation Rules

Per [Cornell Cooperative Extension](https://tioga.cce.cornell.edu/gardening/food-gardening/rotating-vegetables-by-family) and [Southern Exposure](https://blog.southernexposure.com/2024/12/crop-rotation-by-plant-family/):

**Beneficial Sequences:**
| After This Family | Plant Next |
|-------------------|------------|
| Nightshades | Apiaceae or Alliums |
| Brassicas | Legumes, Alliums |
| Alliums | Brassicas, Lettuce |
| Legumes | Brassicas, Corn, Apiaceae |
| Heavy Feeders | Light Feeders |

**Avoid:**
| After This | Avoid Planting |
|------------|----------------|
| Nightshades | Brassicas |
| Alliums | Legumes |
| Same family | Same family |

### Algorithm: Rotation Validator

```javascript
function validateRotation(proposedCrop, bed, history) {
  const cropFamily = getCropFamily(proposedCrop);
  const rotationYears = ROTATION_YEARS[cropFamily];

  // Check history for same family
  for (const plantingYear of history[bed]) {
    if (plantingYear.family === cropFamily &&
        currentYear - plantingYear.year < rotationYears) {
      return {
        valid: false,
        reason: `${cropFamily} planted in ${plantingYear.year}. Wait until ${plantingYear.year + rotationYears}.`
      };
    }
  }

  // Check compatibility with last crop
  const lastCrop = history[bed][history[bed].length - 1];
  const compatibility = ROTATION_COMPATIBILITY[lastCrop.family][cropFamily];

  return {
    valid: compatibility >= 0,
    score: compatibility,
    recommendation: getRotationRecommendation(lastCrop.family, cropFamily)
  };
}
```

---

## 4. Harvest Scheduling & Production Smoothing

### Core Problem
Ensure continuous harvest supply without gaps (lost sales) or overwhelming weeks (quality/labor issues).

### Algorithmic Approaches

#### 4.1 Production Smoothing Model

**Objective:** Minimize variance in weekly harvest quantities

```
Variables: plantingDate[crop, succession]
Objective: Minimize SUM((weeklyHarvest[w] - targetWeekly)^2)
Constraints:
  - plantingDate within planting window
  - weeklyHarvest = SUM(harvestingCrops[w] * yieldPerUnit)
```

#### 4.2 Timeline Bin Packing

Treat harvest weeks as "bins" with capacity limits:

```javascript
function planHarvestSchedule(crops, targetWeeklyVolume) {
  const weeklyBins = initializeWeeks(seasonStart, seasonEnd);

  for (const crop of crops.sortBy(priority)) {
    let bestPlantDate = null;
    let minVariance = Infinity;

    for (const candidateDate of plantingWindow(crop)) {
      const harvestWeek = calculateHarvestWeek(candidateDate, crop.dtm);
      const newVariance = calculateVarianceIfAdded(weeklyBins, harvestWeek, crop.yield);

      if (newVariance < minVariance) {
        minVariance = newVariance;
        bestPlantDate = candidateDate;
      }
    }

    assignPlanting(crop, bestPlantDate);
    updateBins(weeklyBins, bestPlantDate, crop);
  }

  return weeklyBins;
}
```

#### 4.3 Overlap Management

Ensure harvest windows overlap appropriately:

```
For continuous supply:
  harvestEnd[succession N] >= harvestStart[succession N+1]

Overlap Factor = harvestWindowDays * 0.7 (typical)
Succession Interval = harvestWindowDays - overlap
```

### Harvest Load Balancing Visualization

```
Week:     1    2    3    4    5    6    7    8
Target:  100  100  100  100  100  100  100  100
Actual:   80  120   95  105   90  110  100   95
         ^^   ^^                 ^^
         Gap  Over             Over

Action: Adjust succession timing to smooth peaks
```

---

## 5. Resource Leveling Algorithms

### Core Problem
Smooth labor and equipment demands across the season to avoid feast-or-famine workloads.

### Key Techniques from Project Management

Per [PMI](https://www.pmi.org/learning/library/scheduling-resource-leveling-project-progression-8006) and [Asana](https://asana.com/resources/resource-leveling):

#### 5.1 Critical Path Method (CPM) Adaptation

**For Farm Operations:**
1. Identify critical activities (weather-dependent, time-sensitive)
2. Calculate float for non-critical activities
3. Shift non-critical tasks within their float window to level resources

```javascript
function levelResources(tasks, resourceCapacity) {
  // Sort by priority (critical tasks first)
  tasks.sort((a, b) => a.float - b.float);

  for (const task of tasks) {
    const currentLoad = getResourceLoad(task.scheduledDate);

    if (currentLoad + task.laborHours > resourceCapacity) {
      // Try to shift within float window
      for (let offset = 1; offset <= task.float; offset++) {
        const newDate = task.scheduledDate + offset;
        const newLoad = getResourceLoad(newDate);

        if (newLoad + task.laborHours <= resourceCapacity) {
          task.scheduledDate = newDate;
          break;
        }
      }
    }
  }
}
```

#### 5.2 Critical Chain Buffer Method

Add buffers to protect against uncertainty:

```
Project Buffer: End of season buffer for delayed harvests
Feeding Buffer: Buffer before critical harvest periods
Resource Buffer: Standby labor capacity for peak weeks
```

#### 5.3 Agricultural Resource Optimization

[Nature.com research](https://www.nature.com/articles/s41598-025-19747-4) on SSA-BP (Sparrow Search Algorithm - Back Propagation) for agricultural resource allocation:

- Uses machine learning to predict resource needs
- Optimizes labor, equipment, water allocation
- Real-time decision support for scheduling

### Labor Load Visualization

```
Week 20: Planting=15hrs, Harvesting=25hrs, Processing=10hrs = 50hrs
Week 21: Planting=10hrs, Harvesting=35hrs, Processing=15hrs = 60hrs [OVER]
Week 22: Planting=5hrs,  Harvesting=20hrs, Processing=8hrs  = 33hrs

Action: Shift Week 21 non-critical planting to Week 22
Result: Week 21 = 50hrs, Week 22 = 43hrs [LEVELED]
```

---

## 6. Conflict Detection Algorithms

### Core Problem
Detect scheduling impossibilities, constraint violations, and resource conflicts before they cause problems.

### Types of Conflicts

1. **Double Booking:** Same bed assigned to multiple crops at overlapping times
2. **Rotation Violation:** Same family planted too soon
3. **Resource Overload:** More work scheduled than capacity allows
4. **Timing Impossibility:** Planting date after frost when frost-sensitive
5. **Dependency Violation:** Transplant scheduled before greenhouse seeding

### Algorithmic Approaches

#### 6.1 Interval Overlap Detection

```javascript
function detectDoubleBooking(assignments) {
  const conflicts = [];

  for (const bed of beds) {
    const bedAssignments = assignments.filter(a => a.bed === bed);
    bedAssignments.sort((a, b) => a.startDate - b.startDate);

    for (let i = 0; i < bedAssignments.length - 1; i++) {
      const current = bedAssignments[i];
      const next = bedAssignments[i + 1];

      // Check overlap: current ends after next starts
      if (current.endDate > next.startDate) {
        conflicts.push({
          type: 'DOUBLE_BOOKING',
          bed: bed,
          assignments: [current, next],
          overlapDays: dateDiff(next.startDate, current.endDate)
        });
      }
    }
  }

  return conflicts;
}
```

#### 6.2 Sweep Line Algorithm

More efficient O(n log n) approach for many events:

```javascript
function detectConflictsSwepLine(events) {
  const timeline = [];

  // Create start and end events
  for (const assignment of assignments) {
    timeline.push({ date: assignment.startDate, type: 'START', assignment });
    timeline.push({ date: assignment.endDate, type: 'END', assignment });
  }

  // Sort by date
  timeline.sort((a, b) => a.date - b.date);

  // Sweep through, tracking active assignments per bed
  const activeBeds = {};
  const conflicts = [];

  for (const event of timeline) {
    const bed = event.assignment.bed;

    if (event.type === 'START') {
      if (activeBeds[bed]) {
        conflicts.push({
          type: 'OVERLAP',
          bed: bed,
          existing: activeBeds[bed],
          new: event.assignment
        });
      }
      activeBeds[bed] = event.assignment;
    } else {
      delete activeBeds[bed];
    }
  }

  return conflicts;
}
```

#### 6.3 Constraint Propagation

Use Arc Consistency (AC-3) algorithm to prune impossible assignments early:

Per [GeeksforGeeks CSP](https://www.geeksforgeeks.org/artificial-intelligence/constraint-satisfaction-problems-csp-in-artificial-intelligence/):

```javascript
function enforceArcConsistency(variables, constraints) {
  const queue = getAllArcs(constraints);

  while (queue.length > 0) {
    const [xi, xj] = queue.shift();

    if (revise(xi, xj, constraints)) {
      if (xi.domain.length === 0) {
        return false; // Inconsistent - no solution
      }

      // Add affected arcs back to queue
      for (const neighbor of getNeighbors(xi)) {
        if (neighbor !== xj) {
          queue.push([neighbor, xi]);
        }
      }
    }
  }

  return true; // Consistent
}

function revise(xi, xj, constraints) {
  let revised = false;

  for (const value of xi.domain) {
    if (!hasConsistentValue(value, xj, constraints)) {
      xi.domain.remove(value);
      revised = true;
    }
  }

  return revised;
}
```

### Conflict Dashboard

```
CONFLICTS DETECTED: 3

1. DOUBLE BOOKING [HIGH]
   Bed A-5: Tomatoes (May 1 - Sep 15) overlaps with
            Fall Lettuce (Sep 1 - Oct 30)
   Overlap: 14 days
   Action: Move lettuce to Sep 16 or assign different bed

2. ROTATION VIOLATION [HIGH]
   Bed B-2: Peppers planned for 2026
   Last Solanaceae: Tomatoes in 2024
   Required gap: 4 years (until 2028)
   Action: Assign different bed or different crop family

3. RESOURCE OVERLOAD [MEDIUM]
   Week 22: 72 labor hours needed, 60 available
   Contributing: Transplanting (25hrs) + Harvest (30hrs) + Weeding (17hrs)
   Action: Shift non-critical tasks or add temporary labor
```

---

## 7. What-If Analysis & Scenario Planning

### Core Problem
Allow planners to simulate the impact of changes before committing, exploring multiple scenarios to find optimal plans.

### Algorithmic Approaches

#### 7.1 Sandbox/Clone Pattern

```javascript
class PlanningScenario {
  constructor(basePlan) {
    this.plan = deepClone(basePlan);
    this.changes = [];
    this.metrics = null;
  }

  applyChange(change) {
    this.changes.push(change);
    executeChange(this.plan, change);
    this.metrics = null; // Invalidate cached metrics
  }

  getMetrics() {
    if (!this.metrics) {
      this.metrics = calculateMetrics(this.plan);
    }
    return this.metrics;
  }

  compare(otherScenario) {
    return {
      harvestQuantity: this.metrics.totalHarvest - otherScenario.metrics.totalHarvest,
      laborHours: this.metrics.totalLabor - otherScenario.metrics.totalLabor,
      revenue: this.metrics.projectedRevenue - otherScenario.metrics.projectedRevenue,
      conflicts: this.metrics.conflicts.length - otherScenario.metrics.conflicts.length
    };
  }
}
```

#### 7.2 Monte Carlo Simulation

For uncertain variables (weather, yields):

```javascript
function runMonteCarloSimulation(plan, iterations = 1000) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    // Randomize uncertain variables
    const scenario = clonePlan(plan);

    for (const planting of scenario.plantings) {
      // Weather variation affects DTM
      planting.actualDTM = planting.expectedDTM * randomNormal(1.0, 0.15);

      // Yield variation
      planting.actualYield = planting.expectedYield * randomNormal(1.0, 0.20);
    }

    results.push(calculateOutcome(scenario));
  }

  return {
    mean: average(results.map(r => r.revenue)),
    min: min(results.map(r => r.revenue)),
    max: max(results.map(r => r.revenue)),
    percentile5: percentile(results.map(r => r.revenue), 5),
    percentile95: percentile(results.map(r => r.revenue), 95)
  };
}
```

#### 7.3 Scenario Comparison Matrix

```
                 | Scenario A    | Scenario B    | Scenario C
                 | (Current)     | (More Tomato) | (Less Variety)
-----------------+---------------+---------------+----------------
Total Revenue    | $125,000      | $135,000      | $118,000
Labor Hours      | 3,200         | 3,500         | 2,800
Peak Week Labor  | 72 hrs        | 85 hrs        | 65 hrs
Harvest Gaps     | 2 weeks       | 1 week        | 3 weeks
Rotation Issues  | 0             | 1             | 0
Risk Score       | Medium        | High          | Low
```

### Key Features from Commercial Software

Per [Kelloo](https://www.kelloo.com/what-if-scenario-planning/) and [Epicflow](https://www.epicflow.com/features/what-if/):

1. **Sandbox Mode:** Changes don't affect live plan
2. **Real-Time Impact:** See effects immediately
3. **Multiple Scenarios:** Compare side-by-side
4. **Rollback:** Easily undo or restore
5. **AI Suggestions:** "If you delay tomato planting by 1 week, you avoid the Week 22 labor overload"

---

## 8. Meta-Heuristic Optimization Algorithms

### When to Use

For complex problems where exact solutions are computationally infeasible.

### 8.1 Genetic Algorithms (GA)

Per [research](https://wepub.org/index.php/TEEES/article/view/4776) on multi-objective crop planning:

```javascript
function geneticAlgorithm(population, generations) {
  for (let gen = 0; gen < generations; gen++) {
    // Evaluate fitness
    for (const individual of population) {
      individual.fitness = evaluateFarm(individual.plan);
    }

    // Selection (tournament)
    const parents = tournamentSelection(population);

    // Crossover
    const offspring = crossover(parents);

    // Mutation
    mutate(offspring, mutationRate);

    // Replace
    population = selectSurvivors(population, offspring);
  }

  return getBest(population);
}
```

**Chromosome Encoding:**
- Gene = (crop, bed, plantingDate)
- Chromosome = Full farm plan

**Fitness Function:**
```
fitness = revenue - penalties
penalties = rotationViolations * 1000
          + doubleBookings * 10000
          + laborOverload * 100
          + harvestGaps * 500
```

### 8.2 Simulated Annealing (SA)

Per [Wikipedia](https://en.wikipedia.org/wiki/Simulated_annealing):

```javascript
function simulatedAnnealing(initialPlan, initialTemp, coolingRate) {
  let current = initialPlan;
  let currentCost = evaluateCost(current);
  let temp = initialTemp;

  while (temp > minTemp) {
    // Generate neighbor solution
    const neighbor = generateNeighbor(current);
    const neighborCost = evaluateCost(neighbor);

    const delta = neighborCost - currentCost;

    // Accept if better, or with probability based on temperature
    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
      current = neighbor;
      currentCost = neighborCost;
    }

    // Cool down
    temp *= coolingRate;
  }

  return current;
}
```

**Advantages for Farm Planning:**
- Escapes local optima
- Can handle non-linear constraints
- Relatively simple to implement

### 8.3 NSGA-II (Multi-Objective)

For balancing conflicting objectives (profit vs. labor vs. sustainability):

Per [PMC research](https://pmc.ncbi.nlm.nih.gov/articles/PMC9860027/):

- Produces Pareto-optimal solution set
- Decision maker chooses from trade-off options
- Better than weighted single-objective for complex problems

---

## 9. Implementation Recommendations for Tiny Seed OS

### Phase 1: Foundation (Current State Enhanced)

**Already Implemented:**
- GDD-based succession planning (SmartSuccessionPlanner.js)
- Crop family definitions and rotation rules (CropRotation.js)
- Seasonal DTM adjustment with learned data

**Quick Wins:**
1. Add double-booking detection to bed assignment
2. Implement weekly harvest load visualization
3. Add rotation violation warnings to planning UI

### Phase 2: Intelligent Planning Assistant

**New Capabilities:**
1. **Auto-Succession Calculator:** Input harvest targets, get planting schedule
2. **Bed Assignment Optimizer:** Score-based ranking with constraint checking
3. **Conflict Dashboard:** Real-time detection of all constraint violations
4. **Resource Load Chart:** Weekly labor/equipment visualization

### Phase 3: Advanced Optimization

**For Future Development:**
1. **What-If Scenarios:** Clone/compare multiple plans
2. **Production Smoothing:** Optimize for consistent weekly supply
3. **Monte Carlo Risk Analysis:** Simulate weather/yield uncertainty
4. **Multi-Objective Optimization:** Balance profit, labor, sustainability

### Recommended Architecture

```
+------------------+     +-------------------+     +------------------+
| Planning UI      | --> | Constraint Engine | --> | Optimization     |
| (What-if editor) |     | (Validation)      |     | (Suggestions)    |
+------------------+     +-------------------+     +------------------+
        |                        |                         |
        v                        v                         v
+------------------+     +-------------------+     +------------------+
| Scenario Store   | <-> | Rules Database    | <-> | Solver Engine    |
| (Draft plans)    |     | (Rotation, etc.)  |     | (Greedy/GA/SA)   |
+------------------+     +-------------------+     +------------------+
```

---

## 10. Key Research Sources

### Academic Publications
- [Frontiers: Optimizing Crop Planting Schedule](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2022.762446/full)
- [Cambridge Core: Crop Allocation with Constraints](https://www.cambridge.org/core/journals/rairo-operations-research/article/abs/solving-the-crop-allocation-problemusing-hard-and-soft-constraints/928250B2BF7802F29B31EE47D2FD9993)
- [ScienceDirect: Mixed Integer LP for Crop Selection](https://www.sciencedirect.com/science/article/abs/pii/S0305054816303033)
- [Springer: Multi-Objective Crop Planning with GA](https://link.springer.com/chapter/10.1007/978-3-030-17771-3_9)

### Practical Farm Planning
- [ATTRA: Scheduling Vegetable Plantings](https://attra.ncat.org/publication/scheduling-vegetable-plantings-for-continuous-harvest/)
- [Johnny's Seeds: Succession Planting Methods](https://www.johnnyseeds.com/growers-library/methods-tools-supplies/market-gardening/succession-planting-methods-for-providing-a-continuous-supply.html)
- [High Mowing: Crop Rotation for Diversified Operations](https://www.highmowingseeds.com/blog/crop-rotation-for-diversified-vegetable-operations/)
- [Cornell Extension: Rotating Vegetables by Family](https://tioga.cce.cornell.edu/gardening/food-gardening/rotating-vegetables-by-family)

### Algorithm References
- [Wikipedia: Simulated Annealing](https://en.wikipedia.org/wiki/Simulated_annealing)
- [Wikipedia: Constraint Satisfaction Problem](https://en.wikipedia.org/wiki/Constraint_satisfaction_problem)
- [GeeksforGeeks: CSP in AI](https://www.geeksforgeeks.org/artificial-intelligence/constraint-satisfaction-problems-csp-in-artificial-intelligence/)
- [Cornell: Simulated Annealing Optimization](https://optimization.cbe.cornell.edu/index.php?title=Simulated_annealing)

### Farm Management Software
- [Farmbrite](https://www.farmbrite.com/)
- [Tend](https://www.tend.com/)
- [farmOS (Open Source)](https://farmos.org/)
- [FarmKeep](https://www.farmkeep.com/)

### Project Management Techniques
- [PMI: Resource Leveling](https://www.pmi.org/learning/library/scheduling-resource-leveling-project-progression-8006)
- [Asana: Resource Leveling](https://asana.com/resources/resource-leveling)
- [Kelloo: What-If Scenario Planning](https://www.kelloo.com/what-if-scenario-planning/)

---

## Appendix A: Algorithm Complexity Reference

| Algorithm | Time Complexity | Best For |
|-----------|-----------------|----------|
| Greedy Assignment | O(n log n) | Quick initial solutions |
| CSP with AC-3 | O(ed^3) | Constraint validation |
| Backtracking + MAC | O(d^n) worst | Small problem spaces |
| Genetic Algorithm | O(g * n^2) | Large, complex problems |
| Simulated Annealing | O(iterations) | Escaping local optima |
| ILP (Gurobi) | Exponential worst | Optimal solutions |

Where: n=variables, d=domain size, e=edges, g=generations

---

## Appendix B: Existing Code Integration Points

### SmartSuccessionPlanner.js
- `generateSmartSuccessionPlan()` - Main entry point
- `calculatePlantDateFromHarvestSSP()` - GDD back-calculation
- `checkPlantingConstraintsSSP()` - Frost/soil temperature checks

### CropRotation.js
- `CROP_FAMILIES` - Family definitions
- `ROTATION_YEARS` - Minimum rotation periods
- `ROTATION_COMPATIBILITY` - Sequence scoring matrix
- `checkRotationCompatibility()` - Validation function
- `getSeasonalFieldDays()` - Adjusted DTM calculation

### Recommended New Functions
- `detectAllConflicts(plan)` - Comprehensive conflict scan
- `scoreBedAssignment(crop, bed)` - Multi-factor bed scoring
- `levelWeeklyResources(plan)` - Labor smoothing
- `simulateScenario(basePlan, changes)` - What-if analysis
- `optimizePlan(plan, objectives)` - Meta-heuristic optimization

---

*Research compiled: 2026-01-23*
*For: Tiny Seed OS Planning Assistant Enhancement*
