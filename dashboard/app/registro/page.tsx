'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    slug: '',
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao cadastrar');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Erro de conexao');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from business name
  const updateBusinessName = (name: string) => {
    setForm({
      ...form,
      businessName: name,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Criar Conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Comece a gerenciar seu negocio</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do negocio</label>
            <Input
              value={form.businessName}
              onChange={(e) => updateBusinessName(e.target.value)}
              placeholder="Acai do Japa"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Seu nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Joao Silva"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="joao@acaidojapa.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="********"
              required
              minLength={6}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">WhatsApp (opcional)</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="5583999999999"
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-acai hover:bg-acai/80 text-white"
          >
            {loading ? 'Criando...' : 'Criar Conta'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ja tem conta?{' '}
            <a href="/login" className="text-acai hover:underline">Entrar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
