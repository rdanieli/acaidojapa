'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IceCreamCone, ArrowRight, ArrowLeft, Check, Package, ShoppingBag, Scale } from 'lucide-react';

// Default açaí complement products
const DEFAULT_COMPLEMENTS = [
  'Banana', 'Morango', 'Granola', 'Leite condensado', 'Leite Ninho',
  'Nutella', 'Ovomaltine', 'Paçoquinha', 'Amendoim', 'Coco ralado',
  'KitKat', 'Confete', 'Aveia', 'Manga', 'Kiwi', 'Uva', 'Abacaxi',
  'Flocos crocantes', 'Sucrilhos', 'Cookies',
];

// Default açaí cup sizes
const DEFAULT_CUPS = [
  { name: 'Açaí 200ml', sizeMl: 200, price: 12 },
  { name: 'Açaí 300ml', sizeMl: 300, price: 16 },
  { name: 'Açaí 400ml', sizeMl: 400, price: 20 },
  { name: 'Açaí 500ml', sizeMl: 500, price: 24 },
  { name: 'Açaí 700ml', sizeMl: 700, price: 32 },
];

// Default base products
const DEFAULT_PRODUCTS = [
  { name: 'Polpa de Açaí', unit: 'kg', category: 'insumo' },
  { name: 'Copo 200ml', unit: 'un', category: 'embalagem' },
  { name: 'Copo 300ml', unit: 'un', category: 'embalagem' },
  { name: 'Copo 400ml', unit: 'un', category: 'embalagem' },
  { name: 'Copo 500ml', unit: 'un', category: 'embalagem' },
  { name: 'Copo 700ml', unit: 'un', category: 'embalagem' },
  { name: 'Tampa', unit: 'un', category: 'embalagem' },
  { name: 'Colher', unit: 'un', category: 'descartavel' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Select which complements
  const [selectedComplements, setSelectedComplements] = useState<string[]>(DEFAULT_COMPLEMENTS.slice(0, 10));
  const [customComplement, setCustomComplement] = useState('');

  // Step 2: Select cups/menu items
  const [cups, setCups] = useState(DEFAULT_CUPS.map(c => ({ ...c, enabled: true })));

  // Step 3: Set gramages (simplified - just small/medium/large)
  const [gramages, setGramages] = useState<Record<string, { small: string; medium: string; large: string }>>({});

  const toggleComplement = (name: string) => {
    setSelectedComplements(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addCustomComplement = () => {
    if (customComplement.trim() && !selectedComplements.includes(customComplement.trim())) {
      setSelectedComplements([...selectedComplements, customComplement.trim()]);
      setCustomComplement('');
    }
  };

  const updateGramage = (name: string, tier: string, value: string) => {
    setGramages(prev => ({
      ...prev,
      [name]: { ...prev[name], [tier]: value },
    }));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Build products list: base products + selected complements
      const productList = [
        ...DEFAULT_PRODUCTS,
        ...selectedComplements.map(name => ({ name, unit: 'g', category: 'complemento' })),
      ];

      // Build sold products
      const soldProductsList = cups.filter(c => c.enabled).map(c => ({
        name: c.name,
        sizeMl: c.sizeMl,
        category: 'acai',
        price: c.price,
      }));

      // Build gramages
      const gramagesList = selectedComplements.map(name => ({
        productName: name,
        small: gramages[name]?.small ? Number(gramages[name].small) : 0,
        medium: gramages[name]?.medium ? Number(gramages[name].medium) : 0,
        large: gramages[name]?.large ? Number(gramages[name].large) : 0,
      })).filter(g => g.small || g.medium || g.large);

      const res = await fetch('/api/dashboard/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: productList,
          soldProductsList,
          gramages: gramagesList,
        }),
      });

      if (!res.ok) throw new Error('Failed');
      router.push('/');
    } catch {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Package, label: 'Complementos' },
    { icon: ShoppingBag, label: 'Cardápio' },
    { icon: Scale, label: 'Gramagens' },
    { icon: Check, label: 'Pronto!' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-acai shadow-lg">
            <IceCreamCone className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Configurar sua loja</h1>
        <p className="text-sm text-muted-foreground">Vamos configurar os produtos e receitas do seu negócio</p>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              i <= step ? 'bg-acai text-white' : 'bg-muted text-muted-foreground/40'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 transition-all ${i < step ? 'bg-acai' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card rounded-xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Quais complementos sua loja oferece?</h2>
              <p className="text-sm text-muted-foreground mt-1">Selecione os complementos do seu açaí. Você pode adicionar mais depois.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COMPLEMENTS.map(name => (
                <button
                  key={name}
                  onClick={() => toggleComplement(name)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    selectedComplements.includes(name)
                      ? 'bg-acai/15 border-acai/30 text-acai font-medium'
                      : 'bg-muted/50 border-border text-muted-foreground/60 hover:border-acai/20'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customComplement}
                onChange={(e) => setCustomComplement(e.target.value)}
                placeholder="Adicionar outro complemento..."
                onKeyDown={(e) => e.key === 'Enter' && addCustomComplement()}
                className="text-sm"
              />
              <Button onClick={addCustomComplement} size="sm" variant="ghost" className="text-acai">
                Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/40">{selectedComplements.length} selecionados</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Tamanhos e preços do açaí</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure os tamanhos de copo que você vende e seus preços.</p>
            </div>
            <div className="space-y-3">
              {cups.map((cup, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    checked={cup.enabled}
                    onChange={(e) => {
                      const newCups = [...cups];
                      newCups[i].enabled = e.target.checked;
                      setCups(newCups);
                    }}
                    className="accent-acai"
                  />
                  <span className="text-sm font-medium flex-1">{cup.name}</span>
                  <Badge className="bg-acai/15 text-acai border-acai/20 text-xs">{cup.sizeMl}ml</Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={cup.price}
                      onChange={(e) => {
                        const newCups = [...cups];
                        newCups[i].price = Number(e.target.value);
                        setCups(newCups);
                      }}
                      className="w-20 h-8 text-sm text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Gramagens dos complementos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quantos gramas de cada complemento por tamanho de copo. Deixe vazio se não souber — pode ajustar depois.
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
              <span className="font-semibold text-muted-foreground">Complemento</span>
              <span className="font-semibold text-blue-400 w-16 text-center">200ml</span>
              <span className="font-semibold text-amber-400 w-16 text-center">300-400ml</span>
              <span className="font-semibold text-emerald-400 w-16 text-center">500-700ml</span>
              {selectedComplements.map(name => (
                <div key={name} className="contents">
                  <span className="text-sm truncate">{name}</span>
                  <Input
                    value={gramages[name]?.small || ''}
                    onChange={(e) => updateGramage(name, 'small', e.target.value)}
                    placeholder="g"
                    className="w-16 h-7 text-xs text-center"
                  />
                  <Input
                    value={gramages[name]?.medium || ''}
                    onChange={(e) => updateGramage(name, 'medium', e.target.value)}
                    placeholder="g"
                    className="w-16 h-7 text-xs text-center"
                  />
                  <Input
                    value={gramages[name]?.large || ''}
                    onChange={(e) => updateGramage(name, 'large', e.target.value)}
                    placeholder="g"
                    className="w-16 h-7 text-xs text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Tudo pronto!</h2>
            <p className="text-sm text-muted-foreground">
              Vamos criar {selectedComplements.length} complementos, {cups.filter(c => c.enabled).length} tamanhos de copo,
              e as gramagens que você definiu. Você pode ajustar tudo depois pelo dashboard.
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          variant="ghost"
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="bg-acai hover:bg-acai/80 text-white"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? 'Salvando...' : 'Finalizar'}
            <Check className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
