/**
 * Vehicle class
 * Handles vehicle physics, controls, and state
 */
class Vehicle {
    constructor(game, options) {
        // Game reference
        this.game = game;
        
        // Vehicle identification
        this.id = options.id;
        this.isPlayer = options.isPlayer || false;
        this.type = options.type || 'default';
        
        // Vehicle position and orientation
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || { x: 0, y: 0, z: 0 };
        this.quaternion = null;  // Will be set by physics
        
        // Vehicle dynamics
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        
        // Vehicle properties based on type
        this.setVehicleProperties(this.type);
        
        // Control inputs
        this.controls = {
            throttle: 0,    // Range: 0 to 1
            brake: 0,       // Range: 0 to 1
            steering: 0,    // Range: -1 to 1
            handbrake: false
        };
        
        // Vehicle state
        this.speed = 0;           // Current speed
        this.rpm = 0;             // Engine RPM
        this.gear = 1;            // Current gear
        this.steeringAngle = 0;   // Current steering angle
        
        // Advanced physics properties
        this.wheelContacts = [false, false, false, false]; // Wheel ground contact
        this.slipRatio = [0, 0, 0, 0]; // Wheel slip ratio for each wheel
        this.suspensionTravel = [0, 0, 0, 0]; // Suspension travel for each wheel
        
        // Effects
        this.skidMarks = [];
        this.exhaustParticles = null;
        
        // Vehicle sounds
        this.sounds = {
            engine: null,
            skid: null,
            crash: null
        };
        
        // Vehicle lights
        this.lights = {
            headlights: false,
            brakelights: false,
            reverselights: false,
            indicators: { left: false, right: false }
        };
        
        // Vehicle damage
        this.damage = 0; // 0-100 percentage
        this.damagedParts = [];
        
        // Initialize keyboard controls if this is the player's vehicle
        if (this.isPlayer) {
            this.initializeControls();
        }
    }
    
    /**
     * Set vehicle properties based on type
     */
    setVehicleProperties(type) {
        // Default properties
        this.properties = {
            maxSpeed: 40,         // Maximum speed in units/s
            acceleration: 10,     // Acceleration in units/s²
            handling: 0.5,        // 0-1, higher is better
            braking: 0.7,         // 0-1, higher is better
            mass: 1000,           // Mass in kg
            drag: 0.3,            // Aerodynamic drag coefficient
            maxEngineForce: 2000, // Maximum engine force
            maxBrakeForce: 30,    // Maximum brake force
            maxSteeringAngle: 0.5, // Maximum steering angle in radians
            wheelbase: 2.5,       // Distance between front and rear axles
            trackWidth: 1.4,      // Distance between left and right wheels
            centerOfMassOffset: { x: 0, y: -0.2, z: 0 } // Center of mass offset
        };
        
        // Adjust properties based on vehicle type
        switch (type) {
            case 'sports':
                this.properties.maxSpeed = 60;
                this.properties.acceleration = 15;
                this.properties.handling = 0.8;
                this.properties.braking = 0.9;
                this.properties.mass = 1200;
                this.properties.drag = 0.25;
                this.properties.maxEngineForce = 3000;
                this.properties.maxBrakeForce = 50;
                this.properties.maxSteeringAngle = 0.4;
                break;
                
            case 'truck':
                this.properties.maxSpeed = 30;
                this.properties.acceleration = 5;
                this.properties.handling = 0.3;
                this.properties.braking = 0.5;
                this.properties.mass = 2500;
                this.properties.drag = 0.5;
                this.properties.maxEngineForce = 4000;
                this.properties.maxBrakeForce = 40;
                this.properties.maxSteeringAngle = 0.3;
                this.properties.centerOfMassOffset.y = -0.3;
                break;
        }
    }
    
    /**
     * Initialize keyboard controls for player vehicle
     */
    initializeControls() {
        // Control state is managed by the game's input handler
        // This method is just for initialization
    }
    
    /**
     * Update vehicle state
     */
    update(deltaTime, keys) {
        // Only process input for player vehicle
        if (this.isPlayer && keys) {
            this.processInput(keys);
        }
        
        // Calculate current speed
        this.speed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.z * this.velocity.z
        ) * 3.6; // Convert to km/h
        
        // Simulate engine RPM
        this.updateRPM();
        
        // Update gear based on speed
        this.updateGear();
        
        // Update visual effects like skid marks
        this.updateEffects(deltaTime);
        
