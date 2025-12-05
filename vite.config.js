import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-extension-files',
            writeBundle() {
                // Copy manifest.json to dist
                copyFileSync('public/manifest.json', 'dist/manifest.json');
                // Copy background.js to dist
                copyFileSync('src/background.js', 'dist/background.js');
            },
        },
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
});
