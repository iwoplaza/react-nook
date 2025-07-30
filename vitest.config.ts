import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: false,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    },
    environment: 'jsdom',
  },
});
