"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadJsonFile = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
