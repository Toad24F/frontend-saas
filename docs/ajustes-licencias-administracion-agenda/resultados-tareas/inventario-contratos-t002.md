# FALA-T002 — Inventario HTTP, DTO y permisos

Revisión de código local: backend `7eaf562`, frontend `38d4b33` más documentos y prueba de esta entrega. Este inventario **describe el código inspeccionado**, no declara que la UI ya consuma las rutas nuevas. El backend se leyó sin editarlo. RF frontend: 01–02, 23–24, 39–58.

## Flujo y autoridad

El navegador privado usa JWT de `/auth/login` y `/auth/profile`; el servidor deriva rol y negocio de la sesión. El portal `/reservas/:slug` usa `/publico/negocios/:slug`, cookie anónima HttpOnly y CSRF para mutaciones, sin JWT del panel. La selección consulta catálogo y disponibilidad; apartar, preparar, registrar y resolver son pasos distintos. Los IDs, precios, permisos y estados enviados desde la UI no son autoridad. Las rutas públicas personales usan `Cache-Control: no-store` y respuestas de error con `codigo`, `mensaje` y `accion`.

## Portal público: nueve rutas conservadas

| Método y ruta relativa a `/publico/negocios/:slug` | Entrada/salida y autorización comprobadas | Frontend actual y diferencia |
| --- | --- | --- |
| `GET catalogo` | Anónima; listas filtradas por negocio/oferta. `servicios[].costo` puede omitirse si se ocultan precios. | `selection.js` exige siempre `costo`; debe aceptar omisión. RF-01–RF-02, RF-35–RF-36. |
| `GET disponibilidad` | Anónima; selección/rango, ranuras y zona IANA; solo modalidad pública. | `selection.js` ya consulta y descarta respuestas atrasadas; conservar permisos y errores. RF-01–RF-02, RF-56. |
| `POST sesion` | Inicialización con cuerpo vacío y origen permitido; entrega cookie y CSRF de esa sesión. | `http.js` realiza doble inicialización para comprobar cookie; tras licencia bloqueada la recuperación al recargar sigue pendiente de contrato. RF-23–RF-24, RF-30. |
| `POST apartados` | Cookie/CSRF; clave de operación y selección; 201 nueva, 200 repetida; costo público `costo` opcional. | `booking.js` exige `costoAceptado`; debe respetar proyección vigente. RF-35–RF-37. |
| `GET apartados/:id` | Solo apartado propio; estado, generación, vencimiento y precio según publicación vigente. | `booking.js` revalida propiedad/vigencia; conservar el rechazo de apartado ajeno. RF-23–RF-24. |
| `POST apartados/:id/liberar` | Solo apartado/generación propios; 204; posible aun con licencia cerrada si se conserva credencial. | `booking.js` usa esta ruta al volver/salir. RF-23–RF-24. |
| `POST intentos` | Cookie/CSRF; `clave`, `apartadoId`, `intentoAnteriorId?` decimal; 201 nuevo, 200 repetido; el controlador devuelve `id` como **clave opaca**, no ID SQL. | `submission.js` prepara sin sucesor; no puede producir el ID decimal previo con la respuesta pública actual. RF-23–RF-24, RF-32–RF-33. |
| `POST intentos/:id/reservar` | `:id` es clave opaca; mismo contenido/clave recupera cita pendiente; 201 nueva, 200 repetida. Cupo devuelve 409 `cupo_telefono_excedido`/`corregir`; precio visible se llama `costo`. | `submission.js` espera `costoAceptado`; `http.js` solo reconoce `portal_409`, por lo que descarta la causa específica. RF-23–RF-26, RF-32–RF-38. |
| `POST intentos/:id/resolver` | Clave opaca y apartado propio; 200 `registrado` con resumen o `no_registrado`; cupo añade `causa` y `puedeCorregir`. | `submission.js` resuelve incertidumbre, pero trata todo `no_registrado` como reinicio y no recibe ID decimal previo. RF-27–RF-34. |

Las respuestas públicas fallidas se normalizan a 400/401/403/404/409/500/503. La causa específica de cupo es la única que usa código distinto de `portal_<estado>`. La reserva guarda costo histórico internamente; si el precio está oculto, la respuesta omite el importe, sin convertirlo en cero ni demostrar aceptación informada. RF-32–RF-38, RF-58.

## Administración privada y llamadas actuales

