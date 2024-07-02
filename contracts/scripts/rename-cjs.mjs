/** Renames `.js` files in the /lib/cjs folder to `.cjs` to appease ESM clients. */

import { promises as fs } from 'node:fs';
import url from 'node:url';

const buildDir = "./lib/cjs";

for (const rawFilename of await fs.readdir(buildDir)) {
  const filename = buildDir + '/' + rawFilename;
  if (!/\.js$/.test(filename)) continue;
  const cjs = await fs.readFile(filename, 'utf-8');
  await fs.writeFile(
    filename.replace(/\.js$/, '.cjs'),
    cjs.replaceAll(/require\("(.\/[\w_\-.]+)\.js"\)/g, 'require("$1.cjs")'),
  );
  await fs.unlink(filename);
}