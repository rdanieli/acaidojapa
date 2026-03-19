export interface UnifiedOrder {
  id: string;
  channel: 'pdv' | 'online';
  displayId: string;
  datetime: string; // ISO in Sao Paulo tz
  total: number;
  status: 'completed' | 'canceled';
  orderType: 'balcao' | 'delivery' | 'takeout' | 'onsite';
  salesChannel?: string;
  items: UnifiedItem[];
  payments: UnifiedPayment[];
}

export interface UnifiedItem {
  name: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
}

export interface UnifiedPayment {
  method: string; // Dinheiro, PIX, Debito, Credito, etc.
  amount: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  orderCount: number;
  avgTicket: number;
  canceledCount: number;
  revenueByDay: { date: string; pdv: number; online: number }[];
  revenueByHour: { hour: number; pdv: number; online: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  channelSplit: {
    pdv: { revenue: number; count: number };
    online: { revenue: number; count: number };
  };
}
