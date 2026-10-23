# Formulario del portal público: tiempo restante

## Cambio y motivo

- El paso de captura usa el título «Completa tus datos» y muestra una barra que disminuye junto al contador del apartado de cinco minutos.
- Se retiraron del cuerpo del formulario la fecha, la zona horaria y el costo duplicados. La zona horaria se añadió a la fecha y hora del resumen lateral durante este paso; el costo ya figuraba allí.
- La demo muestra el mismo título y una barra para su apartado simulado.

## Alcance y archivos

- Portal conectado: `src/connected/public/booking-view.js` y `src/connected/public/style.css`.
- Demo: `src/demo/screens/reservas/booking.js` y `src/demo/screens/reservas/style.css`.
- Pruebas: `tests/portal-publico-apartado.test.js` y expectativas de título en `tests/browser/portal.spec.js`.
- Los estilos usan los tokens existentes para los temas claro y oscuro. La barra ocupa el ancho disponible del contador, también en móvil. El resumen lateral sigue su posición actual en cada tamaño de pantalla.

## Comprobación

- La prueba del portal se escribió y falló antes de implementar el cambio; después pasó con el resto de `tests/portal-publico-apartado.test.js` (25 pruebas).
- `npm test`: 160 pruebas aprobadas.
- `npm run build`: compilación de Vite completada.
- `git diff --check`: sin errores de espacios.
- La revisión visual manual del paso conectado no se ejecutó: requiere crear un apartado real. Tampoco se ejecutó la suite de navegador, cuya preparación compila y escribe datos en el backend hermano, reservado para lectura en este trabajo.

## Límite

- La demo mantiene su contador local simulado. El portal conectado conserva la expiración y las restricciones del apartado real; la barra solo representa el tiempo restante que ya calcula ese flujo.
