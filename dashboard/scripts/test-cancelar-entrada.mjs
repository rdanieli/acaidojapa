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

async function seed(slug) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $1, true) returning id`, [slug]
  );
  const { rows: [user] } = await pool.query(
    `insert into users (tenant_id, email, password_hash, name, role) values ($1, $2, 'x', 'Dono', 'owner') returning id`,
    [tenant.id, `${slug}@local.test`]
  );
  const token = await new SignJWT({ userId: user.id, tenantId: tenant.id, role: 'owner', email: `${slug}@local.test` })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const { rows: [antigo] } = await pool.query(
    `insert into products (tenant_id, name, default_unit, current_stock) values ($1, 'Bacon Fatiado', 'g', 1000) returning id`,
    [tenant.id]
  );
  const { rows: [entry] } = await pool.query(
    `insert into inventory_entries (tenant_id, source, sender_phone, status) values ($1, 'text', '5547999990000', 'pending') returning id`,
    [tenant.id]
  );
  const { rows: [novo] } = await pool.query(
    `insert into products (tenant_id, name, default_unit, current_stock, created_from_entry_id)
     values ($1, 'Plutonita', 'un', 0, $2) returning id`,
    [tenant.id, entry.id]
  );
  await pool.query(
    `insert into inventory_items (tenant_id, entry_id, product_id, product_name, quantity, unit) values
     ($1, $2, $3, 'Bacon Fatiado', 500, 'g'), ($1, $2, $4, 'Plutonita', 7, 'un')`,
    [tenant.id, entry.id, antigo.id, novo.id]
  );
  return { tenantId: tenant.id, token, entryId: entry.id, antigo: antigo.id, novo: novo.id };
}

async function acao(token, id, action) {
  const res = await fetch(`${BASE_URL}/api/dashboard/inventory`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function estoque(id) {
  const { rows: [row] } = await pool.query('select current_stock::numeric as s from products where id = $1', [id]);
  return row ? Number(row.s) : null;
}

async function main() {
  const stamp = String(Date.now()).slice(-8);
  const t = await seed(`cancela-${stamp}`);

  const confirmada = await acao(t.token, t.entryId, 'confirm');
  check('entrada confirma e aplica estoque', confirmada.status === 200 && (await estoque(t.antigo)) === 1500 && (await estoque(t.novo)) === 7,
    `bacon=${await estoque(t.antigo)} plutonita=${await estoque(t.novo)}`);

  const { rows: movimentosAntes } = await pool.query(
    `select count(*)::int as n from stock_movements where reference_type='inventory_entry' and reference_id=$1`, [t.entryId]);
  check('movimentacoes foram criadas', movimentosAntes[0].n === 2, `${movimentosAntes[0].n}`);

  const cancelada = await acao(t.token, t.entryId, 'cancel');
  check('cancelamento responde 200', cancelada.status === 200, JSON.stringify(cancelada.body));

  check('estoque anterior volta ao que era', (await estoque(t.antigo)) === 1000, `bacon=${await estoque(t.antigo)}`);

  const { rows: movimentosDepois } = await pool.query(
    `select count(*)::int as n from stock_movements where reference_type='inventory_entry' and reference_id=$1`, [t.entryId]);
  check('movimentacoes da entrada somem', movimentosDepois[0].n === 0, `${movimentosDepois[0].n}`);

  check('produto que so existia por causa da entrada sai do catalogo', (await estoque(t.novo)) === null, `plutonita=${await estoque(t.novo)}`);
  check('produto que ja existia antes continua', (await estoque(t.antigo)) !== null);

  const { rows: [entrada] } = await pool.query('select status from inventory_entries where id = $1', [t.entryId]);
  check('entrada fica marcada como cancelada', entrada.status === 'canceled', entrada.status);

  const denovo = await acao(t.token, t.entryId, 'cancel');
  check('cancelar de novo e recusado com motivo', denovo.status === 409 && /confirmada/i.test(denovo.body?.error || ''), `status ${denovo.status} ${denovo.body?.error || ''}`);

  const outro = await seed(`cancela-vizinho-${stamp}`);
  const cruzado = await acao(outro.token, t.entryId, 'cancel');
  check('nao cancela entrada de outro cliente', cruzado.status === 404, `status ${cruzado.status}`);

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
