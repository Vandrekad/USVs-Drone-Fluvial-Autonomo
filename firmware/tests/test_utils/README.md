# Teste: Módulo Utils

## O que testa
- `deg2rad()` — conversão graus → radianos
- `wrapAngleDeg()` — normalização de ângulo para [-180, 180]
- `headingErrorDeg()` — erro angular entre headings (shortest path)
- `computeSHA256Hex()` — hash SHA-256 com valores conhecidos
- `nmeaToDecimal()` — conversão de coordenadas NMEA para decimal
- `computeLocalPathHash()` — hash de buffer de path points

## Hardware necessário
- ESP32 (teste puramente computacional, sem sensores)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_utils -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] deg2rad(180) ~= PI                       => PASS
[TEST] wrapAngleDeg(270) == -90                  => PASS
[TEST] headingError(10,350) == 20                => PASS
[TEST] SHA256('hello') known value               => PASS
[TEST] nmeaToDecimal(4807.038,N) ~= 48.1173     => PASS
[TEST] computeLocalPathHash determinístico       => PASS
RESULTADO: N PASS / 0 FAIL
```
