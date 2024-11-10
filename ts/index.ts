import { Socket } from 'socket-server';
import { words } from './words'; // Import the list of words with their respective indices

type Player = {
    id: number;
    name: string;
    socket: Socket;
    score: number; // Player score
    startTime?: number; // Timestamp when the question was sent
};

type Game = {
    player1: Player;
    player2: Player;
    currentQuestionIndex: number; // The current word index in the game
};

const playersQueue: Player[] = []; // Queue to store players waiting for a match
const games: Game[] = []; // Active games

// Start the WebSocket server
Socket.listen(Number(process.env.PORT || 8080));

// Add action to register a player
Socket.actions.register = (socket: Socket, body: { name?: string }) => {
    const name = body?.name;
    if (!name) {
        return socket.sendError('Name is required for registration.');
    }

    const player: Player = { id: socket.id, name, socket, score: 0 };
    playersQueue.push(player);
    console.log(`Player ${name} registered (ID: ${socket.id})`);

    // Match players if there are at least two in the queue
    if (playersQueue.length >= 2) {
        startGame();
    } else {
        socket.sendAction('waiting', { message: 'Waiting for another player...' });
    }
};

// Add action to handle answer submissions
Socket.actions.submitAnswer = (socket: Socket, body: { answer?: string }) => {
    const game = games.find(
        g => g.player1.id === socket.id || g.player2.id === socket.id
    );

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
    const correctWord = words[correctIndex];
    const isCorrect =
        parseInt(answer) === correctIndex || answer.toLowerCase() === correctWord.toLowerCase();

    const currentTime = Date.now();
    const responseTime = (currentTime - (player.startTime || 0)) / 1000; // Response time in seconds

    if (isCorrect) {
        // Calculate points based on response time
        let points = 1;
        if (responseTime <= 3) points = 10;
        else if (responseTime <= 10) points = 10 - Math.floor(responseTime - 3);

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
    } else {
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
Socket.actions.disconnect = (socket: Socket) => {
    const gameIndex = games.findIndex(
        g => g.player1.id === socket.id || g.player2.id === socket.id
    );

    if (gameIndex !== -1) {
        const game = games[gameIndex];
        const remainingPlayer =
            game.player1.id === socket.id ? game.player2 : game.player1;

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
    const player1 = playersQueue.shift()!;
    const player2 = playersQueue.shift()!;

    const game: Game = {
        player1,
        player2,
        currentQuestionIndex: -1, // Initialize with invalid index
    };
    games.push(game);

    askNextQuestion(game);
}

// Send the next question to players
function askNextQuestion(game: Game) {
    const questionIndex = Math.floor(Math.random() * words.length);
    game.currentQuestionIndex = questionIndex;

    const question = Math.random() > 0.5
        ? { type: 'word', prompt: `Quel est le mot pour le numéro ${questionIndex} ?` }
        : { type: 'index', prompt: `Quel est le numéro pour le mot "${words[questionIndex]}" ?` };

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

Socket.actions.submitAnswer = (socket: Socket, body: { answer?: string }) => {
    const game = games.find(
        g => g.player1.id === socket.id || g.player2.id === socket.id
    );

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
    const correctWord = words[correctIndex];
    const isCorrect =
        parseInt(answer) === correctIndex || answer.toLowerCase() === correctWord.toLowerCase();

    const currentTime = Date.now();
    const responseTime = (currentTime - (player.startTime || 0)) / 1000; // Response time in seconds

    if (isCorrect) {
        let points = 1;
        if (responseTime <= 3) points = 10;
        else if (responseTime <= 10) points = 10 - Math.floor(responseTime - 3);

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
    } else {
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
