/**
 * Audio class
 * Handles game audio and sound effects
 */
class Audio {
    constructor(game) {
        // Game reference
        this.game = game;
        
        // Audio context
        this.context = null;
        
        // Sound library
        this.sounds = {};
        
        // Currently playing sounds
        this.playingSounds = {};
        
        // Audio settings
        this.settings = {
            masterVolume: 0.7,
            sfxVolume: 0.8,
            musicVolume: 0.5,
            engineVolume: 0.4,
            isMuted: false
        };
        
        // Audio nodes
        this.nodes = {
            masterGain: null,
            sfxGain: null,
            musicGain: null,
            engineGain: null
        };
        
        // Engine sound state
        this.engineSound = {
            source: null,
            isPlaying: false,
            playbackRate: 1
        };
        
        // Sound loader
        this.loader = {
            total: 0,
            loaded: 0,
            callbacks: []
        };
        
        // Initialize audio
        this.initAudioContext();
    }
    
    /**
     * Initialize the audio context
     */
    initAudioContext() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            
            // Create gain nodes
            this.nodes.masterGain = this.context.createGain();
            this.nodes.sfxGain = this.context.createGain();
            this.nodes.musicGain = this.context.createGain();
            this.nodes.engineGain = this.context.createGain();
            
            // Connect nodes
            this.nodes.sfxGain.connect(this.nodes.masterGain);
            this.nodes.musicGain.connect(this.nodes.masterGain);
            this.nodes.engineGain.connect(this.nodes.masterGain);
            this.nodes.masterGain.connect(this.context.destination);
            
            // Set initial volumes
            this.nodes.masterGain.gain.value = this.settings.masterVolume;
            this.nodes.sfxGain.gain.value = this.settings.sfxVolume;
            this.nodes.musicGain.gain.value = this.settings.musicVolume;
            this.nodes.engineGain.gain.value = this.settings.engineVolume;
            
