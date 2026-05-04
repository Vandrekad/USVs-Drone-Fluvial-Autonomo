# Product Requirements Document (PRD)
## USV-AM: Autonomous Fluvial Drone System

**Document Version:** 1.0  
**Status:** Active Development  
**Release Target:** May 18, 2026 (Phase 1 MVP)  
**Document Type:** Complete End-to-End Specification

---

## 1. Executive Summary

USV-AM is an open-source autonomous surface vehicle platform designed for Amazonian river environments. Phase 1 delivers a fully autonomous, GPS-navigated watercraft with real-time cloud monitoring and web-based operator control. The system architecture guarantees online and offline operation without backend dependency for navigation autonomy.

**Key Deliverable:** Functional catamaran prototype (drone_01) capable of autonomous GPS-based navigation with emergency stop, obstacle avoidance, and persistent telemetry logging.

---

## 2. System Requirements

### 2.1 Firmware Requirements (ESP32)

#### 2.1.1 Navigation & Control
- **Differential Propulsion:** Two independent motors with PWM speed control
- **GPS Navigation:** Real-time positioning with NEO-6M module
  - Position accuracy: ±2.5m (consumer grade)
  - Update rate: 5Hz
  - Support for NMEA sentences
- **Heading Control:** Digital compass (HMC5883L) with calibration
- **Waypoint Following:** Line-of-Sight (LOS) algorithm with local path generation
- **Current Compensation:** Estimated from GPS Course-over-Ground vs heading delta
- **Obstacle Detection:** Ultrasonic sensor (HC-SR04) with reactive avoidance

#### 2.1.2 State Machine (Operating Modes)
- `IDLE_HOLDING_POSITION` - Maintaining position, ready for commands
- `NAVIGATING_TO_GOAL` - Following waypoints toward destination
- `OBSTACLE_AVOIDANCE` - Local reaction to detected obstacles
- `RETURNING_TO_HOME` - Return to origin (emergency or mission end)
- `OFFLINE_NAVIGATION` - Autonomous operation without cloud connectivity

#### 2.1.3 Telemetry & Communication
- **Publishing Frequency:** 1-2 second intervals
- **Data Points:** Position, heading, battery voltage, motor PWM, obstacle distance
- **Cloud Sync:** Firebase RTDB real-time updates
- **Offline Buffering:** LittleFS storage with hash-based deduplication

#### 2.1.4 Fail-Safe Mechanisms
- **Automatic Reconnection:** WiFi reconnect with exponential backoff
- **Offline Buffer:** LittleFS persistence for telemetry and path data
- **Presencia Detection:** onDisconnect() triggers online=false status
- **Path Deduplication:** SHA256 hash comparison of last 5 points to prevent duplicates
- **Leg Timeout:** 30-second maximum in waypoint capture radius before forced advance

#### 2.1.5 Command Processing
- **Command Stream:** Listen on `/drones/{drone_id}/command` with change detection
- **Command Types (MVP):**
  - `set_destination` - Set GPS target for autonomous navigation
  - `emergency_stop` - Trigger return to origin
- **Antiduplication:** Process only new command_id values
- **Route Generation:** Automatic waypoint calculation from origin to target

### 2.2 Backend Requirements (Firebase RTDB)

#### 2.2.1 Data Schema
```
/drones/{drone_id}/
  ├── telemetry/     (real-time sensor data)
  ├── command/       (mission commands from frontend)
  └── status/        (operational state and presence)
/missions/{mission_id}/
  ├── route/         (planned waypoints)
  ├── path/          (recorded navigation trail)
  └── metadata       (mission info: start time, status, etc.)
/logs/{log_id}/      (event log entries)
```

#### 2.2.2 Security & Access Control
- **Firebase Auth:** Operator authentication required for all frontend operations
- **Security Rules:**
  - Firmware: Write-only access to telemetry, command listener, status updates
  - Frontend: Read telemetry/status/logs, write commands/missions, admin: full access
  - Anti-spam: Rate limiting on writes
- **Presence Management:** onDisconnect() automatic status updates

#### 2.2.3 Data Retention & Indexing
- **Indices:** drone_id, mission_id, timestamp for fast queries
- **Retention:** Logs retention policy (configurable, e.g., 90 days)
- **Historical Data:** Missions and paths retained indefinitely for audit

#### 2.2.4 Cloud Guarantees
- **Atomicity:** Status updates (online, nav_state, position) in single write
- **Consistency:** Firmware is single source of truth for operational state
- **Performance:** < 50ms latency for command propagation to firmware

### 2.3 Frontend Requirements (React + Leaflet)

