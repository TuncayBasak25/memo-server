import WebSocket, { WebSocketServer } from 'ws';
import { generateClientId } from './utils';
import { handleMessageCommand, handleResponseCommand, handleActionCommand, initiateChallenge, acceptChallenge } from './commands';
import Player from './Player';
import { startGame, endGame, scorePoint } from './gameEvents';
import { sendNotification, broadcastNotification } from './notifications';

const PORT = process.env.PORT || 8080;
const server = new WebSocketServer({ port: Number(PORT) });
const clients: Map<number, WebSocket> = new Map();
const players: Map<number, Player> = new Map();
const gameState = {
    players: {} as { [key: number]: { x: number; y: number } },
    leaderboard: [] as Array<{ id: number; name: string; score: number, status: string }>
};
let activeChallenges: Array<{ challengerId: number; targetId: number; status: string }> = [];
const cooldowns: Map<string, NodeJS.Timeout> = new Map();

server.on('listening', () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

export function broadcastMessage(senderId: number | null, message: string) {
    for (const [clientId, clientSocket] of clients.entries()) {
        if ((senderId === null || clientId !== senderId) && clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(message);
        }
    }
}

function broadcastGameState() {
    updateLeaderboard();
    const state = JSON.stringify({ cmd: "gameState", gameState });
    for (const clientSocket of clients.values()) {
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(state);
        }
    }
}

function updateLeaderboard() {
    gameState.leaderboard = Array.from(players.values())
        .map(player => ({ id: player.id, name: player.name, score: player.score, status: player.status }))
        .sort((a, b) => b.score - a.score);
}

function addPlayer(clientId: number) {
    const player = new Player(clientId);
    players.set(clientId, player);
    gameState.players[clientId] = player.position;
    console.log(`Player ${clientId} added to the game`);
}

function handlePlayerMovement(clientId: number, x: number, y: number) {
    const player = players.get(clientId);
    if (player) {
        player.updatePosition(x, y);
        gameState.players[clientId] = player.position;
    }
}

