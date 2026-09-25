import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberSentMessage, wasSentByUs, SENT_MESSAGES_CAPACITY } from './sent-messages';

test('id registrado como enviado por nos e reconhecido', () => {
  rememberSentMessage('3EB0AAA111');
  assert.equal(wasSentByUs('3EB0AAA111'), true);
});

test('id desconhecido nao e reconhecido', () => {
  assert.equal(wasSentByUs('NUNCA-VISTO'), false);
});

test('id vazio ou ausente nunca conta como enviado por nos', () => {
  rememberSentMessage('');
  rememberSentMessage(undefined);
  assert.equal(wasSentByUs(''), false);
  assert.equal(wasSentByUs(undefined), false);
});

test('registro descarta os ids mais antigos quando passa da capacidade', () => {
  rememberSentMessage('PRIMEIRO');
  for (let i = 0; i < SENT_MESSAGES_CAPACITY; i += 1) rememberSentMessage(`ID-${i}`);
  assert.equal(wasSentByUs('PRIMEIRO'), false);
  assert.equal(wasSentByUs(`ID-${SENT_MESSAGES_CAPACITY - 1}`), true);
});
