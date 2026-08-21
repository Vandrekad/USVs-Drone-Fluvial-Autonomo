#include "modules/net/firebase_manager.h"
#include "modules/net/wifi_manager.h"
#include "config.h"
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "modules/sensors/sensors.h"
#include "modules/navigation/navigation.h"
#include "modules/utils/utils.h"
#include "modules/storage/storage.h"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool firebaseInitialized = false;

bool setupFirebase() {
  if (firebaseInitialized) {
    return true;
  }

  if (!isWiFiConnected()) {
    Serial.println("Firebase não inicializado: sem conexão Wi-Fi disponível.");
    return false;
  }

  Serial.println("Iniciando configuração do Firebase...");
  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  auth.user.email = FIREBASE_USER_EMAIL;
  auth.user.password = FIREBASE_USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;

  Firebase.reconnectNetwork(true);
  fbdo.setResponseSize(2048);
  Firebase.begin(&config, &auth);
  firebaseInitialized = true;
  Serial.println("Firebase inicializado.");
  return true;
}

String getStatusPath() {
  return "/drones/" + droneId + "/status";
}

String getTelemetryPath() {
  return "/drones/" + droneId + "/telemetry";
}

bool updateStatus() {
  FirebaseJson statusJson;
  statusJson.set("online", true);
  statusJson.set("last_seen", (int)(millis() / 1000));
  statusJson.set("active_mission_id", activeMissionId);
  statusJson.set("nav_state", navStateToString(currentState));
  statusJson.set("active_leg", activeLeg);
  statusJson.set("route_progress", routeProgress);
  statusJson.set("last_position/lat", currentLat);
  statusJson.set("last_position/lon", currentLon);

  String statusPath = getStatusPath();
  if (Firebase.RTDB.setJSON(&fbdo, statusPath.c_str(), &statusJson)) {
    return true;
  }
  Serial.print("Erro atualizando status: ");
  Serial.println(fbdo.errorReason());
  return false;
}

bool sendTelemetryJSON(FirebaseJson &telemetryJson) {
  String telemetryPath = getTelemetryPath();
  return Firebase.RTDB.setJSON(&fbdo, telemetryPath.c_str(), &telemetryJson);
}

bool setOfflinePresence() {
  if (!Firebase.ready()) {
    return false;
  }

  String presencePath = getStatusPath() + "/online";
  if (!Firebase.RTDB.setBool(&fbdo, presencePath.c_str(), false)) {
    Serial.print("Falha ao escrever presença offline: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  Serial.println("Presença offline escrita no RTDB.");
  return true;
}

bool publishTelemetry() {
  // NOTA: Leitura de sensores e controle de motores agora são responsabilidade
  // do loop principal (main.cpp), não da publicação de telemetria.
  // Esta função apenas publica o estado atual.

  FirebaseJson telemetryJson;
  telemetryJson.set("timestamp", (int)(millis() / 1000));
  telemetryJson.set("mission_id", activeMissionId);
  telemetryJson.set("position/lat", currentLat);
  telemetryJson.set("position/lon", currentLon);
  telemetryJson.set("position/heading", currentHeading);
  telemetryJson.set("sensors/battery_mv", batteryMv);
  telemetryJson.set("sensors/obs_dist", obsDist);
  telemetryJson.set("actuators/thrust_l", thrustL);
  telemetryJson.set("actuators/thrust_r", thrustR);

  Serial.printf("[TELEM] estado=%s lat=%.6f lon=%.6f hdg=%.1f bat=%dmV obs=%dcm thrust=(%d,%d) prog=%.2f\n",
                navStateToString(currentState), currentLat, currentLon, currentHeading,
                batteryMv, obsDist, thrustL, thrustR, routeProgress);

  if (isWiFiConnected() && Firebase.ready()) {
    if (sendTelemetryJSON(telemetryJson)) {
      return true;
    } else {
      Serial.print("Falha ao publicar telemetria: ");
      Serial.println(fbdo.errorReason());
      // Falhou online — salvar offline como fallback
    }
  }

  // Offline ou falha de envio: buffering
  if (!bufferTelemetryOffline(telemetryJson)) {
    Serial.println("Falha ao salvar telemetria no buffer offline.");
  }
  if (!bufferPathPointOffline(currentLat, currentLon, millis() / 1000)) {
    Serial.println("Falha ao salvar ponto de rota no buffer offline.");
  }

  return true;
}
