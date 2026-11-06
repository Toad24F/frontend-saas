# Panel y detalle de negocio de superadministración

Fecha: 5 de noviembre de 2026. Estado: implementado en el frontend.

## Plan y alcance

1. Auditar el detalle conectado, el patrón `availability-tabs` y el contrato de correos/cupos.
2. Distribuir las acciones existentes en General, Límites y uso e Historial de correos.
3. Añadir indicadores de consumo y organizar el historial con filtros y páginas locales.
4. Probar comportamiento y estados; comprobar escritorio/móvil y ambos temas; documentar límites reales.

Las rutas afectadas son `/admin/negocio/:id` y `/admin/plataforma`, exclusivas del superadmin en la versión conectada. Se conserva la marca, la navegación móvil, el stack y los contratos. La demo no tiene una ficha de detalle equivalente. Su panel de plataforma comparte la nueva presentación, búsqueda y paginación, manteniendo sus acciones originales de suspensión/reactivación y renovación simuladas. No se modifica el backend, la base de datos ni Nginx.

## Cambios

- Cabecera compacta con nombre y retorno al panel. Se elimina el resumen «Licencia · Vigente · Acceso permitido» encima de las pestañas; el estado y acceso se consultan dentro de General.
- General: ficha continua sin tarjetas, con licencia arriba y administrador/invitación debajo, separados por líneas finas. Los datos del administrador se distribuyen en dos columnas en escritorio y una en móvil; se conservan corrección de correo, reemisión y recuperación según las condiciones originales. Se retira la etiqueta de activación junto al título; se conserva la fecha de activación y, para una invitación pendiente, su explicación y acciones. El estado de licencia gana presencia con etiqueta semántica y punto decorativo: verde para vigente, ámbar para pendiente/suspensión programada y rojo para suspendida/vencida, con variantes legibles en ambos temas.
- Suspensión: los botones de apertura y confirmación usan colores diferenciados por tema: en claro rojo vivo (#cb4646, ajuste local conservado), hover/foco #a92727 y pulsación #8f2020; en oscuro se conserva el fondo existente #5b151b, hover/foco #941c26 y pulsación #791721. Ambos mantienen texto blanco y foco visible. Se acota a esta acción, con variables Bootstrap para estados deshabilitados. Se corrige el hover que perdía el fondo. El pie del formulario de suspensión tiene fondo transparente para compartir la superficie del cuerpo del modal; se elimina su franja y borde superior, manteniendo espaciado, Cancelar y el flujo existente.
- Ancho en pantallas grandes: la barra temporal de General y los tres indicadores de Límites y uso ocupan el 100% del ancho interior de su sección; se retira el tope de 880px, conservando los márgenes de la página. Se comprueba la alineación de ambos extremos con su sección, también a 1532 y 1920px.
- Tiempo de licencia: se sustituye el recuadro informativo del estado vigente y la fila duplicada de tiempo restante por días, horas/minutos y una barra `progress` que se vacía. Reutiliza `licenseProgress` de Mi cuenta con `duracionTotalMs` y `tiempoRestante`, incluidas renovaciones; sin duración válida se mantiene el texto sin inventar porcentaje. Terracota en estado normal, ámbar con menos de 30 días y rojo en vencida. En suspensión se etiqueta como tiempo conservado y se mantiene la explicación y las acciones correspondientes. Bloqueo programado solo aparece si hay fecha. No es un contador en vivo: presenta la última consulta de vigencia.
- Límites y uso: secciones abiertas de Sucursales y Usuarios, apiladas y separadas por líneas como General, sin tarjetas. Barras nativas `meter` de sucursales, profesionales y recepcionistas. Los consumos, límites y disponibles proceden de los endpoints de cupo. Terracota en uso normal, ámbar desde 80%, rojo al alcanzar el límite. Texto de consumo, porcentaje y disponibilidad independiente del color; la longitud visual se acota al límite sin ocultar un exceso en las cifras.
- Pestañas con roles/relaciones ARIA, foco visible y navegación con flechas, Home y End. Se conserva pestaña/filtros al actualizar o guardar dentro del mismo negocio, y se restablecen al cambiar de negocio.
- Historial: se elimina la tarjeta exterior y se distribuyen título, filtros, tabla y paginación directamente sobre el fondo, conservando el fondo de la cabecera de tabla y sus divisores. Se retiran los identificadores visibles «Envío #…»; se mantienen internamente para orden y reintentos. Etiquetas legibles, estados semánticos, intentos y seguimiento contextual. Se elimina la columna Acción; el reintento para fallidos se integra en Seguimiento y conserva su confirmación y ruta existentes. Los errores se presentan como texto escapado.
- Enviados: fecha de envío; pendientes/fallidos: fecha prevista de procesamiento; en proceso: texto de procesamiento; descartados: explicación sin presentar la antigua fecha como un reintento futuro.
- Orden descendente por ID, con comparación entera precisa incluso para identificadores mayores que el entero seguro de JavaScript.
- Filtros combinados de estado y tipo; limpiar filtros, actualizar y estados sin coincidencias/sin registros. Diez filas por página; controles solo si el resultado filtrado supera diez. Cambiar un filtro vuelve a la primera página. La página se acota si disminuye el historial.
- Móvil: bloques apilados, filtros y botones táctiles, pestañas con desplazamiento horizontal y filas convertidas en fichas con etiquetas. Se elimina el ancho mínimo de 680px heredado de la tabla. Se conserva el espacio inferior de navegación existente.
- Claro: superficies neutras y terracota. Oscuro: superficies grafito; colores semánticos adaptados para etiquetas y barras, sin alterar los fondos globales.

## Contratos consultados y limitaciones

Se consultaron `../backend/src/correos/procesador-correo.service.ts`, `envios-correo.controller.ts` y `entities/envio-correo.entity.ts`, solo en lectura. También se consultó `../backend/src/licencias/services/vista-vigencia-licencia.service.ts` en lectura: la duración total corresponde al periodo efectivo informado por la API, que contempla un bloqueo programado si lo hay; en suspensión informa tiempo congelado. Se conservan las consultas existentes de negocio, vigencia y cupos.

`GET /negocios/:id/envios` devuelve ID, tipo, estado, intentos, fecha de confirmación, fecha prevista y último error. No entrega destinatario, creación, contenido, confirmación de recepción ni lectura: no se inventan esos datos. Enviado solo confirma el resultado del transporte. La fecha de procesamiento es una previsión, no una garantía horaria; el servidor decide si un reintento sigue siendo válido y puede rechazarlo por obsolescencia.

La paginación y los filtros operan sobre todo el historial descargado. No reducen el tráfico de API; para volúmenes grandes queda pendiente un contrato de filtrado/paginación del servidor. Las fechas usan la zona del dispositivo, indicada en pantalla. No se hizo ningún envío real ni se validó SMTP en esta revisión.

## Archivos

- `src/connected/screens/negocio/view.js`: composición de pestañas y bloques.
- `workspace.js`: interacción y estado local de pestañas/filtros/página.
- `mail-history.js`: consulta local, orden, filtros, paginación y seguimiento.
- `quota-meter.js`, `user-quota.js`: indicadores de consumo y acciones existentes.
- `actions.js`: confirmación de suspensión con la misma clase de peligro del botón de apertura, sin cambios de contrato, plazo ni envío.
- `license-presentation.js`: presentación temporal, porcentaje real mediante `../cuenta/license-progress.js` y acciones de licencia; conserva la exportación de historial delegando en el nuevo renderizador.
- `style.css`: estilos de detalle, indicadores, tabla/fichas y temas; se reutiliza el CSS de pestañas de Disponibilidad.
- `tests/business-detail.test.js`: siete pruebas nuevas de reglas y renderizado.
- `tests/ala-cupos-usuarios.test.js`: ajuste del texto esperado de consumo.
- `tests/browser-business-detail.mjs`: prueba de interfaz aislada con API simulada.
- `tests/browser/licenses.spec.js`, `tests/browser/user-quotas.spec.js`: selectores y navegación actualizados para las pestañas.

## Panel de negocios: indicadores y directorio

Se actualizaron el contexto del encabezado y el texto del directorio; se elimina la tarjeta exterior de la lista, el contador «en total», el texto «Activado» bajo el administrador y la columna de envíos fallidos.

- Indicadores globales: negocios registrados, administradores por activar, licencias vigentes con menos de 30 días y acceso bloqueado. Son informativos: no son botones, no reciben foco ni aplican filtros al pulsarlos. Se eliminan el hover y la marca de selección. Los totales no cambian al filtrar la tabla. «Acceso bloqueado» usa exclusivamente `condicionAcceso === false`; puede incluir licencias pendientes de activación, además de suspendidas y vencidas. La leyenda «Negocios sin acceso habilitado» evita atribuir todos los casos a una suspensión.
- Tabla: Negocio, Administrador, Estado de licencia, Tiempo restante y Administración. Etiquetas semánticas verdes/ámbar/rojas según estado, botón secundario «Administrar» con nombre accesible por negocio y navegación al detalle existente.
- Tiempo: días restantes, menos de un día, tiempo conservado en suspensión, «hasta bloqueo o vencimiento» en suspensión programada (el servidor aplica el primero), vencida, sin iniciar o no disponible. No se inventan días ni se cuenta un remanente congelado como acceso disponible.
- Búsqueda inmediata por nombre, identificador o correo, ignorando mayúsculas y acentos. Filtros combinables de licencia y seguimiento: por activar, próximas a vencer, acceso bloqueado y correos fallidos.
- Diez negocios por página, controles solo con más de diez coincidencias y contador del rango. Limpiar filtros se atenúa y queda deshabilitado de forma nativa cuando no hay búsqueda efectiva ni filtros seleccionados; se habilita al introducir búsqueda o seleccionar un filtro y vuelve a deshabilitarse al limpiar. Cambiar búsqueda/filtros vuelve a la primera página; se acota la página si disminuyen datos. Se conservan los filtros y página al ir al detalle y volver dentro de la misma sesión de página; una recarga reinicia ese estado local.
- Actualizar vuelve a consultar los datos por las rutas existentes y conserva filtros. Ante fallo, indica explícitamente que se conserva la última consulta, sin mostrar éxito ni sustituirla por datos ficticios.
- Móvil/tablet hasta 1000px: fichas sin contenedor de tarjeta exterior, etiquetas, controles táctiles y barras de navegación existentes. Se ajustó el ancho de la acción para evitar que «Administrar» se partiera en letras en escritorio intermedio (1159px).
- Demo: conserva la identificación de simulación y sus botones originales. No tiene contrato de activación ni vigencia temporal: esos indicadores muestran «—», están deshabilitados y explican que no se simulan. Los días se muestran no disponibles; no se añade un detalle conectado ficticio. Su seguimiento solo ofrece el bloqueo simulado y las acciones permanecen en memoria.

La implementación reutiliza los datos ya cargados de negocios, vigencias e historial. La paginación es local: sigue descargándose la lista completa y consultándose la vigencia y correos de cada negocio; no se añaden contratos de servidor ni se reduce el coste de carga inicial. Un volumen grande requerirá paginación y agregados del backend.

Archivos del panel: `src/shared/screens/plataforma/view.js`, `directory.js`, `directory-model.js` y `style.css`; pruebas en `tests/platform-directory.test.js` y `tests/browser-platform.mjs`.

Verificación adicional: cuatro pruebas unitarias (seguimiento real/umbral, búsqueda/filtros/página, representación temporal y controles/escape). Con Vite activo, `node tests/browser-platform.mjs` verifica navegación ida/vuelta conservando búsqueda/página, filtros combinados y reinicio a página uno, indicadores estáticos y activación/desactivación de Limpiar filtros, diez filas, controles dinámicos, actualización, error 503 con datos previos explícitos, vacío global y acción de suspensión demo con confirmación. Usa API simulada y solo acepta GET, sin escrituras al backend. Se generaron ocho capturas en `test-results/platform/`: 1366, 1159, 390 y 320px, claro/oscuro. Se revisaron capturas de escritorio y móvil y se comprobó automáticamente que no desborda el documento.

## Verificación y reproducción

Con Vite ya iniciado en localhost:5173:

```sh
npm test
npm run build
node tests/browser-business-detail.mjs
node tests/browser-platform.mjs
git diff --check
```

Resultados: 198 pruebas unitarias aprobadas, compilación correcta y diff sin errores de espacios. La prueba aislada con Microsoft Edge aprobó navegación de pestañas/teclado, filtros combinados, retorno a página uno, diez filas, cambio de página, diez resultados sin controles, actualización conservando pestaña, historial vacío, cero coincidencias, limpieza desde el vacío, diálogo de reintento, error 503 sin tabla ficticia y recuperación mediante Reintentar. Se añadieron aserciones de ausencia de tarjetas en las tres pestañas, ausencia del resumen y de la etiqueta de activación, estado de licencia destacado, valor de barra con duración conocida y ausencia de IDs visibles en el historial. Las pruebas unitarias cubren porcentaje de varios años, falta de duración, tiempo conservado, advertencia, vencimiento, suspensión programada y licencia pendiente. También aprobó la apertura del panel demo sin errores JavaScript.

Se generaron 40 capturas de las tres pestañas y del modal de suspensión a 1920, 1532, 1366, 390 y 320px, en claro y oscuro, en `test-results/business-detail/` (carpeta ignorada por Git). Se revisaron visualmente capturas de escritorio y móvil en ambos temas, detectando y corrigiendo el ancho mínimo de tabla y la prioridad de colores semánticos frente al tema global. Las capturas esperan a que terminen las transiciones para evitar estados visuales intermedios. Se comprobó automáticamente la ausencia de desbordamiento horizontal del documento. La revisión de suspensión verifica los colores computados normal/hover y texto blanco de ambos botones, foco visible usando teclado y fondo transparente del pie del formulario en los diez contextos de ancho/tema. Solo se abre y cancela el diálogo; no se envía ninguna suspensión.

El navegador usa una sesión ficticia e intercepta las rutas de API: no depende de credenciales ni escribe en la API real. Edge requirió ejecución fuera del sandbox para arrancar. Los specs de integración existentes se actualizaron, pero no se ejecutó `npm run test:browser`: su configuración crea/modifica una base efímera y queda fuera del alcance de solo lectura del backend. Por tanto, esta entrega no certifica persistencia real de cambios de licencia/cupos ni entrega de correos.
