'use client';

import { useState } from 'react';
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
  Play,
  Plug,
  ChevronDown,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Estoque via WhatsApp',
    description:
      'Foto, áudio ou texto — manda pelo WhatsApp e a IA atualiza o estoque. Sem app, sem planilha.',
  },
  {
    icon: TrendingUp,
    title: 'CMV em tempo real',
    description:
      'Saiba o custo real de cada produto vendido automaticamente.',
  },
  {
    icon: BookOpen,
    title: 'Fichas Técnicas',
    description:
      'Cadastre receitas e o sistema calcula o custo por porção.',
  },
  {
    icon: Trash2,
    title: 'Controle de Desperdícios',
    description:
      'Registre perdas e acompanhe padrões para reduzir custos.',
  },
  {
    icon: ClipboardCheck,
    title: 'Checklists Operacionais',
    description:
      'Crie checklists diários para abertura, fechamento e limpeza.',
  },
  {
    icon: ShoppingCart,
    title: 'Lista de Compras Inteligente',
    description:
      'Sugestão automática de compras baseada no consumo semanal.',
  },
];

const steps = [
  {
    number: '1',
    icon: Sparkles,
    title: 'Cadastre seus produtos',
    description:
      'Adicione seus insumos, fornecedores e fichas técnicas em poucos minutos.',
  },
  {
    number: '2',
    icon: Upload,
    title: 'Envie notas pelo WhatsApp',
    description:
      'Tire uma foto da nota fiscal e envie. A IA faz o resto.',
  },
  {
    number: '3',
    icon: BarChart3,
    title: 'Acompanhe tudo no dashboard',
    description:
      'Veja estoque, custos, CMV e muito mais em tempo real.',
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

const faqs = [
  {
    q: 'Preciso instalar algum aplicativo?',
    a: 'Não. O Tongo funciona 100% pelo navegador e pelo WhatsApp que você já usa. Sem downloads.',
  },
  {
    q: 'Funciona com qualquer tipo de estabelecimento?',
    a: 'Sim. Açaiterias, hamburguerias, padarias, cafeterias, restaurantes, pizzarias — qualquer food service.',
  },
  {
    q: 'Como funciona a integração com meu sistema de vendas?',
    a: 'Oferecemos uma API aberta onde qualquer sistema pode enviar dados de vendas e estoque. Também temos integração via WhatsApp para entrada manual.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Cada estabelecimento tem seus dados completamente isolados. Usamos criptografia e servidores seguros.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. O dashboard é responsivo e funciona perfeitamente no celular. O scanner de código de barras usa a câmera do celular.',
  },
  {
    q: 'Tem contrato ou fidelidade?',
    a: 'Não. Você pode cancelar a qualquer momento. Comece grátis e faça upgrade quando precisar.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-foreground sm:text-base">
          {q}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ================================================================ */}
      {/* 1. Navigation */}
      {/* ================================================================ */}
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

      {/* ================================================================ */}
      {/* 2. Hero + Video Placeholder */}
      {/* ================================================================ */}
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
            A plataforma completa para gerenciar estoque, custos e operações do
            seu restaurante, açaiteria ou hamburgueria. Tudo automatizado, tudo
            em um só lugar.
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

          {/* Video embed will be added here when available */}
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. Social proof bar */}
      {/* ================================================================ */}
      <section className="border-y border-border/50 bg-muted/30 py-6">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground sm:text-base">
            Feito para{' '}
            <span className="text-foreground font-semibold">açaiterias</span>,{' '}
            <span className="text-foreground font-semibold">hamburguerias</span>,{' '}
            <span className="text-foreground font-semibold">padarias</span>,{' '}
            <span className="text-foreground font-semibold">cafeterias</span> e{' '}
            <span className="text-foreground font-semibold">restaurantes</span>
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. Stats / Numbers */}
      {/* ================================================================ */}
      <section className="py-12 border-b border-border/50">
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-extrabold gradient-text">3x</p>
            <p className="text-sm text-muted-foreground mt-1">
              mais rápido que planilha
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold gradient-text">-30%</p>
            <p className="text-sm text-muted-foreground mt-1">
              desperdício de estoque
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold gradient-text">30s</p>
            <p className="text-sm text-muted-foreground mt-1">
              pra registrar entrada
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold gradient-text">24/7</p>
            <p className="text-sm text-muted-foreground mt-1">
              monitoramento via WhatsApp
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. Demo Section — WhatsApp mockup + Dashboard mockup */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Veja como funciona na{' '}
              <span className="gradient-text">prática</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Do WhatsApp ao dashboard em segundos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* WhatsApp mockup — pixel-perfect WhatsApp Dark theme */}
            <div className="mx-auto w-full max-w-[340px]">
              <div className="rounded-[14px] overflow-hidden shadow-2xl shadow-black/40" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
                {/* Status bar */}
                <div className="bg-[#1f2c34] px-4 py-1 flex justify-between items-center">
                  <span className="text-[10px] text-white/60">14:32</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 border border-white/60 rounded-sm"><div className="w-2 h-1 bg-white/60 rounded-sm m-[1px]" /></div>
                    <span className="text-[10px] text-white/60">5G</span>
                  </div>
                </div>
                {/* WhatsApp header — exact WA dark colors */}
                <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-3 border-b border-[#313d45]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#aebac1]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
                  <div className="h-9 w-9 rounded-full bg-[#6b7b8d] flex items-center justify-center text-white text-sm font-medium">T</div>
                  <div className="flex-1">
                    <p className="text-[#e9edef] text-[15px] font-normal leading-tight">Tongo Gestão</p>
                    <p className="text-[#8696a0] text-[12px] leading-tight">online</p>
                  </div>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#aebac1]" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </div>

                {/* Chat area — WA dark wallpaper */}
                <div className="px-[6px] py-2 space-y-[3px] min-h-[380px]" style={{ backgroundColor: '#0b141a', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M20 5 Q25 0 30 5 Q35 10 30 15 Q25 20 20 15 Q15 10 20 5Z\' fill=\'%23111b21\' opacity=\'0.15\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
                  {/* Date chip */}
                  <div className="flex justify-center mb-2">
                    <span className="bg-[#182229] text-[#8696a0] text-[11px] px-3 py-[3px] rounded-md shadow-sm">HOJE</span>
                  </div>

                  {/* User sends photo */}
                  <div className="flex justify-end mb-[2px]">
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-1 pt-1 pb-[3px] max-w-[230px] shadow-sm">
                      <div className="bg-[#004a3f] rounded-md h-32 w-[210px] flex items-center justify-center">
                        <div className="text-center">
                          <Image className="h-10 w-10 text-[#8696a0]/40 mx-auto" />
                          <p className="text-[10px] text-[#8696a0]/60 mt-1">nota-fiscal.jpg</p>
                        </div>
                      </div>
                      <div className="flex justify-end items-center gap-1 px-1 mt-[2px]">
                        <span className="text-[11px] text-[#ffffff99]">14:32</span>
                        <svg viewBox="0 0 16 11" className="w-4 h-[11px] text-[#53bdeb]" fill="currentColor"><path d="M11.07.66L5.4 6.33 3.04 3.98l-.87.87 3.24 3.24 6.54-6.54z"/><path d="M15.07.66L9.4 6.33 8.1 5.03l-.87.87 2.17 2.17 6.54-6.54z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Bot response */}
                  <div className="flex justify-start mb-[2px]">
                    <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-[10px] py-[6px] max-w-[250px] shadow-sm">
                      <p className="text-[13.5px] text-[#e9edef] leading-[19px]">📦 <span className="font-semibold">Entrada #47 registrada!</span></p>
                      <p className="text-[13px] text-[#e9edef]/80 leading-[18px] mt-[4px]">
                        • Polpa de Açaí 10kg: <span className="font-medium">5 cx</span><br/>
                        • Granola: <span className="font-medium">3 pct</span> (R$45,00)<br/>
                        • Leite Condensado: <span className="font-medium">12 un</span>
                      </p>
                      <p className="text-[12.5px] text-[#e9edef]/60 mt-[6px]">Responda <span className="font-semibold text-[#e9edef]/80">ok</span> para confirmar ou <span className="font-semibold text-[#e9edef]/80">cancelar</span></p>
                      <div className="flex justify-end mt-[2px]">
                        <span className="text-[11px] text-[#ffffff66]">14:32</span>
                      </div>
                    </div>
                  </div>

                  {/* User sends ok */}
                  <div className="flex justify-end mb-[2px]">
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-[10px] py-[6px] shadow-sm">
                      <div className="flex items-end gap-2">
                        <span className="text-[13.5px] text-[#e9edef]">ok</span>
                        <div className="flex items-center gap-1 mb-[1px]">
                          <span className="text-[11px] text-[#ffffff99]">14:33</span>
                          <svg viewBox="0 0 16 11" className="w-4 h-[11px] text-[#53bdeb]" fill="currentColor"><path d="M11.07.66L5.4 6.33 3.04 3.98l-.87.87 3.24 3.24 6.54-6.54z"/><path d="M15.07.66L9.4 6.33 8.1 5.03l-.87.87 2.17 2.17 6.54-6.54z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bot confirms */}
                  <div className="flex justify-start mb-[2px]">
                    <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-[10px] py-[6px] max-w-[250px] shadow-sm">
                      <p className="text-[13.5px] text-[#e9edef] leading-[19px]">✅ Entrada confirmada! Estoque atualizado.</p>
                      <div className="flex justify-end mt-[2px]">
                        <span className="text-[11px] text-[#ffffff66]">14:33</span>
                      </div>
                    </div>
                  </div>

                  {/* User asks question */}
                  <div className="flex justify-end mb-[2px]">
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-[10px] py-[6px] max-w-[230px] shadow-sm">
                      <div className="flex items-end gap-2">
                        <span className="text-[13.5px] text-[#e9edef]">quanto tem de granola?</span>
                        <div className="flex items-center gap-1 mb-[1px] shrink-0">
                          <span className="text-[11px] text-[#ffffff99]">14:34</span>
                          <svg viewBox="0 0 16 11" className="w-4 h-[11px] text-[#53bdeb]" fill="currentColor"><path d="M11.07.66L5.4 6.33 3.04 3.98l-.87.87 3.24 3.24 6.54-6.54z"/><path d="M15.07.66L9.4 6.33 8.1 5.03l-.87.87 2.17 2.17 6.54-6.54z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bot answers */}
                  <div className="flex justify-start">
                    <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-[10px] py-[6px] max-w-[250px] shadow-sm">
                      <p className="text-[13.5px] text-[#e9edef] leading-[19px]">📊 Estoque de <span className="font-semibold">Granola</span>: 15 pct</p>
                      <p className="text-[12.5px] text-[#e9edef]/60 mt-[2px]">Consumo médio: 2.1 pct/dia<br/>Duração estimada: ~7 dias ✅</p>
                      <div className="flex justify-end mt-[2px]">
                        <span className="text-[11px] text-[#ffffff66]">14:34</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="bg-[#1f2c34] px-2 py-[6px] flex items-center gap-2 border-t border-[#313d45]">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-[7px] flex items-center">
                    <span className="text-[14px] text-[#8696a0]">Mensagem</span>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center">
                    <Mic className="h-5 w-5 text-[#1f2c34]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard mockup (right) */}
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">
                  Estoque atualizado em tempo real
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Polpa de Açaí 10kg</span>
                    <span className="text-sm font-mono text-emerald-400">
                      23 cx
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Granola</span>
                    <span className="text-sm font-mono text-emerald-400">
                      15 pct
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Leite Condensado</span>
                    <span className="text-sm font-mono text-emerald-400">
                      48 un
                    </span>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">
                  CMV automático
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-acai">24.3%</span>
                  <span className="text-xs text-emerald-400">
                    ↓ 2.1% esta semana
                  </span>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">
                  Alerta automático
                </p>
                <p className="text-sm text-amber-400">
                  Morango abaixo do mínimo (200g restantes)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. Features grid */}
      {/* ================================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que você precisa para{' '}
              <span className="gradient-text">gerenciar seu negócio</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Ferramentas poderosas que automatizam o trabalho manual e te dão
              visão completa da operação.
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

      {/* ================================================================ */}
      {/* 7. WhatsApp superpowers */}
      {/* ================================================================ */}
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
              Sem app pra instalar. Sem planilha pra preencher. Manda pelo
              WhatsApp e a inteligência artificial faz o resto.
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
                Tire uma foto da nota do fornecedor. A IA extrai todos os itens,
                quantidades e preços automaticamente.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Mic className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold">Áudio de voz</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Grave um áudio dizendo o que chegou. &quot;Chegaram 5 caixas de
                polpa e 3 pacotes de granola.&quot; Pronto.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Type className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold">Mensagem de texto</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite &quot;5 cx açaí, 3 pct granola, 2 kg morango&quot; e o
                estoque atualiza na hora.
              </p>
            </div>
          </div>

          {/* WhatsApp superpowers */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Bot className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Chat inteligente</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Pergunte &quot;quanto vendeu ontem?&quot; ou &quot;qual o
                  estoque de morango?&quot; e receba a resposta no WhatsApp
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Bell className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Alertas automáticos</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Receba aviso quando estoque estiver baixo e sugestão de
                  compras toda semana
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Check className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">
                  Confirmação inteligente
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  O sistema mostra o que entendeu e pede confirmação antes de
                  atualizar o estoque
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <Infinity className="h-5 w-5 text-acai shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">
                  Sem limite de mensagens
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Diferente dos concorrentes que cobram por mensagem, aqui é
                  ilimitado
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 8. How it works */}
      {/* ================================================================ */}
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

      {/* ================================================================ */}
      {/* 9. API / Integration section */}
      {/* ================================================================ */}
      <section className="border-t border-border/50 bg-muted/20 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-acai/20 bg-acai/5 px-4 py-1.5 text-sm font-medium text-acai">
            <Plug className="h-4 w-4" />
            API Aberta
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Integre com{' '}
            <span className="gradient-text">qualquer sistema</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            POS, delivery, ERP — qualquer sistema que faça HTTP pode enviar
            dados pro Tongo. Uma API, um endpoint, qualquer integração.
          </p>
          <div className="mt-6 glass-card rounded-xl p-4 max-w-lg mx-auto text-left font-mono text-xs">
            <p className="text-muted-foreground/50">$ curl</p>
            <p className="text-acai">POST /api/v1/ingest</p>
            <p className="text-emerald-400 mt-1">
              {'{'} &quot;event&quot;: &quot;order.completed&quot;,
              &quot;data&quot;: {'{'} ... {'}'} {'}'}
            </p>
            <p className="text-muted-foreground/50 mt-1">→ 202 Accepted</p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 10. Pricing */}
      {/* ================================================================ */}
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
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
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

      {/* ================================================================ */}
      {/* 11. FAQ */}
      {/* ================================================================ */}
      <section className="border-t border-border/50 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl mb-10">
            Perguntas <span className="gradient-text">frequentes</span>
          </h2>
          <div className="divide-y divide-border/50">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 12. Final CTA */}
      {/* ================================================================ */}
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
              Criar conta grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 13. Footer */}
      {/* ================================================================ */}
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
