/**
 * Entry point for the racing game application
 * Handles initialization and game state
 */

// Set up global game instance
let game = null;

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const progressBarFill = document.getElementById('progress-bar-fill');
const loadingText = document.getElementById('loading-text');
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
        
        // Hide vehicle selection and start loading the game
        vehicleSelection.style.display = 'none';
        loadingScreen.style.display = 'flex';
        
        // Start the game loading process
        loadGame();
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
 * Load game assets and initialize the game
 */
function loadGame() {
    // Create new game instance
    game = new Game();
    
    // Set up loading progress tracking
    game.onLoadProgress = (progress, message) => {
        progressBarFill.style.width = `${progress * 100}%`;
        loadingText.textContent = message;
    };
    
    // When game is fully loaded and ready
    game.onReady = () => {
        // Hide loading screen with a fade out effect
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '1';
        }, 500);
        
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