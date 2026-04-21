'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Store, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] animate-[spin_60s_linear_infinite] opacity-30">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-acai/40 blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 h-80 w-80 rounded-full bg-teal/30 blur-[120px]" />
          <div className="absolute top-1/2 right-1/3 h-64 w-64 rounded-full bg-acai-light/20 blur-[100px]" />
        </div>
      </div>

      <div className="animate-scale-in relative w-full max-w-sm">
        {/* Card */}
        <div className="glass-card rounded-2xl p-8 glow-acai">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl gradient-acai shadow-lg">
              <Store className="h-8 w-8 text-white" />
              <div className="absolute inset-0 rounded-2xl bg-white/10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                Japa Gestão
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Seu estoque mais inteligente
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="h-11 bg-muted/50 border-border focus:border-acai/50 focus:ring-acai/20 transition-all duration-200 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 bg-muted/50 border-border focus:border-acai/50 focus:ring-acai/20 transition-all duration-200 placeholder:text-muted-foreground/50"
              />
            </div>

            {error && (
              <div className="animate-fade-in rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gradient-acai text-white font-medium shadow-lg hover:shadow-acai/25 transition-all duration-200 hover:brightness-110 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          Não tem conta?{' '}
          <a href="/registro" className="text-acai hover:underline">Cadastre-se</a>
        </p>
      </div>
    </div>
  );
}
