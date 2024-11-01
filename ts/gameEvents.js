"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorePoint = exports.endGame = exports.startGame = void 0;
const index_1 = require("./index");
// Start the game
function startGame() {
    console.log("Game has started!");
    (0, index_1.broadcastMessage)(null, JSON.stringify({ cmd: "gameStart", msg: "Game has started!" }));
}
exports.startGame = startGame;
// End the game
function endGame() {
    console.log("Game has ended!");
    (0, index_1.broadcastMessage)(null, JSON.stringify({ cmd: "gameEnd", msg: "Game has ended!" }));
}
exports.endGame = endGame;
// Player scores a point
function scorePoint(player) {
    player.score += 1;
    console.log(`Player ${player.id} scored a point. Total score: ${player.score}`);
    (0, index_1.broadcastMessage)(null, JSON.stringify({ cmd: "scoreUpdate", playerId: player.id, score: player.score }));
}
exports.scorePoint = scorePoint;
