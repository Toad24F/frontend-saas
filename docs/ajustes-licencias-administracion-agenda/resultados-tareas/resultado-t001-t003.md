# Resultado FALA-T001–T003 — trazabilidad, contratos y prueba aislada

Revisión base frontend `38d4b33`, backend `7eaf562`. Alcance: documentación de análisis y un caso Playwright focalizado; no se modificó producto ni ningún archivo del backend. La constitución, spec y plan siguen siendo propuestas; estas tres tareas preparatorias no acreditan RF de producto.

## Qué se hizo y por qué

1. **T001:** [matriz-aceptacion-t001.md](matriz-aceptacion-t001.md) vincula cada RF-01–RF-62 con tareas y un caso observable. Deja RF-30 y RF-32–RF-33 explícitamente dependientes de contratos aún insuficientes; evita confundir una casilla de planificación con una función terminada.
2. **T002:** [inventario-contratos-t002.md](inventario-contratos-t002.md) compara controladores, DTO y permisos del backend con llamadas del frontend. Enumera las nueve rutas públicas, las cinco operaciones privadas de disponibilidad y los cambios de licencias, cupos, recursos, precio y horario. Explica qué llama hoy la UI y qué contrato falta; no añade rutas supuestas.
3. **T003:** `tests/browser/portal.spec.js` recibió un caso que abre el portal conectado, comprueba el nombre de la base temporal mediante `SELECT DATABASE()` y constata que solo contiene los dos negocios de fixture. El comentario junto al caso explica la barrera entre base temporal y cotidiana.
4. `tests/browser/global-setup.js` recibió un modo `PORTAL_TEST_BACKEND_READ_ONLY=1`: usa el build preexistente de `../backend` y verifica los archivos indispensables antes de iniciar. El modo normal conserva su compilación anterior. El comentario del bloque explica por qué el recorrido de esta tarea no escribe archivos en el backend.
5. `docs/ajustes-licencias-administracion-agenda/tareas.md` marca únicamente T001–T003 después de verificar sus criterios. Los demás RF y tareas permanecen pendientes.

## Flujo del caso de navegador y aislamiento

El setup lee configuración local del backend, genera un nombre `citas_persistencia_<UUID>`, exige que sea distinto de la base cotidiana, crea **esa base de prueba**, aplica migraciones y siembra dos negocios ficticios. Levanta backend ya compilado y Vite en puertos temporales. Playwright visita `/reservas/portal-qa-1`; la lectura SQL se limita a `PORTAL_TEST_DB_NAME` y compara `SELECT DATABASE()` con el nombre efímero. Al terminar, el teardown cierra servidores y conexiones y ejecuta `DROP DATABASE` sobre el nombre temporal; la rama de error hace la misma limpieza. El caso no escribe en la base cotidiana. El modo de solo lectura evita compilar o modificar archivos del backend durante esta ejecución.

## Pruebas ejecutadas y límites

| Comando/comprobación | Resultado real |
| --- | --- |
| `npm test` tras escribir primero el caso Playwright | 160/160 pruebas Node aprobadas, 0 fallidas, 0 omitidas, código 0. Esta suite no ejecuta Playwright. |
| `PORTAL_TEST_BACKEND_READ_ONLY=1 npm run test:browser -- --grep FALA-T003` en sandbox | Código 1: `AggregateError` al conectar con MariaDB antes de crear la base. No se contabilizó como prueba aprobada. |
| Mismo comando con ejecución de red autorizada por auto-review | 1/1 prueba Playwright aprobada en 9.2 s, código 0. Usó el build backend existente, cuya salida `dist/main.js` ya incorporaba el módulo ALA. |
| Revisión estática del runner y del caso | La conexión SQL de `rows()` exige patrón de base efímera; setup y teardown restringen creación/eliminación al nombre generado. |

La conexión de base no estuvo disponible dentro del sandbox inicial; la ejecución autorizada sí permitió la prueba aislada. No se ejecutó la suite Playwright completa ni se validaron todavía los cambios funcionales del frontend. Los resultados de Node pertenecen al estado actual e incluyen pruebas históricas que aún esperan adaptación ALA; pasar no significa que los RF nuevos ya estén implementados.
