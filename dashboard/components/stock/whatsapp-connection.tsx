'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react';

function useWhatsAppStatus() {
  return useQuery<{
    status: string;
    phone: string | null;
    profileName: string | null;
    profilePic: string | null;
    instanceName: string;
  }>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/whatsapp');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function WhatsAppConnection() {
  const qc = useQueryClient();
  const { data, isLoading } = useWhatsAppStatus();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.qr) {
        setQrCode(data.qr);
        setPolling(true);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      setQrCode(null);
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  // Poll for QR refresh and connection status while scanning
  const refreshQr = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      });
      const data = await res.json();
      if (data.qr) setQrCode(data.qr);
    } catch {}
  }, []);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      // Check if connected
      const statusRes = await fetch('/api/dashboard/whatsapp');
      const status = await statusRes.json();
      if (status.status === 'connected') {
        setPolling(false);
        setQrCode(null);
        qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
        return;
      }
      // Refresh QR
      await refreshQr();
    }, 15000);
    return () => clearInterval(interval);
  }, [polling, qc, refreshQr]);

  if (isLoading) {
    return <Skeleton className="h-32 w-full shimmer rounded-xl" />;
  }

  const connected = data?.status === 'connected';

  return (
    <div className="space-y-4">
      {/* Connection status card */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data?.profilePic ? (
              <img
                src={data.profilePic}
                alt=""
                className="h-12 w-12 rounded-full ring-2 ring-white/10"
              />
            ) : (
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full',
                connected ? 'bg-emerald-500/15' : 'bg-muted-foreground/10'
              )}>
                <Smartphone className={cn('h-5 w-5', connected ? 'text-emerald-400' : 'text-muted-foreground/50')} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {connected ? (data?.profileName || 'WhatsApp Conectado') : 'WhatsApp Desconectado'}
                </h3>
                <Badge className={cn(
                  'text-[10px]',
                  connected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-destructive/15 text-destructive border-destructive/20'
                )}>
                  {connected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {connected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              {connected && data?.phone && (
                <p className="text-sm text-muted-foreground/60 font-mono mt-0.5">
                  +{data.phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 $2 $3-$4')}
                </p>
              )}
              {!connected && !qrCode && (
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  Conecte um celular para receber entradas de estoque via WhatsApp.
                </p>
              )}
            </div>
          </div>

          <div>
            {connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Desconectar
              </Button>
            ) : !qrCode ? (
              <Button
                size="sm"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="bg-acai hover:bg-acai/80 text-white"
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {connectMutation.isPending ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* QR Code display */}
      {qrCode && !connected && (
        <div className="glass-card rounded-xl p-6 text-center animate-fade-in">
          <p className="text-sm font-semibold mb-3">Escaneie com o WhatsApp</p>
          <div className="inline-block rounded-xl overflow-hidden bg-white p-3">
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          </div>
          <p className="text-xs text-muted-foreground/50 mt-3">
            WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
          </p>
          <div className="flex justify-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshQr}
              className="border-border"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setQrCode(null); setPolling(false); }}
              className="border-border"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
