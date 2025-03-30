/**
 * Physics class
 * Handles physics simulation using Cannon.js
 */
class Physics {
    constructor(config) {
        // Physics configuration
        this.config = config || {
            gravity: -9.81,
            timeStep: 1/60,
            maxSubSteps: 3
        };
        
        // Cannon.js world
        this.world = null;
        
        // Physics bodies
        this.vehicles = {};
        this.terrain = {};
        
        // Collision groups
        this.collisionGroups = {
            TERRAIN: 1,
            VEHICLE: 2,
            WHEEL: 4,
            OBJECT: 8
        };
        
        // Initialize physics
        this.init();
    }
    
    /**
     * Initialize physics world
     */
    init() {
        // Create a new Cannon.js world
        this.world = new CANNON.World();
        
        // Configure the world
        this.world.gravity.set(0, this.config.gravity, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = 0.3;
        
        // Create contact materials for different surfaces
        this.createMaterials();
    }
    
    /**
     * Create physics materials and contact materials
     */
    createMaterials() {
        // Create materials
        this.materials = {
            terrain: new CANNON.Material('terrain'),
            road: new CANNON.Material('road'),
            wheel: new CANNON.Material('wheel'),
            vehicle: new CANNON.Material('vehicle')
        };
        
        // Create contact materials (how materials interact)
        // Terrain - Wheel
        const terrainWheel = new CANNON.ContactMaterial(
            this.materials.terrain,
            this.materials.wheel,
            {
                friction: 0.5,
                restitution: 0.1
            }
        );
        
        // Road - Wheel
        const roadWheel = new CANNON.ContactMaterial(
            this.materials.road,
            this.materials.wheel,
            {
                friction: 0.8,
                restitution: 0.1
            }
        );
        
        // Vehicle - Vehicle (for collisions between vehicles)
        const vehicleVehicle = new CANNON.ContactMaterial(
            this.materials.vehicle,
            this.materials.vehicle,
            {
                friction: 0.2,
                restitution: 0.5
            }
        );
        
        // Add contact materials to the world
        this.world.addContactMaterial(terrainWheel);
        this.world.addContactMaterial(roadWheel);
        this.world.addContactMaterial(vehicleVehicle);
    }
    
    /**
     * Update physics simulation
     */
    update(deltaTime) {
        // Step the physics world
        this.world.step(this.config.timeStep, deltaTime, this.config.maxSubSteps);
        
        // Update all vehicles
        for (const vehicleId in this.vehicles) {
            const vehicle = this.vehicles[vehicleId];
            
            // Update the vehicle's position and rotation based on physics
            if (vehicle.chassis && vehicle.chassis.body) {
                // Get the position and quaternion from the physics body
                const position = vehicle.chassis.body.position;
                const quaternion = vehicle.chassis.body.quaternion;
                
                // Update the vehicle object
                vehicle.instance.updatePhysics(
                    { x: position.x, y: position.y, z: position.z },
                    quaternion
                );
            }
        }
    }
    
    /**
     * Add a vehicle to the physics world
     */
    addVehicle(vehicle) {
        // Create a vehicle instance in the physics world
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        const chassisBody = new CANNON.Body({
            mass: vehicle.mass,
            material: this.materials.vehicle
        });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(
            vehicle.position.x,
            vehicle.position.y,
            vehicle.position.z
        );
        
        // Store vehicle data
        const vehicleData = {
            instance: vehicle,
            chassis: {
                shape: chassisShape,
                body: chassisBody
            },
            wheels: []
        };
        
        // Add chassis body to the world
        this.world.addBody(chassisBody);
        
        // Create the vehicle
        const cannonVehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody
        });
        
        // Set up the wheels
        const wheelOptions = {
            radius: 0.3,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 1.5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };
        
        // Wheel positioning
        const wheelPositions = [
            { x: -0.7, y: 0, z: 1.2 },   // Front left
            { x: 0.7, y: 0, z: 1.2 },    // Front right
            { x: -0.7, y: 0, z: -1.2 },  // Rear left
            { x: 0.7, y: 0, z: -1.2 }    // Rear right
        ];
        
        // Create and add each wheel
        wheelPositions.forEach((pos, index) => {
            // Copy wheel options for this wheel
            const options = Object.assign({}, wheelOptions);
            
            // Set wheel position
            options.chassisConnectionPointLocal.set(pos.x, pos.y, pos.z);
            
            // Add the wheel to the vehicle
            cannonVehicle.addWheel(options);
        });
        
