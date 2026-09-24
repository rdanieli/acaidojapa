#!/usr/bin/env node
import http from 'node:http';
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const FAKE_PORT = Number(process.env.FAKE_EVOLUTION_PORT ?? 8099);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const calls = [];
const results = [];

function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function startFakeEvolution() {
  const server = http.createServer((req, res) => {
    calls.push(`${req.method} ${req.url.split('?')[0]}`);
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (body) calls.push(`body ${body.slice(0, 120)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.startsWith('/instance/connect')) {
        res.end(JSON.stringify({ base64: 'data:image/png;base64,AAAA', code: 'x'.repeat(50), count: 1 }));
      } else if (req.url.startsWith('/instance/fetchInstances')) {
        res.end(JSON.stringify([{ name: 'legado-acaidojapa', connectionStatus: 'open', ownerJid: '5599@s.whatsapp.net' }]));
      } else {
        res.end(JSON.stringify({ ok: true }));
      }
    });
  });
  return new Promise((resolve) => server.listen(FAKE_PORT, '127.0.0.1', () => resolve(server)));
}

async function seed() {
  const stamp = Date.now();
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $2, true) returning id`,
    [`Legado ${stamp}`, `legado-${stamp}`]
  );
  const { rows: [user] } = await pool.query(
    `insert into users (tenant_id, email, password_hash, name, role) values ($1, $2, 'x', 'Dono', 'owner') returning id`,
    [tenant.id, `legado-${stamp}@local.test`]
  );
  await pool.query(
    `insert into tenant_settings (tenant_id, evolution_instance_name) values ($1, 'legado-acaidojapa')`,
    [tenant.id]
  );
  const token = await new SignJWT({ userId: user.id, tenantId: tenant.id, role: 'owner', email: `legado-${stamp}@local.test` })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return { tenantId: tenant.id, slug: `legado-${stamp}`, token };
}

async function main() {
  const server = await startFakeEvolution();
  const { tenantId, slug, token } = await seed();

  const res = await fetch(`${BASE_URL}/api/dashboard/whatsapp`, {
    method: 'POST',
    headers: { cookie: `auth-token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'connect' }),
  });
  const data = await res.json().catch(() => ({}));

  check('connect responde 200 com QR', res.status === 200 && !!data.qr, `status ${res.status}`);

  const usouLegado = calls.some(c => c.includes('legado-acaidojapa'));
  const usouTongo = calls.some(c => c.includes(`tongo-${slug}`));
  check('usa a instancia ja cadastrada do tenant', usouLegado, calls.filter(c => c.startsWith('POST') || c.startsWith('GET')).join(' ; '));
  check('nao cria instancia paralela tongo-{slug}', !usouTongo, usouTongo ? `chamou tongo-${slug}` : 'nenhuma chamada tongo-');

  const { rows: [settings] } = await pool.query(
    'select evolution_instance_name from tenant_settings where tenant_id = $1', [tenantId]
  );
  check('nao sobrescreve o nome salvo', settings.evolution_instance_name === 'legado-acaidojapa', settings.evolution_instance_name);

  const statusRes = await fetch(`${BASE_URL}/api/dashboard/whatsapp`, { headers: { cookie: `auth-token=${token}` } });
  const status = await statusRes.json();
  check('status le a instancia certa', status.instanceName === 'legado-acaidojapa', JSON.stringify(status));

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
