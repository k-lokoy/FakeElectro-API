/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const { defaults: tsjPreset } = require('ts-jest/presets')

module.exports = {
    preset: "@shelf/jest-mongodb",
    transform: tsjPreset.transform,
    testMatch: [
      "**/?(*.)+(test).ts"
    ],
    modulePathIgnorePatterns: [
      "src/index.ts"
    ],
    collectCoverage: true,
    resetMocks: true,
    clearMocks: true,
    watchPathIgnorePatterns: ['globalConfig'],
    forceExit: true,
    verbose: true,
    maxWorkers: 1
}