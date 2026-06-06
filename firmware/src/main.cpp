#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <LittleFS.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <mbedtls/sha256.h>
#include <algorithm>
#include <math.h>
#include <vector>

void updateStatus();
void setOfflinePresence();
double wrapAngleDeg(double angle);

// Fornece informações do token
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Credenciais Wi-Fi
#define WIFI_SSID "Limas-2.4G"
#define WIFI_PASSWORD "Souz@2025"

// Credenciais Firebase (Pegue no console do Firebase)
#define FIREBASE_DATABASE_URL "https://usvs-drone-fluvial-autonomo-default-rtdb.firebaseio.com/"
#define API_KEY "AIzaSyCxdGSogOdPjuckQLZsW2RzpKrltlbBBmw"

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define ULTRASONIC_TRIG_PIN 26
#define ULTRASONIC_ECHO_PIN 27
#define MOTOR_LEFT_PIN 32
#define MOTOR_RIGHT_PIN 33
#define MOTOR_LEFT_CHANNEL 0
#define MOTOR_RIGHT_CHANNEL 1
#define MOTOR_PWM_FREQ 5000
#define MOTOR_PWM_RES 8
#define HMC5883L_ADDRESS 0x1E

// Credenciais do Usuário de Teste (Criado na Etapa 0)
#define USER_EMAIL "operador@usv-am.local"
#define USER_PASSWORD "DevTest123!"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const String droneId = "drone_01";
const unsigned long telemetryIntervalMs = 2000;
const unsigned long statusIntervalMs = 2000;
const unsigned long commandIntervalMs = 1000;

unsigned long telemetryPrevMillis = 0;
unsigned long statusPrevMillis = 0;
unsigned long commandPrevMillis = 0;
String lastCommandId = "";

enum NavState {
  IDLE_HOLDING_POSITION,
  NAVIGATING_TO_GOAL,
  OBSTACLE_AVOIDANCE,
  RETURNING_TO_HOME,
  OFFLINE_NAVIGATION
};

void setNavState(NavState newState);

NavState currentState = IDLE_HOLDING_POSITION;

double currentLat = -3.1019;
double currentLon = -60.0250;
double currentHeading = 0.0;
int batteryMv = 8000;
int obsDist = 200;
int thrustL = 0;
int thrustR = 0;
String activeMissionId = "";

bool hasGpsFix = false;
double gpsLat = -3.1019;
double gpsLon = -60.0250;
double gpsCourse = 0.0;
bool compassReady = false;

double goalLat = -3.1019;
double goalLon = -60.0250;
double homeLat = -3.1019;
double homeLon = -60.0250;
double routeDistanceMeters = 0.0;
double remainingDistanceMeters = 0.0;
int activeLeg = 0;
double routeProgress = 0.0;

const char* telemetryBufferPath = "/telemetry_buffer.ndjson";
const char* pathBufferPath = "/path_buffer.ndjson";

const double lookaheadDistanceMeters = 8.0;
const double losHeadingGain = 1.5;
const int defaultBaseThrust = 120;
const int obstacleThresholdCm = 60;
const int obstacleClearThresholdCm = 120;
const unsigned long obstacleAvoidanceTimeoutMs = 8000;
unsigned long obstacleAvoidanceStartMs = 0;
NavState previousNavState = IDLE_HOLDING_POSITION;

struct DroneCommand {
  String commandId;
  String type;
  double targetLat;
  double targetLon;
  String missionId;
  unsigned long issuedAt;
};

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

unsigned long lastWiFiAttemptMs = 0;
unsigned long wifiDelayMs = 1000;
bool wasConnected = false;

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

void setupFirebase() {
  config.api_key = API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;

  Firebase.reconnectNetwork(true);
  fbdo.setResponseSize(2048);

  Firebase.begin(&config, &auth);
}

String getStatusPath() {
  return "/drones/" + droneId + "/status";
}

String getTelemetryPath() {
  return "/drones/" + droneId + "/telemetry";
}

