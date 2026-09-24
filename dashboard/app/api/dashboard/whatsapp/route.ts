import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';
import {
  createInstance,
  configureWebhook,
  getInstanceStatus,
  connectInstance,
  disconnectInstance,
  instanceName,
} from '@/lib/whatsapp/evolution-admin';

/** Instance name already in use by this tenant, or the default derived from its slug */
async function resolveInstanceName(tenantId: number): Promise<string> {
  const [settings] = await db.select({ evolutionInstanceName: tenantSettings.evolutionInstanceName })
    .from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  if (settings?.evolutionInstanceName) return settings.evolutionInstanceName;
  const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new Error('Tenant not found');
  return instanceName(tenant.slug);
}

/** Derive app base URL for webhook configuration */
function getBaseUrl(request: NextRequest): string {
  // Prefer explicit env var, fall back to request headers
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get('origin');
  if (origin) return origin;
  const referer = request.headers.get('referer');
  if (referer) return new URL(referer).origin;
  return 'https://staging.app.japagestao.com.br';
}

/** Auto-save Evolution config to tenantSettings so evolution.ts can send messages */
async function saveEvolutionConfig(tenantId: number, instName: string) {
  const apiUrl = process.env.EVOLUTION_API_URL || '';
  const apiKey = process.env.EVOLUTION_API_KEY || '';

  const [existing] = await db.select().from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId)).limit(1);

  if (existing) {
    await db.update(tenantSettings).set({
      evolutionApiUrl: apiUrl,
      evolutionApiKey: apiKey,
      evolutionInstanceName: instName,
      updatedAt: new Date(),
    }).where(eq(tenantSettings.tenantId, tenantId));
  } else {
    await db.insert(tenantSettings).values({
      tenantId,
      evolutionApiUrl: apiUrl,
      evolutionApiKey: apiKey,
      evolutionInstanceName: instName,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();

    // Check if Evolution API is configured at all
    if (!process.env.EVOLUTION_API_URL) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'WhatsApp não configurado neste ambiente',
      });
    }

    const instName = await resolveInstanceName(tenantId);
    const status = await getInstanceStatus(instName);

    if (!status) {
      return NextResponse.json({ status: 'not_found', message: 'Instância não criada ainda' });
    }

    const connected = status.status === 'open';
    return NextResponse.json({
      status: connected ? 'connected' : 'disconnected',
      phone: status.ownerJid?.replace('@s.whatsapp.net', '') || null,
      profileName: status.profileName || null,
      profilePic: status.profilePicUrl || null,
      instanceName: status.instanceName,
    });
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to check status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { action } = await request.json();

    if (!process.env.EVOLUTION_API_URL) {
      return NextResponse.json({ error: 'WhatsApp não configurado neste ambiente' }, { status: 503 });
    }

    if (action === 'connect') {
      const instName = await resolveInstanceName(tenantId);

      // 1. Create instance (idempotent)
      await createInstance(instName);

      // 2. Configure webhook with tenant identification
      const baseUrl = getBaseUrl(request);
      await configureWebhook(instName, baseUrl);

      // 3. Save config to tenantSettings so evolution.ts can send messages
      await saveEvolutionConfig(tenantId, instName);

      // 4. Get QR code
      const qr = await connectInstance(instName);

      if (qr.base64) {
        return NextResponse.json({ qr: qr.base64, count: qr.count });
      }
      return NextResponse.json({
        qr: null,
        count: qr.count || 0,
        message: 'O WhatsApp não devolveu o QR code. Tente de novo em alguns segundos.',
      });
    }

    if (action === 'disconnect') {
      await disconnectInstance(await resolveInstanceName(tenantId));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json(
      { error: 'Não foi possível falar com o servidor do WhatsApp. Tente de novo em alguns minutos.' },
      { status: 500 }
    );
  }
}
