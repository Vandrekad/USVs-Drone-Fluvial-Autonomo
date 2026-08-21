#include "modules/net/wifi_manager.h"
#include "config.h"
#include "modules/net/firebase_manager.h"

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
      // Não chamar WiFi.disconnect(true) em cada tentativa — reseta estado desnecessariamente
      // Apenas reconectar se não estiver tentando
      if (WiFi.status() != WL_CONNECTED && WiFi.status() != WL_IDLE_STATUS) {
        WiFi.disconnect(false);
        delay(10);
      }
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
  WiFi.mode(WIFI_STA);  // Explicitamente modo Station
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWiFiAttemptMs = millis();
}