#### 2.3.1 User Interface
- **Dashboard Layout:**
  - 70% Map pane (React Leaflet, OSM tiles)
  - 25% Telemetry panel (right sidebar)
  - 15% Logs panel (bottom tabbed interface)
  - 100% Responsive (desktop, tablet, mobile)

#### 2.3.2 Real-time Features
- **Map Updates:** Live marker position with heading rotation
- **Route Visualization:** Polyline animation as drone navigates
- **Telemetry Gauges:** Battery percentage, motor PWM, obstacle distance, operational state
- **Event Logs:** Categorized, filterable event stream with timestamps
- **Connection Status:** Visual indicator for online/offline state

#### 2.3.3 Operator Actions
- **Set Destination:** Click map or enter coordinates, creates mission with destination
- **Emergency Stop:** Confirmation modal, triggers return to origin
- **Monitor Progress:** View active leg, route progress percentage, estimated time
- **Log Filtering:** All / Warnings / Errors tabs

#### 2.3.4 Component Structure
```
Dashboard
├── Navbar (status, drone_id, user)
├── Map (Leaflet with markers, polylines, waypoints)
├── TelemetryPanel
│   ├── BatteryGauge
│   ├── StateIndicator
│   ├── MotorStatus
│   ├── ObstacleDistance
│   ├── RouteProgress
│   └── ActionButtons
├── Logs
│   ├── LogFilter (All/Warnings/Errors)
│   └── LogEntry (time, type, message)
└── Modals
    ├── SetDestinationModal
    └── ConfirmStopModal
```

#### 2.3.5 UX Principles
- **Operator as Observer:** Dashboard for monitoring, not manual piloting
- **Confirmation-based Actions:** All critical operations require user confirmation
- **Real-time Responsiveness:** No more than 2-second data staleness
- **Accessibility:** High contrast, large buttons for field use in sunlight
- **Offline-aware:** UI indicates connection status, prevents invalid operations

---

## 3. Data Contract Specifications

### 3.1 Telemetry Packet
**Path:** `/drones/{drone_id}/telemetry`  
**Frequency:** Every 1-2 seconds  
**Format:**
```json
{
  "timestamp": 1710624000,
  "mission_id": "m_1710624000",
  "position": {
    "lat": -3.1019,
    "lon": -60.0250,
    "heading": 145.2
  },
  "sensors": {
    "battery_mv": 7400,
    "obs_dist": 120
  },
  "actuators": {
    "thrust_l": 80,
    "thrust_r": 45
  }
}
```

### 3.2 Command Packet
**Path:** `/drones/{drone_id}/command`  
**Trigger:** Frontend writes; firmware processes only on new command_id  
**Set Destination:**
```json
{
  "command_id": "cmd_1710624000",
  "cmd_type": "set_destination",
  "target": {
    "lat": -3.1050,
    "lon": -60.0300
  },
  "mission_id": "m_1710624000",
  "issued_at": 1710624000
}
```

**Emergency Stop:**
```json
{
  "command_id": "cmd_1710624900",
  "cmd_type": "emergency_stop",
  "mission_id": "m_1710624000",
  "issued_at": 1710624900
}
```

### 3.3 Mission Document
**Path:** `/missions/{mission_id}`  
**Structure:**
```json
{
  "drone_id": "drone_01",
  "start_time": 1710624000,
  "status": "active",
  "origin": {
    "lat": -3.1019,
    "lon": -60.0250
  },
  "target": {
    "lat": -3.1050,
    "lon": -60.0300
  },
  "route": {
    "source": "firmware_autonomous",
    "version": 1,
    "active_leg": 0,
    "points": [
      {"idx": 0, "lat": -3.1019, "lon": -60.0250},
      {"idx": 1, "lat": -3.1035, "lon": -60.0268},
      {"idx": 2, "lat": -3.1050, "lon": -60.0300}
    ]
  },
  "path": {
    "p_1710624001": {"lat": -3.1019, "lon": -60.0250, "ts": 1710624001},
    "p_1710624003": {"lat": -3.1020, "lon": -60.0251, "ts": 1710624003}
  }
}
```

### 3.4 Status Document
**Path:** `/drones/{drone_id}/status`  
**Update Trigger:** On state change or leg advance  
**Atomic Write:**
```json
{
  "online": true,
  "last_seen": 1710624050,
  "active_mission_id": "m_1710624000",
  "nav_state": "NAVIGATING_TO_GOAL",
  "active_leg": 1,
  "route_progress": 0.52,
  "last_position": {
    "lat": -3.1020,
    "lon": -60.0255
  }
}
```

