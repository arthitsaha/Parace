/**
 * Loading system
 * Tracks all game assets and shows loading progress
 */
class LoadingManager {
    constructor() {
        // DOM elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBarFill = document.getElementById('progress-bar-fill');
        this.loadingText = document.getElementById('loading-text');
        
        // Total assets to load and loaded count
        this.totalAssets = 0;
        this.loadedAssets = 0;
        
        // Lists of assets by type
        this.assets = {
            libraries: [
                { name: 'Three.js', url: 'lib/three.min.js' },
                { name: 'Cannon.js', url: 'lib/cannon.min.js' },
                { name: 'Socket.io', url: 'lib/socket.io.min.js' }
            ],
            models: [
                { name: 'Car Model', url: 'assets/models/car.glb' }
            ],
            textures: [
                { name: 'Grass Texture', url: 'assets/textures/environment/grass.jpg' },
                { name: 'Road Texture', url: 'assets/textures/environment/road.jpg' },
                { name: 'Sky Texture', url: 'assets/textures/environment/sky.jpg' }
            ],
            audio: [
                { name: 'Engine Sound', url: 'assets/audio/engine.mp3' },
                { name: 'Ambient Sound', url: 'assets/audio/ambient.mp3' }
            ]
        };
        
        // Calculate total assets
        this.totalAssets = Object.values(this.assets).reduce(
            (total, category) => total + category.length, 0
        );
        
        // Callbacks
        this.onComplete = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the loading manager
     */
    init() {
        // Show loading screen
        this.loadingScreen.style.display = 'flex';
        
        // Set initial progress
        this.updateProgress(0, 'Initializing...');
    }
    
    /**
     * Start loading all assets
     */
    startLoading() {
        this.updateProgress(0, 'Loading libraries...');
        
        // First, load libraries since they're required for other assets
        this.loadLibraries().then(() => {
            // Once libraries are loaded, load other assets in parallel
            this.updateProgress(this.loadedAssets / this.totalAssets, 'Libraries loaded, loading game assets...');
            
            // Load all other assets in parallel
            Promise.all([
                this.loadModels(),
                this.loadTextures(),
                this.loadAudio()
            ]).then(() => {
                // All assets loaded
                this.updateProgress(1, 'Loading complete!');
                
                // Short delay before hiding loading screen
                setTimeout(() => {
                    this.completeLoading();
                }, 500);
            });
        });
    }
    
    /**
     * Load JavaScript libraries
     */
    loadLibraries() {
        return new Promise((resolve) => {
            // Libraries need to be loaded sequentially and in order
            const loadNextLibrary = (index) => {
                if (index >= this.assets.libraries.length) {
                    resolve();
                    return;
                }
                
                const library = this.assets.libraries[index];
                this.updateProgress(
                    this.loadedAssets / this.totalAssets, 
                    `Loading ${library.name}...`
                );
                
                this.loadJavaScript(library.url).then(() => {
                    this.loadedAssets++;
                    loadNextLibrary(index + 1);
                }).catch(error => {
                    console.error(`Error loading library ${library.name}:`, error);
                    // Continue with next library even if one fails
                    this.loadedAssets++;
                    loadNextLibrary(index + 1);
                });
            };
            
            loadNextLibrary(0);
        });
    }
    
    /**
     * Load 3D models
     */
    loadModels() {
        return new Promise((resolve) => {
            let loadedCount = 0;
            
            // Skip if no models to load
            if (this.assets.models.length === 0) {
                resolve();
                return;
            }
            
            this.assets.models.forEach(model => {
                this.updateProgress(
                    this.loadedAssets / this.totalAssets, 
                    `Loading model: ${model.name}`
                );
                
                // Simulate loading or use actual loader when Three.js is loaded
                if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                    const loader = new THREE.GLTFLoader();
                    loader.load(model.url, 
                        // Success
                        () => {
                            this.loadedAssets++;
                            loadedCount++;
                            if (loadedCount === this.assets.models.length) {
                                resolve();
                            }
                        },
                        // Progress
                        (xhr) => {
                            if (xhr.lengthComputable) {
                                const progress = xhr.loaded / xhr.total;
                                // We only update text here, not the main progress bar
                                this.loadingText.textContent = `Loading model ${model.name}: ${Math.round(progress * 100)}%`;
                            }
                        },
                        // Error
                        (error) => {
                            console.error(`Error loading model ${model.name}:`, error);
                            this.loadedAssets++;
                            loadedCount++;
                            if (loadedCount === this.assets.models.length) {
                                resolve();
                            }
                        }
                    );
                } else {
                    // Fallback if Three.js isn't loaded yet
                    this.loadFile(model.url).then(() => {
                        this.loadedAssets++;
                        loadedCount++;
                        if (loadedCount === this.assets.models.length) {
                            resolve();
                        }
                    }).catch(error => {
                        console.error(`Error loading model ${model.name}:`, error);
                        this.loadedAssets++;
                        loadedCount++;
                        if (loadedCount === this.assets.models.length) {
                            resolve();
                        }
                    });
                }
            });
        });
    }
    
