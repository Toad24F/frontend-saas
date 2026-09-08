# Diccionario de datos

Modelo de referencia para la futura API. El frontend no está conectado a esta base. Generado desde `db/schema.sql` con `node scripts/dictionary.mjs`.

MySQL 8.0.16+ / MariaDB 10.6+, InnoDB, utf8mb4. No se ejecutó en un servidor de base de datos en esta entrega. Los campos `negocio_id` corresponden al `tenantId` de las entidades ficticias del frontend.

## Convenciones

- Importes en MXN, con dos decimales; no existe tabla de pagos.
- Intervalos de agenda `[inicio, fin)`: dos citas contiguas pueden compartir el instante límite.
- Fechas/horas de atención: hora local del negocio; marcas técnicas y expiración: UTC.
- Las FKs compuestas incluyen siempre el negocio. Las FKs no sustituyen autorización ni evitan por sí mismas solapamientos.
- `personal_id` / `sucursal_id` nulos en bloqueos: todos los profesionales / sucursales del negocio. Dos horas nulas: todo el día.
- `usuarios.negocio_id` solo es nulo para superadministración.

## negocios

Raíz de aislamiento, marca y configuración de agenda.

| Campo                   | Tipo                                         | Nulo | Valor por defecto   | Descripción                                         |
| ----------------------- | -------------------------------------------- | ---- | ------------------- | --------------------------------------------------- |
| `id`                    | `INT UNSIGNED`                               | No   | —                   | Identificador primario autoincremental.             |
| `nombre`                | `VARCHAR(150)`                               | No   | —                   | Nombre visible.                                     |
| `slug`                  | `VARCHAR(100)`                               | No   | —                   | Segmento único de la URL pública.                   |
| `email_contacto`        | `VARCHAR(150)`                               | No   | —                   | Correo de contacto del negocio.                     |
| `telefono_contacto`     | `VARCHAR(20)`                                | Sí   | —                   | Teléfono de contacto.                               |
| `zona_horaria`          | `VARCHAR(64)`                                | No   | 'America/Chihuahua' | Zona horaria IANA para interpretar la agenda local. |
| `modo_agenda`           | `ENUM('ventana_libre','llenado_secuencial')` | No   | 'ventana_libre'     | Estrategia de oferta de espacios.                   |
| `lock_segundos`         | `SMALLINT UNSIGNED`                          | No   | 300                 | Vigencia configurada del apartamiento.              |
| `confirmacion_whatsapp` | `BOOLEAN`                                    | No   | TRUE                | Habilita la confirmación automática futura.         |
| `recordatorio_whatsapp` | `BOOLEAN`                                    | No   | TRUE                | Habilita el recordatorio futuro.                    |
| `recordatorio_horas`    | `SMALLINT UNSIGNED`                          | No   | 24                  | Anticipación del recordatorio en horas.             |
| `estado`                | `ENUM('activo','suspendido')`                | No   | 'activo'            | Estado del registro, limitado por el ENUM.          |
| `creado_en`             | `TIMESTAMP`                                  | No   | CURRENT_TIMESTAMP   | Marca técnica de creación, en UTC.                  |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
CONSTRAINT ck_negocio_lock CHECK (lock_segundos BETWEEN 60 AND 900)
CONSTRAINT ck_negocio_recordatorio CHECK (recordatorio_horas BETWEEN 1 AND 168)
```

## licencias

Vigencia y estado de acceso del negocio.

| Campo        | Tipo                                  | Nulo | Valor por defecto | Descripción                                                              |
| ------------ | ------------------------------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`         | `INT UNSIGNED`                        | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id` | `INT UNSIGNED`                        | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `inicia_en`  | `DATE`                                | No   | —                 | Inicio de vigencia de la licencia.                                       |
| `vence_en`   | `DATE`                                | No   | —                 | Fin de vigencia de la licencia.                                          |
| `estado`     | `ENUM('activa','vencida','revocada')` | No   | 'activa'          | Estado del registro, limitado por el ENUM.                               |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
CONSTRAINT fk_licencia_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT ck_licencia_fechas CHECK (vence_en >= inicia_en)
INDEX ix_licencia_vigencia (negocio_id, estado, vence_en)
```

## usuarios

Cuentas futuras de acceso con rol y pertenencia.

