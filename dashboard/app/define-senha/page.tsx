'use client';

/**
 * /define-senha
 *
 * Forced gate for users provisioned via Stripe webhook with a random
 * password they don't know. Until they set their own password, this is
 * the ONLY page accessible — the (dashboard) layout redirects them here
 * regardless of which route they tried to access.
 *
 * Stays in its own route (NOT inside the (dashboard) group) so the dashboard
 * layout's onboarding redirect doesn't compete with this gate.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';

export default function DefineSenhaPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessionData, isLoading } = useSession();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user lands here without needing to set a password (already done, or
  // legacy account that has a real password), bounce them to the dashboard.
  useEffect(() => {
    if (isLoading) return;
    if (!sessionData?.session) return;
    if (!sessionData.session.passwordIsTemporary) {
      router.replace(sessionData.session.tenant?.onboardingCompleted ? '/' : '/onboarding');
    }
  }, [sessionData, isLoading, router]);

  const submit = async () => {
    setError('');
    if (form.password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar senha');
      }
      await qc.invalidateQueries({ queryKey: ['session'] });
      // Bounce back to the dashboard root — the (dashboard) layout will
      // forward to /onboarding if the tenant hasn't finished it yet.
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-acai shadow-lg">
              <Store className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Defina sua senha</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Você entrou pelo link do email. Crie uma senha pra entrar de novo
            sem precisar do link toda vez.
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha (mínimo 8 caracteres)</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Sua senha"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confirme a senha</label>
            <Input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="Digite de novo"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            onClick={submit}
            disabled={loading || !form.password || !form.confirm}
            className="w-full bg-acai hover:bg-acai/80 text-white"
          >
            {loading ? 'Salvando…' : 'Salvar e continuar'}
          </Button>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Você usa essa senha pra entrar em <strong>app.japagestao.com.br/login</strong> com seu email.
          </p>
        </div>
      </div>
    </div>
  );
}
