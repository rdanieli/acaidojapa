/**
 * Production Migration Script: Single-tenant → Multi-tenant
 *
 * This script creates a default tenant and owner user from the existing
 * env-var credentials, then backfills tenant_id on all existing rows.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-to-multitenant.ts
 *
 * IMPORTANT: Run this AFTER pushing the new schema (drizzle-kit push)
 * and BEFORE switching to the new auth system.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../lib/db/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function migrate() {
  console.log('Starting multi-tenant migration...');

  // 1. Create default tenant
  console.log('1. Creating default tenant...');
  const [tenant] = await db.insert(schema.tenants).values({
    name: 'Açaí do Japa',
    slug: 'acaidojapa',
    plan: 'pro',
    onboardingCompleted: true,
  }).returning();
  console.log(`   Tenant created: id=${tenant.id}, name=${tenant.name}`);

  // 2. Create owner user from env vars
  console.log('2. Creating owner user...');
  const email = process.env.DASHBOARD_USER || 'admin';
  const password = process.env.DASHBOARD_PASS || 'admin';
  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: email.includes('@') ? email : `${email}@acaidojapa.com`,
    name: 'Felippe',
    passwordHash,
    role: 'owner',
  }).returning();
  console.log(`   User created: id=${user.id}, email=${user.email}, role=${user.role}`);

  // 3. Backfill tenant_id on all existing tables
  console.log('3. Backfilling tenant_id on all tables...');

  const tables = [
    'inventory_entries',
    'allowed_senders',
    'products',
    'inventory_items',
    'stock_movements',
    'sold_products',
    'recipes',
    'stock_alerts',
    'stock_consolidations',
    'consolidation_items',
    'orders',
    'order_items',
    'complement_gramages',
    'processed_orders',
    'daily_stock_runs',
    'product_name_aliases',
  ];

  for (const table of tables) {
    const result = await db.execute(
      sql.raw(`UPDATE ${table} SET tenant_id = ${tenant.id} WHERE tenant_id IS NULL OR tenant_id = 0`)
    );
    console.log(`   ${table}: updated`);
  }

  console.log('\nMigration complete!');
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Owner email: ${user.email}`);
  console.log(`  Owner can login with the same password as DASHBOARD_PASS`);

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
