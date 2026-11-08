# Resultado M3-T133 — evidencia de navegador de la revisión final

Fecha: 21 de octubre de 2026. Revisión base del backend: `ae9c8c9`. El frontend no contiene una carpeta `.git`; esta evidencia identifica sus archivos y el comando reproducible.

## Flujo verificado

Playwright abre el portal conectado en `/reservas/portal-qa-1`. Su preparación compila el backend, crea una base MariaDB desechable con nombre aleatorio validado, aplica las migraciones, siembra dos negocios ficticios y levanta NestJS y Vite en puertos locales. Los casos recorren página pública → API real → base temporal; las consultas SQL de lectura comprueban las filas finales. Al terminar, el runner cierra ambos servidores y elimina la base creada. La configuración usa Microsoft Edge sin interfaz, un trabajador y trazas solo ante fallos.

Esta ejecución repitió la suite completa porque el backend había cambiado desde la evidencia anterior de T117–T124. Así se comprobó el portal con los controles de cierre y métricas de T126–T131 presentes. No se cambiaron archivos de producto ni pruebas de navegador durante T133. Los comentarios existentes de `global-setup.js`, `support.js` y `portal.spec.js` explican la base temporal, el lector limitado a ella y los bloques de espera y concurrencia; no se añadió código nuevo que requiera comentarios adicionales. No se aplicó una skill de diseño porque no se modificó la interfaz.

## Archivos y propósito

| Archivo | Función en esta revisión |
| --- | --- |
| `tests/browser/global-setup.js` | Prepara backend y Vite, crea/migra/siembra la base temporal y limpia procesos y base al finalizar. Solo se ejecutó; no se modificó. |
| `tests/browser/support.js` | Construye la URL pública y limita las lecturas SQL a la base temporal validada. Solo se ejecutó; no se modificó. |
| `tests/browser/portal.spec.js` | Contiene los nueve recorridos de T117–T124. Solo se ejecutó; no se modificó. |
| `playwright.config.js` | Fija Edge, un trabajador, el setup y las trazas ante fallo. Solo se utilizó; no se modificó. |
| `docs/fase-4/resultados-tareas/resultado-t133.md` | Archivo nuevo: consolida el flujo, la cobertura, el resultado actual y sus límites. |
| `../backend/docs/fase-4-modulo-3/tareas.md` | Se marca M3-T133 y se enlaza esta evidencia. |

## Pruebas primero y resultado

Se ejecutó `npm run test:browser` desde `frontend-saas` antes de escribir esta documentación. Resultado: **9 aprobadas, 0 fallidas, 0 omitidas**, en **5.5 minutos**. Node `v24.20.0`, npm `11.19.0` y Playwright `1.64.1`. La suite usó una base nueva desechable y no la base cotidiana.

| Caso | Comprobación aprobada |
| --- | --- |
| T117 | La ruta pública carga oferta real de prueba. |
| T118 | En móvil 390 × 844 se corrige contacto, se obtiene un folio y queda exactamente una cita pendiente; no hay desbordamiento horizontal. |
| T119 | Teclado y foco recorren el formulario; notas con apariencia HTML permanecen como texto y no ejecutan código. |
| T120 | Dos pestañas comparten sesión, notifican sustitución y liberan el apartado anterior cuando falla otro reemplazo. |
| T121 | Navegadores independientes no leen apartados ni resultados ajenos y no producen doble ocupación. |
| T122 | Recarga limpia contacto y libera el apartado; cookies bloqueadas impiden continuar con explicación. |
| T123, respuesta posterior al commit | Recarga recupera el mismo folio persistido. |
| T123, pérdida anterior al escritor | La resolución termina sin una cita tardía. |
| T124 | Tras cambiar el reloj del navegador y poner la pestaña en segundo plano, el apartado vence en el plazo real del servidor (5.1 minutos para este caso), muestra el aviso y deshabilita Reservar. |

## Alcance

La ejecución acredita estos casos en Edge sin interfaz con API y MariaDB temporal. La pestaña en segundo plano no reproduce la suspensión física de todos los dispositivos. T133 consolida la revisión de navegador; no acredita publicación, configuración de Nginx ni cierre de fase. T132 ya documentó por separado build y pruebas Node del frontend. No se ejecutó lint porque este repositorio no define ese script.
