// vite.config.js - settings for Vite, the tool that runs our React app in development and builds it.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(), // understands JSX (the HTML-like syntax in .jsx files)
    tailwindcss(), // generates only the Tailwind classes we actually use
  ],
  server: {
    port: 5173,
    // "Proxy": when the React app calls /api/..., Vite forwards it to our Express server.
    // So the frontend code can just call fetch('/api/products') with no hard-coded server address.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
