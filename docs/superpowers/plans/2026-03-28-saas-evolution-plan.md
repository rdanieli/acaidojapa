# Açaí do Japa SaaS Evolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-tenant Açaí do Japa dashboard into a multi-tenant SaaS platform with staging environment, user roles, waste control, checklists, labels, and multi-unit support — without breaking the current production system.

**Architecture:** Feature branch `feat/saas` with separate staging docker-compose and CI/CD pipeline. Multi-tenancy via `tenant_id` column on all tables (shared DB, shared schema). Auth upgraded from env-var credentials to a `users` table with bcrypt passwords and role-based permissions. All new features built incrementally behind the tenant model.

**Tech Stack:** Next.js 16, Drizzle ORM, PostgreSQL 16, Docker Compose, GitHub Actions, Evolution API (WhatsApp), Groq AI, bcrypt, jose JWT

---

## Phase 0: Staging Environment

### Task 0.1: Create staging branch and docker-compose

**Files:**
- Create: `docker-compose.staging.yml`
- Create: `.env.staging.example`
- Modify: `.github/workflows/build-dashboard.yml`
- Create: `.github/workflows/build-dashboard-staging.yml`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/saas
```

- [ ] **Step 2: Create staging docker-compose**

Create `docker-compose.staging.yml` — identical structure to production but with different container names, ports, volumes, and database name to run side-by-side on the same server:

```yaml
services:
  postgres-staging:
    image: postgres:16-alpine
    container_name: acaidojapa-postgres-staging
    restart: unless-stopped
    environment:
      POSTGRES_USER: acaidojapa
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: acaidojapa_staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5434:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U acaidojapa"]
      interval: 5s
      timeout: 5s
      retries: 5

  dashboard-staging:
    image: ghcr.io/rdanieli/acaidojapa/dashboard:staging
    container_name: acaidojapa-dashboard-staging
    restart: unless-stopped
    depends_on:
      postgres-staging:
        condition: service_healthy
    environment:
      DASHBOARD_USER: ${DASHBOARD_USER}
      DASHBOARD_PASS: ${DASHBOARD_PASS}
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgresql://acaidojapa:${DB_PASSWORD}@postgres-staging:5432/acaidojapa_staging
      PDV_API_URL: ${PDV_API_URL}
      PDV_USERNAME: ${PDV_USERNAME}
      PDV_PASSWORD: ${PDV_PASSWORD}
      PDV_CLIENT_ID: ${PDV_CLIENT_ID}
      PDV_CLIENT_SECRET: ${PDV_CLIENT_SECRET}
      PDV_COD_FILIAL: ${PDV_COD_FILIAL}
      CARDAPIO_TOKEN: ${CARDAPIO_TOKEN}
      CARDAPIO_API_URL: ${CARDAPIO_API_URL}
      GROQ_API_KEY: ${GROQ_API_KEY}
      EVOLUTION_API_URL: http://evolution:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE_NAME: ${EVOLUTION_INSTANCE_NAME:-acaidojapa}
      CRON_SECRET: ${CRON_SECRET}
      WEBHOOK_SECRET: ""
    ports:
      - "127.0.0.1:3002:3001"

  redis-staging:
    image: redis:7-alpine
    container_name: acaidojapa-redis-staging
    restart: unless-stopped
    volumes:
      - redis_staging_data:/data

volumes:
  postgres_staging_data:
  redis_staging_data:
```

Key differences from production:
- Container names: `*-staging`
- DB name: `acaidojapa_staging`
- Postgres port: `5434` (prod is `5433`)
- Dashboard port: `3002` (prod is `3001`)
- Image tag: `dashboard:staging` (prod is `dashboard:latest`)
- Separate volumes: `*_staging_data`
- Reuses existing Evolution API from production (no separate WhatsApp instance needed for staging)

- [ ] **Step 3: Create `.env.staging.example`**

```env
# Staging uses same .env as production — the docker-compose.staging.yml
# handles all the isolation (different DB, ports, volumes, container names).
# Just ensure .env exists in the project root with all required vars.
#
# Staging-specific behavior:
#   - DB: acaidojapa_staging (port 5434)
#   - Dashboard: port 3002
#   - Image tag: dashboard:staging
#   - Shares Evolution API instance with production
```

- [ ] **Step 4: Create staging CI/CD workflow**

Create `.github/workflows/build-dashboard-staging.yml`:

```yaml
name: Build Dashboard Staging

