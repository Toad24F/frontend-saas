# Resultado FALA-T048–T050

## Flujo

En **Disponibilidad → Reglas del negocio**, el Administrador modifica modo, tiempo entre citas, anticipación y horizonte. Al enviar, la UI convierte los números y valida que el tiempo entre citas sea cero o un múltiplo de cinco hasta sesenta. El PUT a `/disponibilidad/configuracion` contiene exactamente esos cuatro campos; el antiguo `intervaloMinutos` y cualquier otro dato de pantalla quedan fuera. Solo una respuesta que confirme los cuatro valores sustituye el estado vigente y muestra el aviso de guardado.

Ante un 400, el campo nombrado por la API muestra el error. Ante un 503, aparece el error general. En ambos casos se conserva el borrador completo para corregir o reintentar, mientras los datos confirmados anteriores permanecen aparte. Una respuesta exitosa pero incompleta o distinta tampoco se anuncia como guardada.

En **Equipo → Horario semanal**, el payload conectado de `PUT /profesionales/:id/horario` ya no envía `descansoInicioMinutos` ni `descansoFinMinutos`. Una pausa se representa terminando una franja y comenzando otra más tarde, por ejemplo 09:00–12:00 y 13:00–17:00. Hasta que T051 retire los campos visibles de descanso, intentar usarlos en modo conectado señala que se requieren dos franjas; así no se pierde silenciosamente una pausa capturada. La demo conserva su comportamiento ficticio.

## Archivos afectados

| Archivo | Qué hace |
| --- | --- |
| `src/connected/modules/disponibilidad/configuration.js` | Nuevo constructor del PUT exacto y controlador de respuesta: valida cuatro campos, confirma el reemplazo o conserva dato vigente y borrador con errores. |
| `src/connected/screens/disponibilidad/actions.js` | Convierte los campos del formulario conectado sin transformar una ausencia en cero y llama al guardado. |
| `src/connected/screens/disponibilidad/view.js` | Presenta el estado ocupado y aplica el resultado confirmado o el borrador con errores; solo devuelve éxito real para el aviso. |
| `src/connected/modules/disponibilidad/payload.js` | Excluye campos de descanso y ordena las franjas semanales enviadas a la API. |
| `src/shared/screens/disponibilidad/errors.js` | Señala descansos incrustados en modo conectado; conserva la validación previa de demo. |
| `tests/ala-agenda-semana.test.js` | Prueba PUT exacto, valores 0/5/60 e inválidos, 400/503, respuesta incongruente y dos franjas sin descansos. |
| `tests/backend.test.js` | Actualiza la expectativa del payload semanal al contrato sin descanso. |
| `tests/browser/agenda-configuracion.spec.js` | Prueba con API y base temporal el formulario, errores 400/503 y el horario de dos franjas; captura tamaños y temas para revisión. |
| `README.md` | Corrige la descripción conectada: una pausa usa dos franjas. |
| `tareas.md` | Marca T048–T050 como terminadas. |

## Verificación y límites

Las pruebas se escribieron primero: fallaron porque faltaba el módulo de configuración y el payload todavía enviaba descansos. Después de implementar, `npm test` pasó **188/188**. La prueba de navegador específica pasó **2/2** con el backend real de prueba y una base temporal creada mediante `.env.test.local`; el runner la eliminó al terminar. El primer caso simuló 400 y 503 en la frontera HTTP, comprobó que el borrador siguiera capturado y luego confirmó un PUT real con exactamente cuatro campos. El segundo guardó dos franjas reales, comprobó respuesta 200 y verificó que la petición no tuviera propiedades de descanso. `npm run build` y `git diff --check` pasaron.

Se tomaron y revisaron capturas del formulario conectado a 1280 px y 390 px en ambos temas. El formulario y su botón aparecen en las cuatro; algunas capturas incluyen superposiciones de navegación durante el cambio de tema/ancho, por lo que no sirven como certificación visual del estado sin superposición. T051 retiró después los controles conectados de descanso y las rutas de excepciones; su resultado está en `resultado-t051-t053.md`. No se modificó el backend ni su base habitual.
