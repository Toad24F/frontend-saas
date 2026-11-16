# Verificación de navegador M4-T116–T124

Se corrige exclusivamente el ejecutor de pruebas; no se modifica la interfaz ni los permisos.

- tests/browser/support.js exporta una fixture automática que limpia limites_intentos antes de cada caso, solo en la base efímera validada por rows. Evita que los logins correctos de otros tests consuman el límite del caso siguiente. El guard y el login reales siguen activos.
- Los seis archivos *.spec.js importan esa fixture común para aislar el contador.
- tests/browser/portal.spec.js selecciona fechas con los botones del calendario actual y asigna un teléfono ficticio diferente por caso. Conserva el cupo real por sucursal y las comprobaciones de reservas, respuesta perdida, teclado y vencimiento.

Primero se ejecutó la suite completa y se observaron errores de límite de login y del selector antiguo de fecha. Se repite la suite tras ajustar el ejecutor. Los resultados definitivos, revisiones y límites se registran en el [informe de cierre](../../backend/docs/fase-5-modulo-4/resultados-tareas/m4-t116-t124.md). Las respuestas simuladas de algunos escenarios conservan ese alcance; los escritores reales se verifican también desde backend con MariaDB efímera y navegador.

El bloque beforeAll del portal restaura las siete jornadas y retira los bloqueos de su Profesional ficticio después de las pruebas que modifican la semana. Todas las escrituras usan rows y su validación del nombre efímero. No se atribuye disponibilidad a un día que el backend no ofrece.

Las trazas revelaron que el span visible del horario intercepta la pulsación del radio de un píxel. El helper pulsa la etiqueta visible y comprueba después el radio marcado, sin forzar eventos. La comprobación de ausencia de superposición del botón móvil espera la transición mediante expect.poll y acepta sus descendientes; un elemento ajeno sigue rechazándose.

## Resultado final

Tras aprobar HTTP backend: build aprobado (1,02 s), Node 281/281 (1.059,1034 ms) y npm run test:browser 33/33 (7,9 min), código 0 y sin omisiones ni reintentos configurados. Edge 157.0.4341.60, Playwright 1.64.1, Chromium headless, un worker. El archivo portal es lento porque conserva los cinco minutos reales del apartado. El backend también revalidó los siete recorridos operativos M4 con API real: 7/7. No se declara lint frontend: no existe ese script.

El informe de backend conserva las ejecuciones fallidas previas (17, 12 y 2 fallos), sus causas, la comprobación focal tras cada corrección y el resultado completo de la versión final. Se mantiene la demo como referencia y no se publica ni habilita producción.
