-- Cita: modelo de referencia para la futura API; el prototipo no ejecuta SQL.
-- Instalación en una base NUEVA. MySQL 8.0.16+ / MariaDB 10.6+.
-- No modifica la base citas_saas del proyecto original.
CREATE DATABASE IF NOT EXISTS citas_saas_prototipo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citas_saas_prototipo;

CREATE TABLE negocios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  email_contacto VARCHAR(150) NOT NULL,
  telefono_contacto VARCHAR(20) NULL,
  zona_horaria VARCHAR(64) NOT NULL DEFAULT 'America/Chihuahua',
  modo_agenda ENUM('ventana_libre','llenado_secuencial') NOT NULL DEFAULT 'ventana_libre',
  lock_segundos SMALLINT UNSIGNED NOT NULL DEFAULT 300,
  confirmacion_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  recordatorio_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  recordatorio_horas SMALLINT UNSIGNED NOT NULL DEFAULT 24,
  estado ENUM('activo','suspendido') NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_negocio_lock CHECK (lock_segundos BETWEEN 60 AND 900),
  CONSTRAINT ck_negocio_recordatorio CHECK (recordatorio_horas BETWEEN 1 AND 168)
) ENGINE=InnoDB;

CREATE TABLE licencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  inicia_en DATE NOT NULL,
  vence_en DATE NOT NULL,
  estado ENUM('activa','vencida','revocada') NOT NULL DEFAULT 'activa',
  CONSTRAINT fk_licencia_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT ck_licencia_fechas CHECK (vence_en >= inicia_en),
  INDEX ix_licencia_vigencia (negocio_id, estado, vence_en)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('superadmin','admin_negocio','recepcionista','profesional') NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_tenant (negocio_id,id),
  CONSTRAINT fk_usuario_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT ck_usuario_ambito CHECK (
    (rol = 'superadmin' AND negocio_id IS NULL) OR
    (rol <> 'superadmin' AND negocio_id IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE sucursales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NULL,
  notas_llegada TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_sucursal_tenant (negocio_id,id),
  CONSTRAINT fk_sucursal_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;

CREATE TABLE servicios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(255) NULL,
  costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_minutos SMALLINT UNSIGNED NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_servicio_tenant (negocio_id,id),
  CONSTRAINT fk_servicio_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT ck_servicio_costo CHECK (costo >= 0),
  CONSTRAINT ck_servicio_duracion CHECK (duracion_minutos BETWEEN 1 AND 1440)
) ENGINE=InnoDB;

CREATE TABLE personal (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  especialidad VARCHAR(150) NULL,
  email VARCHAR(150) NULL,
  telefono VARCHAR(20) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_personal_tenant (negocio_id,id),
  UNIQUE KEY uq_personal_usuario (negocio_id,usuario_id),
  CONSTRAINT fk_personal_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT fk_personal_usuario FOREIGN KEY (negocio_id,usuario_id) REFERENCES usuarios(negocio_id,id)
) ENGINE=InnoDB;

CREATE TABLE personal_servicios (
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  servicio_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (negocio_id,personal_id,servicio_id),
  CONSTRAINT fk_ps_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id),
  CONSTRAINT fk_ps_servicio FOREIGN KEY (negocio_id,servicio_id) REFERENCES servicios(negocio_id,id)
) ENGINE=InnoDB;

CREATE TABLE personal_sucursales (
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (negocio_id,personal_id,sucursal_id),
  CONSTRAINT fk_psu_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id),
  CONSTRAINT fk_psu_sucursal FOREIGN KEY (negocio_id,sucursal_id) REFERENCES sucursales(negocio_id,id)
) ENGINE=InnoDB;

-- Cada día puede tener varios bloques; el descanso es el hueco entre ellos.
CREATE TABLE horarios_personal (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  dia_semana TINYINT UNSIGNED NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  CONSTRAINT fk_horario_asignacion FOREIGN KEY (negocio_id,personal_id,sucursal_id)
    REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id),
  CONSTRAINT ck_horario_dia CHECK (dia_semana BETWEEN 0 AND 6),
  CONSTRAINT ck_horario_horas CHECK (hora_fin > hora_inicio),
  INDEX ix_horario_disponibilidad (negocio_id,personal_id,dia_semana)
) ENGINE=InnoDB;