| Campo           | Tipo                                                               | Nulo | Valor por defecto | Descripción                                                              |
| --------------- | ------------------------------------------------------------------ | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`            | `INT UNSIGNED`                                                     | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`    | `INT UNSIGNED`                                                     | Sí   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `nombre`        | `VARCHAR(150)`                                                     | No   | —                 | Nombre visible.                                                          |
| `email`         | `VARCHAR(150)`                                                     | No   | —                 | Correo de contacto o de acceso según la tabla.                           |
| `password_hash` | `VARCHAR(255)`                                                     | No   | —                 | Hash de contraseña generado en servidor; jamás contraseña plana.         |
| `rol`           | `ENUM('superadmin','admin_negocio','recepcionista','profesional')` | No   | —                 | Rol de autorización de la futura API.                                    |
| `activo`        | `BOOLEAN`                                                          | No   | TRUE              | Baja lógica: conservar relaciones históricas.                            |
| `creado_en`     | `TIMESTAMP`                                                        | No   | CURRENT_TIMESTAMP | Marca técnica de creación, en UTC.                                       |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_usuario_tenant (negocio_id,id)
CONSTRAINT fk_usuario_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT ck_usuario_ambito CHECK (
```

## sucursales

Ubicaciones físicas y datos de llegada.

| Campo           | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| --------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`            | `INT UNSIGNED` | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`    | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `nombre`        | `VARCHAR(150)` | No   | —                 | Nombre visible.                                                          |
| `direccion`     | `VARCHAR(255)` | No   | —                 | Dirección física.                                                        |
| `telefono`      | `VARCHAR(20)`  | Sí   | —                 | Teléfono; en clientes se exigen exactamente 10 dígitos.                  |
| `notas_llegada` | `TEXT`         | Sí   | —                 | Indicaciones para encontrar la sucursal.                                 |
| `activo`        | `BOOLEAN`      | No   | TRUE              | Baja lógica: conservar relaciones históricas.                            |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_sucursal_tenant (negocio_id,id)
CONSTRAINT fk_sucursal_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
```

## servicios

Catálogo y duración para calcular disponibilidad.

| Campo              | Tipo                | Nulo | Valor por defecto | Descripción                                                              |
| ------------------ | ------------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`               | `INT UNSIGNED`      | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`       | `INT UNSIGNED`      | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `nombre`           | `VARCHAR(150)`      | No   | —                 | Nombre visible.                                                          |
| `descripcion`      | `VARCHAR(255)`      | Sí   | —                 | Descripción pública del servicio.                                        |
| `costo`            | `DECIMAL(10,2)`     | No   | 0                 | Precio actual del catálogo en MXN; no representa un pago.                |
| `duracion_minutos` | `SMALLINT UNSIGNED` | No   | —                 | Duración requerida de la atención.                                       |
| `activo`           | `BOOLEAN`           | No   | TRUE              | Baja lógica: conservar relaciones históricas.                            |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_servicio_tenant (negocio_id,id)
CONSTRAINT fk_servicio_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT ck_servicio_costo CHECK (costo >= 0)
CONSTRAINT ck_servicio_duracion CHECK (duracion_minutos BETWEEN 1 AND 1440)
```

## personal

Profesionales; usuario de acceso opcional.

| Campo          | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| -------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`           | `INT UNSIGNED` | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`   | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `usuario_id`   | `INT UNSIGNED` | Sí   | —                 | Vinculación opcional con una cuenta del mismo negocio.                   |
| `nombre`       | `VARCHAR(150)` | No   | —                 | Nombre visible.                                                          |
| `especialidad` | `VARCHAR(150)` | Sí   | —                 | Área de atención del profesional.                                        |
| `email`        | `VARCHAR(150)` | Sí   | —                 | Correo de contacto o de acceso según la tabla.                           |
| `telefono`     | `VARCHAR(20)`  | Sí   | —                 | Teléfono; en clientes se exigen exactamente 10 dígitos.                  |
| `activo`       | `BOOLEAN`      | No   | TRUE              | Baja lógica: conservar relaciones históricas.                            |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_personal_tenant (negocio_id,id)
UNIQUE KEY uq_personal_usuario (negocio_id,usuario_id)
CONSTRAINT fk_personal_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT fk_personal_usuario FOREIGN KEY (negocio_id,usuario_id) REFERENCES usuarios(negocio_id,id)
```

## personal_servicios

Relación muchos a muchos entre profesionales y servicios del mismo negocio.

| Campo         | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| ------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `negocio_id`  | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id` | `INT UNSIGNED` | No   | —                 | Profesional perteneciente al negocio del registro.                       |
| `servicio_id` | `INT UNSIGNED` | No   | —                 | Servicio perteneciente al negocio del registro.                          |

Relaciones e índices (definición completa en el script SQL):

```sql
PRIMARY KEY (negocio_id,personal_id,servicio_id)
CONSTRAINT fk_ps_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id)
CONSTRAINT fk_ps_servicio FOREIGN KEY (negocio_id,servicio_id) REFERENCES servicios(negocio_id,id)
```

## personal_sucursales

Relación muchos a muchos entre profesionales y sucursales del mismo negocio.

| Campo         | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| ------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `negocio_id`  | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id` | `INT UNSIGNED` | No   | —                 | Profesional perteneciente al negocio del registro.                       |
| `sucursal_id` | `INT UNSIGNED` | No   | —                 | Ubicación perteneciente al negocio del registro.                         |

