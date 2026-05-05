'use client';

import React, { useState, useEffect } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useTenantSettings, useUpdateTenantSettings, useBillingStatus, useSubscribe } from '@/hooks/use-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Settings, Plus, Pencil, Check, X, UserPlus, Users, Power, PowerOff, Link, Save, CheckCircle, CreditCard, ExternalLink } from 'lucide-react';
import { ALL_MODULES } from '@/components/sidebar';
import { useSession } from '@/hooks/use-session';

const ROLES = [
  { value: 'owner', label: 'Dono' },
  { value: 'manager', label: 'Gerente' },
  { value: 'employee', label: 'Funcionário' },
];

function roleBadge(role: string) {
  switch (role) {
    case 'owner':
      return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/20 hover:bg-purple-500/15">Dono</Badge>;
    case 'manager':
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/15">Gerente</Badge>;
    default:
      return <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/20 hover:bg-gray-500/15">Funcionário</Badge>;
  }
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
];

function FieldInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground/70">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-8 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
      />
    </div>
  );
}

function IntegrationCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Link className="h-4 w-4 text-acai" />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const { data, isLoading } = useTenantSettings();
  const updateSettings = useUpdateTenantSettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    tenantName: '',
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstanceName: '',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
  });

  useEffect(() => {
    if (data) {
      const s = data.settings || {};
      setForm({
        tenantName: data.tenant?.name || '',
        evolutionApiUrl: s.evolutionApiUrl || '',
        evolutionApiKey: s.evolutionApiKey || '',
        evolutionInstanceName: s.evolutionInstanceName || '',
        timezone: s.timezone || 'America/Sao_Paulo',
        currency: s.currency || 'BRL',
      });
    }
  }, [data]);

  const set = (field: string) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaved(false);
    await updateSettings.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Negócio */}
      <IntegrationCard title="Negócio">
        <FieldInput label="Nome do Estabelecimento" value={form.tenantName} onChange={set('tenantName')} placeholder="Ex: Açaí do Japá" />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground/70">Slug</label>
          <Input
            value={data?.tenant?.slug || ''}
            disabled
            className="h-8 bg-muted/50 border-border text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>
      </IntegrationCard>

      {/* WhatsApp */}
      <IntegrationCard title="WhatsApp (Evolution API)">
        <FieldInput label="URL da API" value={form.evolutionApiUrl} onChange={set('evolutionApiUrl')} placeholder="https://evolution.example.com" />
        <FieldInput label="API Key" value={form.evolutionApiKey} onChange={set('evolutionApiKey')} type="password" />
        <FieldInput label="Nome da Instância" value={form.evolutionInstanceName} onChange={set('evolutionInstanceName')} />
      </IntegrationCard>

      {/* Preferências */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4 text-acai" />
          Preferências
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground/70">Fuso Horário</label>
            <select
              value={form.timezone}
              onChange={(e) => set('timezone')(e.target.value)}
              className="w-full h-8 rounded-md bg-transparent border border-border px-2 text-sm text-foreground focus:border-acai/40 focus:ring-acai/20"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground/70">Moeda</label>
            <select
              value={form.currency}
              onChange={(e) => set('currency')(e.target.value)}
              className="w-full h-8 rounded-md bg-transparent border border-border px-2 text-sm text-foreground focus:border-acai/40 focus:ring-acai/20"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="bg-acai hover:bg-acai/80 text-white text-sm"
        >
          {updateSettings.isPending ? (
            <>Salvando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Configurações salvas com sucesso!
          </span>
        )}
        {updateSettings.isError && (
          <span className="text-sm text-red-500">Erro ao salvar configurações.</span>
        )}
      </div>
    </div>
  );
}

const PLANS = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    features: ['1 usuário', 'Dashboard básico', 'Controle de estoque', 'Relatórios limitados'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49.90,
    features: ['3 usuários', 'Dashboard completo', 'Controle de estoque', 'Integrações', 'Relatórios avançados'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99.90,
    features: ['Usuários ilimitados', 'Dashboard completo', 'Controle de estoque', 'WhatsApp integrado', 'Relatórios avançados', 'Suporte prioritário'],
  },
];

