# Teste: Módulo Sensors

## O que testa
- `initHardwareSensors()` — inicialização de GPIO, I2C, UART, PWM
- `readCompass()` — leitura da bússola HMC5883L via I2C
- `readUltrasonic()` — medição de distância HC-SR04
- `updateMotorOutputs()` — saída PWM nos motores
- `readGPS()` — parsing de sentenças NMEA do NEO-6M

## Hardware necessário
- ESP32 com GPS NEO-6M (UART2: TX=17, RX=16)
- Bússola HMC5883L (I2C: SDA=21, SCL=22)
- Ultrassônico HC-SR04 (TRIG=26, ECHO=27)
- Motores em ponte H (PWM: L=32, R=33)

## Compilar e executar
```bash
cd firmware
pio run -c tests/platformio_tests.ini -e test_sensors -t upload
pio device monitor -b 115200
```

## Saída esperada
```
[TEST] initHardwareSensors         => PASS
[TEST] readCompass                  => PASS
[TEST] readUltrasonic               => PASS
[TEST] updateMotorOutputs (breve)   => PASS
[TEST] readGPS (executou sem crash) => PASS
RESULTADO: 5 PASS / 0 FAIL
```
