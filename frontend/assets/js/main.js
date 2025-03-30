/**
 * Entry point for the racing game application
 * Handles initialization and game state
 */

// Set up global game instance
let game = null;

// Loading manager
let loadingManager = null;

// DOM Elements
const vehicleSelection = document.getElementById('vehicle-selection');
const vehicleCards = document.querySelectorAll('.vehicle-card');
const playerNameInput = document.getElementById('player-name');
const startGameButton = document.getElementById('start-game');
const gameOverScreen = document.getElementById('game-over');
const restartGameButton = document.getElementById('restart-game');

// Game state variables
let selectedVehicle = 'default';
let playerName = '';
let playerId = generateUUID();

/**
 * Initialize the application
 */
function init() {
    // Initialize the loading manager
    loadingManager = new LoadingManager();
    
    // Set up event listeners
    setupEventListeners();
    
    // If player has previously played, try to load their name and vehicle
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        playerNameInput.value = savedName;
    }
    
    const savedVehicle = localStorage.getItem('selectedVehicle');
    if (savedVehicle) {
        selectVehicle(savedVehicle);
    } else {
        selectVehicle('default');
    }
    
    // Start loading resources immediately in the background
    // This way resources are already loading while the player is on the vehicle selection screen
    startPreloading();
}

/**
 * Start preloading resources while on the vehicle selection screen
 */
function startPreloading() {
    // Set completion callback
    loadingManager.setCompletionCallback(() => {
        console.log('Preloading complete!');
    });
    
    // Start loading process
    loadingManager.startLoading();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Vehicle selection events
    vehicleCards.forEach(card => {
        card.addEventListener('click', () => {
            const vehicle = card.dataset.vehicle;
            selectVehicle(vehicle);
        });
    });
    
    // Start game button
    startGameButton.addEventListener('click', () => {
        playerName = playerNameInput.value.trim();
        if (playerName === '') {
            // Generate a default name if none provided
            playerName = 'Driver_' + Math.floor(Math.random() * 1000);
            playerNameInput.value = playerName;
        }
        
        // Save preferences
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('selectedVehicle', selectedVehicle);
        
        // Hide vehicle selection and show loading screen
        vehicleSelection.style.display = 'none';
        
        // Check if resources are already loaded
        if (loadingManager.loadedAssets >= loadingManager.totalAssets) {
            // Resources already loaded, start game immediately
            startGame();
        } else {
            // Set up callback to start game when loading completes
            loadingManager.setCompletionCallback(() => {
                startGame();
            });
        }
    });
    
    // Restart game button
    restartGameButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        vehicleSelection.style.display = 'flex';
    });
    
    // Prevent context menu for right click
    document.addEventListener('contextmenu', event => event.preventDefault());
}

/**
 * Highlight the selected vehicle
 */
function selectVehicle(vehicle) {
    selectedVehicle = vehicle;
    
    // Remove selected class from all cards
    vehicleCards.forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to the chosen vehicle
    const selectedCard = document.querySelector(`.vehicle-card[data-vehicle="${vehicle}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
}

/**
 * Start the game after assets are loaded
 */
function startGame() {
    // Create new game instance
    game = new Game();
    
    // When game is fully loaded and ready
    game.onReady = () => {
        // Start the game
        game.start({
            playerId: playerId,
            playerName: playerName,
            vehicleType: selectedVehicle
        });
    };
    
    // When game ends
    game.onGameOver = (stats) => {
        // Display game over screen with stats
        const gameStats = document.getElementById('game-stats');
        gameStats.innerHTML = `
            <p>Distance traveled: ${Math.round(stats.distanceTraveled / 10) / 100} km</p>
            <p>Time played: ${formatTime(stats.timePlayed)}</p>
            <p>Max speed: ${Math.round(stats.maxSpeed)} km/h</p>
        `;
        
        gameOverScreen.classList.remove('hidden');
    };
    
    // Initialize the game
    game.init();
}

/**
 * Format time in seconds to mm:ss format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a UUID for player identification
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', init);