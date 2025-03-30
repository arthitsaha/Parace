/**
 * Renderer class
 * Handles all Three.js rendering logic and asset loading
 */
class Renderer {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Asset containers
        this.models = {};
        this.textures = {};
        
        // Scene objects
        this.vehicles = {};
        this.terrain = {};
        this.skybox = null;
        this.lights = {};
        
        // Visual effects
        this.fog = null;
        this.postProcessing = {
            enabled: false,
            composer: null,
            effects: {}
        };
        
        // Loaders
        this.modelLoader = null;
        this.textureLoader = null;
        
        // Canvas element
        this.canvas = document.getElementById('game-canvas');
    }
    
    /**
     * Initialize the renderer
     */
    init() {
        // Create a new Three.js scene
        this.scene = new THREE.Scene();
        
        // Add fog for distance culling and atmosphere
        this.scene.fog = new THREE.FogExp2(0x88AACC, 0.002);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            2000 // Far clipping plane
        );
        this.camera.position.set(0, 5, -10);
        this.camera.lookAt(0, 0, 0);
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Initialize loaders
        this.modelLoader = new THREE.GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Add lighting
        this.setupLighting();
    }
    
    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Ambient light for general illumination
        this.lights.ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.lights.ambient);
        
        // Directional light for sun
        this.lights.directional = new THREE.DirectionalLight(0xFFFFAA, 1.0);
        this.lights.directional.position.set(100, 100, 50);
        this.lights.directional.castShadow = true;
        
        // Configure shadow properties
        const shadowSize = 200;
        this.lights.directional.shadow.camera.left = -shadowSize;
        this.lights.directional.shadow.camera.right = shadowSize;
        this.lights.directional.shadow.camera.top = shadowSize;
        this.lights.directional.shadow.camera.bottom = -shadowSize;
        this.lights.directional.shadow.camera.near = 1;
        this.lights.directional.shadow.camera.far = 500;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        
        this.scene.add(this.lights.directional);
        
        // Hemisphere light for sky/ground color variation
        this.lights.hemisphere = new THREE.HemisphereLight(0x88AAFF, 0x405030, 0.6);
        this.scene.add(this.lights.hemisphere);
    }
    
    /**
     * Load a 3D model
     */
    loadModel(name, url, callback) {
        this.modelLoader.load(url, (gltf) => {
            // Store the model
            this.models[name] = gltf.scene;
            
            // Enable shadows for all meshes
            gltf.scene.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            if (callback) callback();
        }, undefined, (error) => {
            console.error(`Error loading model: ${name}`, error);
        });
    }
    
    /**
     * Load a texture
     */
    loadTexture(name, url, callback) {
        this.textureLoader.load(url, (texture) => {
            // Store the texture
            this.textures[name] = texture;
            
            // Set up texture properties
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            if (callback) callback();
        }, undefined, (error) => {
            console.error(`Error loading texture: ${name}`, error);
        });
    }
    
    /**
     * Set camera position and look-at target
     */
    setCamera(position, target) {
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(target.x, target.y, target.z);
    }
    
    /**
     * Add a vehicle to the scene
     */
    addVehicle(vehicle) {
        // Check if we have the vehicle model loaded
        if (!this.models.car) {
            console.error("Vehicle model not loaded");
            return;
        }
        
        // Clone the model for this vehicle
        const vehicleModel = this.models.car.clone();
        vehicleModel.scale.set(1, 1, 1);
        
        // Set up material based on vehicle type
        const color = getVehicleColor(vehicle.type);
        vehicleModel.traverse((node) => {
            if (node.isMesh) {
                // Assign color to vehicle body parts
                if (node.name.includes('body')) {
                    node.material = new THREE.MeshStandardMaterial({
                        color: color,
                        metalness: 0.7,
                        roughness: 0.3
                    });
                }
                
                // Make the windows semi-transparent
                if (node.name.includes('window') || node.name.includes('glass')) {
                    node.material = new THREE.MeshPhysicalMaterial({
                        color: 0x333333,
                        metalness: 0.0,
                        roughness: 0.1,
                        transmission: 0.9,
                        transparent: true
                    });
                }
            }
        });
        
        // Add to scene
        this.scene.add(vehicleModel);
        
        // Store reference with vehicle ID
        this.vehicles[vehicle.id] = {
            model: vehicleModel,
            vehicle: vehicle,
            wheels: []
        };
        
        // Create the wheels
        this.createWheels(vehicle);
    }
    
    /**
     * Create wheels for a vehicle
     */
    createWheels(vehicle) {
        // Define wheel positions (these would match the vehicle's wheel positions)
        const wheelPositions = [
            { x: -0.7, y: 0.3, z: 1.2 },   // Front left
            { x: 0.7, y: 0.3, z: 1.2 },    // Front right
            { x: -0.7, y: 0.3, z: -1.2 },  // Rear left
            { x: 0.7, y: 0.3, z: -1.2 }    // Rear right
        ];
        
        // Create a wheel geometry
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        wheelGeometry.rotateZ(Math.PI / 2);
        
        // Create a wheel material
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.1,
            roughness: 0.8
        });
        
        // Create the wheels
        const wheels = [];
        wheelPositions.forEach((pos, index) => {
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.castShadow = true;
            wheelMesh.position.set(pos.x, pos.y, pos.z);
            
            // Add to the vehicle model
            this.vehicles[vehicle.id].model.add(wheelMesh);
            
            // Store reference
            this.vehicles[vehicle.id].wheels.push({
                mesh: wheelMesh,
                position: pos,
                index: index,
                steering: index < 2 // Front wheels have steering
            });
        });
    }
    
    /**
     * Update vehicle position and rotation in the scene
     */
    updateVehicle(vehicleId, position, rotation, velocity) {
        const vehicleObj = this.vehicles[vehicleId];
        if (!vehicleObj) return;
        
        // Update vehicle position and rotation
        vehicleObj.model.position.set(position.x, position.y, position.z);
        vehicleObj.model.rotation.set(rotation.x, rotation.y, rotation.z);
        
        // Update wheel rotation based on velocity
        // This is a simple approximation - in a real implementation you'd use actual wheel RPM
        const wheelSpeed = Math.sqrt(
            velocity.x * velocity.x +
            velocity.z * velocity.z
        ) * 3; // Scale factor for visual effect
        
        vehicleObj.wheels.forEach(wheel => {
            // Calculate wheel yaw for steering
            let wheelYaw = 0;
            if (wheel.steering) {
                // Get the steering angle from the vehicle
                wheelYaw = vehicleObj.vehicle.steeringAngle || 0;
            }
            
            // Apply steering rotation
            wheel.mesh.rotation.y = wheelYaw;
            
            // Apply rolling rotation
            wheel.mesh.rotation.x += wheelSpeed * 0.01;
        });
    }
    
    /**
     * Remove a vehicle from the scene
     */
    removeVehicle(vehicleId) {
        const vehicleObj = this.vehicles[vehicleId];
        if (!vehicleObj) return;
        
        // Remove from scene
        this.scene.remove(vehicleObj.model);
        
        // Clean up the reference
        delete this.vehicles[vehicleId];
    }
    
    /**
     * Add terrain to the scene
     */
    addTerrain(terrain) {
        // Create terrain geometry
        const geometry = new THREE.BufferGeometry();
        
        // Create vertex positions array
        const positions = [];
        const normals = [];
        const uvs = [];
        
        // Add each vertex from the terrain data
        terrain.vertices.forEach(vertex => {
            // Position
            positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
            
            // Normal
            normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
            
            // UV coordinates
            uvs.push(vertex.uv.u, vertex.uv.v);
        });
        
        // Set the attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Set indices for triangles
        geometry.setIndex(terrain.indices);
        
        // Create material with terrain texture
        let material;
        if (this.textures.grass) {
            material = new THREE.MeshStandardMaterial({
                map: this.textures.grass,
                normalScale: new THREE.Vector2(1, 1),
                roughness: 0.8,
                metalness: 0.1
            });
            
            // Repeat the texture based on terrain size
            this.textures.grass.repeat.set(
                terrain.size / 10,
                terrain.size / 10
            );
        } else {
            // Fallback material if texture isn't loaded
            material = new THREE.MeshStandardMaterial({
                color: 0x3D7E4A,
                roughness: 0.8,
                metalness: 0.1
            });
        }
        
        // Create the terrain mesh
        const terrainMesh = new THREE.Mesh(geometry, material);
        terrainMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(terrainMesh);
        
        // Store reference with terrain key
        const key = `${terrain.position.x},${terrain.position.z}`;
        this.terrain[key] = terrainMesh;
        
        // Add any roads for this terrain chunk
        this.addRoads(terrain);
        
        // Add any objects for this terrain chunk
        this.addTerrainObjects(terrain);
    }
    
    /**
     * Add roads to the scene
     */
    addRoads(terrain) {
        // Skip if no roads in this chunk
        if (!terrain.roads || terrain.roads.length === 0) return;
        
        // Create a road material
        let roadMaterial;
        if (this.textures.road) {
            roadMaterial = new THREE.MeshStandardMaterial({
                map: this.textures.road,
                roughness: 0.7,
                metalness: 0.2
            });
        } else {
            roadMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.7,
                metalness: 0.2
            });
        }
        
        // Process each road segment
        terrain.roads.forEach(road => {
            const start = road.start;
            const end = road.end;
            
            // Create a road segment
            this.createRoadSegment(start, end, roadMaterial);
        });
    }
    
    /**
     * Create a road segment between two points
     */
    createRoadSegment(start, end, material) {
        // Calculate road direction vector
        const direction = {
            x: end.x - start.x,
            z: end.z - start.z
        };
        
        // Calculate the length of the road segment
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        
        // Normalize direction vector
        const normalizedDir = {
            x: direction.x / length,
            z: direction.z / length
        };
        
        // Calculate perpendicular vector for road width
        const perpendicular = {
            x: -normalizedDir.z,
            z: normalizedDir.x
        };
        
        // Road width
        const roadWidth = 5;
        const halfWidth = roadWidth / 2;
        
        // Create road geometry
        const roadGeometry = new THREE.PlaneGeometry(length, roadWidth, 1, 1);
        
        // Calculate road center position
        const centerX = (start.x + end.x) / 2;
        const centerZ = (start.z + end.z) / 2;
        
        // Create road mesh
        const roadMesh = new THREE.Mesh(roadGeometry, material);
        roadMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        
        // Calculate rotation angle to align with the road direction
        const angle = Math.atan2(direction.z, direction.x) - Math.PI / 2;
        roadMesh.rotation.y = angle;
        
        // Position the road slightly above the terrain to prevent z-fighting
        roadMesh.position.set(centerX, 0.05, centerZ);
        
        // Add to scene
        this.scene.add(roadMesh);
    }
    
    /**
     * Add objects like trees and buildings to the terrain
     */
    addTerrainObjects(terrain) {
        // Skip if no objects
        if (!terrain.objects || terrain.objects.length === 0) return;
        
        // Process each object
        terrain.objects.forEach(obj => {
            switch (obj.type) {
                case 'tree':
                    this.addTree(obj);
                    break;
                    
                case 'building':
                    this.addBuilding(obj);
                    break;
            }
        });
    }
    
    /**
     * Add a tree to the scene
     */
    addTree(treeData) {
        // Create a simple tree as a placeholder
        // In a real implementation, you'd use proper tree models
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(treeData.position.x, treeData.position.y + 1, treeData.position.z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        
        // Tree foliage
        let foliageGeometry;
        
        // Different tree types
        switch (treeData.treeType) {
            case 'pine':
                foliageGeometry = new THREE.ConeGeometry(1, 3, 8);
                break;
                
            case 'palm':
                // For palm trees, use several cones arranged in a star pattern
                const palmGroup = new THREE.Group();
                
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const frondGeometry = new THREE.ConeGeometry(0.2, 2, 4);
                    const frond = new THREE.Mesh(frondGeometry, new THREE.MeshStandardMaterial({
                        color: 0x2E8B57,
                        roughness: 0.8,
                        metalness: 0.1
                    }));
                    
                    frond.position.set(
                        Math.cos(angle) * 0.5,
                        1.5,
                        Math.sin(angle) * 0.5
                    );
                    
                    frond.rotation.x = Math.PI * 0.4;
                    frond.rotation.z = angle;
                    
                    palmGroup.add(frond);
                }
                
                palmGroup.position.set(treeData.position.x, treeData.position.y + 1, treeData.position.z);
                palmGroup.castShadow = true;
                this.scene.add(palmGroup);
                return; // Skip the rest for palm trees
                
            case 'oak':
            default:
                foliageGeometry = new THREE.SphereGeometry(1, 8, 8);
                break;
        }
        
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x2E8B57,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(treeData.position.x, treeData.position.y + 2.5, treeData.position.z);
        foliage.castShadow = true;
        this.scene.add(foliage);
    }
    
    /**
     * Add a building to the scene
     */
    addBuilding(buildingData) {
        // Create a simple building as a placeholder
        // In a real implementation, you'd use proper building models
        
        let width, depth, height;
        
        // Different building types
        switch (buildingData.buildingType) {
            case 'house':
                width = 6;
                depth = 8;
                height = 4;
                break;
                
            case 'shop':
                width = 8;
                depth = 10;
                height = 3;
                break;
                
            case 'garage':
                width = 5;
                depth = 6;
                height = 3;
                break;
                
            default:
                width = 6;
                depth = 6;
                height = 4;
                break;
        }
        
        // Apply scale
        width *= buildingData.scale;
        depth *= buildingData.scale;
        height *= buildingData.scale;
        
        // Create the building
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0xAAAAAA,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(
            buildingData.position.x,
            buildingData.position.y + height / 2,
            buildingData.position.z
        );
        
        // Apply rotation
        building.rotation.y = buildingData.rotation.y * (Math.PI / 180);
        
        building.castShadow = true;
        building.receiveShadow = true;
        
        this.scene.add(building);
        
        // Add a roof
        const roofGeometry = new THREE.ConeGeometry(Math.max(width, depth) * 0.6, height * 0.5, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0xA52A2A,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(
            buildingData.position.x,
            buildingData.position.y + height + (height * 0.25),
            buildingData.position.z
        );
        
        // Align roof with building
        roof.rotation.y = buildingData.rotation.y * (Math.PI / 180) + Math.PI / 4;
        
        roof.castShadow = true;
        
        this.scene.add(roof);
    }
    
    /**
     * Remove terrain from the scene
     */
    removeTerrain(x, z) {
        const key = `${x},${z}`;
        const terrainMesh = this.terrain[key];
        
        if (terrainMesh) {
            this.scene.remove(terrainMesh);
            delete this.terrain[key];
        }
    }
    
    /**
     * Create a skybox
     */
    createSkybox() {
        if (!this.textures.sky) {
            console.warn("Sky texture not loaded for skybox");
            return;
        }
        
        const skyGeometry = new THREE.BoxGeometry(2000, 2000, 2000);
        const skyMaterials = [];
        
        // Use the same texture for all sides for simplicity
        for (let i = 0; i < 6; i++) {
            skyMaterials.push(new THREE.MeshBasicMaterial({
                map: this.textures.sky,
                side: THREE.BackSide
            }));
        }
        
        this.skybox = new THREE.Mesh(skyGeometry, skyMaterials);
        this.scene.add(this.skybox);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Render the scene
     */
    render() {
        if (this.postProcessing.enabled && this.postProcessing.composer) {
            // Render with post-processing effects
            this.postProcessing.composer.render();
        } else {
            // Normal rendering
            this.renderer.render(this.scene, this.camera);
        }
    }
}

/**
 * Helper function to get vehicle color based on type
 */
function getVehicleColor(type) {
    const colors = {
        'default': 0xFF5500,
        'sports': 0x0055FF,
        'truck': 0x005500
    };
    
    return colors[type] || colors['default'];
}