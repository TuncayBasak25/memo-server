"use strict";
// src/utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClientId = void 0;
let clientIdCounter = 1;
function generateClientId() {
    return clientIdCounter++;
}
exports.generateClientId = generateClientId;
