import { defineConfig, loadEnv } from 'vite';

// Solo desarrollo: el navegador usa /publico bajo su mismo origen. Se conserva
// Origin y el Path de la cookie; la API debe autorizar el origen de Vite.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    server: {
      proxy: {
        '/publico': { target: env.VITE_API_URL || 'http://localhost:3000', changeOrigin: false },
      },
    },
  };
});
