import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Fallback env vars (used when no tenant-specific settings exist)
const ENV_BASE_URL = process.env.EVOLUTION_API_URL || '';
const ENV_API_KEY = process.env.EVOLUTION_API_KEY || '';
const ENV_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || '';

interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
}

/** Cache tenant configs for 5 minutes to avoid DB hits on every message */
const configCache = new Map<number, { config: EvolutionConfig | null; expiresAt: number }>();

/**
 * Get Evolution API config for a tenant.
 * Priority: tenant_settings DB → env vars → null (not configured)
 */
async function getConfig(tenantId?: number): Promise<EvolutionConfig | null> {
  if (tenantId) {
    const cached = configCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.config;

    try {
      const [settings] = await db.select({
        evolutionApiUrl: tenantSettings.evolutionApiUrl,
        evolutionApiKey: tenantSettings.evolutionApiKey,
        evolutionInstanceName: tenantSettings.evolutionInstanceName,
      }).from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);

      if (settings?.evolutionApiUrl && settings?.evolutionApiKey && settings?.evolutionInstanceName) {
        const config: EvolutionConfig = {
          baseUrl: settings.evolutionApiUrl,
          apiKey: settings.evolutionApiKey,
          instance: settings.evolutionInstanceName,
        };
        configCache.set(tenantId, { config, expiresAt: Date.now() + 5 * 60 * 1000 });
        return config;
      }
    } catch (err) {
      console.error('[WhatsApp] Failed to load tenant settings:', err);
    }
  }

  // Fallback to env vars
  if (ENV_BASE_URL && ENV_API_KEY && ENV_INSTANCE) {
    return { baseUrl: ENV_BASE_URL, apiKey: ENV_API_KEY, instance: ENV_INSTANCE };
  }

  return null;
}

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey,
  };
}

/** Returns true if WhatsApp is configured (either via tenant settings or env vars) */
export async function isWhatsAppConfigured(tenantId?: number): Promise<boolean> {
  const config = await getConfig(tenantId);
  return config !== null;
}

export async function downloadMedia(messageId: string, tenantId?: number): Promise<{ buffer: Buffer; mimeType: string }> {
  const config = await getConfig(tenantId);
  if (!config) throw new Error('WhatsApp not configured');

  const res = await fetch(
    `${config.baseUrl}/chat/getBase64FromMediaMessage/${config.instance}`,
    {
      method: 'POST',
      headers: headers(config.apiKey),
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to download media: ${res.status}`);
  }

  const data = await res.json();
  const base64 = data.base64 as string;
  const mimeType = (data.mimetype as string) || 'application/octet-stream';
  const buffer = Buffer.from(base64, 'base64');

  return { buffer, mimeType };
}

export async function sendMessage(remoteJid: string, text: string, tenantId?: number): Promise<void> {
  const config = await getConfig(tenantId);
  if (!config) {
    console.log('[WhatsApp] Not configured, skipping message to', remoteJid);
    return;
  }

  const res = await fetch(
    `${config.baseUrl}/message/sendText/${config.instance}`,
    {
      method: 'POST',
      headers: headers(config.apiKey),
      body: JSON.stringify({
        number: remoteJid,
        text,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send message: ${res.status} ${body}`);
  }
}

/**
 * Resolve a LID to a real phone number for sending messages.
 * Evolution API can't send to LID JIDs, so we need the real number.
 */
export async function resolvePhoneFromLid(lid: string, tenantId?: number): Promise<string | null> {
  const config = await getConfig(tenantId);
  if (!config) return null;

  try {
    const res = await fetch(
      `${config.baseUrl}/chat/findContacts/${config.instance}`,
      {
        method: 'POST',
        headers: headers(config.apiKey),
        body: JSON.stringify({ where: { id: `${lid}@lid` } }),
      }
    );
    if (!res.ok) return null;
    const contacts = await res.json();
    const contact = Array.isArray(contacts) ? contacts[0] : contacts;
    const jid = contact?.remoteJid || '';
    if (jid.includes('@s.whatsapp.net')) {
      return jid.replace('@s.whatsapp.net', '');
    }
    return null;
  } catch {
    return null;
  }
}
