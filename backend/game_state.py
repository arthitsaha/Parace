import time
import random
import math
from typing import Dict, List, Any
import logging

from player import Player
from world_generator import WorldGenerator

logger = logging.getLogger(__name__)

class GameState:
    """Manages the entire game state on the server side."""
    
    def __init__(self):
        self.players: Dict[str, Player] = {}
        self.start_time = time.time()
        self.current_time = time.time()
        self.tick_count = 0
        
        # Generate a random seed for world generation
        self.world_seed = random.randint(1, 1000000)
        self.world_generator = WorldGenerator(self.world_seed)
        
        # Game configuration
        self.config = {
            "maxPlayers": 50,
            "worldSize": 10000,  # Size of the world in units
            "chunkSize": 500,    # Size of each terrain chunk
            "tickRate": 20,      # Ticks per second
            "playerTimeout": 30  # Seconds of inactivity before player is removed
        }
        
        # Game events (crashes, checkpoints, etc.)
        self.events: List[Dict[str, Any]] = []
        
        logger.info(f"Game state initialized with world seed: {self.world_seed}")
    
    def update(self):
        """Update game state (called every tick)."""
        self.current_time = time.time()
        self.tick_count += 1
        
        # Check for inactive players and remove them
        self._cleanup_inactive_players()
        
        # Process any game events
        self._process_events()
        
        # Every 100 ticks, log some stats
        if self.tick_count % 100 == 0:
            logger.info(f"Game running for {int(self.current_time - self.start_time)}s, "
                        f"{len(self.players)} players connected")
    
    def add_player(self, player: Player):
        """Add a player to the game."""
        self.players[player.id] = player
        
        # Set initial player position
        # For simplicity, spawn at a random position near the origin
        spawn_radius = 20
        angle = random.random() * 2 * math.pi
        player.position = {
            "x": math.cos(angle) * spawn_radius,
            "y": 0.5,  # Slightly above ground
            "z": math.sin(angle) * spawn_radius
        }
        player.rotation = {"x": 0, "y": angle, "z": 0}
        
        logger.info(f"Player {player.id} added to game")
    
    def remove_player(self, player_id: str):
        """Remove a player from the game."""
        if player_id in self.players:
            del self.players[player_id]
            logger.info(f"Player {player_id} removed from game")
    
    def get_public_state(self):
        """Get a JSON-serializable representation of the game state for clients."""
        return {
            "players": {
                player_id: {
                    "id": player.id,
                    "name": player.name,
                    "position": player.position,
                    "rotation": player.rotation,
                    "vehicleType": player.vehicle_type
                }
                for player_id, player in self.players.items()
            },
            "time": self.current_time - self.start_time,
            "playerCount": len(self.players)
        }
    
    def _cleanup_inactive_players(self):
        """Remove players who haven't sent updates recently."""
        inactive_threshold = self.current_time - self.config["playerTimeout"]
        inactive_players = [
            player_id for player_id, player in self.players.items()
            if player.last_update < inactive_threshold
        ]
        
        for player_id in inactive_players:
            logger.info(f"Removing inactive player {player_id}")
            self.remove_player(player_id)
    
    def _process_events(self):
        """Process any game events like collisions, race completions, etc."""
        # Here you would implement collision detection, race logic, etc.
        
        # For example, detect if any players are too close to each other
        for player_id, player in self.players.items():
            for other_id, other_player in self.players.items():
                if player_id != other_id:
                    # Calculate distance between players
                    p1 = player.position
                    p2 = other_player.position
                    distance = math.sqrt(
                        (p1["x"] - p2["x"]) ** 2 +
                        (p1["y"] - p2["y"]) ** 2 +
                        (p1["z"] - p2["z"]) ** 2
                    )
                    
                    # If they're too close, they might be colliding
                    # This is very simplified - real collision detection would be more complex
                    if distance < 2.0:  # Assuming vehicle radius is about 1 unit
                        # Add a collision event
                        self.events.append({
                            "type": "collision",
                            "time": self.current_time,
                            "players": [player_id, other_id],
                            "position": {
                                "x": (p1["x"] + p2["x"]) / 2,
                                "y": (p1["y"] + p2["y"]) / 2,
                                "z": (p1["z"] + p2["z"]) / 2
                            }
                        })
                        
                        # In a real implementation, you would also apply physics
                        # to both vehicles based on their velocities, masses, etc.