**nav_state Values:**
- `IDLE_HOLDING_POSITION` - Drone ready for commands
- `NAVIGATING_TO_GOAL` - Following waypoints
- `OBSTACLE_AVOIDANCE` - Local reactive movement
- `RETURNING_TO_HOME` - Return to origin
- `OFFLINE_NAVIGATION` - No cloud connection, autonomous operation

### 3.5 Log Entry
**Path:** `/logs/{log_id}`  
**Type:** Push (auto-generated ID)  
**Format:**
```json
{
  "drone_id": "drone_01",
  "mission_id": "m_1710624000",
  "type": "obstacle_detected",
  "position": {
    "lat": -3.1020,
    "lon": -60.0255
  },
  "value": 0.8,
  "timestamp": 1710624050
}
```

**Event Types:**
- `mission_started` - New mission created
- `navigating_to_goal` - State transition
- `leg_complete` - Waypoint reached
- `obstacle_detected` - Obstacle in path
- `emergency_stop` - Emergency command received
- `returning_to_home` - Return sequence started
- `connection_restored` - WiFi/cloud reconnected
- `mission_complete` - Destination reached
- `offline_buffer_flush` - LittleFS data synced

---

## 4. Technical Specifications

### 4.1 Firmware - LOS Algorithm (Line-of-Sight Navigation)

#### 4.1.1 Waypoint Generation
**Input:**
- origin (lat/lon)
- target (lat/lon)
- estimated river current velocity (~0.5-1.5 m/s)

**Algorithm:**
```
N = 3  (number of waypoints for typical 1-2 km mission)
for i in range(N):
  WP[i] = origin + (target - origin) * (i / (N-1))
```

#### 4.1.2 LOS Control Law
**Step 1 - Leg Angle Calculation:**
```
gamma_p = atan2(y_wp_next - y_current, x_wp_next - x_current)
```

**Step 2 - Cross-track Error:**
```
e_ct = distance from current position perpendicular to leg line
```

**Step 3 - Desired Course (LOS):**
```
Delta = 5-10m (lookahead distance)
chi_d = gamma_p - atan(e_ct / Delta)
```

**Step 4 - Current Compensation:**
```
beta_hat = COG_gps - heading_compass  (estimated current angle)
psi_ref = chi_d - beta_hat  (reference heading adjusted for current)
```

**Step 5 - Differential Propulsion:**
```
e_psi = psi_ref - heading_compass  (heading error)
Kp = 0.1-0.3  (proportional gain)

thrust_left = base_speed - Kp * e_psi
thrust_right = base_speed + Kp * e_psi

Apply PWM saturation [0, 255]
```

#### 4.1.3 Leg Transition
- Enter transition when distance to waypoint ≤ R_switch (3-6m)
- Start 30-second timer in capture radius
- If timer expires, force advance to next leg (current mitigation)
- If waypoint reached within timeout, advance normally
- On last waypoint, mission complete

### 4.2 Firmware - Offline Autonomy Guarantee

**Principle:** Firmware NEVER depends on backend for navigation execution.

**Implementation:**
1. Firmware generates local route immediately upon set_destination command
2. Route cached in local memory and LittleFS for persistence
3. Mission execution proceeds with or without cloud connectivity
4. Telemetry ATTEMPTS to publish but continues offline if unavailable
5. Upon reconnection, buffered telemetry flushed with deduplication

### 4.3 Firmware Build & Configuration

**Toolchain:**
- PlatformIO (recommended) or Arduino IDE 2.x
- ESP32 board support (Fixed version for reproducibility)
- Libraries:
  - Firebase-ESP-Client
  - TinyGPS++
  - ArduinoJson
  - HMC5883L driver
  - SPIFFS/LittleFS

**Configuration:**
- WiFi credentials (environment variable)
- Firebase config (project ID, auth domain)
- drone_id = "drone_01" (Phase 1)
- GPS UART pins (TX/RX 16/17)
- Compass I2C (SDA/SCL standard)
- Motor PWM pins (GPIO 12, 13)
- Ultrasonic pins (GPIO 14, 35)

### 4.4 Backend - Firebase RTDB Security

**Rules Pattern:**
```
{
  "drones": {
    "$drone_id": {
      "telemetry": {
        ".write": "auth.uid != null && root.child('owners').child($drone_id).child(auth.uid).exists()",
        ".read": "auth.uid != null && root.child('watchers').child(auth.uid).exists()"
      },
      "command": {
        ".write": "auth.uid != null && root.child('operators').child(auth.uid).exists()",
        ".read": "auth.uid != null"
      },
      "status": {
        ".write": "auth.uid != null && root.child('owners').child($drone_id).child(auth.uid).exists()",
        ".read": "auth.uid != null"
      }
    }
  }
}
```

