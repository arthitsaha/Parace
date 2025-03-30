/**
 * UI class
 * Handles user interface elements and HUD
 */
class UI {
    constructor(game) {
        // Game reference
        this.game = game;
        
        // UI elements
        this.elements = {
            speedometer: document.getElementById('speedometer'),
            speedValue: document.getElementById('speed-value'),
            miniMap: document.getElementById('mini-map'),
            playerIndicator: document.getElementById('player-indicator'),
            playerList: document.getElementById('players'),
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            chatContainer: document.getElementById('chat-container')
        };
        
        // Mini map context
        this.miniMapContext = null;
        
        // Chat state
        this.isChatFocused = false;
        
        // Notification system
        this.notifications = [];
        this.notificationElement = null;
        
        // Audio toggle state
        this.isAudioMuted = false;
    }
    
    /**
     * Initialize UI
     */
    init() {
        // Initialize mini map
        this.initMiniMap();
        
        // Initialize chat
        this.initChat();
        
        // Create notification element
        this.createNotificationElement();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Initialize mini map
     */
    initMiniMap() {
        // Get canvas and context
        const canvas = this.elements.miniMap;
        this.miniMapContext = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 200;
        canvas.height = 200;
    }
    
    /**
     * Initialize chat
     */
    initChat() {
        // Set up chat input handler
        this.elements.chatInput.addEventListener('keydown', (event) => {
            // Send message on Enter key
            if (event.key === 'Enter') {
                const message = this.elements.chatInput.value.trim();
                
                if (message) {
                    // Send the message
                    this.game.multiplayer.sendChatMessage(message);
                    
                    // Add to local chat
                    this.addChatMessage(this.game.playerData.playerName, message, true);
                    
                    // Clear input
                    this.elements.chatInput.value = '';
                }
                
                // Blur input and return focus to game
                this.elements.chatInput.blur();
                this.isChatFocused = false;
                
                // Prevent default Enter behavior
                event.preventDefault();
            }
            
            // Close chat on Escape
            if (event.key === 'Escape') {
                this.elements.chatInput.blur();
                this.isChatFocused = false;
                event.preventDefault();
            }
            
            // Stop propagation to prevent game controls while typing
            event.stopPropagation();
        });
        
        // Focus/blur handlers
        this.elements.chatInput.addEventListener('focus', () => {
            this.isChatFocused = true;
        });
        
        this.elements.chatInput.addEventListener('blur', () => {
            this.isChatFocused = false;
        });
    }
    
    /**
     * Create notification element
     */
    createNotificationElement() {
        // Create a container for notifications
        this.notificationElement = document.createElement('div');
        this.notificationElement.className = 'notifications-container';
        this.notificationElement.style.position = 'absolute';
        this.notificationElement.style.top = '20px';
        this.notificationElement.style.left = '50%';
        this.notificationElement.style.transform = 'translateX(-50%)';
        this.notificationElement.style.zIndex = '100';
        
        // Add to document
        document.body.appendChild(this.notificationElement);
    }
    
    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // Audio mute toggle
        document.addEventListener('keydown', (event) => {
            if (event.key === 'M') {
                this.toggleAudio();
            }
        });
    }
    
    /**
     * Update UI elements
     */
    update(deltaTime) {
        // Only update if player vehicle exists
        if (this.game.player) {
            // Update speedometer
            this.updateSpeedometer();
            
            // Update mini map
            this.updateMiniMap();
        }
        
        // Update notifications
        this.updateNotifications(deltaTime);
    }
    
    /**
     * Update speedometer
     */
    updateSpeedometer() {
        // Get speed from player vehicle
        const speed = Math.round(this.game.player.getSpeed());
        
        // Update speed value
        this.elements.speedValue.textContent = speed;
    }
    
    /**
     * Update mini map
     */
    updateMiniMap() {
        // Get player position
        const playerPos = this.game.player.position;
        
        // Clear mini map
        this.miniMapContext.fillStyle = '#222';
        this.miniMapContext.fillRect(0, 0, 200, 200);
        
        // Draw roads
        this.drawRoadsOnMiniMap();
        
        // Draw other players
        this.drawPlayersOnMiniMap();
        
        // Update player indicator position
        // Convert world coordinates to mini map coordinates
        const mapSize = 1000; // Map covers 1000x1000 world units
        const mapScale = 200 / mapSize; // Scale factor to map world to pixels
        
        const mapX = 100 + playerPos.x * mapScale;
        const mapY = 100 + playerPos.z * mapScale;
        
        // Update player indicator
        this.elements.playerIndicator.style.left = `${mapX}px`;
        this.elements.playerIndicator.style.top = `${mapY}px`;
        
        // Rotate indicator to match player rotation
        const rotation = this.game.player.rotation.y * (180 / Math.PI);
        this.elements.playerIndicator.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    }
    
