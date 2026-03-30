import { EXTENSION_NAME } from '../constants.js';

export function log(...args) {
    console.log(`[${EXTENSION_NAME}]`, ...args);
}

export function warn(...args) {
    console.warn(`[${EXTENSION_NAME}]`, ...args);
}

export function error(...args) {
    console.error(`[${EXTENSION_NAME}]`, ...args);
}