| Rutas/contrato comprobados | Roles y cuerpo/respuesta relevantes | Estado del frontend |
| --- | --- | --- |
| `GET /negocios/:id`, `GET /licencias/:id/vigencia`, `GET /negocios/:id/envios` | Superadmin; negocio, licencia y estados de correo separados. | `screens/negocio/view.js` ya consulta las tres; texto de suspensión asume siempre 48 h. RF-39, RF-44. |
| `POST /licencias/:id/{suspender,reactivar,renovar}` | Solo superadmin; exige cabecera `Idempotency-Key` opaca de 16–64. Suspender admite `plazoDias` entero 0–30, omisión equivale a 2. Responden 200 con vista de vigencia. | `screens/negocio/actions.js` envía sin cabecera ni control de plazo; `modules/auth/session.js` no admite cabeceras adicionales. RF-40–RF-43, RF-47. |
| `GET /negocios/:id/cupo-usuarios`, `PATCH /negocios/:id/limites-usuarios` | Solo superadmin; PUT no existe. PATCH exige juntos `limiteProfesionalesActivos` y `limiteRecepcionistasActivos`, enteros >=1. | No hay panel de cupos de usuarios; `view.js` solo consulta cupo de sucursales. RF-45–RF-47. |
| `GET /profesionales/cupo`, `GET /recepcionistas/cupo` | Administrador propio; cada ruta devuelve límite/consumo del rol. | Formularios de alta/activación no consultan estos cupos; un 409 debe conservar captura. RF-45–RF-46. |
| `GET /{profesionales,recepcionistas,servicios,sucursales}/inhabilitados` y `/:id` | Administrador propio; lista/detalle fuera del catálogo operativo. | No hay vista de inhabilitados. RF-48–RF-50. |
| `POST /{profesionales,recepcionistas,servicios,sucursales}/:id/inhabilitar` y `/restaurar` | Administrador propio; 200 con recurso; restaurar deja inactivo. `desactivar/reactivar` siguen separadas, con cupo y conflictos vigentes. | Profesionales, servicios y sucursales aún llaman `DELETE` retirado; Recepción solo ofrece desactivar/reactivar. RF-48–RF-51. |
| `GET/PATCH /negocios/publicacion-catalogo` | Administrador propio; incluye `mostrarPreciosPublicos` booleano global, PATCH parcial. | No existe control conectado para esa publicación. RF-52. |
| `GET/PUT /disponibilidad/configuracion` | Solo Administrador de negocio; GET devuelve modo, `tiempoEntreCitasMinutos`, anticipación y horizonte; PUT reemplaza **los cuatro**. Separación: 0–60 múltiplo de 5. | Vista, validación y payload aún usan `intervaloMinutos`. RF-53–RF-54. |
| `GET/PUT /profesionales/:id/horario` | Administrador o profesional propio según fachada; semana completa de franjas, sin campos de descanso. Rutas `/excepciones` retiradas. | Payload semanal manda descanso y la vista conectada consulta excepciones; hay que conservar bloqueos. RF-55. |
| Cinco rutas privadas: `GET/PUT /disponibilidad/configuracion`, `GET /disponibilidad`, `POST /disponibilidad/validar`, `GET /disponibilidad/citas-afectadas` | Configuración solo Administrador; consultas/validación/afectadas por Administrador, Recepción y Profesional dentro de alcance. Modalidad manual existe solo en entrada privada. | `screens/disponibilidad/view.js` consume las cinco; revisar estados y permisos al adaptar campos. RF-56–RF-59. |

## Límites y fuentes de revisión

Las rutas retiradas no se sustituyen por una operación equivalente automática. Un 404 de `DELETE` o de excepciones no debe mostrarse como recurso vacío. No se añade lectura de auditoría ni escritor manual: no hay contrato frontend autorizado para ello. El único requisito nuevo de backend detectado para corregir por cupo es una referencia previa pública válida; actualmente el servidor exige ID decimal pero solo expone clave opaca. RF-32–RF-33 permanecen dependientes, y RF-30 conserva su dependencia de sesión pública tras bloqueo.

Archivos backend leídos: `src/reservas-publicas/portal-publico.controller.ts`, `intentos-reserva-publica.service.ts`, `resolucion-reserva-publica.service.ts`, `errores-publicos.ts`, `src/licencias/licencias.controller.ts`, `dto/operacion-licencia.dto.ts`, `src/negocios/negocios.controller.ts`, `publicacion-catalogo.controller.ts`, `src/disponibilidad/disponibilidad.controller.ts`, `configuracion-agenda.validador.ts`, `src/horarios/horarios.controller.ts` y controladores de los cuatro recursos. Contrapartes frontend: `src/connected/public/`, `screens/negocio/`, `screens/disponibilidad/`, `modules/auth/session.js`, `modules/{profesionales,servicios,sucursales}/operations.js` y `src/shared/screens/disponibilidad/`.
