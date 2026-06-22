#include <Arduino.h>
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/storage/storage.h"
#include "modules/sensors/sensors.h"
#include "modules/commands/commands.h"
#include "modules/tests/tests.h"

const bool enableComponentTestApp = true;
static bool needFlushBuffers = true;
const unsigned long wifiConnectTimeoutMs = 10000;

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("Inicializando firmware USV-AM...");
  setupWiFi();

  unsigned long startMs = millis();
  Serial.println("Aguardando conexão Wi-Fi...");
  while (!isWiFiConnected() && millis() - startMs < wifiConnectTimeoutMs) {
    manageWiFi();
    delay(200);
  }

  if (isWiFiConnected()) {
    Serial.println("Wi-Fi conectado antes do Firebase.");
    setupFirebase();
  } else {
    Serial.println("Wi-Fi não conectado no timeout. Firebase será inicializado quando disponível.");
  }

  if (!initFileSystem()) {
    Serial.println("Erro: falha ao montar LittleFS.");
  }
  initHardwareSensors();

  if (enableComponentTestApp) {
    runFirmwareComponentTests();
  }

  Serial.println("Firmware inicializado. Entrando em loop principal.");
}

void loop() {
  manageWiFi();

  if (isWiFiConnected() && !firebaseInitialized) {
    Serial.println("Wi-Fi conectado. Inicializando Firebase...");
    setupFirebase();
  }

  static unsigned long telemetryPrevMillis = 0;
  static unsigned long statusPrevMillis = 0;
  static unsigned long commandPrevMillis = 0;

  const unsigned long telemetryIntervalMs = 2000;
  const unsigned long statusIntervalMs = 2000;
  const unsigned long commandIntervalMs = 1000;

  unsigned long now = millis();

  if (now - telemetryPrevMillis >= telemetryIntervalMs || telemetryPrevMillis == 0) {
    telemetryPrevMillis = now;
    if (!publishTelemetry()) {
      Serial.println("Aviso: publicação de telemetria falhou.");
    }
  }

  if (isWiFiConnected() && Firebase.ready()) {
    if (needFlushBuffers) {
      if (flushOfflineBuffers()) {
        needFlushBuffers = false;
        Serial.println("Buffers offline enviados com sucesso.");
      } else {
        Serial.println("Aviso: falha ao enviar buffers offline.");
      }
    }

    if (now - commandPrevMillis >= commandIntervalMs || commandPrevMillis == 0) {
      commandPrevMillis = now;
      processCommand();
    }

    if (now - statusPrevMillis >= statusIntervalMs || statusPrevMillis == 0) {
      statusPrevMillis = now;
      if (!updateStatus()) {
        Serial.println("Aviso: falha ao atualizar status.");
      }
    }
  } else {
    needFlushBuffers = true;
  }

  delay(10);
}
