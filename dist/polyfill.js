"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
if (typeof global.crypto === 'undefined') {
    global.crypto = node_crypto_1.webcrypto;
}
//# sourceMappingURL=polyfill.js.map