            console.log('Audio context initialized');
        } catch (e) {
            console.error('Web Audio API is not supported in this browser', e);
        }
    }
    
    /**
     * Initialize audio system
     */
    init() {
        // Resume audio context
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
        
        // Start engine sound
        this.startEngineSound();
        
        // Start ambient music
        this.playSound('ambient', { loop: true, volume: 0.3, output: this.nodes.musicGain });
    }
    
    /**
     * Load a sound file
     */
    loadSound(name, url, callback) {
        if (!this.context) return;
        
        // Increment total sounds to load
        this.loader.total++;
        
        // Create a new XMLHttpRequest to load the sound file
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        // When the sound is loaded, decode it
        request.onload = () => {
            this.context.decodeAudioData(
                request.response,
                (buffer) => {
                    // Store the decoded buffer
                    this.sounds[name] = buffer;
                    
                    // Increment loaded count
                    this.loader.loaded++;
                    
                    // Call the callback
                    if (callback) callback();
                    
                    // Check if all sounds are loaded
                    if (this.loader.loaded === this.loader.total) {
                        // Notify all pending callbacks
                        this.loader.callbacks.forEach(cb => cb());
                        this.loader.callbacks = [];
                    }
                },
                (error) => {
                    console.error(`Error decoding audio data for ${name}:`, error);
                }
            );
        };
        
        // Handle request errors
        request.onerror = () => {
            console.error(`Error loading sound: ${url}`);
            
            // Increment loaded count (even though it failed)
            this.loader.loaded++;
            
            // Call the callback
            if (callback) callback();
        };
        
        // Start the request
        request.send();
    }
    
    /**
     * Update audio system
     */
    update(deltaTime) {
        // Update engine sound based on player vehicle
        this.updateEngineSound();
    }
    
    /**
     * Play a sound
     */
    playSound(name, options = {}) {
        if (!this.context || this.settings.isMuted) return null;
        
        // Get the sound buffer
        const buffer = this.sounds[name];
        if (!buffer) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        // Create source node
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        // Set up options
        const loop = options.loop || false;
        const volume = options.volume !== undefined ? options.volume : 1;
        const pitch = options.pitch || 1;
        const output = options.output || this.nodes.sfxGain;
        
        // Create gain node for this sound
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(output);
        
        // Set source properties
        source.loop = loop;
        source.playbackRate.value = pitch;
        
        // Start playback
        source.start(0);
        
        // Store reference to control the sound
        const soundId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.playingSounds[soundId] = {
            source: source,
            gainNode: gainNode,
            name: name
        };
        
        // Remove reference when sound ends
        source.onended = () => {
            delete this.playingSounds[soundId];
        };
        
        // Return the sound ID for later control
        return soundId;
    }
    
    /**
     * Stop a sound
     */
    stopSound(soundId) {
        if (!soundId || !this.playingSounds[soundId]) return;
        
        try {
            this.playingSounds[soundId].source.stop();
        } catch (e) {
            console.warn('Error stopping sound:', e);
        }
        
        delete this.playingSounds[soundId];
    }
    
    /**
     * Change the volume of a sound
     */
    setSoundVolume(soundId, volume) {
        if (!soundId || !this.playingSounds[soundId]) return;
        
        // Clamp volume between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        // Apply volume
        this.playingSounds[soundId].gainNode.gain.value = volume;
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        // Clamp volume between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        // Store setting
        this.settings.masterVolume = volume;
        
        // Apply volume
        if (this.nodes.masterGain) {
            this.nodes.masterGain.gain.value = volume;
        }
    }
    
    /**
     * Set muted state
     */
    setMuted(isMuted) {
        this.settings.isMuted = isMuted;
        
        // Apply mute state
        if (this.nodes.masterGain) {
            this.nodes.masterGain.gain.value = isMuted ? 0 : this.settings.masterVolume;
        }
    }
    
    /**
     * Start engine sound
     */
    startEngineSound() {
        if (!this.context || !this.sounds.engine || this.engineSound.isPlaying) return;
        
        // Create source node
        const source = this.context.createBufferSource();
        source.buffer = this.sounds.engine;
        source.loop = true;
        
        // Connect to engine gain node
        source.connect(this.nodes.engineGain);
        
        // Start playback
        source.start(0);
        
        // Store source
        this.engineSound.source = source;
        this.engineSound.isPlaying = true;
    }
    
    /**
     * Update engine sound based on player vehicle
     */
    updateEngineSound() {
        if (!this.engineSound.isPlaying || !this.game.player) return;
        
        // Get RPM and speed from player vehicle
        const rpm = this.game.player.rpm;
        const speed = this.game.player.speed;
        const throttle = this.game.player.controls.throttle;
        
        // Calculate playback rate based on RPM
        // Map RPM range to playback rate range: 800-6000 RPM -> 0.5-2.0 rate
        const minRPM = 800;
        const maxRPM = 6000;
        const minRate = 0.5;
        const maxRate = 2.0;
        
        let playbackRate = minRate + ((rpm - minRPM) / (maxRPM - minRPM)) * (maxRate - minRate);
        
        // Clamp to valid range
        playbackRate = Math.max(minRate, Math.min(maxRate, playbackRate));
        
        // Apply rate if it has changed significantly
        if (Math.abs(this.engineSound.playbackRate - playbackRate) > 0.01) {
            this.engineSound.source.playbackRate.value = playbackRate;
            this.engineSound.playbackRate = playbackRate;
        }
        
        // Calculate volume based on throttle
        // Idle volume when not accelerating, higher when throttle applied
        const idleVolume = 0.2;
        const fullVolume = 0.5;
        
        let volume = idleVolume + throttle * (fullVolume - idleVolume);
        
        // Adjust volume node
        this.nodes.engineGain.gain.value = this.settings.engineVolume * volume;
    }
    
    /**
     * Play skid sound
     */
    playSkidSound(intensity) {
        if (!this.context || this.settings.isMuted) return;
        
        // If we don't have a skid sound yet, check if there's one already playing
        let skidSoundId = null;
        for (const id in this.playingSounds) {
            if (this.playingSounds[id].name === 'skid') {
                skidSoundId = id;
                break;
            }
        }
        
        if (intensity > 0.1) {
            // If intensity is high enough, play or adjust skid sound
            if (skidSoundId) {
                // Adjust volume based on intensity
                this.setSoundVolume(skidSoundId, intensity * 0.8);
            } else {
                // Start a new skid sound
                this.playSound('skid', { loop: true, volume: intensity * 0.8 });
            }
        } else if (skidSoundId) {
            // If intensity is too low, stop any playing skid sound
            this.stopSound(skidSoundId);
        }
    }
    
    /**
     * Play crash sound
     */
    playCrashSound(intensity) {
        if (!this.context || this.settings.isMuted) return;
        
        // Adjust volume based on crash intensity
        const volume = Math.min(1.0, intensity / 20);
        
        if (volume > 0.1) {
            this.playSound('crash', { volume: volume });
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Stop all playing sounds
        for (const id in this.playingSounds) {
            try {
                this.playingSounds[id].source.stop();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        
        // Clear references
        this.playingSounds = {};
        this.engineSound.isPlaying = false;
    }
}