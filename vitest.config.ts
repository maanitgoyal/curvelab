import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts'],
    },
  },
});
