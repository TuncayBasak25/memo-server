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

Socket.actions.keypress = (client, keycode) => {
    if (typeof keycode != "number") return;

    let key = "";
    if (keycode == 37) key = "left"
    if (keycode == 39) key = "right"
    if (keycode == 38) key = "up"
    if (keycode == 40) key = "down"
    Socket.sockets.forEach(socket => socket != client && socket.sendSet(key, true));
}

Socket.actions.keyrelease = (client, keycode) => {
    if (typeof keycode != "number") return;

    let key = "";
    if (keycode == 37) key = "left"
    if (keycode == 39) key = "right"
    if (keycode == 38) key = "up"
    if (keycode == 40) key = "down"
    Socket.sockets.forEach(socket => socket != client && socket.sendSet(key, false));
}