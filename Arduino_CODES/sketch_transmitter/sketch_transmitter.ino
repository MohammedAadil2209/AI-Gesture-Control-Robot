#include <SPI.h>
#include <RF24.h>

RF24 radio(9, 8);  // CE=D9, CSN=D8
const byte address[6] = "00001";

void setup() {
  Serial.begin(9600);

  if (!radio.begin()) {
    Serial.println("nRF24 not responding! Check wiring.");
    while (1) {}  // Halt until wiring is fixed
  }

  radio.setChannel(108);           // Fixed: above WiFi range
  radio.openWritingPipe(address);
  radio.setPALevel(RF24_PA_LOW);   // Fixed: matched with RX
  radio.setDataRate(RF24_250KBPS); // Fixed: better range/stability
  radio.stopListening();
  Serial.println("TX Ready");
}

void loop() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == 'F' || cmd == 'B' || cmd == 'L' || cmd == 'R' || cmd == 'S') {
      char payload[2];
      payload[0] = cmd;
      payload[1] = '\0';

      bool ok = radio.write(&payload, sizeof(payload));  // Fixed: check if send succeeded
      Serial.print("Sent: ");
      Serial.print(cmd);
      Serial.println(ok ? " [OK]" : " [FAILED]");       // Fixed: shows if TX failed
    }
  }
}