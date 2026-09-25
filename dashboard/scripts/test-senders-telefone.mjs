#!/usr/bin/env node
import http from 'node:http';
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const FAKE_PORT = Number(process.env.FAKE_EVOLUTION_PORT ?? 8099);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const enviados = [];
const results = [];

function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function startFakeEvolution() {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (!req.url.includes('/message/send')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      }
      const numero = JSON.parse(body || '{}').number || '';
      enviados.push(numero);
      if (!numero.startsWith('55')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 400, error: 'Bad Request', response: { message: [{ jid: `${numero}@s.whatsapp.net`, exists: false, number: numero }] } }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key: { id: 'x' } }));
    });
  });
  return new Promise((resolve) => server.listen(FAKE_PORT, '127.0.0.1', () => resolve(server)));
}

async function seedTenant(slug) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $1, true) returning id`, [slug]
  );
  await pool.query(
    `insert into tenant_settings (tenant_id, evolution_api_url, evolution_api_key, evolution_instance_name)
     values ($1, $2, 'fake', $3)`,
    [tenant.id, `http://127.0.0.1:${FAKE_PORT}`, `tongo-${slug}`]
  );
  const { rows: [user] } = await pool.query(
    `insert into users (tenant_id, email, password_hash, name, role) values ($1, $2, 'x', 'Dono', 'owner') returning id`,
    [tenant.id, `${slug}@local.test`]
  );
  const token = await new SignJWT({ userId: user.id, tenantId: tenant.id, role: 'owner', email: `${slug}@local.test` })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return { tenantId: tenant.id, token };
}

async function addSender(token, phone, name) {
  const res = await fetch(`${BASE_URL}/api/dashboard/senders`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const server = await startFakeEvolution();
  const stamp = String(Date.now()).slice(-8);
  const { tenantId, token } = await seedTenant(`senders-${stamp}`);

  const semPais = await addSender(token, `47 99782 ${stamp.slice(-4)}`, 'Cassio');
  check('numero sem codigo do pais e salvo com 55', semPais.body?.sender?.phone === `554799782${stamp.slice(-4)}`, semPais.body?.sender?.phone);
  check('mensagem sai para o numero completo', enviados.at(-1)?.startsWith('55'), enviados.at(-1));
  check('nao devolve aviso quando o envio deu certo', !semPais.body?.warning, semPais.body?.warning || 'sem aviso');

  const comPais = await addSender(token, '+55 (47) 99916-6442', 'Felippe');
  check('numero com codigo e formatacao e limpo', comPais.body?.sender?.phone === '5547999166442', comPais.body?.sender?.phone);

  const curto = await addSender(token, '123', 'Invalido');
  check('numero curto demais e recusado com mensagem', curto.status === 400 && /Numero invalido/.test(curto.body?.error || ''), `status ${curto.status} ${curto.body?.error || ''}`);

  const { rows } = await pool.query('select phone from allowed_senders where tenant_id = $1 order by id', [tenantId]);
  check('nada invalido foi gravado', rows.every(r => r.phone.startsWith('55')), JSON.stringify(rows.map(r => r.phone)));

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
