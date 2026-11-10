import { defineConfig } from 'vitest/config';

/**
 * Pure geometry / HTML tests only (no React Native imports), so the Node
 * environment and the worker-thread pool are enough.
 *
 * `preserveSymlinks` skips Vite's Windows real-path probe, which spawns a
 * helper process and is blocked in some sandboxed terminals.
 */
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
  },
});
