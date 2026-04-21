'use client';

import { useState } from 'react';
import { Plug, Key, MessageSquare, UtensilsCrossed, Copy, Check, Trash2, ExternalLink, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useIngestLog } from '@/hooks/use-dashboard';
import Link from 'next/link';

function maskKey(key: string) {
  if (!key || key.length < 8) return key;
  return `${key.slice(0, 6)}****${key.slice(-4)}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Sucesso', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  failed: { label: 'Falha', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const apiEvents = [
  { event: 'order.completed', description: 'Registra um pedido finalizado com itens e pagamentos' },
  { event: 'stock.adjustment', description: 'Ajuste manual de estoque (entrada ou saída)' },
  { event: 'stock.count', description: 'Contagem de inventário para um produto' },
  { event: 'expense.created', description: 'Registra uma despesa ou custo operacional' },
];

const curlExample = `curl -X POST https://app.japagestao.com.br/api/v1/ingest \\
  -H "Authorization: Bearer tng_k_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "order.completed",
    "data": {
      "externalId": "pedido-1",
      "datetime": "2026-04-01T14:30:00",
      "total": 45.90,
      "items": [
        { "name": "Açaí 300ml", "quantity": 1, "unitPrice": 16 }
      ],
      "payments": [
        { "method": "pix", "amount": 45.90 }
      ]
    }
  }'`;

const pythonExample = `import requests

response = requests.post(
    "https://app.japagestao.com.br/api/v1/ingest",
    headers={
        "Authorization": "Bearer tng_k_...",
        "Content-Type": "application/json",
    },
    json={
        "event": "order.completed",
        "data": {
            "externalId": "pedido-1",
            "datetime": "2026-04-01T14:30:00",
            "total": 45.90,
            "items": [
                {"name": "Açaí 300ml", "quantity": 1, "unitPrice": 16}
            ],
            "payments": [
                {"method": "pix", "amount": 45.90}
            ],
        },
    },
)
print(response.json())`;

const nodeExample = `const res = await fetch("https://app.japagestao.com.br/api/v1/ingest", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tng_k_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event: "order.completed",
    data: {
      externalId: "pedido-1",
      datetime: "2026-04-01T14:30:00",
      total: 45.90,
      items: [
        { name: "Açaí 300ml", quantity: 1, unitPrice: 16 }
      ],
      payments: [
        { method: "pix", amount: 45.90 }
      ],
    },
  }),
});
const data = await res.json();
console.log(data);`;

export default function IntegracoesPage() {
  const { data: keysData, isLoading: keysLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const { data: logData, isLoading: logLoading } = useIngestLog();

  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const keys = keysData?.keys ?? [];
  const activeKey = keys.find((k: any) => k.status === 'active');
  const events = logData?.events ?? [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateKey = async () => {
    await createKey.mutateAsync('Default API Key');
  };

  const handleRevoke = async (id: number) => {
    setRevokingId(id);
    await revokeKey.mutateAsync(id);
    setRevokingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-acai shadow-lg shadow-acai/20">
            <Plug className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conecte sistemas externos ao Japa Gestão</p>
          </div>
        </div>
      </div>

      {/* Connector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* API Key Card */}
        <div className="glass-card rounded-xl p-5 border-2 border-acai/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-acai/5 rounded-bl-[40px]" />
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-acai/10">
              <Key className="h-4 w-4 text-acai" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">API Personalizada</h3>
              <p className="text-xs text-muted-foreground">Envie dados de qualquer sistema via REST API</p>
            </div>
          </div>

          {keysLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : activeKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted/50 rounded-lg px-3 py-2 font-mono truncate">
                  {maskKey(activeKey.key)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => copyToClipboard(activeKey.key)}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {activeKey.lastUsedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Usado em {formatDate(activeKey.lastUsedAt)}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                onClick={() => handleRevoke(activeKey.id)}
                disabled={revokingId === activeKey.id}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {revokingId === activeKey.id ? 'Revogando...' : 'Revogar'}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gradient-acai text-white hover:opacity-90 transition-opacity"
              size="sm"
              onClick={handleCreateKey}
              disabled={createKey.isPending}
            >
              {createKey.isPending ? 'Gerando...' : 'Gerar API Key'}
            </Button>
          )}
        </div>

        {/* WhatsApp Card */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">WhatsApp</h3>
              <p className="text-xs text-muted-foreground">Estoque via foto, audio ou texto</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
              Conectado
            </Badge>
            <Link href="/estoque" className="text-xs text-acai hover:underline flex items-center gap-1">
              Configurar <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* iFood Card */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              <UtensilsCrossed className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">iFood</h3>
              <p className="text-xs text-muted-foreground">Importe pedidos automaticamente</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-[11px]">
            Em breve
          </Badge>
        </div>

        {/* Rappi Card */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Rappi</h3>
              <p className="text-xs text-muted-foreground">Importe pedidos automaticamente</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-[11px]">
            Em breve
          </Badge>
        </div>
      </div>

      {/* API Documentation */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setShowDocs(!showDocs)}
        >
          <div className="flex items-center gap-3">
            <Code2 className="h-5 w-5 text-acai" />
            <div>
              <h2 className="font-semibold">Documentação da API</h2>
              <p className="text-xs text-muted-foreground">Endpoint, eventos e exemplos de código</p>
            </div>
          </div>
          {showDocs ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showDocs && (
          <div className="px-5 pb-5 space-y-5 border-t border-border pt-5">
            {/* Endpoint */}
            <div>
              <h3 className="text-sm font-medium mb-2">Endpoint</h3>
              <code className="block text-xs bg-muted/50 rounded-lg px-4 py-3 font-mono">
                <span className="text-emerald-600 font-semibold">POST</span>{' '}
                https://app.japagestao.com.br/api/v1/ingest
              </code>
            </div>

            {/* Events Table */}
            <div>
              <h3 className="text-sm font-medium mb-2">Eventos disponíveis</h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Evento</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiEvents.map((e) => (
                      <TableRow key={e.event}>
                        <TableCell className="font-mono text-xs text-acai">{e.event}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Code Examples */}
            <div>
              <h3 className="text-sm font-medium mb-2">Exemplos</h3>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="mb-2">
                  <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                  <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                  <TabsTrigger value="node" className="text-xs">Node.js</TabsTrigger>
                </TabsList>
                <TabsContent value="curl">
                  <pre className="text-xs bg-muted/50 rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">
                    {curlExample}
                  </pre>
                </TabsContent>
                <TabsContent value="python">
                  <pre className="text-xs bg-muted/50 rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">
                    {pythonExample}
                  </pre>
                </TabsContent>
                <TabsContent value="node">
                  <pre className="text-xs bg-muted/50 rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">
                    {nodeExample}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Event Log */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Últimos eventos</h2>
          <p className="text-xs text-muted-foreground">Atualiza automaticamente a cada 30 segundos</p>
        </div>

        {logLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center">
            <Plug className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum evento recebido ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Eventos aparecerão aqui quando você enviar dados via API
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Hora</TableHead>
                  <TableHead className="text-xs">Evento</TableHead>
                  <TableHead className="text-xs">Fonte</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev: any, i: number) => {
                  const sc = statusConfig[ev.status] || statusConfig.pending;
                  return (
                    <TableRow key={ev.id ?? i}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(ev.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.event}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ev.source || '---'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {ev.error || '---'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
