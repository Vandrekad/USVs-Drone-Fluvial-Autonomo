/**
 * Teste isolado: módulo utils
 * Exercita: deg2rad, wrapAngleDeg, headingErrorDeg, computeSHA256Hex,
 *           nmeaToDecimal, computeLocalPathHash
 *
 * Teste puramente computacional — não requer hardware externo.
 */

#include <Arduino.h>
#include "modules/utils/utils.h"
#include "modules/state/state.h"

static int testsPassed = 0;
static int testsFailed = 0;

void reportTest(const char* name, bool result) {
  Serial.printf("[TEST] %-40s => %s\n", name, result ? "PASS" : "FAIL");
  if (result) testsPassed++;
  else testsFailed++;
}

void testDeg2Rad() {
  double r180 = deg2rad(180.0);
  reportTest("deg2rad(180) ~= PI", fabs(r180 - 3.14159265) < 0.0001);

  double r0 = deg2rad(0.0);
  reportTest("deg2rad(0) == 0", fabs(r0) < 0.0001);

  double r90 = deg2rad(90.0);
  reportTest("deg2rad(90) ~= PI/2", fabs(r90 - 1.5707963) < 0.0001);
}

void testWrapAngleDeg() {
  reportTest("wrapAngleDeg(0) == 0", fabs(wrapAngleDeg(0.0)) < 0.001);
  reportTest("wrapAngleDeg(180) == -180 ou 180", fabs(fabs(wrapAngleDeg(180.0)) - 180.0) < 0.001);
  reportTest("wrapAngleDeg(-180) == -180 ou 180", fabs(fabs(wrapAngleDeg(-180.0)) - 180.0) < 0.001);
  reportTest("wrapAngleDeg(270) == -90", fabs(wrapAngleDeg(270.0) - (-90.0)) < 0.001);
  reportTest("wrapAngleDeg(-270) == 90", fabs(wrapAngleDeg(-270.0) - 90.0) < 0.001);
  reportTest("wrapAngleDeg(540) == -180 ou 180", fabs(fabs(wrapAngleDeg(540.0)) - 180.0) < 0.001);
}

void testHeadingErrorDeg() {
  // desired=90, current=80 -> error=10
  double e1 = headingErrorDeg(90.0, 80.0);
  reportTest("headingError(90,80) == 10", fabs(e1 - 10.0) < 0.001);

  // desired=10, current=350 -> error=20 (virou pelo norte)
  double e2 = headingErrorDeg(10.0, 350.0);
  reportTest("headingError(10,350) == 20", fabs(e2 - 20.0) < 0.001);

  // desired=350, current=10 -> error=-20
  double e3 = headingErrorDeg(350.0, 10.0);
  reportTest("headingError(350,10) == -20", fabs(e3 - (-20.0)) < 0.001);
}

void testComputeSHA256Hex() {
  String hash = computeSHA256Hex("hello");
  Serial.printf("  -> SHA256('hello') = %s\n", hash.c_str());
  // Known: SHA256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
  reportTest("SHA256('hello') length == 64", hash.length() == 64);
  reportTest("SHA256('hello') known value", hash == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");

  // Determinismo
  String hash2 = computeSHA256Hex("hello");
  reportTest("SHA256 determinístico", hash == hash2);

  // Diferente input
  String hashB = computeSHA256Hex("world");
  reportTest("SHA256('world') != SHA256('hello')", hashB != hash);
}

void testNmeaToDecimal() {
  // 4807.038,N -> 48 + 7.038/60 = 48.1173
  double lat = nmeaToDecimal("4807.038", 'N');
  Serial.printf("  -> NMEA 4807.038 N = %.6f\n", lat);
  reportTest("nmeaToDecimal(4807.038,N) ~= 48.1173", fabs(lat - 48.1173) < 0.001);

  // 01131.000,E -> 11 + 31.0/60 = 11.5167
  double lon = nmeaToDecimal("01131.000", 'E');
  reportTest("nmeaToDecimal(01131.000,E) ~= 11.5167", fabs(lon - 11.5167) < 0.001);

  // Hemisférios Sul/Oeste negativos
  double latS = nmeaToDecimal("0306.114", 'S');
  reportTest("nmeaToDecimal(S) < 0", latS < 0);

  double lonW = nmeaToDecimal("06001.500", 'W');
  reportTest("nmeaToDecimal(W) < 0", lonW < 0);
}

void testComputeLocalPathHash() {
  std::vector<String> lines;
  lines.push_back("{\"lat\":-3.1019,\"lon\":-60.025,\"ts\":1000}");
  lines.push_back("{\"lat\":-3.1020,\"lon\":-60.026,\"ts\":1001}");
  lines.push_back("{\"lat\":-3.1021,\"lon\":-60.027,\"ts\":1002}");

  String hash1 = computeLocalPathHash(lines);
  Serial.printf("  -> Path hash (3 pontos): %s\n", hash1.c_str());
  reportTest("computeLocalPathHash length == 64", hash1.length() == 64);

  // Determinísmo
  String hash2 = computeLocalPathHash(lines);
  reportTest("computeLocalPathHash determinístico", hash1 == hash2);

  // Diferente se mudar dados
  lines[0] = "{\"lat\":-3.2000,\"lon\":-60.025,\"ts\":1000}";
  String hash3 = computeLocalPathHash(lines);
  reportTest("computeLocalPathHash muda com dados", hash3 != hash1);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("========================================");
  Serial.println(" TESTE ISOLADO: módulo UTILS");
  Serial.println("========================================");

  testDeg2Rad();
  testWrapAngleDeg();
  testHeadingErrorDeg();
  testComputeSHA256Hex();
  testNmeaToDecimal();
  testComputeLocalPathHash();

  Serial.println("========================================");
  Serial.printf(" RESULTADO: %d PASS / %d FAIL\n", testsPassed, testsFailed);
  Serial.println("========================================");
}

void loop() {
  delay(10000);
}
