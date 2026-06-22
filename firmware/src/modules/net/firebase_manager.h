#pragma once

#include <Arduino.h>
#include <Firebase_ESP_Client.h>
#include "modules/state/state.h"

extern FirebaseData fbdo;
extern bool firebaseInitialized;

bool setupFirebase();
bool updateStatus();
bool sendTelemetryJSON(FirebaseJson &telemetryJson);
bool setOfflinePresence();
bool publishTelemetry();
String getStatusPath();
String getTelemetryPath();