    /**
     * Load textures
     */
    loadTextures() {
        return new Promise((resolve) => {
            let loadedCount = 0;
            
            // Skip if no textures to load
            if (this.assets.textures.length === 0) {
                resolve();
                return;
            }
            
            this.assets.textures.forEach(texture => {
                this.updateProgress(
                    this.loadedAssets / this.totalAssets, 
                    `Loading texture: ${texture.name}`
                );
                
                const img = new Image();
                img.onload = () => {
                    this.loadedAssets++;
                    loadedCount++;
                    if (loadedCount === this.assets.textures.length) {
                        resolve();
                    }
                };
                img.onerror = () => {
                    console.error(`Error loading texture ${texture.name}`);
                    this.loadedAssets++;
                    loadedCount++;
                    if (loadedCount === this.assets.textures.length) {
                        resolve();
                    }
                };
                img.src = texture.url;
            });
        });
    }
    
    /**
     * Load audio files
     */
    loadAudio() {
        return new Promise((resolve) => {
            let loadedCount = 0;
            
            // Skip if no audio to load
            if (this.assets.audio.length === 0) {
                resolve();
                return;
            }
            
            this.assets.audio.forEach(audio => {
                this.updateProgress(
                    this.loadedAssets / this.totalAssets, 
                    `Loading audio: ${audio.name}`
                );
                
                this.loadFile(audio.url).then(() => {
                    this.loadedAssets++;
                    loadedCount++;
                    if (loadedCount === this.assets.audio.length) {
                        resolve();
                    }
                }).catch(error => {
                    console.error(`Error loading audio ${audio.name}:`, error);
                    this.loadedAssets++;
                    loadedCount++;
                    if (loadedCount === this.assets.audio.length) {
                        resolve();
                    }
                });
            });
        });
    }
    
    /**
     * Load a JavaScript file
     */
    loadJavaScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Generic file loader using Fetch API
     */
    loadFile(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response;
            });
    }
    
    /**
     * Update the progress bar and text
     */
    updateProgress(progress, message) {
        // Update progress bar
        const percent = Math.min(100, Math.round(progress * 100));
        this.progressBarFill.style.width = `${percent}%`;
        
        // Update loading text
        if (message) {
            this.loadingText.textContent = message;
        }
        
        // Add percentage to text
        this.loadingText.textContent += ` (${percent}%)`;
    }
    
    /**
     * Complete the loading process
     */
    completeLoading() {
        // Hide loading screen with fade out
        this.loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
            // Reset opacity for future use
            this.loadingScreen.style.opacity = '1';
            
            // Call onComplete callback if set
            if (this.onComplete) {
                this.onComplete();
            }
        }, 500);
    }
    
    /**
     * Set the callback for when loading is complete
     */
    setCompletionCallback(callback) {
        this.onComplete = callback;
    }
}