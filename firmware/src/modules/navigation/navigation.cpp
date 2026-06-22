#include "modules/navigation/navigation.h"
#include "modules/net/wifi_manager.h"
#include "modules/utils/utils.h"
#include "modules/net/firebase_manager.h"
#include "modules/state/state.h"

static const double lookaheadDistanceMeters = 8.0;
static const double losHeadingGain = 1.5;
static const int defaultBaseThrust = 120;
static const int obstacleThresholdCm = 60;
static const int obstacleClearThresholdCm = 120;
static const unsigned long obstacleAvoidanceTimeoutMs = 8000;
static unsigned long obstacleAvoidanceStartMs = 0;
static NavState previousNavState = IDLE_HOLDING_POSITION;

const char* navStateToString(NavState state) {
  switch (state) {
    case IDLE_HOLDING_POSITION:
      return "IDLE_HOLDING_POSITION";
    case NAVIGATING_TO_GOAL:
      return "NAVIGATING_TO_GOAL";
    case OBSTACLE_AVOIDANCE:
      return "OBSTACLE_AVOIDANCE";
    case RETURNING_TO_HOME:
      return "RETURNING_TO_HOME";
    case OFFLINE_NAVIGATION:
      return "OFFLINE_NAVIGATION";
    default:
      return "UNKNOWN";
  }
}

double computeDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
  double dLat = deg2rad(lat2 - lat1);
  double dLon = deg2rad(lon2 - lon1);
  double a = sin(dLat / 2) * sin(dLat / 2) + cos(deg2rad(lat1)) * cos(deg2rad(lat2)) * sin(dLon / 2) * sin(dLon / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return 6371000.0 * c;
}

static double computeCrossTrackError(double fromLat, double fromLon, double toLat, double toLon, double pointLat, double pointLon) {
  double dxLeg = (toLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyLeg = (toLat - fromLat) * 110540.0;
  double dxPoint = (pointLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyPoint = (pointLat - fromLat) * 110540.0;
  double legNorm = sqrt(dxLeg * dxLeg + dyLeg * dyLeg);
  if (legNorm < 1e-6) {
    return 0.0;
  }
  return (dxPoint * dyLeg - dyPoint * dxLeg) / legNorm;
}

static void enterObstacleAvoidance() {
  if (currentState != OBSTACLE_AVOIDANCE) {
    previousNavState = currentState;
    currentState = OBSTACLE_AVOIDANCE;
    obstacleAvoidanceStartMs = millis();
    Serial.println("OBSTACLE_AVOIDANCE ativado.");
    if (isWiFiConnected() && Firebase.ready()) {
      updateStatus();
    }
  }
}

double computeLOSHeading(double fromLat, double fromLon, double toLat, double toLon) {
  double dxLeg = (toLon - fromLon) * cos(deg2rad(fromLat)) * 111320.0;
  double dyLeg = (toLat - fromLat) * 110540.0;
  double chiP = atan2(dyLeg, dxLeg) * 180.0 / PI;
  if (chiP < 0) {
    chiP += 360.0;
  }

  double eCt = computeCrossTrackError(fromLat, fromLon, toLat, toLon, currentLat, currentLon);
  double chiD = chiP - atan2(eCt, lookaheadDistanceMeters) * 180.0 / PI;
  chiD = fmod(chiD + 360.0, 360.0);

  if (hasGpsFix && compassReady) {
    double betaHat = wrapAngleDeg(gpsCourse - currentHeading);
    chiD = wrapAngleDeg(chiD - betaHat);
    if (chiD < 0) {
      chiD += 360.0;
    }
  }

  return chiD;
}

void updateLOSControl() {
  if (currentState == NAVIGATING_TO_GOAL || currentState == RETURNING_TO_HOME) {
    if (obsDist <= obstacleThresholdCm) {
      enterObstacleAvoidance();
      return;
    }

    double fromLat = currentLat;
    double fromLon = currentLon;
    double targetLat = (currentState == NAVIGATING_TO_GOAL) ? goalLat : homeLat;
    double targetLon = (currentState == NAVIGATING_TO_GOAL) ? goalLon : homeLon;
    double desiredHeading = computeLOSHeading(fromLat, fromLon, targetLat, targetLon);
    double error = headingErrorDeg(desiredHeading, currentHeading);
    int correction = int(error * losHeadingGain);
    thrustL = constrain(defaultBaseThrust + correction, 0, 255);
    thrustR = constrain(defaultBaseThrust - correction, 0, 255);
    if (abs(error) < 5.0) {
      thrustL = defaultBaseThrust;
      thrustR = defaultBaseThrust;
    }
  } else if (currentState == OBSTACLE_AVOIDANCE) {
    thrustL = 180;
    thrustR = 60;
    if ((obsDist > obstacleClearThresholdCm && millis() - obstacleAvoidanceStartMs > 2000) || millis() - obstacleAvoidanceStartMs > obstacleAvoidanceTimeoutMs) {
      currentState = previousNavState;
    }
  }
}

void advanceTowards(double destLat, double destLon, double stepMeters) {
  double dx = (destLon - currentLon) * cos(deg2rad(currentLat)) * 111320.0;
  double dy = (destLat - currentLat) * 110540.0;
  double dist = sqrt(dx * dx + dy * dy);

  if (dist <= stepMeters || dist < 1e-6) {
    currentLat = destLat;
    currentLon = destLon;
    remainingDistanceMeters = 0.0;
    return;
  }

  double ratio = stepMeters / dist;
  currentLat += (destLat - currentLat) * ratio;
  currentLon += (destLon - currentLon) * ratio;
  remainingDistanceMeters = computeDistanceMeters(currentLat, currentLon, destLat, destLon);
}
