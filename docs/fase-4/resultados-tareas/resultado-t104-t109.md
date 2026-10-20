# Resultado M3-T104–M3-T109 — Apartado, contacto y liberación

Fecha: 20 de octubre de 2026.

## Tareas terminadas y alcance

- [x] **M3-T104 — Solicitar apartado antes de abrir formulario.** Operación estable por selección final, reintento con el mismo contenido y apertura solo después de concesión y comprobación de vigencia propia. El conflicto vuelve a consultar disponibilidad.
- [x] **M3-T105 — Construir captura y validaciones de contacto.** Nombre, teléfono mexicano y notas con límites/normalización del servidor, mensajes por campo y HTML escapado, sin búsquedas por teléfono.
- [x] **M3-T106 — Conservar datos solo durante la navegación interna.** El contacto se mantiene al volver o perder/vencer un apartado, exclusivamente en memoria; una nueva carga no restaura el formulario.
- [x] **M3-T107 — Mostrar tiempo restante con referencia al servidor.** Se conserva el vencimiento original, se descuenta el tiempo transcurrido mediante reloj monótono y se bloquea la revisión de datos al vencer. Actividad, errores o reintentos no devuelven tiempo.
- [x] **M3-T108 — Notificar reemplazos y comprobar vigencia al reenfocar.** Avisos mínimos mediante BroadcastChannel, lectura propia al volver al foco/visibilidad y bloqueo mientras el estado no puede comprobarse. Avisos y respuestas antiguas no deciden el estado de un apartado posterior.
- [x] **M3-T109 — Liberar al volver, recargar o abandonar.** Volver espera la liberación del ID/generación capturados; la salida usa fetch con keepalive y CSRF como mejor esfuerzo. Recarga/BFCache reinician sin contacto restaurado.

Las marcas se registran aquí, en **frontend-saas**. El backend y su documento fuente `docs/fase-4-modulo-3/tareas.md` permanecieron de solo lectura. **El trabajo termina en T109: T110 y siguientes no se implementaron.** No hay marcador de envío, preparación de intento, registro de cita, folio ni recuperación de envío. **Reservar** permanece deshabilitado.

## Qué se realizó y por qué

Se extendió el portal de selección existente con un controlador de apartado separado y un formulario de contacto. El servidor conserva la autoridad sobre concesión, generación, costo aceptado, zona y vencimiento. La interfaz no inventa apartados ni extiende sus cinco minutos, y conserva lo escrito cuando el usuario necesita otro horario.

Se mantuvieron Vanilla JS, Bootstrap y los estilos/recursos Citalendar. No se incorporaron dependencias ni una dirección visual nueva. La demo mantiene su motor y validaciones anteriores; su paso de contacto ahora aclara que el apartado es simulado y funciona solo en esa pestaña. Sus límites históricos simplificados (teléfono nacional sin separadores y notas de 500 caracteres) se conservan: el formulario conectado sí usa las reglas actuales del servidor.

## Archivos y responsabilidad

