#!/usr/bin/env python3
"""
rpi_daemon.py — Daemon de bordo do Raspberry Pi 4 (F2).

Costura as duas metades:
  ESP32 --(UART telemetria/eventos)--> serial_bridge --> firebase_client --> RTDB
  RTDB  --(comando do dashboard)------> firebase_client --> serial_bridge --> ESP32

Modos:
  Produção (hardware + Firebase real):
      python rpi_daemon.py --port /dev/serial0 \
          --service-account /home/pi/serviceAccount.json \
          --database-url https://usvs-...-rtdb.firebaseio.com/ \
          --drone-id drone_01

  Mock em memória (sem rede, sem hardware — usado no selftest):
      python rpi_daemon.py --selftest
"""

from __future__ import annotations

import argparse
import sys
import time

from firebase_client import FirebasePublisher, MockRTDB, RTDBClient

DRONE_ID_DEFAULT = "drone_01"


class RpiDaemon:
    """Orquestra a ponte serial <-> RTDB. `bridge` e `backend` são injetados
    para permitir teste com duplos (mock) sem hardware nem rede."""

    def __init__(self, bridge, backend, drone_id: str = DRONE_ID_DEFAULT) -> None:
        self.bridge = bridge
        self.publisher = FirebasePublisher(backend, drone_id)
        self.backend = backend
        self.drone_id = drone_id

    # ── ESP32 -> RTDB ────────────────────────────────────────────────
    def on_esp32_message(self, msg: dict) -> None:
        mtype = msg.get("type")
        if mtype == "telemetry":
            self.publisher.publish_telemetry(msg)
        elif mtype == "event":
            self.publisher.publish_event(msg)
        # ack/pong: nada a publicar (o dashboard não precisa deles)

    # ── RTDB -> ESP32 ────────────────────────────────────────────────
    def on_rtdb_command(self, command: dict) -> None:
        cmd = command.get("cmd_type") or command.get("cmd")
        cid = command.get("command_id", "")
        mid = command.get("mission_id", "")
        if cmd == "set_destination":
            target = command.get("target") or {}
            lat = target.get("lat", command.get("lat"))
            lon = target.get("lon", command.get("lon"))
            self.bridge.set_destination(cid, mid, lat, lon)
        elif cmd == "emergency_stop":
            self.bridge.emergency_stop(cid, mid)
        # comandos desconhecidos são ignorados (ESP32 também os rejeita)

    def start(self) -> None:
        self.bridge.on_message = self.on_esp32_message
        self.bridge.open()
        self.backend.listen_command(self.drone_id, self.on_rtdb_command)

    def stop(self) -> None:
        try:
            self.publisher.set_offline()
        except Exception:
            pass
        self.bridge.close()
        self.backend.close()


# ── produção ─────────────────────────────────────────────────────────
def run_production(args) -> None:
    from serial_bridge import SerialBridge  # import tardio (pyserial só na prod)

    backend = RTDBClient(args.service_account, args.database_url)
    bridge = SerialBridge(args.port, args.baud)  # on_message setado pelo daemon
    daemon = RpiDaemon(bridge, backend, args.drone_id)
    daemon.start()
    print(f"[DAEMON] Rodando. porta={args.port} drone={args.drone_id}. Ctrl+C para sair.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[DAEMON] Encerrando...")
    finally:
        daemon.stop()


# ── selftest em memória (sem hardware, sem rede, sem pyserial) ────────
class _FakeBridge:
    """Duplo do SerialBridge: registra comandos enviados ao ESP32 e permite
    empurrar telemetria como se viesse da UART."""

    def __init__(self) -> None:
        self.on_message = None
        self.sent: list[dict] = []
        self.opened = False

    def open(self) -> None:
        self.opened = True

    def close(self) -> None:
        self.opened = False

    def set_destination(self, cid, mid, lat, lon) -> None:
        self.sent.append({"cmd": "set_destination", "command_id": cid,
                          "mission_id": mid, "lat": lat, "lon": lon})

    def emergency_stop(self, cid, mid) -> None:
        self.sent.append({"cmd": "emergency_stop", "command_id": cid, "mission_id": mid})

    def feed(self, msg: dict) -> None:
        if self.on_message:
            self.on_message(msg)


