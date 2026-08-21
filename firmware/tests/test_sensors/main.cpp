/**
 * Teste isolado: módulo sensors
 * Exercita: initHardwareSensors, readGPS, readCompass, readUltrasonic, updateMotorOutputs
 *
 * Resultado esperado no Serial (115200):
 *   - Inicialização de sensores OK/FALHA
 *   - Leitura de bússola com heading
 *   - Leitura de ultrassônico com distância em cm
 *   - Ativação breve de motores PWM
 *   - Leitura contínua de GPS (aguardando fix)
 */

#include <Arduino.h>
#include "modules/sensors/sensors.h"
#include "modules/state/state.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-30s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testInitSensors() {
  bool ok = initHardwareSensors();
  reportTest("initHardwareSensors", ok);
}

void testCompass() {
  if (!compassReady) {
    reportTest("readCompass (sensor não pronto)", false);
    return;
  }
  bool ok = readCompass();
  if (ok) {
    Serial.printf("  -> Heading: %.2f graus\n", currentHeading);
  }
  reportTest("readCompass", ok && currentHeading >= 0.0 && currentHeading < 360.0);
}

void testUltrasonic() {
  readUltrasonic();
  bool ok = (obsDist > 0 && obsDist <= 400);
  Serial.printf("  -> Distância: %d cm\n", obsDist);
  reportTest("readUltrasonic", ok);
}

void testMotors() {
  thrustL = 80;
  thrustR = 80;
  updateMotorOutputs();
  delay(300);
  thrustL = 0;
  thrustR = 0;
  updateMotorOutputs();
  reportTest("updateMotorOutputs (breve)", true);
}

void testGPSRead() {
  Serial.println("  -> Lendo GPS por 5 segundos...");
  unsigned long start = millis();
  while (millis() - start < 5000) {
    readGPS();
    delay(100);
  }
  Serial.printf("  -> Fix: %s | Lat: %.6f | Lon: %.6f\n",
                hasGpsFix ? "SIM" : "NÃO", gpsLat, gpsLon);
  // GPS pode não ter fix indoor — reporta resultado mas não falha
  reportTest("readGPS (executou sem crash)", true);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo SENSORS");
  Serial.println("========================================");

  testInitSensors();
  testCompass();
  testUltrasonic();
  testMotors();
  testGPSRead();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  // Leitura contínua para debug se necessário
  delay(2000);
  updateSensorValues();
  Serial.printf("[LIVE] heading=%.1f obs=%dcm gps_fix=%s lat=%.6f lon=%.6f\n",
                currentHeading, obsDist, hasGpsFix ? "Y" : "N", gpsLat, gpsLon);
}
