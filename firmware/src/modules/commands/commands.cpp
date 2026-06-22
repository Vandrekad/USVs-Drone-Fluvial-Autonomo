#include "modules/commands/commands.h"
#include "modules/net/wifi_manager.h"
#include "modules/net/firebase_manager.h"
#include "modules/state/state.h"
#include "modules/navigation/navigation.h"

bool fetchCommand(DroneCommand &command) {
  String commandPath = "/drones/" + droneId + "/command";
  if (!Firebase.RTDB.getJSON(&fbdo, commandPath.c_str())) {
    Serial.print("Erro lendo comando: ");
    Serial.println(fbdo.errorReason());
    return false;
  }

  FirebaseJson &result = fbdo.to<FirebaseJson>();
  FirebaseJsonData data;
  if (!result.get(data, "command_id")) {
    return false;
  }

  command.commandId = data.stringValue;
  if (command.commandId == "" || command.commandId == lastCommandId) {
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
    Serial.print("Destino definido: ");
    Serial.print(command.targetLat, 6);
    Serial.print(", ");
    Serial.println(command.targetLon, 6);
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
    Serial.println("Comando desconhecido recebido.");
  }
  lastCommandId = command.commandId;
}

void processCommand() {
  DroneCommand command;
  if (fetchCommand(command)) {
    handleCommand(command);
  }
}
