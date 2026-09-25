#!/usr/bin/env node
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = [];

function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const PRESET_HAMBURGUERIA = {
  products: [
    { name: 'Embalagem hambúrguer', unit: 'un', category: 'embalagem' },
    { name: 'Blend bovino', unit: 'g', category: 'insumo' },
    { name: 'Queijo cheddar', unit: 'g', category: 'insumo' },
  ],
  soldProductsList: [
    { name: 'Smash Simples', sizeMl: null, category: 'outros', price: 22 },
    { name: 'Smash Duplo', sizeMl: null, category: 'outros', price: 28 },
  ],
  gramages: [],
};

async function seedTenant(slug) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug) values ($1, $1) returning id`, [slug]
  );
  const { rows: [user] } = await pool.query(
    `insert into users (tenant_id, email, password_hash, name, role) values ($1, $2, 'x', 'Dono', 'owner') returning id`,
    [tenant.id, `${slug}@local.test`]
  );
  const token = await new SignJWT({ userId: user.id, tenantId: tenant.id, role: 'owner', email: `${slug}@local.test` })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return { tenantId: tenant.id, token };
}

async function finishOnboarding(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/onboarding`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(PRESET_HAMBURGUERIA),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function addSender(token, phone) {
  const res = await fetch(`${BASE_URL}/api/dashboard/senders`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: 'Dono' }),
  });
  return res.status;
}

async function countProducts(tenantId) {
  const { rows: [row] } = await pool.query('select count(*)::int as n from products where tenant_id = $1', [tenantId]);
  return row.n;
}

async function main() {
  const stamp = Date.now();
  const primeiro = await seedTenant(`burger-a-${stamp}`);
  const segundo = await seedTenant(`burger-b-${stamp}`);

  const a = await finishOnboarding(primeiro.token);
  check('primeiro cliente conclui o onboarding', a.status === 200, `status ${a.status} ${JSON.stringify(a.body).slice(0, 80)}`);

  const b = await finishOnboarding(segundo.token);
  check('segundo cliente conclui com o mesmo preset', b.status === 200, `status ${b.status} ${JSON.stringify(b.body).slice(0, 80)}`);

  check('cada cliente tem seus proprios produtos',
    (await countProducts(primeiro.tenantId)) === 3 && (await countProducts(segundo.tenantId)) === 3,
    `${await countProducts(primeiro.tenantId)} e ${await countProducts(segundo.tenantId)}`);

  const { rows: [t1] } = await pool.query('select onboarding_completed from tenants where id = $1', [primeiro.tenantId]);
  const { rows: [t2] } = await pool.query('select onboarding_completed from tenants where id = $1', [segundo.tenantId]);
  check('os dois ficam com onboarding concluido', t1.onboarding_completed && t2.onboarding_completed, `${t1.onboarding_completed} e ${t2.onboarding_completed}`);

  const telefone = `55479${String(stamp).slice(-8)}`;
  const s1 = await addSender(primeiro.token, telefone);
  const s2 = await addSender(segundo.token, telefone);
  check('mesmo telefone autorizado em dois clientes', s1 === 200 && s2 === 200, `status ${s1} e ${s2}`);

  await pool.end();
  const failed = results.filter(ok => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
