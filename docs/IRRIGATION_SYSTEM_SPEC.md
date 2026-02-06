# Remote Irrigation Control System - Technical Specification

**Version:** 1.0
**Date:** 2026-02-04
**Project:** Tiny Seed Farm
**Status:** Design Phase

---

## Executive Summary

A **single portable solar/cellular fail-closed valve module** that snaps onto any camlock port, paired with a **pump-side controller + one pump flow meter**, enabling remote irrigation control while maintaining full manual fallback.

---

## System Goals

1. Turn irrigation zones **on/off remotely**
2. Monitor **basic system health** (pressure at module, flow at pump)
3. Maintain **100% manual fallback** capability
4. **Budget-first** approach - scale after prototype proves itself
5. **Portable design** - one smart module serves multiple zones

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TINY SEED FARM IRRIGATION                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐          ┌──────────────────────────────────────┐    │
│  │  PUMP HOUSE  │          │         FIELD ZONES (4+)            │    │
│  │              │          │                                      │    │
│  │  ┌────────┐  │   3"     │   Zone A    Zone B    Zone C    ... │    │
│  │  │ Pump   │──┼──────────┼──►[PORT]   [PORT]   [PORT]          │    │
│  │  │ Motor  │  │  Main    │      │                               │    │
│  │  └────────┘  │  Line    │      ▼                               │    │
│  │      │       │          │  ┌─────────┐                         │    │
│  │  ┌───┴───┐   │          │  │ SMART   │◄── Portable module      │    │
│  │  │ PUMP  │   │          │  │ VALVE   │    moves between        │    │
│  │  │ NODE  │   │          │  │ MODULE  │    ports as needed      │    │
│  │  │       │   │          │  └────┬────┘                         │    │
│  │  │• Flow │   │          │       │                               │    │
│  │  │• Press│   │          │       ▼                               │    │
│  │  │• HOA  │   │          │   [LAYFLAT TO FIELD]                 │    │
│  │  └───────┘   │          │                                      │    │
│  └──────────────┘          └──────────────────────────────────────┘    │
│                                                                         │
│                    ┌─────────────────────┐                             │
│                    │   CLOUD / APP       │                             │
│                    │   (Tiny Seed OS)    │                             │
│                    │   • Commands        │                             │
│                    │   • Alerts          │                             │
│                    │   • Logging         │                             │
│                    └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Permanent Infrastructure - Quick-Connect Ports

**Purpose:** Standardize each irrigation location for fast module attachment

**Per-Port Bill of Materials:**
| Item | Spec | Qty | Notes |
|------|------|-----|-------|
| Existing ball valve | 2" manual | 1 | Already installed |
| NPT to Camlock adapter | 2" Male NPT → 2" Camlock Male | 1 | Stays installed |
| Camlock dust cap | 2" | 1 | Cap when not in use |

**Installation Notes:**
- Thread sealant (Teflon tape + pipe dope) on all NPT connections
- Orient camlock arms for easy access
- Label each port (Zone A, Zone B, etc.)

---

### 2. Smart Valve Module (Portable)

**Purpose:** The "brain" that moves between zones

#### 2.1 Mechanical Assembly

```
[INLET]──►[Camlock Female 2"]──►[Motorized Ball Valve]──►[Pressure Sensor Tee]──►[Camlock Male 2"]──►[OUTLET]
                                        │                          │
                                        │                          │
                                   [12V Power]              [Sensor Wire]
                                        │                          │
                                        └──────────┬───────────────┘
                                                   │
                                            [CONTROL BOX]
                                            • MCU + Cellular
                                            • Battery + Solar
```

#### 2.2 Bill of Materials

