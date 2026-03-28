'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateISO } from '@/lib/format';
import type { DashboardMetrics } from '@/lib/types';
import type { UnifiedOrder } from '@/lib/types';
import type { Channel } from '@/components/channel-toggle';

function buildParams(start: Date, end: Date, channel: Channel) {
  const params = new URLSearchParams({
    start: formatDateISO(start),
    end: formatDateISO(end),
  });
  if (channel !== 'all') params.set('channel', channel);
  return params.toString();
}

export function useMetrics(start: Date, end: Date, channel: Channel) {
  return useQuery<DashboardMetrics>({
    queryKey: ['metrics', formatDateISO(start), formatDateISO(end), channel],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/metrics?${buildParams(start, end, channel)}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
  });
}

export function useOrders(start: Date, end: Date, channel: Channel) {
  return useQuery<{ orders: UnifiedOrder[] }>({
    queryKey: ['orders', formatDateISO(start), formatDateISO(end), channel],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/orders?${buildParams(start, end, channel)}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });
}

export function useProducts(start: Date, end: Date, channel: Channel) {
  return useQuery<{ products: any[] }>({
    queryKey: ['products', formatDateISO(start), formatDateISO(end), channel],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/products?${buildParams(start, end, channel)}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}

export function useStock() {
  return useQuery<{ items: any[] }>({
    queryKey: ['stock'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stock');
      if (!res.ok) throw new Error('Failed to fetch stock');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllowedSenders() {
  return useQuery<{ senders: any[] }>({
    queryKey: ['allowed-senders'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/senders');
      if (!res.ok) throw new Error('Failed to fetch senders');
      return res.json();
    },
  });
}

export function useAddSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { phone: string; name: string }) => {
      const res = await fetch('/api/dashboard/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add sender');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-senders'] }),
  });
}

export function useRemoveSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/senders?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove sender');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-senders'] }),
  });
}

export function useProductsCatalog() {
  return useQuery<{ products: any[] }>({
    queryKey: ['products-catalog'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/products-catalog');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; name?: string; aliases?: string; defaultUnit?: string; active?: boolean; category?: string | null; unitWeightG?: number | null; minStock?: number | null; costPerUnit?: number | null }) => {
      const res = await fetch('/api/dashboard/products-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-catalog'] }),
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; aliases?: string; defaultUnit?: string; category?: string; unitWeightG?: number; minStock?: number; costPerUnit?: number }) => {
      const res = await fetch('/api/dashboard/products-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add product');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-catalog'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/products-catalog?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-catalog'] }),
  });
}

export function useInventoryEntries(status?: string) {
  const params = status ? `?status=${status}` : '';
  return useQuery<{ entries: any[] }>({
    queryKey: ['inventory-entries', status],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/inventory${params}`);
      if (!res.ok) throw new Error('Failed to fetch inventory entries');
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

// --- Inventory Entry Actions ---
export function useConfirmEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'confirm' }),
      });
      if (!res.ok) throw new Error('Failed to confirm entry');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-entries'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });
}

export function useRejectEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject' }),
      });
      if (!res.ok) throw new Error('Failed to reject entry');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-entries'] });
    },
  });
}

// --- Merge Products ---
export function useMergeProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sourceId: number; targetId: number }) => {
      const res = await fetch('/api/dashboard/products-catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to merge products');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-catalog'] }),
  });
}

// --- Stock Movements ---
export function useStockMovements(filters?: { productId?: number; type?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.productId) params.set('productId', String(filters.productId));
  if (filters?.type) params.set('type', filters.type);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return useQuery<{ movements: any[] }>({
    queryKey: ['stock-movements', filters],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stock-movements${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch stock movements');
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number; type: string; quantity: number; unit: string; notes?: string }) => {
      const res = await fetch('/api/dashboard/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create movement');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeductSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { soldProductId: number; quantity: number; complementIds?: number[] }) => {
      const res = await fetch('/api/dashboard/stock/deduct-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to deduct sale');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeductBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { productId: number; quantity: number; unit: string }[]) => {
      const res = await fetch('/api/dashboard/stock/deduct-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to deduct batch');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// --- Sold Products & Recipes ---
export function useSoldProducts() {
  return useQuery<{ soldProducts: any[] }>({
    queryKey: ['sold-products'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/sold-products');
      if (!res.ok) throw new Error('Failed to fetch sold products');
      return res.json();
    },
  });
}

export function useAddSoldProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; sizeMl?: number; category?: string; price?: number }) => {
      const res = await fetch('/api/dashboard/sold-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add sold product');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sold-products'] }),
  });
}

export function useUpdateSoldProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; name?: string; sizeMl?: number; category?: string; price?: number; active?: boolean }) => {
      const res = await fetch('/api/dashboard/sold-products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update sold product');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sold-products'] }),
  });
}

export function useDeleteSoldProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/sold-products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete sold product');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sold-products'] }),
  });
}

export function useRecipe(soldProductId: number | null) {
  return useQuery<{ recipe: any[] }>({
    queryKey: ['recipe', soldProductId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/recipes?soldProductId=${soldProductId}`);
      if (!res.ok) throw new Error('Failed to fetch recipe');
      return res.json();
    },
    enabled: !!soldProductId,
  });
}

