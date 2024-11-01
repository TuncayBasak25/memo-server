// src/utils.ts

let clientIdCounter = 1;

export function generateClientId(): number {
    return clientIdCounter++;
}