    /**
     * Draw roads on mini map
     */
    drawRoadsOnMiniMap() {
        // Get player position
        const playerPos = this.game.player.position;
        
        // Mini map settings
        const mapSize = 1000;
        const mapScale = 200 / mapSize;
        const centerX = 100;
        const centerY = 100;
        
        // Draw a simple grid of roads
        this.miniMapContext.strokeStyle = '#888';
        this.miniMapContext.lineWidth = 1;
        
        // Road spacing in world units
        const roadSpacing = 500;
        
        // Calculate the bounds of the visible map area in world coordinates
        const minX = playerPos.x - mapSize / 2;
        const maxX = playerPos.x + mapSize / 2;
        const minZ = playerPos.z - mapSize / 2;
        const maxZ = playerPos.z + mapSize / 2;
        
        // Calculate the first visible horizontal and vertical grid lines
        const startX = Math.floor(minX / roadSpacing) * roadSpacing;
        const startZ = Math.floor(minZ / roadSpacing) * roadSpacing;
        
        // Draw horizontal roads
        for (let z = startZ; z <= maxZ; z += roadSpacing) {
            // Convert world coordinates to mini map coordinates
            const mapY = centerY + (z - playerPos.z) * mapScale;
            
            this.miniMapContext.beginPath();
            this.miniMapContext.moveTo(0, mapY);
            this.miniMapContext.lineTo(200, mapY);
            this.miniMapContext.stroke();
        }
        
        // Draw vertical roads
        for (let x = startX; x <= maxX; x += roadSpacing) {
            // Convert world coordinates to mini map coordinates
            const mapX = centerX + (x - playerPos.x) * mapScale;
            
            this.miniMapContext.beginPath();
            this.miniMapContext.moveTo(mapX, 0);
            this.miniMapContext.lineTo(mapX, 200);
            this.miniMapContext.stroke();
        }
    }
    
    /**
     * Draw players on mini map
     */
    drawPlayersOnMiniMap() {
        // Get player position
        const playerPos = this.game.player.position;
        
        // Mini map settings
        const mapSize = 1000;
        const mapScale = 200 / mapSize;
        const centerX = 100;
        const centerY = 100;
        
        // Draw other players
        if (this.game.multiplayer && this.game.multiplayer.vehicles) {
            this.miniMapContext.fillStyle = '#3498db';
            
            for (const id in this.game.multiplayer.vehicles) {
                const vehicle = this.game.multiplayer.vehicles[id];
                
                // Calculate position on mini map
                const mapX = centerX + (vehicle.position.x - playerPos.x) * mapScale;
                const mapY = centerY + (vehicle.position.z - playerPos.z) * mapScale;
                
                // Draw player dot
                if (mapX >= 0 && mapX <= 200 && mapY >= 0 && mapY <= 200) {
                    this.miniMapContext.beginPath();
                    this.miniMapContext.arc(mapX, mapY, 3, 0, Math.PI * 2);
                    this.miniMapContext.fill();
                }
            }
        }
    }
    
    /**
     * Update player list
     */
    updatePlayerList() {
        // Clear existing list
        this.elements.playerList.innerHTML = '';
        
        // Add local player
        const playerItem = document.createElement('li');
        playerItem.innerHTML = `
            <span class="player-color" style="background-color: #FF5500;"></span>
            ${this.game.playerData.playerName} (You)
        `;
        this.elements.playerList.appendChild(playerItem);
        
        // Add other players
        if (this.game.multiplayer && this.game.multiplayer.vehicles) {
            for (const id in this.game.multiplayer.vehicles) {
                const vehicle = this.game.multiplayer.vehicles[id];
                
                const otherItem = document.createElement('li');
                otherItem.innerHTML = `
                    <span class="player-color" style="background-color: #3498db;"></span>
                    ${vehicle.name || 'Unknown Player'}
                `;
                this.elements.playerList.appendChild(otherItem);
            }
        }
    }
    
    /**
     * Toggle chat input
     */
    toggleChatInput() {
        if (this.isChatFocused) {
            this.elements.chatInput.blur();
            this.isChatFocused = false;
        } else {
            this.elements.chatInput.focus();
            this.isChatFocused = true;
        }
    }
    
    /**
     * Add message to chat
     */
    addChatMessage(sender, message, isLocal = false) {
        // Create a new message element
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        // Limit message length
        let displayMessage = message;
        if (displayMessage.length > 100) {
            displayMessage = displayMessage.substring(0, 97) + '...';
        }
        
        // Set message content
        messageElement.innerHTML = `
            <span class="chat-sender" style="color: ${isLocal ? '#FF5500' : '#3498db'}">
                ${sender}:
            </span>
            ${displayMessage}
        `;
        
        // Add to chat container
        this.elements.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    /**
     * Show a notification message
     */
    showMessage(message, type = 'info') {
        // Create notification object
        const notification = {
            message: message,
            type: type,
            time: 5, // Display time in seconds
            element: null
        };
        
        // Create DOM element
        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.textContent = message;
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        element.style.transition = 'opacity 0.3s, transform 0.3s';
        
        // Store reference to element
        notification.element = element;
        
        // Add to notifications list
        this.notifications.push(notification);
        
        // Add to container
        this.notificationElement.appendChild(element);
        
        // Trigger animation
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    }
    
    /**
     * Update notifications
     */
    updateNotifications(deltaTime) {
        // Update times and remove expired notifications
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            
            // Reduce time
            notification.time -= deltaTime;
            
            // Remove if expired
            if (notification.time <= 0) {
                // Animate out
                notification.element.style.opacity = '0';
                notification.element.style.transform = 'translateY(-20px)';
                
                // Remove after animation
                setTimeout(() => {
                    if (notification.element.parentNode === this.notificationElement) {
                        this.notificationElement.removeChild(notification.element);
                    }
                }, 300);
                
                // Remove from array
                this.notifications.splice(i, 1);
            }
        }
    }
    
