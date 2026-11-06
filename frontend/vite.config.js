import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1';
  const backendBaseUrl = env.VITE_BACKEND_BASE_URL || 'http://127.0.0.1:5000';

  let proxyTarget = backendBaseUrl;

  try {
    proxyTarget = new URL(apiBaseUrl).origin;
  } catch {
    proxyTarget = backendBaseUrl;
  }

  return {
    plugins: [react()],
    server: {
      // Expose sur le reseau local (0.0.0.0) pour pouvoir tester depuis un
      // telephone/autre PC du meme reseau, pas seulement depuis cette machine.
      host: true,
      // getUserMedia (scan QR/selfie) exige un contexte securise : sur iOS il n'y a
      // pas de contournement possible en http:// sur IP locale, seul un tunnel HTTPS
      // (ngrok) permet de tester la camera depuis un iPhone. Vite bloque par defaut
      // les Host headers inconnus (protection anti DNS-rebinding) : sans autoriser
      // explicitement le domaine ngrok, le tunnel recevrait "Blocked request".
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io', '.ngrok.app'],
      proxy: {
        '/api/v1': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
