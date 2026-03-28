import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventoryEntries, stockAlerts, checklistRuns } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

interface Notification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'pending_entry' | 'checklist_pending';
  title: string;
  description: string;
  href: string;
  createdAt: string;
}

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const notifications: Notification[] = [];

    // 1. Low/out of stock products
    const lowStockProducts = await db.select({
      id: products.id,
      name: products.name,
      currentStock: products.currentStock,
      minStock: products.minStock,
      defaultUnit: products.defaultUnit,
    }).from(products).where(and(
      eq(products.tenantId, tenantId),
      eq(products.active, true),
      sql`${products.minStock} IS NOT NULL AND CAST(${products.currentStock} AS numeric) <= CAST(${products.minStock} AS numeric)`,
    ));

    for (const p of lowStockProducts) {
      const current = Number(p.currentStock) || 0;
      const isOut = current <= 0;
      notifications.push({
        id: `stock-${p.id}`,
        type: isOut ? 'out_of_stock' : 'low_stock',
        title: isOut ? `${p.name} — sem estoque` : `${p.name} — estoque baixo`,
        description: `${current} ${p.defaultUnit} (mín: ${p.minStock} ${p.defaultUnit})`,
        href: '/estoque',
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Pending inventory entries
    const pendingEntries = await db.select({
      count: sql<number>`count(*)`,
    }).from(inventoryEntries).where(and(
      eq(inventoryEntries.tenantId, tenantId),
      eq(inventoryEntries.status, 'pending'),
    ));
    const pendingCount = Number(pendingEntries[0]?.count) || 0;
    if (pendingCount > 0) {
      notifications.push({
        id: 'pending-entries',
        type: 'pending_entry',
        title: `${pendingCount} entrada${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`,
        description: 'Entradas de estoque aguardando confirmação',
        href: '/estoque',
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Today's incomplete checklists
    const today = new Date().toISOString().split('T')[0];
    const pendingChecklists = await db.select({
      count: sql<number>`count(*)`,
    }).from(checklistRuns).where(and(
      eq(checklistRuns.tenantId, tenantId),
      eq(checklistRuns.date, today),
      sql`${checklistRuns.status} != 'completed'`,
    ));
    const checklistCount = Number(pendingChecklists[0]?.count) || 0;
    if (checklistCount > 0) {
      notifications.push({
        id: 'checklists-pending',
        type: 'checklist_pending',
        title: `${checklistCount} checklist${checklistCount > 1 ? 's' : ''} pendente${checklistCount > 1 ? 's' : ''}`,
        description: 'Checklists de hoje ainda não foram concluídos',
        href: '/checklists',
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (error: any) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
