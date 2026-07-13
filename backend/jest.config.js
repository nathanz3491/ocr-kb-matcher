module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/tests/'],
  moduleNameMapper: {
    // uuid v13 is ESM-only; mock it for test compatibility
    '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
  },
  collectCoverageFrom: [
    'src/middleware/quota.ts',
    'src/middleware/auth.ts',
    'src/services/userService.ts',
    'src/routes/admin.ts',
  ],
  coverageThreshold: {
    'src/middleware/quota.ts': { lines: 60, functions: 60, statements: 60 },
    'src/middleware/auth.ts': { lines: 60, functions: 50, statements: 60 },
    'src/services/userService.ts': { lines: 60, functions: 60, statements: 60 },
    'src/routes/admin.ts': { lines: 60, functions: 60, statements: 60 },
  },
};
