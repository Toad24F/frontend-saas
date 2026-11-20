import { test as base, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requerirBackend = createRequire(resolve(process.cwd(), '../backend/package.json'));
const { createConnection } = requerirBackend('mysql2/promise');

export const urlPortal = (negocio = 1) => `${process.env.PORTAL_TEST_ORIGIN}/reservas/portal-qa-${negocio}`;

// Las consultas y los datos de prueba solo se conectan a la base temporal que creó prepararIntegracion.
export async function consultarFilas(sql, parametros = []) {
  const nombre = process.env.PORTAL_TEST_DB_NAME;
  if (!/^citas_persistencia_[a-f0-9]{32}$/.test(nombre ?? '')) throw new Error('Falta la base efímera de pruebas.');
  const baseDatos = await createConnection({ host: process.env.PORTAL_TEST_DB_HOST,
    port: Number(process.env.PORTAL_TEST_DB_PORT), user: process.env.PORTAL_TEST_DB_USER,
    password: process.env.PORTAL_TEST_DB_PASS, database: nombre });
  try { return (await baseDatos.query(sql, parametros))[0]; }
  finally { await baseDatos.end(); }
}

// Cada caso empieza con contador limpio exclusivamente en la base efímera.
// Se conserva el control de acceso y su límite; no se simula el inicio de sesión ni su respuesta.
export const test = base.extend({
  aislamientoInicioSesion: [async ({}, usar) => {
    await consultarFilas('DELETE FROM limites_intentos');
    await usar();
  }, { auto: true }],
});
export { expect };
