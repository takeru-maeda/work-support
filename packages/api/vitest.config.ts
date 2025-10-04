import { defineConfig } from 'vitest/config';
import { config } from 'dotenv'; // Import config from dotenv
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000, // Increase test timeout to 10 seconds
    env: {
      ...config({ path: path.resolve(__dirname, '.dev.vars') }).parsed, // Load .dev.vars explicitly
    },
  },
});