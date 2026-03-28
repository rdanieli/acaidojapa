import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checklistTemplates, checklistRuns } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const templates = await db.select().from(checklistTemplates)
      .where(and(eq(checklistTemplates.tenantId, tenantId), eq(checklistTemplates.active, true)))
      .orderBy(checklistTemplates.name);

    const runs = await db.select().from(checklistRuns)
      .where(and(eq(checklistRuns.tenantId, tenantId), eq(checklistRuns.date, date)))
      .orderBy(desc(checklistRuns.createdAt));

    return NextResponse.json({ templates, runs });
  } catch (error: any) {
    console.error('[Checklists API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const body = await request.json();

    if (body.action === 'create-template') {
      const { name, items } = body;
      if (!name || !items?.length) {
        return NextResponse.json({ error: 'name e items obrigatórios' }, { status: 400 });
      }
      const [template] = await db.insert(checklistTemplates).values({
        tenantId,
        name,
        items: items.map((label: string, i: number) => ({ label, order: i })),
      }).returning();
      return NextResponse.json({ template });
    }

    if (body.action === 'create-run') {
      const { templateId, date, assignedTo } = body;
      if (!templateId || !date) {
        return NextResponse.json({ error: 'templateId e date obrigatórios' }, { status: 400 });
      }
      const [template] = await db.select().from(checklistTemplates)
        .where(and(eq(checklistTemplates.id, templateId), eq(checklistTemplates.tenantId, tenantId)));
      if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });

      const templateItems = template.items as any[];
      const runItems = templateItems.map((item: any) => ({
        ...item,
        checked: false,
        checkedAt: null,
        checkedBy: null,
      }));

      const [run] = await db.insert(checklistRuns).values({
        tenantId,
        templateId,
        date,
        assignedTo: assignedTo || null,
        items: runItems,
      }).returning();
      return NextResponse.json({ run });
    }

    return NextResponse.json({ error: 'action obrigatória (create-template ou create-run)' }, { status: 400 });
  } catch (error: any) {
    console.error('[Checklists API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { id, items, status } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const updates: any = {};
    if (items) updates.items = items;
    if (status) {
      updates.status = status;
      if (status === 'completed') updates.completedAt = new Date();
    }

    const [updated] = await db.update(checklistRuns).set(updates)
      .where(and(eq(checklistRuns.id, id), eq(checklistRuns.tenantId, tenantId)))
      .returning();
    return NextResponse.json({ run: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    await db.update(checklistTemplates).set({ active: false })
      .where(and(eq(checklistTemplates.id, Number(id)), eq(checklistTemplates.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
