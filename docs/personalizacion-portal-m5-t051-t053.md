# Vista previa y personalización del portal

## Flujo

1. En **Mi cuenta → Tu portal de reservas → Personalizar portal**, el Administrador consulta la versión, el acento y el logo publicados, junto con el acento predeterminado. El editor y la muestra usan un borrador en memoria.
2. La paleta y el campo HEX editan únicamente el acento. El fondo y el texto provienen del tema activo. La vista previa y el portal conservan el relleno elegido para el botón, usan texto blanco o negro encima y adaptan el tono para enlaces, bordes y foco. Un HEX inválido deja visible el último acento válido e impide guardar.
3. Al elegir un logo, el navegador comprueba tamaño, firma, tipo, animación y dimensiones. **Guardar marca** envía el archivo como provisional a `POST /negocio/personalizacion/logos`. El servidor vuelve a validarlo y lo recodifica. Después, `PUT /negocio/personalizacion` recibe exactamente `{ version, acento, logoId }`. **Descartar cambios** cierra el diálogo, libera la vista local del archivo y devuelve el foco al botón de entrada.
4. **Previsualizar predeterminados** muestra la apariencia base y retira el logo de la muestra. **Cancelar restauración** devuelve el borrador. **Aplicar predeterminados** envía la versión a `POST /negocio/personalizacion/restaurar`. Si la versión cambió o la respuesta quedó incierta, el editor pide recargar la marca publicada para comprobar el resultado.
5. El portal conectado lee `marca.acento` y carga el logo publicado bajo el slug actual. Si falta el logo, muestra las iniciales del negocio. Al alternar de tema cambia el fondo, el texto y el tono de contraste sin cambiar el acento guardado. El acento predeterminado recupera los estilos base de Citalendar y la cabecera conserva el logo de la plataforma.
6. La demo usa el mismo diálogo y mantiene una muestra ficticia en memoria por negocio. Su aviso indica que los cambios se limitan a la demostración.

## Archivos

| Archivo | Función |
| --- | --- |
| `src/shared/personalizacion.editor.js` | Maneja el diálogo, validación local del logo, borrador, persistencia, restauración y foco. |
| `src/shared/personalizacion.marca.js` | Comprueba formato y contraste y construye rutas de logo ligadas al slug. |
| `src/shared/personalizacion.estilos.css` | Adapta el diálogo a una columna en móvil y aplica colores y foco al portal y a la muestra. |
| `src/shared/cuenta.portal.js` | Dibuja el botón de personalización en la sección de portal. |
| `src/connected/screens/cuenta/cuenta.vista.js` | Habilita la entrada al editor en la cuenta conectada del Administrador. |
| `src/connected/screens/cuenta/cuenta.acciones.js` | Abre el editor y conecta sus operaciones con la API administrativa autenticada. |
| `src/connected/modules/autenticacion/sesion.estado.js` | Envía archivos multipart con la sesión del panel. |
| `src/connected/portal-publico/seleccion.flujo.js` | Conserva la marca vigente que devuelve el catálogo. |
| `src/connected/portal-publico/portal.entrada.js` | Actualiza la zona de reservas y carga el logo del slug actual. |
| `src/demo/screens/configuracion/configuracion.vista.js` | Añade la entrada y abre el editor compartido en la demo. |
| `src/demo/screens/configuracion/personalizacion.demo.js` | Gestiona la marca ficticia de cada negocio en memoria. |
| `tests/personalizacion.contraste.test.js` | Prueba los tonos derivados sobre las superficies de ambos temas, la etiqueta del botón y las rutas de logo. |
| `tests/navegador/personalizacion.portal.spec.js` | Recorre móvil oscuro, teclado, contraste, archivo falso, descarte, publicación, dos negocios, restauración, conflicto de versión en escritorio claro y demo. |
| `tests/navegador/integracion.preparacion.js` | Arranca la API de la carpeta hermana `backend` y admite credenciales explícitas para una instancia desechable. |
| `tests/navegador/integracion.utilidades.js` | Resuelve las dependencias de la misma carpeta hermana para las comprobaciones SQL de Playwright. |

## Verificación de la implementación inicial

