# Testes Isolados por Módulo - Firmware USV-AM

## Estrutura

Cada subdiretório contém um teste isolado para um módulo específico do firmware:

```
tests/
├── test_sensors/      # Sensores: GPS, bússola, ultrassônico, motores
├── test_net/          # WiFi + Firebase RTDB
├── test_navigation/   # Algoritmo LOS, cálculo de distância, controle
├── test_commands/     # Processamento de comandos do RTDB
├── test_storage/      # LittleFS, buffer offline, flush
├── test_utils/        # Funções matemáticas, SHA256, NMEA parser
├── test_state/        # Variáveis de estado global
└── platformio_tests.ini  # Environments de build (arquivo PlatformIO separado)
```

## Como Compilar e Executar

### Pré-requisitos
- PlatformIO CLI ou PlatformIO IDE (VS Code / CLion)
- ESP32 conectado via USB

### Compilar um teste específico
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_sensors
```

### Upload e monitor (executa no ESP32)
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_sensors -t upload
pio device monitor -b 115200
```

### Compilar todos os testes (verificação de build)
```bash
cd firmware
pio run -c tests/platformio_tests.ini
```

## Environments Disponíveis

| Environment | Módulo Testado | Dependências |
|-------------|---------------|--------------|
| `test_sensors` | sensors | state, utils |
| `test_net` | net (wifi + firebase) | state, navigation, utils, sensors, storage |
| `test_navigation` | navigation | state, utils, net |
| `test_commands` | commands | state, navigation, net |
| `test_storage` | storage | state, utils, net |
| `test_utils` | utils | state |
| `test_state` | state | navigation (enum NavState) |

## Notas

- Cada teste tem seu próprio `main.cpp` com `setup()` + `loop()`.
- Resultados são impressos via Serial (115200 baud).
- Os testes rodam **on-target** (no ESP32 real) — não são unit tests off-target.
- O código-fonte original em `src/` **não é alterado**.
- Para testes que dependem de WiFi/Firebase, configure SSID/senha no código ou via build flags.
