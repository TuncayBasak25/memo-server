import WebSocket from 'ws';
import Player from './Player';
import { broadcastMessage } from './index';

// Start the game
export function startGame() {
    console.log("Game has started!");
    broadcastMessage(null, JSON.stringify({ cmd: "gameStart", msg: "Game has started!" }));
}

// End the game
export function endGame() {
    console.log("Game has ended!");
    broadcastMessage(null, JSON.stringify({ cmd: "gameEnd", msg: "Game has ended!" }));
}

// Player scores a point
export function scorePoint(player: Player) {
    player.score += 1;
    console.log(`Player ${player.id} scored a point. Total score: ${player.score}`);
    broadcastMessage(null, JSON.stringify({ cmd: "scoreUpdate", playerId: player.id, score: player.score }));
}