function BillingTab() {
  const { data, isLoading } = useBillingStatus();
  const { data: sessionData } = useSession();
  const subscribe = useSubscribe();
  const [subscribeError, setSubscribeError] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  const currentPlan = data?.plan || 'free';
  const card = data?.card;
  const isStripe = data?.provider === 'stripe' || sessionData?.session?.tenant?.hasStripeSubscription;
  const sub = data?.subscription;

  const openStripePortal = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || 'Falha ao abrir portal');
      window.location.href = body.url;
    } catch (err: any) {
      setPortalError(err.message);
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribeError('');
    setSubscribeSuccess('');
    try {
      await subscribe.mutateAsync(planId);
      setSubscribeSuccess(`Plano ${PLANS.find(p => p.id === planId)?.name} ativado com sucesso!`);
      setTimeout(() => setSubscribeSuccess(''), 4000);
    } catch (err: any) {
      setSubscribeError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  // Stripe-managed tenants: redirect to Customer Portal for any change
  // (update card, view invoices, cancel). No PCI exposure on our side.
  if (isStripe) {
    const renewDate = sub?.current_period_end ? new Date(sub.current_period_end) : null;
    const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
    const inTrial = trialEnd && trialEnd.getTime() > Date.now();
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-acai" />
                Sua assinatura
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Gerenciada pelo Stripe — atualizar cartão, baixar faturas ou cancelar é direto pelo portal deles.</p>
            </div>
            {sub?.status && (
              <Badge className={cn(
                'text-[11px] capitalize',
                sub.status === 'active' || sub.status === 'trialing'
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/20',
              )}>
                {sub.status === 'trialing' ? 'em teste grátis' : sub.status}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Plano</p>
              <p className="text-base font-semibold capitalize mt-0.5">{currentPlan}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Cartão</p>
              <p className="text-base font-semibold mt-0.5">
                {card ? `${(card.brand || '').toUpperCase()} •••• ${card.last4}` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                {inTrial ? 'Trial até' : 'Próxima cobrança'}
              </p>
              <p className="text-base font-semibold mt-0.5">
                {inTrial && trialEnd
                  ? trialEnd.toLocaleDateString('pt-BR')
                  : renewDate
                    ? renewDate.toLocaleDateString('pt-BR')
                    : '—'}
              </p>
            </div>
          </div>

          {sub?.cancel_at_period_end && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
              Cancelamento agendado — sua assinatura termina em {renewDate?.toLocaleDateString('pt-BR')}.
            </div>
          )}

          <Button
            onClick={openStripePortal}
            disabled={portalLoading}
            className="bg-acai hover:bg-acai/80 text-white"
          >
            {portalLoading ? 'Abrindo…' : (
              <>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Gerenciar assinatura
              </>
            )}
          </Button>

          {portalError && <p className="text-sm text-red-500">{portalError}</p>}
        </div>
      </div>
    );
  }

  // Legacy Asaas tenants — keep existing plan picker
  return (
    <div className="space-y-6">
      {/* Current card */}
      <div className="glass-card rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-acai" />
          Cartão cadastrado
        </h3>
        {card ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-muted/50 border border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase">{card.brand || 'Card'}</span>
            </div>
            <div>
              <p className="text-sm font-medium">**** **** **** {card.last4 || '****'}</p>
              <p className="text-xs text-muted-foreground">{card.holderName || 'Titular'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado. Cadastre um cartão para assinar um plano.</p>
        )}
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Escolha seu plano</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  'glass-card rounded-xl p-5 space-y-4 transition-all',
                  isCurrent ? 'ring-2 ring-acai/40 bg-acai/5' : '',
                )}
              >
                <div>
                  <h4 className="text-base font-bold">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-1">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                    {plan.price > 0 && <span className="text-xs font-normal text-muted-foreground">/mês</span>}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Badge className="bg-acai/15 text-acai border-acai/20 hover:bg-acai/15 w-full justify-center py-1">
                    Plano atual
                  </Badge>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribe.isPending}
                    className="w-full bg-acai hover:bg-acai/80 text-white text-sm"
                    size="sm"
                  >
                    {subscribe.isPending ? 'Processando...' : 'Assinar'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {subscribeError && (
        <p className="text-sm text-red-500">{subscribeError}</p>
      )}
      {subscribeSuccess && (
        <span className="text-sm text-emerald-600 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {subscribeSuccess}
        </span>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'integrations' | 'billing'>('users');

  const { data, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newPhone, setNewPhone] = useState('');
  const [newModules, setNewModules] = useState<string[]>([]);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', allowedModules: [] as string[] });

  const usersList = data?.users ?? [];

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setError('');
    try {
      await createUser.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        phone: newPhone.trim() || undefined,
        allowedModules: newRole === 'employee' ? newModules : undefined,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('employee');
      setNewPhone('');
      setNewModules([]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (u: any) => {
    setEditingId(u.id);
    setEditForm({
      name: u.name,
      role: u.role,
      phone: u.phone || '',
      allowedModules: u.allowedModules || [],
    });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateUser.mutate({
      id: editingId,
      name: editForm.name,
      role: editForm.role,
      phone: editForm.phone || undefined,
      allowedModules: editForm.role === 'employee' ? editForm.allowedModules : null,
    });
    setEditingId(null);
  };

  const toggleActive = (u: any) => {
    updateUser.mutate({ id: u.id, active: !u.active });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-acai shadow-lg shadow-acai/20">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
          <p className="text-xs text-muted-foreground/60">Gerenciamento de usuários, permissões e integrações</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            activeTab === 'users'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Users className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            activeTab === 'integrations'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Link className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Integrações
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            activeTab === 'billing'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CreditCard className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Plano
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'billing' ? (
        <BillingTab />
      ) : activeTab === 'integrations' ? (
        <IntegrationsTab />
      ) : (
        <>
          {/* Add user form */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-acai" />
              <span className="text-sm font-semibold">Adicionar Usuário</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Nome"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 flex-1 min-w-[140px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <Input
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-8 flex-1 min-w-[180px] bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <Input
                placeholder="Senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 w-36 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="h-8 rounded-md bg-muted/50 border border-border px-2 text-xs text-muted-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <Input
                placeholder="Telefone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-8 w-36 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || createUser.isPending}
                size="sm"
                className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
            {newRole === 'employee' && (
              <div className="col-span-full space-y-2">
                <label className="text-xs text-muted-foreground">Módulos permitidos</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_MODULES.filter(m => !['dashboard', 'configuracoes', 'financeiro'].includes(m.id)).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewModules(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                        newModules.includes(m.id)
                          ? 'bg-acai/15 border-acai/30 text-acai font-medium'
                          : 'bg-muted/50 border-border text-muted-foreground/60'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/40">
                  Selecione os módulos que este funcionário pode acessar. Dashboard é sempre visível.
                </p>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Users table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
              ))}
            </div>
          ) : usersList.length === 0 ? (
            <div className="glass-card rounded-xl py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/60">Nenhum usuário cadastrado.</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Nome</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Email</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Cargo</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Módulos</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Telefone</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Último login</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((u: any) => {
                    const isEditing = editingId === u.id;
                    return (
                      <TableRow key={u.id} className="border-border/60 hover:bg-muted/50">
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-7 text-sm bg-muted/70 border-acai/30"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium">{u.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{u.email}</span>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="h-7 rounded-md bg-muted/70 border border-acai/30 px-2 text-xs"
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            roleBadge(u.role)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing && editForm.role === 'employee' ? (
                            <div className="flex flex-wrap gap-1">
                              {ALL_MODULES.filter(m => !['dashboard', 'configuracoes', 'financeiro'].includes(m.id)).map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setEditForm(prev => ({
                                    ...prev,
                                    allowedModules: prev.allowedModules.includes(m.id)
                                      ? prev.allowedModules.filter(x => x !== m.id)
                                      : [...prev.allowedModules, m.id],
                                  }))}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                                    editForm.allowedModules.includes(m.id)
                                      ? 'bg-acai/15 border-acai/30 text-acai font-medium'
                                      : 'bg-muted/50 border-border text-muted-foreground/60'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          ) : u.role === 'employee' ? (
                            u.allowedModules && u.allowedModules.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.allowedModules.map((modId: string) => {
                                  const mod = ALL_MODULES.find(m => m.id === modId);
                                  return mod ? (
                                    <Badge key={modId} className="bg-acai/10 text-acai/70 border-acai/15 hover:bg-acai/10 text-[10px] px-1.5 py-0">
                                      {mod.label}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">Todos</span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground/40">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="h-7 text-sm bg-muted/70 border-acai/30 w-32"
                              placeholder="Telefone"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">{u.phone || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.active ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">Ativo</Badge>
                          ) : (
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/20 hover:bg-red-500/15">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground/60">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEdit}
                                  disabled={updateUser.isPending}
                                  className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(u)}
                                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-acai hover:bg-acai/10"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleActive(u)}
                                  disabled={updateUser.isPending}
                                  className={cn(
                                    'h-7 w-7 p-0',
                                    u.active
                                      ? 'text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10'
                                      : 'text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10',
                                  )}
                                  title={u.active ? 'Desativar' : 'Ativar'}
                                >
                                  {u.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
