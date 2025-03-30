import random
import math
import noise
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class WorldGenerator:
    """Generates the game world with procedural terrain."""
    
    def __init__(self, seed: int):
        self.seed = seed
        random.seed(seed)
        
        # World configuration
        self.world_size = 10000  # Size of the world in units
        self.chunk_size = 500    # Size of each terrain chunk
        
        # Terrain parameters
        self.terrain_scale = 0.02  # Scale of the noise function
        self.terrain_height = 100  # Maximum height of terrain
        self.road_width = 15      # Width of roads
        self.road_smoothness = 0.5  # How smooth the roads are (0-1)
        
        # Cached chunks
        self.chunks = {}
        
        # Generate road network
        self.roads = self._generate_road_network()
        
        logger.info(f"World generator initialized with seed: {seed}")
    
    def get_chunk(self, chunk_x: int, chunk_z: int) -> Dict[str, Any]:
        """Get or generate a chunk at the specified coordinates."""
        chunk_key = f"{chunk_x},{chunk_z}"
        
        # Return cached chunk if available
        if chunk_key in self.chunks:
            return self.chunks[chunk_key]
        
        # Generate new chunk
        chunk = self._generate_chunk(chunk_x, chunk_z)
        self.chunks[chunk_key] = chunk
        return chunk
    
    def get_terrain_height(self, x: float, z: float) -> float:
        """Get the terrain height at a specific world position."""
        # Convert world coordinates to noise space
        nx = x * self.terrain_scale
        nz = z * self.terrain_scale
        
        # Use Perlin noise for the base terrain
        base_height = noise.pnoise2(nx, nz, octaves=6, persistence=0.5, lacunarity=2.0, repeatx=1024, repeaty=1024, base=self.seed)
        
        # Scale to desired height range
        terrain_height = (base_height + 1) * 0.5 * self.terrain_height
        
        # Adjust height near roads
        road_factor = self._get_road_factor(x, z)
        if road_factor < 1.0:
            # Flatten terrain for roads
            road_height = self._get_road_height(x, z)
            terrain_height = terrain_height * road_factor + road_height * (1 - road_factor)
        
        return terrain_height
    
    def _generate_chunk(self, chunk_x: int, chunk_z: int) -> Dict[str, Any]:
        """Generate a terrain chunk at the specified chunk coordinates."""
        # Calculate world coordinates for this chunk
        world_x = chunk_x * self.chunk_size
        world_z = chunk_z * self.chunk_size
        
        # Determine the resolution of the chunk (vertices per side)
        resolution = 16  # You can adjust this for different detail levels
        
        # Generate heightmap for this chunk
        heightmap = []
        for z in range(resolution + 1):
            row = []
            for x in range(resolution + 1):
                # Calculate world position
                pos_x = world_x + (x / resolution) * self.chunk_size
                pos_z = world_z + (z / resolution) * self.chunk_size
                
                # Get height at this position
                height = self.get_terrain_height(pos_x, pos_z)
                row.append(height)
            heightmap.append(row)
        
        # Generate vertex data for rendering
        vertices = []
        for z in range(resolution + 1):
            for x in range(resolution + 1):
                vertices.append({
                    "position": {
                        "x": world_x + (x / resolution) * self.chunk_size,
                        "y": heightmap[z][x],
                        "z": world_z + (z / resolution) * self.chunk_size
                    },
                    "normal": self._calculate_normal(heightmap, x, z, resolution),
                    "uv": {
                        "u": x / resolution,
                        "v": z / resolution
                    }
                })
        
        # Generate indices for triangle rendering
        indices = []
        for z in range(resolution):
            for x in range(resolution):
                # Calculate vertex indices
                i0 = z * (resolution + 1) + x
                i1 = z * (resolution + 1) + x + 1
                i2 = (z + 1) * (resolution + 1) + x
                i3 = (z + 1) * (resolution + 1) + x + 1
                
                # Add two triangles to form a quad
                indices.extend([i0, i2, i1])  # First triangle
                indices.extend([i1, i2, i3])  # Second triangle
        
        # Find roads that pass through this chunk
        chunk_roads = []
        for road in self.roads:
            # Check if any segment of the road passes through this chunk
            for i in range(len(road) - 1):
                p1, p2 = road[i], road[i + 1]
                
                # Calculate chunk bounds
                min_x = world_x
                max_x = world_x + self.chunk_size
                min_z = world_z
                max_z = world_z + self.chunk_size
                
                # Simple line-box intersection check
                if (min_x <= p1["x"] <= max_x or min_x <= p2["x"] <= max_x) and \
                   (min_z <= p1["z"] <= max_z or min_z <= p2["z"] <= max_z):
                    chunk_roads.append({
                        "start": p1,
                        "end": p2
                    })
        
        # Find objects in this chunk (trees, buildings, etc.)
        objects = self._generate_objects(chunk_x, chunk_z, heightmap)
        
        return {
            "position": {"x": world_x, "z": world_z},
            "size": self.chunk_size,
            "resolution": resolution,
            "heightmap": heightmap,
            "vertices": vertices,
            "indices": indices,
            "roads": chunk_roads,
            "objects": objects
        }
    
    def _calculate_normal(self, heightmap: List[List[float]], x: int, z: int, resolution: int) -> Dict[str, float]:
        """Calculate the normal vector at a specific vertex."""
        # Handle edge cases
        if x == 0:
            x_prev = x
        else:
            x_prev = x - 1
            
        if x == resolution:
            x_next = x
        else:
            x_next = x + 1
            
        if z == 0:
            z_prev = z
        else:
            z_prev = z - 1
            
        if z == resolution:
            z_next = z
        else:
            z_next = z + 1
        
        # Calculate height differences
        h_up = heightmap[z_prev][x]
        h_down = heightmap[z_next][x]
        h_left = heightmap[z][x_prev]
        h_right = heightmap[z][x_next]
        
        # Calculate normal using central difference approximation
        nx = h_left - h_right
        nz = h_up - h_down
        
        # Normalize vector
        length = math.sqrt(nx * nx + 4 + nz * nz)
        nx /= length
        ny = 2 / length
        nz /= length
        
        return {"x": nx, "y": ny, "z": nz}
    
    def _generate_objects(self, chunk_x: int, chunk_z: int, heightmap: List[List[float]]) -> List[Dict[str, Any]]:
        """Generate objects like trees, buildings, etc. for a chunk."""
        objects = []
        
        # Calculate world coordinates for this chunk
        world_x = chunk_x * self.chunk_size
        world_z = chunk_z * self.chunk_size
        
        # Use a separate random generator for object placement to ensure consistency
        rng = random.Random(self.seed + hash((chunk_x, chunk_z)))
        
        # Number of objects to generate
        num_trees = rng.randint(5, 20)
        num_buildings = rng.randint(0, 2)
        
        # Generate trees
        for _ in range(num_trees):
            # Random position within chunk
            x_offset = rng.random() * self.chunk_size
            z_offset = rng.random() * self.chunk_size
            
            x_pos = world_x + x_offset
            z_pos = world_z + z_offset
            
            # Don't place trees on roads
            if self._get_road_factor(x_pos, z_pos) < 0.9:
                continue
            
            # Get height at this position
            height = self.get_terrain_height(x_pos, z_pos)
            
            # Tree properties
            tree_type = rng.choice(["pine", "oak", "palm"])
            tree_scale = 0.8 + rng.random() * 0.4
            
            objects.append({
                "type": "tree",
                "treeType": tree_type,
                "position": {"x": x_pos, "y": height, "z": z_pos},
                "rotation": {"y": rng.random() * 360},
                "scale": tree_scale
            })
        
        # Generate buildings
        for _ in range(num_buildings):
            # Random position within chunk
            x_offset = rng.random() * self.chunk_size
            z_offset = rng.random() * self.chunk_size
            
            x_pos = world_x + x_offset
            z_pos = world_z + z_offset
            
            # Only place buildings near roads
            road_factor = self._get_road_factor(x_pos, z_pos)
            if road_factor < 0.5 or road_factor > 0.9:
                continue
            
            # Get height at this position
            height = self.get_terrain_height(x_pos, z_pos)
            
            # Building properties
            building_type = rng.choice(["house", "shop", "garage"])
            building_scale = 1.0 + rng.random() * 0.5
            
            objects.append({
                "type": "building",
                "buildingType": building_type,
                "position": {"x": x_pos, "y": height, "z": z_pos},
                "rotation": {"y": rng.randint(0, 3) * 90},  # Align to grid
                "scale": building_scale
            })
        
        return objects
    
    def _generate_road_network(self) -> List[List[Dict[str, float]]]:
        """Generate a network of roads throughout the world."""
        roads = []
        
        # Use a separate random generator for road generation
        rng = random.Random(self.seed)
        
        # Create a main road that circles the world
        circle_road = []
        radius = self.world_size * 0.3
        center_x = self.world_size * 0.5
        center_z = self.world_size * 0.5
        
        segments = 36  # Number of segments in the circle
        for i in range(segments + 1):
            angle = (i / segments) * 2 * math.pi
            x = center_x + math.cos(angle) * radius
            z = center_z + math.sin(angle) * radius
            
            # Add some randomness to make it more natural
            if i > 0 and i < segments:
                x += (rng.random() - 0.5) * radius * 0.2
                z += (rng.random() - 0.5) * radius * 0.2
            
            circle_road.append({"x": x, "z": z})
        
        roads.append(circle_road)
        
        # Create several radial roads from center
        num_radial = rng.randint(4, 8)
        for i in range(num_radial):
            radial_road = []
            
            # Start at center
            radial_road.append({"x": center_x, "z": center_z})
            
            # Create a path outward
            angle = (i / num_radial) * 2 * math.pi
            end_x = center_x + math.cos(angle) * self.world_size * 0.5
            end_z = center_z + math.sin(angle) * self.world_size * 0.5
            
            # Add some intermediate points with randomness
            num_points = rng.randint(3, 6)
            for j in range(1, num_points):
                t = j / num_points
                x = center_x + (end_x - center_x) * t
                z = center_z + (end_z - center_z) * t
                
                # Add randomness to make roads curve
                deviation = self.world_size * 0.05 * (1 - t)  # Less deviation as we get further out
                x += (rng.random() - 0.5) * deviation
                z += (rng.random() - 0.5) * deviation
                
                radial_road.append({"x": x, "z": z})
            
            # Add the endpoint
            radial_road.append({"x": end_x, "z": end_z})
            
            roads.append(radial_road)
        
        # Create some random additional roads
        num_random = rng.randint(5, 10)
        for _ in range(num_random):
            random_road = []
            
            # Random starting point
            start_x = rng.random() * self.world_size
            start_z = rng.random() * self.world_size
            
            random_road.append({"x": start_x, "z": start_z})
            
            # Random length and direction
            length = rng.randint(3, 8)
            angle = rng.random() * 2 * math.pi
            
            for i in range(1, length):
                # Continue in roughly the same direction with some variation
                angle += (rng.random() - 0.5) * 0.5  # Small angle change
                
                # Calculate new position
                segment_length = rng.randint(100, 300)
                x = random_road[-1]["x"] + math.cos(angle) * segment_length
                z = random_road[-1]["z"] + math.sin(angle) * segment_length
                
                # Keep within world bounds
                x = max(0, min(x, self.world_size))
                z = max(0, min(z, self.world_size))
                
                random_road.append({"x": x, "z": z})
            
            roads.append(random_road)
        
        return roads
    
    def _get_road_factor(self, x: float, z: float) -> float:
        """
        Get the road influence factor at a position.
        Returns 1.0 for positions far from roads, and less for positions on or near roads.
        """
        min_distance = float('inf')
        
        # Check distance to each road segment
        for road in self.roads:
            for i in range(len(road) - 1):
                p1, p2 = road[i], road[i + 1]
                
                # Calculate distance from point to line segment
                line_dist = self._point_to_line_distance(x, z, p1["x"], p1["z"], p2["x"], p2["z"])
                min_distance = min(min_distance, line_dist)
        
        # Convert distance to a factor
        if min_distance > self.road_width:
            return 1.0
        else:
            # Smoothly blend between road and terrain
            blend_factor = min_distance / self.road_width
            return blend_factor
    
    def _get_road_height(self, x: float, z: float) -> float:
        """Get the height of the road at a specific position."""
        # Here we would need to find the closest road segment and interpolate its height
        # This is a simplified version that just returns a fixed height
        # In a real implementation, you would calculate proper road elevation
        
        # Use a smoothed version of the terrain height for the road base
        nx = x * self.terrain_scale * 0.2  # Use a larger scale for smoother terrain
        nz = z * self.terrain_scale * 0.2
        
        # Use Perlin noise with fewer octaves for a smoother base
        base_height = noise.pnoise2(nx, nz, octaves=2, persistence=0.5, lacunarity=2.0, repeatx=1024, repeaty=1024, base=self.seed)
        
        # Scale to a lower height range for roads
        return (base_height + 1) * 0.5 * self.terrain_height * 0.2
    
    def _point_to_line_distance(self, x: float, z: float, x1: float, z1: float, x2: float, z2: float) -> float:
        """Calculate the shortest distance from a point to a line segment."""
        # Vector from line start to end
        A = x2 - x1
        B = z2 - z1
        
        # Vector from line start to point
        C = x - x1
        D = z - z1
        
        # Line length squared
        dot = A * A + B * B
        
        # Projection parameter
        if dot == 0:  # Line segment is just a point
            return math.sqrt(C * C + D * D)
        
        # Calculate projection parameter
        param = (A * C + B * D) / dot
        
        if param < 0:  # Point is before the line segment
            return math.sqrt(C * C + D * D)
        elif param > 1:  # Point is after the line segment
            return math.sqrt((x - x2) ** 2 + (z - z2) ** 2)
        
        # Point projects onto the line segment
        proj_x = x1 + param * A
        proj_z = z1 + param * B
        
        return math.sqrt((x - proj_x) ** 2 + (z - proj_z) ** 2)