### 4.5 Frontend - React Stack

**Framework:**
- React 18+ with Hooks
- Vite build tool
- React Leaflet for mapping
- Firebase SDK v9+ (compat mode optional)
- Tailwind CSS for styling

**Key Libraries:**
- react-leaflet (mapping)
- firebase/app, firebase/database, firebase/auth
- axios (HTTP client)
- zustand or Redux for state (optional)

---

## 5. Development Phases & Schedule

### 5.1 Phase Overview

| Phase | Dates | Duration | Goals | Success Criteria |
|-------|-------|----------|-------|----------------|
| **F0** | 28/03-30/03 | 3 days | Foundation | Repo, RTDB, dev env ready |
| **F1** | 31/03-13/04 | 2 weeks | Core dev with mocks | Mock-to-mock E2E working |
| **F2** | 14/04-27/04 | 2 weeks | Pre-hardware prep | Code stable, hardware pending |
| **F3** | 28/04-07/05 | 10 days | Hardware integration | Real telemetry flowing |
| **F4** | 08/05-14/05 | 7 days | Refinement | Performance tuning, field ready |
| **F5** | 15/05-18/05 | 4 days | Validation & delivery | MVP validated, documented |

### 5.2 Phase F0: Foundation (28/03-30/03)

**Objectives:**
- GitHub repo structure initialized
- Firebase project provisioned
- Development environments configured
- Frontend bootstrap initiated