| Archivo | Qué se agregó o modificó |
| --- | --- |
| `src/connected/public/booking.js` | Nuevo. Compone el selector con concesión, reintento idempotente de la operación de apartado, verificación propia, contacto en memoria, notificaciones, liberación y guardas de identidad/revisión. No crea intentos ni citas. |
| `src/connected/public/contact.js` | Nuevo. Valida y normaliza nombre/teléfono/notas; cuenta puntos de código Unicode, recorta extremos y rechaza excesos sin truncar. Devuelve errores por campo y el contacto normalizado solo en memoria. |
| `src/connected/public/hold-clock.js` | Nuevo. Calcula el presupuesto temporal desde expiraEn/servidorAhora y un reloj monótono. Descuenta conservadoramente latencia y nunca aumenta el plazo al sincronizar o repetir la misma concesión. |
| `src/connected/public/booking-view.js` | Nuevo. Presenta concesión, formulario, errores, contador y acciones. Escapa valores personales y actualiza segundos sin recrear los inputs ni interrumpir cursor/IME. |
| `src/connected/public/booking-lifecycle.js` | Nuevo. Conecta foco, visibilidad, pagehide y pageshow/BFCache, además del tick del contador; ofrece limpieza de listeners/temporizador. Limpia valores y defaults cacheados de los campos al salir. |
| `src/connected/public/http.js` | Modificado. Admite keepalive exclusivamente para POST de liberación, manteniendo cookie, CSRF, mismo origen y rechazo de redirecciones. |
| `src/connected/public/selection-view.js` | Modificado. Ofrece **Apartar este horario** al integrarse con el controlador nuevo; admite renderer compuesto y conserva foco/cursor en cambios de fase y formulario. El selector aislado sigue limitado a selección. |
| `src/connected/public/entry.js` | Modificado. Monta el controlador, su vista, canal por negocio y eventos de ciclo de página después de verificar la sesión; errores nativos de arranque muestran un mensaje seguro. |
| `src/connected/public/style.css` | Modificado. Añade contador, avisos, campos y errores adaptados a ambos temas con los tokens existentes. |
| `src/demo/screens/reservas/booking.js` | Modificado. Aclara el alcance local del apartado de demostración sin cambiar su funcionamiento. |
| `tests/portal-publico-apartado.test.js` | Nuevo. Veinticuatro pruebas Node de T104–T109 con HTTP/canal/relojes/eventos controlados, sin base real. |
| `tests/fixtures/portal-selection-server.mjs` | Modificado. Añade sesiones, operaciones, generaciones e historial de apartados solo en memoria de la fixture. Simula consulta/liberación y permite avanzar el reloj ficticio. Intercepta todas las rutas públicas antes del proxy y rechaza envíos de reserva. |
| `README.md` | Modificado. Describe el alcance conectado hasta T109, límites de envío y reglas de memoria, contador y salida. |
| `docs/fase-4/resultados-tareas/resultado-t101-t103.md` | Modificado. Añade una referencia al estado posterior del portal/fixture sin reescribir la evidencia histórica de aquel lote. |
| Este documento | Nuevo. Registra marcas de finalización, responsabilidades, flujo, pruebas y límites. |

Los bloques nuevos incluyen comentarios sobre coordinación, privacidad, relojes, foco, reintentos, salida y límites funcionales.

## Flujo conectado

1. Servicio → sucursal → profesional → fecha/hora conserva el comportamiento de T101–T103. Elegir una ranura todavía no concede nada.
2. **Apartar este horario** genera una clave opaca mediante crypto.randomUUID y envía `POST apartados` con solo clave, personalId, sucursalId, servicioId, fechaLocal y horaInicio. Se bloquean acciones duplicadas mientras espera. No se envían precio, fin, generación, contacto ni identidad del negocio en el cuerpo.
3. Una respuesta perdida o fallo técnico conserva la operación exacta y ofrece reintentar el mismo apartado. No se crea otra clave por timeout. Un 400/404/409 de la solicitud, sin concesión conocida, vuelve a consultar horarios y limpia la selección de ranura, sin inventar un formulario.
4. Una concesión válida proporciona apartadoId, generación, costoAceptado, zonaHoraria, expiraEn y servidorAhora. Antes de abrir contacto se consulta `GET apartados/:id` y se exige coincidencia de ID, generación y vencimiento original. Una repetición histórica ya vencida/liberada/sustituida no abre formulario. Si la vigencia no puede comprobarse, se conserva la referencia conocida para reintentar, sin asumir éxito utilizable.
5. El formulario muestra fecha/hora/zona y costo aceptado del servidor. **Revisar datos** valida localmente: nombre no vacío de hasta 150 puntos de código, teléfono normalizable a diez dígitos quitando espacios/guiones y +52 opcional, notas opcionales hasta 2000 puntos de código y cuerpo de hasta 32 KiB. No hay truncado ni consulta de reservas anteriores. La acción no llama una ruta de envío.
6. El contacto crudo queda solo en memoria del controlador; la normalización tampoco se persiste. Se preserva al volver, vencer o perder el apartado, y al conseguir otro durante el mismo flujo. No se coloca en URL, storage, mensajes de canal ni peticiones de apartado/liberación. El HTML siempre lo escapa y autocomplete está desactivado.
7. El contador ancla expiraEn y servidorAhora a performance.now. Descuenta el tiempo de petición de forma conservadora, de modo que puede bloquear antes que el servidor por latencia, pero nunca prolonga el apartado. Una lectura o repetición solo puede reducir el presupuesto existente. En cero conserva el formulario y deshabilita **Revisar datos**; **Reservar** ya está deshabilitado en todo este lote.
8. BroadcastChannel por slug anuncia cambio/liberación con ID y generación; una operación fallida emite un aviso de refresco porque el servidor puede haber liberado un apartado previo durante su preparación. No transmite contacto, CSRF ni claves de operación. La pestaña receptora consulta **su propio apartado**: el aviso no autoriza ni declara una sustitución por sí mismo. Se ignoran negocios distintos y generaciones antiguas/inválidas.
9. Al ocultarse una pestaña, su apartado activo pasa a no verificado. Al recuperar visibilidad o foco consulta el estado propio y bloquea acciones hasta recibir respuesta. Estado vencido/sustituido/liberado o una lectura incompatible impiden usar el apartado; un fallo técnico se muestra como vigencia no comprobada, sin fingir vencimiento ni restablecer tiempo.
10. **Volver a horarios** captura ID/generación, envía `POST apartados/:id/liberar` y espera la respuesta antes de regresar a disponibilidad. Si falla, conserva la referencia y ofrece repetir la liberación. Guardas por revisión e identidad impiden que una lectura atrasada restaure el formulario tras liberar.
11. pagehide intenta liberar el apartado capturado mediante fetch keepalive con CSRF; no utiliza sendBeacon porque no puede aportar esa cabecera. Duplicar la señal de salida no duplica la liberación local. Si la concesión llega tras salir, se libera esa referencia exacta como mejor esfuerzo. Se limpian contacto y valores cacheados; pageshow con BFCache fuerza recarga y una carga nueva reinicia desde servicio.

