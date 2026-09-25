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

function startFakes() {
  const evolution = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (req.url.includes('/message/send')) enviados.push(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key: { id: 'x' } }));
    });
  });

  const groq = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const texto = JSON.stringify(payload.messages || []);
      let conteudo;
      if (texto.includes('classifica') || texto.includes('categoria')) conteudo = 'question';
      else if (texto.includes('queries')) conteudo = '{"queries":["stock","alerts"],"days":7}';
      else conteudo = `RESPOSTA_COM_DADOS::${texto.replace(/\s+/g, ' ').slice(0, 4000)}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: conteudo } }] }));
    });
  });

  return Promise.all([
    new Promise((r) => evolution.listen(FAKE_PORT, '127.0.0.1', () => r(evolution))),
    new Promise((r) => groq.listen(FAKE_PORT + 1, '127.0.0.1', () => r(groq))),
  ]);
}

async function seedTenant(slug, instancia, telefone, produto, estoque) {
  const { rows: [tenant] } = await pool.query(
    `insert into tenants (name, slug, onboarding_completed) values ($1, $1, true) returning id`, [slug]
  );
  await pool.query(
    `insert into tenant_settings (tenant_id, evolution_api_url, evolution_api_key, evolution_instance_name)
     values ($1, $2, 'fake', $3)`,
    [tenant.id, `http://127.0.0.1:${FAKE_PORT}`, instancia]
  );
  await pool.query(
    `insert into allowed_senders (tenant_id, phone, name, verification_status) values ($1, $2, 'Dono', 'verified')`,
    [tenant.id, telefone]
  );
  const { rows: [p] } = await pool.query(
    `insert into products (tenant_id, name, default_unit, current_stock) values ($1, $2, 'g', $3) returning id`,
    [tenant.id, produto, estoque]
  );
  await pool.query(
    `insert into stock_alerts (tenant_id, product_id, alert_type, current_stock, status) values ($1, $2, 'out_of_stock', 0, 'active')`,
    [tenant.id, p.id]
  );
  return { tenantId: tenant.id, instancia, telefone, produto };
}

async function perguntar(tenant, texto) {
  enviados.length = 0;
  const res = await fetch(`${BASE_URL}/api/webhook/whatsapp?instanceName=${tenant.instancia}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'messages.upsert',
      instance: tenant.instancia,
      data: {
        key: { remoteJid: `${tenant.telefone}@s.whatsapp.net`, fromMe: false, id: `Q${Math.random()}` },
        pushName: 'Dono',
        message: { conversation: texto },
      },
    }),
  });
  await new Promise((r) => setTimeout(r, 1500));
  return { status: res.status, enviados: [...enviados] };
}

async function main() {
  const [evolution, groq] = await startFakes();
  const stamp = String(Date.now()).slice(-8);

  const acai = await seedTenant(`acai-${stamp}`, `tongo-acai-${stamp}`, `55549${stamp}`, `Polpa de Acai ${stamp}`, 39433);
  const burger = await seedTenant(`burger-${stamp}`, `tongo-burger-${stamp}`, `55479${stamp}`, `Bacon Fatiado ${stamp}`, 1001);

  const r = await perguntar(burger, 'como esta meu estoque');
  const resposta = r.enviados.join(' ');

  check('bot responde a pergunta do cliente', r.enviados.length > 0, `${r.enviados.length} mensagens`);
  check('resposta cita o produto do proprio cliente', resposta.includes(burger.produto), burger.produto);
  check('resposta NAO cita produto de outro cliente', !resposta.includes(acai.produto), acai.produto);
  check('resposta NAO vaza alerta de outro cliente', (resposta.match(/out_of_stock/g) || []).length <= 1,
    `${(resposta.match(/out_of_stock/g) || []).length} alertas citados`);

  evolution.close();
  groq.close();
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
