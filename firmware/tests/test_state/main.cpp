/**
 * Teste isolado: módulo state
 * Exercita: variáveis globais de estado, valores iniciais, mutabilidade
 *
 * Verifica que as variáveis de estado estão com valores default corretos
 * e podem ser alteradas corretamente pelo firmware.
 */

#include <Arduino.h>
#include "modules/state/state.h"
#include "modules/navigation/navigation.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-40s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testDefaultValues() {
  reportTest("droneId == 'drone_01'", droneId == "drone_01");
  reportTest("currentState == IDLE", currentState == IDLE_HOLDING_POSITION);
  reportTest("currentLat default ~= -3.1019", fabs(currentLat - (-3.1019)) < 0.001);
  reportTest("currentLon default ~= -60.025", fabs(currentLon - (-60.025)) < 0.001);
  reportTest("currentHeading == 0.0", fabs(currentHeading) < 0.001);
  reportTest("batteryMv == 8000", batteryMv == 8000);
  reportTest("obsDist == 200", obsDist == 200);
  reportTest("thrustL == 0", thrustL == 0);
  reportTest("thrustR == 0", thrustR == 0);
  reportTest("activeMissionId vazio", activeMissionId == "");
  reportTest("lastCommandId vazio", lastCommandId == "");
  reportTest("hasGpsFix == false", hasGpsFix == false);
  reportTest("compassReady == false", compassReady == false);
  reportTest("activeLeg == 0", activeLeg == 0);
  reportTest("routeProgress == 0.0", fabs(routeProgress) < 0.001);
}

void testMutability() {
  // Alterar estado e verificar
  currentState = NAVIGATING_TO_GOAL;
  reportTest("currentState mutável", currentState == NAVIGATING_TO_GOAL);

  currentLat = -3.2000;
  currentLon = -60.1000;
  reportTest("currentLat mutável", fabs(currentLat - (-3.2)) < 0.001);

  thrustL = 150;
  thrustR = 120;
  reportTest("thrust mutável", thrustL == 150 && thrustR == 120);

  activeMissionId = "m_test_999";
  reportTest("activeMissionId mutável", activeMissionId == "m_test_999");

  activeLeg = 2;
  routeProgress = 0.67;
  reportTest("activeLeg/routeProgress mutáveis", activeLeg == 2 && fabs(routeProgress - 0.67) < 0.01);

  // Restaurar defaults
  currentState = IDLE_HOLDING_POSITION;
  currentLat = -3.1019;
  currentLon = -60.025;
  thrustL = 0;
  thrustR = 0;
  activeMissionId = "";
  activeLeg = 0;
  routeProgress = 0.0;
}

void testIntervalConstants() {
  reportTest("telemetryIntervalMs == 2000", telemetryIntervalMs == 2000);
  reportTest("statusIntervalMs == 2000", statusIntervalMs == 2000);
  reportTest("commandIntervalMs == 1000", commandIntervalMs == 1000);
}

void testBufferPaths() {
  reportTest("telemetryBufferPath set", String(telemetryBufferPath).length() > 0);
  reportTest("pathBufferPath set", String(pathBufferPath).length() > 0);
  reportTest("telemetryBufferPath contains .ndjson", String(telemetryBufferPath).endsWith(".ndjson"));
  reportTest("pathBufferPath contains .ndjson", String(pathBufferPath).endsWith(".ndjson"));
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo STATE");
  Serial.println("========================================");

  testDefaultValues();
  testMutability();
  testIntervalConstants();
  testBufferPaths();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(10000);
}
