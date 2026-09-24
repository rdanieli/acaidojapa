#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'lib', 'whatsapp', 'groq-models.ts'), 'utf8');

function declaredModel(name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*'([^']+)'`));
  if (!match) throw new Error(`${name} nao encontrado em groq-models.ts`);
  return match[1];
}

const CHAT_MODEL = declaredModel('GROQ_CHAT_MODEL');
const TRANSCRIBE_MODEL = declaredModel('GROQ_TRANSCRIBE_MODEL');
const KEY = process.env.GROQ_API_KEY;
const API = 'https://api.groq.com/openai/v1';

const results = [];

function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function groq(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  if (!KEY) throw new Error('GROQ_API_KEY nao definido');

  console.log(`chat: ${CHAT_MODEL}\ntranscribe: ${TRANSCRIBE_MODEL}\n`);

  const models = await groq('/models');
  const ids = (models.data || []).map(m => m.id);
  check('modelo de chat disponivel na conta', ids.includes(CHAT_MODEL), CHAT_MODEL);
  check('modelo de transcricao disponivel na conta', ids.includes(TRANSCRIBE_MODEL), TRANSCRIBE_MODEL);

  const texto = await groq('/chat/completions', {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Responda APENAS com um JSON array de itens: nome, quantidade, unidade.' },
      { role: 'user', content: 'chegou 5 caixas de polpa de acai e 2 kg de granola' },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });
  const textoOut = texto.choices?.[0]?.message?.content ?? `ERRO: ${texto.error?.message}`;
  check('extracao a partir de texto', /acai/i.test(textoOut) && /granola/i.test(textoOut), textoOut.replace(/\s+/g, ' ').slice(0, 120));

  const b64 = readFileSync(join(here, 'fixtures', 'nota-teste.png')).toString('base64');
  const imagem = await groq('/chat/completions', {
    model: CHAT_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        { type: 'text', text: 'Liste os itens desta nota em JSON: nome, quantidade, unidade, preco.' },
      ],
    }],
    temperature: 0.1,
    max_tokens: 512,
  });
  const imagemOut = imagem.choices?.[0]?.message?.content ?? `ERRO: ${imagem.error?.message}`;
  check('modelo aceita imagem', !/ERRO:/.test(imagemOut), imagemOut.replace(/\s+/g, ' ').slice(0, 80));
  check('leu os itens da nota', /batata/i.test(imagemOut) && /brioche/i.test(imagemOut) && /89[.,]9/.test(imagemOut), imagemOut.replace(/\s+/g, ' ').slice(0, 160));

  const failed = results.filter(ok => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
