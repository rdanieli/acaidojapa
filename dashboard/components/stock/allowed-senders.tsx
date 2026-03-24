'use client';

import { useState } from 'react';
import { useAllowedSenders, useAddSender, useRemoveSender } from '@/hooks/use-dashboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Phone, Shield, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

function useResendVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/dashboard/senders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-senders'] }),
  });
}

export function AllowedSenders() {
  const { data, isLoading } = useAllowedSenders();
  const addSender = useAddSender();
  const removeSender = useRemoveSender();
  const resend = useResendVerification();
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newPhone.trim() || !newName.trim()) return;
    addSender.mutate({ phone: newPhone.trim(), name: newName.trim() });
    setNewPhone('');
    setNewName('');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  const senders = data?.senders ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-acai" />
        <p className="text-sm text-muted-foreground/70">
          Apenas números verificados podem enviar entradas de estoque via WhatsApp.
        </p>
      </div>

      {/* Add new sender form */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Telefone (com DDD e código do país)
            </label>
            <Input
              placeholder="5583993698623"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="h-9 bg-muted/50 border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Nome
            </label>
            <Input
              placeholder="Felippe"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-9 bg-muted/50 border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newPhone.trim() || !newName.trim() || addSender.isPending}
            className="h-9 bg-acai hover:bg-acai/80 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {addSender.isPending ? 'Enviando...' : 'Adicionar'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-2">
          Uma mensagem de verificação será enviada pelo WhatsApp. A pessoa precisa responder "VERIFICAR" para ativar.
        </p>
      </div>

      {/* Senders list */}
      {senders.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <Phone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum número cadastrado.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Adicione números autorizados acima.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Telefone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Verificação</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {senders.map((s: any) => {
                const isVerified = s.verificationStatus === 'verified';
                return (
                  <TableRow key={s.id} className="border-border/60 hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground/70">
                      +{s.phone.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '$1 $2 $3-$4')}
                    </TableCell>
                    <TableCell>
                      {isVerified ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando
                          </Badge>
                          <button
                            onClick={() => resend.mutate(s.id)}
                            disabled={resend.isPending}
                            className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            title="Reenviar verificação"
                          >
                            <RefreshCw className={cn('h-3 w-3', resend.isPending && 'animate-spin')} />
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeSender.mutate(s.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
