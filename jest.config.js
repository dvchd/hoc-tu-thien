/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/__tests__/(.*)$": "<rootDir>/src/__tests__/$1",
  },
  testMatch: [
    "<rootDir>/src/__tests__/unit/**/*.test.ts",
    "<rootDir>/src/__tests__/e2e/**/*.test.ts",
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
      branches: 60,
      functions: 65,
      lines: 65,
      statements: 65,
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
          paths: {
            "@/*": ["<rootDir>/src/*"],
            "@/__tests__/*": ["<rootDir>/src/__tests__/*"],
          },
          jsx: "react-jsx",
          moduleResolution: "node",
          module: "commonjs",
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
