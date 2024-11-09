"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const socket_server_1 = require("socket-server");
const words_1 = require("./words");
class Game {
    constructor(...clients) {
        this.random = null;
        this.clientIdList = clients;
        this.init();
    }
    get clients() {
        return socket_server_1.Socket.getList(this.clientIdList);
    }
    init() {
        let ready = true;
        for (const client of this.clients) {
            const name = client.get("name");
            if (!name) {
                ready = false;
                client.query("name");
            }
            if (name == "") {
                ready = false;
                client.error("Name has to be not empty!");
                client.query("name");
            }
        }
        if (!ready)
            setTimeout(() => this.init(), 1000);
        else {
            for (const client of this.clients) {
                client.send("ready", "The game starts in 3 seconds!");
                client.set("score", 0);
                client.set("gaming", true);
            }
        }
        setTimeout(() => this.loop(), 3000);
    }
    loop() {
        if (!this.random) {
            if (Math.random() > 0.5) {
                this.random = words_1.words[Math.floor(Math.random() * words_1.words.length)];
            }
            else {
                this.random = Math.floor(Math.random() * words_1.words.length);
            }
        }
        this.clients.forEach(client => {
            const word = client.get("word");
            const number = client.get("number");
            if (typeof this.random == "string" && word) {
                this.submitWord(client, word);
            }
            else if (typeof this.random == "number" && number) {
                this.submitNumber(client, number);
            }
            client.delete("word");
            client.delete("number");
        });
        const state = {};
        state.scores = {};
        this.clients.forEach(client => {
            state.scores[client.get("name")] = client.get("score");
        });
        if (typeof this.random == "string") {
            state.number = words_1.words.indexOf(this.random);
        }
        else {
            state.word = words_1.words[this.random];
        }
        this.clients.forEach(client => client.send("state", state));
        setTimeout(() => this.loop(), 10);
    }
    submitWord(client, word) {
        let score = client.get("score");
        if (this.random == word) {
            score += 5;
            this.random = null;
        }
        else {
            score -= 10;
        }
        client.set("score", score);
    }
    submitNumber(client, number) {
        let score = client.get("score");
        if (this.random == number) {
            score += 5;
            this.random = null;
        }
        else {
            score -= 10;
        }
        client.set("score", score);
    }
}
exports.Game = Game;
