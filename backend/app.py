from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import asyncio
import uvicorn
import logging
from typing import Dict

from game_state import GameState
from player import Player

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Mount the frontend directory as static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Initialize game state
game_state = GameState()

# Store active WebSocket connections
connected_players: Dict[str, Player] = {}

@app.get("/", response_class=HTMLResponse)
async def get_root():
    """Serve the main HTML file."""
    with open("../frontend/index.html", "r") as f:
        return f.read()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Handle WebSocket connections for game clients."""
    await websocket.accept()
    player_id = None
    
    try:
        # First message should be player initialization
        init_data = await websocket.receive_text()
        init_json = json.loads(init_data)
        
        # Extract player info from initialization data
        player_id = init_json.get("playerId", f"player_{len(connected_players) + 1}")
        player_name = init_json.get("playerName", f"Player {len(connected_players) + 1}")
        vehicle_type = init_json.get("vehicleType", "default")
        
        # Create new player and add to game state
        player = Player(
            id=player_id,
            name=player_name,
            vehicle_type=vehicle_type,
            websocket=websocket
        )
        connected_players[player_id] = player
        game_state.add_player(player)
        
        # Send initial game state to the player
        await websocket.send_json({
            "type": "init",
            "playerId": player_id,
            "gameState": game_state.get_public_state(),
            "worldSeed": game_state.world_seed
        })
        
        # Broadcast player joined event
        await broadcast_message({
            "type": "playerJoined",
            "playerId": player_id,
            "playerName": player_name,
            "vehicleType": vehicle_type,
            "position": player.position,
            "rotation": player.rotation
        })
        
        logger.info(f"Player {player_id} ({player_name}) connected")
        
        # Main message handling loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process message based on type
            message_type = message.get("type", "")
            
            if message_type == "position":
                # Update player position
                player.position = message.get("position", player.position)
                player.rotation = message.get("rotation", player.rotation)
                player.velocity = message.get("velocity", player.velocity)
                player.last_update = game_state.current_time
                
                # Broadcast position update to other players
                await broadcast_message({
                    "type": "playerPosition",
                    "playerId": player_id,
                    "position": player.position,
                    "rotation": player.rotation,
                    "velocity": player.velocity
                }, exclude=player_id)
                
            elif message_type == "chat":
                # Handle chat messages
                await broadcast_message({
                    "type": "chat",
                    "playerId": player_id,
                    "playerName": player.name,
                    "message": message.get("message", "")
                })
                
            elif message_type == "ping":
                # Handle ping/pong for latency measurement
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": message.get("timestamp")
                })
    
    except WebSocketDisconnect:
        logger.info(f"Player {player_id} disconnected")
        if player_id:
            if player_id in connected_players:
                del connected_players[player_id]
            game_state.remove_player(player_id)
            
            # Broadcast player left event
            await broadcast_message({
                "type": "playerLeft",
                "playerId": player_id
            })
    
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            game_state.remove_player(player_id)

async def broadcast_message(message, exclude=None):
    """Broadcast a message to all connected players except the excluded one."""
    for player_id, player in connected_players.items():
        if player_id != exclude:
            try:
                await player.websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {player_id}: {e}")

async def game_loop():
    """Main game loop that runs server-side game logic."""
    while True:
        # Update game state
        game_state.update()
        
        # Perform any server-side calculations
        
        # Sleep to maintain desired tick rate (20 ticks per second)
        await asyncio.sleep(0.05)  # 50ms per tick

@app.on_event("startup")
async def startup_event():
    """Start the game loop when the app starts."""
    asyncio.create_task(game_loop())

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)