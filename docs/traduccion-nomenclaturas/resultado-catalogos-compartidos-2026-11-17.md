# Resultado de traducción — Catálogos compartidos

Fecha: 2026-11-17

## Cambios

Se actualizó la nomenclatura de las utilidades comunes de Sucursales, Servicios, Profesionales y Recepcionistas para que sus vistas, formularios y controles de paginación usen el mismo vocabulario.

| Área | Archivos vigentes |
| --- | --- |
| Componentes y acciones | `src/shared/screens/catalogos/catalogos.vista.js`, `catalogos.encabezado.js`, `catalogos.paginacion.js`, `catalogos.acciones.js` |
| Paginador reutilizable | `src/shared/screens/paginacion.local.js` |
| Integración conectada | `src/connected/modules/catalogos/catalogos.detalle.js`, `catalogos.cupo.js`, `catalogos.payload.js` |

Las vistas de los cuatro catálogos y los estilos correspondientes adoptaron los nuevos selectores de vista, filtros, resultados y paginación. Bloqueos en Disponibilidad usa `paginacion.local.js` con su control propio, y Clientes demo reutiliza `guardarRegistroCatalogo` para el alta ficticia. Recepcionistas se comprobó en modo conectado, donde existe su pantalla.

## Compatibilidad y contratos

- `localStorage` conserva `citalendar-catalog-view`, sus claves anteriores por catálogo y los valores `list` y `cards`. El módulo convierte esos valores al leer o escribir la preferencia. En pantallas de hasta 767 px se muestran tarjetas y se oculta el selector sin cambiar la preferencia guardada.
- Los formularios conservan los campos que consumen sus validadores y las claves del modelo normalizado compartido, como `name`, `active`, `branchIds` y `serviceIds`.
- Se consultaron los controladores y DTO de Catálogos para contrastar métodos, rutas, permisos, edición y cupos. Se conservaron los campos de API, entre ellos `duracionMinutos`, `costo`, `zonaHoraria`, `urlGoogleMaps`, `creadorPersonalId`, `activos`, `limite` y `disponibles`. El backend y su base de datos quedaron fuera de la ejecución.

## Verificación

- `npm test`: 295 pruebas aprobadas.
- Pruebas dirigidas de Node: 19 aprobadas en `tests/detalle-edicion-conectado.test.js`, `tests/paginacion.local.test.js`, `tests/conexion.backend.test.js` y `tests/administracion.revision.test.js`.
- `npm run build`: 190 módulos transformados por Vite.
- `node --check` y `git diff --check`: correctos.
- `tests/paginacion.local-navegador.mjs`: aprobada en Edge con API simulada. Comprobó los cuatro catálogos y Bloqueos, paginación sin peticiones, filtros, ajuste de la última página tras una baja simulada, persistencia de la vista y lectura de una clave anterior.
- `tests/administracion.revision-navegador.mjs`: aprobada en Edge con API simulada. Comprobó filtros, formularios, cupos, asignaciones y permisos. Se revisaron capturas del modo conectado y la demo a 1366 y 390 px en claro y oscuro. La suite conectada también comprobó geometría a 1159 y 320 px.
- Suite M4 filtrada a la demo de Clientes: 4 pruebas aprobadas. Ejercitó alta con teléfono compartido y corrección en escritorio y móvil, en ambos temas.

La suite general de navegador que prepara una base temporal del backend quedó fuera del alcance. Las escrituras de las pruebas de navegador fueron simuladas.