def run_selftest() -> int:
    bridge = _FakeBridge()
    backend = MockRTDB()
    daemon = RpiDaemon(bridge, backend, "drone_01")
    daemon.start()
    assert bridge.opened, "bridge deveria estar aberta"

    # 1) telemetria do ESP32 -> RTDB (telemetry + status + path)
    bridge.feed({
        "type": "telemetry", "ts": 1000, "lat": -3.1019, "lon": -60.025, "hdg": 145.2,
        "obs": 120, "bat": 7400, "thrust_l": 80, "thrust_r": 65,
        "state": "NAVIGATING_TO_GOAL", "mission_id": "m_1", "active_leg": 1, "progress": 0.52,
    })
    tel = backend.get("/drones/drone_01/telemetry")
    assert tel and tel["position"]["lat"] == -3.1019, "telemetria nao publicada"
    st = backend.get("/drones/drone_01/status")
    assert st and st["nav_state"] == "NAVIGATING_TO_GOAL" and st["online"] is True, "status errado"
    path = backend.get("/missions/m_1/path/p_1000")
    assert path and path["ts"] == 1000, "ponto de rota nao publicado"

    # 2) evento do ESP32 -> /logs
    bridge.feed({"type": "event", "event": "obstacle_detected", "value": 45, "ts": 1001})
    logs = backend.get("/logs")
    assert logs and any(v.get("type") == "obstacle_detected" for v in logs.values()), "log nao publicado"

    # 3) comando do dashboard (RTDB) -> ESP32 via bridge (formato contrato: cmd_type + target)
    backend.inject_command("drone_01", {
        "command_id": "cmd_1", "cmd_type": "set_destination", "mission_id": "m_1",
        "target": {"lat": -3.1050, "lon": -60.0300},
    })
    assert bridge.sent and bridge.sent[-1] == {
        "cmd": "set_destination", "command_id": "cmd_1", "mission_id": "m_1",
        "lat": -3.1050, "lon": -60.0300,
    }, f"comando nao repassado corretamente: {bridge.sent}"

    # 4) emergency_stop do dashboard -> ESP32
    backend.inject_command("drone_01", {
        "command_id": "cmd_2", "cmd_type": "emergency_stop", "mission_id": "m_1",
    })
    assert bridge.sent[-1]["cmd"] == "emergency_stop", "emergency_stop nao repassado"

    # 5) ack/pong nao geram escrita
    tree_before = backend.get("/logs")
    n_logs_before = len(tree_before)
    bridge.feed({"type": "ack", "command_id": "cmd_1", "ok": True})
    bridge.feed({"type": "pong"})
    assert len(backend.get("/logs")) == n_logs_before, "ack/pong nao deveriam virar log"

    # 6) stop marca offline
    daemon.stop()
    assert backend.get("/drones/drone_01/status/online") is False, "deveria marcar offline no stop"

    print("SELF-TEST F2 OK - telemetria/status/path/logs publicados, "
          "comandos set_destination/emergency_stop repassados, ack/pong ignorados, offline no stop.")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description="Daemon de bordo RPi4 (F2) - ponte UART <-> RTDB")
    ap.add_argument("--selftest", action="store_true", help="Roda selftest em memoria (sem hardware/rede)")
    ap.add_argument("--port", help="Porta serial do ESP32 (ex: /dev/serial0)")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--service-account", help="Caminho do serviceAccount.json do Firebase")
    ap.add_argument("--database-url", help="URL do RTDB")
    ap.add_argument("--drone-id", default=DRONE_ID_DEFAULT)
    args = ap.parse_args()

    if args.selftest:
        sys.exit(run_selftest())
    if not (args.port and args.service_account and args.database_url):
        ap.error("produção exige --port, --service-account e --database-url (ou use --selftest)")
    run_production(args)


if __name__ == "__main__":
    main()
