import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeSendFailure } from './send-failure';

test('numero inexistente no WhatsApp vira 422 com orientacao de conferir o numero', () => {
  const err = new Error('Failed to send message: 400 {"status":400,"error":"Bad Request","response":{"message":[{"jid":"47999916442@s.whatsapp.net","exists":false,"number":"47999916442"}]}}');
  const result = describeSendFailure(err);
  assert.equal(result.status, 422);
  assert.match(result.message, /não encontrado no WhatsApp/i);
  assert.match(result.message, /DDD/);
});

test('instancia desconectada vira 502 mandando reconectar na aba Conexao', () => {
  const err = new Error('Failed to send message: 500 {"status":500,"error":"Internal Server Error","response":{"message":"Connection Closed"}}');
  const result = describeSendFailure(err);
  assert.equal(result.status, 502);
  assert.match(result.message, /desconectado/i);
  assert.match(result.message, /Conexão/);
});

test('qualquer outra falha vira 502 com mensagem generica em portugues', () => {
  const result = describeSendFailure(new Error('Failed to send message: 503 upstream'));
  assert.equal(result.status, 502);
  assert.match(result.message, /não foi possível enviar/i);
});

test('valor que nem e Error tambem recebe a mensagem generica', () => {
  const result = describeSendFailure('boom');
  assert.equal(result.status, 502);
  assert.match(result.message, /não foi possível enviar/i);
});