        // Update damage visuals
        this.updateDamage();
    }
    
    /**
     * Process keyboard input for player vehicle
     */
    processInput(keys) {
        // Reset controls
        this.controls.throttle = 0;
        this.controls.brake = 0;
        this.controls.steering = 0;
        this.controls.handbrake = false;
        
        // Throttle control
        if (keys['KeyW'] || keys['ArrowUp']) {
            this.controls.throttle = 1;
        }
        
        // Brake/reverse control
        if (keys['KeyS'] || keys['ArrowDown']) {
            // If we're moving forward, apply brakes
            if (this.speed > 1) {
                this.controls.brake = 1;
            } else {
                // If we're almost stopped or moving backward, apply reverse throttle
                this.controls.throttle = -0.5; // Lower power for reverse
            }
        }
        
        // Steering controls
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.controls.steering = -1;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            this.controls.steering = 1;
        }
        
        // Handbrake
        if (keys['Space']) {
            this.controls.handbrake = true;
        }
        
        // Apply controls to the physics vehicle
        if (this.game.physics) {
            this.game.physics.applyVehicleControls(this.id, this.controls);
        }
        
        // Update lights based on controls
        this.updateLights();
    }
    
    /**
     * Update physics from Cannon.js
     */
    updatePhysics(position, quaternion) {
        // Store the new position
        this.position = position;
        
        // Store the quaternion
        this.quaternion = quaternion;
        
        // Convert quaternion to Euler angles
        const euler = new THREE.Euler().setFromQuaternion(
            new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
        );
        
        // Update rotation
        this.rotation = {
            x: euler.x,
            y: euler.y,
            z: euler.z
        };
    }
    
    /**
     * Calculate engine RPM based on speed and gear
     */
    updateRPM() {
        // Simple RPM simulation
        const minRPM = 800;
        const maxRPM = 6000;
        
        // Calculate a base RPM based on speed and gear
        const gearRatio = 5 / (this.gear || 1);
        let baseRPM = (this.speed * gearRatio * 60) / (2 * Math.PI * 0.3);
        
        // Add throttle influence
        const throttleRPM = this.controls.throttle * 1000;
        
        // Calculate final RPM
        this.rpm = Math.max(minRPM, Math.min(maxRPM, baseRPM + throttleRPM));
        
        // When idling or low speed
        if (this.speed < 1) {
            this.rpm = minRPM + this.controls.throttle * 2000;
        }
    }
    
    /**
     * Update current gear based on speed
     */
    updateGear() {
        // Simple automatic gear selection based on speed
        if (this.speed < 10) {
            this.gear = 1;
        } else if (this.speed < 30) {
            this.gear = 2;
        } else if (this.speed < 50) {
            this.gear = 3;
        } else if (this.speed < 70) {
            this.gear = 4;
        } else if (this.speed < 100) {
            this.gear = 5;
        } else {
            this.gear = 6;
        }
    }
    
    /**
     * Update vehicle lights
     */
    updateLights() {
        // Brake lights
        this.lights.brakelights = this.controls.brake > 0;
        
        // Reverse lights
        this.lights.reverselights = this.controls.throttle < 0 && this.speed < 5;
    }
    
    /**
     * Update vehicle effects like skid marks
     */
    updateEffects(deltaTime) {
        // Only create effects for the player vehicle
        if (!this.isPlayer) return;
        
        // Create skid marks when handbrake is applied and speed is sufficient
        if (this.controls.handbrake && this.speed > 10) {
            // Create skid marks under the rear wheels
            // In a real implementation, you'd add visual effects to the ground
        }
        
        // Create exhaust particles
        if (this.rpm > 3000) {
            // Increase exhaust particle emission rate
            // In a real implementation, you'd adjust a particle system
        }
    }
    
    /**
     * Update damage visuals based on damage state
     */
    updateDamage() {
        // Update vehicle model based on damage
        // In a real implementation, you'd deform the vehicle mesh or change materials
    }
    
    /**
     * Apply damage to the vehicle
     */
    applyDamage(amount, position) {
        // Increase damage amount
        this.damage = Math.min(100, this.damage + amount);
        
        // Add to damaged parts based on impact position
        // This would be used to visually deform specific parts of the vehicle
        
        // Play crash sound
        if (this.sounds.crash && amount > 5) {
            // Play crash sound
        }
    }
    
    /**
     * Get the current speed in km/h
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Get maximum engine force based on vehicle properties
     */
    getMaxEngineForce() {
        return this.properties.maxEngineForce;
    }
    
    /**
     * Get maximum braking force based on vehicle properties
     */
    getMaxBrakeForce() {
        return this.properties.maxBrakeForce;
    }
    
    /**
     * Get maximum steering angle based on vehicle properties
     */
    getMaxSteeringAngle() {
        return this.properties.maxSteeringAngle;
    }
    
    /**
     * Apply a force to the vehicle
     */
    applyForce(force, worldPoint) {
        // This would be implemented using the physics system
        // For example, to simulate impacts or external forces
    }
    
    /**
     * Reset the vehicle position
     */
    resetPosition() {
        // Reset the vehicle if it's flipped or stuck
        // This would be implemented using the physics system
    }
}