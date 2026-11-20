# Resultado de traducción — Clientes

Fecha: 2026-11-17

## Cambios

Se aplicó la convención `dominio.responsabilidad.extensión` a Clientes en el panel conectado y la demo.

| Área | Archivos vigentes |
| --- | --- |
| Directorio conectado | `src/connected/screens/clientes/clientes.vista.js`, `clientes.paneles.js` |
| Cliente HTTP | `src/connected/modules/clientes/clientes.client.js` |
| Directorio demo | `src/demo/screens/clientes/clientes.vista.js`, `clientes.acciones.js`, `clientes.estilos.css` |
| Datos y horario demo | `src/demo/clientes.horario.js` |
| Estilos compartidos | `src/shared/screens/clientes/clientes.estilos.css` |

Las rutas de importación, los identificadores de búsqueda, los selectores de tabla y tarjetas, y los atributos de ficha, historial y paginación se actualizaron en ambos modos y en sus consumidores de `src/shared/`. Los estilos de tema y foco apuntan a los nuevos selectores. La demo usa `contactoHistorico` para su copia en memoria del contacto de una cita. Agenda sigue usando el mismo flujo local para mover citas.

## Contratos

Se contrastaron las operaciones con `clientes.controller.ts`, `clientes.entrada.ts` y `clientes.service.ts` del backend. El cliente HTTP conserva `GET /clientes`, `GET /clientes/:id`, `GET /clientes/:id/citas`, `POST /clientes` y `PATCH /clientes/:id`, sus parámetros y los campos de ficha, historial y paginación, incluidos `nombreCompleto`, `telefono`, `version`, `negocioId`, `clienteId`, `clientes`, `citas`, `pagina`, `limite`, `busqueda` y `hayMas`. También se conserva el acceso de `admin_negocio` y `recepcionista`. La ruta del panel sigue siendo `/admin/clientes` y la opción de demo sigue siendo `?demo=1`.

Las claves de datos de la demo que utilizan `public/data/demo.json`, Agenda y otros módulos compartidos siguen el esquema actual. La clave del borrador de ficha se tradujo porque es privada y vive en un `Map` de la pestaña.

## Verificación

- `npm test`: 295 pruebas aprobadas, incluidas las 8 de Clientes y horario.
- `npm run build`: 190 módulos transformados.
- `node --check`: correcto en los archivos JavaScript modificados.
- `rg`: sin referencias a los nombres anteriores de Clientes en `src/` y `tests/`.
- `git diff --check`: correcto.
- Playwright con API interceptada: 42 pruebas aprobadas en `clientes-horario.spec.js`, `live-errors.spec.js` y `agenda.spec.js`. Cubrieron búsqueda, paginación, alta, corrección versionada, historial, reintentos, roles y foco. Se revisaron las capturas del directorio y del editor a 1366 y 390 px en tema claro y oscuro, con cobertura visual de la demo y del modo conectado.

Se actualizaron `tests/m4-clientes-horario.test.js`, `tests/m4-navegador/clientes-horario.spec.js` y los selectores y datos de ficha de `tests/m4-navegador/agenda.refresco-errores.spec.js`. La suite M4 verifica los flujos conectados con API interceptada. El backend y su base de datos quedaron fuera de la ejecución.

La ejecución completa de M4 se detuvo después de seis fallos en Agenda. Los seis se reprodujeron sobre una copia de `HEAD` anterior a estos cambios: cuatro casos de atención por columna y dos de distribución móvil de la agenda compacta.
