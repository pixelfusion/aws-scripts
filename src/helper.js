"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadJsonFile = void 0;
const path = require("path");
const fs = require("fs");
/**
 * Loads a file from disk and turns into json
 *
 * @param {String} dirname Base directory
 * @param {String} relativePath Path to the file
 */
const loadJsonFile = (dirname, relativePath) => {
    const absolutePath = path.resolve(dirname, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File does not exist: ${absolutePath}`);
    }
    const jsonData = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(jsonData);
};
exports.loadJsonFile = loadJsonFile;
