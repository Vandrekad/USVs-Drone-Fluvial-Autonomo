#include "modules/commands/commands.h"
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/state/state.h"
#include "modules/navigation/navigation.h"

bool fetchCommand(DroneCommand &command) {
  String commandPath = "/drones/" + droneId + "/command";
  if (!Firebase.RTDB.getJSON(&fbdo, commandPath.c_str())) {
    // Não logar em cada polling — muito ruidoso. Só se for erro real.
    if (fbdo.errorReason() != "path not exist" && fbdo.errorReason().length() > 0) {
      Serial.print("Erro lendo comando: ");
      Serial.println(fbdo.errorReason());
    }
    return false;
  }

  FirebaseJson &result = fbdo.to<FirebaseJson>();
  FirebaseJsonData data;
  if (!result.get(data, "command_id")) {
    return false;
  }

  command.commandId = data.stringValue;
  if (command.commandId.length() == 0 || command.commandId == lastCommandId) {
    return false;
  }

  if (result.get(data, "cmd_type")) command.type = data.stringValue;
  if (result.get(data, "mission_id")) command.missionId = data.stringValue;
  if (result.get(data, "issued_at")) command.issuedAt = data.intValue;
  if (result.get(data, "target/lat")) command.targetLat = data.doubleValue;
  if (result.get(data, "target/lon")) command.targetLon = data.doubleValue;

  return true;
}

void setNavState(NavState newState) {
  if (newState == currentState) {
    return;
  }
  currentState = newState;
  Serial.print("Nav state alterado para: ");
  Serial.println(navStateToString(currentState));
  if (isWiFiConnected() && Firebase.ready()) {
    updateStatus();
  }
}

void handleCommand(const DroneCommand &command) {
  Serial.print("Processando comando: ");
  Serial.println(command.type);

  if (command.type == "set_destination") {
    activeMissionId = command.missionId;
    homeLat = currentLat;
    homeLon = currentLon;
    goalLat = command.targetLat;
    goalLon = command.targetLon;
    routeDistanceMeters = computeDistanceMeters(currentLat, currentLon, goalLat, goalLon);
    remainingDistanceMeters = routeDistanceMeters;
    activeLeg = 0;
    routeProgress = 0.0;
    setNavState(NAVIGATING_TO_GOAL);
    Serial.printf("Destino definido: %.6f, %.6f (dist=%.1fm)\n",
                  command.targetLat, command.targetLon, routeDistanceMeters);

  } else if (command.type == "emergency_stop") {
    goalLat = homeLat;
    goalLon = homeLon;
    routeDistanceMeters = computeDistanceMeters(currentLat, currentLon, homeLat, homeLon);
    remainingDistanceMeters = routeDistanceMeters;
    activeLeg = 0;
    routeProgress = 0.0;
    setNavState(RETURNING_TO_HOME);
    Serial.println("Emergência: retornando para a origem.");

  } else {
    Serial.print("Comando desconhecido: ");
    Serial.println(command.type);
  }

  lastCommandId = command.commandId;
}

void processCommand() {
  DroneCommand command;
  if (fetchCommand(command)) {
    handleCommand(command);
  }
}