on:
  push:
    branches: [feat/saas]
    paths:
      - 'dashboard/**'
      - '.github/workflows/build-dashboard-staging.yml'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/dashboard

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push staging
        uses: docker/build-push-action@v6
        with:
          context: ./dashboard
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:staging
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy staging to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: root
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/acaidojapa
            docker compose -f docker-compose.staging.yml pull dashboard-staging
            docker compose -f docker-compose.staging.yml up -d dashboard-staging
            docker image prune -f
```

- [ ] **Step 5: Update deploy.sh with staging commands**

Add to `deploy.sh` after the existing `setup-cron` case, before `*)`:

```bash
  staging:up)
    log "Starting staging services..."
    docker compose -f docker-compose.staging.yml up -d
    ok "Staging services running on port 3002"
    docker compose -f docker-compose.staging.yml ps
    ;;

  staging:down)
    log "Stopping staging services..."
    docker compose -f docker-compose.staging.yml down
    ok "Staging stopped"
    ;;

  staging:logs)
    docker compose -f docker-compose.staging.yml logs -f dashboard-staging
    ;;

  staging:db:push)
    log "Pushing schema to staging database..."
    cd dashboard
    DATABASE_URL="postgresql://acaidojapa:$(grep DB_PASSWORD ../.env | cut -d= -f2)@localhost:5434/acaidojapa_staging" npx drizzle-kit push
    cd ..
    ok "Staging schema pushed"
    ;;
```

Also update the usage line:

```bash
  *)
    echo "Usage: ./deploy.sh {setup|up|down|update|logs|db:push|status|setup-cron|staging:up|staging:down|staging:logs|staging:db:push}"
    exit 1
    ;;
```

- [ ] **Step 6: Commit staging infrastructure**

```bash
git add docker-compose.staging.yml .env.staging.example .github/workflows/build-dashboard-staging.yml deploy.sh
git commit -m "feat: add staging environment with separate DB, ports, and CI/CD"
```

### Task 0.2: Deploy staging on server

- [ ] **Step 1: Push branch and let CI build**

```bash
git push -u origin feat/saas
```

- [ ] **Step 2: SSH to server and start staging**

```bash
ssh root@divinify.app "cd /opt/acaidojapa && git fetch && git checkout feat/saas && docker compose -f docker-compose.staging.yml up -d"
```

- [ ] **Step 3: Push schema to staging DB**

```bash
ssh root@divinify.app "cd /opt/acaidojapa && ./deploy.sh staging:db:push"
```

- [ ] **Step 4: Configure nginx for staging subdomain**

Add nginx config for `staging.divinify.app` → `localhost:3002`. Then run certbot.

- [ ] **Step 5: Verify staging works independently**

Open `https://staging.divinify.app`, login, verify empty DB, confirm production at `divinify.app` is untouched.

- [ ] **Step 6: Commit any adjustments**

---

## Phase 1: Multi-Tenant Foundation

### Task 1.1: Add `tenants` and `users` tables to schema

**Files:**
- Modify: `dashboard/lib/db/schema.ts`

- [ ] **Step 1: Add tenants table**

Add to `schema.ts` before all other tables:

```typescript
/** Multi-tenant: each business is a tenant */
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Business name, e.g. "Açaí do Japa"
  slug: text('slug').notNull().unique(), // URL slug, e.g. "acaidojapa"
  plan: text('plan').notNull().default('free'), // 'free' | 'starter' | 'pro'
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Add users table**

```typescript
/** Users with role-based access */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('employee'), // 'owner' | 'manager' | 'employee'
  phone: text('phone'), // for WhatsApp notifications
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Add `tenantId` column to ALL existing tables**

Every existing table needs a `tenantId` column. This is the core of multi-tenancy. Add to each table definition:

