#!/usr/bin/env node
import http from 'node:http';
import { Pool } from 'pg';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const FAKE_PORT = Number(process.env.FAKE_EVOLUTION_PORT ?? 8099);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sent = [];
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
      if (req.url.includes('/message/send')) sent.push(body.slice(0, 200));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  return new Promise((resolve) => server.listen(FAKE_PORT, '127.0.0.1', () => resolve(server)));
}

async function seedTenant(slug, senderPhone) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $2, true) returning id`,
    [slug, slug]
  );
  await pool.query(
    `insert into tenant_settings (tenant_id, evolution_api_url, evolution_api_key, evolution_instance_name)
     values ($1, $2, 'fake', $3)`,
    [tenant.id, `http://127.0.0.1:${FAKE_PORT}`, `tongo-${slug}`]
  );
  const { rows: [sender] } = await pool.query(
    `insert into allowed_senders (tenant_id, phone, name, verification_status)
     values ($1, $2, 'Antonio', 'pending') returning id`,
    [tenant.id, senderPhone]
  );
  return { tenantId: tenant.id, senderId: sender.id, slug };
}

function upsertPayload(slug, jid, text) {
  return {
    event: 'messages.upsert',
    instance: { instanceName: `tongo-${slug}` },
    data: {
      key: { remoteJid: jid, fromMe: false, id: `MSG${Date.now()}` },
      pushName: 'Antonio',
      message: { conversation: text },
    },
  };
}

async function postWebhook(slug, payload) {
  const res = await fetch(`${BASE_URL}/api/webhook/whatsapp?instanceName=tongo-${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.status;
}

async function statusOf(senderId) {
  const { rows: [row] } = await pool.query('select verification_status, lid from allowed_senders where id = $1', [senderId]);
  return row;
}

function numero(ddd, i) {
  const sufixo = String(Date.now()).slice(-7) + i;
  return { comNove: `55${ddd}9${sufixo}`, semNove: `55${ddd}${sufixo}` };
}

async function main() {
  const server = await startFakeEvolution();
  const stamp = Date.now();

  const antonio = numero('74', 1);
  const semNove = await seedTenant(`verif-a-${stamp}`, antonio.comNove);
  await postWebhook(semNove.slug, upsertPayload(semNove.slug, `${antonio.semNove}@s.whatsapp.net`, 'VERIFICAR'));
  const a = await statusOf(semNove.senderId);
  check('verifica por telefone sem o nono digito', a.verification_status === 'verified', JSON.stringify(a));
  check('nao grava lid quando veio de telefone', a.lid === null, `lid=${a.lid}`);
  check('responde confirmando a verificacao', sent.some(s => s.includes('Verificado')), `${sent.length} envios`);

  const donoB = numero('11', 2);
  const donoC = numero('11', 3);
  const outroTenant = await seedTenant(`verif-b-${stamp}`, donoB.comNove);
  const vizinho = await seedTenant(`verif-c-${stamp}`, donoC.comNove);
  await postWebhook(outroTenant.slug, upsertPayload(outroTenant.slug, `${donoB.comNove}@s.whatsapp.net`, 'verificar'));
  const b = await statusOf(outroTenant.senderId);
  const c = await statusOf(vizinho.senderId);
  check('verifica o sender do tenant certo', b.verification_status === 'verified', JSON.stringify(b));
  check('nao verifica sender de outro tenant', c.verification_status === 'pending', JSON.stringify(c));

  const donoD = numero('54', 4);
  const lidTenant = await seedTenant(`verif-d-${stamp}`, donoD.comNove);
  await postWebhook(lidTenant.slug, upsertPayload(lidTenant.slug, '177554099015807@lid', 'VERIFICAR'));
  const d = await statusOf(lidTenant.senderId);
  check('continua verificando por LID', d.verification_status === 'verified' && d.lid === '177554099015807', JSON.stringify(d));

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
