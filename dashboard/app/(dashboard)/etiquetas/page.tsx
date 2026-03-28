'use client';

import { useState } from 'react';
import { useProductsCatalog } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Printer } from 'lucide-react';

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    .label-print-area, .label-print-area * { visibility: visible; }
    .label-print-area { position: absolute; left: 0; top: 0; }
    .label-item {
      width: 50mm; height: 30mm;
      border: 1px solid #000;
      padding: 2mm;
      page-break-inside: avoid;
      margin-bottom: 2mm;
      font-family: Arial, sans-serif;
    }
    .label-item .product-name { font-size: 10pt; font-weight: bold; }
    .label-item .label-info { font-size: 8pt; }
  }
`;

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function EtiquetasPage() {
  const { data: catalogData } = useProductsCatalog();
  const products = (catalogData?.products ?? []).filter((p: any) => p.active);

  const today = new Date().toISOString().split('T')[0];

  const [selectedProductId, setSelectedProductId] = useState('');
  const [labelType, setLabelType] = useState<'validade' | 'identificacao'>('validade');
  const [fabricationDate, setFabricationDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState('');
  const [lote, setLote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const selectedProduct = products.find((p: any) => String(p.id) === selectedProductId);

  const handlePrint = () => {
    window.print();
  };

  const labels = Array.from({ length: quantity }, (_, i) => i);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-acai" />
            <h1 className="text-2xl font-bold">Etiquetas</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Impressao de etiquetas de validade e identificacao
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Configuracao
            </h2>

            {/* Product selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Produto</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione um produto...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Label type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de etiqueta</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="labelType"
                    checked={labelType === 'validade'}
                    onChange={() => setLabelType('validade')}
                    className="accent-[hsl(var(--acai))]"
                  />
                  <Badge variant={labelType === 'validade' ? 'default' : 'outline'} className={labelType === 'validade' ? 'bg-acai text-white' : ''}>
                    Validade
                  </Badge>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="labelType"
                    checked={labelType === 'identificacao'}
                    onChange={() => setLabelType('identificacao')}
                    className="accent-[hsl(var(--acai))]"
                  />
                  <Badge variant={labelType === 'identificacao' ? 'default' : 'outline'} className={labelType === 'identificacao' ? 'bg-acai text-white' : ''}>
                    Identificacao
                  </Badge>
                </label>
              </div>
            </div>

            {/* Validade fields */}
            {labelType === 'validade' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data de fabricacao</label>
                  <Input
                    type="date"
                    value={fabricationDate}
                    onChange={(e) => setFabricationDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data de validade</label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Lote</label>
                  <Input
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    placeholder="Ex: L2024-001"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Identificacao fields */}
            {labelType === 'identificacao' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Input
                  type="date"
                  value={fabricationDate}
                  onChange={(e) => setFabricationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-24"
              />
            </div>

            {/* Print button */}
            <Button
              onClick={handlePrint}
              disabled={!selectedProductId}
              className="w-full bg-acai hover:bg-acai/80 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir {quantity} etiqueta{quantity > 1 ? 's' : ''}
            </Button>
          </div>

          {/* Preview area */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pre-visualizacao
            </h2>

            {!selectedProductId ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Selecione um produto para visualizar a etiqueta
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* Single preview label */}
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 w-[200px] min-h-[120px] flex flex-col justify-center">
                  <p className="font-bold text-sm leading-tight">
                    {selectedProduct?.name ?? '—'}
                  </p>
                  {labelType === 'validade' ? (
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      <p>Fab: {formatDate(fabricationDate)}</p>
                      <p>Val: {formatDate(expiryDate)}</p>
                      {lote && <p>Lote: {lote}</p>}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Data: {formatDate(fabricationDate)}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {quantity} etiqueta{quantity > 1 ? 's' : ''} sera{quantity > 1 ? 'o' : ''} impressa{quantity > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hidden print area */}
        <div className="label-print-area">
          {selectedProduct && labels.map((i) => (
            <div key={i} className="label-item">
              <div className="product-name">{selectedProduct.name}</div>
              {labelType === 'validade' ? (
                <div className="label-info">
                  <div>Fab: {formatDate(fabricationDate)}</div>
                  <div>Val: {formatDate(expiryDate)}</div>
                  {lote && <div>Lote: {lote}</div>}
                </div>
              ) : (
                <div className="label-info">
                  <div>Data: {formatDate(fabricationDate)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
