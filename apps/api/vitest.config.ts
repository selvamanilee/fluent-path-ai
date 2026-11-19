import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const integration = process.argv.some(a => a.includes('integration')) || !process.argv.some(a => a.includes('tests/unit'));
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    globalSetup: integration ? ['tests/integration/setup.ts'] : [],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://fluentpath:fluentpath@localhost:5432/fluentpath_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
      AGENT_URL: '',
    },
  },
});
