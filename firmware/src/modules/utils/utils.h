#pragma once

#include <Arduino.h>
#include <vector>

class FirebaseData;

double deg2rad(double deg);
double wrapAngleDeg(double angle);
double headingErrorDeg(double desired, double current);
String computeSHA256Hex(const String &input);
double nmeaToDecimal(const String &field, char hemisphere);
String computeLocalPathHash(const std::vector<String> &lines);
bool computeRTDBPathHash(const String &missionId, String &hash, FirebaseData &fbdo);
