#include "modules/state/state.h"

const String droneId = "drone_01";
const unsigned long telemetryIntervalMs = 2000;
const unsigned long statusIntervalMs = 2000;
const unsigned long commandIntervalMs = 1000;
const char* telemetryBufferPath = "/telemetry_buffer.ndjson";
const char* pathBufferPath = "/path_buffer.ndjson";

NavState currentState = IDLE_HOLDING_POSITION;
double currentLat = -3.1019;
double currentLon = -60.0250;
double currentHeading = 0.0;
int batteryMv = 8000;
int obsDist = 200;
int thrustL = 0;
int thrustR = 0;
String activeMissionId = "";
String lastCommandId = "";

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