const char* navStateToString(NavState state) {
  switch (state) {
    case IDLE_HOLDING_POSITION:
      return "IDLE_HOLDING_POSITION";
    case NAVIGATING_TO_GOAL:
      return "NAVIGATING_TO_GOAL";
    case OBSTACLE_AVOIDANCE:
      return "OBSTACLE_AVOIDANCE";
    case RETURNING_TO_HOME:
      return "RETURNING_TO_HOME";
    case OFFLINE_NAVIGATION:
      return "OFFLINE_NAVIGATION";
    default:
      return "UNKNOWN";
  }
}

double deg2rad(double deg) {
  return deg * 0.017453292519943295;
}

double computeDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
  double dLat = deg2rad(lat2 - lat1);
  double dLon = deg2rad(lon2 - lon1);
  double a = sin(dLat / 2) * sin(dLat / 2) + cos(deg2rad(lat1)) * cos(deg2rad(lat2)) * sin(dLon / 2) * sin(dLon / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return 6371000.0 * c;
}

String computeSHA256Hex(const String &input) {
  unsigned char hash[32];
  mbedtls_sha256_ret((const unsigned char *)input.c_str(), input.length(), hash, 0);
  String hex;
  hex.reserve(64);
  const char hexChars[] = "0123456789abcdef";
  for (int i = 0; i < 32; i++) {
    hex += hexChars[(hash[i] >> 4) & 0x0F];
    hex += hexChars[hash[i] & 0x0F];
  }
  return hex;
}

bool initFileSystem() {
  if (!LittleFS.begin(true)) {
    Serial.println("Falha ao iniciar LittleFS.");
    return false;
  }
  return true;
}

bool appendLineToFile(const char *path, const String &line) {
  File file = LittleFS.open(path, FILE_APPEND);
  if (!file) {
    Serial.printf("Erro abrindo %s para escrita.\n", path);
    return false;
  }
  file.println(line);
  file.close();
  return true;
}

bool readFileLines(const char *path, std::vector<String> &lines) {
  File file = LittleFS.open(path, FILE_READ);
  if (!file) {
    return false;
  }
  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      lines.push_back(line);
    }
  }
  file.close();
  return true;
}

bool writeFileLines(const char *path, const std::vector<String> &lines) {
  File file = LittleFS.open(path, FILE_WRITE);
  if (!file) {
    return false;
  }
  for (const String &line : lines) {
    file.println(line);
  }
  file.close();
  return true;
}

String computeLocalPathHash(const std::vector<String> &lines) {
  DynamicJsonDocument doc(512);
  String concatenated;
  int count = min((int)lines.size(), 5);
  for (int i = 0; i < count; i++) {
    auto error = deserializeJson(doc, lines[i]);
    if (error) {
      continue;
    }
    double lat = doc["lat"] | 0.0;
    double lon = doc["lon"] | 0.0;
    unsigned long ts = doc["ts"] | 0;
    concatenated += String(lat, 6) + "," + String(lon, 6) + "," + String(ts) + ";";
    doc.clear();
  }
  return computeSHA256Hex(concatenated);
}

bool computeRTDBPathHash(const String &missionId, String &hash) {
  if (missionId.length() == 0) {
    return false;
  }
  String path = "/missions/" + missionId + "/path";
  if (!Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    return false;
  }
  String raw = fbdo.jsonString();
  if (raw.length() == 0) {
    return false;
  }

  DynamicJsonDocument doc(8192);
  auto error = deserializeJson(doc, raw);
  if (error || !doc.is<JsonObject>()) {
    return false;
  }

  std::vector<String> keys;
  keys.reserve(10);
  for (JsonPair kv : doc.as<JsonObject>()) {
    keys.push_back(kv.key().c_str());
  }
  sort(keys.begin(), keys.end());

  String concat;
  int count = min((int)keys.size(), 5);
  for (int i = 0; i < count; i++) {
    JsonObject item = doc[keys[i]].as<JsonObject>();
    if (!item.isNull()) {
      double lat = item["lat"] | 0.0;
      double lon = item["lon"] | 0.0;
      unsigned long ts = item["ts"] | 0;
      concat += String(lat, 6) + "," + String(lon, 6) + "," + String(ts) + ";";
    }
  }
  if (concat.length() == 0) {
    return false;
  }
  hash = computeSHA256Hex(concat);
  return true;
}

