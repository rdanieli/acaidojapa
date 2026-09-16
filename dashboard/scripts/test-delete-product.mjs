#!/usr/bin/env node
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const results = [];

function check(name, condition, detail) {
  results.push({ name, ok: !!condition, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function seed() {
  const stamp = Date.now();
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug) values ($1, $2) returning id`,
    [`Test Delete ${stamp}`, `test-delete-${stamp}`]
  );
  const { rows: [entry] } = await pool.query(
    `insert into inventory_entries (tenant_id, source, sender_phone, status)
     values ($1, 'text', '5500000000000', 'confirmed') returning id`,
    [tenant.id]
  );
  const { rows: [linked] } = await pool.query(
    `insert into products (tenant_id, name, default_unit, category) values ($1, $2, 'g', 'complemento') returning id`,
    [tenant.id, `Com vinculo ${stamp}`]
  );
  const { rows: [orphan] } = await pool.query(
    `insert into products (tenant_id, name, default_unit) values ($1, $2, 'un') returning id`,
    [tenant.id, `Sem vinculo ${stamp}`]
  );
  await pool.query(
    `insert into stock_movements (tenant_id, product_id, type, quantity, unit)
     values ($1, $2, 'entrada', 500, 'g'), ($1, $2, 'saida_venda', 200, 'g')`,
    [tenant.id, linked.id]
  );
  await pool.query(
    `insert into complement_gramages (tenant_id, product_id, size_tier, quantity_g)
     values ($1, $2, 'small', 20)`,
    [tenant.id, linked.id]
  );
  await pool.query(
    `insert into inventory_items (tenant_id, entry_id, product_id, product_name, quantity, unit)
     values ($1, $2, $3, 'Com vinculo', 1, 'kg')`,
    [tenant.id, entry.id, linked.id]
  );
  return { tenantId: tenant.id, linkedId: linked.id, orphanId: orphan.id };
}

async function tokenFor(tenantId) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return new SignJWT({ userId: 1, tenantId, role: 'owner', email: 'test@test.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
}

async function del(id, token, force) {
  const url = `${BASE_URL}/api/dashboard/products-catalog?id=${id}${force ? '&force=1' : ''}`;
  const res = await fetch(url, { method: 'DELETE', headers: { cookie: `auth-token=${token}` } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: res.status, body };
}

async function countRows(table, productId) {
  const { rows } = await pool.query(`select count(*)::int as n from ${table} where product_id = $1`, [productId]);
  return rows[0].n;
}

async function main() {
  const { tenantId, linkedId, orphanId } = await seed();
  const token = await tokenFor(tenantId);

  const orphanRes = await del(orphanId, token);
  check('produto sem vinculo e excluido direto', orphanRes.status === 200, `status ${orphanRes.status} ${JSON.stringify(orphanRes.body)}`);
  check('produto sem vinculo sumiu do banco', (await pool.query('select 1 from products where id=$1', [orphanId])).rowCount === 0);

  const blockedRes = await del(linkedId, token);
  const deps = blockedRes.body?.dependencies;
  check('produto com vinculo responde 409', blockedRes.status === 409, `status ${blockedRes.status} ${JSON.stringify(blockedRes.body)}`);
  check('409 lista os vinculos', deps?.stockMovements === 2 && deps?.complementGramages === 1 && deps?.inventoryItems === 1, JSON.stringify(deps));
  const { rowCount: stillThere } = await pool.query('select 1 from products where id=$1', [linkedId]);
  check('produto com vinculo nao foi apagado sem confirmar', stillThere === 1);

  const forcedRes = await del(linkedId, token, true);
  check('force=1 exclui o produto', forcedRes.status === 200, `status ${forcedRes.status} ${JSON.stringify(forcedRes.body)}`);
  const { rowCount: gone } = await pool.query('select 1 from products where id=$1', [linkedId]);
  check('produto sumiu apos force', gone === 0);
  check('movimentacoes apagadas junto', (await countRows('stock_movements', linkedId)) === 0);
  check('gramagens apagadas junto', (await countRows('complement_gramages', linkedId)) === 0);
  const { rows: items } = await pool.query('select product_id, product_name from inventory_items where entry_id in (select id from inventory_entries where tenant_id=$1)', [tenantId]);
  check('item de nota preservado e desvinculado', items.length === 1 && items[0].product_id === null, JSON.stringify(items));

  await pool.end();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
