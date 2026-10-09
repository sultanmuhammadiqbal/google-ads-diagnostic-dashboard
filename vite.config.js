import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' agar hasil build berjalan di host statis mana pun (Vercel, Netlify, GitHub Pages).
export default defineConfig({
  build: { chunkSizeWarningLimit: 800 },
  base: './',
  plugins: [react()],
});