    /**
     * Toggle audio mute
     */
    toggleAudio() {
        this.isAudioMuted = !this.isAudioMuted;
        
        // Update audio state
        if (this.game.audio) {
            this.game.audio.setMuted(this.isAudioMuted);
        }
        
        // Show notification
        this.showMessage(
            this.isAudioMuted ? 'Audio muted (Press M to unmute)' : 'Audio unmuted',
            'info'
        );
    }
    
    /**
     * Show pause menu
     */
    showPauseMenu(isPaused) {
        if (isPaused) {
            // Create pause menu if it doesn't exist
            if (!this.pauseMenu) {
                this.createPauseMenu();
            }
            
            // Show menu
            this.pauseMenu.style.display = 'flex';
        } else if (this.pauseMenu) {
            // Hide menu
            this.pauseMenu.style.display = 'none';
        }
    }
    
    /**
     * Create pause menu
     */
    createPauseMenu() {
        // Create menu container
        this.pauseMenu = document.createElement('div');
        this.pauseMenu.className = 'pause-menu';
        this.pauseMenu.style.position = 'absolute';
        this.pauseMenu.style.top = '0';
        this.pauseMenu.style.left = '0';
        this.pauseMenu.style.width = '100%';
        this.pauseMenu.style.height = '100%';
        this.pauseMenu.style.display = 'flex';
        this.pauseMenu.style.justifyContent = 'center';
        this.pauseMenu.style.alignItems = 'center';
        this.pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.pauseMenu.style.zIndex = '100';
        
        // Create menu content
        const menuContent = document.createElement('div');
        menuContent.className = 'pause-menu-content';
        menuContent.style.backgroundColor = '#222';
        menuContent.style.padding = '30px';
        menuContent.style.borderRadius = '10px';
        menuContent.style.textAlign = 'center';
        menuContent.style.color = 'white';
        
        // Menu title
        const menuTitle = document.createElement('h2');
        menuTitle.textContent = 'Paused';
        menuTitle.style.marginBottom = '20px';
        menuTitle.style.color = '#ff6b00';
        
        // Resume button
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume Game';
        resumeButton.style.padding = '10px 20px';
        resumeButton.style.backgroundColor = '#ff6b00';
        resumeButton.style.border = 'none';
        resumeButton.style.borderRadius = '5px';
        resumeButton.style.color = 'white';
        resumeButton.style.fontSize = '16px';
        resumeButton.style.margin = '10px';
        resumeButton.style.cursor = 'pointer';
        
        resumeButton.addEventListener('click', () => {
            this.game.togglePause();
        });
        
        // Controls info
        const controlsInfo = document.createElement('div');
        controlsInfo.style.marginTop = '20px';
        controlsInfo.style.textAlign = 'left';
        controlsInfo.style.fontSize = '14px';
        controlsInfo.innerHTML = `
            <h3>Controls:</h3>
            <p>W / ↑ - Accelerate</p>
            <p>S / ↓ - Brake/Reverse</p>
            <p>A / ← - Steer Left</p>
            <p>D / → - Steer Right</p>
            <p>Space - Handbrake</p>
            <p>C - Change Camera</p>
            <p>Enter - Chat</p>
            <p>M - Toggle Sound</p>
            <p>Esc - Pause/Resume</p>
        `;
        
        // Network info if multiplayer is active
        let networkInfo = null;
        if (this.game.multiplayer) {
            const stats = this.game.multiplayer.getNetworkStats();
            
            networkInfo = document.createElement('div');
            networkInfo.style.marginTop = '20px';
            networkInfo.style.fontSize = '14px';
            networkInfo.innerHTML = `
                <h3>Network:</h3>
                <p>Ping: ${stats.ping}ms</p>
                <p>Packets Sent: ${stats.packetsSent}</p>
                <p>Packets Received: ${stats.packetsReceived}</p>
            `;
        }
        
        // Assemble menu
        menuContent.appendChild(menuTitle);
        menuContent.appendChild(resumeButton);
        menuContent.appendChild(controlsInfo);
        if (networkInfo) menuContent.appendChild(networkInfo);
        
        this.pauseMenu.appendChild(menuContent);
        document.body.appendChild(this.pauseMenu);
    }
    
    /**
     * Clean up UI resources
     */
    dispose() {
        // Remove notification element
        if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
        }
        
        // Remove pause menu
        if (this.pauseMenu && this.pauseMenu.parentNode) {
            this.pauseMenu.parentNode.removeChild(this.pauseMenu);
        }
    }
}