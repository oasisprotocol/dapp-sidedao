import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react-swc'
import { viteSingleFile } from "vite-plugin-singlefile"
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svgr(),
    react(),
    viteSingleFile({
      useRecommendedBuildConfig: false,
      inlinePattern: ['assets/style-*.css',]
    }),
    visualizer()
  ],
  base: './',
  build: {
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        manualChunks(id: string) {
          if (id.includes('ethers')) {
            return 'ethers';
          }
        },
      },
    },
  },
})
