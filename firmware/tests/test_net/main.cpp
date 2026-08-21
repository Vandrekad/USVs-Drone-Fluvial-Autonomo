/**
 * Teste isolado: módulo net (WiFi + Firebase)
 * Exercita: setupWiFi, manageWiFi, isWiFiConnected, setupFirebase, updateStatus,
 *           publishTelemetry, setOfflinePresence
 *
 * Pré-requisito: rede WiFi disponível (SSID/senha hardcoded no wifi_manager.cpp)
 */

#include <Arduino.h>
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/state/state.h"
#include "modules/sensors/sensors.h"
#include "modules/storage/storage.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-35s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testWiFiConnection() {
  Serial.println("Conectando WiFi (timeout 10s)...");
  setupWiFi();
  unsigned long start = millis();
  while (!isWiFiConnected() && millis() - start < 10000) {
    manageWiFi();
    delay(300);
  }
  bool ok = isWiFiConnected();
  if (ok) {
    Serial.printf("  -> IP: %s\n", WiFi.localIP().toString().c_str());
  }
  reportTest("WiFi connection", ok);
}

void testFirebaseSetup() {
  if (!isWiFiConnected()) {
    reportTest("Firebase setup (sem WiFi)", false);
    return;
  }
  bool ok = setupFirebase();
  reportTest("setupFirebase", ok);

  // Aguardar token
  Serial.println("  -> Aguardando Firebase ready (5s)...");
  unsigned long start = millis();
  while (!Firebase.ready() && millis() - start < 5000) {
    delay(200);
  }
  reportTest("Firebase.ready()", Firebase.ready());
}

void testUpdateStatus() {
  if (!Firebase.ready()) {
    reportTest("updateStatus (Firebase não pronto)", false);
    return;
  }
  bool ok = updateStatus();
  reportTest("updateStatus", ok);
}

void testSetOfflinePresence() {
  if (!Firebase.ready()) {
    reportTest("setOfflinePresence (sem Firebase)", false);
    return;
  }
  bool ok = setOfflinePresence();
  reportTest("setOfflinePresence", ok);
}

void testPublishTelemetry() {
  if (!Firebase.ready()) {
    reportTest("publishTelemetry (sem Firebase)", false);
    return;
  }
  initHardwareSensors();
  bool ok = publishTelemetry();
  reportTest("publishTelemetry", ok);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo NET");
  Serial.println("========================================");

  if (!initFileSystem()) {
    Serial.println("AVISO: LittleFS falhou (buffer offline indisponível)");
  }

  testWiFiConnection();
  testFirebaseSetup();
  testUpdateStatus();
  testPublishTelemetry();
  testSetOfflinePresence();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(5000);
  manageWiFi();
  Serial.printf("[LIVE] WiFi=%s Firebase=%s\n",
                isWiFiConnected() ? "ON" : "OFF",
                Firebase.ready() ? "READY" : "NOT_READY");
}