**Tasks:**
- [ ] Create GitHub repo with main/dev/feature/* branches
- [ ] Set up Firebase RTDB and Firebase Auth
- [ ] Configure environment variables and secrets
- [ ] Initialize PlatformIO project structure
- [ ] Bootstrap React + Vite application
- [ ] Define drone_id = "drone_01"
- [ ] Validate toolchain installations

**Exit Criteria:** Environment fully operational, first deploy to dev branch

### 5.3 Phase F1: Parallel Development with Mocks (31/03-13/04)

**Firmware Tasks (Orlando):**
1. WiFi connection + heartbeat presence
2. State machine skeleton (IDLE, NAVIGATING, OBSTACLE, RETURNING)
3. Mock telemetry publishing
4. Command stream listening with antiduplication
5. Local waypoint generation algorithm
6. LittleFS buffer initialization
7. mock path recording

**Backend Tasks (Orlando + Ariadne):**
1. Security Rules definition per role
2. onDisconnect() configuration
3. Indices for missions and logs
4. Log retention policy

**Frontend Tasks (Ariadne):**
1. React Leaflet map component
2. Real-time telemetry listeners (mock data)
3. Telemetry panel gauges
4. Logs viewer with filtering
5. Set destination modal
6. Emergency stop modal with confirmation

**Exit Criteria:** Full E2E flow with mock data from firmware→backend→frontend

### 5.4 Phase F2: Pre-Hardware Preparation (14/04-27/04)

**Firmware Tasks (Orlando):**
1. LOS algorithm implementation
2. Compass calibration routine
3. Leg timeout handling (30s max in R_switch)
4. Path deduplication hash logic
5. Full mission state transitions
6. GPIO mapping review (pins for hardware)

**Frontend Tasks (Ariadne):**
1. Dashboard UX polish
2. Responsive layout verification
3. E2E tests with realistic mock data
4. Error states and loading UI

**Exit Criteria:** Codebase stable, ready for hardware arrival ~28/04

### 5.5 Phase F3: Hardware Integration (28/04-07/05)

**Hardware Assembly (Lucinao):**
1. Catamaran structure (2 PET bottles + plastic frame)
2. ESP32 + GPS + compass + ultrasonic mounting
3. Motor driver + 2 DC motors setup
4. Battery and power distribution
5. Electrical testing and continuity check

**Firmware Tasks (Orlando + Lucinao):**
1. GPIO bring-up for all sensors/actuators
2. GPS UART communication debugging
3. Compass I2C initialization and calibration
4. Motor PWM control validation
5. Real telemetry publishing to RTDB
6. Sensor data verification

**Backend/Cloud (Orlando + Ariadne):**
1. Validate real data schema compliance
2. Test onDisconnect() with actual WiFi loss
3. Security rule validation with real auth
4. Log ingestion and retention

**Frontend (Ariadne + Leonora):**
1. Live map tracking with real position
2. Real telemetry display
3. Mission creation with real firmware response
4. Dashboard state updates with actual data

**Exit Criteria:** Drone publishes real telemetry, dashboard receives live data

### 5.6 Phase F4: Final Refinement (08/05-14/05)

**Firmware Tasks (Orlando + Lucinao):**
1. LOS parameter tuning (Delta, Kp, R_switch)
2. Current compensation calibration for Amazonas context
3. Obstacle avoidance testing and threshold adjustment
4. Full fail-safe validation (WiFi drop/restore)
5. Offline buffer flush with deduplication testing
6. Stability and performance optimization

**Frontend (Ariadne):**
1. Visual polish and operator ergonomics
2. Field-use readability (bright sunlight)
3. Mobile responsiveness finalization
4. Error message clarity

**Exit Criteria:** All subsystems operational, field-ready

### 5.7 Phase F5: Validation & Delivery (15/05-18/05)

**Field Tests (All):**
1. Autonomous offline operation (no WiFi)
2. Emergency stop execution and return
3. Obstacle detection and avoidance
4. Multiple leg navigation (3+ waypoints)
5. WiFi reconnection and buffer sync
6. Live dashboard monitoring

**Documentation & Evidence:**
1. Video recordings of missions
2. RTDB exported logs
3. Dashboard screenshots
4. Test reports with metrics

**Acceptance:** MVP validated and ready for demonstration

---

## 6. Risk Mitigation & Safety

### 6.1 Operational Safety
- **Emergency Stop:** Always available, tested in each phase
- **Return to Origin:** Automatic on emergency_stop command
- **Connection Loss:** Firmware continues mission autonomously
- **Obstacle Detection:** Triggers avoidance response or timeout advance
- **Battery Low:** Warning at <30%, continue mission if acceptable

### 6.2 Technical Risks
- **GPS Signal Loss:** Use compass + dead reckoning for short term, timeout after 30s in leg
- **Compass Interference:** Pre-calibration required, detect erratic readings
- **Current Too Strong:** Reduce R_switch radius, increase leg timeout
- **WiFi Instability:** Automatic retry with exponential backoff (1s, 2s, 4s, 8s...)

### 6.3 Data Integrity
- **Command Replay Prevention:** command_id deduplication
- **Path Deduplication:** Hash-based offline buffer sync
- **Telemetry Timestamps:** Monotonic for offline sorting
- **Mission State:** Firmware single source of truth

---

## 7. Success Metrics (Phase 1 MVP)

| Metric | Target | Acceptance |
|--------|--------|-----------|
| GPS Waypoint Accuracy | ±2.5m | Route visual inspection OK |
| Navigation Autonomy | Offline 30min+ | Timer expires gracefully |
| Telemetry Latency | <2s | Real-time dashboard update |
| Emergency Stop Time | <1s | Visually confirmed |
| LOS Cross-track Error | <2.5m | Measured on 1-2km route |
| Current Compensation | Heading within ±10° | Comparison with/without LOS |
| Obstacle Detection | 1m+ range | Sensor tested, response tuned |
| Dashboard Responsiveness | <5s stale data | No frozen UI during high frequency updates |

---

## 8. Compliance & Documentation

### 8.1 Code Quality
- Firmware: Comments on critical algorithms
- Frontend: JSDoc for component props/hooks
- Backend: Schema documentation in RTDB_SCHEMA.md

### 8.2 Testing
- Unit tests for navigation algorithms (LOS, waypoint generation)
- E2E tests for mission flow (desktop browser)
- Field tests for hardware integration

### 8.3 Deliverables
- Source code in GitHub with clean history
- README with setup instructions
- PRD (this document) with technical details
- Architecture diagrams (Mermaid in README)
- Test logs and evidence of validation

---

## 9. Future Phases (Beyond Phase 1)

### Phase 2: Advanced Navigation
- A* path planning
- Multi-sensor fusion
- Enhanced current estimation

### Phase 3: Fleet Management
- Multi-drone coordination
- Enterprise dashboard
- Commercial APIs

### Phase 4: Research Platform
- Mission DSL (domain-specific language)
- ML model deployment
- Scientific data tools

---

## 10. References & Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **React Leaflet:** https://react-leaflet.js.org/
- **ESP32 Arduino Core:** https://github.com/espressif/arduino-esp32
- **PlatformIO:** https://platformio.org/
- **LOS Navigation:** Classical line-of-sight guidance law, aviation standard
- **Amazonas Context:** Average current 0.5-1.5 m/s, 5-10m visibility

---

**Document Approved By:** Development Team  
**Last Updated:** May 4, 2026  
**Next Review:** Post-Phase F0 (around April 1, 2026)

