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
                try {
                    copyFileSync('public/manifest.json', 'dist/manifest.json');
                } catch (err) { }

                // Copy built background from assets to root for manifest
                try {
                    copyFileSync('dist/assets/background.js', 'dist/background.js');
                } catch (err) {
                    // Fallback to source if build didn't produce it yet
                    try {
                        copyFileSync('src/background.js', 'dist/background.js');
                    } catch (e) { }
                }
            },
        },
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/index.html'),
                background: resolve(__dirname, 'src/background.ts'),
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
});
