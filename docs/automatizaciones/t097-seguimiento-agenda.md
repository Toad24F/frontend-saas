# M5-T097 · Seguimiento en el detalle de agenda

El personal con acceso a la cita ve la política de confirmación y la comunicación por WhatsApp en el detalle. El plazo se presenta en la zona de la cita. Los estados En cola, Aceptado, Entregado, Leído, Fallido e Incierto describen el envío. La etiqueta de asistencia sigue procediendo del estado de la cita. La recepción de un acuse puede actualizar el bloque al recuperar el foco sin reemplazar los formularios abiertos. La demo indica que la comunicación está inactiva.

| Archivo | Función |
| --- | --- |
| `src/connected/screens/agenda/agenda.seguimiento.js` | Formatea el plazo, traduce estados y actores de historial, y escapa los campos. |
| `src/connected/screens/agenda/agenda.vista.js` | Integra la región accesible en el detalle y la actualiza con la lectura existente. |
| `src/shared/screens/agenda/agenda.acciones.js` | Muestra el alcance de la comunicación en el detalle de la demo. |
| `tests/agenda.seguimiento.test.js` | Verifica plazo local, escape y separación de política y acuses. |
| `tests/m4-navegador/agenda.seguimiento.spec.js` | Verifica presentación a 390 y 1280 px en claro y oscuro, actualización de acuses, foco al cerrar y nota de demo. |

Las pruebas se redactaron primero. Node detectó la ausencia del componente. El navegador detectó el panel ausente y después el acuse conservado al recuperar el foco. La suite Node pasó 317/317 y Playwright pasó 5/5 con Vite local y respuestas simuladas. El build pasó. Para repetir Playwright, usar una configuración de navegador con `testDir: './tests/m4-navegador'`, `baseURL: 'http://127.0.0.1:4179'` y Vite en ese puerto, y ejecutar `npm run test:browser -- --config <config-local> agenda.seguimiento.spec.js`.

[Flujo y verificación de backend](../../../backend/docs/fase-6-modulo-5/resultados-tareas/m5-t094-t097.md).
