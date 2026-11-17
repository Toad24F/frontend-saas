# Resultado de traducción — Recepcionistas

La actualización posterior de filtros, vista y paginación compartida se documenta en [Catálogos compartidos](resultado-catalogos-compartidos-2026-11-17.md).

Fecha de cierre: 2026-11-17  
Estado: terminado

## Qué cambió y por qué

Se aplicó a Recepcionistas la convención `dominio.responsabilidad.extensión` y se tradujo la nomenclatura propia del frontend sin cambiar los permisos, validaciones ni operaciones del catálogo conectado.

Los archivos quedaron así:

```text
src/connected/screens/recepcionistas/
  recepcionistas.vista.js
  recepcionistas.acciones.js
  recepcionistas.errores.js
  recepcionistas.estilos.css
```

Se tradujeron funciones como `recepcionistas`, `cambiarVistaRecepcionistas`, `aplicarFiltrosRecepcionistas`, `nuevaRecepcionista`, `accionRecepcionista`, `validarRecepcionista` e `interpretarErrorRecepcionista`. También se actualizaron variables, selectores, identificadores y acciones internas como `nueva-recepcionista`, `data-recepcionista-entrada`, `data-accion-recepcionista`, `data-vista-recepcionistas` y `busqueda-recepcionistas`.

## Alcance comprobado

- Catálogo conectado de Recepcionistas.
- Alta con nombre, correo y contraseña.
- Validación por campo y presentación de errores del backend.
- Restablecimiento de contraseña.
- Estados activo, inactivo e inhabilitado.
- Reactivación con consulta del cupo vigente.
- Desactivación e inhabilitación como operaciones distintas.
- Búsqueda, filtro de estado, limpieza y paginación local.
- Vistas de lista y tarjetas.
- Estado vacío y sin coincidencias.
- Permisos del administrador de negocio.
- Escritorio de 1366 y 1159 px, móvil de 390 y 320 px, tema claro y oscuro.

No existe una pantalla demo específica de Recepcionistas. No se añadió una simulación ni se presentó esta capacidad conectada como disponible en la demo.

## Contratos conservados

No se cambiaron las rutas `/recepcionistas`, `/recepcionistas/:id/desactivar`, `/recepcionistas/:id/reactivar`, `/recepcionistas/:id/restablecer-contrasena` y `/recepcionistas/:id/inhabilitar`, ni sus métodos HTTP.

Se conservaron los campos contractuales `nombre`, `emailRecepcionista`, `password` y `nuevaPassword`, además del modelo normalizado `receptionists`, `name`, `email`, `active` y `activatedAt`. También permanecieron los valores compartidos `search`, `status`, `all`, `active`, `inactive`, `list`, `cards` y `data-desktop-view` porque pertenecen al contrato interno de catálogos que se abordará coordinadamente en el conjunto 6.

El identificador de resultados quedó como `recepcionista-results`: el dominio está traducido y el sufijo `results` todavía es generado por el paginador común. Se resolverá junto con los demás catálogos para evitar un cambio parcial.

## Consumidores actualizados

- Índice de pantallas conectadas.
- Eventos y acciones globales de la aplicación.
- Paginación y filtros del catálogo.
- Pruebas de recursos inhabilitados.
- Pruebas visuales compartidas del panel administrativo.

## Verificación realizada

- `node --check`: correcto en todos los JavaScript modificados.
- Pruebas dirigidas: 18 aprobadas, 0 fallidas.
- `npm test`: 295 aprobadas, 0 fallidas.
- `tests/browser-local-pagination.mjs`: aprobada con API simulada.
- `tests/browser-admin-review.mjs`: aprobada con API simulada; escritorio/móvil y ambos temas.
- `npm run build`: correcto; Vite transformó 190 módulos.
- Búsqueda con `rg`: sin imports, funciones, acciones ni selectores anteriores del conjunto.
- `git diff --check`: correcto.

Las pruebas de navegador utilizaron respuestas simuladas y escrituras únicamente en memoria. No se ejecutó `npm run test:browser`, porque esa suite prepara una base efímera del backend y el alcance del frontend no autoriza ejecutar cambios sobre su base de datos.

## Límites y pendientes

Las funciones compartidas de autenticación, cupos y recursos inhabilitados conservaron sus nombres actuales porque pertenecen a conjuntos posteriores. El siguiente conjunto previsto es Clientes. No hubo cambios en el backend, su configuración ni sus datos.
