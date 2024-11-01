import WebSocket from 'ws';

export function sendNotification(socket: WebSocket, type: string, message: string) {
    socket.send(JSON.stringify({ cmd: "notification", type, message }));
}

export function broadcastNotification(clients: Map<number, WebSocket>, type: string, message: string) {
    const notification = JSON.stringify({ cmd: "notification", type, message });
    for (const clientSocket of clients.values()) {
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(notification);
        }
    }
}
