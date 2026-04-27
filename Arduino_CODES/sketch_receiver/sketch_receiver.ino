#include <SPI.h>
#include <RF24.h>

RF24 radio(9, 8);
const byte address[6] = "00001";

#define IN1 2
#define IN2 3
#define IN3 4
#define IN4 6
#define ENA 5
#define ENB 10

int motorSpeed = 180;  // Fixed: was 80 (too low, motors won't spin)

void setup() {
  Serial.begin(9600);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  stopMotors();

  if (!radio.begin()) {                          // Fixed: added nRF24 check
    Serial.println("nRF24 not responding! Check wiring.");
    while (1) {}
  }

  radio.setChannel(108);                         // Fixed: must match TX
  radio.setDataRate(RF24_250KBPS);               // Fixed: must match TX
  radio.setPALevel(RF24_PA_LOW);                 // Fixed: matched with TX
  radio.openReadingPipe(0, address);
  radio.startListening();

  Serial.println("RX Ready");
}

void loop() {
  if (radio.available()) {
    char payload[2] = "";
    radio.read(&payload, sizeof(payload));
    char cmd = payload[0];

    Serial.print("Received: ");
    Serial.println(cmd);

    if      (cmd == 'F') moveForward();
    else if (cmd == 'B') moveBackward();
    else if (cmd == 'L') turnLeft();
    else if (cmd == 'R') turnRight();
    else if (cmd == 'S') stopMotors();
    else {
      Serial.println("Unknown cmd - stopping");  // Fixed: safety fallback
      stopMotors();
    }
  }
}

void moveForward() {
  analogWrite(ENA, motorSpeed);
  analogWrite(ENB, motorSpeed);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void moveBackward() {
  analogWrite(ENA, motorSpeed);
  analogWrite(ENB, motorSpeed);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void turnLeft() {
  analogWrite(ENA, motorSpeed);
  analogWrite(ENB, motorSpeed);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void turnRight() {
  analogWrite(ENA, motorSpeed);
  analogWrite(ENB, motorSpeed);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stopMotors() {
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}