```typescript
tenantId: integer('tenant_id').notNull().references(() => tenants.id),
```

Tables that need this column added:
- `inventoryEntries`
- `allowedSenders`
- `products`
- `inventoryItems`
- `stockMovements`
- `soldProducts`
- `recipes`
- `stockAlerts`
- `stockConsolidations`
- `consolidationItems`
- `orders`
- `orderItems`
- `complementGramages`
- `processedOrders`
- `dailyStockRuns`
- `productNameAliases`

**Important:** Since this is staging-only and the DB is empty, we can add `NOT NULL` directly. For production migration later, we'd need a default value strategy.

- [ ] **Step 4: Push schema to staging**

```bash
cd dashboard && DATABASE_URL="postgresql://acaidojapa:PASSWORD@localhost:5434/acaidojapa_staging" npx drizzle-kit push
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/db/schema.ts
git commit -m "feat: add tenants, users tables and tenantId to all tables"
```

### Task 1.2: Install bcrypt and create auth utilities

**Files:**
- Create: `dashboard/lib/auth.ts`
- Modify: `dashboard/package.json` (via npm install)

- [ ] **Step 1: Install bcrypt**

```bash
cd dashboard && npm install bcryptjs && npm install -D @types/bcryptjs
```

- [ ] **Step 2: Create auth utility module**

Create `dashboard/lib/auth.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, tenants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionPayload {
  userId: number;
  tenantId: number;
  role: 'owner' | 'manager' | 'employee';
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as SessionPayload;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Get current session or throw. Use in API routes that require auth.
 * Returns { userId, tenantId, role }.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.active, true)))
    .limit(1);

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, user.tenantId), eq(tenants.active, true)))
    .limit(1);

  if (!tenant) return null;

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return { user, tenant };
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/lib/auth.ts dashboard/package.json dashboard/package-lock.json
git commit -m "feat: add auth utilities with bcrypt and JWT session management"
```

### Task 1.3: Upgrade login system to use users table

**Files:**
- Modify: `dashboard/app/api/auth/login/route.ts`
- Create: `dashboard/app/api/auth/register/route.ts`

- [ ] **Step 1: Rewrite login endpoint**