| Component | Specification | Est. Cost | Source |
|-----------|---------------|-----------|--------|
| Motorized ball valve | 2" NPT, 12V DC, fail-closed (NC), 304SS | $80-150 | Amazon/Aliexpress |
| Camlock adapter (inlet) | 2" Female Camlock → 2" Female NPT | $15 | Supply house |
| Camlock adapter (outlet) | 2" Male NPT → 2" Male Camlock | $15 | Supply house |
| Pressure sensor | 0-100 PSI, 1/4" NPT, 0.5-4.5V output | $15-25 | Amazon |
| Pressure sensor tee | 2" NPT × 2" NPT × 1/4" NPT | $20 | Supply house |
| Microcontroller | ESP32 or similar | $10 | Amazon |
| Cellular modem | LTE Cat-M1/NB-IoT (Hologram, KORE, etc.) | $30-50 | Hologram.io |
| SIM card | Data-only IoT SIM | $3-5/mo | KORE, Hologram |
| Solar panel | 20W, 12V | $30-40 | Amazon |
| MPPT charge controller | 12V, 10A | $15-25 | Amazon |
| Battery | 12V 7-12Ah SLA or LiFePO4 | $25-50 | Amazon |
| Enclosure | NEMA 4X, ~12"×10"×6" | $40-60 | Amazon |
| Wiring, connectors, misc | 12AWG, terminals, fuses | $30 | Various |

**Estimated Module Cost:** $350-500

#### 2.3 Valve Requirements

| Requirement | Specification |
|-------------|---------------|
| Fail state | **CLOSED** (Normally Closed) |
| Actuation | 12V DC motor |
| Actuation time | <15 seconds full stroke |
| Manual override | Must have manual lever |
| Material | 304 or 316 Stainless Steel |
| Port size | 2" NPT |
| Pressure rating | 150+ PSI |

**Critical:** Fail-closed means power OFF = valve CLOSED. This is the safe default for irrigation.

#### 2.4 Power Budget

| Component | Current Draw | Duty Cycle | Daily Ah |
|-----------|--------------|------------|----------|
| MCU (sleep) | 10mA | 95% | 0.23 Ah |
| MCU (active) | 80mA | 5% | 0.10 Ah |
| Cellular (sleep) | 5mA | 90% | 0.11 Ah |
| Cellular (tx) | 500mA | 1% | 0.12 Ah |
| Valve open | 2A | <1% | 0.05 Ah |
| **Total** | | | **~0.6 Ah/day** |

**Recommendation:** 12V 12Ah battery provides ~20 days autonomy. 20W panel recharges in <2 hours full sun.

#### 2.5 Connectivity

| Parameter | Specification |
|-----------|---------------|
| Technology | LTE Cat-M1 or NB-IoT |
| Data model | Event-based (not streaming) |
| Protocol | MQTT or HTTPS |
| Heartbeat | Every 5-15 minutes |
| Command latency | <30 seconds acceptable |

**Events transmitted:**
- Valve state change (OPEN/CLOSED) + ACK
- Pressure reading (on demand or with state change)
- Low battery alert
- Cellular signal quality (periodic)
- Error conditions

---

### 3. Pump Station Node

**Purpose:** Remote pump control + system-wide flow metering

#### 3.1 Architecture

```
                    ┌───────────────────────────────────────┐
                    │           PUMP STATION NODE           │
                    │                                       │
[Utility Power]────►│  ┌─────────────────────────────────┐ │
                    │  │      HOA CONTROL PANEL          │ │
                    │  │  ┌─────┐ ┌─────┐ ┌─────────┐   │ │
                    │  │  │HAND │ │ OFF │ │  AUTO   │   │ │
                    │  │  │(Tim)│ │     │ │(Smart)  │   │ │
                    │  │  └──┬──┘ └──┬──┘ └────┬────┘   │ │
                    │  │     └───────┴─────────┘        │ │
                    │  │              │                  │ │
                    │  │         [CONTACTOR]            │ │
                    │  │              │                  │ │
                    │  └──────────────┼──────────────────┘ │
                    │                 │                    │
                    │            [PUMP MOTOR]              │
                    │                 │                    │
                    │  ┌──────────────┼──────────────────┐ │
                    │  │         DISCHARGE PIPE          │ │
                    │  │              │                  │ │
                    │  │     [PRESSURE SENSOR]          │ │
                    │  │              │                  │ │
                    │  │      [FLOW METER 3"]           │ │
                    │  │              │                  │ │
                    │  │         TO MAIN LINE──────────►│ │
                    │  └─────────────────────────────────┘ │
                    │                                       │
                    │  ┌─────────────────────────────────┐ │
                    │  │       PUMP CONTROLLER           │ │
                    │  │  • MCU + Cellular               │ │
                    │  │  • Contactor relay              │ │
                    │  │  • Sensor inputs                │ │
                    │  └─────────────────────────────────┘ │
                    └───────────────────────────────────────┘
```

