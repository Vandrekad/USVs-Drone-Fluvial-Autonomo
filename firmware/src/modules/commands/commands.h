#pragma once

#include <Arduino.h>
#include "modules/navigation/navigation.h"

struct DroneCommand {
  String commandId;
  String type;
  double targetLat;
  double targetLon;
  String missionId;
  unsigned long issuedAt;
};

void setNavState(NavState newState);
bool fetchCommand(DroneCommand &command);
void handleCommand(const DroneCommand &command);
void processCommand();
