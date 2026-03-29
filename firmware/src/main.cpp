#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Fornece informações do token
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Credenciais Wi-Fi
#define WIFI_SSID "Limas-2.4G"
#define WIFI_PASSWORD "Souz@2025"

// Credenciais Firebase (Pegue no console do Firebase)
#define FIREBASE_HOST "usvs-drone-fluvial-autonomo-default-rtdb.firebaseio.com/" // Sem https://
#define API_KEY "AIzaSyCxdGSogOdPjuckQLZsW2RzpKrltlbBBmw"

// Credenciais do Usuário de Teste (Criado na Etapa 0)
#define USER_EMAIL "operador@usv-am.local"
#define USER_PASSWORD "DevTest123!"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const String droneId = "drone_01";
unsigned long sendDataPrevMillis = 0;

void setup() {
  Serial.begin(115200);

  // 1. Conectar ao Wi-Fi
  Serial.print("Conectando ao Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Conectado! IP: ");
  Serial.println(WiFi.localIP());

  // 2. Configurar Firebase
  config.api_key = API_KEY;
  config.database_url = FIREBASE_HOST;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Callback para geradores de token de longa duração
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  // Envia telemetria mockada a cada 5 segundos
  if (Firebase.ready() && (millis() - sendDataPrevMillis > 5000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();

    Serial.println("Enviando status para o RTDB...");

    // Caminho no Firebase: /drones/drone_01/status/online
    String statusPath = "/drones/" + droneId + "/status/online";
    if (Firebase.RTDB.setBool(&fbdo, statusPath.c_str(), true)) {
      Serial.println("Status [online: true] enviado com sucesso!");
    } else {
      Serial.println("Erro ao enviar status: " + fbdo.errorReason());
    }

    // Criando um JSON simulado de telemetria
    FirebaseJson telemetryJson;
    telemetryJson.set("sensors/battery_mv", 8000); // 8V fictício
    telemetryJson.set("position/lat", -3.1019);
    telemetryJson.set("position/lon", -60.0250);
    telemetryJson.set("timestamp", millis() / 1000);

    String telemetryPath = "/drones/" + droneId + "/telemetry";
    if (Firebase.RTDB.setJSON(&fbdo, telemetryPath.c_str(), &telemetryJson)) {
      Serial.println("Telemetria mockada enviada com sucesso!");
    } else {
      Serial.println("Erro na telemetria: " + fbdo.errorReason());
    }
  }
}
