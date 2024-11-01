"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Player {
    constructor(id, name = "Guest") {
        this.status = "idle";
        this.statusMessage = ""; // New status message property
        this.id = id;
        this.name = name;
        this.position = { x: 0, y: 0 }; // Starting position
        this.score = 0;
    }
    // Method to update player position
    updatePosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }
    // Method to update player name
    setName(name) {
        this.name = name;
    }
    // Method to update player status
    setStatus(newStatus) {
        this.status = newStatus;
    }
    // Method to reset player status
    resetStatus() {
        this.status = "idle";
    }
    // Method to update player's status message
    setStatusMessage(message) {
        this.statusMessage = message;
    }
}
exports.default = Player;
