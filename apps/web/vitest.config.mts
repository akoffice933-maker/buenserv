import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {alias: {'@': sourceDirectory, 'server-only': fileURLToPath(new URL('./src/lib/testing-server-only.ts', import.meta.url))}},
  test: {include: ['src/**/*.test.ts']}
});
