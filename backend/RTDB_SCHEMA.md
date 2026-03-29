# Schema RTDB - USV-AM

## Estrutura Base

```
/ ├── drones/ │ └── {drone_id}/ │ ├── telemetry/ [atualizado a cada 1-2s] │ ├── command/ [stream de comando do frontend] │ └── status/ [estado operacional] ├── missions/ │ └── {mission_id}/ │ ├── route/ [waypoints gerados pelo firmware] │ └── path/ [histórico de posições] └── logs/ └── {log_id}/
```

## Detalhes de Nós

### `/drones/{drone_id}/telemetry`
- **Atualização:** a cada 1-2 segundos
- **Responsável:** Firmware
- **Exemplo:**
```json
{
  "position": { "lat": -3.1019, "lon": -60.0250, "heading": 145.2 },
  "sensors": { "battery_mv": 7400, "obs_dist": 120 },
  "actuators": { "thrust_l": 80, "thrust_r": 45 },
  "mission_id": "m_1710624000",
  "timestamp": 1710624000
}
```

### /drones/{drone_id}/status

Atualização: em mudanças de estado ou a cada 5s
Responsável: Firmware
Exemplo:
```json
{
  "online": true,
  "last_seen": 1710624050,
  "active_mission_id": "m_1710624000",
  "nav_state": "NAVIGATING_TO_GOAL",
  "active_leg": 1,
  "route_progress": 0.52,
  "last_position": { "lat": -3.1020, "lon": -60.0255 }
}
```

### /drones/{drone_id}/command

Responsável: Frontend (escreve), Firmware (lê)
Estrutura:
```json
{
  "command_id": "cmd_1710624000",
  "cmd_type": "set_destination|emergency_stop|...",
  "mission_id": "m_1710624000",
  "target": { "lat": -3.1050, "lon": -60.0300 },
  "issued_at": 1710624000
}
```

### /missions/{mission_id}
Responsável: Frontend (cria), Firmware (atualiza)
Exemplo:
```json
{
  "drone_id": "drone_01",
  "start_time": 1710624000,
  "status": "active|completed|failed",
  "origin": { "lat": -3.1019, "lon": -60.0250 },
  "target": { "lat": -3.1050, "lon": -60.0300 },
  "route": {
    "source": "firmware_autonomous",
    "version": 1,
    "active_leg": 0,
    "points": [
      { "idx": 0, "lat": -3.1019, "lon": -60.0250 },
      { "idx": 1, "lat": -3.1035, "lon": -60.0268 },
      { "idx": 2, "lat": -3.1050, "lon": -60.0300 }
    ]
  },
  "path": {
    "p_1710624001": { "lat": -3.1019, "lon": -60.0250, "ts": 1710624001 },
    "p_1710624003": { "lat": -3.1020, "lon": -60.0251, "ts": 1710624003 }
  }
}
```

### /logs/{log_id}
Responsável: Firmware
Exemplo:
```json
{
  "drone_id": "drone_01",
  "mission_id": "m_1710624000",
  "type": "obstacle_detected|connection_lost|nav_state_changed|error",
  "position": { "lat": -3.1020, "lon": -60.0255 },
  "value": "qualquer contexto relevante",
  "timestamp": 1710624050
}

```