bool sendTelemetryJSON(FirebaseJson &telemetryJson) {
  String telemetryPath = getTelemetryPath();
  if (Firebase.RTDB.setJSON(&fbdo, telemetryPath.c_str(), &telemetryJson)) {
    return true;
  }
  return false;
}

bool bufferTelemetryOffline(FirebaseJson &telemetryJson) {
  String line = telemetryJson.raw();
  return appendLineToFile(telemetryBufferPath, line);
}

bool bufferPathPointOffline(double lat, double lon, unsigned long ts) {
  DynamicJsonDocument pointDoc(128);
  pointDoc["lat"] = lat;
  pointDoc["lon"] = lon;
  pointDoc["ts"] = ts;
  String line;
  serializeJson(pointDoc, line);
  return appendLineToFile(pathBufferPath, line);
}

bool flushTelemetryBuffer() {
  if (!LittleFS.exists(telemetryBufferPath)) {
    return true;
  }
  std::vector<String> lines;
  if (!readFileLines(telemetryBufferPath, lines)) {
    return false;
  }
  if (lines.empty()) {
    LittleFS.remove(telemetryBufferPath);
    return true;
  }
  std::vector<String> remaining;
  for (size_t i = 0; i < lines.size(); i++) {
    DynamicJsonDocument tempDoc(512);
    auto error = deserializeJson(tempDoc, lines[i]);
    if (error) {
      remaining.push_back(lines[i]);
      continue;
    }
    FirebaseJson json;
    json.setJsonData(lines[i]);
    if (!sendTelemetryJSON(json)) {
      for (size_t j = i; j < lines.size(); j++) {
        remaining.push_back(lines[j]);
      }
      break;
    }
  }
  if (remaining.empty()) {
    LittleFS.remove(telemetryBufferPath);
  } else {
    writeFileLines(telemetryBufferPath, remaining);
  }
  return true;
}

bool flushPathBuffer() {
  if (!LittleFS.exists(pathBufferPath) || activeMissionId.length() == 0) {
    return true;
  }
  std::vector<String> lines;
  if (!readFileLines(pathBufferPath, lines)) {
    return false;
  }
  if (lines.empty()) {
    LittleFS.remove(pathBufferPath);
    return true;
  }

  String remoteHash;
  bool hasRemoteHash = computeRTDBPathHash(activeMissionId, remoteHash);
  String localHash = computeLocalPathHash(lines);
  size_t startIndex = 0;
  if (hasRemoteHash && remoteHash == localHash && lines.size() > 5) {
    startIndex = 5;
  }

  std::vector<String> remaining;
  for (size_t i = startIndex; i < lines.size(); i++) {
    DynamicJsonDocument pointDoc(128);
    auto error = deserializeJson(pointDoc, lines[i]);
    if (error) {
      remaining.push_back(lines[i]);
      continue;
    }
    unsigned long ts = pointDoc["ts"] | 0;
    String pointName = "/missions/" + activeMissionId + "/path/p_" + String(ts);
    FirebaseJson pointJson;
    pointJson.setJsonData(lines[i]);
    if (!Firebase.RTDB.setJSON(&fbdo, pointName.c_str(), &pointJson)) {
      for (size_t j = i; j < lines.size(); j++) {
        remaining.push_back(lines[j]);
      }
      break;
    }
  }

  if (remaining.empty()) {
    LittleFS.remove(pathBufferPath);
  } else {
    writeFileLines(pathBufferPath, remaining);
  }
  return true;
}

