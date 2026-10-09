module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/__tests__/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
};
