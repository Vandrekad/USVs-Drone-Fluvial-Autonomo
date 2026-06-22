#include "modules/sensors/sensors.h"
#include <Wire.h>
#include "modules/state/state.h"
#include "modules/utils/utils.h"

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define ULTRASONIC_TRIG_PIN 26
#define ULTRASONIC_ECHO_PIN 27
#define MOTOR_LEFT_PIN 32
#define MOTOR_RIGHT_PIN 33
#define MOTOR_LEFT_CHANNEL 0
#define MOTOR_RIGHT_CHANNEL 1
#define MOTOR_PWM_FREQ 5000
#define MOTOR_PWM_RES 8
#define HMC5883L_ADDRESS 0x1E

void initMotors() {
  ledcSetup(MOTOR_LEFT_CHANNEL, MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  ledcAttachPin(MOTOR_LEFT_PIN, MOTOR_LEFT_CHANNEL);
  ledcSetup(MOTOR_RIGHT_CHANNEL, MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  ledcAttachPin(MOTOR_RIGHT_PIN, MOTOR_RIGHT_CHANNEL);
}

bool initCompass() {
  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x00);
  Wire.write(0x70);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x01);
  Wire.write(0xA0);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x02);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  compassReady = true;
  return true;
}

bool initHardwareSensors() {
  Serial.println("Inicializando sensores de hardware...");
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Serial2.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  initMotors();
  bool compassOk = initCompass();
  Serial.print("Bússola inicializada: ");
  Serial.println(compassOk ? "OK" : "FALHA");
  Serial.println("Sensores de hardware inicializados.");
  return true;
}

void updateMotorOutputs() {
  ledcWrite(MOTOR_LEFT_CHANNEL, constrain(thrustL, 0, 255));
  ledcWrite(MOTOR_RIGHT_CHANNEL, constrain(thrustR, 0, 255));
}

void readUltrasonic() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 25000);
  if (duration > 0) {
    obsDist = min(400, int(duration * 0.034 / 2));
  }
}

bool readCompass() {
  if (!compassReady) {
    return false;
  }

  Wire.beginTransmission(HMC5883L_ADDRESS);
  Wire.write(0x03);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  Wire.requestFrom(HMC5883L_ADDRESS, 6);
  if (Wire.available() < 6) {
    return false;
  }

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();

  double headingRadians = atan2(rawY, rawX);
  double headingDegrees = headingRadians * 180.0 / PI;
  if (headingDegrees < 0) {
    headingDegrees += 360.0;
  }

  currentHeading = headingDegrees;
  return true;
}

void readGPS() {
  static String line = "";
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
        if (line.startsWith("$GPRMC") || line.startsWith("$GNRMC")) {
          int index = 0;
          int fieldStart = 0;
          String fields[12];
          for (int i = 0; i < line.length() && index < 12; i++) {
            if (line[i] == ',') {
              fields[index++] = line.substring(fieldStart, i);
              fieldStart = i + 1;
            }
          }
          if (index >= 11) {
            fields[index++] = line.substring(fieldStart);
          }
          if (index >= 9 && fields[2].length() && fields[4].length()) {
            char status = fields[2].charAt(0);
            if (status == 'A') {
              gpsLat = nmeaToDecimal(fields[3], fields[4].charAt(0));
              gpsLon = nmeaToDecimal(fields[5], fields[6].charAt(0));
              gpsCourse = fields[8].toDouble();
              hasGpsFix = true;
            } else {
              hasGpsFix = false;
            }
          }
        }
        line = "";
      }
    } else {
      line += c;
    }
  }
}

void updateSensorValues() {
  readGPS();
  if (!readCompass() && hasGpsFix) {
    currentHeading = gpsCourse;
  }
  readUltrasonic();
}
