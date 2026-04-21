'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, ArrowRight, Copy, Check } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const events = [
  {
    name: 'order.completed',
    description: 'Enviado quando um pedido e finalizado com sucesso.',
    payload: JSON.stringify(
      {
        event: 'order.completed',
        data: {
          externalId: 'pedido-4521',
          datetime: '2026-04-01T14:30:00-03:00',
          total: 45.9,
          items: [{ name: 'Acai 300ml', quantity: 1, unitPrice: 16.0 }],
          payments: [{ method: 'pix', amount: 45.9 }],
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'order.canceled',
    description: 'Cancela um pedido previamente registrado.',
    payload: JSON.stringify(
      {
        event: 'order.canceled',
        data: {
          externalId: 'pedido-4521',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'inventory.received',
    description: 'Registra o recebimento de mercadoria no estoque.',
    payload: JSON.stringify(
      {
        event: 'inventory.received',
        data: {
          items: [
            {
              productName: 'Polpa de Acai',
              quantity: 10,
              unit: 'kg',
              unitPrice: 22.5,
            },
          ],
          notes: 'Entrega fornecedor X',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'inventory.adjusted',
    description:
      'Ajusta a quantidade em estoque de um produto (contagem manual, por exemplo).',
    payload: JSON.stringify(
      {
        event: 'inventory.adjusted',
        data: {
          productName: 'Leite Ninho',
          quantity: 1500,
          unit: 'g',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'product.created',
    description: 'Cria um novo produto/insumo no catalogo.',
    payload: JSON.stringify(
      {
        event: 'product.created',
        data: {
          name: 'Granola Premium',
          unit: 'kg',
          category: 'complemento',
          costPerUnit: 15.0,
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'product.updated',
    description: 'Atualiza dados de um produto existente.',
    payload: JSON.stringify(
      {
        event: 'product.updated',
        data: {
          name: 'Granola Premium',
          costPerUnit: 18.0,
        },
      },
      null,
      2,
    ),
  },
];

const responseCodes = [
  { code: '202', meaning: 'Event accepted and processed' },
  { code: '400', meaning: 'Invalid payload or event type' },
  { code: '401', meaning: 'Invalid or missing API key' },
  { code: '429', meaning: 'Rate limit exceeded' },
  { code: '500', meaning: 'Internal error' },
];

const codeExamples: Record<string, string> = {
  cURL: `curl -X POST https://your-domain/api/v1/ingest \\
  -H "Authorization: Bearer tng_k_..." \\
  -H "Content-Type: application/json" \\
  -d '{
  "event": "order.completed",
  "data": {
    "externalId": "pedido-4521",
    "datetime": "2026-04-01T14:30:00-03:00",
    "total": 45.90,
    "items": [
      { "name": "Acai 300ml", "quantity": 1, "unitPrice": 16.00 }
    ],
    "payments": [
      { "method": "pix", "amount": 45.90 }
    ]
  }
}'`,
  Python: `import requests

response = requests.post(
    "https://your-domain/api/v1/ingest",
    headers={"Authorization": "Bearer tng_k_..."},
    json={
        "event": "order.completed",
        "data": {
            "externalId": "pedido-4521",
            "datetime": "2026-04-01T14:30:00-03:00",
            "total": 45.90,
            "items": [
                {"name": "Acai 300ml", "quantity": 1, "unitPrice": 16.00}
            ],
            "payments": [
                {"method": "pix", "amount": 45.90}
            ],
        },
    },
)

print(response.status_code, response.json())`,
  'Node.js': `const res = await fetch("https://your-domain/api/v1/ingest", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tng_k_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event: "order.completed",
    data: {
      externalId: "pedido-4521",
      datetime: "2026-04-01T14:30:00-03:00",
      total: 45.90,
      items: [
        { name: "Acai 300ml", quantity: 1, unitPrice: 16.00 }
      ],
      payments: [
        { method: "pix", amount: 45.90 }
      ],
    },
  }),
});

const data = await res.json();
console.log(data);`,
  PHP: `<?php

$ch = curl_init("https://your-domain/api/v1/ingest");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer tng_k_...",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "event" => "order.completed",
        "data" => [
            "externalId" => "pedido-4521",
            "datetime" => "2026-04-01T14:30:00-03:00",
            "total" => 45.90,
            "items" => [
                ["name" => "Acai 300ml", "quantity" => 1, "unitPrice" => 16.00]
            ],
            "payments" => [
                ["method" => "pix", "amount" => 45.90]
            ],
        ],
    ]),
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $status . " " . $response;`,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
        aria-label="Copiar"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="bg-[#0d1117] rounded-xl p-4 overflow-x-auto text-sm">
        <code className="text-emerald-400">{language && <span className="text-gray-500 select-none">{`// ${language}\n`}</span>}{code}</code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('cURL');
  const tabs = Object.keys(codeExamples);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="https://japagestao.com.br" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-acai">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight gradient-text">
              Tongo Gestao
            </span>
          </a>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Fazer login
            </Link>
            <Link
              href="/registro"
              className="rounded-xl gradient-acai px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg hover:shadow-acai/20"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-acai/5 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-teal/5 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Documentacao da{' '}
            <span className="gradient-text">API</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Integre qualquer sistema com o Tongo Gestao
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 pb-24 space-y-16">
        {/* Getting Started */}
        <section id="getting-started">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-8">
            Primeiros passos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { step: '1', text: 'Crie uma conta em /registro' },
              { step: '2', text: 'Acesse Integracoes no dashboard' },
              { step: '3', text: 'Gere uma API Key' },
              { step: '4', text: 'Faca requests para a Ingest API' },
            ].map((s) => (
              <div key={s.step} className="glass-card rounded-2xl p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-acai text-white font-bold text-sm">
                  {s.step}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section id="auth">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
            Autenticacao
          </h2>
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold mb-2">Bearer Token</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Todas as requisicoes devem incluir o header de autorizacao com sua API Key:
              </p>
              <CodeBlock code='Authorization: Bearer tng_k_...' />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Rate Limit</h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">100 req/min</span> por API Key.
                Requisicoes excedentes recebem status <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">429</span>.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Base URL</h3>
              <CodeBlock code='POST https://your-domain/api/v1/ingest' />
            </div>
          </div>
        </section>

        {/* Ingest API Reference */}
        <section id="events">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-8">
            Ingest API Reference
          </h2>
          <div className="space-y-6">
            {events.map((evt) => (
              <div key={evt.name} className="glass-card rounded-2xl overflow-hidden">
                <div className="border-b border-border/50 px-6 py-4 flex items-center gap-3">
                  <span className="inline-flex items-center rounded-lg bg-acai/10 px-3 py-1 text-xs font-bold text-acai font-mono">
                    POST
                  </span>
                  <h3 className="text-base font-semibold font-mono">{evt.name}</h3>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-muted-foreground">{evt.description}</p>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Exemplo de payload
                    </p>
                    <CodeBlock code={evt.payload} language="json" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Exemplo cURL
                    </p>
                    <CodeBlock
                      code={`curl -X POST https://your-domain/api/v1/ingest \\\n  -H "Authorization: Bearer tng_k_..." \\\n  -H "Content-Type: application/json" \\\n  -d '${evt.payload.replace(/\n/g, '')}'`}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Resposta (202)
                    </p>
                    <CodeBlock
                      code={JSON.stringify({ ok: true, eventId: 'evt_abc123' }, null, 2)}
                      language="json"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Response Codes */}
        <section id="response-codes">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
            Response Codes
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Code</th>
                  <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {responseCodes.map((rc) => (
                  <tr key={rc.code} className="border-b border-border/30 last:border-0">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold font-mono ${
                        rc.code === '202'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : rc.code.startsWith('4')
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-red-500/10 text-red-500'
                      }`}>
                        {rc.code}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{rc.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Code Examples */}
        <section id="examples">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
            Exemplos de codigo
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border/50 px-2 pt-2 gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[#0d1117] text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Content */}
            <div className="p-1">
              <CodeBlock code={codeExamples[activeTab]} />
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-acai">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold gradient-text">
                Tongo Gestao
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Tongo Gestao. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
