import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const carpetaFrontend = process.cwd();
// La integración local usa el repositorio hermano real y una base efímera confirmada.
const carpetaBackend = resolve(carpetaFrontend, '../SaaS-backend');
const requerirBackend = createRequire(resolve(carpetaBackend, 'package.json'));
const { createConnection } = requerirBackend('mysql2/promise');
const dotenv = requerirBackend('dotenv');
const bcrypt = requerirBackend('bcrypt');
const entornoHabitual = dotenv.parse(readFileSync(resolve(carpetaBackend, '.env')));
const entornoPruebas = dotenv.parse(readFileSync(resolve(carpetaBackend, '.env.test.local')));
// El runner usa solo las credenciales de test; DB_NAME cotidiano queda como
// barrera adicional para impedir que la base temporal reutilice ese nombre.
for (const clave of ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USER', 'TEST_DB_PASS', 'TEST_DB_NAME', 'TEST_DB_CONFIRMED']) {
  if (!entornoPruebas[clave]) throw new Error(`Falta ${clave} en .env.test.local.`);
}
if (entornoPruebas.TEST_DB_NAME !== entornoPruebas.TEST_DB_CONFIRMED || entornoPruebas.TEST_DB_NAME === entornoHabitual.DB_NAME) {
  throw new Error('La base de pruebas no está confirmada o coincide con la cotidiana.');
}
const entornoAislado = { ...entornoHabitual, DB_HOST: entornoPruebas.TEST_DB_HOST, DB_PORT: entornoPruebas.TEST_DB_PORT,
  DB_USER: entornoPruebas.TEST_DB_USER, DB_PASS: entornoPruebas.TEST_DB_PASS };
const nombre = `citas_persistencia_${randomUUID().replaceAll('-', '')}`;
const esperar = (ms) => new Promise((completar) => setTimeout(completar, ms));

// Cada ejecución crea una base con nombre verificado. El nombre cotidiano queda
// excluido incluso si una variable de entorno de la máquina apunta a él.
if (!/^citas_persistencia_[a-f0-9]{32}$/.test(nombre) || !entornoAislado.DB_NAME || entornoAislado.DB_NAME === nombre) {
  throw new Error('La base efímera de navegador no es segura.');
}

async function buscarPuertoLibre() {
  const servidorTemporal = createServer();
  await new Promise((resolverEspera, rechazarPromesa) => servidorTemporal.once('error', rechazarPromesa).listen(0, '127.0.0.1', resolverEspera));
  const puerto = servidorTemporal.address().port;
  await new Promise((resolverEspera) => servidorTemporal.close(resolverEspera));
  return puerto;
}

async function esperarServidor(url, proceso) {
  for (let intento = 0; intento < 100; intento++) {
    if (proceso.exitCode !== null) throw new Error('Un servidor de prueba terminó antes de iniciar.');
    try { if ((await fetch(url)).status < 500) return; } catch { /* Aún inicia. */ }
    await esperar(250);
  }
  throw new Error('El servidor de prueba no inició a tiempo.');
}

