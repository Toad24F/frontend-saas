# Fase 6, T035–T037 — Compatibilidad del historial de correos

## Cambio y motivo

El backend de T035–T037 cambió `GET /negocios/:id/envios` de arreglo completo a páginas de hasta 100 filas. Las vistas conectadas actuales todavía filtran el historial en memoria. Este ajuste reúne todas las páginas antes de entregarlas a esas vistas para conservar su funcionamiento hasta T038. También acepta el arreglo anterior durante un despliegue escalonado.

## Flujo

1. La carga de Plataforma o del detalle de negocio solicita la primera página con límite 100.
2. Si el backend responde con el contrato nuevo, el adaptador solicita secuencialmente las páginas restantes según `total` y comprueba página, límite, total, cantidad de filas e IDs únicos.
3. Solo tras completar el conjunto entrega el arreglo a las vistas existentes. Un fallo o un cambio detectable entre páginas muestra el error existente; no presenta las primeras filas como historial completo.
4. T038 sustituirá esta lectura completa por filtros y paginador conectados al backend. La demo conserva su simulación.

## Archivos y función

| Archivo | Función |
| --- | --- |
| `src/connected/modules/correos/correos.historial-client.js` | Adapta el sobre paginado a un historial íntegro para las vistas actuales y rechaza respuestas parciales. |
| `src/connected/modules/datos/datos.carga.js` | Usa el adaptador para el contador de correos fallidos de Plataforma. |
| `src/connected/screens/negocio/negocio.vista.js` | Usa el adaptador para el historial del negocio. |
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

El cambio es de compatibilidad de datos en las pantallas conectadas; no modifica estilos ni la demo. La lectura temporal de todas las páginas puede requerir varias solicitudes para historiales grandes. T038 deberá enviar filtros y página al servidor y presentar sus totales sin cargar todo el historial.
