import { promises as fs } from 'fs';
import { globSync } from 'glob';

/// Moves all of the <script> tags from <head> to before </body>
/// Removes all contract bytecode from the scripts
async function main() {
  let scripts = [];
  let html = (await fs.readFile('dist/index.html')).toString('utf-8');
  const lengthBefore = html.length;

  // Cut all <script> tags from the body
  const rx = /(<script[^>]*>.*?<\/script>)/gms;
  const blah = html.matchAll(rx);
  for (const m of blah) {
    scripts.push(m[0]);
    html = html.replace(m[0], '');
  }

  // Move all scripts to end of body
  html = html.replace('</body>', scripts.join('') + '</body>');

  // Strip contract bytecode
  for (const fn of globSync('../hardhat/abis/*.bin')) {
    let bc = (await fs.readFile(fn)).toString('utf-8').trim();
    if (bc.length == 2) {
      continue;
    }
    bc = '="' + bc + '"';
    html = html.replace(bc, '=""');
  }

  fs.writeFile('dist/index.html', html);

  console.log(
    `Size after optimization ${(html.length / 1024).toFixed(2)} KiB (${((lengthBefore - html.length) / 1024).toFixed(2)} KiB reduction)`,
  );
}

Promise.all([main()]);
