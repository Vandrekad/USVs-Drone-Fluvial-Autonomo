# Teste: Módulo Navigation

## O que testa
- `navStateToString()` — conversão de enum para string
- `computeDistanceMeters()` — fórmula haversine
- `computeLOSHeading()` — algoritmo Line-of-Sight com cross-track error
- `updateLOSControl()` — controle diferencial de thrust com base no heading
- Detecção de obstáculo → transição para OBSTACLE_AVOIDANCE
- `advanceTowards()` — simulação de deslocamento por step

## Hardware necessário
- ESP32 (motores opcionais — teste gera PWM mas validação é computacional)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_navigation -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] navStateToString IDLE                     => PASS
[TEST] navStateToString NAV                      => PASS
[TEST] computeDistanceMeters (~111m)             => PASS
[TEST] computeDistanceMeters (0m)                => PASS
[TEST] computeLOSHeading (norte, não-NaN)        => PASS
[TEST] updateLOSControl (gera thrust)            => PASS
[TEST] obstacle triggers OBSTACLE_AVOIDANCE      => PASS
[TEST] advanceTowards (moveu ~50m)               => PASS
RESULTADO: N PASS / 0 FAIL
```
