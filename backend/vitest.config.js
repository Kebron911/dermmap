import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    env: {
      JWT_SECRET: 'test-secret-key-for-vitest-only',
      NODE_ENV: 'test',
    },
  },
});
