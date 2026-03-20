export default {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: [
    {
      command: 'node examples/express/server.js',
      port: 3000,
      reuseExistingServer: true,
    },
    {
      command: 'node examples/enterprise/server.js',
      port: 3001,
      reuseExistingServer: true,
    },
  ],
};
