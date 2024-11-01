export default class Player {
    id: number;
    name: string;
    position: { x: number; y: number };
    score: number;
    status: string = "idle";
    statusMessage: string = ""; // New status message property

    constructor(id: number, name: string = "Guest") {
        this.id = id;
        this.name = name;
        this.position = { x: 0, y: 0 }; // Starting position
        this.score = 0;
    }

    // Method to update player position
    updatePosition(x: number, y: number) {
        this.position.x = x;
        this.position.y = y;
    }

    // Method to update player name
    setName(name: string) {
        this.name = name;
    }

    // Method to update player status
    setStatus(newStatus: string) {
        this.status = newStatus;
    }

    // Method to reset player status
    resetStatus() {
        this.status = "idle";
    }

    // Method to update player's status message
    setStatusMessage(message: string) {
        this.statusMessage = message;
    }
}