CREATE TABLE bloqueos_horario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NULL,
  sucursal_id INT UNSIGNED NULL,
  tipo ENUM('vacaciones','feriado','emergencia') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_inicio TIME NULL,
  hora_fin TIME NULL,
  motivo VARCHAR(255) NOT NULL,
  CONSTRAINT fk_bloqueo_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT fk_bloqueo_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id),
  CONSTRAINT fk_bloqueo_sucursal FOREIGN KEY (negocio_id,sucursal_id) REFERENCES sucursales(negocio_id,id),
  CONSTRAINT ck_bloqueo_fechas CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT ck_bloqueo_horas CHECK (
    (hora_inicio IS NULL AND hora_fin IS NULL) OR
    (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
  ),
  INDEX ix_bloqueo_fecha (negocio_id,fecha_inicio,fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  email VARCHAR(150) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cliente_tenant (negocio_id,id),
  UNIQUE KEY uq_cliente_telefono (negocio_id,telefono),
  CONSTRAINT fk_cliente_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  CONSTRAINT ck_cliente_telefono CHECK (telefono REGEXP '^[0-9]{10}$')
) ENGINE=InnoDB;

CREATE TABLE citas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  servicio_id INT UNSIGNED NOT NULL,
  cliente_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  precio_acordado DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente','confirmada','completada','cancelada','no_asistio') NOT NULL DEFAULT 'pendiente',
  motivo_consulta TEXT NULL,
  folio VARCHAR(40) NOT NULL UNIQUE,
  origen ENUM('portal_publico','manual') NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cita_tenant (negocio_id,id),
  CONSTRAINT fk_cita_servicio FOREIGN KEY (negocio_id,personal_id,servicio_id)
    REFERENCES personal_servicios(negocio_id,personal_id,servicio_id),
  CONSTRAINT fk_cita_sucursal FOREIGN KEY (negocio_id,personal_id,sucursal_id)
    REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id),
  CONSTRAINT fk_cita_cliente FOREIGN KEY (negocio_id,cliente_id) REFERENCES clientes(negocio_id,id),
  CONSTRAINT ck_cita_horas CHECK (hora_fin > hora_inicio),
  CONSTRAINT ck_cita_precio CHECK (precio_acordado >= 0),
  INDEX ix_cita_disponibilidad (negocio_id,personal_id,fecha,estado,hora_inicio,hora_fin),
  INDEX ix_cita_reporte (negocio_id,fecha,estado,sucursal_id,servicio_id)
) ENGINE=InnoDB;

CREATE TABLE bloqueos_temporales (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  servicio_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en DATETIME(3) NOT NULL,
  CONSTRAINT fk_lock_servicio FOREIGN KEY (negocio_id,personal_id,servicio_id)
    REFERENCES personal_servicios(negocio_id,personal_id,servicio_id),
  CONSTRAINT fk_lock_sucursal FOREIGN KEY (negocio_id,personal_id,sucursal_id)
    REFERENCES personal_sucursales(negocio_id,personal_id,sucursal_id),
  CONSTRAINT ck_lock_horas CHECK (hora_fin > hora_inicio),
  INDEX ix_lock_vigencia (negocio_id,personal_id,fecha,expira_en)
) ENGINE=InnoDB;

-- Fila de exclusión que la futura API bloqueará SELECT ... FOR UPDATE.
-- Las claves foráneas y un UNIQUE de horas NO impiden solapamientos de intervalos.
CREATE TABLE agenda_mutex (
  negocio_id INT UNSIGNED NOT NULL,
  personal_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  PRIMARY KEY (negocio_id,personal_id,fecha),
  CONSTRAINT fk_mutex_personal FOREIGN KEY (negocio_id,personal_id) REFERENCES personal(negocio_id,id)
) ENGINE=InnoDB;

CREATE TABLE notificaciones_whatsapp (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT UNSIGNED NOT NULL,
  cita_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('confirmacion','recordatorio') NOT NULL,
  estado_envio ENUM('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente',
  programado_en DATETIME(3) NOT NULL,
  enviado_en DATETIME(3) NULL,
  intentos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  proveedor_id VARCHAR(150) NULL,
  ultimo_error VARCHAR(255) NULL,
  UNIQUE KEY uq_notificacion_tipo (negocio_id,cita_id,tipo),
  CONSTRAINT fk_notificacion_cita FOREIGN KEY (negocio_id,cita_id) REFERENCES citas(negocio_id,id),
  INDEX ix_notificacion_cola (estado_envio,programado_en)
) ENGINE=InnoDB;
