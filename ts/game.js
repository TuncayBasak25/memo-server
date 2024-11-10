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
            const name = client.data.get("name");
            if (!name) {
                ready = false;
                client.sendGet("name");
            }
            if (name == "") {
                ready = false;
                client.sendError("Name has to be not empty!");
                client.sendGet("name");
            }
        }
        if (!ready)
            return setTimeout(() => this.init(), 1000);
        else {
            for (const client of this.clients) {
                client.sendAction("ready", "The game starts in 3 seconds!");
                client.data.set("score", 0);
                client.data.set("gaming", true);
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
            const word = client.data.get("word");
            const number = client.data.get("number");
            if (typeof this.random == "string" && word) {
                this.submitWord(client, word);
            }
            else if (typeof this.random == "number" && number) {
                this.submitNumber(client, number);
            }
            client.data.delete("word");
            client.data.delete("number");
        });
        const state = {};
        state.scores = {};
        this.clients.forEach(client => {
            state.scores[client.data.get("name")] = client.data.get("score");
        });
        if (typeof this.random == "string") {
            state.number = words_1.words.indexOf(this.random);
        }
        else {
            state.word = words_1.words[this.random];
        }
        this.clients.forEach(client => client.sendSet("state", state));
        setTimeout(() => this.loop(), 100);
    }
    submitWord(client, word) {
        let score = client.data.get("score");
        if (this.random == word) {
            score += 5;
            this.random = null;
        }
        else {
            score -= 10;
        }
        client.data.set("score", score);
    }
    submitNumber(client, number) {
        let score = client.data.get("score");
        if (this.random == number) {
            score += 5;
            this.random = null;
        }
        else {
            score -= 10;
        }
        client.data.set("score", score);
    }
}
exports.Game = Game;
