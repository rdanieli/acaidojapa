'use client';

import { useState } from 'react';
import { useDailyStockRuns, useTriggerDailyRun, useProductNameAliases, useCreateAlias, useDeleteAlias, useSoldProducts } from '@/hooks/use-dashboard';
import { Button } from '@/components/ui/button';
import { Play, Loader2, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatDateTime(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Completo</span>;
    case 'failed':
      return <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> Falhou</span>;
    case 'running':
      return <span className="inline-flex items-center gap-1 text-xs text-amber-400"><Loader2 className="h-3 w-3 animate-spin" /> Executando</span>;
    default:
      return <span className="text-xs text-muted-foreground">{status}</span>;
  }
}

export function DailyStockRuns() {
  const { data: runsData, isLoading } = useDailyStockRuns();
  const trigger = useTriggerDailyRun();
  const [dateInput, setDateInput] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const runs = runsData?.runs ?? [];

  return (
    <div className="space-y-4">
      {/* Trigger Section */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">Processar Vendas do Dia</h3>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm"
          />
          <Button
            size="sm"
            onClick={() => trigger.mutate(dateInput)}
            disabled={trigger.isPending}
          >
            {trigger.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Processar Agora
          </Button>
        </div>
        {trigger.isSuccess && trigger.data && (
          <div className="text-xs text-emerald-400 space-y-1">
            <p>Processados: {trigger.data.ordersProcessed} | Pulados: {trigger.data.ordersSkipped} | Erros: {trigger.data.errors}</p>
            {trigger.data.unmatchedItems?.length > 0 && (
              <p className="text-amber-400">Itens não mapeados: {trigger.data.unmatchedItems.join(', ')}</p>
            )}
          </div>
        )}
        {trigger.isError && (
          <p className="text-xs text-red-400">Erro ao processar: {(trigger.error as Error).message}</p>
        )}
      </div>

      {/* Runs History */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/5">
          <h3 className="text-sm font-semibold">Histórico de Consolidações</h3>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : runs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma consolidação ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground/60 border-b border-white/5">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Buscados</th>
                  <th className="px-3 py-2">Processados</th>
                  <th className="px-3 py-2">Pulados</th>
                  <th className="px-3 py-2">Erros</th>
                  <th className="px-3 py-2">Início</th>
                  <th className="px-3 py-2">Fim</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run: any) => (
                  <tr key={run.id} className="border-b border-white/5 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono">{formatDate(run.date)}</td>
                    <td className="px-3 py-2"><StatusBadge status={run.status} /></td>
                    <td className="px-3 py-2">{run.ordersFetched}</td>
                    <td className="px-3 py-2">{run.ordersProcessed}</td>
                    <td className="px-3 py-2">{run.ordersSkipped}</td>
                    <td className="px-3 py-2">{run.errors > 0 ? <span className="text-red-400">{run.errors}</span> : 0}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(run.startedAt)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(run.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aliases Section */}
      <AliasesSection />
    </div>
  );
}

function AliasesSection() {
  const { data: aliasesData, isLoading } = useProductNameAliases();
  const { data: spData } = useSoldProducts();
  const createAlias = useCreateAlias();
  const deleteAlias = useDeleteAlias();
  const [newAlias, setNewAlias] = useState('');
  const [newSoldProductId, setNewSoldProductId] = useState('');

  const aliases = aliasesData?.aliases ?? [];
  const soldProductsList = spData?.soldProducts ?? [];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-3 border-b border-white/5">
        <h3 className="text-sm font-semibold">Mapeamento de Nomes (Aliases)</h3>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Nomes dos pedidos são mapeados automaticamente. Adicione manualmente para itens não reconhecidos.
        </p>
      </div>

      {/* Add new alias */}
      <div className="p-3 border-b border-white/5 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Nome do pedido</label>
          <input
            type="text"
            value={newAlias}
            onChange={e => setNewAlias(e.target.value)}
            placeholder="ex: acai 500ml c/ morango"
            className="w-full mt-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="w-48">
          <label className="text-xs text-muted-foreground">Produto vendido</label>
          <select
            value={newSoldProductId}
            onChange={e => setNewSoldProductId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm"
          >
            <option value="">Selecionar...</option>
            {soldProductsList.map((sp: any) => (
              <option key={sp.id} value={sp.id}>
                {sp.name} {sp.sizeMl ? `(${sp.sizeMl}ml)` : ''}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (newAlias && newSoldProductId) {
              createAlias.mutate({ alias: newAlias, soldProductId: Number(newSoldProductId) });
              setNewAlias('');
              setNewSoldProductId('');
            }
          }}
          disabled={!newAlias || !newSoldProductId || createAlias.isPending}
        >
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : aliases.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">Nenhum alias cadastrado</div>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-xs text-muted-foreground/60 border-b border-white/5">
                <th className="px-3 py-2">Alias</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Fonte</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a: any) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-mono text-xs">{a.alias}</td>
                  <td className="px-3 py-1.5">{a.soldProductName || `#${a.soldProductId}`}</td>
                  <td className="px-3 py-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${a.source === 'manual' ? 'bg-blue-500/15 text-blue-400' : 'bg-muted/50 text-muted-foreground'}`}>
                      {a.source}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => deleteAlias.mutate(a.id)}
                      className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
