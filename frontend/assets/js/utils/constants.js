/**
 * Game constants
 * Defines global constants for the game
 */

// Physics constants
const PHYSICS = {
    GRAVITY: -9.81,              // Gravity in m/s²
    TIME_STEP: 1/60,             // Physics timestep in seconds
    MAX_SUB_STEPS: 3,            // Maximum physics sub-steps per frame
    VEHICLE_MASS: 1000,          // Default vehicle mass in kg
    WHEEL_FRICTION: 0.8,         // Wheel friction coefficient
    TERRAIN_FRICTION: 0.5,       // Terrain friction coefficient
    ROAD_FRICTION: 1.0,          // Road friction coefficient
    DRAG_COEFFICIENT: 0.3,       // Aerodynamic drag coefficient
    ROLLING_RESISTANCE: 0.01,    // Rolling resistance coefficient
};

// Vehicle types and properties
const VEHICLE_TYPES = {
    DEFAULT: {
        maxSpeed: 40,             // Maximum speed in units/second
        acceleration: 10,         // Acceleration in units/second²
        handling: 0.5,            // Handling factor (0-1)
        braking: 0.7,             // Braking factor (0-1)
        mass: 1000,               // Mass in kg
        color: '#FF5500'          // Vehicle color
    },
    SPORTS: {
        maxSpeed: 60,
        acceleration: 15,
        handling: 0.8,
        braking: 0.9,
        mass: 1200,
        color: '#0055FF'
    },
    TRUCK: {
        maxSpeed: 30,
        acceleration: 5,
        handling: 0.3,
        braking: 0.5,
        mass: 2500,
        color: '#005500'
    }
};

// World generation constants
const WORLD = {
    CHUNK_SIZE: 500,             // Size of a terrain chunk in units
    VIEW_DISTANCE: 1500,         // View distance in units
    LOADING_RADIUS: 3,           // Number of chunks to load around player
    UNLOAD_DISTANCE: 5,          // Distance in chunks for unloading
    ROAD_WIDTH: 15,              // Width of roads in units
    ROAD_SPACING: 500,           // Spacing between roads in units
    TERRAIN_SCALE: 0.02,         // Scale of terrain noise
    TERRAIN_HEIGHT: 100,         // Maximum terrain height
    SEED: Math.floor(Math.random() * 1000000) // Default world seed
};

// Network constants
const NETWORK = {
    SYNC_INTERVAL: 50,           // Milliseconds between position updates
    INTERPOLATION_DELAY: 100,    // Interpolation buffer delay in ms
    RETRY_INTERVAL: 5000,        // Reconnection retry interval in ms
    MAX_RETRIES: 3               // Maximum reconnection attempts
};

// Camera constants
const CAMERA = {
    FOLLOW_DISTANCE: 7,          // Distance behind vehicle in third-person view
    FOLLOW_HEIGHT: 3,            // Height above vehicle in third-person view
    FOV: 75,                     // Field of view for camera
    NEAR_CLIP: 0.1,              // Near clipping plane
    FAR_CLIP: 2000               // Far clipping plane
};

// Audio constants
const AUDIO = {
    MASTER_VOLUME: 0.7,          // Master volume (0-1)
    SFX_VOLUME: 0.8,             // Sound effects volume (0-1)
    MUSIC_VOLUME: 0.5,           // Music volume (0-1)
    ENGINE_VOLUME: 0.4,          // Engine sound volume (0-1)
    MIN_RPM: 800,                // Minimum engine RPM
    MAX_RPM: 6000                // Maximum engine RPM
};

// UI constants
const UI = {
    SPEEDOMETER_UPDATE_INTERVAL: 100,  // Speedometer update interval in ms
    MINIMAP_SIZE: 200,                // Size of minimap in pixels
    MINIMAP_SCALE: 0.2,               // Scale of world to minimap
    CHAT_MESSAGE_LIMIT: 50,           // Maximum number of chat messages to display
    NOTIFICATION_DURATION: 5          // Default notification duration in seconds
};

// Input key mappings
const INPUT = {
    ACCELERATE: ['KeyW', 'ArrowUp'],
    BRAKE: ['KeyS', 'ArrowDown'],
    STEER_LEFT: ['KeyA', 'ArrowLeft'],
    STEER_RIGHT: ['KeyD', 'ArrowRight'],
    HANDBRAKE: ['Space'],
    CAMERA_TOGGLE: ['KeyC'],
    CHAT_TOGGLE: ['Enter'],
    PAUSE_TOGGLE: ['Escape'],
    SOUND_TOGGLE: ['KeyM'],
    RESET_VEHICLE: ['KeyR']
};

// Game state constants
const GAME_STATE = {
    LOADING: 'loading',
    VEHICLE_SELECT: 'vehicleSelect',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};