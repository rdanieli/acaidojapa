#!/usr/bin/env node
/**
 * Production Migration Script: Single-tenant → Multi-tenant
 *
 * Pure Node.js — no TypeScript, no Drizzle, just pg.
 * Runs inside the production container with: node scripts/migrate-to-multitenant.js
 *
 * What it does:
 *   1. Creates default tenant "Açaí do Japa" (slug: acaidojapa, plan: pro)
 *   2. Creates owner user from DASHBOARD_USER/DASHBOARD_PASS env vars
 *   3. Backfills tenant_id on ALL existing rows in ALL tables
 *
 * Prerequisites:
 *   - Schema already pushed (drizzle-kit push) with new tables + tenant_id columns
 *   - DASHBOARD_USER and DASHBOARD_PASS env vars set
 *   - DATABASE_URL env var set
 */

const { Pool } = require('pg');

// bcryptjs is bundled in the Next.js build, but may not be directly requireable.
// Use a simple inline bcrypt hash via pg's crypt functions, or bundle bcryptjs.
// For safety, we'll use a pre-hashed approach.

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES_TO_BACKFILL = [
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

async function hashPassword(password) {
  // Simple bcrypt implementation using the bundled bcryptjs from node_modules
  // If not available, fall back to a known hash
  try {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, 12);
  } catch {
    // Fallback: pre-compute hash for common passwords won't work.
    // Use pgcrypto extension instead.
    console.log('   bcryptjs not found, using pgcrypto...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    const result = await pool.query(
      "SELECT crypt($1, gen_salt('bf', 12)) as hash",
      [password]
    );
    return result.rows[0].hash;
  }
}

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('=== Tongo Gestão: Multi-tenant Migration ===\n');

    // Check if migration already ran
    const existingTenant = await client.query(
      "SELECT id FROM tenants WHERE slug = 'acaidojapa' LIMIT 1"
    );
    if (existingTenant.rows.length > 0) {
      console.log('Migration already ran! Tenant "acaidojapa" exists with id=' + existingTenant.rows[0].id);
      console.log('To re-run, delete the tenant first: DELETE FROM tenants WHERE slug = \'acaidojapa\'');
      return;
    }

    await client.query('BEGIN');

    // 1. Create tenant
    console.log('1. Creating tenant "Açaí do Japa"...');
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug, plan, onboarding_completed, active, created_at)
       VALUES ('Açaí do Japa', 'acaidojapa', 'pro', true, true, NOW())
       RETURNING id, name, slug`
    );
    const tenant = tenantResult.rows[0];
    console.log(`   ✓ Tenant created: id=${tenant.id}, slug=${tenant.slug}`);

    // 2. Create owner user
    console.log('2. Creating owner user...');
    const dashUser = process.env.DASHBOARD_USER || 'admin';
    const dashPass = process.env.DASHBOARD_PASS || 'admin';
    const email = dashUser.includes('@') ? dashUser : `${dashUser}@acaidojapa.com`;
    const passwordHash = await hashPassword(dashPass);

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, name, password_hash, role, active, created_at)
       VALUES ($1, $2, 'Felippe', $3, 'owner', true, NOW())
       RETURNING id, email, role`,
      [tenant.id, email, passwordHash]
    );
    const user = userResult.rows[0];
    console.log(`   ✓ User created: id=${user.id}, email=${user.email}, role=${user.role}`);

    // 3. Backfill tenant_id
    console.log('3. Backfilling tenant_id on all tables...');
    for (const table of TABLES_TO_BACKFILL) {
      try {
        const result = await client.query(
          `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL OR tenant_id = 0`,
          [tenant.id]
        );
        console.log(`   ✓ ${table}: ${result.rowCount} rows updated`);
      } catch (err) {
        // Table might not have data or tenant_id column might not exist yet
        console.log(`   ⚠ ${table}: ${err.message}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Migration Complete! ===');
    console.log(`  Tenant ID: ${tenant.id}`);
    console.log(`  Owner email: ${user.email}`);
    console.log(`  Password: same as DASHBOARD_PASS env var`);
    console.log(`  Login: both env-var (admin/pass) and email/pass work`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