async function sembrarDatos(baseDatos) {
  const ahora = new Date();
  // Usuarios ficticios solo en la base efímera: permiten probar permisos y
  // operaciones de licencia desde la interfaz conectada, sin cuentas reales.
  const hashContrasena = await bcrypt.hash('PruebaLicencia2026!', 4);
  await baseDatos.query(`INSERT INTO usuarios (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
    VALUES (NULL,'Superadmin QA','superadmin-qa@example.test',?,'superadmin',1,?,?)`, [hashContrasena, ahora, ahora]);
  for (const indice of [1, 2]) {
    const negocio = await baseDatos.query('INSERT INTO negocios (nombre,slug,email_contacto,activado_en,creado_en) VALUES (?,?,?,?,?)',
      [`Portal QA ${indice}`, `portal-qa-${indice}`, `qa${indice}@example.test`, ahora, ahora]);
    const negocioId = Number(negocio.insertId);
    await baseDatos.query(`INSERT INTO usuarios (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
      VALUES (?,'Administrador QA',? ,?,'admin_negocio',1,?,?)`,
    [negocioId, `admin-qa-${indice}@example.test`, hashContrasena, ahora, ahora]);
    await baseDatos.query('INSERT INTO licencias (negocio_id,creado_en,habilitada_en,vence_en) VALUES (?,?,?,?)',
      [negocioId, ahora, ahora, new Date(ahora.getTime() + 365 * 86400000)]);
    const persona = await baseDatos.query(`INSERT INTO usuarios
      (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,?,?,?,'profesional',1,?,?)`,
    // La cuenta profesional ficticia permite verificar sus consultas privadas.
    [negocioId, `Profesional QA ${indice}`, `qa-prof-${indice}@example.test`, hashContrasena, ahora, ahora]);
    const personalId = Number(persona.insertId);
    await baseDatos.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [personalId, negocioId]);
    if (indice === 1) {
      // El segundo profesional y recepción activa/inactiva prueban el 409 real
      // de reducción y reactivación en la base efímera, sin tocar datos reales.
      const adicional = await baseDatos.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Profesional Cupo QA','cupo-prof-qa@example.test',?,'profesional',1,?,?)`,
      [negocioId, hashContrasena, ahora, ahora]);
      await baseDatos.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [adicional.insertId, negocioId]);
      for (const [nombre, activo] of [['Recepción Activa QA', 1], ['Recepción Inactiva QA', 0]]) {
        await baseDatos.query(`INSERT INTO usuarios
          (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
          VALUES (?,?,?,?, 'recepcionista',?,?,?)`,
        [negocioId, nombre, `recepcion-${activo}-qa@example.test`, hashContrasena, activo, ahora, ahora]);
      }
    }
    if (indice === 2) {
      // El segundo negocio permite probar los cuatro retiros sin alterar la
      // oferta del portal público que usa el primer negocio de la base efímera.
      const ocupado = await baseDatos.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Profesional Cupo Retiro QA','retiro-cupo-qa@example.test',?,'profesional',1,?,?)`,
      [negocioId, hashContrasena, ahora, ahora]);
      await baseDatos.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [ocupado.insertId, negocioId]);
      await baseDatos.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Recepción Retiro QA','retiro-recep-qa@example.test',?,'recepcionista',1,?,?)`,
      [negocioId, hashContrasena, ahora, ahora]);
    }
    const sucursal = await baseDatos.query(`INSERT INTO sucursales
      (negocio_id,nombre,direccion,telefono,zona_horaria,activo)
      VALUES (?,?,'Calle ficticia 10','6141234567','America/Chihuahua',1)`,
    [negocioId, `Sucursal QA ${indice}`]);
    const sucursalId = Number(sucursal.insertId);
    const servicio = await baseDatos.query("INSERT INTO servicios (negocio_id,nombre,costo,duracion_minutos,activo) VALUES (?,'Corte QA',100,30,1)", [negocioId]);
    const servicioId = Number(servicio.insertId);
    await baseDatos.query('INSERT INTO personal_sucursales (negocio_id,personal_id,sucursal_id,activo) VALUES (?,?,?,1)', [negocioId, personalId, sucursalId]);
    await baseDatos.query('INSERT INTO personal_servicios (negocio_id,personal_id,servicio_id,activo) VALUES (?,?,?,1)', [negocioId, personalId, servicioId]);
    await baseDatos.query('INSERT INTO personal_servicios_sucursales (negocio_id,personal_id,sucursal_id,servicio_id,activo) VALUES (?,?,?,?,1)', [negocioId, personalId, sucursalId, servicioId]);
    for (let dia = 0; dia < 7; dia++) {
      await baseDatos.query(`INSERT INTO horarios_personal (negocio_id,personal_id,sucursal_id,dia_semana,orden,inicio_minutos,fin_minutos,activo)
        VALUES (?,?,?,?,0,480,1080,1)`, [negocioId, personalId, sucursalId, dia]);
    }
    if (indice === 2) {
      // Una cita futura ficticia permite comprobar causas reales antes y
      // después del retiro sin modificarla ni usar la base habitual.
      // La clave normalizada mantiene válida la fixture tras la unicidad de clientes de fase 6.
      const client = await baseDatos.query(`INSERT INTO clientes (negocio_id,nombre_completo,nombre_normalizado,telefono)
        VALUES (?,'Cliente Retiro QA','cliente retiro qa','6145550199')`, [negocioId]);
      const inicio = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 2, 16));
      await baseDatos.query(`INSERT INTO citas (negocio_id,sucursal_id,personal_id,servicio_id,cliente_id,
        inicio_utc,fin_utc,zona_horaria_reserva,folio,estado,origen)
        VALUES (?,?,?,?,?,?,?,'America/Chihuahua','RET-QA-2','pendiente','manual')`,
      [negocioId, sucursalId, personalId, servicioId, client.insertId,
        inicio, new Date(inicio.getTime() + 1800000)]);
    }
  }
}

