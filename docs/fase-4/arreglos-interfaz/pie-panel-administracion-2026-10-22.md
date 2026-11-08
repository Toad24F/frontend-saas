# Pie del panel de administración

Se retiraron «Un poco más de orden. Más tiempo para cuidar.» y «Hecho para tu día a día» del pie compartido del panel. Se conservó la firma «Citalendar», alineada a la derecha. Se eliminó la regla móvil que ocultaba el primer elemento del pie para que la firma siga visible. El cambio afecta al panel conectado y a la demo, en escritorio y móvil, en ambos temas; no modifica navegación ni permisos.

Archivos: `src/shared/app.js` y `src/shared/styles.css`.

Comprobación: `npm test` (159 pruebas), `npm run build` y `git diff --check` correctos. No se hizo revisión visual en navegador: el navegador integrado no pudo acceder al servidor local en la verificación anterior.