## Tests primero y correcciones comprobadas

Se escribieron las 18 pruebas iniciales **antes de los módulos nuevos**. La primera ejecución terminó roja con `ERR_MODULE_NOT_FOUND` para booking.js, antes de ejecutar sus aserciones. Tras implementar pasaron las 18.

Se añadieron casos de endurecimiento. El caso de reintento tras fallo de verificación detectó que el presupuesto visible podía reiniciarse (**20 aprobadas, 1 fallida**). Se corrigió para sincronizar usando el mínimo del plazo anterior y el nuevo presupuesto, conservando el vencimiento original.

En navegador apareció `Illegal invocation` al arrancar: los temporizadores nativos se invocaban con el objeto de dependencias como receptor. Se agregó una prueba roja que exige el receptor window y se corrigieron setInterval/clearInterval. La recarga posterior mostró el catálogo y el flujo completo correctamente. Dos casos finales verifican aviso de reemplazo fallido y limpieza/recarga de BFCache.

| Casos nuevos | Qué comprueban |
| --- | --- |
| Concesión y cuerpo de solicitud | No hay formulario antes de concesión y GET propio; se envían solo los campos permitidos. |
| Doble clic, respuesta perdida y conflicto | Exclusión local, mismo contenido/clave al repetir y vuelta a horarios sin apartado ficticio. |
| Concesiones históricas | Apartados vencidos, liberados o sustituidos no habilitan formulario. |
| Contacto y Unicode | Normalización mexicana, límites de nombre/notas por puntos de código, campos inválidos y rechazo de más de 32 KiB. |
| Memoria y HTML | Errores por campo, contacto conservado al volver o conseguir otro apartado, ausencia en las solicitudes y escape de contenido con apariencia de HTML. Una instancia nueva no restaura datos. |
| Reloj y vencimiento | Referencia del servidor, descuento de latencia, reloj atrasado sin recuperar tiempo, cero en el límite exacto y reintento sin reiniciar el presupuesto. |
| Foco/avisos/identidad | Bloqueo durante consulta, datos conservados tras sustitución, mensajes mínimos, generación/negocio ajenos ignorados y aviso verificado por HTTP propio. |
| Fallos de comprobación | Error técnico o ID/generación/vencimiento incompatibles bloquean sin declarar un estado falso ni extender el plazo. |
| Liberación y respuestas atrasadas | Volver espera el POST del ID/generación capturados, reintenta una respuesta perdida y no acepta una consulta antigua después de liberar. |
| Salida y HTTP | keepalive una sola vez, liberación de una concesión recibida tarde y conservación de cookie/CSRF en el cliente real de frontend. |
| Ciclo de página y BFCache | Eventos de foco/visibilidad/salida conectados y limpiables, temporizadores con receptor window y valores/defaults eliminados antes de recargar BFCache. |
| Alcance de envío | Formulario accesible con errores asociados y botón Reservar deshabilitado; no hay preparación ni envío de una cita. |