export default async function prepararIntegracion() {
  // FALA-T003 puede consumir un build ya existente sin escribir en ../backend.
  // El recorrido normal conserva la compilación previa que usaba este runner.
  if (process.env.PORTAL_TEST_BACKEND_READ_ONLY === '1') {
    if (!existsSync(resolve(carpetaBackend, 'dist/main.js')) ||
      !existsSync(resolve(carpetaBackend, 'dist/config/typeorm.datasource.js'))) {
      throw new Error('Falta un build previo del backend para el modo de solo lectura.');
    }
  } else {
    const compilacion = spawnSync(process.execPath, [resolve(carpetaBackend, 'node_modules/@nestjs/cli/bin/nest.js'), 'build'],
      { cwd: carpetaBackend, windowsHide: true, encoding: 'utf8' });
    if (compilacion.status !== 0) throw new Error(`No compiló el backend de pruebas: ${compilacion.stderr.slice(-1000)}`);
  }
  const conexionAdmin = await createConnection({ host: entornoAislado.DB_HOST, port: Number(entornoAislado.DB_PORT), user: entornoAislado.DB_USER, password: entornoAislado.DB_PASS });
  let baseDatos;
  let api;
  let vite;
  let creada = false;
  try {
    await conexionAdmin.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    creada = true;
    const puertoApi = await buscarPuertoLibre();
    const puertoVite = await buscarPuertoLibre();
    const origen = `http://localhost:${puertoVite}`;
    const entorno = { ...process.env, ...entornoAislado, NODE_ENV: 'test', PORT: String(puertoApi),
      TEST_DB_HOST: entornoAislado.DB_HOST, TEST_DB_PORT: entornoAislado.DB_PORT,
      TEST_DB_USER: entornoAislado.DB_USER, TEST_DB_PASS: entornoAislado.DB_PASS,
      TEST_DB_NAME: nombre, TEST_DB_CONFIRMED: nombre,
      PORTAL_PUBLICO_ORIGEN: origen,
      PORTAL_CSRF_SECRET: randomBytes(48).toString('hex'),
      PORTAL_FORMULARIO_HMAC_SECRET: randomBytes(48).toString('hex') };
    const { crearDataSource } = requerirBackend('./dist/config/typeorm.datasource.js');
    baseDatos = crearDataSource(entorno);
    if (baseDatos.options.database !== nombre) throw new Error('El backend de prueba no seleccionó la base efímera.');
    await baseDatos.initialize();
    await baseDatos.runMigrations({ transaction: 'each' });
    await sembrarDatos(baseDatos);
    await baseDatos.destroy(); baseDatos = undefined;
    api = spawn(process.execPath, [resolve(carpetaBackend, 'dist/main.js')], { cwd: carpetaBackend, env: entorno, stdio: 'ignore', windowsHide: true });
    vite = spawn(process.execPath, [resolve(carpetaFrontend, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', String(puertoVite), '--strictPort'],
      { cwd: carpetaFrontend, env: { ...process.env, VITE_API_URL: `http://localhost:${puertoApi}` }, stdio: 'ignore', windowsHide: true });
    await esperarServidor(`http://localhost:${puertoApi}/publico/negocios/portal-qa-1/catalogo`, api);
    await esperarServidor(origen, vite);
    process.env.PORTAL_TEST_ORIGIN = origen;
    process.env.PORTAL_TEST_DB_NAME = nombre;
    process.env.PORTAL_TEST_DB_HOST = entornoAislado.DB_HOST;
    process.env.PORTAL_TEST_DB_PORT = entornoAislado.DB_PORT;
    process.env.PORTAL_TEST_DB_USER = entornoAislado.DB_USER;
    process.env.PORTAL_TEST_DB_PASS = entornoAislado.DB_PASS;
    return async () => {
      // Cerrar servidores y pools antes de destruir la base evita usos tardíos.
      vite.kill(); api.kill();
      await esperar(500);
      await conexionAdmin.query(`DROP DATABASE \`${nombre}\``);
      await conexionAdmin.end();
    };
  } catch (error) {
    vite?.kill(); api?.kill();
    if (baseDatos?.isInitialized) await baseDatos.destroy();
    if (creada) await conexionAdmin.query(`DROP DATABASE \`${nombre}\``);
    await conexionAdmin.end();
    throw error;
  }
}
