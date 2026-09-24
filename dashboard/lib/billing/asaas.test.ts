import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, tokenizeCard } from './asaas';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.ASAAS_API_KEY;

let fetchCalls = 0;

function stubFetch(status: number, body: string) {
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

const customerParams = { name: 'Fulano', cpfCnpj: '100.223.359-35', email: 'f@x.com', phone: '(47) 99999-9999' };

beforeEach(() => {
  fetchCalls = 0;
  process.env.ASAAS_API_KEY = 'chave-de-teste';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.ASAAS_API_KEY;
  else process.env.ASAAS_API_KEY = originalApiKey;
});

test('401 com corpo vazio vira erro legivel com o status, nao "Unexpected end of JSON input"', async () => {
  stubFetch(401, '');

  await assert.rejects(createCustomer(customerParams), (err: Error) => {
    assert.doesNotMatch(err.message, /Unexpected end of JSON input/);
    assert.match(err.message, /401/);
    return true;
  });
});

test('sem ASAAS_API_KEY falha antes de chamar a rede, com mensagem de configuracao', async () => {
  delete process.env.ASAAS_API_KEY;
  stubFetch(200, '{}');

  await assert.rejects(
    tokenizeCard('cus_1', { holderName: 'F', number: '4111', expiryMonth: '12', expiryYear: '2030', ccv: '123' }, {
      name: 'F', email: 'f@x.com', cpfCnpj: '10022335935', postalCode: '89460188', addressNumber: '0', phone: '47999999999',
    }),
    /não está configurad/,
  );
  assert.equal(fetchCalls, 0);
});

test('erro JSON do Asaas continua sendo repassado com as descricoes', async () => {
  stubFetch(400, JSON.stringify({ errors: [{ code: 'invalid_cpf', description: 'CPF inválido' }] }));

  await assert.rejects(createCustomer(customerParams), /Asaas API error \(400\): CPF inválido/);
});

test('sucesso devolve o JSON parseado', async () => {
  stubFetch(200, JSON.stringify({ id: 'cus_123' }));

  const customer = await createCustomer(customerParams);
  assert.equal(customer.id, 'cus_123');
});
