/**
 * Multiplayer class
 * Handles multiplayer communication and synchronization
 */
class Multiplayer {
    constructor(game, playerData) {
        // Game reference
        this.game = game;
        
        // Player data
        this.playerData = playerData;
        
        // WebSocket connection
        this.socket = null;
        
        // Other players' vehicles
        this.vehicles = {};
        
        // Network statistics
        this.stats = {
            ping: 0,
            lastPingSent: 0,
            packetsReceived: 0,
            packetsSent: 0
        };
        
        // Message queue for offline mode
        this.messageQueue = [];
        
        // Synchronization
        this.syncInterval = 50;  // ms between sync updates
        this.lastSyncTime = 0;
        
        // State interpolation
        this.interpolationBuffer = {};
        this.interpolationDelay = 100; // ms
        
        // Server reconciliation
        this.inputs = [];
        this.lastProcessedInput = 0;
    }
    
    /**
     * Connect to the server
     */
    connect() {
        // Create a WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws`;
        
        console.log(`Connecting to WebSocket server at ${wsUrl}`);
        
        this.socket = new WebSocket(wsUrl);
        
        // Set up event handlers
        this.socket.onopen = this.onConnect.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onclose = this.onDisconnect.bind(this);
        this.socket.onerror = this.onError.bind(this);
    }
    
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    
    /**
     * Update multiplayer state
     */
    update(deltaTime) {
        // Update interpolation
        this.updateInterpolation(deltaTime);
        
        // Send periodic ping to measure latency
        const now = performance.now();
        if (now - this.stats.lastPingSent > 2000) {
            this.sendPing();
            this.stats.lastPingSent = now;
        }
    }
    
    /**
     * Handle connection to server
     */
    onConnect(event) {
        console.log('Connected to server');
        
        // Send player initialization data
        this.sendMessage({
            type: 'init',
            playerId: this.playerData.playerId,
            playerName: this.playerData.playerName,
            vehicleType: this.playerData.vehicleType
        });
        
        // Send any queued messages
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }
    
    /**
     * Handle disconnection from server
     */
    onDisconnect(event) {
        console.log('Disconnected from server', event.code, event.reason);
        
        // Inform the user of the disconnection
        this.game.ui.showMessage('Disconnected from server', 'error');
        
        // Clean up other players' vehicles
        for (const id in this.vehicles) {
            this.removeVehicle(id);
        }
        
        // Try to reconnect after a delay
        setTimeout(() => {
            if (this.game.isRunning) {
                this.connect();
            }
        }, 5000);
    }
    
    /**
     * Handle WebSocket error
     */
    onError(error) {
        console.error('WebSocket error:', error);
        
        // Inform the user of the error
        this.game.ui.showMessage('Connection error', 'error');
    }
    
    /**
     * Handle incoming messages from server
     */
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.stats.packetsReceived++;
            
