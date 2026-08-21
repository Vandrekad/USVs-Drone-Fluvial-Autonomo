# Teste: Módulo Storage (LittleFS + Buffers Offline)

## O que testa
- `initFileSystem()` — montagem do LittleFS
- `appendLineToFile()` / `readFileLines()` / `writeFileLines()` — CRUD de arquivos
- Buffer de telemetria offline (append + leitura + validação JSON)
- Buffer de path points offline (lat/lon/ts)
- Stress test com 20 entradas sequenciais

## Hardware necessário
- ESP32 (flash interna para LittleFS — não requer hardware externo)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_storage -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] initFileSystem                            => PASS
[TEST] appendLineToFile (3 linhas)               => PASS
[TEST] readFileLines (leu 3)                     => PASS
[TEST] conteúdo linha 1                          => PASS
[TEST] writeFileLines                            => PASS
[TEST] bufferTelemetryOffline (append)           => PASS
[TEST] bufferPathPointOffline (append)           => PASS
[TEST] path buffer JSON válido                   => PASS
[TEST] buffer 20 entradas (escrita)              => PASS
[TEST] buffer 20 entradas (leitura)              => PASS
RESULTADO: N PASS / 0 FAIL
```
