#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"

#define WIFI_SSID "Limas_2.4Ghz"
#define WIFI_PASSWORD "Souz@2025"

static unsigned long lastWiFiAttemptMs = 0;
static unsigned long wifiDelayMs = 1000;
static bool wasConnected = false;

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void manageWiFi() {
  if (!isWiFiConnected()) {
    if (wasConnected) {
      Serial.println("Wi-Fi perdido.");
      setOfflinePresence();
      wasConnected = false;
      wifiDelayMs = 1000;
    }

    if (millis() - lastWiFiAttemptMs >= wifiDelayMs || lastWiFiAttemptMs == 0) {
      lastWiFiAttemptMs = millis();
      Serial.printf("Tentando conectar Wi-Fi (delay atual: %lums)...\n", wifiDelayMs);
      WiFi.disconnect(true);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      wifiDelayMs = min(wifiDelayMs * 2, (unsigned long)8000);
    }
  } else {
    if (!wasConnected) {
      Serial.print("Wi-Fi conectado. IP: ");
      Serial.println(WiFi.localIP());
      wasConnected = true;
      wifiDelayMs = 1000;
    }
  }
}

void setupWiFi() {
  Serial.println("Iniciando conexão Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWiFiAttemptMs = millis();
}
