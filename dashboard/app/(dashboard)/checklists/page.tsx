'use client';

import { useState } from 'react';
import { useChecklists, useCreateChecklist, useUpdateChecklistRun, useDeleteChecklist } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ListChecks, Plus, Trash2, Play, CheckCircle2, Circle, Clock } from 'lucide-react';

export default function ChecklistsPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useChecklists(today);
  const createChecklist = useCreateChecklist();
  const updateRun = useUpdateChecklistRun();
  const deleteChecklist = useDeleteChecklist();

  const [tab, setTab] = useState<'modelos' | 'hoje'>('hoje');
  const [newName, setNewName] = useState('');
  const [newItems, setNewItems] = useState('');

  const templates = data?.templates ?? [];
  const runs = data?.runs ?? [];

  const handleCreateTemplate = () => {
    const items = newItems.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!newName.trim() || items.length === 0) return;
    createChecklist.mutate({
      action: 'create-template',
      name: newName.trim(),
      items,
    });
    setNewName('');
    setNewItems('');
  };

  const handleStartToday = (templateId: number) => {
    createChecklist.mutate({
      action: 'create-run',
      templateId,
      date: today,
    });
    setTab('hoje');
  };

  const handleToggleItem = (run: any, index: number) => {
    const items = [...run.items];
    items[index] = {
      ...items[index],
      checked: !items[index].checked,
      checkedAt: !items[index].checked ? new Date().toISOString() : null,
    };

    const allChecked = items.every((item: any) => item.checked);
    const anyChecked = items.some((item: any) => item.checked);
    const newStatus = allChecked ? 'completed' : anyChecked ? 'in_progress' : 'pending';

    updateRun.mutate({
      id: run.id,
      items,
      status: newStatus,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Concluido</Badge>;
      case 'in_progress':
        return <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/20">Em andamento</Badge>;
      default:
        return <Badge className="text-[10px] bg-muted/80 text-muted-foreground/60 border-border">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acai/15">
          <ListChecks className="h-4 w-4 text-acai" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Checklists</h2>
          <p className="text-xs text-muted-foreground/60">Checklists operacionais do dia a dia</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        <button
          onClick={() => setTab('hoje')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
            tab === 'hoje'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground/60 hover:text-foreground',
          )}
        >
          Hoje
          {runs.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-acai/15 text-acai text-[10px] font-bold">
              {runs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('modelos')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
            tab === 'modelos'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground/60 hover:text-foreground',
          )}
        >
          Modelos
          {templates.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
              {templates.length}
            </span>
          )}
        </button>
      </div>

      {/* Modelos tab */}
      {tab === 'modelos' && (
        <div className="space-y-4">
          {/* Create template form */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Novo modelo</p>
            <Input
              placeholder="Nome do checklist..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 bg-transparent border-border focus:border-acai/40 text-sm"
            />
            <textarea
              placeholder={"Um item por linha...\nEx:\nLimpar maquina de acai\nVerificar estoque\nOrganizar balcao"}
              value={newItems}
              onChange={(e) => setNewItems(e.target.value)}
              rows={5}
              className="w-full rounded-md bg-transparent border border-border px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-acai/40 focus:outline-none resize-none"
            />
            <Button
              onClick={handleCreateTemplate}
              disabled={!newName.trim() || !newItems.trim() || createChecklist.isPending}
              size="sm"
              className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Criar Modelo
            </Button>
          </div>

          {/* Template cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t: any) => {
              const items = (t.items as any[]) || [];
              return (
                <div key={t.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{t.name}</h3>
                      <Badge className="mt-1 text-[10px] bg-acai/15 text-acai border-acai/20">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => deleteChecklist.mutate(t.id)}
                      className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {items.slice(0, 4).map((item: any, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground/60 truncate">
                        {item.label}
                      </li>
                    ))}
                    {items.length > 4 && (
                      <li className="text-xs text-muted-foreground/40">+{items.length - 4} mais...</li>
                    )}
                  </ul>
                  <Button
                    onClick={() => handleStartToday(t.id)}
                    disabled={createChecklist.isPending}
                    size="sm"
                    className="mt-3 h-7 w-full bg-acai/10 hover:bg-acai/20 text-acai border border-acai/20 text-xs"
                    variant="ghost"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Iniciar Hoje
                  </Button>
                </div>
              );
            })}
          </div>

          {templates.length === 0 && (
            <div className="glass-card rounded-xl py-10 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/60">Nenhum modelo cadastrado.</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Crie um modelo de checklist acima para comecar.</p>
            </div>
          )}
        </div>
      )}

      {/* Hoje tab */}
      {tab === 'hoje' && (
        <div className="space-y-3">
          {runs.map((run: any) => {
            const items = (run.items as any[]) || [];
            const checked = items.filter((i: any) => i.checked).length;
            const total = items.length;
            const pct = total > 0 ? (checked / total) * 100 : 0;

            const templateName = templates.find((t: any) => t.id === run.templateId)?.name || 'Checklist';

            return (
              <div key={run.id} className="glass-card rounded-xl p-4 space-y-3">
                {/* Run header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{templateName}</h3>
                    {getStatusBadge(run.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                    <Clock className="h-3 w-3" />
                    {checked}/{total}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-muted-foreground/20',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Checklist items */}
                <ul className="space-y-1">
                  {items.map((item: any, idx: number) => (
                    <li
                      key={idx}
                      onClick={() => handleToggleItem(run, idx)}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-muted/50',
                        item.checked && 'opacity-60',
                      )}
                    >
                      {item.checked ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={cn('text-sm', item.checked && 'line-through text-muted-foreground/50')}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {runs.length === 0 && (
            <div className="glass-card rounded-xl py-10 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/60">Nenhum checklist iniciado hoje.</p>
              <p className="text-xs text-muted-foreground/40 mt-1">
                Vá em <button onClick={() => setTab('modelos')} className="text-acai underline">Modelos</button> e clique em &quot;Iniciar Hoje&quot;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
