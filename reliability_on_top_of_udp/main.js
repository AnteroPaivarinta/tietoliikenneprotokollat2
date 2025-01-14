const createReliabilityLayerWithACKNAK = (virtualSocket) => {
    const send = (data, callback) => {
        const crc = generateCRC8(data);
        const packet = JSON.stringify({ data, crc });

        const handleResponse = (response) => {
            if (response === "ACK") {
                console.log("ACK received. Data successfully delivered.");
                callback();
            } else if (response === "NAK") {
                console.log("NAK received. Retransmitting...");
                virtualSocket.send(packet, handleResponse);
            }
        };

        console.log(`Sending packet: ${packet}`);
        virtualSocket.send(packet, handleResponse);
    };

    const receive = (packet) => {
        const { data, crc } = JSON.parse(packet);
        if (verifyCRC8(data, crc)) {
            console.log(`Packet received correctly: ${data}`);
            return "ACK";
        } else {
            console.log("Packet received with errors.");
            return "NAK";
        }
    };

    return { send, receive };
};

const createReliabilityLayerWithNAK = (virtualSocket) => {
    const send = (data, callback) => {
        const crc = generateCRC8(data);
        const packet = JSON.stringify({ data, crc });

        const handleResponse = (response) => {
            if (response === "NAK") {
                console.log("NAK received. Retransmitting...");
                virtualSocket.send(packet, handleResponse);
            } else {
                console.log("Assuming data delivered successfully.");
                callback();
            }
        };

        console.log(`Sending packet: ${packet}`);
        virtualSocket.send(packet, handleResponse);
    };

    const receive = (packet) => {
        const { data, crc } = JSON.parse(packet);
        if (verifyCRC8(data, crc)) {
            console.log(`Packet received correctly: ${data}`);
            return null; // No response needed
        } else {
            console.log("Packet received with errors. Sending NAK.");
            return "NAK";
        }
    };

    return { send, receive };
};

const generateCRC8 = (data) => {
    const polynomial = 0x07; // CRC-8 polynomial: x^8 + x^2 + x + 1
    let crc = 0;
    for (const byte of Buffer.from(data, "utf8")) {
        crc ^= byte; // XOR with the byte
        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x80) ? (crc << 1) ^ polynomial : crc << 1;
        }
    }
    return crc & 0xff; // Ensure it fits in one byte
};

const verifyCRC8 = (data, crc) => generateCRC8(data) === crc;

const createReliabilityLayerWithACK = (virtualSocket, timeoutMs = 1000) => {
    const send = (data, callback) => {
        const crc = generateCRC8(data);
        const packet = JSON.stringify({ data, crc });

        const sendWithTimeout = () => {
            console.log(`Sending packet: ${packet}`);
            let ackReceived = false;

            const handleResponse = (response) => {
                if (response === "ACK") {
                    ackReceived = true;
                    console.log("ACK received. Data successfully delivered.");
                    callback();
                }
            };

            virtualSocket.send(packet, handleResponse);

            setTimeout(() => {
                if (!ackReceived) {
                    console.log("Timeout! Retransmitting...");
                    sendWithTimeout();
                }
            }, timeoutMs);
        };

        sendWithTimeout();
    };

    const receive = (packet) => {
        const { data, crc } = JSON.parse(packet);
        if (verifyCRC8(data, crc)) {
            console.log(`Packet received correctly: ${data}`);
            return "ACK";
        } else {
            console.log("Packet received with errors. Ignoring packet.");
            return null;
        }
    };

    return { send, receive };
};




// Configurable probabilities and delay
const createVirtualSocket = (
    dropProbability = 0.1,
    delayProbability = 0.1,
    errorProbability = 0.1,
    maxDelayMs = 1000
) => {
    // Function to send data with random behaviors
    const send = (data, callback) => {
        // Drop packet
        if (Math.random() < dropProbability) return console.log("Packet dropped.");

        // Delay packet
        if (Math.random() < delayProbability) {
            const delay = Math.random() * maxDelayMs;
            console.log(`Packet delayed by ${Math.round(delay)} ms.`);
            return setTimeout(() => callback(maybeCorruptData(data)), delay);
        }

        // Send possibly corrupted data
        callback(maybeCorruptData(data));
    };

    // Randomly introduce bit errors
    const maybeCorruptData = (data) =>
        Math.random() < errorProbability ? introduceBitError(data) : data;

    // Flip a random bit in the data
    const introduceBitError = (data) => {
        const buffer = Buffer.from(data, "utf8");
        const byteIndex = Math.floor(Math.random() * buffer.length);
        const bitIndex = Math.floor(Math.random() * 8);
        buffer[byteIndex] ^= 1 << bitIndex; // Flip bit
        console.log(`Bit error introduced: ${data} -> ${buffer.toString("utf8")}`);
        return buffer.toString("utf8");
    };

    return { send };
};




const data = "Hello, reliable world!";

// Test Positive and Negative ACKs
const layer1 = createReliabilityLayerWithACKNAK(virtualSocket);
layer1.send(data, () => console.log("Transfer complete with ACK-NAK."));

// Test Only Positive ACKs
const layer2 = createReliabilityLayerWithACK(virtualSocket);
layer2.send(data, () => console.log("Transfer complete with Positive ACKs."));

// Test Only Negative ACKs
const layer3 = createReliabilityLayerWithNAK(virtualSocket);
layer3.send(data, () => console.log("Transfer complete with Negative ACKs."));




// Example Usage
const server = (receivedData) => console.log(`Server received: ${receivedData}`);
const client = (socket) => {
    const message = "Hello, Server!";
    console.log(`Client sending: ${message}`);
    socket.send(message, server);
};

// Initialize Virtual Socket and Test
const virtualSocket = createVirtualSocket(0.2, 0.3, 0.1, 2000);
client(virtualSocket);
