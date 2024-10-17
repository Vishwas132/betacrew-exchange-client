const net = require('net');
const fs = require('fs');

const PACKET_SIZE = 17; // 4 + 1 + 4 + 4 + 4 bytes
const SOCKET_TIMEOUT = 30000;
const HOST = "localhost";
const PORT = 3000;

class BetaCrewExchangeClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.packets = [];
        this.missingSequences = new Set();
        this.packetSize = PACKET_SIZE;
        this.socketTimeout = SOCKET_TIMEOUT;
    }
    
    streamAllPackets() {
        const dataEventHandler = (data) => {
            this.processPackets(data);
        }
        // Payload size 2 bytes, 1 byte for callType and 1 byte for resentSeq
        const payload = Buffer.alloc(2);
        payload.writeInt8(1, 0); // callType: 1
        payload.writeInt8(0, 1); // resendSeq: 0, cause it is not a resend request

        console.log(`Sending stream all packets request. Payload: ${payload.toString('hex')}`);
        this.client.write(payload, (err) => {
            if (err) {
                console.error('Error writing to socket:', err);
            }
        });

        this.client.on('data', dataEventHandler);

        this.client.on('end', () => {
            console.log(`Received and Processed ${this.packets.length} packets with sequences: {${this.packets.map(packet => packet.sequence)}}`);
        });
        
        this.client.on('close', () => {
            console.log('Connection closed');
            this.client.off("data", dataEventHandler);
            this.identifyMissingSequences();
            if (this.missingSequences.size > 0) {
                this.client.connect(this.port, this.host, () => {
                    console.log('Connected again to BetaCrew Exchange Server');
                    this.resendMissingPackets();
                });
            }
        });
    }

    processPackets(data) {
        if (data.length % this.packetSize !== 0) {
            console.error('Received data length is invalid:', data.length);
            return;
        }
        for (let i = 0; i < data.length; i += this.packetSize) {
            const packet = {
                symbol: data.toString('ascii', i, i + 4),
                buySellIndicator: data.toString('ascii', i + 4, i + 5),
                quantity: data.readInt32BE(i + 5),
                price: data.readInt32BE(i + 9),
                sequence: data.readInt32BE(i + 13)
            };
            if (!this.validatePacket(packet)) {
                console.error('Invalid packet data:', packet);
                continue;
            }
            this.packets.push(packet);
        }
    }

    validatePacket(packet) {
        return (
            typeof packet.symbol === 'string' &&
            packet.symbol.length === 4 &&
            ['B', 'S'].includes(packet.buySellIndicator) &&
            Number.isInteger(packet.quantity) &&
            Number.isInteger(packet.price) &&
            Number.isInteger(packet.sequence)
        );
    }

    identifyMissingSequences() {
        const sequences = this.packets.map(p => p.sequence).sort((a, b) => a - b);
        const maxSeqNum = sequences[sequences.length - 1];
        // Assuming sequence starts from 1
        for (let i = 1; i < maxSeqNum; i++) {
            if (!sequences.includes(i)) {
                this.missingSequences.add(i);
            }
        }
        console.log(`Identified ${this.missingSequences.size} missing sequences: {${Array.from(this.missingSequences)}}`);
    }

    async resendMissingPackets() {
        for await (const seq of this.missingSequences) {
            await this.resendPacket(seq);
        }
        this.saveToJson('exchange_data.json');
        this.cleanup();
    }

    async resendPacket(sequence) {
        const payload = Buffer.alloc(2);
        payload.writeInt8(2, 0); // callType: 2
        payload.writeUInt8(sequence, 1); // resendSequence > 0

        console.log(`Requesting resend for sequence: ${sequence}. payload: ${payload.toString('hex')}`);
        try {
            await new Promise((resolve, reject) => {
                this.client.write(payload, (err) => {
                    if (err) {
                        console.error('Error writing to socket:', err);
                        return reject(err);
                    }
                    resolve();
                });
            });

            const data = await new Promise((resolve) => {
                this.client.once('data', (data) => {
                    this.processPackets(data);
                    console.log(`Received and processed missing packet ${sequence}`);
                    resolve(data);
                });
            });
            return data;
        } catch (err) {
            console.error('Error during resend packet:', err);
            throw err;
        }
    }

    saveToJson(filename) {
        const sortedPackets = this.packets.sort((a, b) => a.sequence - b.sequence);
        fs.writeFileSync(filename, JSON.stringify(sortedPackets, null, 2));
        console.log(`Data saved to ${filename}`);
    }

    cleanup() {
        if (this.client) {
            this.client.removeAllListeners();
            this.client.destroy();
            this.client = null;
        }
        this.packets = [];
        this.missingSequences.clear();
        console.log("Connection closed");
        
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.client.connect(PORT, HOST, () => {
                console.log(`Connected to BetaCrew Exchange Server on ${this.host}:${this.port}`);
                resolve();
            });

            this.client.on('error', (error) => {
                console.error('Connection error:', error);
                this.cleanup();
                reject(error);
            });
        });
    }

    async run() {
        try {
            this.client = new net.Socket();
            await this.connect();
            this.client.setTimeout(this.socketTimeout);
            this.streamAllPackets();
        } catch (error) {
            console.error('Error during client execution:', error);
        }
    }
}

const client = new BetaCrewExchangeClient('localhost', 3000);
client.run();