export function useRecipesList() {
  return useQuery<{ soldProducts: any[] }>({
    queryKey: ['recipes-list'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/recipes');
      if (!res.ok) throw new Error('Failed to fetch recipes list');
      return res.json();
    },
  });
}

export function useSaveRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { soldProductId: number; items: { productId: number; quantityG: number; isBase: boolean; notes?: string }[] }) => {
      const res = await fetch('/api/dashboard/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save recipe');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recipe', vars.soldProductId] });
      qc.invalidateQueries({ queryKey: ['recipes-list'] });
    },
  });
}

// --- Alerts ---
export function useAlerts() {
  return useQuery<{ alerts: any[] }>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const res = await fetch('/api/dashboard/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update alert');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

// --- Consolidations ---
export function useConsolidations() {
  return useQuery<{ consolidations: any[] }>({
    queryKey: ['consolidations'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/consolidations');
      if (!res.ok) throw new Error('Failed to fetch consolidations');
      return res.json();
    },
  });
}

export function useConsolidation(id: number | null) {
  return useQuery<{ consolidation: any; items: any[] }>({
    queryKey: ['consolidation', id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/consolidations?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch consolidation');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useStartConsolidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { notes?: string }) => {
      const res = await fetch('/api/dashboard/consolidations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok) throw new Error('Failed to start consolidation');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consolidations'] }),
  });
}

export function useUpdateConsolidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; items: { id: number; actualStock: number; notes?: string }[] }) => {
      const res = await fetch(`/api/dashboard/consolidations/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data.items }),
      });
      if (!res.ok) throw new Error('Failed to update consolidation');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['consolidation', vars.id] });
      qc.invalidateQueries({ queryKey: ['consolidations'] });
    },
  });
}

export function useFinalizeConsolidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/consolidations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize' }),
      });
      if (!res.ok) throw new Error('Failed to finalize consolidation');
      return res.json();
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['consolidation', id] });
      qc.invalidateQueries({ queryKey: ['consolidations'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// --- Order Sync ---
export function useSyncOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { start?: string; end?: string }) => {
      const res = await fetch('/api/dashboard/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok) throw new Error('Failed to sync orders');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useLastSyncDate() {
  return useQuery<{ lastSyncDate: string | null }>({
    queryKey: ['last-sync-date'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/orders/sync');
      if (!res.ok) throw new Error('Failed to fetch sync status');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

// --- Daily Stock Runs ---
export function useDailyStockRuns(limit = 30) {
  return useQuery<{ runs: any[] }>({
    queryKey: ['daily-stock-runs', limit],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stock/process-daily-sales?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch daily stock runs');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useTriggerDailyRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date?: string) => {
      const res = await fetch('/api/dashboard/stock/process-daily-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to trigger daily run');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-stock-runs'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useProductNameAliases() {
  return useQuery<{ aliases: any[] }>({
    queryKey: ['product-aliases'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/product-aliases');
      if (!res.ok) throw new Error('Failed to fetch product aliases');
      return res.json();
    },
  });
}

export function useCreateAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { alias: string; soldProductId: number }) => {
      const res = await fetch('/api/dashboard/product-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create alias');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-aliases'] }),
  });
}

export function useDeleteAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/product-aliases?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete alias');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-aliases'] }),
  });
}

// --- Financial Dashboard ---
export function useFinancial(start: Date, end: Date, channel: Channel) {
  return useQuery<{
    revenue: number;
    cmv: number;
    grossProfit: number;
    marginPercent: number;
    dailyTrend: { date: string; revenue: number; cmv: number; profit: number }[];
    productMargins: {
      soldProductId: number;
      name: string;
      qtySold: number;
      revenue: number;
      cmv: number;
      profit: number;
      marginPercent: number;
      hasRecipe: boolean;
    }[];
    unmappedItems: number;
    unmappedNames: { name: string; count: number }[];
  }>({
    queryKey: ['financial', formatDateISO(start), formatDateISO(end), channel],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/financial?${buildParams(start, end, channel)}`);
      if (!res.ok) throw new Error('Failed to fetch financial data');
      return res.json();
    },
  });
}

