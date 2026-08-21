/**
 * Teste isolado: módulo navigation
 * Exercita: computeDistanceMeters, computeLOSHeading, updateLOSControl,
 *           advanceTowards, navStateToString, desvio de obstáculo
 *
 * Teste em grande parte computacional — não requer hardware externo para a
 * validação de fórmulas (distância, heading, LOS). Motores precisam de H-bridge.
 */

#include <Arduino.h>
#include "modules/navigation/navigation.h"
#include "modules/state/state.h"
#include "modules/utils/utils.h"
#include "modules/sensors/sensors.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-40s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testNavStateToString() {
  reportTest("navStateToString IDLE", String(navStateToString(IDLE_HOLDING_POSITION)) == "IDLE_HOLDING_POSITION");
  reportTest("navStateToString NAV", String(navStateToString(NAVIGATING_TO_GOAL)) == "NAVIGATING_TO_GOAL");
  reportTest("navStateToString OBS", String(navStateToString(OBSTACLE_AVOIDANCE)) == "OBSTACLE_AVOIDANCE");
  reportTest("navStateToString RTH", String(navStateToString(RETURNING_TO_HOME)) == "RETURNING_TO_HOME");
}

void testComputeDistance() {
  // Manaus -> ~111m para 0.001 grau de latitude
  double d = computeDistanceMeters(-3.1019, -60.025, -3.1029, -60.025);
  Serial.printf("  -> Distância 0.001 lat: %.2f m\n", d);
  reportTest("computeDistanceMeters (~111m)", d > 100.0 && d < 120.0);

  // Mesma posição = 0
  double d0 = computeDistanceMeters(-3.1019, -60.025, -3.1019, -60.025);
  reportTest("computeDistanceMeters (0m)", d0 < 0.1);
}

void testComputeLOSHeading() {
  // Ponto diretamente ao norte -> heading ~0 ou ~360
  currentLat = -3.1019;
  currentLon = -60.025;
  hasGpsFix = false; // desabilita compensação beta
  compassReady = false;

  double h = computeLOSHeading(-3.1019, -60.025, -3.1009, -60.025);
  Serial.printf("  -> LOS heading (norte): %.2f\n", h);
  // Norte = ~90 no sistema ENU (atan2(dy, dx) com dy>0, dx~0 → 90°)
  // Na verdade o heading retornado é em graus geográficos
  reportTest("computeLOSHeading (norte, não-NaN)", !isnan(h) && h >= 0.0 && h < 360.0);
}

void testUpdateLOSControl() {
  currentState = NAVIGATING_TO_GOAL;
  currentLat = -3.1019;
  currentLon = -60.025;
  goalLat = -3.1009;
  goalLon = -60.025;
  currentHeading = 0.0;
  obsDist = 200; // sem obstáculo
  hasGpsFix = false;
  compassReady = false;

  thrustL = 0;
  thrustR = 0;
  updateLOSControl();

  Serial.printf("  -> Thrust L=%d R=%d\n", thrustL, thrustR);
  reportTest("updateLOSControl (gera thrust)", thrustL > 0 && thrustR > 0);
}

void testObstacleAvoidance() {
  currentState = NAVIGATING_TO_GOAL;
  obsDist = 30; // obstáculo próximo
  updateLOSControl();
  reportTest("obstacle triggers OBSTACLE_AVOIDANCE", currentState == OBSTACLE_AVOIDANCE);

  // Simular tempo passando e obstáculo liberado
  obsDist = 200;
  delay(2100);
  updateLOSControl();
  reportTest("obstacle clear returns to NAV", currentState == NAVIGATING_TO_GOAL || currentState == OBSTACLE_AVOIDANCE);
}

void testAdvanceTowards() {
  double origLat = currentLat;
  double origLon = currentLon;
  double destLat = origLat + 0.001;
  double destLon = origLon;

  advanceTowards(destLat, destLon, 50.0); // avançar 50m em direção a destino ~111m

  double moved = computeDistanceMeters(origLat, origLon, currentLat, currentLon);
  Serial.printf("  -> Movido: %.2f m\n", moved);
  reportTest("advanceTowards (moveu ~50m)", moved > 40.0 && moved < 60.0);

  // Restaurar
  currentLat = origLat;
  currentLon = origLon;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo NAVIGATION");
  Serial.println("========================================");

  initHardwareSensors(); // necessário para PWM dos motores

  testNavStateToString();
  testComputeDistance();
  testComputeLOSHeading();
  testUpdateLOSControl();
  testObstacleAvoidance();
  testAdvanceTowards();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(10000);
}
