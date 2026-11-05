import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const frontend = process.cwd();
const backend = resolve(frontend, '../backend');
const backendRequire = createRequire(resolve(backend, 'package.json'));
const { createConnection } = backendRequire('mysql2/promise');
const dotenv = backendRequire('dotenv');
const bcrypt = backendRequire('bcrypt');
const production = dotenv.parse(readFileSync(resolve(backend, '.env')));
const isolated = dotenv.parse(readFileSync(resolve(backend, '.env.test.local')));
// El runner usa solo las credenciales de test; DB_NAME cotidiano queda como
// barrera adicional para impedir que la base temporal reutilice ese nombre.
for (const key of ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USER', 'TEST_DB_PASS', 'TEST_DB_NAME', 'TEST_DB_CONFIRMED']) {
  if (!isolated[key]) throw new Error(`Falta ${key} en .env.test.local.`);
}
if (isolated.TEST_DB_NAME !== isolated.TEST_DB_CONFIRMED || isolated.TEST_DB_NAME === production.DB_NAME) {
  throw new Error('La base de pruebas no está confirmada o coincide con la cotidiana.');
}
const source = { ...production, DB_HOST: isolated.TEST_DB_HOST, DB_PORT: isolated.TEST_DB_PORT,
  DB_USER: isolated.TEST_DB_USER, DB_PASS: isolated.TEST_DB_PASS };
const name = `citas_persistencia_${randomUUID().replaceAll('-', '')}`;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

// Cada ejecución crea una base con nombre verificado. El nombre cotidiano queda
// excluido incluso si una variable de entorno de la máquina apunta a él.
if (!/^citas_persistencia_[a-f0-9]{32}$/.test(name) || !source.DB_NAME || source.DB_NAME === name) {
  throw new Error('La base efímera de navegador no es segura.');
}

async function freePort() {
  const socket = createServer();
  await new Promise((ok, fail) => socket.once('error', fail).listen(0, '127.0.0.1', ok));
  const port = socket.address().port;
  await new Promise((ok) => socket.close(ok));
  return port;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Un servidor de prueba terminó antes de iniciar.');
    try { if ((await fetch(url)).status < 500) return; } catch { /* Aún inicia. */ }
    await delay(250);
  }
  throw new Error('El servidor de prueba no inició a tiempo.');
}

async function seed(db) {
  const now = new Date();
  // Usuarios ficticios solo en la base efímera: permiten probar permisos y
  // operaciones de licencia desde la interfaz conectada, sin cuentas reales.
  const passwordHash = await bcrypt.hash('PruebaLicencia2026!', 4);
  await db.query(`INSERT INTO usuarios (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
    VALUES (NULL,'Superadmin QA','superadmin-qa@example.test',?,'superadmin',1,?,?)`, [passwordHash, now, now]);
  for (const index of [1, 2]) {
    const business = await db.query('INSERT INTO negocios (nombre,slug,email_contacto,activado_en,creado_en) VALUES (?,?,?,?,?)',
      [`Portal QA ${index}`, `portal-qa-${index}`, `qa${index}@example.test`, now, now]);
    const businessId = Number(business.insertId);
    await db.query(`INSERT INTO usuarios (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
      VALUES (?,'Administrador QA',? ,?,'admin_negocio',1,?,?)`,
    [businessId, `admin-qa-${index}@example.test`, passwordHash, now, now]);
    await db.query('INSERT INTO licencias (negocio_id,creado_en,habilitada_en,vence_en) VALUES (?,?,?,?)',
      [businessId, now, now, new Date(now.getTime() + 365 * 86400000)]);
    const person = await db.query(`INSERT INTO usuarios
      (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,?,?,?,'profesional',1,?,?)`,
    // La cuenta profesional ficticia permite verificar sus consultas privadas.
    [businessId, `Profesional QA ${index}`, `qa-prof-${index}@example.test`, passwordHash, now, now]);
    const personId = Number(person.insertId);
    await db.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [personId, businessId]);
    if (index === 1) {
      // El segundo profesional y recepción activa/inactiva prueban el 409 real
      // de reducción y reactivación en la base efímera, sin tocar datos reales.
      const extra = await db.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Profesional Cupo QA','cupo-prof-qa@example.test',?,'profesional',1,?,?)`,
      [businessId, passwordHash, now, now]);
      await db.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [extra.insertId, businessId]);
      for (const [name, active] of [['Recepción Activa QA', 1], ['Recepción Inactiva QA', 0]]) {
        await db.query(`INSERT INTO usuarios
          (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
          VALUES (?,?,?,?, 'recepcionista',?,?,?)`,
        [businessId, name, `recepcion-${active}-qa@example.test`, passwordHash, active, now, now]);
      }
    }
    if (index === 2) {
      // El segundo negocio permite probar los cuatro retiros sin alterar la
      // oferta del portal público que usa el primer negocio de la base efímera.
      const occupied = await db.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Profesional Cupo Retiro QA','retiro-cupo-qa@example.test',?,'profesional',1,?,?)`,
      [businessId, passwordHash, now, now]);
      await db.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [occupied.insertId, businessId]);
      await db.query(`INSERT INTO usuarios
        (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
        VALUES (?,'Recepción Retiro QA','retiro-recep-qa@example.test',?,'recepcionista',1,?,?)`,
      [businessId, passwordHash, now, now]);
    }
    const branch = await db.query(`INSERT INTO sucursales
      (negocio_id,nombre,direccion,telefono,zona_horaria,activo)
      VALUES (?,?,'Calle ficticia 10','6141234567','America/Chihuahua',1)`,
    [businessId, `Sucursal QA ${index}`]);
    const branchId = Number(branch.insertId);
    const service = await db.query("INSERT INTO servicios (negocio_id,nombre,costo,duracion_minutos,activo) VALUES (?,'Corte QA',100,30,1)", [businessId]);
    const serviceId = Number(service.insertId);
    await db.query('INSERT INTO personal_sucursales (negocio_id,personal_id,sucursal_id,activo) VALUES (?,?,?,1)', [businessId, personId, branchId]);
    await db.query('INSERT INTO personal_servicios (negocio_id,personal_id,servicio_id,activo) VALUES (?,?,?,1)', [businessId, personId, serviceId]);
    await db.query('INSERT INTO personal_servicios_sucursales (negocio_id,personal_id,sucursal_id,servicio_id,activo) VALUES (?,?,?,?,1)', [businessId, personId, branchId, serviceId]);
    for (let day = 0; day < 7; day++) {
      await db.query(`INSERT INTO horarios_personal (negocio_id,personal_id,sucursal_id,dia_semana,orden,inicio_minutos,fin_minutos,activo)
        VALUES (?,?,?,?,0,480,1080,1)`, [businessId, personId, branchId, day]);
    }
    if (index === 2) {
      // Una cita futura ficticia permite comprobar causas reales antes y
      // después del retiro sin modificarla ni usar la base habitual.
      const client = await db.query(`INSERT INTO clientes (negocio_id,nombre_completo,telefono)
        VALUES (?,'Cliente Retiro QA','6145550199')`, [businessId]);
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 16));
      await db.query(`INSERT INTO citas (negocio_id,sucursal_id,personal_id,servicio_id,cliente_id,
        inicio_utc,fin_utc,zona_horaria_reserva,folio,estado,origen)
        VALUES (?,?,?,?,?,?,?,'America/Chihuahua','RET-QA-2','pendiente','manual')`,
      [businessId, branchId, personId, serviceId, client.insertId,
        start, new Date(start.getTime() + 1800000)]);
    }
  }
}