Replace `dashboard/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    // Fallback to env-var auth for backward compatibility during migration
    const envUser = process.env.DASHBOARD_USER;
    const envPass = process.env.DASHBOARD_PASS;
    if (envUser && envPass && email === envUser && password === envPass) {
      // Legacy single-user login — create a minimal token
      const token = await createToken({
        userId: 0,
        tenantId: 1, // default tenant
        role: 'owner',
        email: envUser,
      });
      const response = NextResponse.json({ ok: true });
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400,
        path: '/',
      });
      return response;
    }

    // New DB-based auth
    const result = await authenticateUser(email, password);
    if (!result) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const { user, tenant } = result;
    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role as 'owner' | 'manager' | 'employee',
      email: user.email,
    });

    const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create registration endpoint**

Create `dashboard/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { hashPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { businessName, slug, name, email, password, phone } = await request.json();

    if (!businessName || !slug || !name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Create tenant
    const [tenant] = await db.insert(tenants).values({
      name: businessName,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }).returning();

    // Create owner user
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email,
      name,
      passwordHash,
      role: 'owner',
      phone: phone || null,
    }).returning();

    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: 'owner',
      email: user.email,
    });

    const response = NextResponse.json({ ok: true, tenantId: tenant.id });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('[Register] Error:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email ou slug já em uso' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add register to public paths in middleware**

In `dashboard/middleware.ts`, add to PUBLIC_PATHS:

```typescript
'/api/auth/register',
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/api/auth/login/route.ts dashboard/app/api/auth/register/route.ts dashboard/middleware.ts
git commit -m "feat: upgrade login to DB-based auth with registration endpoint"
```

### Task 1.4: Create tenant-scoped DB helper

**Files:**
- Create: `dashboard/lib/db/tenant.ts`

- [ ] **Step 1: Create tenant-scoped query helper**

Create `dashboard/lib/db/tenant.ts`:

```typescript
import { db } from '@/lib/db';
import { requireSession, type SessionPayload } from '@/lib/auth';
import { eq, and, SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';

/**
 * Get the current session's tenantId for use in queries.
 * All data-fetching API routes should use this to scope queries.
 *
 * Usage:
 *   const { tenantId } = await getTenantScope();
 *   const items = await db.select().from(products).where(eq(products.tenantId, tenantId));
 */
export async function getTenantScope(): Promise<SessionPayload> {
  return requireSession();
}

/**
 * Check if current user has at least the given role.
 * Role hierarchy: owner > manager > employee
 */
export function hasRole(session: SessionPayload, minRole: 'owner' | 'manager' | 'employee'): boolean {
  const hierarchy = { owner: 3, manager: 2, employee: 1 };
  return hierarchy[session.role] >= hierarchy[minRole];
}

/**
 * Require minimum role or throw.
 */
export function requireRole(session: SessionPayload, minRole: 'owner' | 'manager' | 'employee'): void {
  if (!hasRole(session, minRole)) {
    throw new Error(`Acesso negado. Requer permissão de ${minRole}.`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/lib/db/tenant.ts
git commit -m "feat: add tenant-scoped DB helpers and role checking"
```

### Task 1.5: Migrate API routes to tenant-scoped queries

**Files:**
- Modify: ALL API routes under `dashboard/app/api/dashboard/`

This is the largest task. Every API route that reads/writes data must:
1. Call `getTenantScope()` to get the `tenantId`
2. Add `eq(table.tenantId, tenantId)` to all WHERE clauses
3. Include `tenantId` in all INSERT operations

- [ ] **Step 1: Migrate products-catalog route**

In `dashboard/app/api/dashboard/products-catalog/route.ts`:

```typescript
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const all = await db.select().from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.name);
    return NextResponse.json({ products: all });
  } catch (error) {
    // ...
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { name, ... } = await request.json();
    const [product] = await db.insert(products).values({
      tenantId,
      name,
      // ... rest of fields
    }).returning();
    return NextResponse.json({ product });
  } catch (error) {
    // ...
  }
}
```

- [ ] **Step 2: Repeat for ALL data routes**

Apply the same pattern to every route:
- `inventory/route.ts`
- `senders/route.ts`
- `stock-movements/route.ts`
- `stock-summary/route.ts`
- `stock/route.ts`
- `sold-products/route.ts`
- `recipes/route.ts`
- `alerts/route.ts`
- `consolidations/route.ts`
- `consolidations/[id]/route.ts`
- `orders/route.ts`
- `orders/[id]/route.ts`
- `orders/sync/route.ts`
- `metrics/route.ts`
- `financial/route.ts`
- `purchases/route.ts`
- `complement-gramages/route.ts`
- `product-aliases/route.ts`
- `stock/process-daily-sales/route.ts`
- `stock/shopping-list/route.ts`
- `stock/deduct-batch/route.ts`
- `stock/deduct-sale/route.ts`
- `whatsapp/route.ts`

For cron-callable routes (process-daily-sales, orders/sync, shopping-list), the cron auth path needs to determine tenantId differently — either process ALL tenants or accept a `tenantId` parameter:

```typescript
// For cron routes:
const authHeader = request.headers.get('authorization');
const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

let tenantId: number;
if (isCron) {
  // Process all tenants or use query param
  const { searchParams } = new URL(request.url);
  const tid = searchParams.get('tenantId');
  if (!tid) {
    // Process ALL active tenants
    const allTenants = await db.select().from(tenants).where(eq(tenants.active, true));
    const results = [];
    for (const t of allTenants) {
      results.push(await processForTenant(t.id));
    }
    return NextResponse.json({ results });
  }
  tenantId = Number(tid);
} else {
  const session = await getTenantScope();
  tenantId = session.tenantId;
}
```

- [ ] **Step 3: Migrate WhatsApp webhook to resolve tenant from sender phone**

The webhook at `dashboard/app/api/webhook/whatsapp/route.ts` receives messages from any phone. It needs to look up the sender's phone in `allowedSenders` to determine their `tenantId`:

```typescript
// In webhook handler:
const [sender] = await db.select().from(allowedSenders)
  .where(eq(allowedSenders.phone, senderPhone))
  .limit(1);

if (!sender) {
  // Unknown sender — ignore or respond with error
  return;
}
const tenantId = sender.tenantId;
```

- [ ] **Step 4: Migrate lib/stock/ functions**

All stock processing functions (`process-daily-sales.ts`, `deduct-stock.ts`, `extract-complements.ts`, `parse-order-item.ts`) need to accept `tenantId` as a parameter and include it in queries.

Example for `deduct-stock.ts`:

```typescript
export async function deductProductStock(
  tenantId: number,
  productId: number,
  quantityG: number,
  referenceType: string,
  referenceId: number,
  createdBy: string,
) {
  // Include tenantId in stock movement insert
  await db.insert(stockMovements).values({
    tenantId,
    productId,
    type: 'saida_venda',
    quantity: String(-quantityG),
    unit: 'g',
    quantityG: String(-quantityG),
    referenceType,
    referenceId,
    createdBy,
  });
  // Update product stock (already scoped by productId, but verify tenantId)
  await db.update(products)
    .set({ currentStock: sql`${products.currentStock} - ${quantityG}` })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scope all API routes and stock functions to tenantId"
```

### Task 1.6: Create user management page (owner-only)

**Files:**
- Create: `dashboard/app/(dashboard)/configuracoes/page.tsx`
- Create: `dashboard/app/api/dashboard/users/route.ts`
- Modify: `dashboard/hooks/use-dashboard.ts` (add user hooks)
- Modify: sidebar/navigation to add settings link

- [ ] **Step 1: Create users API route**

Create `dashboard/app/api/dashboard/users/route.ts`:

GET — list users for tenant (owner/manager only)
POST — invite/create user (owner only)
PUT — update user role/active (owner only)
DELETE — deactivate user (owner only)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getTenantScope();
    requireRole(session, 'manager');
    const all = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.tenantId, session.tenantId));
    return NextResponse.json({ users: all });
  } catch (error: any) {
    console.error('[Users API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { name, email, password, role, phone } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'name, email, password obrigatórios' }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      tenantId: session.tenantId,
      name,
      email,
      passwordHash,
      role: role || 'employee',
      phone: phone || null,
    }).returning();
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email já em uso' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { id, role, active, name, phone } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    const [updated] = await db.update(users).set(updates)
      .where(and(eq(users.id, id), eq(users.tenantId, session.tenantId)))
      .returning();
    return NextResponse.json({ user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add hooks to `use-dashboard.ts`**

```typescript
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
      if (!res.ok) throw new Error('Failed to create user');
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
```

- [ ] **Step 3: Create settings page**

Create `dashboard/app/(dashboard)/configuracoes/page.tsx` with:
- Users table: name, email, role, active status, last login
- Add user form: name, email, password, role selector
- Edit role: dropdown (owner/manager/employee)
- Toggle active/inactive

Follow the same UI patterns as products-catalog (glass-card, same table components, acai color scheme).

- [ ] **Step 4: Add "Configurações" to sidebar navigation**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add user management page with roles (owner/manager/employee)"
```

### Task 1.7: Add role-based route protection

**Files:**
- Modify: `dashboard/middleware.ts`

- [ ] **Step 1: Update middleware to check roles**

The middleware currently only checks if JWT is valid. Enhance it to extract role and restrict access:

```typescript
// Employee can access: estoque (entradas only), dashboard home
// Manager can access: estoque, pedidos, fichas-tecnicas, configuracoes (view users)
// Owner can access: everything (financeiro, configuracoes full)

const ROLE_ROUTES: Record<string, string[]> = {
  employee: ['/dashboard', '/estoque'],
  manager: ['/dashboard', '/estoque', '/pedidos', '/fichas-tecnicas', '/produtos', '/configuracoes'],
  owner: [], // empty = all access
};
```

For the API routes, the role check happens inside each route handler via `requireRole()`, so middleware stays lightweight (JWT validation only). The frontend sidebar hides links based on role from the JWT payload.

- [ ] **Step 2: Create a session context hook**

Create `dashboard/hooks/use-session.ts`:

```typescript
'use client';
import { createContext, useContext } from 'react';

interface Session {
  userId: number;
  tenantId: number;
  role: 'owner' | 'manager' | 'employee';
  email: string;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be within SessionProvider');
  return session;
}

export function useHasRole(minRole: 'owner' | 'manager' | 'employee') {
  const session = useSession();
  const hierarchy = { owner: 3, manager: 2, employee: 1 };
  return hierarchy[session.role] >= hierarchy[minRole];
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add role-based access control to routes and sidebar"
```

---

## Phase 2: New Features

### Task 2.1: Waste Control (Controle de Desperdícios)

**Files:**
- Create: `dashboard/app/(dashboard)/desperdicios/page.tsx`
- Create: `dashboard/app/api/dashboard/waste/route.ts`
- Modify: `dashboard/lib/db/schema.ts` (add waste table)
- Modify: `dashboard/hooks/use-dashboard.ts` (add waste hooks)

- [ ] **Step 1: Add waste table to schema**

```typescript
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
```

- [ ] **Step 2: Create waste API route**

`dashboard/app/api/dashboard/waste/route.ts`:
- GET: list waste entries for tenant (with optional date range, product filter)
- POST: record new waste entry (creates negative stock movement too)

When a waste entry is created, also:
1. Insert a `stockMovement` with type `'saida_desperdicio'`
2. Decrement `products.currentStock`

- [ ] **Step 3: Add hooks**

```typescript
export function useWasteEntries(filters?: { startDate?: string; endDate?: string; productId?: number }) {
  // GET /api/dashboard/waste?startDate=...&endDate=...&productId=...
}

export function useRecordWaste() {
  // POST /api/dashboard/waste
  // Invalidates: waste-entries, products-catalog, stock-movements, stock-summary
}
```

- [ ] **Step 4: Create waste page**

`dashboard/app/(dashboard)/desperdicios/page.tsx`:
- **Header**: "Controle de Desperdícios" with icon
- **Record waste form**: product selector, quantity, unit, reason dropdown (Vencido, Estragado, Quebra, Preparo, Outro), notes, date
- **Waste history table**: date, product, quantity, reason, who recorded, notes
- **Summary cards**: total waste this month (R$), top wasted products, waste by reason breakdown
- **Date range filter**

Follow existing UI patterns (glass-card, shadcn table, acai theme).

- [ ] **Step 5: Add "Desperdícios" to sidebar**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add waste control with tracking, stock deduction, and reporting"
```

### Task 2.2: Operational Checklists

**Files:**
- Modify: `dashboard/lib/db/schema.ts` (add checklist tables)
- Create: `dashboard/app/api/dashboard/checklists/route.ts`
- Create: `dashboard/app/api/dashboard/checklists/[id]/route.ts`
- Create: `dashboard/app/(dashboard)/checklists/page.tsx`
- Modify: `dashboard/hooks/use-dashboard.ts`

- [ ] **Step 1: Add checklist tables**

```typescript
/** Checklist templates (reusable) */
export const checklistTemplates = pgTable('checklist_templates', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(), // e.g. "Abertura da loja", "Fechamento"
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
  items: json('items').notNull(), // [{label, order, checked: boolean, checkedAt?, checkedBy?}]
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create checklist API routes**

`/api/dashboard/checklists/route.ts`:
- GET: list templates + today's runs
- POST: create template OR create run from template

`/api/dashboard/checklists/[id]/route.ts`:
- GET: get run details
- PUT: update run (check/uncheck items, change status)
- DELETE: delete template

- [ ] **Step 3: Add hooks**

```typescript
export function useChecklists() { /* GET templates + today's runs */ }
export function useCreateChecklist() { /* POST new template */ }
export function useCreateChecklistRun() { /* POST create today's run from template */ }
export function useUpdateChecklistRun() { /* PUT check items */ }
```

- [ ] **Step 4: Create checklists page**

Two views:
- **Templates tab**: Create/edit/delete checklist templates with drag-to-reorder items
- **Hoje tab**: Today's checklist instances with checkable items, progress bar, assigned user

- [ ] **Step 5: Add to sidebar**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add operational checklists with templates and daily tracking"
```

### Task 2.3: Label Printing

**Files:**
- Create: `dashboard/app/(dashboard)/etiquetas/page.tsx`
- Create: `dashboard/app/api/dashboard/labels/route.ts`

- [ ] **Step 1: Create label generation API**

`/api/dashboard/labels/route.ts`:
- GET `?productId=X&type=validade|identificacao`: generate label data
- Returns JSON with product info, dates, barcode data

- [ ] **Step 2: Create labels page**

`dashboard/app/(dashboard)/etiquetas/page.tsx`:
- **Product selector**: dropdown from catalog
- **Label type**: Validade (expiry) or Identificação (identification)
- **Fields for validade**: product name, fabrication date (auto=today), validade date (user picks), lote/batch
- **Preview**: CSS-styled label preview (standard food label format)
- **Print button**: triggers `window.print()` with print-specific CSS that hides everything except the label

Use `@media print` CSS to format labels for thermal printers (common sizes: 40x25mm, 50x30mm).

- [ ] **Step 3: Add to sidebar**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add label printing for product identification and expiry dates"
```

### Task 2.4: Onboarding Wizard

**Files:**
- Create: `dashboard/app/(dashboard)/onboarding/page.tsx`
- Create: `dashboard/app/api/dashboard/onboarding/route.ts`
- Modify: `dashboard/lib/db/schema.ts` (add onboarding status to tenants)

- [ ] **Step 1: Add onboarding fields to tenants table**

```typescript
// Add to tenants table:
onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
```

- [ ] **Step 2: Create onboarding wizard page**

Multi-step wizard:
1. **Bem-vindo**: Business info (name, address, phone)
2. **Produtos**: Quick-add common açaí products (from predefined template: polpa, granola, leite condensado, etc.)
3. **Produtos Vendidos**: Quick-add standard menu items (Açaí 200ml, 300ml, 500ml, etc.)
4. **Gramagens**: Set complement gramages per cup size (pre-populated from seed data)
5. **Receitas**: Link products to menu items (base recipe)
6. **WhatsApp**: Connect WhatsApp + add first authorized sender
7. **Pronto!**: Summary + redirect to dashboard

- [ ] **Step 3: Create onboarding API**

POST endpoint that bulk-creates products, sold products, gramages, and recipes from wizard data in a single transaction.

- [ ] **Step 4: Redirect new tenants to onboarding**

In the dashboard layout, check if tenant has `onboardingCompleted === false` and redirect to `/onboarding`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add onboarding wizard for new tenant setup"
```

---

## Phase 3: Multi-Unit Support

### Task 3.1: Add locations/units model

**Files:**
- Modify: `dashboard/lib/db/schema.ts`
- Create: `dashboard/app/api/dashboard/locations/route.ts`

- [ ] **Step 1: Add locations table**

```typescript
/** Business locations/units */
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(), // e.g. "Loja Centro", "Loja Shopping"
  address: text('address'),
  phone: text('phone'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Add `locationId` to relevant tables**

Optional (nullable) column on tables that can be location-scoped:
- `products` — stock per location
- `orders` — orders per location
- `stockMovements` — movements per location
- `inventoryEntries` — entries per location
- `allowedSenders` — sender linked to location
- `wasteEntries` — waste per location
- `checklistRuns` — checklists per location

```typescript
locationId: integer('location_id').references(() => locations.id),
```

**Important:** This is nullable so single-location tenants work without changes. Multi-location tenants can filter by location.

- [ ] **Step 3: Create locations API**

CRUD for locations (owner-only). Standard pattern.

- [ ] **Step 4: Add location switcher to dashboard header**

Dropdown in the top bar that filters all data by location. "Todas as unidades" as default.

Store selected location in React state/context, pass as query param to API calls.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add multi-unit support with location model and switcher"
```

---

## Phase 4: Registration & Landing Page

### Task 4.1: Create public registration page

**Files:**
- Create: `dashboard/app/registro/page.tsx`
- Modify: `dashboard/middleware.ts` (add `/registro` to public paths)

- [ ] **Step 1: Create registration page**

Simple form: business name, slug, owner name, email, password, phone.

On submit, call POST `/api/auth/register`, then redirect to `/onboarding`.

- [ ] **Step 2: Update login page**

Add "Não tem conta? Cadastre-se" link to the login page.

- [ ] **Step 3: Add to public paths**

```typescript
'/registro',
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add public registration page with link from login"
```

---

## Phase 5: Polish & Production Migration

### Task 5.1: Production migration strategy

This task is NOT code — it's a runbook for migrating the existing Felippe production data.

- [ ] **Step 1: Write migration script**

Create `dashboard/scripts/migrate-to-multitenant.ts`:

1. Create default tenant (id=1, name="Açaí do Japa", slug="acaidojapa")
2. Create owner user from current DASHBOARD_USER/DASHBOARD_PASS env vars
3. UPDATE all existing tables SET `tenant_id = 1` (backfill)
4. ALTER all `tenant_id` columns to NOT NULL (if they were nullable during migration)

```typescript
import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth';
import { sql } from 'drizzle-orm';

async function migrate() {
  // 1. Create default tenant
  const [tenant] = await db.insert(tenants).values({
    name: 'Açaí do Japa',
    slug: 'acaidojapa',
    plan: 'pro',
    onboardingCompleted: true,
  }).returning();

  // 2. Create owner user
  const hash = await hashPassword(process.env.DASHBOARD_PASS!);
  await db.insert(users).values({
    tenantId: tenant.id,
    email: process.env.DASHBOARD_USER! + '@acaidojapa.com',
    name: 'Felippe',
    passwordHash: hash,
    role: 'owner',
  });

  // 3. Backfill tenant_id on all tables
  const tables = [
    'inventory_entries', 'allowed_senders', 'products', 'inventory_items',
    'stock_movements', 'sold_products', 'recipes', 'stock_alerts',
    'stock_consolidations', 'consolidation_items', 'orders', 'order_items',
    'complement_gramages', 'processed_orders', 'daily_stock_runs', 'product_name_aliases',
  ];
  for (const table of tables) {
    await db.execute(sql.raw(`UPDATE ${table} SET tenant_id = ${tenant.id} WHERE tenant_id IS NULL`));
  }

  console.log(`Migration complete. Tenant ID: ${tenant.id}`);
}

migrate().catch(console.error);
```

- [ ] **Step 2: Document production deployment steps**

```
1. Backup production DB: pg_dump acaidojapa > backup-YYYY-MM-DD.sql
2. Merge feat/saas → main
3. CI builds new :latest image
4. SSH to server:
   a. docker compose pull dashboard
   b. ./deploy.sh db:push (adds new columns as nullable first)
   c. Run migration script: docker compose exec dashboard node scripts/migrate-to-multitenant.js
   d. docker compose up -d dashboard
5. Test login with new email-based auth
6. Verify all existing data has tenant_id = 1
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add production migration script for multi-tenant backfill"
```

---

## Execution Order Summary

| Phase | Tasks | Dependencies | Estimated Complexity |
|-------|-------|-------------|---------------------|
| **0: Staging** | 0.1, 0.2 | None | Low |
| **1: Multi-Tenant** | 1.1→1.2→1.3→1.4→1.5→1.6→1.7 | Phase 0 | High (1.5 is largest) |
| **2: Features** | 2.1, 2.2, 2.3, 2.4 (parallel) | Phase 1 | Medium each |
| **3: Multi-Unit** | 3.1 | Phase 1 | Medium |
| **4: Registration** | 4.1 | Phase 1 | Low |
| **5: Migration** | 5.1 | All phases | Low (but critical) |

**Total tasks:** 15 major tasks across 6 phases.

Phase 2 tasks (waste, checklists, labels, onboarding) can be worked on in parallel since they're independent features.

**Critical path:** Phase 0 → Phase 1 (especially Task 1.5) → everything else.
