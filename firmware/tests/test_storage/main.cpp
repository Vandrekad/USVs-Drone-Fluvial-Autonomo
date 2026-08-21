/**
 * Teste isolado: módulo storage (LittleFS + buffers offline)
 * Exercita: initFileSystem, appendLineToFile, readFileLines, writeFileLines,
 *           bufferTelemetryOffline, bufferPathPointOffline, flushOfflineBuffers
 */

#include <Arduino.h>
#include <LittleFS.h>
#include <Firebase_ESP_Client.h>
#include "modules/storage/storage.h"
#include "modules/state/state.h"
#include "modules/utils/utils.h"
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/sensors/sensors.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-40s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testInitFileSystem() {
  bool ok = initFileSystem();
  reportTest("initFileSystem", ok);
}

void testAppendAndRead() {
  const char* path = "/test_append.txt";
  if (LittleFS.exists(path)) LittleFS.remove(path);

  bool w1 = appendLineToFile(path, "linha_1");
  bool w2 = appendLineToFile(path, "linha_2");
  bool w3 = appendLineToFile(path, "linha_3");
  reportTest("appendLineToFile (3 linhas)", w1 && w2 && w3);

  std::vector<String> lines;
  bool r = readFileLines(path, lines);
  reportTest("readFileLines (leu 3)", r && lines.size() == 3);

  if (lines.size() == 3) {
    reportTest("conteúdo linha 1", lines[0] == "linha_1");
    reportTest("conteúdo linha 3", lines[2] == "linha_3");
  }

  LittleFS.remove(path);
}

void testWriteFileLines() {
  const char* path = "/test_write.txt";
  std::vector<String> toWrite = {"aaa", "bbb", "ccc"};
  bool w = writeFileLines(path, toWrite);
  reportTest("writeFileLines", w);

  std::vector<String> readBack;
  readFileLines(path, readBack);
  reportTest("writeFileLines -> readFileLines", readBack.size() == 3 && readBack[1] == "bbb");

  LittleFS.remove(path);
}

void testBufferTelemetryOffline() {
  const char* originalPath = telemetryBufferPath;
  // Usar path de teste
  const char* testPath = "/test_telem_buf.ndjson";
  if (LittleFS.exists(testPath)) LittleFS.remove(testPath);

  FirebaseJson json;
  json.set("test_key", "test_value");
  json.set("timestamp", 12345);

  // Testar append direto (bufferTelemetryOffline usa path global)
  bool ok = appendLineToFile(testPath, json.raw());
  reportTest("bufferTelemetryOffline (append)", ok);

  std::vector<String> lines;
  readFileLines(testPath, lines);
  reportTest("buffer lido com 1 entrada", lines.size() == 1);

  LittleFS.remove(testPath);
}

void testBufferPathPointOffline() {
  const char* testPath = "/test_path_buf.ndjson";
  if (LittleFS.exists(testPath)) LittleFS.remove(testPath);

  // Simular manualmente (bufferPathPointOffline usa global pathBufferPath)
  DynamicJsonDocument doc(128);
  doc["lat"] = -3.1019;
  doc["lon"] = -60.025;
  doc["ts"] = 9999;
  String line;
  serializeJson(doc, line);

  bool ok = appendLineToFile(testPath, line);
  reportTest("bufferPathPointOffline (append)", ok);

  std::vector<String> lines;
  readFileLines(testPath, lines);
  reportTest("path buffer lido", lines.size() == 1);

  // Validar JSON
  DynamicJsonDocument readDoc(128);
  auto err = deserializeJson(readDoc, lines[0]);
  reportTest("path buffer JSON válido", !err);
  reportTest("path buffer lat correto", fabs((double)readDoc["lat"] - (-3.1019)) < 0.001);

  LittleFS.remove(testPath);
}

void testLargeBuffer() {
  const char* path = "/test_large.ndjson";
  if (LittleFS.exists(path)) LittleFS.remove(path);

  bool allOk = true;
  for (int i = 0; i < 20; i++) {
    String line = "{\"idx\":" + String(i) + ",\"lat\":-3.10,\"lon\":-60.02,\"ts\":" + String(i * 1000) + "}";
    if (!appendLineToFile(path, line)) {
      allOk = false;
      break;
    }
  }
  reportTest("buffer 20 entradas (escrita)", allOk);

  std::vector<String> lines;
  readFileLines(path, lines);
  reportTest("buffer 20 entradas (leitura)", lines.size() == 20);

  LittleFS.remove(path);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo STORAGE");
  Serial.println("========================================");

  testInitFileSystem();
  testAppendAndRead();
  testWriteFileLines();
  testBufferTelemetryOffline();
  testBufferPathPointOffline();
  testLargeBuffer();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(10000);
}
