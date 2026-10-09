module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: { strict: false, allowJs: true } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(three|@noble)/)',
  ],
};
