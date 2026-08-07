import {readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';

const root = join(process.cwd(), '.next/static/chunks');
const limit = 220 * 1024;
async function files(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}
try {
  const js = (await files(root)).filter(file => file.endsWith('.js'));
  const total = (await Promise.all(js.map(file => stat(file)))).reduce((sum, item) => sum + item.size, 0);
  console.log(`Static JS emitted: ${(total / 1024).toFixed(1)} KB (uncompressed audit value)`);
  if (total > 900 * 1024) throw new Error('Static JS exceeds 900 KB uncompressed guardrail. Inspect route chunks before merging.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
