# Teste: Módulo Net (WiFi + Firebase)

## O que testa
- `setupWiFi()` / `manageWiFi()` — conexão e reconexão WiFi
- `setupFirebase()` — autenticação e inicialização do Firebase RTDB
- `updateStatus()` — escrita de status no path `/drones/drone_01/status`
- `publishTelemetry()` — envio de JSON de telemetria
- `setOfflinePresence()` — escrita de `online=false`

## Pré-requisitos
- ESP32 com acesso à rede WiFi configurada em `wifi_manager.cpp`
- Projeto Firebase provisionado (URL e API key em `firebase_manager.cpp`)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_net -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] WiFi connection                  => PASS
[TEST] setupFirebase                    => PASS
[TEST] Firebase.ready()                 => PASS
[TEST] updateStatus                     => PASS
[TEST] publishTelemetry                 => PASS
[TEST] setOfflinePresence               => PASS
RESULTADO: 6 PASS / 0 FAIL
```
