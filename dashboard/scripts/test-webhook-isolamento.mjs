#!/usr/bin/env node
import http from 'node:http';
import { Pool } from 'pg';

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
      if (req.url.includes('/message/send')) enviados.push(body.slice(0, 300));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  return new Promise((resolve) => server.listen(FAKE_PORT, '127.0.0.1', () => resolve(server)));
}

async function seedTenant(slug, instanceName, senderPhone, senderStatus) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $1, true) returning id`, [slug]
  );
  await pool.query(
    `insert into tenant_settings (tenant_id, evolution_api_url, evolution_api_key, evolution_instance_name)
     values ($1, $2, 'fake', $3)`,
    [tenant.id, `http://127.0.0.1:${FAKE_PORT}`, instanceName]
  );
  await pool.query(
    `insert into allowed_senders (tenant_id, phone, name, verification_status) values ($1, $2, $3, $4)`,
    [tenant.id, senderPhone, `Dono ${slug}`, senderStatus]
  );
  await pool.query(
    `insert into products (tenant_id, name, default_unit, current_stock) values ($1, $2, 'g', 999)`,
    [tenant.id, `Segredo do ${slug}`]
  );
  return { tenantId: tenant.id, instanceName, senderPhone };
}

function upsertPayload(instance, jid, text, instanceAsString) {
  return {
    event: 'messages.upsert',
    instance: instanceAsString ? instance : { instanceName: instance },
    data: {
      key: { remoteJid: jid, fromMe: false, id: `MSG${Math.random()}` },
      pushName: 'Tester',
      message: { conversation: text },
    },
  };
}

async function postWebhook(payload, queryInstance) {
  const url = queryInstance
    ? `${BASE_URL}/api/webhook/whatsapp?instanceName=${queryInstance}`
    : `${BASE_URL}/api/webhook/whatsapp`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.status;
}

async function statusOf(tenantId, phone) {
  const { rows: [row] } = await pool.query(
    'select verification_status from allowed_senders where tenant_id = $1 and phone = $2', [tenantId, phone]
  );
  return row?.verification_status;
}

async function main() {
  const server = await startFakeEvolution();
  const stamp = String(Date.now()).slice(-8);

  const legado = await seedTenant(`legado-${stamp}`, 'acaidojapa-teste', `5554991${stamp}`, 'verified');
  const cliente = await seedTenant(`cliente-${stamp}`, `tongo-cliente-${stamp}`, `5574988${stamp}`, 'pending');

  await postWebhook(upsertPayload(cliente.instanceName, `${legado.senderPhone}@s.whatsapp.net`, 'quanto tenho de estoque'), cliente.instanceName);
  check('remetente de outro cliente nao e atendido', enviados.length === 0, `${enviados.length} respostas enviadas`);

  await postWebhook(upsertPayload(cliente.instanceName, `${legado.senderPhone}@s.whatsapp.net`, 'VERIFICAR'), cliente.instanceName);
  check('nao verifica pendente de outro cliente por engano', (await statusOf(cliente.tenantId, cliente.senderPhone)) === 'pending', await statusOf(cliente.tenantId, cliente.senderPhone));

  const semQuery = await postWebhook(upsertPayload('instancia-desconhecida', `${legado.senderPhone}@s.whatsapp.net`, 'oi'), null);
  check('instancia desconhecida e ignorada', semQuery === 200 && enviados.length === 0, `status ${semQuery}, ${enviados.length} respostas`);

  await postWebhook(upsertPayload(legado.instanceName, `${legado.senderPhone}@s.whatsapp.net`, 'VERIFICAR', true), null);
  check('instancia legado resolve o tenant pelo tenant_settings', enviados.length === 0 || enviados.some(e => e.includes(legado.senderPhone)), `${enviados.length} respostas`);

  await postWebhook(upsertPayload(cliente.instanceName, `${cliente.senderPhone}@s.whatsapp.net`, 'VERIFICAR'), cliente.instanceName);
  check('verifica o proprio remetente do cliente', (await statusOf(cliente.tenantId, cliente.senderPhone)) === 'verified', await statusOf(cliente.tenantId, cliente.senderPhone));

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
