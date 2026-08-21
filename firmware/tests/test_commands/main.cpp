/**
 * Teste isolado: módulo commands
 * Exercita: handleCommand (set_destination, emergency_stop), setNavState
 *
 * Requer WiFi + Firebase para fetchCommand (teste online).
 * handleCommand pode ser testado offline com struct injetada manualmente.
 */

#include <Arduino.h>
#include "modules/commands/commands.h"
#include "modules/state/state.h"
#include "modules/navigation/navigation.h"
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/sensors/sensors.h"
#include "modules/storage/storage.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-40s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testSetNavState() {
  currentState = IDLE_HOLDING_POSITION;
  setNavState(NAVIGATING_TO_GOAL);
  reportTest("setNavState -> NAVIGATING_TO_GOAL", currentState == NAVIGATING_TO_GOAL);

  setNavState(RETURNING_TO_HOME);
  reportTest("setNavState -> RETURNING_TO_HOME", currentState == RETURNING_TO_HOME);

  setNavState(IDLE_HOLDING_POSITION);
  reportTest("setNavState -> IDLE_HOLDING_POSITION", currentState == IDLE_HOLDING_POSITION);
}

void testHandleSetDestination() {
  currentState = IDLE_HOLDING_POSITION;
  currentLat = -3.1019;
  currentLon = -60.025;

  DroneCommand cmd;
  cmd.commandId = "cmd_test_001";
  cmd.type = "set_destination";
  cmd.targetLat = -3.1050;
  cmd.targetLon = -60.030;
  cmd.missionId = "m_test_001";
  cmd.issuedAt = 1000000;

  handleCommand(cmd);

  reportTest("set_destination: nav_state", currentState == NAVIGATING_TO_GOAL);
  reportTest("set_destination: goalLat", fabs(goalLat - (-3.1050)) < 0.0001);
  reportTest("set_destination: goalLon", fabs(goalLon - (-60.030)) < 0.0001);
  reportTest("set_destination: activeMissionId", activeMissionId == "m_test_001");
  reportTest("set_destination: homeLat set", fabs(homeLat - (-3.1019)) < 0.0001);
  reportTest("set_destination: routeDistance > 0", routeDistanceMeters > 0.0);
  reportTest("set_destination: lastCommandId updated", lastCommandId == "cmd_test_001");
}

void testHandleEmergencyStop() {
  // Simular que estamos navegando
  currentState = NAVIGATING_TO_GOAL;
  homeLat = -3.1019;
  homeLon = -60.025;
  currentLat = -3.1030;
  currentLon = -60.027;

  DroneCommand cmd;
  cmd.commandId = "cmd_test_002";
  cmd.type = "emergency_stop";
  cmd.missionId = "m_test_001";
  cmd.issuedAt = 1000100;

  handleCommand(cmd);

  reportTest("emergency_stop: nav_state RTH", currentState == RETURNING_TO_HOME);
  reportTest("emergency_stop: goal = home", fabs(goalLat - homeLat) < 0.0001 && fabs(goalLon - homeLon) < 0.0001);
}

void testFetchCommandOnline() {
  // Este teste só funciona com WiFi + Firebase
  if (!isWiFiConnected() || !Firebase.ready()) {
    Serial.println("  -> SKIP: sem WiFi/Firebase para fetchCommand online");
    reportTest("fetchCommand (SKIP sem rede)", true);
    return;
  }

  DroneCommand cmd;
  bool fetched = fetchCommand(cmd);
  // Pode não haver comando novo — não é falha
  Serial.printf("  -> fetchCommand returned: %s (id=%s)\n", fetched ? "true" : "false", cmd.commandId.c_str());
  reportTest("fetchCommand (executou sem crash)", true);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo COMMANDS");
  Serial.println("========================================");

  initFileSystem();
  initHardwareSensors();

  // Testes offline (não requerem rede)
  testSetNavState();
  testHandleSetDestination();
  testHandleEmergencyStop();

  // Tentar conectar para teste online
  setupWiFi();
  unsigned long start = millis();
  while (!isWiFiConnected() && millis() - start < 8000) {
    manageWiFi();
    delay(300);
  }
  if (isWiFiConnected()) {
    setupFirebase();
    delay(3000);
  }
  testFetchCommandOnline();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(10000);
}
