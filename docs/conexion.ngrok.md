# Conectar el frontend al backend por ngrok

Escribe la URL HTTPS del túnel en el `.env` local del frontend y reinicia Vite con `npm run dev`. Abre la dirección que muestre Vite para entrar al panel.

```dotenv
VITE_API_URL=https://subgroup-carefully-baffling.ngrok-free.dev/
```

`src/shared/api.ngrok.js` identifica los túneles HTTPS de `ngrok-free.dev`. Para esos destinos, `src/connected/modules/autenticacion/sesion.estado.js` envía `ngrok-skip-browser-warning` para evitar que ngrok devuelva un aviso HTML en lugar de la respuesta de la API. En `vite.config.js`, el proxy de `/publico` envía la misma cabecera y usa el `Host` del túnel, con el `Origin` del navegador y la ruta de la cookie intactos. El ajuste de transporte se aplica en ambos temas y tamaños de pantalla. La demo sigue usando sus datos ficticios.

## Verificación

- Sin la cabecera y con un agente de navegador, el túnel devolvió `200 text/html`. Con la cabecera, Edge recibió `401` con JSON de `/auth/profile`, que es la respuesta esperada sin una sesión. La comprobación previa de CORS para `POST /auth/login` devolvió `204` y permitió la cabecera.
- A través del proxy de Vite, Edge recibió `404` con JSON del backend al consultar el catálogo de un identificador ficticio. La demo también inició en Edge.
- Pasaron las 320 pruebas de `npm test`, `npm run build` y `git diff --check`.

Las consultas del túnel usaron rutas de solo lectura. Quedan sin verificar el inicio de sesión con una cuenta y la sesión del portal con un negocio real. El portal requiere que `PORTAL_PUBLICO_ORIGEN` en el backend coincida con el origen exacto del frontend y que `PORTAL_CSRF_SECRET` esté configurado. Al publicar el frontend, el portal requiere un proxy de mismo origen para `/publico` en el servidor que lo aloje.
