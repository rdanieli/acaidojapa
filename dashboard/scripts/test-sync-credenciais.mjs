#!/usr/bin/env node
import http from 'node:http';
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const PDV_PORT = Number(process.env.FAKE_PDV_PORT ?? 8102);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const chamadas = [];
const results = [];

function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function startFakePdv() {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      chamadas.push(`${req.url} :: ${body.slice(0, 120)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.includes('/token')) {
        return res.end(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
      }
      const filial = req.url.split('/').pop();
      res.end(JSON.stringify([
        {
          id: `cupom-${filial}-1`,
          numero: 1,
          dataHora: '2026-09-24T12:00:00',
          valorTotal: 50,
          situacao: 'FINALIZADO',
          itens: [{ descricao: `Produto da filial ${filial}`, quantidade: 1, valorUnitario: 50, valorTotal: 50 }],
          pagamentos: [{ descricao: 'Dinheiro', valor: 50 }],
        },
      ]));
    });
  });
  return new Promise((r) => server.listen(PDV_PORT, '127.0.0.1', () => r(server)));
}

async function seedTenant(slug, comCredenciais) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $1, true) returning id`, [slug]
  );
  if (comCredenciais) {
    await pool.query(
      `insert into tenant_settings (tenant_id, pdv_api_url, pdv_username, pdv_password, pdv_client_id, pdv_client_secret, pdv_cod_filial)
       values ($1, $2, 'u', 'p', 'c', 's', $3)`,
      [tenant.id, `http://127.0.0.1:${PDV_PORT}`, `FILIAL${tenant.id}`]
    );
  } else {
    await pool.query(`insert into tenant_settings (tenant_id) values ($1)`, [tenant.id]);
  }
  const { rows: [user] } = await pool.query(
    `insert into users (tenant_id, email, password_hash, name, role) values ($1, $2, 'x', 'Dono', 'owner') returning id`,
    [tenant.id, `${slug}@local.test`]
  );
  const token = await new SignJWT({ userId: user.id, tenantId: tenant.id, role: 'owner', email: `${slug}@local.test` })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return { tenantId: tenant.id, token };
}

async function sincronizar(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/orders/sync`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ start: '2026-09-24', end: '2026-09-24' }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function pedidos(tenantId) {
  const { rows: [row] } = await pool.query('select count(*)::int as n from orders where tenant_id = $1', [tenantId]);
  return row.n;
}

async function main() {
  const server = await startFakePdv();
  const stamp = String(Date.now()).slice(-8);

  const comCreds = await seedTenant(`pdv-proprio-${stamp}`, true);
  const semCreds = await seedTenant(`pdv-sem-${stamp}`, false);

  const r1 = await sincronizar(comCreds.token);
  check('cliente com credencial propria sincroniza', r1.status === 200, `status ${r1.status} ${JSON.stringify(r1.body).slice(0, 80)}`);
  check('usou a filial do proprio cliente', chamadas.some(c => c.includes(`FILIAL${comCreds.tenantId}`)),
    chamadas.filter(c => c.includes('cupom')).join(' | ').slice(0, 100));
  check('pedidos entraram no cliente certo', (await pedidos(comCreds.tenantId)) > 0, `${await pedidos(comCreds.tenantId)} pedidos`);

  const antes = chamadas.length;
  const r2 = await sincronizar(semCreds.token);
  check('cliente sem credencial e recusado', r2.status >= 400, `status ${r2.status}`);
  check('mensagem explica o que configurar', /integração de vendas|Integrações/i.test(r2.body?.error || ''), r2.body?.error || '');
  check('nao chamou a API de ninguem', chamadas.length === antes, `${chamadas.length - antes} chamadas novas`);
  check('nenhum pedido importado para ele', (await pedidos(semCreds.tenantId)) === 0, `${await pedidos(semCreds.tenantId)} pedidos`);

  server.close();
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
