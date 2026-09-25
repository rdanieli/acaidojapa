import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerSelfMessagePhone } from './self-chat';

const OWNER = '554799916442@s.whatsapp.net';

function payload(key: Record<string, unknown>, sender: string | undefined = OWNER) {
  return { event: 'messages.upsert', sender, data: { key, message: { conversation: 'VERIFICAR' } } };
}

test('mensagem do dono para o proprio numero (jid comum) devolve o telefone do dono', () => {
  const body = payload({ remoteJid: OWNER, fromMe: true, id: 'ABC' });
  assert.equal(ownerSelfMessagePhone(body), '554799916442');
});

test('mensagem do dono para si mesmo enderecada por LID usa o remoteJidAlt', () => {
  const body = payload({ remoteJid: '198294462591075@lid', remoteJidAlt: OWNER, fromMe: true, id: 'ABC' });
  assert.equal(ownerSelfMessagePhone(body), '554799916442');
});

test('mensagem do dono para outro contato nao e self-chat', () => {
  const body = payload({ remoteJid: '554291443368@s.whatsapp.net', fromMe: true, id: 'ABC' });
  assert.equal(ownerSelfMessagePhone(body), null);
});

test('mensagem recebida de terceiro (fromMe false) nao e self-chat', () => {
  const body = payload({ remoteJid: OWNER, fromMe: false, id: 'ABC' });
  assert.equal(ownerSelfMessagePhone(body), null);
});

function selfPayload(id: string, source: string | undefined) {
  return { event: 'messages.upsert', sender: OWNER, data: { key: { remoteJid: OWNER, fromMe: true, id }, source } };
}

test('eco de mensagem gerada pela API (id 3EB0 com source unknown) nao e tratado como digitado pelo dono', () => {
  assert.equal(ownerSelfMessagePhone(selfPayload('3EB0D18DA7ECD41AC5D5FD12AFF8D717A66B49C2', 'unknown')), null);
  assert.equal(ownerSelfMessagePhone(selfPayload('3EB0B37FF3E4AFC15F47', undefined)), null);
});

test('mensagem digitada no WhatsApp Web (id 3EB0 com source web) e aceita', () => {
  assert.equal(ownerSelfMessagePhone(selfPayload('3EB0C1D2E3F4A5B6C7D8E9', 'web')), '554799916442');
});

test('mensagem digitada no celular (source ios) e aceita', () => {
  assert.equal(ownerSelfMessagePhone(selfPayload('3A1D95B9F52B900303CA', 'ios')), '554799916442');
});

test('sem o campo sender no payload nao da para saber quem e o dono', () => {
  const body = { event: 'messages.upsert', data: { key: { remoteJid: OWNER, fromMe: true, id: 'ABC' } } };
  assert.equal(ownerSelfMessagePhone(body), null);
});

test('variacao do nono digito entre remoteJid e sender ainda conta como o mesmo dono', () => {
  const body = payload({ remoteJid: '554799916442@s.whatsapp.net', fromMe: true, id: 'ABC' }, '5547999916442@s.whatsapp.net');
  assert.equal(ownerSelfMessagePhone(body), '5547999916442');
});
