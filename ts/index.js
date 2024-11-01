"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = void 0;
const ws_1 = __importStar(require("ws"));
const utils_1 = require("./utils");
const commands_1 = require("./commands");
const Player_1 = __importDefault(require("./Player"));
const gameEvents_1 = require("./gameEvents");
const notifications_1 = require("./notifications");
const PORT = process.env.PORT || 8080;
const server = new ws_1.WebSocketServer({ port: Number(PORT) });
const clients = new Map();
const players = new Map();
const gameState = {
    players: {},
    leaderboard: []
};
let activeChallenges = [];
const cooldowns = new Map();
server.on('listening', () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
function broadcastMessage(senderId, message) {
    for (const [clientId, clientSocket] of clients.entries()) {
        if ((senderId === null || clientId !== senderId) && clientSocket.readyState === ws_1.default.OPEN) {
            clientSocket.send(message);
        }
    }
}
exports.broadcastMessage = broadcastMessage;
function broadcastGameState() {
    updateLeaderboard();
    const state = JSON.stringify({ cmd: "gameState", gameState });
    for (const clientSocket of clients.values()) {
        if (clientSocket.readyState === ws_1.default.OPEN) {
            clientSocket.send(state);
        }
    }
}
function updateLeaderboard() {
    gameState.leaderboard = Array.from(players.values())
        .map(player => ({ id: player.id, name: player.name, score: player.score, status: player.status }))
        .sort((a, b) => b.score - a.score);
}
function addPlayer(clientId) {
    const player = new Player_1.default(clientId);
    players.set(clientId, player);
    gameState.players[clientId] = player.position;
    console.log(`Player ${clientId} added to the game`);
}
function handlePlayerMovement(clientId, x, y) {
    const player = players.get(clientId);
    if (player) {
        player.updatePosition(x, y);
        gameState.players[clientId] = player.position;
    }
}
function handleMessage(socket, clientId, message) {
    let parsedMessage;
    try {
        parsedMessage = JSON.parse(message);
    }
    catch (error) {
        console.error(`Error parsing message from client ${clientId}:`, error);
        (0, notifications_1.sendNotification)(socket, "error", "Invalid JSON format");
        return;
    }
    const { cmd } = parsedMessage, data = __rest(parsedMessage, ["cmd"]);
    switch (cmd) {
        case "message":
            (0, commands_1.handleMessageCommand)(socket, clientId, data, broadcastMessage);
            break;
        case "response":
            (0, commands_1.handleResponseCommand)(socket, clientId, data);
            break;
        case "join":
            addPlayer(clientId);
            (0, notifications_1.sendNotification)(socket, "success", `Player ${clientId} joined the game`);
            break;
        case "name":
            if (typeof data.name === "string" && data.name.trim().length > 0) {
                const player = players.get(clientId);
                if (player) {
                    player.setName(data.name.trim());
                    (0, notifications_1.sendNotification)(socket, "success", `Your name has been set to ${data.name}`);
                    updateLeaderboard();
                }
            }
            else {
                (0, notifications_1.sendNotification)(socket, "error", "Invalid name format");
            }
            break;
        case "action":
            if (data.action === "move" && typeof data.x === "number" && typeof data.y === "number") {
                handlePlayerMovement(clientId, data.x, data.y);
            }
            (0, commands_1.handleActionCommand)(socket, clientId, data, broadcastMessage);
            break;
        case "start":
            (0, gameEvents_1.startGame)();
            (0, notifications_1.broadcastNotification)(clients, "info", "The game has started!");
            break;
        case "end":
            (0, gameEvents_1.endGame)();
            (0, notifications_1.broadcastNotification)(clients, "info", "The game has ended!");
            break;
        case "score":
            const player = players.get(clientId);
            if (player) {
                (0, gameEvents_1.scorePoint)(player);
                (0, notifications_1.sendNotification)(socket, "success", `You scored a point! Total score: ${player.score}`);
            }
            break;
        case "challenge":
            const cooldownKey = `${clientId}-${data.targetId}`;
            if (cooldowns.has(cooldownKey)) {
                (0, notifications_1.sendNotification)(socket, "error", "You must wait before challenging this player again.");
                return;
            }
            if (typeof data.targetId === "number" && data.status === "requested") {
                (0, commands_1.initiateChallenge)(socket, clientId, data.targetId);
                const challenger = players.get(clientId);
                const target = players.get(data.targetId);
                if (challenger && target) {
                    challenger.setStatus("challenging");
                    target.setStatus("challenged");
                    activeChallenges.push({ challengerId: clientId, targetId: data.targetId, status: "pending" });
                    (0, notifications_1.broadcastNotification)(clients, "info", `Player ${clientId} has challenged Player ${data.targetId}`);
                    setTimeout(() => {
                        if (challenger.status === "challenging" && target.status === "challenged") {
                            challenger.resetStatus();
                            target.resetStatus();
                            (0, notifications_1.sendNotification)(clients.get(clientId), "info", "Your challenge has expired.");
                            (0, notifications_1.sendNotification)(clients.get(data.targetId), "info", "Challenge from Player " + clientId + " has expired.");
                        }
                    }, 30000);
                }
            }
            else if (typeof data.challengerId === "number" && data.status === "accepted") {
                (0, commands_1.acceptChallenge)(socket, data.challengerId, clientId);
                const challenger = players.get(data.challengerId);
                const accepter = players.get(clientId);
                if (challenger && accepter) {
                    challenger.setStatus("in challenge");
                    accepter.setStatus("in challenge");
                    const challenge = activeChallenges.find(c => c.challengerId === data.challengerId && c.targetId === clientId);
                    if (challenge)
                        challenge.status = "in progress";
                    (0, notifications_1.broadcastNotification)(clients, "info", `Player ${clientId} has accepted the challenge from Player ${data.challengerId}`);
                }
            }
            else {
                (0, notifications_1.sendNotification)(socket, "error", "Unknown command.");
            }
            break;
        case "decline":
            const challengerId = data.challengerId;
            const challengeIndex = activeChallenges.findIndex(c => c.challengerId === challengerId && c.targetId === clientId);
            if (challengeIndex !== -1) {
                const challenger = players.get(challengerId);
                const target = players.get(clientId);
                if (challenger && target) {
                    challenger.resetStatus();
                    target.resetStatus();
                    (0, notifications_1.sendNotification)(socket, "info", "You have declined the challenge.");
                    (0, notifications_1.broadcastNotification)(clients, "info", `Player ${clientId} declined the challenge from Player ${challengerId}`);
                }
                activeChallenges.splice(challengeIndex, 1);
            }
            break;
        case "resetGame":
            gameState.leaderboard = [];
            activeChallenges.length = 0;
            players.forEach(player => player.resetStatus());
            (0, notifications_1.broadcastNotification)(clients, "info", "The game has been reset.");
            break;
        case "playerList":
            const playerList = Array.from(players.values()).map(player => ({
                id: player.id,
                name: player.name,
                status: player.status,
                score: player.score
            }));
            socket.send(JSON.stringify({ cmd: "playerList", players: playerList }));
            break;
        case "gameSummary":
            const summary = {
                players: Array.from(players.values()).map(player => ({
                    id: player.id,
                    name: player.name,
                    score: player.score,
                    status: player.status,
                    position: player.position,
                    statusMessage: player.statusMessage
                })),
                leaderboard: gameState.leaderboard
            };
            socket.send(JSON.stringify({ cmd: "gameSummary", summary }));
            break;
        case "setStatusMessage":
            const statusMessagePlayer = players.get(clientId);
            if (statusMessagePlayer && typeof data.message === "string" && data.message.trim().length <= 100) {
                statusMessagePlayer.setStatusMessage(data.message.trim());
                (0, notifications_1.sendNotification)(socket, "success", "Your status message has been updated.");
            }
            else {
                (0, notifications_1.sendNotification)(socket, "error", "Invalid status message format or length.");
            }
            break;
        case "cancel":
            const targetId = data.targetId;
            const cancelChallengeIndex = activeChallenges.findIndex(c => c.challengerId === clientId && c.targetId === targetId && c.status === "pending");
            if (cancelChallengeIndex !== -1) {
                activeChallenges.splice(cancelChallengeIndex, 1);
                (0, notifications_1.sendNotification)(socket, "info", "Your challenge has been canceled.");
                (0, notifications_1.sendNotification)(clients.get(targetId), "info", `Challenge from Player ${clientId} has been canceled.`);
            }
            else {
                (0, notifications_1.sendNotification)(socket, "error", "No pending challenge to cancel.");
            }
            break;
        default:
            (0, notifications_1.sendNotification)(socket, "error", "Unknown command.");
            break;
    }
}
server.on('connection', (socket) => {
    const clientId = (0, utils_1.generateClientId)();
    console.log(`Client connected with ID: ${clientId}`);
    clients.set(clientId, socket);
    (0, notifications_1.sendNotification)(socket, "info", `Welcome to the game, Player ${clientId}`);
    console.log(`Current active players: ${clients.size}`);
    socket.on('message', (data) => {
        handleMessage(socket, clientId, data.toString());
    });
    socket.on('close', () => {
        console.log(`Player ${clientId} has disconnected. Active players: ${clients.size}`);
        (0, notifications_1.broadcastNotification)(clients, "info", `Player ${clientId} has left the game.`);
        clients.delete(clientId);
        players.delete(clientId);
        delete gameState.players[clientId];
        const challengesToRemove = activeChallenges.filter(challenge => challenge.challengerId === clientId || challenge.targetId === clientId);
        challengesToRemove.forEach(challenge => {
            const otherPlayerId = challenge.challengerId === clientId ? challenge.targetId : challenge.challengerId;
            const otherPlayer = players.get(otherPlayerId);
            if (otherPlayer)
                otherPlayer.resetStatus();
        });
        activeChallenges = activeChallenges.filter(challenge => challenge.challengerId !== clientId && challenge.targetId !== clientId);
    });
    socket.on('error', (error) => {
        console.error(`Error with client ${clientId}:`, error);
        clients.delete(clientId);
        players.delete(clientId);
        delete gameState.players[clientId];
    });
});
setInterval(broadcastGameState, 1000);