        // Set up wheel bodies and visuals
        cannonVehicle.wheelBodies = [];
        for (let i = 0; i < cannonVehicle.wheelInfos.length; i++) {
            const wheel = cannonVehicle.wheelInfos[i];
            
            // Create wheel body
            const wheelBody = new CANNON.Body({
                mass: 0,  // Mass zero because the wheel is controlled by the vehicle
                material: this.materials.wheel
            });
            
            const wheelShape = new CANNON.Cylinder(
                wheel.radius,
                wheel.radius,
                wheel.radius / 2,
                20
            );
            
            // Rotate wheel shape to match wheel orientation
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            
            wheelBody.addShape(wheelShape, new CANNON.Vec3(), quaternion);
            cannonVehicle.wheelBodies.push(wheelBody);
            
            // Add wheel body to world
            this.world.addBody(wheelBody);
            
            // Store wheel data
            vehicleData.wheels.push({
                info: wheel,
                body: wheelBody
            });
        }
        
        // Add wheels to the vehicle
        cannonVehicle.addToWorld(this.world);
        
        // Store the Cannon.js vehicle
        vehicleData.vehicle = cannonVehicle;
        
        // Store the vehicle data
        this.vehicles[vehicle.id] = vehicleData;
    }
    
    /**
     * Apply forces to a vehicle
     */
    applyVehicleControls(vehicleId, controls) {
        const vehicleData = this.vehicles[vehicleId];
        if (!vehicleData || !vehicleData.vehicle) return;
        
        const cannonVehicle = vehicleData.vehicle;
        
        // Get max engine force based on vehicle stats
        const maxEngineForce = vehicleData.instance.getMaxEngineForce();
        
        // Get max steering value based on vehicle stats
        const maxSteerVal = vehicleData.instance.getMaxSteeringAngle();
        
        // Get max braking force
        const maxBrakeForce = vehicleData.instance.getMaxBrakeForce();
        
        // Apply throttle
        const engineForce = controls.throttle * maxEngineForce;
        
        // Apply braking
        const brakeForce = controls.brake * maxBrakeForce;
        
        // Apply steering
        const steeringAngle = controls.steering * maxSteerVal;
        
        // Apply handbrake (only to rear wheels)
        const handBrake = controls.handbrake;
        
        // Update the wheels
        for (let i = 0; i < cannonVehicle.wheelInfos.length; i++) {
            // Apply engine force to all wheels
            cannonVehicle.applyEngineForce(engineForce, i);
            
            // Apply steering to front wheels only (indices 0 and 1)
            if (i < 2) {
                cannonVehicle.setSteeringValue(steeringAngle, i);
            }
            
            // Apply braking to all wheels
            if (handBrake && i >= 2) {
                // Stronger braking on rear wheels for handbrake
                cannonVehicle.setBrake(maxBrakeForce * 2, i);
            } else {
                cannonVehicle.setBrake(brakeForce, i);
            }
        }
        
        // Store steering angle for visual rotation of wheels
        vehicleData.instance.steeringAngle = steeringAngle;
    }
    
    /**
     * Add terrain to the physics world
     */
    addTerrain(terrain) {
        // Create a heightfield shape for the terrain
        const sizeX = terrain.resolution;
        const sizeZ = terrain.resolution;
        
        // Convert heightmap to the format Cannon.js expects
        const heightfieldData = [];
        for (let i = 0; i < terrain.heightmap.length; i++) {
            heightfieldData.push(terrain.heightmap[i]);
        }
        
        // Create the heightfield shape
        const terrainShape = new CANNON.Heightfield(heightfieldData, {
            elementSize: terrain.size / sizeX
        });
        
        // Create the terrain body
        const terrainBody = new CANNON.Body({
            mass: 0,  // Static body
            material: this.materials.terrain
        });
        
        // Add the shape and position the terrain
        terrainBody.addShape(terrainShape, new CANNON.Vec3(
            terrain.position.x - terrain.size / 2,
            0,
            terrain.position.z - terrain.size / 2
        ));
        
        // Add body to the world
        this.world.addBody(terrainBody);
        
        // Store terrain data
        const key = `${terrain.position.x},${terrain.position.z}`;
        this.terrain[key] = {
            body: terrainBody,
            shape: terrainShape
        };
        
        // Add roads as separate physics bodies
        this.addRoads(terrain);
    }
    
    /**
     * Add roads to the physics world
     */
    addRoads(terrain) {
        // Skip if no roads
        if (!terrain.roads || terrain.roads.length === 0) return;
        
        // Process each road segment
        terrain.roads.forEach((road, index) => {
            const start = road.start;
            const end = road.end;
            
            // Calculate road direction
            const dirX = end.x - start.x;
            const dirZ = end.z - start.z;
            
            // Calculate road length
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
            
            // Road width
            const width = 5;
            
            // Create a box shape for the road
            const roadShape = new CANNON.Box(new CANNON.Vec3(length / 2, 0.1, width / 2));
            
            // Create road body
            const roadBody = new CANNON.Body({
                mass: 0,  // Static body
                material: this.materials.road
            });
            
            // Calculate road center
            const centerX = (start.x + end.x) / 2;
            const centerZ = (start.z + end.z) / 2;
            
            // Calculate road orientation
            const angle = Math.atan2(dirZ, dirX);
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
            
            // Get height at road position (simplified - average of start and end heights)
            // In a real implementation, you'd sample the terrain height more accurately
            const startHeight = terrain.heightmap[Math.floor(start.z / terrain.size * terrain.resolution)]
                                           [Math.floor(start.x / terrain.size * terrain.resolution)];
            const endHeight = terrain.heightmap[Math.floor(end.z / terrain.size * terrain.resolution)]
                                         [Math.floor(end.x / terrain.size * terrain.resolution)];
            const centerHeight = (startHeight + endHeight) / 2 + 0.1; // Slightly above terrain
            
            // Add shape and position the road
            roadBody.addShape(roadShape);
            roadBody.position.set(centerX, centerHeight, centerZ);
            roadBody.quaternion.copy(quaternion);
            
            // Add body to the world
            this.world.addBody(roadBody);
            
            // Store road in the terrain data
            const key = `${terrain.position.x},${terrain.position.z}`;
            if (!this.terrain[key].roads) this.terrain[key].roads = [];
            
            this.terrain[key].roads.push({
                body: roadBody,
                shape: roadShape
            });
        });
    }
    
    /**
     * Remove terrain from the physics world
     */
    removeTerrain(x, z) {
        const key = `${x},${z}`;
        const terrainData = this.terrain[key];
        
        if (terrainData) {
            // Remove terrain body from the world
            this.world.removeBody(terrainData.body);
            
            // Remove any road bodies
            if (terrainData.roads) {
                terrainData.roads.forEach(road => {
                    this.world.removeBody(road.body);
                });
            }
            
            // Clean up the reference
            delete this.terrain[key];
        }
    }
    
    /**
     * Check for collisions between a vehicle and other objects
     */
    checkVehicleCollisions(vehicleId) {
        const vehicleData = this.vehicles[vehicleId];
        if (!vehicleData || !vehicleData.chassis || !vehicleData.chassis.body) return [];
        
        const chassisBody = vehicleData.chassis.body;
        const collisions = [];
        
        // Check all contact equations in the world
        for (let i = 0; i < this.world.contacts.length; i++) {
            const contact = this.world.contacts[i];
            
            // Check if this contact involves our vehicle
            if (contact.bi === chassisBody || contact.bj === chassisBody) {
                // Get the other body
                const otherBody = contact.bi === chassisBody ? contact.bj : contact.bi;
                
                // Determine collision type
                let collisionType = 'unknown';
                let collisionObject = null;
                
                // Check if it's another vehicle
                for (const otherId in this.vehicles) {
                    if (otherId !== vehicleId) {
                        const otherVehicle = this.vehicles[otherId];
                        if (otherVehicle.chassis && otherVehicle.chassis.body === otherBody) {
                            collisionType = 'vehicle';
                            collisionObject = otherVehicle.instance;
                            break;
                        }
                    }
                }
                
                // Add collision data
                collisions.push({
                    type: collisionType,
                    object: collisionObject,
                    contact: contact
                });
            }
        }
        
        return collisions;
    }
    
    /**
     * Add a static object to the physics world
     */
    addStaticObject(object) {
        // Create shape based on object type
        let shape;
        
        switch (object.type) {
            case 'box':
                shape = new CANNON.Box(new CANNON.Vec3(
                    object.size.x / 2,
                    object.size.y / 2,
                    object.size.z / 2
                ));
                break;
                
            case 'sphere':
                shape = new CANNON.Sphere(object.radius);
                break;
                
            case 'cylinder':
                shape = new CANNON.Cylinder(
                    object.radiusTop,
                    object.radiusBottom,
                    object.height,
                    object.numSegments
                );
                break;
                
            default:
                console.warn(`Unknown object type: ${object.type}`);
                return;
        }
        
        // Create body
        const body = new CANNON.Body({
            mass: 0,  // Static body
            material: this.materials.terrain
        });
        
        // Add shape
        body.addShape(shape);
        
        // Position the body
        body.position.set(
            object.position.x,
            object.position.y,
            object.position.z
        );
        
        // Set rotation if specified
        if (object.quaternion) {
            body.quaternion.set(
                object.quaternion.x,
                object.quaternion.y,
                object.quaternion.z,
                object.quaternion.w
            );
        }
        
        // Add body to the world
        this.world.addBody(body);
        
        // Return the body so the caller can store it if needed
        return body;
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Remove all bodies from the world
        while (this.world.bodies.length) {
            this.world.removeBody(this.world.bodies[0]);
        }
        
        // Clear references
        this.vehicles = {};
        this.terrain = {};
    }
}