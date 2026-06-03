module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!(better-sqlite3)/)"],
  testMatch: ["**/__tests__/**/*.test.js"],
};
