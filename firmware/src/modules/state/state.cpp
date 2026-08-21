#include "modules/state/state.h"

// Identificação
const String droneId = DRONE_ID;
const char* telemetryBufferPath = TELEMETRY_BUFFER_PATH;
const char* pathBufferPath = PATH_BUFFER_PATH;

// Estado de navegação
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

// Sensores
bool hasGpsFix = false;
double gpsLat = -3.1019;
double gpsLon = -60.0250;
double gpsCourse = 0.0;
bool compassReady = false;

// Missão e rota
double goalLat = -3.1019;
double goalLon = -60.0250;
double homeLat = -3.1019;
double homeLon = -60.0250;
double routeDistanceMeters = 0.0;
double remainingDistanceMeters = 0.0;
int activeLeg = 0;
double routeProgress = 0.0;

// Flag de conectividade
bool needFlushBuffers = true;