export function usePurchases(start: Date, end: Date) {
  return useQuery<{
    totalSpent: number;
    entryCount: number;
    avgPerEntry: number;
    byCategory: { category: string; label: string; amount: number }[];
    dailySpending: { date: string; amount: number }[];
    productDetails: {
      name: string;
      category: string;
      qtyPurchased: number;
      unit: string;
      totalSpent: number;
      costPerUnit: number;
    }[];
  }>({
    queryKey: ['purchases', formatDateISO(start), formatDateISO(end)],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: formatDateISO(start),
        end: formatDateISO(end),
      });
      const res = await fetch(`/api/dashboard/purchases?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch purchases data');
      return res.json();
    },
  });
}

// --- Complement Gramages ---
export function useComplementGramages(productId: number | null) {
  return useQuery<{ gramages: any[] }>({
    queryKey: ['complement-gramages', productId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/complement-gramages?productId=${productId}`);
      if (!res.ok) throw new Error('Failed to fetch gramages');
      return res.json();
    },
    enabled: !!productId,
  });
}

export function useUpdateComplementGramages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number; gramages: { sizeTier: string; quantityG: number }[] }) => {
      const res = await fetch('/api/dashboard/complement-gramages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update gramages');
      return res.json();
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['complement-gramages', vars.productId] }),
  });
}

// --- Shopping List ---
export function useShoppingList() {
  return useQuery<{ suggestions: any[] }>({
    queryKey: ['shopping-list'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stock/shopping-list');
      if (!res.ok) throw new Error('Failed to fetch shopping list');
      return res.json();
    },
    enabled: false, // manual fetch only
  });
}

export function useSendShoppingList() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/stock/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to send shopping list');
      return res.json();
    },
  });
}

// --- Users ---
export function useUsers() {
  return useQuery<{ users: any[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role?: string; phone?: string }) => {
      const res = await fetch('/api/dashboard/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; role?: string; active?: boolean; name?: string; phone?: string }) => {
      const res = await fetch('/api/dashboard/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// --- Waste ---
export function useWasteEntries(filters?: { startDate?: string; endDate?: string; productId?: number }) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.productId) params.set('productId', String(filters.productId));
  const qs = params.toString();
  return useQuery<{ entries: any[]; totalQuantity: number }>({
    queryKey: ['waste-entries', filters],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/waste${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch waste entries');
      return res.json();
    },
  });
}

export function useRecordWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number; quantity: number; unit: string; reason: string; notes?: string; date: string }) => {
      const res = await fetch('/api/dashboard/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to record waste');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-entries'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });
}

// --- Checklists ---
export function useChecklists(date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  return useQuery<{ templates: any[]; runs: any[] }>({
    queryKey: ['checklists', d],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/checklists?date=${d}`);
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    },
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: string; name?: string; items?: string[]; templateId?: number; date?: string; assignedTo?: number }) => {
      const res = await fetch('/api/dashboard/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create checklist');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists'] }),
  });
}

export function useUpdateChecklistRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; items?: any[]; status?: string }) => {
      const res = await fetch('/api/dashboard/checklists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update checklist');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists'] }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/checklists?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete checklist');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists'] }),
  });
}

// --- Manual Sales ---
export function useManualSales(filters?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return useQuery<{ sales: any[] }>({
    queryKey: ['manual-sales', filters],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/manual-sales${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch manual sales');
      return res.json();
    },
  });
}

export function useRecordManualSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; items: any[]; paymentMethod?: string; notes?: string }) => {
      const res = await fetch('/api/dashboard/manual-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to record sale');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manual-sales'] });
      qc.invalidateQueries({ queryKey: ['products-catalog'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      qc.invalidateQueries({ queryKey: ['financial'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

// --- Tenant Settings ---
export function useTenantSettings() {
  return useQuery<{ tenant: any; settings: any }>({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] });
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

// --- Suppliers ---
export function useSuppliers() {
  return useQuery<{ suppliers: any[] }>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      return res.json();
    },
  });
}

export function useAddSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; phone?: string; email?: string; notes?: string }) => {
      const res = await fetch('/api/dashboard/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add supplier');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; name?: string; phone?: string; email?: string; notes?: string; active?: boolean }) => {
      const res = await fetch('/api/dashboard/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update supplier');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/suppliers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

// --- Stock Summary (Dashboard Widget) ---
export function useStockSummary() {
  return useQuery<{ totalProducts: number; lowStock: number; outOfStock: number; criticalProducts: any[] }>({
    queryKey: ['stock-summary'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stock-summary');
      if (!res.ok) throw new Error('Failed to fetch stock summary');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}
