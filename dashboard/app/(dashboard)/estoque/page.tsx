'use client';

import { useInventoryEntries, useAlerts } from '@/hooks/use-dashboard';
import { InventoryEntriesTable } from '@/components/stock/inventory-entries-table';
import { ProductsCatalog } from '@/components/stock/products-catalog';
import { AllowedSenders } from '@/components/stock/allowed-senders';
import { WhatsAppConnection } from '@/components/stock/whatsapp-connection';
import { StockMovementsTable } from '@/components/stock/stock-movements-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DailyStockRuns } from '@/components/stock/daily-stock-runs';
import { Package, MessageSquareText, Shield, Smartphone, ShoppingBasket, RefreshCw, AlertTriangle, CalendarClock } from 'lucide-react';

export default function EstoquePage() {
  const { data: entriesData, isLoading: entriesLoading } = useInventoryEntries();
  const { data: alertsData } = useAlerts();

  const activeAlerts = alertsData?.alerts ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="glass-card rounded-xl p-3 border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">
              {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} de estoque
            </p>
            <p className="text-xs text-muted-foreground/60">
              {activeAlerts.map((a: any) => a.productName).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
          <Package className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Estoque</h2>
          <p className="text-xs text-muted-foreground/60">Controle de inventário via WhatsApp</p>
        </div>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">
            <MessageSquareText className="h-3.5 w-3.5" />
            Entradas
          </TabsTrigger>
          <TabsTrigger value="movements">
            <RefreshCw className="h-3.5 w-3.5" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingBasket className="h-3.5 w-3.5" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="senders">
            <Shield className="h-3.5 w-3.5" />
            Autorizados
          </TabsTrigger>
          <TabsTrigger value="daily">
            <CalendarClock className="h-3.5 w-3.5" />
            Consolidação
          </TabsTrigger>
          <TabsTrigger value="connection">
            <Smartphone className="h-3.5 w-3.5" />
            Conexão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <InventoryEntriesTable
            entries={entriesData?.entries ?? []}
            loading={entriesLoading}
          />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovementsTable />
        </TabsContent>

        <TabsContent value="products">
          <ProductsCatalog />
        </TabsContent>

        <TabsContent value="senders">
          <AllowedSenders />
        </TabsContent>

        <TabsContent value="daily">
          <DailyStockRuns />
        </TabsContent>

        <TabsContent value="connection">
          <WhatsAppConnection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