bool flushOfflineBuffers() {
  bool ok = true;
  ok &= flushTelemetryBuffer();
  ok &= flushPathBuffer();
  return ok;
}

double wrapAngleDeg(double angle) {
  double wrapped = fmod(angle + 540.0, 360.0);
  if (wrapped < 0) {
    wrapped += 360.0;
  }
  return wrapped - 180.0;
}

double computeCrossTrackError(double fromLat, double fromLon, double toLat, double toLon, double pointLat, double pointLon) {
  double dxLeg = (toLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyLeg = (toLat - fromLat) * 110540.0;
  double dxPoint = (pointLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyPoint = (pointLat - fromLat) * 110540.0;
  double legNorm = sqrt(dxLeg * dxLeg + dyLeg * dyLeg);
  if (legNorm < 1e-6) {
    return 0.0;
  }
  return (dxPoint * dyLeg - dyPoint * dxLeg) / legNorm;
}

double computeLOSHeading(double fromLat, double fromLon, double toLat, double toLon) {
  double dxLeg = (toLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyLeg = (toLat - fromLat) * 110540.0;
  double chiP = atan2(dyLeg, dxLeg) * 180.0 / PI;
  if (chiP < 0) {
    chiP += 360.0;
  }

  double eCt = computeCrossTrackError(fromLat, fromLon, toLat, toLon, currentLat, currentLon);
  double chiD = chiP - atan2(eCt, lookaheadDistanceMeters) * 180.0 / PI;
  chiD = fmod(chiD + 360.0, 360.0);

  if (hasGpsFix && compassReady) {
    double betaHat = wrapAngleDeg(gpsCourse - currentHeading);
    chiD = wrapAngleDeg(chiD - betaHat);
    if (chiD < 0) {
      chiD += 360.0;
    }
  }

  return chiD;
}

double headingErrorDeg(double desired, double current) {
  return wrapAngleDeg(desired - current);
}

void enterObstacleAvoidance() {
  if (currentState != OBSTACLE_AVOIDANCE) {
    previousNavState = currentState;
    currentState = OBSTACLE_AVOIDANCE;
    obstacleAvoidanceStartMs = millis();
    Serial.println("OBSTACLE_AVOIDANCE ativado.");
    if (isWiFiConnected() && Firebase.ready()) {
      updateStatus();
    }
  }
}

void updateLOSControl() {
  if (currentState == NAVIGATING_TO_GOAL || currentState == RETURNING_TO_HOME) {
    if (obsDist <= obstacleThresholdCm) {
      enterObstacleAvoidance();
      return;
    }

    double fromLat = currentLat;
    double fromLon = currentLon;
    double targetLat = (currentState == NAVIGATING_TO_GOAL) ? goalLat : homeLat;
    double targetLon = (currentState == NAVIGATING_TO_GOAL) ? goalLon : homeLon;
    double desiredHeading = computeLOSHeading(fromLat, fromLon, targetLat, targetLon);
    double error = headingErrorDeg(desiredHeading, currentHeading);
    int correction = int(error * losHeadingGain);
    thrustL = constrain(defaultBaseThrust + correction, 0, 255);
    thrustR = constrain(defaultBaseThrust - correction, 0, 255);
    if (abs(error) < 5.0) {
      thrustL = defaultBaseThrust;
      thrustR = defaultBaseThrust;
    }
  } else if (currentState == OBSTACLE_AVOIDANCE) {
    thrustL = 180;
    thrustR = 60;
    if ((obsDist > obstacleClearThresholdCm && millis() - obstacleAvoidanceStartMs > 2000) || millis() - obstacleAvoidanceStartMs > obstacleAvoidanceTimeoutMs) {
      setNavState(previousNavState);
    }
  }
}

void advanceTowards(double destLat, double destLon, double stepMeters) {
  double dx = (destLon - currentLon) * cos(deg2rad(currentLat)) * 111320.0;
  double dy = (destLat - currentLat) * 110540.0;
  double dist = sqrt(dx * dx + dy * dy);

  if (dist <= stepMeters || dist < 1e-6) {
    currentLat = destLat;
    currentLon = destLon;
    remainingDistanceMeters = 0.0;
    return;
  }

  double ratio = stepMeters / dist;
  currentLat += (destLat - currentLat) * ratio;
  currentLon += (destLon - currentLon) * ratio;
  remainingDistanceMeters = computeDistanceMeters(currentLat, currentLon, destLat, destLon);
}

double nmeaToDecimal(const String &field, char hemisphere) {
  if (field.length() < 4) {
    return 0.0;
  }

  double raw = field.toDouble();
  double degrees = floor(raw / 100.0);
  double minutes = raw - (degrees * 100.0);
  double value = degrees + minutes / 60.0;

  if (hemisphere == 'S' || hemisphere == 'W') {
    value = -value;
  }

  return value;
}

void initMotors() {
  ledcSetup(MOTOR_LEFT_CHANNEL, MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  ledcAttachPin(MOTOR_LEFT_PIN, MOTOR_LEFT_CHANNEL);
  ledcSetup(MOTOR_RIGHT_CHANNEL, MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  ledcAttachPin(MOTOR_RIGHT_PIN, MOTOR_RIGHT_CHANNEL);
}

void initCompass() {
  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x00);
  Wire.write(0x70);
  Wire.endTransmission();

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x01);
  Wire.write(0xA0);
  Wire.endTransmission();

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x02);
  Wire.write(0x00);
  Wire.endTransmission();
  compassReady = true;
}

void initHardwareSensors() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Serial2.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  initMotors();
  initCompass();
}

void updateMotorOutputs() {
  ledcWrite(MOTOR_LEFT_CHANNEL, constrain(thrustL, 0, 255));
  ledcWrite(MOTOR_RIGHT_CHANNEL, constrain(thrustR, 0, 255));
}

void readUltrasonic() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 25000);
  if (duration > 0) {
    obsDist = min(400, int(duration * 0.034 / 2));
  }
}