            // Process message based on type
            switch (message.type) {
                case 'init':
                    this.handleInitMessage(message);
                    break;
                    
                case 'playerJoined':
                    this.handlePlayerJoinedMessage(message);
                    break;
                    
                case 'playerLeft':
                    this.handlePlayerLeftMessage(message);
                    break;
                    
                case 'playerPosition':
                    this.handlePlayerPositionMessage(message);
                    break;
                    
                case 'chat':
                    this.handleChatMessage(message);
                    break;
                    
                case 'pong':
                    this.handlePongMessage(message);
                    break;
                    
                case 'inputAck':
                    this.handleInputAckMessage(message);
                    break;
                    
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
    
    /**
     * Handle initial state message from server
     */
    handleInitMessage(message) {
        console.log('Received init message from server');
        
        // Set the world seed
        this.game.world.setSeed(message.worldSeed);
        
        // Add player vehicle
        this.game.addPlayerVehicle({
            position: message.gameState.players[this.playerData.playerId].position,
            rotation: message.gameState.players[this.playerData.playerId].rotation
        });
        
        // Add other players' vehicles
        for (const playerId in message.gameState.players) {
            if (playerId !== this.playerData.playerId) {
                const playerData = message.gameState.players[playerId];
                this.game.addOtherVehicle(playerData);
            }
        }
        
        // Inform the user
        this.game.ui.showMessage('Connected to server', 'success');
    }
    
    /**
     * Handle player joined message
     */
    handlePlayerJoinedMessage(message) {
        console.log(`Player joined: ${message.playerName} (${message.playerId})`);
        
        // Only add if it's not the local player
        if (message.playerId !== this.playerData.playerId) {
            // Add the player to the game
            this.game.addOtherVehicle({
                playerId: message.playerId,
                playerName: message.playerName,
                vehicleType: message.vehicleType,
                position: message.position,
                rotation: message.rotation
            });
            
            // Inform the user
            this.game.ui.showMessage(`${message.playerName} joined the game`, 'info');
            
            // Update player list
            this.game.ui.updatePlayerList();
        }
    }
    
    /**
     * Handle player left message
     */
    handlePlayerLeftMessage(message) {
        console.log(`Player left: ${message.playerId}`);
        
        // Find the player name
        let playerName = 'A player';
        if (this.vehicles[message.playerId]) {
            playerName = this.vehicles[message.playerId].name || 'A player';
        }
        
        // Remove the player from the game
        this.removeVehicle(message.playerId);
        
        // Inform the user
        this.game.ui.showMessage(`${playerName} left the game`, 'info');
        
        // Update player list
        this.game.ui.updatePlayerList();
    }
    
    /**
     * Handle player position update
     */
    handlePlayerPositionMessage(message) {
        // Only process if it's not the local player
        if (message.playerId !== this.playerData.playerId) {
            // Get current time
            const now = performance.now();
            
            // Add to interpolation buffer
            if (!this.interpolationBuffer[message.playerId]) {
                this.interpolationBuffer[message.playerId] = [];
            }
            
            // Add the position update with timestamp
            this.interpolationBuffer[message.playerId].push({
                time: now,
                position: message.position,
                rotation: message.rotation,
                velocity: message.velocity
            });
            
            // Keep buffer size reasonable (max 1 second of updates)
            while (this.interpolationBuffer[message.playerId].length > 0 &&
                   now - this.interpolationBuffer[message.playerId][0].time > 1000) {
                this.interpolationBuffer[message.playerId].shift();
            }
        }
    }
    
    /**
     * Handle chat message
     */
    handleChatMessage(message) {
        // Add message to chat
        this.game.ui.addChatMessage(message.playerName, message.message);
    }
    
    /**
     * Handle pong response for latency measurement
     */
    handlePongMessage(message) {
        const now = performance.now();
        const pingTime = now - message.timestamp;
        
        // Update ping statistic with smoothing
        this.stats.ping = this.stats.ping * 0.8 + pingTime * 0.2;
    }
    
    /**
     * Handle input acknowledgement for client-side prediction
     */
    handleInputAckMessage(message) {
        // Process server position correction
        // This would be implemented for client-side prediction
        
        // Find the last acknowledged input
        const lastProcessedIndex = this.inputs.findIndex(input => input.id === message.inputId);
        
        if (lastProcessedIndex !== -1) {
            // Remove all older inputs that have been processed
            this.inputs.splice(0, lastProcessedIndex + 1);
            
            // Update the last processed input
            this.lastProcessedInput = message.inputId;
            
            // Apply correction if needed (for client-side prediction)
            if (message.correction) {
                // Apply the correction to the player's position
                // In a real implementation, you'd blend this correction smoothly
            }
        }
    }
    
    /**
     * Send a message to the server
     */
    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            this.stats.packetsSent++;
        } else {
            // Queue the message to send when connection is established
            this.messageQueue.push(message);
        }
    }
    
    /**
     * Send player position update to server
     */
    sendPositionUpdate(position, rotation, velocity) {
        const now = performance.now();
        
        // Only send updates at a limited rate to save bandwidth
        if (now - this.lastSyncTime < this.syncInterval) {
            return;
        }
        
        this.lastSyncTime = now;
        
        this.sendMessage({
            type: 'position',
            position: position,
            rotation: rotation,
            velocity: velocity
        });
    }
    
    /**
     * Send chat message to server
     */
    sendChatMessage(message) {
        this.sendMessage({
            type: 'chat',
            message: message
        });
    }
    
    /**
     * Send ping to measure latency
     */
    sendPing() {
        this.sendMessage({
            type: 'ping',
            timestamp: performance.now()
        });
    }
    
    /**
     * Add other player's vehicle
     */
    addVehicle(playerId, vehicle) {
        this.vehicles[playerId] = vehicle;
    }
    
    /**
     * Remove player's vehicle
     */
    removeVehicle(playerId) {
        if (this.vehicles[playerId]) {
            // Remove from renderer
            this.game.renderer.removeVehicle(playerId);
            
            // Remove from our list
            delete this.vehicles[playerId];
            
            // Clear interpolation buffer
            delete this.interpolationBuffer[playerId];
        }
    }
    
    /**
     * Update vehicle interpolation
     */
    updateInterpolation(deltaTime) {
        const now = performance.now();
        
        // Process each player's interpolation buffer
        for (const playerId in this.interpolationBuffer) {
            const buffer = this.interpolationBuffer[playerId];
            
            // Need at least 2 points to interpolate
            if (buffer.length < 2) continue;
            
            // Calculate render time (slightly behind real time to allow for network jitter)
            const renderTime = now - this.interpolationDelay;
            
            // Find the buffer points that surround the render time
            let previousState = null;
            let nextState = null;
            
            for (let i = 0; i < buffer.length; i++) {
                if (buffer[i].time >= renderTime) {
                    nextState = buffer[i];
                    if (i > 0) {
                        previousState = buffer[i - 1];
                    }
                    break;
                }
            }
            
            // If we couldn't find the right buffer points, use the latest available
            if (!previousState && buffer.length >= 2) {
                previousState = buffer[buffer.length - 2];
                nextState = buffer[buffer.length - 1];
            }
            
            // Perform interpolation
            if (previousState && nextState) {
                // Calculate interpolation factor
                const timeDiff = nextState.time - previousState.time;
                const factor = timeDiff > 0 ? (renderTime - previousState.time) / timeDiff : 0;
                
                // Clamp factor to [0, 1]
                const t = Math.max(0, Math.min(1, factor));
                
                // Interpolate position
                const position = {
                    x: previousState.position.x + (nextState.position.x - previousState.position.x) * t,
                    y: previousState.position.y + (nextState.position.y - previousState.position.y) * t,
                    z: previousState.position.z + (nextState.position.z - previousState.position.z) * t
                };
                
                // Interpolate rotation (simple linear interpolation - in a real implementation, you'd use quaternions)
                const rotation = {
                    x: previousState.rotation.x + (nextState.rotation.x - previousState.rotation.x) * t,
                    y: previousState.rotation.y + (nextState.rotation.y - previousState.rotation.y) * t,
                    z: previousState.rotation.z + (nextState.rotation.z - previousState.rotation.z) * t
                };
                
                // Get vehicle
                const vehicle = this.vehicles[playerId];
                
                if (vehicle) {
                    // Update vehicle position and rotation
                    vehicle.position = position;
                    vehicle.rotation = rotation;
                    vehicle.velocity = nextState.velocity; // Just use the latest velocity
                    
                    // Update the visual representation
                    this.game.renderer.updateVehicle(
                        playerId,
                        position,
                        rotation,
                        nextState.velocity
                    );
                }
            }
        }
    }
    
    /**
     * Get network statistics
     */
    getNetworkStats() {
        return {
            ping: Math.round(this.stats.ping),
            packetsSent: this.stats.packetsSent,
            packetsReceived: this.stats.packetsReceived
        };
    }
}