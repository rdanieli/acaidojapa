import { pgTable, serial, text, integer, numeric, timestamp, boolean, date, json } from 'drizzle-orm/pg-core';

/** Multi-tenant: each business is a tenant */
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('free'), // 'free' | 'starter' | 'pro'
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Users with role-based access */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('employee'), // 'owner' | 'manager' | 'employee'
  phone: text('phone'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryEntries = pgTable('inventory_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  source: text('source').notNull(), // 'image' | 'audio' | 'text'
  rawText: text('raw_text'),
  senderPhone: text('sender_phone').notNull(),
  supplierId: integer('supplier_id'), // references suppliers.id (table defined later)
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'rejected' | 'expired'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

export const allowedSenders = pgTable('allowed_senders', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  phone: text('phone').notNull().unique(), // e.g. '5583993698623'
  name: text('name').notNull(),
  lid: text('lid'), // WhatsApp LID (auto-mapped on verification)
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'verified'
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  sizeMl: integer('size_ml'),
  category: text('category'), // 'acai' | 'suco' | 'sorvete' | 'outros'
  price: numeric('price', { precision: 10, scale: 2 }),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  soldProductId: integer('sold_product_id').notNull().references(() => soldProducts.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantityG: numeric('quantity_g', { precision: 10, scale: 3 }).notNull(),
  isBase: boolean('is_base').notNull().default(false),
  notes: text('notes'),
});

// --- Module 5: Stock Alerts ---
export const stockAlerts = pgTable('stock_alerts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  date: date('date').notNull(),
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'finalized'
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
});

export const consolidationItems = pgTable('consolidation_items', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  productId: integer('product_id').notNull().references(() => products.id),
  sizeTier: text('size_tier').notNull(), // 'small' (200ml) | 'medium' (300/400ml) | 'large' (500/700ml)
  quantityG: numeric('quantity_g', { precision: 10, scale: 3 }).notNull(),
});

/** Pedidos já processados para baixa de estoque (evita dupla baixa) */
export const processedOrders = pgTable('processed_orders', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
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
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  alias: text('alias').notNull().unique(), // nome normalizado
  soldProductId: integer('sold_product_id').notNull().references(() => soldProducts.id),
  source: text('source').notNull().default('auto'), // 'pdv' | 'online' | 'auto' | 'manual'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Waste/loss tracking */
export const wasteEntries = pgTable('waste_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  reason: text('reason').notNull(), // 'vencido' | 'estragado' | 'quebra' | 'preparo' | 'outro'
  notes: text('notes'),
  recordedBy: integer('recorded_by').references(() => users.id),
  date: date('date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Checklist templates (reusable) */
export const checklistTemplates = pgTable('checklist_templates', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  items: json('items').notNull(), // [{label: string, order: number}]
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Daily checklist instances */
export const checklistRuns = pgTable('checklist_runs', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  templateId: integer('template_id').notNull().references(() => checklistTemplates.id),
  date: date('date').notNull(),
  assignedTo: integer('assigned_to').references(() => users.id),
  completedBy: integer('completed_by').references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed'
  items: json('items').notNull(), // [{label, order, checked, checkedAt?, checkedBy?}]
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Suppliers */
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Manual sales (for tenants without POS integration) */
export const manualSales = pgTable('manual_sales', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  date: date('date').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentMethod: text('payment_method'), // 'dinheiro' | 'pix' | 'credito' | 'debito'
  notes: text('notes'),
  items: json('items').notNull(), // [{soldProductId, name, quantity, unitPrice, totalPrice}]
  recordedBy: integer('recorded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Tenant settings (API credentials, preferences) */
export const tenantSettings = pgTable('tenant_settings', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id).unique(),
  // PDV Legal credentials
  pdvApiUrl: text('pdv_api_url'),
  pdvUsername: text('pdv_username'),
  pdvPassword: text('pdv_password'),
  pdvClientId: text('pdv_client_id'),
  pdvClientSecret: text('pdv_client_secret'),
  pdvCodFilial: text('pdv_cod_filial'),
  // Cardápio Web credentials
  cardapioToken: text('cardapio_token'),
  cardapioApiUrl: text('cardapio_api_url'),
  // WhatsApp / Evolution API
  evolutionApiUrl: text('evolution_api_url'),
  evolutionApiKey: text('evolution_api_key'),
  evolutionInstanceName: text('evolution_instance_name'),
  // Preferences
  timezone: text('timezone').notNull().default('America/Sao_Paulo'),
  currency: text('currency').notNull().default('BRL'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Business locations/units */
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
