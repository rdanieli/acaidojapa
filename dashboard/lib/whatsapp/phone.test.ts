import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrPhone, formatBrPhone } from './phone';

test('celular com DDD e 11 digitos ganha o prefixo 55', () => {
  assert.equal(normalizeBrPhone('47999916442'), '5547999916442');
});

test('fixo com DDD e 10 digitos ganha o prefixo 55', () => {
  assert.equal(normalizeBrPhone('4733221100'), '554733221100');
});

test('mascara com parenteses, espacos e hifen e limpa antes de prefixar', () => {
  assert.equal(normalizeBrPhone('(47) 99991-6442'), '5547999916442');
});

test('numero que ja vem com 55 nao ganha 55 de novo', () => {
  assert.equal(normalizeBrPhone('5547999916442'), '5547999916442');
  assert.equal(normalizeBrPhone('+55 47 99991-6442'), '5547999916442');
});

test('zero de discagem na frente do DDD e descartado', () => {
  assert.equal(normalizeBrPhone('047999916442'), '5547999916442');
});

test('numero fora do padrao brasileiro e rejeitado', () => {
  assert.equal(normalizeBrPhone('+44 20 7946 0958'), null);
  assert.equal(normalizeBrPhone('12345'), null);
});

test('formatBrPhone mostra o numero normalizado de forma legivel', () => {
  assert.equal(formatBrPhone('5547999916442'), '+55 47 99991-6442');
  assert.equal(formatBrPhone('554733221100'), '+55 47 3322-1100');
});
