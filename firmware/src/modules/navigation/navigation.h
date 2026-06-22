#pragma once

#include <Arduino.h>

enum NavState {
  IDLE_HOLDING_POSITION,
  NAVIGATING_TO_GOAL,
  OBSTACLE_AVOIDANCE,
  RETURNING_TO_HOME,
  OFFLINE_NAVIGATION
};

const char* navStateToString(NavState state);
double computeDistanceMeters(double lat1, double lon1, double lat2, double lon2);
double computeLOSHeading(double fromLat, double fromLon, double toLat, double toLon);
void updateLOSControl();
void advanceTowards(double destLat, double destLon, double stepMeters);
