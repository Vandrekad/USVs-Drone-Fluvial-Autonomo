#pragma once

#include <Arduino.h>

bool initHardwareSensors();
void initMotors();
bool initCompass();
void updateMotorOutputs();
void readUltrasonic();
bool readCompass();
void readGPS();
void updateSensorValues();
