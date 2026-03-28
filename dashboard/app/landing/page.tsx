'use client';

import Link from 'next/link';
import {
  MessageSquare,
  TrendingUp,
  BookOpen,
  Trash2,
  ClipboardCheck,
  ShoppingCart,
  Store,
  ArrowRight,
  Check,
  Sparkles,
  Upload,
  BarChart3,
  Image,
  Mic,
  Type,
  Bot,
  Bell,
  Infinity,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Estoque via WhatsApp',
    description: 'Foto, áudio ou texto — manda pelo WhatsApp e a IA atualiza o estoque. Sem app, sem planilha.',
  },
  {
    icon: TrendingUp,
    title: 'CMV em tempo real',
    description: 'Saiba o custo real de cada produto vendido automaticamente.',
  },
  {
    icon: BookOpen,
    title: 'Fichas Técnicas',
    description: 'Cadastre receitas e o sistema calcula o custo por porção.',
  },
  {
    icon: Trash2,
    title: 'Controle de Desperdícios',
    description: 'Registre perdas e acompanhe padrões para reduzir custos.',
  },
  {
    icon: ClipboardCheck,
    title: 'Checklists Operacionais',
    description: 'Crie checklists diários para abertura, fechamento e limpeza.',
  },
  {
    icon: ShoppingCart,
    title: 'Lista de Compras Inteligente',
    description: 'Sugestão automática de compras baseada no consumo semanal.',
  },
];

const steps = [
  {
    number: '1',
    icon: Sparkles,
    title: 'Cadastre seus produtos',
    description: 'Adicione seus insumos, fornecedores e fichas técnicas em poucos minutos.',
  },
  {
    number: '2',
    icon: Upload,
    title: 'Envie notas pelo WhatsApp',
    description: 'Tire uma foto da nota fiscal e envie. A IA faz o resto.',
  },
  {
    number: '3',
    icon: BarChart3,
    title: 'Acompanhe tudo no dashboard',
    description: 'Veja estoque, custos, CMV e muito mais em tempo real.',
  },
];

const plans = [
  {
    name: 'Gratuito',
    price: '0',
    description: 'Para começar a organizar seu estoque',
    features: ['1 usuário', '100 movimentações/mês', 'Estoque básico'],
    cta: 'Começar grátis',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '89',
    description: 'Para negócios em crescimento',
    features: [
      '5 usuários',
      'Movimentações ilimitadas',
      'CMV em tempo real',
      'Fichas Técnicas',
      'WhatsApp integrado',
    ],
    cta: 'Assinar Starter',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '149',
    description: 'Para operações completas',
    features: [
      'Usuários ilimitados',
      'Tudo do Starter',
      'Multi-unidade',
      'Checklists operacionais',
      'Controle de desperdícios',
      'Etiquetas automáticas',
    ],
    cta: 'Assinar Pro',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-acai">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight gradient-text">
              Tongo Gestão
            </span>
          </div>
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
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-acai/5 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-teal/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-acai/20 bg-acai/5 px-4 py-1.5 text-sm font-medium text-acai">
            <Sparkles className="h-4 w-4" />
            Gestão inteligente para food service
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Seu estoque mais inteligente.{' '}
            <span className="gradient-text">
              Seu negócio mais lucrativo.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A plataforma completa para gerenciar estoque, custos e operações do seu
            restaurante, açaiteria ou hamburgueria. Tudo automatizado, tudo em um só lugar.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/registro"
              className="group inline-flex h-12 items-center gap-2 rounded-xl gradient-acai px-8 text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl hover:shadow-acai/25"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background px-8 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md"
            >
              Fazer login
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-border/50 bg-muted/30 py-6">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground sm:text-base">
            Feito para{' '}
            <span className="text-foreground font-semibold">acaiterias</span>,{' '}
            <span className="text-foreground font-semibold">hamburguerias</span>,{' '}
            <span className="text-foreground font-semibold">padarias</span>,{' '}
            <span className="text-foreground font-semibold">cafeterias</span> e{' '}
            <span className="text-foreground font-semibold">restaurantes</span>
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que você precisa para{' '}
              <span className="gradient-text">gerenciar seu negocio</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Ferramentas poderosas que automatizam o trabalho manual e te dão visão completa da operação.
            </p>
          </div>

          <div className="stagger-children mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card-hover group rounded-2xl p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-acai/10 text-acai transition-colors group-hover:bg-acai/15">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp hero section */}
      <section className="relative border-y border-border/50 bg-muted/20 py-20 sm:py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-acai/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-medium text-emerald-500">
              <MessageSquare className="h-4 w-4" />
              Integração WhatsApp com IA
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Seu estoque atualiza{' '}
              <span className="text-emerald-500">pelo WhatsApp</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sem app pra instalar. Sem planilha pra preencher. Manda pelo WhatsApp e a inteligência artificial faz o resto.
            </p>
          </div>

          {/* WhatsApp input methods */}
          <div className="grid gap-5 sm:grid-cols-3 mb-14">
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Image className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold">Foto da nota fiscal</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tire uma foto da nota do fornecedor. A IA extrai todos os itens, quantidades e preços automaticamente.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Mic className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold">Áudio de voz</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Grave um áudio dizendo o que chegou. "Chegaram 5 caixas de polpa e 3 pacotes de granola." Pronto.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Type className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold">Mensagem de texto</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite "5 cx açaí, 3 pct granola, 2 kg morango" e o estoque atualiza na hora.
              </p>
            </div>
          </div>

          {/* WhatsApp superpowers */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Bot className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Chat inteligente</h4>
                <p className="text-xs text-muted-foreground mt-1">Pergunte "quanto vendeu ontem?" ou "qual o estoque de morango?" e receba a resposta no WhatsApp</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Bell className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Alertas automáticos</h4>
                <p className="text-xs text-muted-foreground mt-1">Receba aviso quando estoque estiver baixo e sugestão de compras toda semana</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Check className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Confirmação inteligente</h4>
                <p className="text-xs text-muted-foreground mt-1">O sistema mostra o que entendeu e pede confirmação antes de atualizar o estoque</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Infinity className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Sem limite de mensagens</h4>
                <p className="text-xs text-muted-foreground mt-1">Diferente dos concorrentes que cobram por mensagem, aqui é ilimitado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simples de começar.{' '}
              <span className="gradient-text">Poderoso de usar.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Em três passos você já está no controle total do seu estoque.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-acai text-white shadow-lg shadow-acai/20">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-acai">
                  Passo {step.number}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Planos que cabem no seu{' '}
              <span className="gradient-text">orçamento</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comece grátis e escale conforme seu negócio cresce.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all ${
                  plan.highlighted
                    ? 'glass-card glow-acai border-2 border-acai/30 scale-[1.02]'
                    : 'glass-card-hover'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full gradient-acai px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                    Mais popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-acai" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/registro"
                  className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'gradient-acai text-white shadow-md hover:brightness-110 hover:shadow-lg hover:shadow-acai/20'
                      : 'border border-border bg-background text-foreground hover:bg-muted hover:shadow-md'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative border-t border-border/50 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-acai/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comece a gerenciar seu estoque{' '}
            <span className="gradient-text">agora</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Crie sua conta em segundos. Sem cartão de crédito, sem complicação.
          </p>
          <div className="mt-8">
            <Link
              href="/registro"
              className="group inline-flex h-12 items-center gap-2 rounded-xl gradient-acai px-8 text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl hover:shadow-acai/25"
            >
              Criar conta gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-acai">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold gradient-text">
                Tongo Gestão
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Tongo Gestão. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
