"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptChallenge = exports.initiateChallenge = exports.handleActionCommand = exports.handleResponseCommand = exports.handleMessageCommand = void 0;
const index_1 = require("./index");
function handleMessageCommand(socket, clientId, data, broadcast) {
    if (typeof data.text === 'string') {
        console.log(`Received message from client ${clientId}: ${data.text}`);
        const response = JSON.stringify({ clientId, text: data.text });
        broadcast(clientId, response);
    }
    else {
        socket.send(JSON.stringify({ error: "Invalid message format" }));
    }
}
exports.handleMessageCommand = handleMessageCommand;
function handleResponseCommand(socket, clientId, data) {
    if (typeof data.data === 'string') {
        console.log(`Received response from client ${clientId}: ${data.data}`);
        socket.send(JSON.stringify({ msg: "Response received", data: data.data }));
    }
    else {
        socket.send(JSON.stringify({ error: "Invalid response format" }));
    }
}
exports.handleResponseCommand = handleResponseCommand;
function handleActionCommand(socket, clientId, data, broadcast) {
    if (typeof data.action === 'string') {
        console.log(`Action from client ${clientId}: ${data.action}`);
        const actionMessage = JSON.stringify({ clientId, action: data.action });
        broadcast(clientId, actionMessage);
    }
    else {
        socket.send(JSON.stringify({ error: "Invalid action format" }));
    }
}
exports.handleActionCommand = handleActionCommand;
function initiateChallenge(socket, challengerId, targetId) {
    const message = JSON.stringify({ cmd: "challenge", challengerId, targetId, status: "requested" });
    (0, index_1.broadcastMessage)(null, message);
    console.log(`Player ${challengerId} challenged Player ${targetId}`);
}
exports.initiateChallenge = initiateChallenge;
function acceptChallenge(socket, challengerId, targetId) {
    const message = JSON.stringify({ cmd: "challenge", challengerId, targetId, status: "accepted" });
    (0, index_1.broadcastMessage)(null, message);
    console.log(`Player ${targetId} accepted the challenge from Player ${challengerId}`);
}
exports.acceptChallenge = acceptChallenge;