#### 3.2 HOA (Hand-Off-Auto) Switch

| Position | Behavior |
|----------|----------|
| **HAND** | Existing timer controls pump (bypass smart system) |
| **OFF** | Pump locked out (maintenance mode) |
| **AUTO** | Smart controller controls pump |

**Requirement:** Physical switch, not software-controlled. Provides guaranteed manual fallback.

#### 3.3 Pump Node Bill of Materials

| Component | Specification | Est. Cost |
|-----------|---------------|-----------|
| Flow meter | 3" electromagnetic or ultrasonic | $200-400 |
| Pressure transducer | 0-150 PSI, 4-20mA or 0-5V | $30-50 |
| HOA selector switch | 3-position, maintained | $25 |
| Contactor | Appropriately rated for pump motor | $40-80 |
| MCU + Cellular | Same as valve module | $40-60 |
| Enclosure | NEMA 4X rated | $50-80 |
| Wiring, conduit | Per local code | $50-100 |

**Estimated Pump Node Cost:** $450-800

#### 3.4 Flow Meter Placement

**Location:** Pump discharge, in rigid pipe (3" schedule 40 or 80)

**Requirements:**
- Straight run upstream: 10× pipe diameter (30" minimum)
- Straight run downstream: 5× pipe diameter (15" minimum)
- Horizontal or vertical (per meter spec)
- Union fittings for removal

---

## Software Integration

### 4.1 Tiny Seed OS Integration Points

| Feature | Apps Script Function | Description |
|---------|---------------------|-------------|
| Valve control | `setValveState(zoneId, state)` | Open/close valve |
| Pump control | `setPumpState(state)` | Start/stop pump |
| Get status | `getIrrigationStatus()` | All sensors + states |
| Log irrigation | `logIrrigationEvent(...)` | Record to sheet |
| Send alert | `sendIrrigationAlert(...)` | SMS/notification |

### 4.2 Data Logging (Google Sheets)

**Sheet: IRRIGATION_LOG**
| Column | Description |
|--------|-------------|
| Timestamp | Event time |
| Zone | Which zone/port |
| Event Type | VALVE_OPEN, VALVE_CLOSE, PUMP_ON, etc. |
| Pump Pressure | PSI at pump |
| Module Pressure | PSI at valve module |
| Flow Rate | GPM (if pump running) |
| Flow Total | Gallons since valve opened |
| Duration | Minutes |
| Notes | Alerts, errors |

### 4.3 Alert Logic

| Condition | Alert | Action |
|-----------|-------|--------|
| Pump ON, pump pressure low (<10 PSI after 30s) | "Pump issue - no pressure" | Auto-stop pump |
| Valve OPEN, module pressure low (<5 PSI after 60s) | "No water at zone - check valves/layflat" | Warning only |
| Pressure spike (>80 PSI) | "Overpressure warning" | Auto-close valve |
| Module battery low (<11.5V) | "Module battery low" | Warning |
| Heartbeat missed (>30 min) | "Module offline" | Warning |

---

## Build Phases

### Phase 0: Bench Test (Off-Farm)

**Goal:** Prove command/acknowledge flow before buying valves

**Tasks:**
1. Assemble valve controller electronics (MCU + cellular + relay)
2. Assemble pump controller electronics (MCU + cellular + relay)
3. Use **12V bulbs** as dummy loads (simulate valve/pump)
4. Write firmware: command parsing, state reporting, heartbeat
5. Write Tiny Seed OS integration: send commands, receive status
6. Test: Open valve → bulb lights → ACK received
7. Test: Alerts fire correctly

**Deliverable:** Working command/control without any plumbing

---

### Phase 1: Quick-Connect Port Conversion

**Goal:** Standardize 4 field ports + 4 layflat ends

**Tasks:**
1. Purchase camlock adapters (8× male, 8× female, 8× caps)
2. Install 2" NPT → camlock adapters at each field port
3. Install camlock fittings on layflat ends
4. Test connections manually
5. Label all ports

**Deliverable:** Any port can accept the smart module in <2 minutes

---

### Phase 2: Build Smart Valve Module

**Goal:** Field-ready portable valve module

**Tasks:**
1. Assemble mechanical: camlock → valve → pressure → camlock
2. Bench test valve operation (12V open/close cycles)
3. Integrate electronics from Phase 0
4. Build solar/battery enclosure
5. Weatherproofing: cable glands, desiccant, ventilation
6. Field test at one port
7. Verify pressure readings correlate with actual water flow

**Deliverable:** Working portable module ready for season

---

### Phase 3: Pump Station Upgrade

**Goal:** Remote pump control + flow metering

**Tasks:**
1. Install HOA switch (electrician required)
2. Install contactor for smart control
3. Install pump pressure sensor
4. Install 3" flow meter in discharge pipe
5. Integrate pump controller electronics
6. Test HOA positions
7. Calibrate flow meter
8. Connect to Tiny Seed OS

**Deliverable:** Full remote irrigation capability

---

## Safety & Manual Override

### Critical Requirements

1. **Physical HOA switch** at pump - always accessible
2. **Manual ball valves** remain at every port
3. **Fail-closed valves** - power loss = water stops
4. **No software lockouts** - manual always works
5. **Pressure relief** - ensure main line has relief valve
6. **Fused circuits** - protect all 12V wiring

### Emergency Procedures

| Scenario | Action |
|----------|--------|
| Module unresponsive | Close manual ball valve, remove module |
| Pump unresponsive | Switch HOA to OFF, use manual timer |
| Overpressure | System auto-closes valve; verify relief valve |
| Cellular outage | System continues last state; visit farm |

---

## Seasonal Operations

### Spring Startup
1. Charge module battery
2. Test cellular connectivity
3. Verify valve operation
4. Test pressure sensor
5. Prime pump, verify flow meter
6. Run test cycle on each zone

### Winter Shutdown
1. Drain all lines
2. Remove smart valve module
3. Store module indoors (protect battery)
4. Cap all camlock ports
5. Switch pump HOA to OFF
6. Cover/protect pump node

---

## Future Enhancements (After V1 Proven)

- **Multiple valve modules** (dedicated per zone)
- **Soil moisture sensors** → auto-irrigation
- **Weather API integration** → skip if rain forecast
- **Runtime scheduling** in Tiny Seed OS
- **Historical analytics** → water usage trends

---

## Contacts & Responsibilities

| Role | Responsibility | Name |
|------|----------------|------|
| Project Owner | Requirements, testing, operations | Todd |
| Electronics/Firmware | MCU, cellular, firmware | TBD |
| Plumbing/Mechanical | Valve assembly, port conversion | TBD |
| Electrical | Pump station wiring, HOA | Licensed Electrician |
| Software | Tiny Seed OS integration | Claude / Developer |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-04 | Initial specification |

---

*Prepared by PM_Architect Claude for Tiny Seed Farm*
