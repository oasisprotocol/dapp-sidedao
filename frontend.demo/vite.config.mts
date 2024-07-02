import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { viteSingleFile } from "vite-plugin-singlefile"
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const package_json = JSON.parse(await readFile('package.json', {encoding: 'utf-8'}));

const commitDate = execSync('git log -1 --format=%as').toString().trimEnd();
const commitHash = execSync('git rev-parse HEAD').toString().trimEnd();

process.env.VITE_PACKAGE_VERSION = package_json['version'];
process.env.VITE_PACKAGE_NAME = package_json['name'];
process.env.VITE_GIT_COMMIT_DATE = commitDate;
process.env.VITE_GIT_COMMIT_HASH = commitHash;
process.env.VITE_GIT_COMMIT_SHORT_HASH = commitHash.slice(0, 8);

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  build: {
    sourcemap: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2**20,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // Watch the output of `pnpm build`, make it fit in single 1mb chunk
        //manualChunks: () => 'app'
      },
    },
  },
  define: {
     __VUE_OPTIONS_API__: false
  },
  plugins: [
    vue(),
    viteSingleFile(),
    visualizer({
      template: 'treemap',
      filename: 'stats.html',
      sourcemap: true,
      gzipSize: true
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'node:stream/web': 'stream-browserify',
    },
  }
});