Relaciones e índices (definición completa en el script SQL):

```sql
PRIMARY KEY (negocio_id,personal_id,sucursal_id)
CONSTRAINT fk_psu_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id)
CONSTRAINT fk_psu_sucursal FOREIGN KEY (negocio_id,sucursal_id) REFERENCES sucursales(negocio_id,id)
```

## horarios_personal

Bloques de atención recurrentes. Los descansos se representan como huecos entre bloques.

| Campo         | Tipo               | Nulo | Valor por defecto | Descripción                                                              |
| ------------- | ------------------ | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`          | `INT UNSIGNED`     | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`  | `INT UNSIGNED`     | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id` | `INT UNSIGNED`     | No   | —                 | Profesional perteneciente al negocio del registro.                       |
| `sucursal_id` | `INT UNSIGNED`     | No   | —                 | Ubicación perteneciente al negocio del registro.                         |
| `dia_semana`  | `TINYINT UNSIGNED` | No   | —                 | 0 domingo a 6 sábado.                                                    |
| `hora_inicio` | `TIME`             | No   | —                 | Inicio inclusivo del intervalo en hora local.                            |
| `hora_fin`    | `TIME`             | No   | —                 | Fin exclusivo del intervalo en hora local.                               |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
CONSTRAINT fk_horario_asignacion FOREIGN KEY (negocio_id,personal_id,sucursal_id)
REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id)
CONSTRAINT ck_horario_dia CHECK (dia_semana BETWEEN 0 AND 6)
CONSTRAINT ck_horario_horas CHECK (hora_fin > hora_inicio)
INDEX ix_horario_disponibilidad (negocio_id,personal_id,dia_semana)
```

## bloqueos_horario

Excepciones por fecha; pueden afectar un profesional, una sucursal o todo el negocio.

| Campo          | Tipo                                        | Nulo | Valor por defecto | Descripción                                                              |
| -------------- | ------------------------------------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`           | `INT UNSIGNED`                              | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`   | `INT UNSIGNED`                              | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id`  | `INT UNSIGNED`                              | Sí   | —                 | Profesional perteneciente al negocio del registro.                       |
| `sucursal_id`  | `INT UNSIGNED`                              | Sí   | —                 | Ubicación perteneciente al negocio del registro.                         |
| `tipo`         | `ENUM('vacaciones','feriado','emergencia')` | No   | —                 | Tipo de bloqueo o notificación según el ENUM.                            |
| `fecha_inicio` | `DATE`                                      | No   | —                 | Primer día del rango, incluido.                                          |
| `fecha_fin`    | `DATE`                                      | No   | —                 | Último día del rango, incluido.                                          |
| `hora_inicio`  | `TIME`                                      | Sí   | —                 | Inicio inclusivo del intervalo en hora local.                            |
| `hora_fin`     | `TIME`                                      | Sí   | —                 | Fin exclusivo del intervalo en hora local.                               |
| `motivo`       | `VARCHAR(255)`                              | No   | —                 | Justificación del bloqueo.                                               |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
CONSTRAINT fk_bloqueo_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT fk_bloqueo_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id)
CONSTRAINT fk_bloqueo_sucursal FOREIGN KEY (negocio_id,sucursal_id) REFERENCES sucursales(negocio_id,id)
CONSTRAINT ck_bloqueo_fechas CHECK (fecha_fin >= fecha_inicio)
CONSTRAINT ck_bloqueo_horas CHECK (
INDEX ix_bloqueo_fecha (negocio_id,fecha_inicio,fecha_fin)
```

## clientes

Directorio de pacientes/clientes separado por negocio.

