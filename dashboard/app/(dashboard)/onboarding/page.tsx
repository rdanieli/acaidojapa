'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowRight, ArrowLeft, Check, Package, ShoppingBag, Scale, IceCreamCone, Beef, CakeSlice, Coffee, UtensilsCrossed, CreditCard } from 'lucide-react';
import { useSession } from '@/hooks/use-session';

// Business type presets
const BUSINESS_TYPES = [
  {
    id: 'acaiteria',
    label: 'Açaiteria',
    icon: IceCreamCone,
    ingredients: [
      'Banana', 'Morango', 'Granola', 'Leite condensado', 'Leite Ninho',
      'Nutella', 'Ovomaltine', 'Paçoquinha', 'Amendoim', 'Coco ralado',
      'KitKat', 'Confete', 'Aveia', 'Manga', 'Kiwi', 'Uva', 'Abacaxi',
      'Flocos crocantes', 'Sucrilhos', 'Cookies',
    ],
    menuItems: [
      { name: 'Açaí 200ml', sizeMl: 200, price: 12 },
      { name: 'Açaí 300ml', sizeMl: 300, price: 16 },
      { name: 'Açaí 400ml', sizeMl: 400, price: 20 },
      { name: 'Açaí 500ml', sizeMl: 500, price: 24 },
      { name: 'Açaí 700ml', sizeMl: 700, price: 32 },
    ],
    baseProducts: [
      { name: 'Polpa de Açaí', unit: 'kg', category: 'insumo' },
      { name: 'Copo 200ml', unit: 'un', category: 'embalagem' },
      { name: 'Copo 300ml', unit: 'un', category: 'embalagem' },
      { name: 'Copo 500ml', unit: 'un', category: 'embalagem' },
      { name: 'Tampa', unit: 'un', category: 'embalagem' },
      { name: 'Colher', unit: 'un', category: 'descartavel' },
    ],
    ingredientCategory: 'complemento',
    menuCategory: 'acai',
    hasGramages: true,
  },
  {
    id: 'hamburgueria',
    label: 'Hamburgueria',
    icon: Beef,
    ingredients: [
      'Pão brioche', 'Blend bovino', 'Queijo cheddar', 'Queijo prato',
      'Bacon', 'Alface', 'Tomate', 'Cebola roxa', 'Cebola caramelizada',
      'Picles', 'Molho especial', 'Maionese', 'Ketchup', 'Mostarda',
      'Batata congelada', 'Ovo', 'Catupiry',
    ],
    menuItems: [
      { name: 'Smash Simples', sizeMl: null, price: 22 },
      { name: 'Smash Duplo', sizeMl: null, price: 28 },
      { name: 'Bacon Burger', sizeMl: null, price: 30 },
      { name: 'Fritas P', sizeMl: null, price: 12 },
      { name: 'Fritas G', sizeMl: null, price: 18 },
    ],
    baseProducts: [
      { name: 'Embalagem hambúrguer', unit: 'un', category: 'embalagem' },
      { name: 'Caixa fritas', unit: 'un', category: 'embalagem' },
      { name: 'Guardanapo', unit: 'un', category: 'descartavel' },
      { name: 'Óleo de fritura', unit: 'L', category: 'insumo' },
    ],
    ingredientCategory: 'insumo',
    menuCategory: 'outros',
    hasGramages: false,
  },
  {
    id: 'padaria',
    label: 'Padaria / Confeitaria',
    icon: CakeSlice,
    ingredients: [
      'Farinha de trigo', 'Açúcar', 'Fermento', 'Manteiga', 'Ovos',
      'Leite', 'Sal', 'Chocolate em pó', 'Creme de leite', 'Leite condensado',
      'Polvilho', 'Queijo minas', 'Presunto', 'Óleo',
    ],
    menuItems: [
      { name: 'Pão francês', sizeMl: null, price: 1 },
      { name: 'Pão de queijo', sizeMl: null, price: 4 },
      { name: 'Bolo de chocolate (fatia)', sizeMl: null, price: 8 },
      { name: 'Croissant', sizeMl: null, price: 7 },
      { name: 'Café expresso', sizeMl: null, price: 5 },
    ],
    baseProducts: [
      { name: 'Saco de papel', unit: 'un', category: 'embalagem' },
      { name: 'Caixa de bolo', unit: 'un', category: 'embalagem' },
      { name: 'Copo descartável', unit: 'un', category: 'descartavel' },
    ],
    ingredientCategory: 'insumo',
    menuCategory: 'outros',
    hasGramages: false,
  },
  {
    id: 'cafeteria',
    label: 'Cafeteria',
    icon: Coffee,
    ingredients: [
      'Café em grão', 'Leite integral', 'Leite vegetal', 'Chocolate em pó',
      'Chantilly', 'Canela', 'Açúcar', 'Adoçante', 'Xarope de caramelo',
      'Xarope de baunilha', 'Chá verde', 'Chá preto',
    ],
    menuItems: [
      { name: 'Espresso', sizeMl: null, price: 6 },
      { name: 'Cappuccino', sizeMl: null, price: 10 },
      { name: 'Latte', sizeMl: null, price: 12 },
      { name: 'Mocha', sizeMl: null, price: 14 },
      { name: 'Chá', sizeMl: null, price: 7 },
    ],
    baseProducts: [
      { name: 'Copo 200ml', unit: 'un', category: 'embalagem' },
      { name: 'Copo 400ml', unit: 'un', category: 'embalagem' },
      { name: 'Tampa copo', unit: 'un', category: 'embalagem' },
      { name: 'Mexedor', unit: 'un', category: 'descartavel' },
    ],
    ingredientCategory: 'insumo',
    menuCategory: 'outros',
    hasGramages: false,
  },
  {
    id: 'outro',
    label: 'Outro',
    icon: UtensilsCrossed,
    ingredients: [],
    menuItems: [],
    baseProducts: [],
    ingredientCategory: 'insumo',
    menuCategory: 'outros',
    hasGramages: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessionData } = useSession();
  // Tenants that signed up via Stripe Checkout already have a subscription
  // and a card on file at Stripe — skip the Asaas tokenization step entirely.
  const billingHandledByStripe = !!sessionData?.session?.tenant?.hasStripeSubscription;
  // Note: password setup is now handled by /define-senha standalone — the
  // dashboard layout redirects users with passwordIsTemporary=true there
  // before this page ever renders for them.
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0: Business type
  const [businessType, setBusinessType] = useState<string | null>(null);
  const preset = BUSINESS_TYPES.find(b => b.id === businessType);

  // Step 1: Ingredients
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState('');

  // Step 2: Menu items
  const [menuItems, setMenuItems] = useState<{ name: string; sizeMl: number | null; price: number; enabled: boolean }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Step 3: Gramages (only for açaiteria)
  const [gramages, setGramages] = useState<Record<string, { small: string; medium: string; large: string }>>({});

  // Card step
  const [cardForm, setCardForm] = useState({
    holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '',
    cpfCnpj: '', postalCode: '', phone: '', addressNumber: '',
  });
  const [cardSaved, setCardSaved] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const selectBusinessType = (id: string) => {
    const p = BUSINESS_TYPES.find(b => b.id === id)!;
    setBusinessType(id);
    setSelectedIngredients(p.ingredients.slice(0, Math.min(p.ingredients.length, 12)));
    setMenuItems(p.menuItems.map(m => ({ ...m, enabled: true })));
  };

  const toggleIngredient = (name: string) => {
    setSelectedIngredients(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addCustomIngredient = () => {
    if (customIngredient.trim() && !selectedIngredients.includes(customIngredient.trim())) {
      setSelectedIngredients([...selectedIngredients, customIngredient.trim()]);
      setCustomIngredient('');
    }
  };

  const addMenuItem = () => {
    if (!newItemName.trim()) return;
    setMenuItems([...menuItems, { name: newItemName.trim(), sizeMl: null, price: Number(newItemPrice) || 0, enabled: true }]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const updateGramage = (name: string, tier: string, value: string) => {
    setGramages(prev => ({
      ...prev,
      [name]: { ...prev[name], [tier]: value },
    }));
  };

  const handleSaveCard = async () => {
    setCardError('');
    setCardLoading(true);
    try {
      const res = await fetch('/api/billing/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: {
            holderName: cardForm.holderName,
            number: cardForm.number,
            expiryMonth: cardForm.expiryMonth,
            expiryYear: cardForm.expiryYear,
            ccv: cardForm.ccv,
          },
          holderInfo: {
            name: cardForm.holderName,
            cpfCnpj: cardForm.cpfCnpj,
            postalCode: cardForm.postalCode,
            addressNumber: cardForm.addressNumber || '0',
            phone: cardForm.phone,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar cartão');
      }
      setCardSaved(true);
    } catch (err: any) {
      setCardError(err.message);
    } finally {
      setCardLoading(false);
    }
  };

  // Step layout: business → ingredients → menu → [gramages] → [card] → confirm
  // The card step is dropped entirely when billing is already covered by Stripe;
  // gramages only show for açaí. We compute totalSteps to match what's actually rendered.
  const baseStepsBeforeCard = preset?.hasGramages ? 4 : 3; // business + ingredients + menu (+ gramages)
  const cardStep = billingHandledByStripe ? -1 : baseStepsBeforeCard; // -1 = no card step
  const totalSteps = billingHandledByStripe ? baseStepsBeforeCard : baseStepsBeforeCard + 1;
  const confirmStep = totalSteps - 1;

  const handleFinish = async () => {
    setLoading(true);
    try {
      const productList = [
        ...(preset?.baseProducts || []),
        ...selectedIngredients.map(name => ({ name, unit: 'g', category: preset?.ingredientCategory || 'insumo' })),
      ];

      const soldProductsList = menuItems.filter(m => m.enabled).map(m => ({
        name: m.name,
        sizeMl: m.sizeMl,
        category: preset?.menuCategory || 'outros',
        price: m.price,
      }));

      const gramagesList = preset?.hasGramages
        ? selectedIngredients.map(name => ({
            productName: name,
            small: gramages[name]?.small ? Number(gramages[name].small) : 0,
            medium: gramages[name]?.medium ? Number(gramages[name].medium) : 0,
            large: gramages[name]?.large ? Number(gramages[name].large) : 0,
          })).filter(g => g.small || g.medium || g.large)
        : [];

      const res = await fetch('/api/dashboard/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productList, soldProductsList, gramages: gramagesList }),
      });

      if (!res.ok) throw new Error('Failed');
      // Invalidate session cache so layout sees onboardingCompleted=true
      await qc.invalidateQueries({ queryKey: ['session'] });
      router.push('/');
      router.refresh();
    } catch {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-acai shadow-lg">
            <Store className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Configurar seu negócio</h1>
        <p className="text-sm text-muted-foreground">Vamos configurar os produtos e o cardápio do seu estabelecimento</p>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalSteps + 1 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              i <= step ? 'bg-acai text-white' : 'bg-muted text-muted-foreground/40'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < totalSteps && (
              <div className={`h-0.5 w-8 transition-all ${i < step ? 'bg-acai' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card rounded-xl p-6">
        {/* Step 0: Business type */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Qual o tipo do seu negócio?</h2>
              <p className="text-sm text-muted-foreground mt-1">Vamos sugerir produtos e configurações baseados no seu segmento.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map(bt => {
                const Icon = bt.icon;
                const selected = businessType === bt.id;
                return (
                  <button
                    key={bt.id}
                    onClick={() => selectBusinessType(bt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      selected
                        ? 'bg-acai/15 border-acai/30 text-acai'
                        : 'bg-muted/30 border-border text-muted-foreground hover:border-acai/20'
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                    <span className="text-sm font-medium">{bt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Ingredients */}
        {step === 1 && preset && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Quais insumos você usa?</h2>
              <p className="text-sm text-muted-foreground mt-1">Selecione os que usa e adicione outros. Pode ajustar depois.</p>
            </div>
            {preset.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {preset.ingredients.map(name => (
                  <button
                    key={name}
                    onClick={() => toggleIngredient(name)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedIngredients.includes(name)
                        ? 'bg-acai/15 border-acai/30 text-acai font-medium'
                        : 'bg-muted/50 border-border text-muted-foreground/60 hover:border-acai/20'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={customIngredient}
                onChange={(e) => setCustomIngredient(e.target.value)}
                placeholder="Adicionar outro insumo..."
                onKeyDown={(e) => e.key === 'Enter' && addCustomIngredient()}
                className="text-sm"
              />
              <Button onClick={addCustomIngredient} size="sm" variant="ghost" className="text-acai">
                Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/40">{selectedIngredients.length} selecionados</p>
          </div>
        )}

        {/* Step 2: Menu items */}
        {step === 2 && preset && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Seus produtos vendidos</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure o cardápio com os itens que você vende e seus preços.</p>
            </div>
            <div className="space-y-3">
              {menuItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => {
                      const newItems = [...menuItems];
                      newItems[i].enabled = e.target.checked;
                      setMenuItems(newItems);
                    }}
                    className="accent-acai"
                  />
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  {item.sizeMl && <Badge className="bg-acai/15 text-acai border-acai/20 text-xs">{item.sizeMl}ml</Badge>}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...menuItems];
                        newItems[i].price = Number(e.target.value);
                        setMenuItems(newItems);
                      }}
                      className="w-20 h-8 text-sm text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nome do produto..."
                className="text-sm flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addMenuItem()}
              />
              <Input
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="R$"
                type="number"
                className="text-sm w-20"
              />
              <Button onClick={addMenuItem} size="sm" variant="ghost" className="text-acai">
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Gramages (only for açaiteria) */}
        {step === 3 && preset?.hasGramages && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Gramagens por tamanho</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quantos gramas de cada complemento por tamanho. Deixe vazio se não souber — pode ajustar depois.
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
              <span className="font-semibold text-muted-foreground">Insumo</span>
              <span className="font-semibold text-blue-400 w-16 text-center">Pequeno</span>
              <span className="font-semibold text-amber-400 w-16 text-center">Médio</span>
              <span className="font-semibold text-emerald-400 w-16 text-center">Grande</span>
              {selectedIngredients.map(name => (
                <div key={name} className="contents">
                  <span className="text-sm truncate">{name}</span>
                  <Input value={gramages[name]?.small || ''} onChange={(e) => updateGramage(name, 'small', e.target.value)} placeholder="g" className="w-16 h-7 text-xs text-center" />
                  <Input value={gramages[name]?.medium || ''} onChange={(e) => updateGramage(name, 'medium', e.target.value)} placeholder="g" className="w-16 h-7 text-xs text-center" />
                  <Input value={gramages[name]?.large || ''} onChange={(e) => updateGramage(name, 'large', e.target.value)} placeholder="g" className="w-16 h-7 text-xs text-center" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card step */}
        {step === cardStep && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Método de pagamento</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre seu cartão de crédito. Nenhuma cobrança será feita agora — você começa no plano gratuito.
              </p>
            </div>

            {cardSaved ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                    <Check className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-400">Cartão salvo com sucesso!</p>
                <p className="text-xs text-muted-foreground mt-1">Nenhuma cobrança foi realizada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Nome no cartão</label>
                    <Input value={cardForm.holderName} onChange={e => setCardForm({...cardForm, holderName: e.target.value})} placeholder="JOÃO DA SILVA" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Número do cartão</label>
                    <Input value={cardForm.number} onChange={e => setCardForm({...cardForm, number: e.target.value})} placeholder="0000 0000 0000 0000" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Validade</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={cardForm.expiryMonth} onChange={e => setCardForm({...cardForm, expiryMonth: e.target.value})} placeholder="MM" className="w-16 text-center" maxLength={2} />
                      <span className="self-center text-muted-foreground">/</span>
                      <Input value={cardForm.expiryYear} onChange={e => setCardForm({...cardForm, expiryYear: e.target.value})} placeholder="AAAA" className="w-20 text-center" maxLength={4} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">CVV</label>
                    <Input value={cardForm.ccv} onChange={e => setCardForm({...cardForm, ccv: e.target.value})} placeholder="123" className="mt-1 w-20" maxLength={4} type="password" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">CPF/CNPJ do titular</label>
                    <Input value={cardForm.cpfCnpj} onChange={e => setCardForm({...cardForm, cpfCnpj: e.target.value})} placeholder="000.000.000-00" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">CEP</label>
                    <Input value={cardForm.postalCode} onChange={e => setCardForm({...cardForm, postalCode: e.target.value})} placeholder="00000-000" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Telefone</label>
                    <Input value={cardForm.phone} onChange={e => setCardForm({...cardForm, phone: e.target.value})} placeholder="(00) 00000-0000" className="mt-1" />
                  </div>
                </div>

                {cardError && <p className="text-sm text-red-400">{cardError}</p>}

                <Button onClick={handleSaveCard} disabled={cardLoading || !cardForm.number || !cardForm.holderName || !cardForm.cpfCnpj} className="w-full bg-acai hover:bg-acai/80 text-white">
                  {cardLoading ? 'Salvando...' : 'Salvar cartão'}
                </Button>

                <p className="text-[10px] text-muted-foreground/40 text-center">
                  Seus dados são processados de forma segura pelo Asaas. Nenhuma cobrança será feita agora.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm step */}
        {step === confirmStep + 1 && (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Tudo pronto!</h2>
            <p className="text-sm text-muted-foreground">
              Vamos criar {selectedIngredients.length} insumos, {menuItems.filter(m => m.enabled).length} produtos do cardápio
              {preset?.hasGramages ? ', e as gramagens que você definiu' : ''}.
              Você pode ajustar tudo depois pelo dashboard.
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
        {step <= confirmStep ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={(step === 0 && !businessType) || (step === cardStep && !cardSaved)}
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
