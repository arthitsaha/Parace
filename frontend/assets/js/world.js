/**
 * World class
 * Manages the game world, terrain generation, and objects
 */
class World {
    constructor(game) {
        // Game reference
        this.game = game;
        
        // World configuration
        this.config = {
            chunkSize: 500,         // Size of each terrain chunk
            viewDistance: 1500,     // Maximum visibility distance
            loadingRadius: 3,       // Number of chunks to load around player
            unloadDistance: 5       // Distance in chunks for unloading
        };
        
        // World data
        this.seed = 0;  // World generation seed
        this.terrain = {};  // Loaded terrain chunks
        this.objects = {};  // World objects (trees, buildings, etc.)
        this.roads = [];    // Road network
        this.waypoints = []; // Race waypoints
        
        // Player position for chunk loading
        this.lastPlayerChunk = { x: 0, z: 0 };
        
        // Procedural generation worker
        this.worker = null;
        
        // Loading queue
        this.loadingQueue = [];
        this.isLoading = false;
    }
    
    /**
     * Initialize the world
     */
    init() {
        // Set up worker for procedural generation
        this.initWorker();
    }
    
    /**
     * Initialize web worker for terrain generation
     */
    initWorker() {
        // Create a worker for procedural terrain generation
        // In a real implementation, this would offload generation to a separate thread
        // For simplicity, we'll just simulate it in the main thread
    }
    
    /**
     * Update the world
     */
    update(deltaTime) {
        // Get player position to determine which chunks to load
        if (this.game.player) {
            this.updateChunks(this.game.player.position);
            this.processLoadingQueue();
        }
    }
    
    /**
     * Set world seed
     */
    setSeed(seed) {
        this.seed = seed;
        console.log(`World seed set to: ${seed}`);
    }
    
    /**
     * Update chunks based on player position
     */
    updateChunks(playerPosition) {
        // Convert player position to chunk coordinates
        const chunkX = Math.floor(playerPosition.x / this.config.chunkSize);
        const chunkZ = Math.floor(playerPosition.z / this.config.chunkSize);
        
        // Check if player has moved to a new chunk
        if (chunkX !== this.lastPlayerChunk.x || chunkZ !== this.lastPlayerChunk.z) {
            this.lastPlayerChunk.x = chunkX;
            this.lastPlayerChunk.z = chunkZ;
            
            // Queue chunks to load
            this.queueChunksToLoad(chunkX, chunkZ);
            
            // Unload distant chunks
            this.unloadDistantChunks(chunkX, chunkZ);
        }
    }
    
