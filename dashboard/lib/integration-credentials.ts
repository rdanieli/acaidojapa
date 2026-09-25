import 'server-only';
import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { IntegrationCredentials } from '@/lib/apis';

export async function loadIntegrationCredentials(tenantId: number): Promise<IntegrationCredentials> {
  const [settings] = await db.select().from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId)).limit(1);

  const pdvCompleto = !!(
    settings?.pdvApiUrl &&
    settings?.pdvUsername &&
    settings?.pdvPassword &&
    settings?.pdvClientId &&
    settings?.pdvClientSecret &&
    settings?.pdvCodFilial
  );

  return {
    tenantId,
    pdv: pdvCompleto
      ? {
          apiUrl: settings!.pdvApiUrl!,
          username: settings!.pdvUsername!,
          password: settings!.pdvPassword!,
          clientId: settings!.pdvClientId!,
          clientSecret: settings!.pdvClientSecret!,
          codFilial: settings!.pdvCodFilial!,
        }
      : null,
    cardapio: settings?.cardapioToken
      ? {
          apiUrl: settings.cardapioApiUrl || 'https://integracao.cardapioweb.com',
          token: settings.cardapioToken,
        }
      : null,
  };
}
