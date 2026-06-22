#pragma once

#include <Arduino.h>
#include <vector>
#include <ArduinoJson.h>
#include <Firebase_ESP_Client.h>

bool initFileSystem();
bool appendLineToFile(const char *path, const String &line);
bool readFileLines(const char *path, std::vector<String> &lines);
bool writeFileLines(const char *path, const std::vector<String> &lines);
bool bufferTelemetryOffline(FirebaseJson &telemetryJson);
bool bufferPathPointOffline(double lat, double lon, unsigned long ts);
bool flushTelemetryBuffer();
bool flushPathBuffer();
bool flushOfflineBuffers();