| Campo             | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| ----------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`              | `INT UNSIGNED` | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`      | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `nombre_completo` | `VARCHAR(150)` | No   | —                 | Nombre y apellidos capturados en la reserva.                             |
| `telefono`        | `VARCHAR(10)`  | No   | —                 | Teléfono; en clientes se exigen exactamente 10 dígitos.                  |
| `email`           | `VARCHAR(150)` | Sí   | —                 | Correo de contacto o de acceso según la tabla.                           |
| `creado_en`       | `TIMESTAMP`    | No   | CURRENT_TIMESTAMP | Marca técnica de creación, en UTC.                                       |

Relaciones e índices (definición completa en el script SQL):

```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_cliente_tenant (negocio_id,id)
UNIQUE KEY uq_cliente_telefono (negocio_id,telefono)
CONSTRAINT fk_cliente_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
CONSTRAINT ck_cliente_telefono CHECK (telefono REGEXP '^[0-9]{10}$')
```

## citas

Reserva, estado y precio histórico acordado.

| Campo             | Tipo                                                                   | Nulo | Valor por defecto | Descripción                                                                |
| ----------------- | ---------------------------------------------------------------------- | ---- | ----------------- | -------------------------------------------------------------------------- |
| `id`              | `BIGINT UNSIGNED`                                                      | No   | —                 | Identificador primario autoincremental.                                    |
| `negocio_id`      | `INT UNSIGNED`                                                         | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente.   |
| `sucursal_id`     | `INT UNSIGNED`                                                         | No   | —                 | Ubicación perteneciente al negocio del registro.                           |
| `personal_id`     | `INT UNSIGNED`                                                         | No   | —                 | Profesional perteneciente al negocio del registro.                         |
| `servicio_id`     | `INT UNSIGNED`                                                         | No   | —                 | Servicio perteneciente al negocio del registro.                            |
| `cliente_id`      | `INT UNSIGNED`                                                         | No   | —                 | Cliente perteneciente al negocio de la cita.                               |
| `fecha`           | `DATE`                                                                 | No   | —                 | Día local de atención o de exclusión.                                      |
| `hora_inicio`     | `TIME`                                                                 | No   | —                 | Inicio inclusivo del intervalo en hora local.                              |
| `hora_fin`        | `TIME`                                                                 | No   | —                 | Fin exclusivo del intervalo en hora local.                                 |
| `precio_acordado` | `DECIMAL(10,2)`                                                        | No   | —                 | Precio fijado al reservar; conserva historia aunque cambie el catálogo.    |
| `estado`          | `ENUM('pendiente','confirmada','completada','cancelada','no_asistio')` | No   | 'pendiente'       | Estado del registro, limitado por el ENUM.                                 |
| `motivo_consulta` | `TEXT`                                                                 | Sí   | —                 | Texto opcional; requiere protección y política de retención en producción. |
| `folio`           | `VARCHAR(40)`                                                          | No   | —                 | Referencia de control; no autoriza consultar información privada.          |
| `origen`          | `ENUM('portal_publico','manual')`                                      | No   | —                 | Reserva del portal o captura manual.                                       |
| `creado_en`       | `TIMESTAMP`                                                            | No   | CURRENT_TIMESTAMP | Marca técnica de creación, en UTC.                                         |
| `actualizado_en`  | `TIMESTAMP`                                                            | No   | CURRENT_TIMESTAMP | Última modificación técnica, en UTC.                                       |

Relaciones e índices (definición completa en el script SQL):

```sql
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_cita_tenant (negocio_id,id)
CONSTRAINT fk_cita_servicio FOREIGN KEY (negocio_id,personal_id,servicio_id)
REFERENCES personal_servicios(negocio_id,personal_id,servicio_id)
CONSTRAINT fk_cita_sucursal FOREIGN KEY (negocio_id,personal_id,sucursal_id)
REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id)
CONSTRAINT fk_cita_cliente FOREIGN KEY (negocio_id,cliente_id) REFERENCES clientes(negocio_id,id)
CONSTRAINT ck_cita_horas CHECK (hora_fin > hora_inicio)
CONSTRAINT ck_cita_precio CHECK (precio_acordado >= 0)
INDEX ix_cita_disponibilidad (negocio_id,personal_id,fecha,estado,hora_inicio,hora_fin)
INDEX ix_cita_reporte (negocio_id,fecha,estado,sucursal_id,servicio_id)
```

## bloqueos_temporales

Apartamiento con token opaco y expiración en UTC.

