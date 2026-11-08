import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const backendRequire = createRequire(resolve(process.cwd(), '../backend/package.json'));
const { createConnection } = backendRequire('mysql2/promise');

export const portalUrl = (business = 1) => `${process.env.PORTAL_TEST_ORIGIN}/reservas/portal-qa-${business}`;

// El lector de evidencias solo se conecta a la base temporal que creó globalSetup.
export async function rows(sql, params = []) {
  const name = process.env.PORTAL_TEST_DB_NAME;
  if (!/^citas_persistencia_[a-f0-9]{32}$/.test(name ?? '')) throw new Error('Falta la base efímera de pruebas.');
  const db = await createConnection({ host: process.env.PORTAL_TEST_DB_HOST,
    port: Number(process.env.PORTAL_TEST_DB_PORT), user: process.env.PORTAL_TEST_DB_USER,
    password: process.env.PORTAL_TEST_DB_PASS, database: name });
  try { return (await db.query(sql, params))[0]; }
  finally { await db.end(); }
}
