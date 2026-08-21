# Teste: Módulo Commands

## O que testa
- `setNavState()` — transição de estados de navegação
- `handleCommand(set_destination)` — inicializa missão, define goal, calcula distância
- `handleCommand(emergency_stop)` — retorno para origem
- `fetchCommand()` (online) — leitura de comando do RTDB

## Hardware necessário
- ESP32 (WiFi para teste online de fetchCommand, caso contrário testes offline funcionam)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_commands -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] setNavState -> NAVIGATING_TO_GOAL         => PASS
[TEST] setNavState -> RETURNING_TO_HOME          => PASS
[TEST] set_destination: nav_state                => PASS
[TEST] set_destination: goalLat                  => PASS
[TEST] set_destination: routeDistance > 0        => PASS
[TEST] emergency_stop: nav_state RTH             => PASS
[TEST] emergency_stop: goal = home               => PASS
[TEST] fetchCommand (executou sem crash)         => PASS
RESULTADO: N PASS / 0 FAIL
```
