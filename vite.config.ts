import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

const pdfResourceRoot = new URL('./node_modules/pdfjs-dist/', import.meta.url);
const pdfDirectories = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'devkit-local-pdf-resources',
      generateBundle() {
        for (const directory of pdfDirectories)
          for (const file of readdirSync(new URL(`${directory}/`, pdfResourceRoot))) {
            this.emitFile({
              type: 'asset',
              fileName: `pdf-resources/${directory}/${file}`,
              source: readFileSync(new URL(`${directory}/${file}`, pdfResourceRoot)),
            });
          }
      },
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = new URL(request.url ?? '/', 'http://localhost').pathname;
          const prefix = `${server.config.base}pdf-resources/`;
          if (!path.startsWith(prefix)) return next();
          const [directory, file, extra] = path.slice(prefix.length).split('/');
          if (
            !pdfDirectories.includes(directory) ||
            !file ||
            extra ||
            !/^[\w.-]+$/.test(file) ||
            file.includes('..')
          ) {
            response.statusCode = 404;
            response.end();
            return;
          }
          try {
            response.setHeader(
              'Content-Type',
              file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
            );
            response.end(readFileSync(new URL(`${directory}/${file}`, pdfResourceRoot)));
          } catch {
            response.statusCode = 404;
            response.end();
          }
        });
      },
    },
    {
      name: 'devkit-content-security-policy',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
            injectTo: 'head',
          },
        ];
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
