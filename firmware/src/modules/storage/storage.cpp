#include "modules/storage/storage.h"
#include <LittleFS.h>
#include "config.h"
#include "modules/utils/utils.h"
#include "modules/state/state.h"
#include "modules/net/firebase_manager.h"

bool initFileSystem() {
  if (!LittleFS.begin(true)) {
    Serial.println("Falha ao iniciar LittleFS.");
    return false;
  }
  Serial.println("LittleFS montado.");
  return true;
}

bool appendLineToFile(const char *path, const String &line) {
  File file = LittleFS.open(path, FILE_APPEND);
  if (!file) {
    Serial.printf("Erro abrindo %s para append.\n", path);
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
    Serial.printf("Erro abrindo %s para escrita.\n", path);
    return false;
  }
  for (const String &line : lines) {
    file.println(line);
  }
  file.close();
  return true;
}

bool bufferTelemetryOffline(FirebaseJson &telemetryJson) {
  String line = telemetryJson.raw();
  return appendLineToFile(telemetryBufferPath, line);
}

bool bufferPathPointOffline(double lat, double lon, unsigned long ts) {
  // ArduinoJson v7: usar JsonDocument em vez de DynamicJsonDocument
  JsonDocument pointDoc;
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

  // FIX #14: Processar em lotes para não sobrecarregar RAM
  std::vector<String> remaining;
  size_t batchLimit = min((size_t)FLUSH_BATCH_SIZE, lines.size());

  for (size_t i = 0; i < lines.size(); i++) {
    if (i >= batchLimit) {
      // Limitar a um lote por ciclo — o resto fica para a próxima chamada
      for (size_t j = i; j < lines.size(); j++) {
        remaining.push_back(lines[j]);
      }
      break;
    }

    JsonDocument tempDoc;
    auto error = deserializeJson(tempDoc, lines[i]);
    if (error) {
      // Linha corrompida — descartar
      Serial.printf("Descartando linha corrompida no buffer de telemetria (pos %d)\n", (int)i);
      continue;
    }
    FirebaseJson json;
    json.setJsonData(lines[i]);
    if (!sendTelemetryJSON(json)) {
      // Falha de envio — manter esta e todas as seguintes
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
  return remaining.empty();  // true se esvaziou completamente
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

  // Deduplicação por hash dos primeiros 5 pontos
  String remoteHash;
  bool hasRemoteHash = computeRTDBPathHash(activeMissionId, remoteHash, fbdo);
  String localHash = computeLocalPathHash(lines);
  size_t startIndex = 0;
  if (hasRemoteHash && remoteHash == localHash && lines.size() > 5) {
    startIndex = 5;
  }

  // FIX: processar em lotes
  std::vector<String> remaining;
  size_t batchEnd = min(startIndex + FLUSH_BATCH_SIZE, lines.size());

  for (size_t i = startIndex; i < lines.size(); i++) {
    if (i >= batchEnd) {
      for (size_t j = i; j < lines.size(); j++) {
        remaining.push_back(lines[j]);
      }
      break;
    }

    JsonDocument pointDoc;
    auto error = deserializeJson(pointDoc, lines[i]);
    if (error) {
      // Linha corrompida — descartar
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
  return remaining.empty();
}

bool flushOfflineBuffers() {
  bool ok = true;
  ok &= flushTelemetryBuffer();
  ok &= flushPathBuffer();
  return ok;
}