Ejecución final directamente relacionada:

```text
node --test tests/portal-publico-apartado.test.js tests/portal-publico-base.test.js tests/portal-publico-seleccion.test.js tests/backend.test.js tests/availability.test.js
tests 71
pass 71
fail 0
cancelled 0
skipped 0
todo 0
```

Desglose: **24 nuevas**, 8 de base pública T098–T100, 15 de selección T101–T103, 8 de regresión del cliente privado y 16 del motor de demo. Son pruebas ejecutadas en el frontend con dobles; no se ejecutaron suites ni escrituras del backend real.

`npm run build`: aprobado, Vite 7.3.6, **117 módulos transformados**, código 0. `git diff --check`: aprobado; Git puede emitir avisos de normalización LF/CRLF, sin errores de whitespace. No se ejecutó toda la suite ni un lint inexistente.

## Revisión de navegador y reproducción

Ejecutar desde frontend-saas:

```sh
node tests/fixtures/portal-selection-server.mjs
```

Abrir `http://127.0.0.1:5193/reservas/qa-portal`. La identidad visible indica **API simulada**. La fixture no contacta al backend, no acepta contacto ni envíos de reserva, y mantiene sus datos únicamente en el proceso de revisión.

Se comprobó en el navegador integrado:

- Selección → solicitud de apartado → consulta propia → captura con contador inicial cercano a 5:00 y costo/zona recibidos.
- Teléfono incompleto con error asociado y foco en el campo; corrección con +52 y separadores, sin enviar el contacto. Las notas con etiquetas HTML permanecieron como texto.
- Dos pestañas del mismo navegador: la segunda obtuvo un apartado posterior; la primera recibió el aviso, consultó su referencia, informó que ya no estaba disponible y conservó sus campos con la revisión bloqueada.
- Regreso a disponibilidad y nuevo apartado: se conservaron nombre, teléfono y notas dentro del flujo abierto.
- Recarga ordinaria: volvió a servicio, sin formulario/contacto restaurados.
- Formulario conectado y captura de la demo en escritorio **1366 × 768** y móvil **390 × 844**, claro y oscuro. En el conectado se midieron scrollWidth/clientWidth **1351/1351** en escritorio y **375/375** en móvil con scrollbar, sin desbordamiento horizontal.

El vencimiento exacto, fallos de transporte, reenfoque/visibilidad y BFCache se comprobaron con relojes/eventos controlados en **Node**. No se declara una prueba nativa de suspensión/reenfoque o de vencimiento de cinco minutos completos en el navegador integrado. Se añadió a la fixture un control `/__qa/advance?ms=300000` para avanzar solo su reloj; esa ruta de revisión no existe en el producto. Su uso no sustituye las pruebas del contador ni valida un backend real.

## Límites y pendientes

- **No se implementó T110 ni tareas posteriores.** No se guarda marcador, no se prepara intento ni se envía/recupera una cita. No se muestra folio, confirmación ni WhatsApp conectado.
- La liberación al salir es de mejor esfuerzo: cierre forzado, pérdida de red o respuesta perdida pueden impedirla. El apartado vence por el reloj del servidor. Una concesión cuya respuesta nunca llegue puede quedar ocupando hasta ese vencimiento; no se inventa su ID.
- El formulario queda bloqueado si la vigencia no puede comprobarse. Los reintentos no renuevan el apartado. El contacto no sale por peticiones o notificaciones en este lote.
- Las pruebas de navegador usaron API ficticia; quedan pendientes las pruebas contra API/base desechable y el runner del tramo T117 en adelante. No se afirma validación de producción o de persistencia real.
- El backend y Nginx siguen sin modificaciones. Continúan los requisitos previos de mismo origen, HTTPS/contexto seguro, cookie, Web Locks y configuración de servidor. No se alteraron permisos ni reglas de disponibilidad.
- **Trabajo detenido tras T109.**
