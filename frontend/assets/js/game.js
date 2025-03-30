/**
 * Main Game class
 * Manages the overall game state, updates, and rendering
 */
class Game {
    constructor() {
        // Game configuration
        this.config = {
            fps: 60,
            physics: {
                gravity: -9.81,
                timeStep: 1/60,
                maxSubSteps: 3
            }
        };
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Game statistics
        this.stats = {
            distanceTraveled: 0,
            timePlayed: 0,
            maxSpeed: 0
        };
        
        // Player data
        this.player = null;
        this.playerData = null;
        
        // Core systems
        this.renderer = null;
        this.physics = null;
        this.world = null;
        this.multiplayer = null;
        this.ui = null;
        this.audio = null;
        
        // Input state
        this.keys = {};
        this.mouseState = {
            x: 0,
            y: 0,
            isDown: false
        };
        
        // Camera settings
        this.cameraMode = 'follow'; // 'follow', 'firstPerson', 'orbit'
        
        // Event callbacks
        this.onLoadProgress = null;
        this.onReady = null;
        this.onGameOver = null;
    }
    
    /**
     * Initialize the game systems
     */
    init() {
        // Initialize renderer
        this.renderer = new Renderer();
        this.renderer.init();
        
        // Initialize physics
        this.physics = new Physics(this.config.physics);
        
        // Initialize core systems
        this.world = new World(this);
        this.ui = new UI(this);
        this.audio = new Audio(this);
        
        // Set up input handlers
        this.setupInputHandlers();
        
        // Start the loading process
        this.loadAssets();
    }
    
    /**
     * Load game assets
     */
    loadAssets() {
        let totalAssets = 0;
        let loadedAssets = 0;
        
        // Update loading progress
        const updateProgress = (message) => {
            loadedAssets++;
            const progress = loadedAssets / totalAssets;
            
            if (this.onLoadProgress) {
                this.onLoadProgress(progress, message);
            }
            
            // Check if all assets are loaded
            if (loadedAssets >= totalAssets) {
                this.setupGame();
            }
        };
        
        // Define assets to load
        const assets = [
            { type: 'model', name: 'car', url: 'assets/models/car.glb' },
            { type: 'texture', name: 'grass', url: 'assets/textures/environment/grass.jpg' },
            { type: 'texture', name: 'road', url: 'assets/textures/environment/road.jpg' },
            { type: 'texture', name: 'sky', url: 'assets/textures/environment/sky.jpg' },
            { type: 'audio', name: 'engine', url: 'assets/audio/engine.mp3' },
            { type: 'audio', name: 'ambient', url: 'assets/audio/ambient.mp3' }
        ];
        
        totalAssets = assets.length;
        
        // Load each asset
        assets.forEach(asset => {
            // Different loading method depending on asset type
            switch (asset.type) {
                case 'model':
                    this.renderer.loadModel(asset.name, asset.url, () => {
                        updateProgress(`Loading model: ${asset.name}`);
                    });
                    break;
                    
                case 'texture':
                    this.renderer.loadTexture(asset.name, asset.url, () => {
                        updateProgress(`Loading texture: ${asset.name}`);
                    });
                    break;
                    
                case 'audio':
                    this.audio.loadSound(asset.name, asset.url, () => {
                        updateProgress(`Loading audio: ${asset.name}`);
                    });
                    break;
            }
        });
    }
    
    /**
     * Set up game after assets are loaded
     */
    setupGame() {
        // Initialize world
        this.world.init();
        
        // Initialize UI
        this.ui.init();
        
        // Initialize audio
        this.audio.init();
        
        // Notify that the game is ready
        if (this.onReady) {
            this.onReady();
        }
    }
    
