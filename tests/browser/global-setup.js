import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const frontend = process.cwd();
const backend = resolve(frontend, '../backend');
const backendRequire = createRequire(resolve(backend, 'package.json'));
const { createConnection } = backendRequire('mysql2/promise');
const dotenv = backendRequire('dotenv');
const source = dotenv.parse(readFileSync(resolve(backend, '.env')));
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
  for (const index of [1, 2]) {
    const business = await db.query('INSERT INTO negocios (nombre,slug,email_contacto,activado_en,creado_en) VALUES (?,?,?,?,?)',
      [`Portal QA ${index}`, `portal-qa-${index}`, `qa${index}@example.test`, now, now]);
    const businessId = Number(business.insertId);
    await db.query('INSERT INTO licencias (negocio_id,creado_en,habilitada_en,vence_en) VALUES (?,?,?,?)',
      [businessId, now, now, new Date(now.getTime() + 365 * 86400000)]);
    const person = await db.query(`INSERT INTO usuarios
      (negocio_id,nombre,email,password_hash,rol,activo,activado_en,creado_en)
      VALUES (?,?,?,'hash','profesional',1,?,?)`,
    [businessId, `Profesional QA ${index}`, `qa-prof-${index}@example.test`, now, now]);
    const personId = Number(person.insertId);
    await db.query('INSERT INTO personal (id,negocio_id) VALUES (?,?)', [personId, businessId]);
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
  }
}

export default async function globalSetup() {
  const built = spawnSync(process.execPath, [resolve(backend, 'node_modules/@nestjs/cli/bin/nest.js'), 'build'],
    { cwd: backend, windowsHide: true, encoding: 'utf8' });
  if (built.status !== 0) throw new Error(`No compiló el backend de pruebas: ${built.stderr.slice(-1000)}`);
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
