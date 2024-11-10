import { Socket } from "socket-server";
import { Game } from "./game";

Socket.listen(Number(process.env.PORT || 8080));

// setInterval(() => {
//     const disponible: number[] = [];

//     for (const [entry, client] of Socket.sockets.entries()) {
//         if (!client.data.get("gaming") && disponible.indexOf(entry)) disponible.push(entry);
//     }

//     if (disponible.length > 1) {
//         new Game(...disponible);
//     }
// }, 1000);

Socket.actions.keydown = (client, keycode) => {
    Socket.sockets.forEach(socket => socket != client && socket.sendAction("keydown", keycode));
}
