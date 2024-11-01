"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotification = exports.sendNotification = void 0;
const ws_1 = __importDefault(require("ws"));
function sendNotification(socket, type, message) {
    socket.send(JSON.stringify({ cmd: "notification", type, message }));
}
exports.sendNotification = sendNotification;
function broadcastNotification(clients, type, message) {
    const notification = JSON.stringify({ cmd: "notification", type, message });
    for (const clientSocket of clients.values()) {
        if (clientSocket.readyState === ws_1.default.OPEN) {
            clientSocket.send(notification);
        }
    }
}
exports.broadcastNotification = broadcastNotification;
