# Teste: Módulo State

## O que testa
- Valores default de todas as variáveis globais de estado
- Mutabilidade das variáveis (escrita e leitura)
- Constantes de intervalo (telemetry, status, command)
- Paths de buffer offline (telemetryBufferPath, pathBufferPath)

## Hardware necessário
- ESP32 (teste puramente de leitura/escrita de variáveis)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_state -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] droneId == 'drone_01'                     => PASS
[TEST] currentState == IDLE                      => PASS
[TEST] currentLat default ~= -3.1019            => PASS
[TEST] batteryMv == 8000                         => PASS
[TEST] currentState mutável                      => PASS
[TEST] telemetryIntervalMs == 2000               => PASS
[TEST] telemetryBufferPath contains .ndjson      => PASS
RESULTADO: N PASS / 0 FAIL
```
