# Fase 6, T035–T037 — Compatibilidad del historial de correos

## Cambio y motivo

El backend de T035–T037 cambió `GET /negocios/:id/envios` de arreglo completo a páginas de hasta 100 filas. En esa entrega las vistas conectadas filtraban el historial en memoria. El adaptador reunía todas las páginas para conservar su funcionamiento durante la transición y aceptaba el arreglo anterior en un despliegue escalonado. T038 ya conectó el detalle de negocio a una sola página filtrada; este adaptador completo permanece para el contador de Plataforma.

## Flujo

1. La carga de Plataforma solicita la primera página con límite 100.
2. Si el backend responde con el contrato nuevo, el adaptador solicita secuencialmente las páginas restantes según `total` y comprueba página, límite, total, cantidad de filas e IDs únicos.
3. Solo tras completar el conjunto entrega el arreglo a las vistas existentes. Un fallo o un cambio detectable entre páginas muestra el error existente; no presenta las primeras filas como historial completo.
4. Desde T038, el detalle de negocio usa la página y los filtros del servidor. La demo conserva su simulación.

## Archivos y función

| Archivo | Función |
| --- | --- |
| `src/connected/modules/correos/correos.historial-client.js` | Adapta el sobre paginado a un historial íntegro para las vistas actuales y rechaza respuestas parciales. |
| `src/connected/modules/datos/datos.carga.js` | Usa el adaptador para el contador de correos fallidos de Plataforma. |
| `src/connected/screens/negocio/negocio.vista.js` | Desde T038 usa el cliente de página única para el historial del negocio. |
| `tests/correos.historial-client.test.js` | Prueba varias páginas y fallo de la segunda sin resultado parcial. |
| `tests/navegador/licencia.operaciones.spec.js` | Intercepta la misma ruta con parámetros de página. |
| `tests/navegador/integracion.preparacion.js` | Apunta al backend hermano real y siembra la clave normalizada exigida por el esquema actual en su base efímera. |
| `tests/navegador/integracion.utilidades.js` | Resuelve dependencias de ese mismo backend en las utilidades de navegador. |

## Comprobaciones

La prueba nueva falló primero por ausencia del adaptador. Tras implementarlo:

- `npm test`: **304/304** pruebas Node, incluidos los dos casos nuevos.
- `npm run build`: correcto, 192 módulos transformados.
- `npx playwright test tests/navegador/licencia.operaciones.spec.js --reporter=dot`: **4/4** con backend y base de navegador efímera; comprueba historial y operaciones de licencia.
- `git diff --check`: correcto.

## Alcance y pendiente

La lectura completa de Plataforma puede requerir varias solicitudes para historiales grandes. El flujo nuevo del detalle y sus pruebas se documentan en `fase-6-listados-t038-t043.md`.
