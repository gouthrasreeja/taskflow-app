module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["**/tests/**/*.test.js"], // integration tests only; unit tests are *.unit.js (node:test)
  testTimeout: 20000,
};
