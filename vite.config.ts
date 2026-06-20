import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 由環境變數生成 PWA manifest，fallback 返 Jacob 預設值
const buildManifest = (env: Record<string, string>) => ({
  short_name: env.VITE_APP_SHORT_NAME || 'Jacob日記',
  name: env.VITE_APP_TITLE || 'Jacob 成長日記',
  icons: [
    { src: env.VITE_PROFILE_IMAGE || '/jacob.jpg', type: 'image/png', sizes: '192x192' },
    { src: env.VITE_PROFILE_IMAGE || '/jacob.jpg', type: 'image/png', sizes: '512x512' },
  ],
  start_url: '/',
  display: 'standalone',
  theme_color: '#ffffff',
  background_color: '#f0f9ff',
});

// 由環境變數生成 Service Worker，cache 名加上 BB 前綴避免互相衝突
const buildServiceWorker = (env: Record<string, string>) => {
  const prefix = env.VITE_DATA_PREFIX || 'jacob';
  return `const CACHE_NAME = '${prefix}-tracker-v3';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  // Network First Strategy for HTML and Manifest
  const acceptHeader = event.request.headers.get('accept');
  if (event.request.mode === 'navigate' ||
      (event.request.method === 'GET' && acceptHeader && acceptHeader.includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First Strategy for other assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
`;
};

// 將品牌相關嘅 index.html 標題、manifest.json、serviceWorker.js 全部由環境變數生成。
// 開發 (dev) 用 middleware 提供，建置 (build) 用 emitFile 輸出。
const brandingPlugin = (env: Record<string, string>): Plugin => {
  const appTitle = env.VITE_APP_TITLE || 'Jacob 成長日記';
  const manifestJson = JSON.stringify(buildManifest(env), null, 2);
  const serviceWorkerJs = buildServiceWorker(env);

  return {
    name: 'baby-branding',
    transformIndexHtml(html) {
      return html.replace(/%APP_TITLE%/g, appTitle);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/manifest.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(manifestJson);
          return;
        }
        if (req.url === '/serviceWorker.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(serviceWorkerJs);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: manifestJson });
      this.emitFile({ type: 'asset', fileName: 'serviceWorker.js', source: serviceWorkerJs });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react(), brandingPlugin(env)],
    define: {
      // This allows process.env.GEMINI_API_KEY and API_KEY to work in the browser
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'firebase/app', 'firebase/firestore'],
            ui: ['lucide-react'],
            genai: ['@google/genai']
          }
        }
      }
    },
    publicDir: 'public'
  };
});
