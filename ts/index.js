"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_server_1 = require("socket-server");
socket_server_1.Socket.listen(Number(process.env.PORT || 8080));
// setInterval(() => {
//     const disponible: number[] = [];
//     for (const [entry, client] of Socket.sockets.entries()) {
//         if (!client.data.get("gaming") && disponible.indexOf(entry)) disponible.push(entry);
//     }
//     if (disponible.length > 1) {
//         new Game(...disponible);
//     }
// }, 1000);
socket_server_1.Socket.actions.keydown = (client, keycode) => {
    socket_server_1.Socket.sockets.forEach(socket => socket != client && socket.sendAction("keydown", keycode));
};
