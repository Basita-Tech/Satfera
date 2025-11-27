module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testTimeout: 60000, // 60 seconds for performance tests
  verbose: true,
  collectCoverage: false, // Disable coverage for performance tests
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reports',
      filename: 'api-performance-report.html',
      expand: true
    }]
  ]
};