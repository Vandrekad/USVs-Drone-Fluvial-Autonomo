#include "modules/tests/tests.h"
#include <LittleFS.h>
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/storage/storage.h"
#include "modules/sensors/sensors.h"
#include "modules/navigation/navigation.h"
#include "modules/utils/utils.h"

static void printComponentTestResult(const char* component, bool result) {
  Serial.print("[TESTE] ");
  Serial.print(component);
  Serial.print(" => ");
  Serial.println(result ? "OK" : "FALHA");
}

void runFirmwareComponentTests() {
  Serial.println("=== INÍCIO DO APLICATIVO DE TESTES DE COMPONENTES ===");
  printComponentTestResult("Wi-Fi", testWiFi());
  printComponentTestResult("Firebase RTDB", testFirebaseConnection());
  printComponentTestResult("LittleFS", testLittleFS());
  printComponentTestResult("GPS parsing / fix", testGPSParsing());
  printComponentTestResult("Bússola HMC5883L", testCompassSensor());
  printComponentTestResult("Ultrassom HC-SR04", testUltrasonicSensor());
  printComponentTestResult("Saída de motores PWM", testMotorOutput());
  printComponentTestResult("Geração de rota básica", testRouteGeneration());
  printComponentTestResult("Buffer offline simples", testOfflineBuffering());
  Serial.println("=== FIM DO APLICATIVO DE TESTES DE COMPONENTES ===");
}