bool readCompass() {
  if (!compassReady) {
    return false;
  }

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x03);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  Wire.requestFrom(HMC5883L_ADDRESS, 6);
  if (Wire.available() < 6) {
    return false;
  }

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();

  double headingRadians = atan2(rawY, rawX);
  double headingDegrees = headingRadians * 180.0 / PI;
  if (headingDegrees < 0) {
    headingDegrees += 360.0;
  }

  currentHeading = headingDegrees;
  return true;
}

void readGPS() {
  static String line = "";
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
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
        line = "";
      }
    } else {
      line += c;
    }
  }
}

void updateSensorValues() {
  readGPS();
  if (!readCompass() && hasGpsFix) {
    currentHeading = gpsCourse;
  }
  readUltrasonic();
}

void setOfflinePresence() {
  if (!Firebase.ready()) {
    return;
  }

  String presencePath = getStatusPath() + "/online";
  if (!Firebase.RTDB.setBool(&fbdo, presencePath.c_str(), false)) {
    Serial.print("Falha ao escrever presença offline: ");
    Serial.println(fbdo.errorReason());
  } else {
    Serial.println("Presença offline escrita no RTDB.");
  }
}

void simulateTelemetry() {
  const double stepMeters = 4.0;

  if (hasGpsFix) {
    currentLat = gpsLat;
    currentLon = gpsLon;
  }

  if (currentState == NAVIGATING_TO_GOAL) {
    if (!hasGpsFix) {
      advanceTowards(goalLat, goalLon, stepMeters);
    } else {
      remainingDistanceMeters = computeDistanceMeters(currentLat, currentLon, goalLat, goalLon);
    }
    routeProgress = (routeDistanceMeters > 0.0) ? min(1.0, 1.0 - remainingDistanceMeters / routeDistanceMeters) : 1.0;
    thrustL = 120;
    thrustR = 120;

    if (!compassReady && !hasGpsFix) {
      currentHeading = fmod(currentHeading + 1.0, 360.0);
    }

    if (remainingDistanceMeters <= 1.0) {
      Serial.println("Destino alcançado. Mudando para IDLE_HOLDING_POSITION.");
      currentLat = goalLat;
      currentLon = goalLon;
      routeProgress = 1.0;
      setNavState(IDLE_HOLDING_POSITION);
    }
  } else if (currentState == RETURNING_TO_HOME) {
    if (!hasGpsFix) {
      advanceTowards(homeLat, homeLon, stepMeters);
    } else {
      remainingDistanceMeters = computeDistanceMeters(currentLat, currentLon, homeLat, homeLon);
    }
    routeProgress = (routeDistanceMeters > 0.0) ? min(1.0, 1.0 - remainingDistanceMeters / routeDistanceMeters) : 1.0;
    thrustL = 90;
    thrustR = 90;

    if (!compassReady && !hasGpsFix) {
      currentHeading = fmod(currentHeading + 2.0, 360.0);
    }

    if (remainingDistanceMeters <= 1.0) {
      Serial.println("Retorno ao lar concluído. Mudando para IDLE_HOLDING_POSITION.");
      currentLat = homeLat;
      currentLon = homeLon;
      routeProgress = 1.0;
      activeMissionId = "";
      setNavState(IDLE_HOLDING_POSITION);
    }
  } else if (currentState == OBSTACLE_AVOIDANCE) {
    if (!compassReady) {
      currentHeading = fmod(currentHeading + 5.0, 360.0);
    }
    thrustL = 80;
    thrustR = 60;
  } else {
    thrustL = 0;
    thrustR = 0;
  }

  if (batteryMv > 5000) {
    batteryMv -= 1;
  }
}

