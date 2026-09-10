# RPi4 — Lado Raspberry Pi da migração USV-AM (F1)

Transporte serial JSON-lines entre o **Raspberry Pi 4** e o **ESP32**.
Nesta fase (F1) só existe o transporte + um simulador do ESP32 para testar
**sem hardware** (estratégia mock-first do cronograma: o código é migrado antes
dos componentes chegarem).

## Arquivos

| Arquivo | Função |
|---|---|
| `serial_bridge.py` | Ponte: lê telemetria do ESP32, envia comandos (`SerialBridge`) |
| `esp32_simulator.py` | Emula o firmware ESP32 (telemetria + resposta a comandos) |
| `requirements.txt` | `pyserial` (F1). `firebase-admin` entra na F2 |

## Protocolo (JSON-lines, 115200 baud)

Pinout: **RPi GPIO14/15 (TXD/RXD) ↔ ESP32 GPIO16/17 (Serial2)** — 3.3V direto.
O GPS do ESP32 foi movido para GPIO 25/26 (Serial1) para liberar a Serial2.

### RPi → ESP32 (comandos)
```json
{"cmd":"set_destination","command_id":"cmd_1","mission_id":"m_1","lat":-3.105,"lon":-60.03,"issued_at":1712...}
{"cmd":"emergency_stop","command_id":"cmd_2","mission_id":"m_1"}
{"cmd":"request_telemetry"}
{"cmd":"ping"}
```

### ESP32 → RPi
```json
{"type":"telemetry","ts":..,"lat":..,"lon":..,"hdg":..,"obs":..,"bat":..,"thrust_l":..,"thrust_r":..,"state":"..","mission_id":"..","active_leg":..,"progress":..}
{"type":"ack","command_id":"cmd_1","ok":true}
{"type":"event","event":"obstacle_detected","value":45}
{"type":"pong"}
```

O ESP32 deduplica por `command_id` (mesmo id → ack idempotente, sem reprocessar).
Se o RPi ficar em silêncio por `RPI_LINK_TIMEOUT_MS` (30s), o ESP32 assume modo
autônomo e volta a publicar direto no Firebase — **a invariante de autonomia**.

## Setup

```bash
cd rpi
python -m venv .venv
# Windows:  .venv\Scripts\activate     Linux/RPi:  source .venv/bin/activate
pip install -r requirements.txt
```

## Testar SEM hardware

### Opção A — autoteste do simulador (não precisa de porta serial)
Valida todo o protocolo em loopback (ping/pong, set_destination, dedup,
navegação até concluir, emergency_stop, comando inválido):
```bash
python esp32_simulator.py --selftest
```

### Opção B — bridge real contra o simulador via par de portas virtuais
Crie um par de portas seriais virtuais conectadas entre si:

- **Linux:** `socat -d -d pty,raw,echo=0 pty,raw,echo=0`
  (imprime dois `/dev/pts/N` — um para o simulador, outro para a bridge)
- **Windows:** instale [com0com](https://sourceforge.net/projects/com0com/) e crie
  um par (ex.: `CNCA0` ↔ `CNCB0`).

Terminal 1 (ESP32 simulado):
```bash
python esp32_simulator.py --port /dev/pts/3     # ou CNCB0 no Windows
```
Terminal 2 (bridge do RPi, com demo de comandos):
```bash
python serial_bridge.py --port /dev/pts/4 --demo # ou CNCA0 no Windows
```
A bridge deve imprimir `[PONG]`, `[ACK ] ok=True` e um fluxo de `[TELEM]` com a
posição avançando em direção ao destino.

## Testar COM hardware (a partir de 19/09, quando os componentes chegarem)

No RPi, habilite a UART (`raspi-config` → Interface → Serial: login shell **não**,
hardware serial **sim**) e ligue:
```bash
python serial_bridge.py --port /dev/serial0 --demo
```

## Uso como biblioteca (F2 — firebase_client vai consumir isto)

```python
from serial_bridge import SerialBridge

def on_msg(msg: dict):
    if msg["type"] == "telemetry":
        ...  # publicar no RTDB (F2)

bridge = SerialBridge("/dev/serial0", on_message=on_msg)
bridge.open()
bridge.set_destination("cmd_1", "m_1", -3.105, -60.03)
```