function handleMessage(socket: WebSocket, clientId: number, message: string) {
    let parsedMessage;
    try {
        parsedMessage = JSON.parse(message);
    } catch (error) {
        console.error(`Error parsing message from client ${clientId}:`, error);
        sendNotification(socket, "error", "Invalid JSON format");
        return;
    }

    const { cmd, ...data } = parsedMessage;
    switch (cmd) {
        case "message":
            handleMessageCommand(socket, clientId, data, broadcastMessage);
            break;
        case "response":
            handleResponseCommand(socket, clientId, data);
            break;
        case "join":
            addPlayer(clientId);
            sendNotification(socket, "success", `Player ${clientId} joined the game`);
            break;
        case "name":
            if (typeof data.name === "string" && data.name.trim().length > 0) {
                const player = players.get(clientId);
                if (player) {
                    player.setName(data.name.trim());
                    sendNotification(socket, "success", `Your name has been set to ${data.name}`);
                    updateLeaderboard();
                }
            } else {
                sendNotification(socket, "error", "Invalid name format");
            }
            break;
        case "action":
            if (data.action === "move" && typeof data.x === "number" && typeof data.y === "number") {
                handlePlayerMovement(clientId, data.x, data.y);
            }
            handleActionCommand(socket, clientId, data, broadcastMessage);
            break;
        case "start":
            startGame();
            broadcastNotification(clients, "info", "The game has started!");
            break;
        case "end":
            endGame();
            broadcastNotification(clients, "info", "The game has ended!");
            break;
        case "score":
            const player = players.get(clientId);
            if (player) {
                scorePoint(player);
                sendNotification(socket, "success", `You scored a point! Total score: ${player.score}`);
            }
            break;
        case "challenge":
            const cooldownKey = `${clientId}-${data.targetId}`;
            if (cooldowns.has(cooldownKey)) {
                sendNotification(socket, "error", "You must wait before challenging this player again.");
                return;
            }

            if (typeof data.targetId === "number" && data.status === "requested") {
                initiateChallenge(socket, clientId, data.targetId);
                const challenger = players.get(clientId);
                const target = players.get(data.targetId);
                if (challenger && target) {
                    challenger.setStatus("challenging");
                    target.setStatus("challenged");
                    activeChallenges.push({ challengerId: clientId, targetId: data.targetId, status: "pending" });
                    broadcastNotification(clients, "info", `Player ${clientId} has challenged Player ${data.targetId}`);
                    setTimeout(() => {
                        if (challenger.status === "challenging" && target.status === "challenged") {
                            challenger.resetStatus();
                            target.resetStatus();
                            sendNotification(clients.get(clientId) as WebSocket, "info", "Your challenge has expired.");
                            sendNotification(clients.get(data.targetId) as WebSocket, "info", "Challenge from Player " + clientId + " has expired.");
                        }
                    }, 30000);
                }
            } else if (typeof data.challengerId === "number" && data.status === "accepted") {
                acceptChallenge(socket, data.challengerId, clientId);
                const challenger = players.get(data.challengerId);
                const accepter = players.get(clientId);
                if (challenger && accepter) {
                    challenger.setStatus("in challenge");
                    accepter.setStatus("in challenge");
                    const challenge = activeChallenges.find(c => c.challengerId === data.challengerId && c.targetId === clientId);
                    if (challenge) challenge.status = "in progress";
                    broadcastNotification(clients, "info", `Player ${clientId} has accepted the challenge from Player ${data.challengerId}`);
                }
            } else {
                sendNotification(socket, "error", "Unknown command.");
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
                    sendNotification(socket, "info", "You have declined the challenge.");
                    broadcastNotification(clients, "info", `Player ${clientId} declined the challenge from Player ${challengerId}`);
                }
                activeChallenges.splice(challengeIndex, 1);
            }
            break;
        case "resetGame":
            gameState.leaderboard = [];
            activeChallenges.length = 0;
            players.forEach(player => player.resetStatus());
            broadcastNotification(clients, "info", "The game has been reset.");
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
                sendNotification(socket, "success", "Your status message has been updated.");
            } else {
                sendNotification(socket, "error", "Invalid status message format or length.");
            }
            break;
        case "cancel":
            const targetId = data.targetId;
            const cancelChallengeIndex = activeChallenges.findIndex(
                c => c.challengerId === clientId && c.targetId === targetId && c.status === "pending"
            );

            if (cancelChallengeIndex !== -1) {
                activeChallenges.splice(cancelChallengeIndex, 1);
                sendNotification(socket, "info", "Your challenge has been canceled.");
                sendNotification(clients.get(targetId) as WebSocket, "info", `Challenge from Player ${clientId} has been canceled.`);
            } else {
                sendNotification(socket, "error", "No pending challenge to cancel.");
            }
            break;
        default:
            sendNotification(socket, "error", "Unknown command.");
            break;
    }
}

server.on('connection', (socket) => {
    const clientId = generateClientId();
    console.log(`Client connected with ID: ${clientId}`);
    clients.set(clientId, socket);
    sendNotification(socket, "info", `Welcome to the game, Player ${clientId}`);
    console.log(`Current active players: ${clients.size}`);

    socket.on('message', (data) => {
        handleMessage(socket, clientId, data.toString());
    });

    socket.on('close', () => {
        console.log(`Player ${clientId} has disconnected. Active players: ${clients.size}`);
        broadcastNotification(clients, "info", `Player ${clientId} has left the game.`);
        clients.delete(clientId);
        players.delete(clientId);
        delete gameState.players[clientId];

        const challengesToRemove = activeChallenges.filter(
            challenge => challenge.challengerId === clientId || challenge.targetId === clientId
        );
        challengesToRemove.forEach(challenge => {
            const otherPlayerId = challenge.challengerId === clientId ? challenge.targetId : challenge.challengerId;
            const otherPlayer = players.get(otherPlayerId);
            if (otherPlayer) otherPlayer.resetStatus();
        });
        activeChallenges = activeChallenges.filter(
            challenge => challenge.challengerId !== clientId && challenge.targetId !== clientId
        );
    });

    socket.on('error', (error) => {
        console.error(`Error with client ${clientId}:`, error);
        clients.delete(clientId);
        players.delete(clientId);
        delete gameState.players[clientId];
    });
});

setInterval(broadcastGameState, 1000);
