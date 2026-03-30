'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scan, Camera, Plus, Minus, RotateCcw, Package } from 'lucide-react';
import { useCreateMovement } from '@/hooks/use-dashboard';

type ScannedProduct = {
  id: number;
  name: string;
  currentStock: string;
  defaultUnit: string;
  barcode: string;
};

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [action, setAction] = useState<'entrada' | 'saida_manual'>('saida_manual');
  const [message, setMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const createMovement = useCreateMovement();

  // Start camera and scan
  const startScanning = async () => {
    setScanning(true);
    setProduct(null);
    setMessage('');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current!);
      if (result) {
        await lookupBarcode(result.getText());
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundException') {
        setMessage('Erro ao acessar câmera');
      }
    }
    setScanning(false);
  };

  // Stop camera
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  // Lookup product by barcode
  const lookupBarcode = async (code: string) => {
    try {
      const res = await fetch(`/api/dashboard/barcode?barcode=${code}`);
      if (!res.ok) {
        setMessage(`Produto não encontrado: ${code}`);
        setProduct(null);
        return;
      }
      const data = await res.json();
      setProduct(data.product);
      setMessage('');
    } catch {
      setMessage('Erro ao buscar produto');
    }
  };

  // Manual barcode input
  const handleManualLookup = () => {
    if (manualCode.trim()) {
      lookupBarcode(manualCode.trim());
      setManualCode('');
    }
  };

  // Record stock movement
  const handleMovement = () => {
    if (!product) return;
    const qty = Number(quantity);
    if (qty <= 0) return;

    createMovement.mutate({
      productId: product.id,
      type: action,
      quantity: action === 'saida_manual' ? -qty : qty,
      unit: product.defaultUnit,
      notes: `Bipagem: ${action === 'entrada' ? 'entrada' : 'saída'} via scanner`,
    }, {
      onSuccess: () => {
        setMessage(`Registrado: ${action === 'entrada' ? 'Entrada' : 'Saída'} de ${qty} ${product.defaultUnit} de ${product.name}`);
        setProduct(null);
        setQuantity('1');
      },
      onError: () => {
        setMessage('Erro ao registrar movimentação');
      },
    });
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acai/15">
          <Scan className="h-4 w-4 text-acai" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Scanner</h2>
          <p className="text-xs text-muted-foreground/60">Bipe para entrada ou saída de estoque</p>
        </div>
      </div>

      {/* Camera area */}
      <div className="glass-card rounded-xl overflow-hidden">
        {scanning ? (
          <div className="relative">
            <video ref={videoRef} className="w-full h-64 object-cover bg-black" />
            <Button
              onClick={stopScanning}
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur"
            >
              Parar
            </Button>
          </div>
        ) : (
          <button
            onClick={startScanning}
            className="w-full h-48 flex flex-col items-center justify-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <Camera className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-sm text-muted-foreground/50">Toque para abrir a câmera</span>
          </button>
        )}
      </div>

      {/* Manual input */}
      <div className="flex gap-2">
        <Input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
          placeholder="Digitar código de barras..."
          className="text-sm"
        />
        <Button onClick={handleManualLookup} size="sm" className="bg-acai hover:bg-acai/80 text-white">
          Buscar
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.startsWith('Registrado') ? 'bg-emerald-500/15 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
          {message}
        </div>
      )}

      {/* Product found */}
      {product && (
        <div className="glass-card rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-acai" />
            <div>
              <h3 className="text-sm font-semibold">{product.name}</h3>
              <p className="text-xs text-muted-foreground">
                Estoque: {Number(product.currentStock).toFixed(1)} {product.defaultUnit}
              </p>
            </div>
          </div>

          {/* Action selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setAction('entrada')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                action === 'entrada'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                  : 'bg-muted/30 border-border text-muted-foreground'
              }`}
            >
              <Plus className="h-4 w-4" /> Entrada
            </button>
            <button
              onClick={() => setAction('saida_manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                action === 'saida_manual'
                  ? 'bg-red-500/15 border-red-500/30 text-red-600'
                  : 'bg-muted/30 border-border text-muted-foreground'
              }`}
            >
              <Minus className="h-4 w-4" /> Saída
            </button>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Quantidade:</span>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24 text-center text-sm"
              min="0.1"
              step="0.1"
            />
            <span className="text-xs text-muted-foreground">{product.defaultUnit}</span>
          </div>

          {/* Submit */}
          <Button
            onClick={handleMovement}
            disabled={createMovement.isPending}
            className={`w-full ${action === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white`}
          >
            {createMovement.isPending ? 'Registrando...' : `Registrar ${action === 'entrada' ? 'Entrada' : 'Saída'}`}
          </Button>

          {/* Scan another */}
          <Button onClick={() => { setProduct(null); startScanning(); }} variant="ghost" size="sm" className="w-full text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Bipar outro
          </Button>
        </div>
      )}
    </div>
  );
}
