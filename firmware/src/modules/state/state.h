#pragma once

#include <Arduino.h>
#include "modules/navigation/navigation.h"

extern const String droneId;
extern const unsigned long telemetryIntervalMs;
extern const unsigned long statusIntervalMs;
extern const unsigned long commandIntervalMs;
extern const char* telemetryBufferPath;
extern const char* pathBufferPath;

extern NavState currentState;
extern double currentLat;
extern double currentLon;
extern double currentHeading;
extern int batteryMv;
extern int obsDist;
extern int thrustL;
extern int thrustR;
extern String activeMissionId;
extern String lastCommandId;

extern bool hasGpsFix;
extern double gpsLat;
extern double gpsLon;
extern double gpsCourse;
extern bool compassReady;

extern double goalLat;
extern double goalLon;
extern double homeLat;
extern double homeLon;
extern double routeDistanceMeters;
extern double remainingDistanceMeters;
extern int activeLeg;
extern double routeProgress;