bool testWiFi() {
  Serial.println("Testando conexão Wi-Fi...");
  unsigned long start = millis();
  while (!isWiFiConnected() && millis() - start < 8000) {
    manageWiFi();
    delay(500);
  }
  if (isWiFiConnected()) {
    Serial.print("Wi-Fi conectado: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  Serial.println("Não foi possível conectar ao Wi-Fi dentro do timeout.");
  return false;
}

bool testFirebaseConnection() {
  Serial.println("Testando conexão Firebase RTDB...");
  if (!Firebase.ready()) {
    Serial.println("Firebase ainda não está pronto. Aguardando 3s...");
    delay(3000);
  }
  if (Firebase.ready()) {
    Serial.println("Firebase RTDB está pronto para uso.");
    return true;
  }
  Serial.print("Firebase falhou: ");
  Serial.println(fbdo.errorReason());
  return false;
}

bool testLittleFS() {
  Serial.println("Testando armazenamento LittleFS...");
  const char* testPath = "/test_lfs.txt";
  Serial.printf("LittleFS test path: %s\n", testPath);
  Serial.printf("LittleFS path exists: %d\n", LittleFS.exists(testPath));

  File file = LittleFS.open(testPath, FILE_WRITE);
  if (!file) {
    Serial.println("Falha ao abrir arquivo de teste no LittleFS (WRITE). Verifique permissão e montagem do sistema de arquivos.");
    return false;
  }
  file.println("firmware-test");
  file.close();

  file = LittleFS.open(testPath, FILE_READ);
  if (!file) {
    Serial.println("Falha ao ler arquivo de teste no LittleFS (READ). Verifique se o arquivo foi criado corretamente.");
    return false;
  }
  String content = file.readStringUntil('\n');
  file.close();

  String trimmed = content;
  trimmed.trim();
  Serial.printf("LittleFS read content raw='%s' len=%d trimmed='%s' len=%d\n", content.c_str(), content.length(), trimmed.c_str(), trimmed.length());

  LittleFS.remove(testPath);

  bool ok = trimmed == "firmware-test";
  if (!ok) {
    Serial.print("Conteúdo inesperado LittleFS: ");
    Serial.println(trimmed);
  }
  return ok;
}

bool testGPSParsing() {
  Serial.println("Testando parser GPS com NMEA de exemplo...");
  const String sampleRMC = "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A";
  int backupHasGps = hasGpsFix;
  double backupLat = gpsLat;
  double backupLon = gpsLon;
  double backupCourse = gpsCourse;

  String line = sampleRMC;
  if (line.startsWith("$GPRMC") || line.startsWith("$GNRMC")) {
    int index = 0;
    int fieldStart = 0;
    String fields[12];
    for (int i = 0; i < line.length() && index < 12; i++) {
      if (line[i] == ',') {
        fields[index++] = line.substring(fieldStart, i);
        fieldStart = i + 1;
      }
    }
    if (index >= 11) {
      fields[index++] = line.substring(fieldStart);
    }

    if (index >= 9 && fields[2].length() && fields[4].length()) {
      char status = fields[2].charAt(0);
      if (status == 'A') {
        gpsLat = nmeaToDecimal(fields[3], fields[4].charAt(0));
        gpsLon = nmeaToDecimal(fields[5], fields[6].charAt(0));
        gpsCourse = fields[8].toDouble();
        hasGpsFix = true;
      } else {
        hasGpsFix = false;
      }
    }
  }

  bool ok = hasGpsFix && fabs(gpsLat - 48.1173) < 0.01 && fabs(gpsLon - 11.5167) < 0.01;
  Serial.print("GPS parsed: lat=");
  Serial.print(gpsLat, 6);
  Serial.print(" lon=");
  Serial.print(gpsLon, 6);
  Serial.print(" course=");
  Serial.println(gpsCourse, 2);

  gpsLat = backupLat;
  gpsLon = backupLon;
  gpsCourse = backupCourse;
  hasGpsFix = backupHasGps;
  return ok;
}

bool testCompassSensor() {
  Serial.println("Testando leitura da bússola HMC5883L...");
  if (!compassReady) {
    Serial.println("Bússola não está pronta. Verifique a alimentação, cabos I2C e a inicialização do sensor.");
    return false;
  }
  for (int i = 0; i < 3; i++) {
    if (readCompass()) {
      Serial.print("Heading lido: ");
      Serial.println(currentHeading, 2);
      return true;
    }
    Serial.printf("Tentativa %d de leitura da bússola falhou. Retentando...\n", i + 1);
    delay(200);
  }
  Serial.println("Falha ao ler bússola HMC5883L após 3 tentativas. Verifique conexão I2C e endereço do sensor.");
  return false;
}

bool testUltrasonicSensor() {
  Serial.println("Testando sensor ultrassônico... (pode demorar alguns ciclos)");
  readUltrasonic();
  Serial.print("Distância medida: ");
  Serial.print(obsDist);
  Serial.println(" cm");
  return obsDist > 0 && obsDist <= 400;
}

bool testMotorOutput() {
  Serial.println("Testando saída PWM dos motores...");
  thrustL = 100;
  thrustR = 100;
  updateMotorOutputs();
  delay(200);
  thrustL = 0;
  thrustR = 0;
  updateMotorOutputs();
  Serial.println("Saída PWM aplicada e desligada.");
  return true;
}

bool testRouteGeneration() {
  Serial.println("Testando geração de rota básica...");
  double startLat = currentLat;
  double startLon = currentLon;
  double targetLat = startLat + 0.001;
  double targetLon = startLon + 0.001;
  double dist = computeDistanceMeters(startLat, startLon, targetLat, targetLon);
  Serial.print("Distância calculada: ");
  Serial.print(dist, 2);
  Serial.println(" m");
  return dist > 100.0;
}

bool testOfflineBuffering() {
  Serial.println("Testando armazenamento offline simples...");
  const char* testTelem = "/test_offline_buffer.ndjson";
  const char* testPath = "/test_offline_path.ndjson";

  if (LittleFS.exists(testTelem) && !LittleFS.remove(testTelem)) {
    Serial.printf("Falha ao remover arquivo de teste anterior: %s\n", testTelem);
  }
  if (LittleFS.exists(testPath) && !LittleFS.remove(testPath)) {
    Serial.printf("Falha ao remover arquivo de teste anterior: %s\n", testPath);
  }

  FirebaseJson telemetryJson;
  telemetryJson.set("test", "offline");
  bool ok1 = appendLineToFile(testTelem, telemetryJson.raw());
  bool ok2 = appendLineToFile(testPath, "{\"lat\":0.0,\"lon\":0.0,\"ts\":0}");
  std::vector<String> lines;
  bool ok3 = readFileLines(testTelem, lines) && lines.size() == 1;
  lines.clear();
  bool ok4 = readFileLines(testPath, lines) && lines.size() == 1;

  if (!ok3) {
    Serial.printf("Falha ao ler buffer offline de telemetria: %s\n", testTelem);
  }
  if (!ok4) {
    Serial.printf("Falha ao ler buffer offline de rota: %s\n", testPath);
  }

  if (LittleFS.exists(testTelem) && !LittleFS.remove(testTelem)) {
    Serial.printf("Falha ao limpar arquivo de teste: %s\n", testTelem);
  }
  if (LittleFS.exists(testPath) && !LittleFS.remove(testPath)) {
    Serial.printf("Falha ao limpar arquivo de teste: %s\n", testPath);
  }

  return ok1 && ok2 && ok3 && ok4;
}
