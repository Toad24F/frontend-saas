# Resultado de traducción — Servicios

Fecha de cierre: 2026-11-17  
Estado: terminado

## Qué cambió y por qué

Se aplicó a Servicios la convención `dominio.responsabilidad.extensión` y se tradujo la nomenclatura propia del frontend sin modificar su comportamiento. El conjunto incluyó la vista compartida, la pantalla conectada, las acciones, los errores, los estilos, las operaciones y sus consumidores directos.

Los archivos principales quedaron así:

```text
src/shared/screens/servicios/
  servicios.vista.js
  servicios.errores.js
  servicios.estilos.css

src/connected/screens/servicios/
  servicios.vista.js
  servicios.acciones.js

src/connected/modules/servicios/
  servicios.operaciones.js
```

También se tradujeron funciones, variables y selectores internos, por ejemplo `servicios`, `validarServicio`, `interpretarErrorServicio`, `inhabilitarServicio`, `confirmarInhabilitacionServicio`, `data-servicio-entrada`, `data-vista-servicios` y `busqueda-servicios`.

## Alcance comprobado

- Modo conectado y modo demo.
- Roles de administración y profesional, incluida la visibilidad de acciones por permiso.
- Vista de lista y tarjetas.
- Búsqueda, filtro de estado, limpieza y paginación local.
- Alta, edición, activación/desactivación e inhabilitación.
- Estados vacío, sin coincidencias y error de recursos inhabilitados.
- Escritorio de 1366 px y móvil de 390 px en tema claro y oscuro; la prueba general también recorrió 1159 px y 320 px en el modo conectado.

No hubo un rediseño ni cambios funcionales. La demo conserva datos ficticios y la versión conectada conserva sus operaciones reales.

## Contratos conservados

No se cambiaron las rutas `/servicios`, `/servicios/:id`, `/servicios/:id/reactivar`, `/servicios/:id/desactivar`, `/servicios/:id/inhabilitar` ni las rutas de recursos inhabilitados. Tampoco se alteraron métodos HTTP, roles, mensajes o campos del backend.

Se conservaron las claves contractuales de formularios y modelos compartidos, entre ellas `name`, `description`, `duration`, `price`, `active`, `creatorId`, `serviceIds`, `services` y `professionals`. También permanecieron los valores compartidos `search`, `status`, `all`, `active`, `inactive`, `list` y `cards`, además de clases genéricas `professional-*`, porque su traducción corresponde a conjuntos posteriores y cambiarlas aquí ampliaría el alcance.

El contenedor mantiene el identificador híbrido `servicio-results`: `servicio` ya está traducido y el sufijo `results` todavía lo construye el paginador de catálogos compartido. Ese sufijo se resolverá coordinadamente en el conjunto 6 para no modificar parcialmente el contrato interno común a varios catálogos.

## Archivos consumidores y pruebas actualizados

- Índices de pantallas conectada y demo.
- Acciones y eventos globales de la aplicación.
- Acciones compartidas de formularios de catálogos.
- Pruebas unitarias de Servicios y pruebas relacionadas con edición conectada y contratos del backend.
- Pruebas de navegador de catálogos, paginación local y recursos inhabilitados.

## Verificación realizada

- Validación sintáctica con `node --check`: correcta en todos los JavaScript modificados.
- Pruebas dirigidas: 16 aprobadas, 0 fallidas.
- `npm test`: 295 aprobadas, 0 fallidas.
- Prueba de navegador `tests/browser-local-pagination.mjs`: aprobada con API simulada.
- Prueba de navegador `tests/browser-admin-review.mjs`: aprobada con API simulada; conectada/demo, escritorio/móvil y ambos temas.
- `npm run build`: correcto; Vite transformó 190 módulos.
- Búsqueda con `rg`: sin imports, funciones ni selectores antiguos del conjunto.
- `git diff --check`: correcto.

Las pruebas de navegador usaron respuestas simuladas y escrituras únicamente en memoria. No se ejecutó `npm run test:browser`, porque esa suite prepara una base efímera del backend y este trabajo no autoriza cambios ni ejecución sobre su base de datos.

## Límites y pendientes

Las utilidades genéricas de catálogos, el modelo compartido en inglés y las clases globales quedan para sus conjuntos específicos. El siguiente conjunto previsto por el plan es Profesionales; no se renombró código fuera de Servicios salvo los consumidores indispensables para mantener sus imports y eventos funcionando.
