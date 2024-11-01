import WebSocket from 'ws';
import { broadcastMessage } from './index';
import Player from './Player';

export function handleMessageCommand(socket: WebSocket, clientId: number, data: any, broadcast: Function) {
    if (typeof data.text === 'string') {
        console.log(`Received message from client ${clientId}: ${data.text}`);
        const response = JSON.stringify({ clientId, text: data.text });
        broadcast(clientId, response);
    } else {
        socket.send(JSON.stringify({ error: "Invalid message format" }));
    }
}

export function handleResponseCommand(socket: WebSocket, clientId: number, data: any) {
    if (typeof data.data === 'string') {
        console.log(`Received response from client ${clientId}: ${data.data}`);
        socket.send(JSON.stringify({ msg: "Response received", data: data.data }));
    } else {
        socket.send(JSON.stringify({ error: "Invalid response format" }));
    }
}

export function handleActionCommand(socket: WebSocket, clientId: number, data: any, broadcast: Function) {
    if (typeof data.action === 'string') {
        console.log(`Action from client ${clientId}: ${data.action}`);
        const actionMessage = JSON.stringify({ clientId, action: data.action });
        broadcast(clientId, actionMessage);
    } else {
        socket.send(JSON.stringify({ error: "Invalid action format" }));
    }
}

export function initiateChallenge(socket: WebSocket, challengerId: number, targetId: number) {
    const message = JSON.stringify({ cmd: "challenge", challengerId, targetId, status: "requested" });
    broadcastMessage(null, message);
    console.log(`Player ${challengerId} challenged Player ${targetId}`);
}

export function acceptChallenge(socket: WebSocket, challengerId: number, targetId: number) {
    const message = JSON.stringify({ cmd: "challenge", challengerId, targetId, status: "accepted" });
    broadcastMessage(null, message);
    console.log(`Player ${targetId} accepted the challenge from Player ${challengerId}`);
}
