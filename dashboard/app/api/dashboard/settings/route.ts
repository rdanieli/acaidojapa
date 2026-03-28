import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantSettings, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';

export async function GET() {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');

    const [settings] = await db.select().from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId)).limit(1);

    const [tenant] = await db.select().from(tenants)
      .where(eq(tenants.id, session.tenantId)).limit(1);

    return NextResponse.json({
      tenant: { name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      settings: settings || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const body = await request.json();

    // Update tenant name if provided
    if (body.tenantName) {
      await db.update(tenants).set({ name: body.tenantName })
        .where(eq(tenants.id, session.tenantId));
    }

    // Upsert settings
    const settingsData: any = {};
    const fields = [
      'pdvApiUrl', 'pdvUsername', 'pdvPassword', 'pdvClientId', 'pdvClientSecret', 'pdvCodFilial',
      'cardapioToken', 'cardapioApiUrl',
      'evolutionApiUrl', 'evolutionApiKey', 'evolutionInstanceName',
      'timezone', 'currency',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) settingsData[f] = body[f] || null;
    }
    settingsData.updatedAt = new Date();

    const [existing] = await db.select().from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId)).limit(1);

    if (existing) {
      await db.update(tenantSettings).set(settingsData)
        .where(eq(tenantSettings.tenantId, session.tenantId));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: session.tenantId,
        ...settingsData,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