void updateStatus() {
  FirebaseJson statusJson;
  statusJson.set("online", true);
  statusJson.set("last_seen", millis() / 1000);
  statusJson.set("active_mission_id", activeMissionId);
  statusJson.set("nav_state", navStateToString(currentState));
  statusJson.set("active_leg", activeLeg);
  statusJson.set("route_progress", routeProgress);
  statusJson.set("last_position/lat", currentLat);
  statusJson.set("last_position/lon", currentLon);

  String statusPath = getStatusPath();
  if (Firebase.RTDB.setJSON(&fbdo, statusPath.c_str(), &statusJson)) {
    Serial.println("Status atualizado com sucesso.");
  } else {
    Serial.print("Erro atualizando status: ");
    Serial.println(fbdo.errorReason());
  }
}

void publishTelemetry() {
  updateSensorValues();
  updateLOSControl();
  // simulateTelemetry();
  updateMotorOutputs();

  FirebaseJson telemetryJson;
  telemetryJson.set("timestamp", millis() / 1000);
  telemetryJson.set("mission_id", activeMissionId);
  telemetryJson.set("position/lat", currentLat);
  telemetryJson.set("position/lon", currentLon);
  telemetryJson.set("position/heading", currentHeading);
  telemetryJson.set("sensors/battery_mv", batteryMv);
  telemetryJson.set("sensors/obs_dist", obsDist);
  telemetryJson.set("actuators/thrust_l", thrustL);
  telemetryJson.set("actuators/thrust_r", thrustR);

  if (isWiFiConnected() && Firebase.ready()) {
    String telemetryPath = getTelemetryPath();
    if (Firebase.RTDB.setJSON(&fbdo, telemetryPath.c_str(), &telemetryJson)) {
      Serial.println("Telemetria publicada.");
    } else {
      Serial.print("Falha ao publicar telemetria: ");
      Serial.println(fbdo.errorReason());
    }
  } else {
    bufferTelemetryOffline(telemetryJson);
    bufferPathPointOffline(currentLat, currentLon, millis() / 1000);
    Serial.println("Telemetria e rota salvas no buffer offline.");
  }
}