- Las pruebas se escribieron primero. La ejecución inicial de Node falló por la ausencia del módulo de marca. Playwright necesitó levantar una instancia desechable de MariaDB para ejecutar el recorrido conectado.
- `npm test` pasó **306/306**. Las pruebas nuevas comparan los usos de contraste con los mínimos del contrato y comprueban que el logo solo se pueda construir dentro del slug esperado.
- `npm run test:browser -- tests/navegador/personalizacion.portal.spec.js` pasó **3/3**. Los casos comprueban el flujo conectado desde el navegador y la base, el conflicto al publicar desde dos sesiones y el descarte sin API en la demo. Se revisaron capturas de móvil oscuro y escritorio claro.
- `npm run test:browser -- --trace on` pasó **35/36**. La traza de T124 mostró una recarga de Vite durante los cinco minutos de espera mientras se ajustaba el editor. Al repetir T124 de forma aislada con los archivos estables, pasó **1/1** y apareció el aviso de vencimiento esperado.
- `npm run build` y `git diff --check` completaron con código 0.

La evidencia coordinada y las pruebas del backend están en `backend/docs/fase-6-modulo-5/resultados-tareas/m5-t051-t053.md`.

## Selector visual de acento

En **Personalizar portal**, la muestra junto al campo de acento abre la paleta nativa del navegador. Se puede pegar un HEX de tres o seis dígitos, con o sin `#`. Al pegar se normaliza a `#RRGGBB`. Ambos controles editan el mismo borrador en conectado y demo.

- `personalizacion.editor.js` sincroniza ambos controles, normaliza el valor pegado y recupera el borrador al cancelar la restauración.
- `personalizacion.marca.js` valida el formato hexadecimal y deriva los tonos de contraste para las superficies de cada tema.
- `personalizacion.estilos.css` dispone las muestras junto al campo y les da foco visible y un área táctil de 44 px.
- `tests/navegador/personalizacion.portal.spec.js` cubre el foco de la paleta, la sincronización en ambos sentidos, el pegado, el rechazo de transparencia y la restauración cancelada en una pantalla móvil de 320 px.

La prueba unitaria de los tonos se escribió primero y falló porque el cálculo todavía no existía. Después del cambio, `npm test` pasó **306/306**. La suite de personalización en Edge pasó **4/4** con MariaDB desechable e incluyó el cambio de oscuro a claro con un acento y logo publicados. `npm run build` y `git diff --check` completaron con código 0.

El despliegue del frontend y backend debe hacerse en conjunto por el cambio del contrato HTTP.

## Tamaño del logo en el portal

El encabezado del portal conectado reserva `5.5rem` cuadrados para el logo publicado en escritorio y `4rem` en móvil. `portal.entrada.js` declara las dimensiones de la imagen y `portal.estilos.css` ajusta su tamaño por pantalla con `object-fit: contain` para conservar la proporción. `personalizacion.estilos.css` conserva el estilo de la imagen de la vista previa del editor.

Se comprobó el encabezado de Union Salud a 1195 y 390 px en claro y oscuro. El logo cargó con su proporción original, el título mantuvo su separación y la página quedó dentro del ancho disponible.

## Interacción de los botones de acento

`personalizacion.marca.js` calcula un relleno ligeramente más oscuro al pasar el cursor y otro al pulsar el botón. Cada relleno elige texto blanco o negro para mantener el contraste. `personalizacion.estilos.css` usa esas variantes en los botones primarios del portal conectado en claro y oscuro. `portal.entrada.js` carga la misma hoja de movimiento que usa el panel para elevar y comprimir el botón. `portal.estilos.css` respeta la preferencia de movimiento reducido y conserva el cambio de color.

La prueba unitaria nueva comprueba que los tonos se oscurecen y mantienen al menos 4.5:1 con su texto. En Edge, el caso nuevo pasó con el acento fijado en el catálogo de prueba y verificó hover, pulsación, botón deshabilitado y movimiento reducido. La suite de personalización pasó **3/5**. Dos casos se detuvieron al abrir **Mi cuenta** por el error `bloqueos.map is not a function`. `npm test` pasó **307/307** y `npm run build` completó con código 0.
