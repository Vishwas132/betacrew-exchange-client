# BetaCrew Exchange Client

## Overview
The BetaCrew Exchange Client is a Node.js application that connects to a BetaCrew Exchange server to stream and process trading packets. It handles missing packets by requesting them from the server and saves the received data to a JSON file.

## Features
- Connects to a specified host and port.
- Streams all packets from the server.
- Identifies and requests missing packets.
- Saves received packets to a JSON file.
- Handles connection errors and cleanup.

## Requirements
- Node.js (version 16.17.0 or higher)
- npm (Node package manager)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/BetaCrewExchangeClient.git
   cd BetaCrewExchangeClient
   ```

## Usage
1. Update the HOST/PORT constants in `main.js`, if the BetaCrew server is running on a different host/port.

2. Run the client:
   ```bash
   node main.js
   ```

3. The client will connect to the BetaCrew Exchange server, stream packets, and save the data to `exchange_data.json`.

## Configuration
- **host**: The hostname or IP address of the BetaCrew Exchange server.
- **port**: The port number to connect to the server.
- **socketTimeout**: The timeout duration for the socket connection (default is 30 seconds).

## Error Handling
The client includes error handling for connection issues and invalid packet data. Any errors encountered will be logged to the console.

## Acknowledgments
- Thanks to the Betacrew for the opportunity.