bool fetchCommand(DroneCommand &command) {
  String commandPath = "/drones/" + droneId + "/command";
  if (!Firebase.RTDB.getJSON(&fbdo, commandPath.c_str())) {
    Serial.print("Erro lendo comando: ");
    Serial.println(fbdo.errorReason());
    return false;
  }

  FirebaseJson &result = fbdo.to<FirebaseJson>();
  FirebaseJsonData data;
  if (!result.get(data, "command_id")) {
    return false;
  }

  command.commandId = data.stringValue;
  if (command.commandId == "" || command.commandId == lastCommandId) {
    return false;
  }

  if (result.get(data, "cmd_type")) command.type = data.stringValue;
  if (result.get(data, "mission_id")) command.missionId = data.stringValue;
  if (result.get(data, "issued_at")) command.issuedAt = data.intValue;
  if (result.get(data, "target/lat")) command.targetLat = data.doubleValue;
  if (result.get(data, "target/lon")) command.targetLon = data.doubleValue;

  return true;
}

void setNavState(NavState newState) {
  if (newState == currentState) {
    return;
  }

  currentState = newState;
  Serial.print("Nav state alterado para: ");
  Serial.println(navStateToString(currentState));

  if (isWiFiConnected() && Firebase.ready()) {
    updateStatus();
  }
}

void handleCommand(const DroneCommand &command) {
  Serial.print("Processando comando: ");
  Serial.println(command.type);
  if (command.type == "set_destination") {
    activeMissionId = command.missionId;
    homeLat = currentLat;
    homeLon = currentLon;
    goalLat = command.targetLat;
    goalLon = command.targetLon;
    routeDistanceMeters = computeDistanceMeters(currentLat, currentLon, goalLat, goalLon);
    remainingDistanceMeters = routeDistanceMeters;
    activeLeg = 0;
    routeProgress = 0.0;
    setNavState(NAVIGATING_TO_GOAL);
    Serial.print("Destino definido: ");
    Serial.print(command.targetLat, 6);
    Serial.print(", ");
    Serial.println(command.targetLon, 6);
  } else if (command.type == "emergency_stop") {
    goalLat = homeLat;
    goalLon = homeLon;
    routeDistanceMeters = computeDistanceMeters(currentLat, currentLon, homeLat, homeLon);
    remainingDistanceMeters = routeDistanceMeters;
    activeLeg = 0;
    routeProgress = 0.0;
    setNavState(RETURNING_TO_HOME);
    Serial.println("Emergência: retornando para a origem.");
  } else {
    Serial.println("Comando desconhecido recebido.");
  }

  lastCommandId = command.commandId;
}

void processCommand() {
  DroneCommand command;
  if (fetchCommand(command)) {
    handleCommand(command);
  }
}

bool needFlushBuffers = true;

void setup() {
  Serial.begin(115200);
  delay(100);

  setupWiFi();
  setupFirebase();
  initFileSystem();
  initHardwareSensors();

  Serial.println("Firmware USV-AM inicializado.");
}

void loop() {
  manageWiFi();

  if (millis() - telemetryPrevMillis >= telemetryIntervalMs || telemetryPrevMillis == 0) {
    telemetryPrevMillis = millis();
    publishTelemetry();
  }

  if (isWiFiConnected() && Firebase.ready()) {
    if (needFlushBuffers) {
      if (flushOfflineBuffers()) {
        needFlushBuffers = false;
        Serial.println("Buffers offline enviados com sucesso.");
      }
    }

    if (millis() - commandPrevMillis >= commandIntervalMs || commandPrevMillis == 0) {
      commandPrevMillis = millis();
      processCommand();
    }

    if (millis() - statusPrevMillis >= statusIntervalMs || statusPrevMillis == 0) {
      statusPrevMillis = millis();
      updateStatus();
    }
  } else {
    needFlushBuffers = true;
  }

  delay(10);
}
