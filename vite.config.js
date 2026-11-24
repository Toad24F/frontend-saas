import { defineConfig, loadEnv } from 'vite';
import { cabecerasNgrok, esTunelNgrok } from './src/shared/api.ngrok.js';

// Solo desarrollo: el navegador usa /publico bajo su mismo origen. Se conserva
// Origin y el Path de la cookie; la API debe autorizar el origen de Vite.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const destinoApi = env.VITE_API_URL || 'http://localhost:3000';
  const usaNgrok = esTunelNgrok(destinoApi);
  return {
    server: {
      proxy: {
        '/publico': {
          target: destinoApi,
          changeOrigin: usaNgrok,
          ...(usaNgrok ? { headers: cabecerasNgrok } : {}),
        },
      },
    },
  };
});
