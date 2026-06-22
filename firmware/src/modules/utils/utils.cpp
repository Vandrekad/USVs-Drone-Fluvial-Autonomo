#include "modules/utils/utils.h"
#include <ArduinoJson.h>
#include <mbedtls/sha256.h>
#include <vector>

#include "modules/state/state.h"

double deg2rad(double deg) {
  return deg * 0.017453292519943295;
}

double wrapAngleDeg(double angle) {
  double wrapped = fmod(angle + 540.0, 360.0);
  if (wrapped < 0) {
    wrapped += 360.0;
  }
  return wrapped - 180.0;
}

double headingErrorDeg(double desired, double current) {
  return wrapAngleDeg(desired - current);
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

String computeLocalPathHash(const std::vector<String> &lines) {
  StaticJsonDocument<512> doc;
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

#include <Firebase_ESP_Client.h>

bool computeRTDBPathHash(const String &missionId, String &hash, FirebaseData &fbdo) {
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

  StaticJsonDocument<8192> doc;
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
