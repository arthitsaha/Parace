import time
from typing import Dict, Any, Optional
from fastapi import WebSocket

class Player:
    """Represents a player in the game."""
    
    def __init__(self, id: str, name: str, vehicle_type: str, websocket: WebSocket):
        self.id = id
        self.name = name
        self.vehicle_type = vehicle_type
        self.websocket = websocket
        
        # Player state
        self.position = {"x": 0, "y": 0, "z": 0}
        self.rotation = {"x": 0, "y": 0, "z": 0}
        self.velocity = {"x": 0, "y": 0, "z": 0}
        self.acceleration = {"x": 0, "y": 0, "z": 0}
        
        # Vehicle stats (these would vary based on vehicle_type)
        self.vehicle_stats = self._get_vehicle_stats(vehicle_type)
        
        # Player stats
        self.score = 0
        self.distance_traveled = 0
        self.race_position = 0  # Position in a race (1st, 2nd, etc.)
        self.best_lap_time: Optional[float] = None
        self.current_lap_start: Optional[float] = None
        
        # Connection info
        self.last_update = time.time()
        self.ping = 0  # Latency in ms
        
        # Checkpoints and race progress
        self.checkpoints_passed = []
        self.current_checkpoint = 0
        
    def _get_vehicle_stats(self, vehicle_type: str) -> Dict[str, Any]:
        """Get vehicle stats based on vehicle type."""
        # These would be balanced for gameplay
        vehicle_types = {
            "default": {
                "maxSpeed": 40,         # Max speed in units per second
                "acceleration": 10,      # Acceleration in units per second^2
                "handling": 0.5,         # 0 to 1, higher is better
                "braking": 0.7,          # 0 to 1, higher is better
                "mass": 1000,            # Mass in kg
                "drag": 0.3,             # Aerodynamic drag coefficient
                "color": "#FF5500"       # Default color
            },
            "sports": {
                "maxSpeed": 60,
                "acceleration": 15,
                "handling": 0.8,
                "braking": 0.9,
                "mass": 1200,
                "drag": 0.25,
                "color": "#0055FF"
            },
            "truck": {
                "maxSpeed": 30,
                "acceleration": 5,
                "handling": 0.3,
                "braking": 0.5,
                "mass": 2500,
                "drag": 0.5,
                "color": "#005500"
            }
        }
        
        # Return the stats for the requested vehicle, or default if not found
        return vehicle_types.get(vehicle_type, vehicle_types["default"])
    
    async def send_message(self, message: Dict[str, Any]):
        """Send a message to the player's WebSocket."""
        try:
            await self.websocket.send_json(message)
            return True
        except Exception as e:
            # If sending fails, the connection might be closed
            return False
    
    def update_lap_time(self, current_time: float):
        """Update lap timing when player crosses start/finish line."""
        if self.current_lap_start is not None:
            lap_time = current_time - self.current_lap_start
            
            # Update best lap time if this is a new best
            if self.best_lap_time is None or lap_time < self.best_lap_time:
                self.best_lap_time = lap_time
            
            # Reset for next lap
            self.current_lap_start = current_time
        else:
            # First time crossing start line
            self.current_lap_start = current_time
    
    def reset_checkpoints(self):
        """Reset checkpoint progress for a new lap."""
        self.checkpoints_passed = []
        self.current_checkpoint = 0
    
    def pass_checkpoint(self, checkpoint_id: int, current_time: float):
        """Mark a checkpoint as passed."""
        if checkpoint_id not in self.checkpoints_passed:
            self.checkpoints_passed.append(checkpoint_id)
            self.current_checkpoint = checkpoint_id
            
            # If this is the finish line, update lap time
            if checkpoint_id == 0:  # Assuming 0 is the start/finish line
                self.update_lap_time(current_time)