    /**
     * Queue chunks around player to load
     */
    queueChunksToLoad(centerX, centerZ) {
        const radius = this.config.loadingRadius;
        
        // Queue chunks in a square around the player
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let z = centerZ - radius; z <= centerZ + radius; z++) {
                const key = `${x},${z}`;
                
                // Check if chunk is already loaded
                if (!this.terrain[key]) {
                    // Calculate priority (distance from player)
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // Add to loading queue
                    this.loadingQueue.push({
                        x: x,
                        z: z,
                        priority: distance,
                        key: key
                    });
                }
            }
        }
        
        // Sort queue by priority (closest chunks first)
        this.loadingQueue.sort((a, b) => a.priority - b.priority);
    }
    
    /**
     * Process the chunk loading queue
     */
    processLoadingQueue() {
        // Only process one chunk per frame to avoid stuttering
        if (this.loadingQueue.length > 0 && !this.isLoading) {
            const chunk = this.loadingQueue.shift();
            this.loadChunk(chunk.x, chunk.z);
        }
    }
    
    /**
     * Load a terrain chunk
     */
    loadChunk(x, z) {
        this.isLoading = true;
        const key = `${x},${z}`;
        
        // In a real implementation, this would use the worker
        // For now, generate the terrain directly
        
        // Generate terrain data
        const terrainData = this.generateTerrainData(x, z);
        
        // Add terrain to renderer
        this.game.renderer.addTerrain(terrainData);
        
        // Add terrain to physics
        this.game.physics.addTerrain(terrainData);
        
        // Store the terrain
        this.terrain[key] = terrainData;
        
        this.isLoading = false;
    }
    
    /**
     * Generate terrain data
     */
    generateTerrainData(chunkX, chunkZ) {
        // Calculate world position
        const worldX = chunkX * this.config.chunkSize;
        const worldZ = chunkZ * this.config.chunkSize;
        
        // Use simplex noise to generate terrain
        const resolution = 16; // Number of vertices per side
        const heightmap = [];
        
        for (let z = 0; z <= resolution; z++) {
            const row = [];
            for (let x = 0; x <= resolution; x++) {
                // Calculate world position for this vertex
                const posX = worldX + (x / resolution) * this.config.chunkSize;
                const posZ = worldZ + (z / resolution) * this.config.chunkSize;
                
                // Generate height using simplex noise
                const height = this.getTerrainHeight(posX, posZ);
                row.push(height);
            }
            heightmap.push(row);
        }
        
        // Generate vertex data
        const vertices = [];
        for (let z = 0; z <= resolution; z++) {
            for (let x = 0; x <= resolution; x++) {
                vertices.push({
                    position: {
                        x: worldX + (x / resolution) * this.config.chunkSize,
                        y: heightmap[z][x],
                        z: worldZ + (z / resolution) * this.config.chunkSize
                    },
                    normal: this.calculateNormal(heightmap, x, z, resolution),
                    uv: {
                        u: x / resolution,
                        v: z / resolution
                    }
                });
            }
        }
        
        // Generate indices for triangles
        const indices = [];
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                // Calculate vertex indices
                const i0 = z * (resolution + 1) + x;
                const i1 = z * (resolution + 1) + x + 1;
                const i2 = (z + 1) * (resolution + 1) + x;
                const i3 = (z + 1) * (resolution + 1) + x + 1;
                
                // Add two triangles to form a quad
                indices.push(i0, i2, i1);
                indices.push(i1, i2, i3);
            }
        }
        
        // Generate roads for this chunk
        const roads = this.generateRoads(worldX, worldZ, this.config.chunkSize);
        
        // Generate objects for this chunk
        const objects = this.generateObjects(worldX, worldZ, this.config.chunkSize, heightmap);
        
        // Return the terrain data
        return {
            position: { x: worldX, z: worldZ },
            size: this.config.chunkSize,
            resolution: resolution,
            heightmap: heightmap,
            vertices: vertices,
            indices: indices,
            roads: roads,
            objects: objects
        };
    }
    
    /**
     * Get terrain height at a specific position
     */
    getTerrainHeight(x, z) {
        // Use simplex noise for terrain height
        // This is a simplified version - real implementation would use better noise functions
        
        // Base terrain is just sine waves for this example
        const baseHeight = 
            Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10 + 
            Math.sin(x * 0.05 + z * 0.03) * 5;
        
        // Add small details with higher frequency
        const details = 
            Math.sin(x * 0.2) * Math.sin(z * 0.2) * 0.5 + 
            Math.cos(x * 0.3 + z * 0.7) * 0.3;
        
        return baseHeight + details;
    }
    
    /**
     * Calculate normal vector at a vertex
     */
    calculateNormal(heightmap, x, z, resolution) {
        // Handle boundaries
        const xPrev = Math.max(0, x - 1);
        const xNext = Math.min(resolution, x + 1);
        const zPrev = Math.max(0, z - 1);
        const zNext = Math.min(resolution, z + 1);
        
        // Get heights of surrounding vertices
        const hL = heightmap[z][xPrev];
        const hR = heightmap[z][xNext];
        const hU = heightmap[zPrev][x];
        const hD = heightmap[zNext][x];
        
        // Calculate normal using central differences
        const normalX = hL - hR;
        const normalZ = hU - hD;
        const normalY = 2.0; // Exaggerate normal for better lighting
        
        // Normalize
        const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        
        return {
            x: normalX / length,
            y: normalY / length,
            z: normalZ / length
        };
    }
    
    /**
     * Generate roads for a chunk
     */
    generateRoads(chunkX, chunkZ, chunkSize) {
        // This is a simplified road generation system
        // In a real implementation, you'd use more sophisticated algorithms
        
        const roads = [];
        
        // Simple grid of roads for this example
        const roadSpacing = 500;
        
        // Check if horizontal or vertical roads pass through this chunk
        const minX = chunkX;
        const maxX = chunkX + chunkSize;
        const minZ = chunkZ;
        const maxZ = chunkZ + chunkSize;
        
        // Check horizontal roads
        for (let z = Math.floor(minZ / roadSpacing) * roadSpacing; z <= maxZ; z += roadSpacing) {
            if (z >= minZ && z <= maxZ) {
                // This horizontal road passes through our chunk
                roads.push({
                    start: { x: minX, z: z },
                    end: { x: maxX, z: z }
                });
            }
        }
        
        // Check vertical roads
        for (let x = Math.floor(minX / roadSpacing) * roadSpacing; x <= maxX; x += roadSpacing) {
            if (x >= minX && x <= maxX) {
                // This vertical road passes through our chunk
                roads.push({
                    start: { x: x, z: minZ },
                    end: { x: x, z: maxZ }
                });
            }
        }
        
        return roads;
    }
    
    /**
     * Generate objects for a chunk
     */
    generateObjects(chunkX, chunkZ, chunkSize, heightmap) {
        // Generate trees, buildings, etc.
        const objects = [];
        
        // Use deterministic random based on chunk position
        const rand = this.seededRandom(chunkX + chunkZ * 10000);
        
        // Number of objects to generate
        const numTrees = Math.floor(rand() * 20);
        const numBuildings = Math.floor(rand() * 3);
        
        // Generate trees
        for (let i = 0; i < numTrees; i++) {
            const x = chunkX + rand() * chunkSize;
            const z = chunkZ + rand() * chunkSize;
            
            // Get ground height at this position
            const height = this.getTerrainHeight(x, z);
            
            // Don't place trees on roads
            if (this.isOnRoad(x, z)) continue;
            
            // Tree type
            const treeTypes = ['pine', 'oak', 'palm'];
            const treeType = treeTypes[Math.floor(rand() * treeTypes.length)];
            
            objects.push({
                type: 'tree',
                treeType: treeType,
                position: { x: x, y: height, z: z },
                rotation: { y: rand() * Math.PI * 2 },
                scale: 0.8 + rand() * 0.4
            });
        }
        
        // Generate buildings
        for (let i = 0; i < numBuildings; i++) {
            const x = chunkX + rand() * chunkSize;
            const z = chunkZ + rand() * chunkSize;
            
            // Get ground height at this position
            const height = this.getTerrainHeight(x, z);
            
            // Only place buildings near roads
            if (!this.isNearRoad(x, z)) continue;
            
            // Building type
            const buildingTypes = ['house', 'shop', 'garage'];
            const buildingType = buildingTypes[Math.floor(rand() * buildingTypes.length)];
            
            objects.push({
                type: 'building',
                buildingType: buildingType,
                position: { x: x, y: height, z: z },
                rotation: { y: Math.floor(rand() * 4) * (Math.PI / 2) },
                scale: 1.0 + rand() * 0.5
            });
        }
        
        return objects;
    }
    
    /**
     * Check if a position is on a road
     */
    isOnRoad(x, z) {
        // Simple road check - in a real implementation you'd use the road network data
        const roadSpacing = 500;
        const roadWidth = 10;
        
        // Check distance to nearest road grid line
        const distX = Math.abs((x + 1000) % roadSpacing - roadSpacing / 2);
        const distZ = Math.abs((z + 1000) % roadSpacing - roadSpacing / 2);
        
        return distX < roadWidth || distZ < roadWidth;
    }
    
    /**
     * Check if a position is near a road
     */
    isNearRoad(x, z) {
        // Simple road proximity check
        const roadSpacing = 500;
        const nearRoadDistance = 30;
        
        // Check distance to nearest road grid line
        const distX = Math.abs((x + 1000) % roadSpacing - roadSpacing / 2);
        const distZ = Math.abs((z + 1000) % roadSpacing - roadSpacing / 2);
        
        return (distX < nearRoadDistance && distX > 10) || 
               (distZ < nearRoadDistance && distZ > 10);
    }
    
    /**
     * Unload distant chunks
     */
    unloadDistantChunks(playerChunkX, playerChunkZ) {
        const maxDistance = this.config.unloadDistance;
        
        // Check all loaded chunks
        for (const key in this.terrain) {
            const coords = key.split(',');
            const chunkX = parseInt(coords[0]);
            const chunkZ = parseInt(coords[1]);
            
            // Calculate distance in chunks
            const dx = chunkX - playerChunkX;
            const dz = chunkZ - playerChunkZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Unload if too far
            if (distance > maxDistance) {
                // Remove from renderer
                this.game.renderer.removeTerrain(chunkX, chunkZ);
                
                // Remove from physics
                this.game.physics.removeTerrain(chunkX, chunkZ);
                
                // Remove from cache
                delete this.terrain[key];
            }
        }
    }
    
    /**
     * Seeded random number generator
     */
    seededRandom(seed) {
        let state = seed;
        
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }
    
    /**
     * Get terrain at a specific world position
     */
    getTerrainAtPosition(x, z) {
        // Calculate chunk coordinates
        const chunkX = Math.floor(x / this.config.chunkSize) * this.config.chunkSize;
        const chunkZ = Math.floor(z / this.config.chunkSize) * this.config.chunkSize;
        const key = `${chunkX},${chunkZ}`;
        
        // Return the terrain if loaded
        return this.terrain[key];
    }
    
    /**
     * Get height at a specific world position
     */
    getHeightAtPosition(x, z) {
        const terrain = this.getTerrainAtPosition(x, z);
        
        if (terrain) {
            // Get local coordinates within the chunk
            const localX = (x - terrain.position.x) / terrain.size;
            const localZ = (z - terrain.position.z) / terrain.size;
            
            // Convert to heightmap indices
            const xIndex = Math.floor(localX * terrain.resolution);
            const zIndex = Math.floor(localZ * terrain.resolution);
            
            // Get height from heightmap
            if (xIndex >= 0 && xIndex <= terrain.resolution &&
                zIndex >= 0 && zIndex <= terrain.resolution) {
                return terrain.heightmap[zIndex][xIndex];
            }
        }
        
        // If terrain not loaded, use the generation function
        return this.getTerrainHeight(x, z);
    }
    
    /**
     * Reset the world
     */
    reset() {
        // Clear all terrain
        for (const key in this.terrain) {
            const coords = key.split(',');
            const chunkX = parseInt(coords[0]);
            const chunkZ = parseInt(coords[1]);
            
            // Remove from renderer
            this.game.renderer.removeTerrain(chunkX, chunkZ);
            
            // Remove from physics
            this.game.physics.removeTerrain(chunkX, chunkZ);
        }
        
        // Clear cache
        this.terrain = {};
        this.objects = {};
        
        // Reset player chunk
        this.lastPlayerChunk = { x: 0, z: 0 };
        
        // Clear loading queue
        this.loadingQueue = [];
        this.isLoading = false;
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Reset the world
        this.reset();
        
        // Terminate worker if it exists
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}