export default async function globalSetup() {
  // FALA-T003 puede consumir un build ya existente sin escribir en ../backend.
  // El recorrido normal conserva la compilación previa que usaba este runner.
  if (process.env.PORTAL_TEST_BACKEND_READ_ONLY === '1') {
    if (!existsSync(resolve(backend, 'dist/main.js')) ||
      !existsSync(resolve(backend, 'dist/config/typeorm.datasource.js'))) {
      throw new Error('Falta un build previo del backend para el modo de solo lectura.');
    }
  } else {
    const built = spawnSync(process.execPath, [resolve(backend, 'node_modules/@nestjs/cli/bin/nest.js'), 'build'],
      { cwd: backend, windowsHide: true, encoding: 'utf8' });
    if (built.status !== 0) throw new Error(`No compiló el backend de pruebas: ${built.stderr.slice(-1000)}`);
  }
  const admin = await createConnection({ host: source.DB_HOST, port: Number(source.DB_PORT), user: source.DB_USER, password: source.DB_PASS });
  let db;
  let api;
  let vite;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    const apiPort = await freePort();
    const vitePort = await freePort();
    const origin = `http://localhost:${vitePort}`;
    const env = { ...process.env, ...source, NODE_ENV: 'test', PORT: String(apiPort),
      TEST_DB_HOST: source.DB_HOST, TEST_DB_PORT: source.DB_PORT,
      TEST_DB_USER: source.DB_USER, TEST_DB_PASS: source.DB_PASS,
      TEST_DB_NAME: name, TEST_DB_CONFIRMED: name,
      PORTAL_PUBLICO_ORIGEN: origin,
      PORTAL_CSRF_SECRET: randomBytes(48).toString('hex'),
      PORTAL_FORMULARIO_HMAC_SECRET: randomBytes(48).toString('hex') };
    const { crearDataSource } = backendRequire('./dist/config/typeorm.datasource.js');
    db = crearDataSource(env);
    if (db.options.database !== name) throw new Error('El backend de prueba no seleccionó la base efímera.');
    await db.initialize();
    await db.runMigrations({ transaction: 'each' });
    await seed(db);
    await db.destroy(); db = undefined;
    api = spawn(process.execPath, [resolve(backend, 'dist/main.js')], { cwd: backend, env, stdio: 'ignore', windowsHide: true });
    vite = spawn(process.execPath, [resolve(frontend, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', String(vitePort), '--strictPort'],
      { cwd: frontend, env: { ...process.env, VITE_API_URL: `http://localhost:${apiPort}` }, stdio: 'ignore', windowsHide: true });
    await waitFor(`http://localhost:${apiPort}/publico/negocios/portal-qa-1/catalogo`, api);
    await waitFor(origin, vite);
    process.env.PORTAL_TEST_ORIGIN = origin;
    process.env.PORTAL_TEST_DB_NAME = name;
    process.env.PORTAL_TEST_DB_HOST = source.DB_HOST;
    process.env.PORTAL_TEST_DB_PORT = source.DB_PORT;
    process.env.PORTAL_TEST_DB_USER = source.DB_USER;
    process.env.PORTAL_TEST_DB_PASS = source.DB_PASS;
    return async () => {
      // Cerrar servidores y pools antes de destruir la base evita usos tardíos.
      vite.kill(); api.kill();
      await delay(500);
      await admin.query(`DROP DATABASE \`${name}\``);
      await admin.end();
    };
  } catch (error) {
    vite?.kill(); api?.kill();
    if (db?.isInitialized) await db.destroy();
    if (created) await admin.query(`DROP DATABASE \`${name}\``);
    await admin.end();
    throw error;
  }
}
