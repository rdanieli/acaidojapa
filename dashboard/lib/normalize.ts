import type { UnifiedOrder, UnifiedItem, UnifiedPayment, DashboardMetrics } from './types';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  money: 'Dinheiro',
  cash: 'Dinheiro',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  meal_voucher: 'Vale Refeição',
  food_voucher: 'Vale Alimentação',
  online: 'Online',
};

function normalizePaymentMethod(method: string): string {
  return PAYMENT_LABELS[method.toLowerCase()] || method;
}

// ─── PDV Legal Cupom → UnifiedOrder ───

export function normalizePdvCupom(cupom: any): UnifiedOrder {
  const items: UnifiedItem[] = (cupom.itens || [])
    .filter((i: any) => !i.iscancelado)
    .map((i: any) => ({
      name: i.nomeProduto || i.descricao || 'Produto',
      quantity: i.quantidade || 1,
      totalPrice: i.valortotal || 0,
      unitPrice: i.valorunitario || (i.valortotal || 0) / (i.quantidade || 1),
    }));

  const payments: UnifiedPayment[] = (cupom.pagamentos || []).map((p: any) => ({
    method: p.descricao || p.forma || 'Outros',
    amount: p.valor || 0,
  }));

  // If no payment info, create single entry from total
  if (payments.length === 0 && cupom.valortotal) {
    payments.push({ method: 'Não informado', amount: cupom.valortotal });
  }

  return {
    id: `pdv-${cupom.venda_id}`,
    channel: 'pdv',
    displayId: String(cupom.venda_id || cupom.numero || ''),
    datetime: cupom.dtabertura || cupom.data || '',
    total: cupom.valortotal || 0,
    status: cupom.iscancelado ? 'canceled' : 'completed',
    orderType: 'balcao',
    items,
    payments,
  };
}

// ─── Cardapio Web Order → UnifiedOrder ───

function mapOrderType(type: string): UnifiedOrder['orderType'] {
  switch (type?.toLowerCase()) {
    case 'delivery':
      return 'delivery';
    case 'takeout':
      return 'takeout';
    case 'indoor':
    case 'onsite':
      return 'onsite';
    default:
      return 'delivery';
  }
}

export function normalizeCwOrder(order: any): UnifiedOrder {
  const items: UnifiedItem[] = (order.items || []).map((i: any) => ({
    name: i.name || 'Produto',
    quantity: i.quantity || 1,
    totalPrice: i.total_price || 0,
    unitPrice: i.unit_price || (i.total_price || 0) / (i.quantity || 1),
  }));

  const payments: UnifiedPayment[] = (order.payments || []).map((p: any) => ({
    method: normalizePaymentMethod(p.payment_method || p.payment_type || 'Outros'),
    amount: p.total || p.value || 0,
  }));

  return {
    id: `cw-${order.id}`,
    channel: 'online',
    displayId: String(order.display_id || order.id),
    datetime: order.created_at || '',
    total: order.total || 0,
    status: order.status === 'canceled' ? 'canceled' : 'completed',
    orderType: mapOrderType(order.order_type),
    salesChannel: order.sales_channel,
    items,
    payments,
  };
}

// ─── Aggregate into DashboardMetrics ───

export function aggregateMetrics(orders: UnifiedOrder[]): DashboardMetrics {
  const completed = orders.filter((o) => o.status === 'completed');
  const canceled = orders.filter((o) => o.status === 'canceled');

  const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
  const orderCount = completed.length;
  const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Revenue by day
  const dayMap = new Map<string, number>();
  for (const o of completed) {
    const date = o.datetime.split('T')[0];
    if (!date) continue;
    dayMap.set(date, (dayMap.get(date) || 0) + o.total);
  }
  const revenueByDay = Array.from(dayMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Revenue by hour
  const hourMap = new Map<number, number>();
  for (const o of completed) {
    const timePart = o.datetime.split('T')[1];
    if (!timePart) continue;
    const hour = parseInt(timePart.substring(0, 2), 10);
    if (isNaN(hour)) continue;
    hourMap.set(hour, (hourMap.get(hour) || 0) + o.total);
  }
  const revenueByHour = Array.from(hourMap.entries())
    .map(([hour, total]) => ({ hour, total }))
    .sort((a, b) => a.hour - b.hour);

  // Payment breakdown
  const payMap = new Map<string, { amount: number; count: number }>();
  for (const o of completed) {
    for (const p of o.payments) {
      const entry = payMap.get(p.method) || { amount: 0, count: 0 };
      entry.amount += p.amount;
      entry.count += 1;
      payMap.set(p.method, entry);
    }
  }
  const paymentBreakdown = Array.from(payMap.entries())
    .map(([method, vals]) => ({ method, ...vals }))
    .sort((a, b) => b.amount - a.amount);

  // Top products
  const prodMap = new Map<string, { qty: number; revenue: number }>();
  for (const o of completed) {
    for (const item of o.items) {
      const entry = prodMap.get(item.name) || { qty: 0, revenue: 0 };
      entry.qty += item.quantity;
      entry.revenue += item.totalPrice;
      prodMap.set(item.name, entry);
    }
  }
  const topProducts = Array.from(prodMap.entries())
    .map(([name, vals]) => ({ name, ...vals }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    orderCount,
    avgTicket,
    canceledCount: canceled.length,
    revenueByDay,
    revenueByHour,
    paymentBreakdown,
    topProducts,
  };
}
