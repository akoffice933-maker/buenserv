import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {alias: {'@': sourceDirectory}},
  test: {include: ['src/**/*.test.ts']}
});
