/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.spec.ts",
  ],
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/application/**/*.ts",
    "src/infrastructure/database/repositories/**/*.ts",
    "src/infrastructure/unit-of-work/**/*.ts",
    "src/infrastructure/external/**/*.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          paths: { "@/*": ["<rootDir>/src/*"] },
          jsx: "react-jsx",
          moduleResolution: "bundler",
          module: "esnext",
        },
      },
    ],
  },
  testTimeout: 20000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};

module.exports = config;
