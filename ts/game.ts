import { Socket } from "socket-server";
import { words } from "./words";

export class Game {
    clientIdList: number[];

    random: number | string | null = null;

    constructor(...clients: number[]) {
        this.clientIdList = clients;

        this.init();
    }

    get clients() {
        return Socket.getList(this.clientIdList);
    }

    private init() {
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

        if (!ready) setTimeout(() => this.init(), 1000);
        else {
            for (const client of this.clients) {
                client.send("ready", "The game starts in 3 seconds!");
                client.set("score", 0);
                client.set("gaming", true);
            }
        }
        setTimeout(() => this.loop(), 3000);
    }

    private loop() {
        if (!this.random) {
            if (Math.random() > 0.5) {
                this.random = words[Math.floor(Math.random() * words.length)];
            }
            else {
                this.random = Math.floor(Math.random() * words.length);
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
        
        const state: any = {};
        state.scores = {};
        this.clients.forEach(client => {
            state.scores[client.get("name") as string] = client.get("score") as number;
        });
        if (typeof this.random == "string") {
            state.number = words.indexOf(this.random);
        }
        else {
            state.word = words[this.random];
        }
        this.clients.forEach(client => client.send("state", state));
        setTimeout(() => this.loop(), 10);
    }

    submitWord(client: Socket, word: string) {
        let score = client.get("score") as number;
        if (this.random == word) {
            score += 5;
            this.random = null;
        }
        else {
            score -= 10;
        }
        client.set("score", score);
    }

    submitNumber(client: Socket, number: number) {
        let score = client.get("score") as number;
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