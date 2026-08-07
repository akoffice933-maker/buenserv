import {readFile, stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, '.next/app-build-manifest.json'), 'utf8'));
const limit = 220 * 1024;
const publicRoutes = Object.keys(manifest.pages).filter(route => route === '/[locale]/page' || route.startsWith('/[locale]/'));

if (!publicRoutes.length) throw new Error('No locale app routes found in app-build-manifest.json.');

let failed = false;
for (const route of publicRoutes) {
  const chunks = [...new Set(manifest.pages[route].filter(file => file.endsWith('.js')))];
  const bytes = await Promise.all(chunks.map(async file => gzipSync(await readFile(join(root, '.next', file))).length));
  const total = bytes.reduce((sum, value) => sum + value, 0);
  console.log(`${route}: ${(total / 1024).toFixed(1)} KB gzip across ${chunks.length} initial chunks`);
  if (total > limit) {
    console.error(`Budget exceeded for ${route}: ${(total / 1024).toFixed(1)} KB > ${(limit / 1024).toFixed(0)} KB gzip`);
    failed = true;
  }
}
if (failed) process.exit(1);
