# T070–T073 — Autorización y condición de confirmación en la interfaz

## Flujo conectado

En el portal, el paciente puede marcar una autorización opcional para recibir mensajes de esta cita por WhatsApp. El formulario conserva esa decisión solo en memoria hasta el envío. La valida como booleano, la congela con el intento y la envía al backend; sin marcarla, envía `false` y la reserva sigue siendo posible. En la agenda manual, el colaborador marca la respuesta comunicada por el paciente. La selección validada y el marcador de reintento conservan la misma decisión.

Después de registrar o recuperar una reserva, el portal lee `vencimientoConfirmacionUtc` y `seguimientoManual` del resultado del servidor. Si hay plazo, muestra fecha y hora en la zona histórica de la cita. Si el plazo es nulo, muestra «Seguimiento manual; sin cancelación automática por plazo». Nunca calcula un plazo desde el reloj del navegador. El modo demo mantiene su aviso de que no envía WhatsApp.

## Archivos

| Archivo | Función |
| --- | --- |
| `src/connected/portal-publico/reserva.contacto.js`, `reserva.flujo.js` | Normalizan la decisión y la mantienen en el estado del formulario. |
| `src/connected/portal-publico/reserva.vista.js` | Muestra el checkbox opcional y la condición recibida, con zona horaria o mensaje manual. |
| `src/connected/portal-publico/reserva.envio.js` | Valida el par plazo/seguimiento y conserva esos campos al recuperar el resultado. |
| `src/connected/modules/agenda/agenda.contrato-manual.js`, `src/connected/screens/agenda/agenda.vista-manual.js` | Añaden la decisión a la selección manual y un checkbox para el colaborador, también en borradores y reintentos. |
| `tests/automatizaciones.portal.test.js` | Prueba autorización opcional, plazo en zona y ausencia de fecha ficticia. |
| Pruebas anteriores de agenda y portal | Ajustan las expectativas exactas de payload y estado al booleano nuevo. |

Los comentarios junto a los bloques nuevos explican la decisión opcional y el origen del plazo.

## Verificación y límites

La prueba nueva falló en sus tres casos antes de la implementación. Después, `npm test` pasó **315/315**, `npm run build` pasó y `git diff --check` no encontró errores. Se intentó abrir la interfaz con la herramienta visual, pero el entorno devolvió «failed to write kernel assets»; no se atribuye una revisión visual de escritorio/móvil o de temas. La suite de navegador existente apunta a una carpeta hermana `../backend` que no corresponde al backend disponible `../SaaS-backend`, así que tampoco se atribuye esa comprobación. El backend aún no tiene procesador ni transporte WhatsApp; el checkbox prepara autorización para el trabajo durable, no promete entrega.

## Ajuste visual del consentimiento (27 de noviembre de 2026)

El texto de autorización ahora se centra verticalmente junto a la casilla; en líneas envueltas conserva su alineación junto al control. El objetivo táctil del label sigue midiendo al menos 48 px. Es un cambio solo de presentación en el portal conectado: no cambia que la autorización sea opcional ni su valor enviado. Aplica en escritorio y móvil, en ambos temas. Archivos: `src/connected/portal-publico/reserva.vista.js` y `portal.estilos.css`.

Verificación de esta actualización: `npm test` pasó **320/320**, `npm run build` pasó y `git diff --check` no encontró errores. No se avanzó el flujo conectado hasta el formulario, para evitar crear una retención real; por eso no se atribuye una comprobación visual en navegador.