    /**
     * Start the game with player data
     */
    start(playerData) {
        this.playerData = playerData;
        
        // Initialize multiplayer
        this.multiplayer = new Multiplayer(this, playerData);
        this.multiplayer.connect();
        
        // Start game loop
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        
        // Cap delta time to prevent large jumps
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;
        
        // Update game time
        this.gameTime += this.deltaTime;
        this.frameCount++;
        
        // Skip updates if game is paused
        if (!this.isPaused) {
            // Update game systems
            this.update();
            
            // Update statistics
            this.updateStats();
        }
        
        // Render the scene
        this.render();
        
        // Schedule next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update game state
     */
    update() {
        // Update physics
        this.physics.update(this.deltaTime);
        
        // Update player vehicle
        if (this.player) {
            this.player.update(this.deltaTime, this.keys);
            
            // Update camera based on player position
            this.updateCamera();
            
            // Send player position update to other players
            if (this.frameCount % 3 === 0) { // Only send updates every 3 frames to reduce network traffic
                this.multiplayer.sendPositionUpdate(
                    this.player.position,
                    this.player.rotation,
                    this.player.velocity
                );
            }
        }
        
        // Update world
        this.world.update(this.deltaTime);
        
        // Update other players
        this.multiplayer.update(this.deltaTime);
        
        // Update UI
        this.ui.update(this.deltaTime);
        
        // Update audio
        this.audio.update(this.deltaTime);
    }
    
    /**
     * Render the game
     */
    render() {
        this.renderer.render();
    }
    
    /**
     * Update game statistics
     */
    updateStats() {
        // Update play time
        this.stats.timePlayed += this.deltaTime;
        
        // Update distance traveled
        if (this.player) {
            const speed = this.player.getSpeed();
            
            // Distance traveled
            this.stats.distanceTraveled += speed * this.deltaTime;
            
            // Max speed
            if (speed > this.stats.maxSpeed) {
                this.stats.maxSpeed = speed;
            }
        }
    }
    
    /**
     * Update camera position and orientation based on player
     */
    updateCamera() {
        if (!this.player) return;
        
        const position = this.player.position;
        const rotation = this.player.rotation;
        
        switch (this.cameraMode) {
            case 'follow':
                // Third-person follow camera
                const distance = 7;
                const height = 3;
                
                // Calculate camera position behind the vehicle
                const angle = rotation.y;
                const cameraX = position.x - Math.sin(angle) * distance;
                const cameraY = position.y + height;
                const cameraZ = position.z - Math.cos(angle) * distance;
                
                this.renderer.setCamera(
                    { x: cameraX, y: cameraY, z: cameraZ },
                    position
                );
                break;
                
            case 'firstPerson':
                // First-person view from vehicle cockpit
                const fpOffset = { x: 0, y: 1.5, z: 0.5 };
                
                // Calculate position inside the vehicle
                const fpPos = {
                    x: position.x + Math.sin(rotation.y) * fpOffset.z + Math.sin(rotation.z) * fpOffset.x,
                    y: position.y + fpOffset.y,
                    z: position.z + Math.cos(rotation.y) * fpOffset.z + Math.cos(rotation.z) * fpOffset.x
                };
                
                // Calculate look-at position in front of the vehicle
                const lookAtDistance = 10;
                const lookAtPos = {
                    x: position.x + Math.sin(rotation.y) * lookAtDistance,
                    y: position.y + Math.sin(rotation.x) * lookAtDistance * 0.2,
                    z: position.z + Math.cos(rotation.y) * lookAtDistance
                };
                
                this.renderer.setCamera(fpPos, lookAtPos);
                break;
                
            case 'orbit':
                // Orbit camera that circles the vehicle
                const orbitDistance = 10;
                const orbitHeight = 5;
                const orbitSpeed = 0.1;
                
                // Calculate orbit angle based on time
                const orbitAngle = this.gameTime * orbitSpeed;
                
                const orbitX = position.x + Math.sin(orbitAngle) * orbitDistance;
                const orbitY = position.y + orbitHeight;
                const orbitZ = position.z + Math.cos(orbitAngle) * orbitDistance;
                
                this.renderer.setCamera(
                    { x: orbitX, y: orbitY, z: orbitZ },
                    position
                );
                break;
        }
    }
    
    /**
     * Set up input event handlers
     */
    setupInputHandlers() {
        // Keyboard input
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // Handle camera switching
            if (event.code === 'KeyC' && !event.repeat) {
                this.cycleCameraMode();
            }
            
            // Handle chat input
            if (event.code === 'Enter') {
                this.ui.toggleChatInput();
            }
            
            // Handle pause
            if (event.code === 'Escape') {
                this.togglePause();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // Mouse input
        document.addEventListener('mousedown', (event) => {
            this.mouseState.isDown = true;
        });
        
        document.addEventListener('mouseup', (event) => {
            this.mouseState.isDown = false;
        });
        
        document.addEventListener('mousemove', (event) => {
            this.mouseState.x = event.clientX;
            this.mouseState.y = event.clientY;
        });
        
        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isPaused = true;
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.renderer.handleResize();
        });
    }
    
    /**
     * Cycle through camera modes
     */
    cycleCameraMode() {
        const modes = ['follow', 'firstPerson', 'orbit'];
        const currentIndex = modes.indexOf(this.cameraMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.cameraMode = modes[nextIndex];
    }
    
    /**
     * Toggle game pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        this.ui.showPauseMenu(this.isPaused);
    }
    
    /**
     * Add player vehicle to the game
     */
    addPlayerVehicle(vehicleData) {
        // Create the player's vehicle
        this.player = new Vehicle(this, {
            id: this.playerData.playerId,
            isPlayer: true,
            type: this.playerData.vehicleType,
            position: vehicleData.position,
            rotation: vehicleData.rotation
        });
        
        // Add vehicle to physics world
        this.physics.addVehicle(this.player);
        
        // Add vehicle to scene
        this.renderer.addVehicle(this.player);
    }
    
    /**
     * Add other player's vehicle to the game
     */
    addOtherVehicle(playerData) {
        // Create the other player's vehicle
        const vehicle = new Vehicle(this, {
            id: playerData.playerId,
            isPlayer: false,
            type: playerData.vehicleType,
            position: playerData.position,
            rotation: playerData.rotation
        });
        
        // Add vehicle to renderer (but not to physics as we'll just update positions based on network)
        this.renderer.addVehicle(vehicle);
        
        // Store reference in multiplayer system
        this.multiplayer.addVehicle(playerData.playerId, vehicle);
    }
    
    /**
     * End the game
     */
    endGame() {
        this.isRunning = false;
        
        // Clean up resources
        this.world.dispose();
        this.physics.dispose();
        
        // Disconnect from multiplayer
        if (this.multiplayer) {
            this.multiplayer.disconnect();
        }
        
        // Call game over callback with final stats
        if (this.onGameOver) {
            this.onGameOver(this.stats);
        }
    }
}