import { pgTable, serial, text, integer, numeric, timestamp, boolean, date, json } from 'drizzle-orm/pg-core';

export const inventoryEntries = pgTable('inventory_entries', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'image' | 'audio' | 'text'
  rawText: text('raw_text'),
  senderPhone: text('sender_phone').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'rejected' | 'expired'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

export const allowedSenders = pgTable('allowed_senders', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull().unique(), // e.g. '5583993698623'
  name: text('name').notNull(),
  lid: text('lid'), // WhatsApp LID (auto-mapped on verification)
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'verified'
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // canonical name e.g. "Polpa de Açaí 10kg"
  aliases: text('aliases'), // comma-separated alternative names for AI matching
  defaultUnit: text('default_unit').notNull().default('un'),
  category: text('category'), // 'insumo' | 'embalagem' | 'complemento' | 'descartavel'
  unitWeightG: numeric('unit_weight_g', { precision: 10, scale: 3 }), // weight in grams per unit (for conversions)
  minStock: numeric('min_stock', { precision: 10, scale: 3 }), // minimum stock threshold
  currentStock: numeric('current_stock', { precision: 10, scale: 3 }).notNull().default('0'),
  costPerUnit: numeric('cost_per_unit', { precision: 10, scale: 2 }), // cost per default unit
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id')
    .notNull()
    .references(() => inventoryEntries.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id),
  productName: text('product_name').notNull(), // original name from AI extraction
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(), // 'kg', 'un', 'L', 'cx', 'pct'
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }),
});

// --- Module 3: Stock Movements ---
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  type: text('type').notNull(), // 'entrada' | 'saida_venda' | 'saida_manual' | 'ajuste' | 'consolidacao'
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  quantityG: numeric('quantity_g', { precision: 10, scale: 3 }), // converted to grams
  referenceType: text('reference_type'), // 'inventory_entry' | 'sale' | 'consolidation' | 'manual'
  referenceId: integer('reference_id'),
  notes: text('notes'),
  createdBy: text('created_by'), // phone or 'system' or 'dashboard'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Module 4: Sold Products & Recipes ---
export const soldProducts = pgTable('sold_products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sizeMl: integer('size_ml'),
  category: text('category'), // 'acai' | 'suco' | 'sorvete' | 'outros'
  price: numeric('price', { precision: 10, scale: 2 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  soldProductId: integer('sold_product_id').notNull().references(() => soldProducts.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantityG: numeric('quantity_g', { precision: 10, scale: 3 }).notNull(),
  isBase: boolean('is_base').notNull().default(false),
  notes: text('notes'),
});

// --- Module 5: Stock Alerts ---
export const stockAlerts = pgTable('stock_alerts', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  alertType: text('alert_type').notNull(), // 'low_stock' | 'out_of_stock'
  currentStock: numeric('current_stock', { precision: 10, scale: 3 }).notNull(),
  minStock: numeric('min_stock', { precision: 10, scale: 3 }),
  status: text('status').notNull().default('active'), // 'active' | 'acknowledged' | 'resolved'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// --- Module 6: Consolidation/Inventory ---
export const stockConsolidations = pgTable('stock_consolidations', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'finalized'
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
});

export const consolidationItems = pgTable('consolidation_items', {
  id: serial('id').primaryKey(),
  consolidationId: integer('consolidation_id').notNull().references(() => stockConsolidations.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  expectedStock: numeric('expected_stock', { precision: 10, scale: 3 }).notNull(),
  actualStock: numeric('actual_stock', { precision: 10, scale: 3 }),
  difference: numeric('difference', { precision: 10, scale: 3 }),
  notes: text('notes'),
});

// --- Module 7: Local Order Storage ---

/** Orders imported from PDV Legal and Cardápio Web */
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(), // "pdv-123" ou "cw-456"
  channel: text('channel').notNull(), // 'pdv' | 'online'
  displayId: text('display_id'),
  datetime: timestamp('datetime', { withTimezone: true }).notNull(),
  date: date('date').notNull(), // for fast date filtering
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status').notNull(), // 'completed' | 'canceled'
  orderType: text('order_type'), // 'balcao' | 'delivery' | 'takeout' | 'onsite'
  salesChannel: text('sales_channel'),
  paymentsJson: json('payments_json'), // [{method, amount}]
  rawData: json('raw_data'), // full original API response
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Items within imported orders */
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull().default('0'),
});

// --- Module 8: Daily Sales Processing ---

/** Gramagens de complementos por tamanho de copo */
export const complementGramages = pgTable('complement_gramages', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  sizeTier: text('size_tier').notNull(), // 'small' (200ml) | 'medium' (300/400ml) | 'large' (500/700ml)
  quantityG: numeric('quantity_g', { precision: 10, scale: 3 }).notNull(),
});

/** Pedidos já processados para baixa de estoque (evita dupla baixa) */
export const processedOrders = pgTable('processed_orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(), // "pdv-123" ou "cw-456"
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  date: date('date').notNull(),
  itemCount: integer('item_count').notNull().default(0),
  status: text('status').notNull().default('ok'), // 'ok' | 'partial' | 'error'
  errors: text('errors'),
});

/** Auditoria das consolidações diárias de vendas */
export const dailyStockRuns = pgTable('daily_stock_runs', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ordersFetched: integer('orders_fetched').notNull().default(0),
  ordersProcessed: integer('orders_processed').notNull().default(0),
  ordersSkipped: integer('orders_skipped').notNull().default(0),
  errors: integer('errors').notNull().default(0),
  status: text('status').notNull().default('running'), // 'running' | 'completed' | 'failed'
  summary: json('summary'),
});

/** Mapeamento de nomes externos → soldProducts */
export const productNameAliases = pgTable('product_name_aliases', {
  id: serial('id').primaryKey(),
  alias: text('alias').notNull().unique(), // nome normalizado
  soldProductId: integer('sold_product_id').notNull().references(() => soldProducts.id),
  source: text('source').notNull().default('auto'), // 'pdv' | 'online' | 'auto' | 'manual'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