| Campo         | Tipo              | Nulo | Valor por defecto | Descripción                                                              |
| ------------- | ----------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`          | `BIGINT UNSIGNED` | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`  | `INT UNSIGNED`    | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id` | `INT UNSIGNED`    | No   | —                 | Profesional perteneciente al negocio del registro.                       |
| `sucursal_id` | `INT UNSIGNED`    | No   | —                 | Ubicación perteneciente al negocio del registro.                         |
| `servicio_id` | `INT UNSIGNED`    | No   | —                 | Servicio perteneciente al negocio del registro.                          |
| `fecha`       | `DATE`            | No   | —                 | Día local de atención o de exclusión.                                    |
| `hora_inicio` | `TIME`            | No   | —                 | Inicio inclusivo del intervalo en hora local.                            |
| `hora_fin`    | `TIME`            | No   | —                 | Fin exclusivo del intervalo en hora local.                               |
| `token_hash`  | `CHAR(64)`        | No   | —                 | SHA-256 del token secreto aleatorio; no almacenar el token en claro.     |
| `expira_en`   | `DATETIME(3)`     | No   | —                 | Vencimiento UTC con milisegundos.                                        |

Relaciones e índices (definición completa en el script SQL):

```sql
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
CONSTRAINT fk_lock_servicio FOREIGN KEY (negocio_id,personal_id,servicio_id)
REFERENCES personal_servicios(negocio_id,personal_id,servicio_id)
CONSTRAINT fk_lock_sucursal FOREIGN KEY (negocio_id,personal_id,sucursal_id)
REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id)
CONSTRAINT ck_lock_horas CHECK (hora_fin > hora_inicio)
INDEX ix_lock_vigencia (negocio_id,personal_id,fecha,expira_en)
```

## agenda_mutex

Fila de exclusión por negocio, profesional y día para transacciones futuras.

| Campo         | Tipo           | Nulo | Valor por defecto | Descripción                                                              |
| ------------- | -------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `negocio_id`  | `INT UNSIGNED` | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `personal_id` | `INT UNSIGNED` | No   | —                 | Profesional perteneciente al negocio del registro.                       |
| `fecha`       | `DATE`         | No   | —                 | Día local de atención o de exclusión.                                    |

Relaciones e índices (definición completa en el script SQL):

```sql
PRIMARY KEY (negocio_id,personal_id,fecha)
CONSTRAINT fk_mutex_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id)
```

## notificaciones_whatsapp

Cola y bitácora de confirmación/recordatorio con deduplicación.

| Campo           | Tipo                                    | Nulo | Valor por defecto | Descripción                                                              |
| --------------- | --------------------------------------- | ---- | ----------------- | ------------------------------------------------------------------------ |
| `id`            | `BIGINT UNSIGNED`                       | No   | —                 | Identificador primario autoincremental.                                  |
| `negocio_id`    | `INT UNSIGNED`                          | No   | —                 | Identificador del tenant; no confiar en un valor enviado por el cliente. |
| `cita_id`       | `BIGINT UNSIGNED`                       | No   | —                 | Cita del mismo negocio.                                                  |
| `tipo`          | `ENUM('confirmacion','recordatorio')`   | No   | —                 | Tipo de bloqueo o notificación según el ENUM.                            |
| `estado_envio`  | `ENUM('pendiente','enviado','fallido')` | No   | 'pendiente'       | Estado de procesamiento del proveedor.                                   |
| `programado_en` | `DATETIME(3)`                           | No   | —                 | Instante UTC programado para el envío.                                   |
| `enviado_en`    | `DATETIME(3)`                           | Sí   | —                 | Instante UTC del envío confirmado.                                       |
| `intentos`      | `SMALLINT UNSIGNED`                     | No   | 0                 | Cantidad de intentos efectuados.                                         |
| `proveedor_id`  | `VARCHAR(150)`                          | Sí   | —                 | Referencia de entrega del proveedor, sin credenciales.                   |
| `ultimo_error`  | `VARCHAR(255)`                          | Sí   | —                 | Error depurado sin tokens ni información sensible.                       |

Relaciones e índices (definición completa en el script SQL):

```sql
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
UNIQUE KEY uq_notificacion_tipo (negocio_id,cita_id,tipo)
CONSTRAINT fk_notificacion_cita FOREIGN KEY (negocio_id,cita_id) REFERENCES citas(negocio_id,id)
INDEX ix_notificacion_cola (estado_envio,programado_en)
```

## Normalización y diferencias frente al esquema de referencia

Los catálogos, usuarios, clientes y reservas están separados. Las relaciones N:M usan tablas puente con `negocio_id` y claves compuestas. Se conserva `precio_acordado` como hecho histórico de la reserva, independiente del precio actual. Se agregan configuración de agenda y WhatsApp, licencias, vínculo opcional usuario/profesional y la fila de exclusión `agenda_mutex`. El script original del usuario permanece intacto.
