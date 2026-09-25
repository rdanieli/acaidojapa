import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrazilianPhone } from './phone';

test('celular com DDD e 11 digitos ganha o prefixo 55', () => {
  assert.equal(normalizeBrazilianPhone('47999916442'), '5547999916442');
});

test('fixo com DDD e 10 digitos ganha o prefixo 55', () => {
  assert.equal(normalizeBrazilianPhone('4733221100'), '554733221100');
});

test('mascara com parenteses, espacos e hifen e limpa antes de prefixar', () => {
  assert.equal(normalizeBrazilianPhone('(47) 99991-6442'), '5547999916442');
});

test('numero que ja vem com 55 nao ganha 55 de novo', () => {
  assert.equal(normalizeBrazilianPhone('5547999916442'), '5547999916442');
  assert.equal(normalizeBrazilianPhone('+55 47 99991-6442'), '5547999916442');
});

test('zero de discagem na frente do DDD e descartado', () => {
  assert.equal(normalizeBrazilianPhone('047999916442'), '5547999916442');
});

test('numero com tamanho fora do padrao brasileiro e devolvido so com digitos, sem prefixo', () => {
  assert.equal(normalizeBrazilianPhone('+44 20 7946 0958'), '442079460958');
});
