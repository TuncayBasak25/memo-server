"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_server_1 = require("socket-server");
const words_1 = require("./words"); // Import the list of words with their respective indices
const playersQueue = []; // Queue to store players waiting for a match
const games = []; // Active games
// Start the WebSocket server
socket_server_1.Socket.listen(Number(process.env.PORT || 8080));
// Add action to register a player
socket_server_1.Socket.actions.register = (socket, body) => {
    const name = body === null || body === void 0 ? void 0 : body.name;
    if (!name) {
        return socket.sendError('Name is required for registration.');
    }
    const player = { id: socket.id, name, socket, score: 0 };
    playersQueue.push(player);
    console.log(`Player ${name} registered (ID: ${socket.id})`);
    // Match players if there are at least two in the queue
    if (playersQueue.length >= 2) {
        startGame();
    }
    else {
        socket.sendAction('waiting', { message: 'Waiting for another player...' });
    }
};
// Add action to handle answer submissions
socket_server_1.Socket.actions.submitAnswer = (socket, body) => {
    const game = games.find(g => g.player1.id === socket.id || g.player2.id === socket.id);
    if (!game) {
        return socket.sendError('You are not in an active game.');
    }
    const { player1, player2 } = game;
    const opponent = player1.id === socket.id ? player2 : player1;
    const player = player1.id === socket.id ? player1 : player2;
    const { answer } = body;
    if (!answer) {
        return socket.sendError('Answer is required.');
    }
    const correctIndex = game.currentQuestionIndex;
    const correctWord = words_1.words[correctIndex];
    const isCorrect = parseInt(answer) === correctIndex || answer.toLowerCase() === correctWord.toLowerCase();
    const currentTime = Date.now();
    const responseTime = (currentTime - (player.startTime || 0)) / 1000; // Response time in seconds
    if (isCorrect) {
        // Calculate points based on response time
        let points = 1;
        if (responseTime <= 3)
            points = 10;
        else if (responseTime <= 10)
            points = 10 - Math.floor(responseTime - 3);
        player.score += points;
        player.socket.sendAction('updateScore', { score: player.score });
        opponent.socket.sendAction('updateScore', { score: opponent.score });
        player.socket.sendAction('notification', {
            message: `Correct! You gain ${points} points.`,
        });
        opponent.socket.sendAction('notification', {
            message: `${player.name} answered correctly!`,
        });
        player.startTime = undefined;
    }
    else {
        player.score -= 10;
        player.socket.sendAction('updateScore', { score: player.score });
        opponent.socket.sendAction('updateScore', { score: opponent.score });
        player.socket.sendAction('notification', {
            message: `Wrong! You lose 10 points.`,
        });
        opponent.socket.sendAction('notification', {
            message: `${player.name} answered incorrectly.`,
        });
    }
    askNextQuestion(game);
};
// Handle disconnections
socket_server_1.Socket.actions.disconnect = (socket) => {
    const gameIndex = games.findIndex(g => g.player1.id === socket.id || g.player2.id === socket.id);
    if (gameIndex !== -1) {
        const game = games[gameIndex];
        const remainingPlayer = game.player1.id === socket.id ? game.player2 : game.player1;
        remainingPlayer.socket.sendAction('notification', {
            message: `Your opponent disconnected. Searching for a new game...`,
        });
        // Remove the game and requeue the remaining player
        games.splice(gameIndex, 1);
        playersQueue.push(remainingPlayer);
    }
};
// Start a new game
function startGame() {
    const player1 = playersQueue.shift();
    const player2 = playersQueue.shift();
    const game = {
        player1,
        player2,
        currentQuestionIndex: -1, // Initialize with invalid index
    };
    games.push(game);
    askNextQuestion(game);
}
// Send the next question to players
function askNextQuestion(game) {
    const questionIndex = Math.floor(Math.random() * words_1.words.length);
    game.currentQuestionIndex = questionIndex;
    const question = Math.random() > 0.5
        ? { type: 'word', prompt: `Quel est le mot pour le numéro ${questionIndex} ?` }
        : { type: 'index', prompt: `Quel est le numéro pour le mot "${words_1.words[questionIndex]}" ?` };
    const { player1, player2 } = game;
    player1.startTime = Date.now();
    player2.startTime = Date.now();
    player1.socket.sendAction('updateQuestion', {
        prompt: question.prompt,
        opponentName: player2.name,
        score: player1.score,
        opponentScore: player2.score,
    });
    player2.socket.sendAction('updateQuestion', {
        prompt: question.prompt,
        opponentName: player1.name,
        score: player2.score,
        opponentScore: player1.score,
    });
}
socket_server_1.Socket.actions.submitAnswer = (socket, body) => {
    const game = games.find(g => g.player1.id === socket.id || g.player2.id === socket.id);
    if (!game) {
        return socket.sendError('You are not in an active game.');
    }
    const { player1, player2 } = game;
    const player = player1.id === socket.id ? player1 : player2;
    const opponent = player1.id === socket.id ? player2 : player1;
    const { answer } = body;
    if (!answer) {
        return socket.sendError('Answer is required.');
    }
    const correctIndex = game.currentQuestionIndex;
    const correctWord = words_1.words[correctIndex];
    const isCorrect = parseInt(answer) === correctIndex || answer.toLowerCase() === correctWord.toLowerCase();
    const currentTime = Date.now();
    const responseTime = (currentTime - (player.startTime || 0)) / 1000; // Response time in seconds
    if (isCorrect) {
        let points = 1;
        if (responseTime <= 3)
            points = 10;
        else if (responseTime <= 10)
            points = 10 - Math.floor(responseTime - 3);
        player.score += points;
        player.socket.sendAction('updateScore', { score: player.score });
        opponent.socket.sendAction('updateScore', { score: opponent.score });
        player.socket.sendAction('notification', {
            message: `Correct! You gain ${points} points.`,
        });
        opponent.socket.sendAction('notification', {
            message: `${player.name} answered correctly!`,
            type: 'opponentSuccess',
        });
        player.startTime = undefined;
    }
    else {
        player.score -= 10;
        player.socket.sendAction('updateScore', { score: player.score });
        opponent.socket.sendAction('updateScore', { score: opponent.score });
        player.socket.sendAction('notification', {
            message: `Wrong! You lose 10 points.`,
        });
        opponent.socket.sendAction('notification', {
            message: `${player.name} answered incorrectly.`,
            type: 'opponentFailure',
        });
    }
    askNextQuestion(game);
};
