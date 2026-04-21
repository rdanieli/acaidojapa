/**
 * Evolution API instance management for multi-tenant WhatsApp.
 *
 * Uses the centralized Evolution API server to create/manage
 * one instance per tenant. Each instance = one WhatsApp number.
 *
 * Env vars: EVOLUTION_API_URL (server), EVOLUTION_API_KEY (global admin key)
 */

const ADMIN_URL = () => process.env.EVOLUTION_API_URL || '';
const ADMIN_KEY = () => process.env.EVOLUTION_API_KEY || '';

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: ADMIN_KEY(),
  };
}

function instanceName(tenantSlug: string): string {
  return `tongo-${tenantSlug}`;
}

export { instanceName };

/**
 * Create a new Evolution API instance for a tenant.
 * Idempotent — returns existing instance if already created.
 */
export async function createInstance(tenantSlug: string) {
  const name = instanceName(tenantSlug);
  const res = await fetch(`${ADMIN_URL()}/instance/create`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      instanceName: name,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Instance already exists is not an error
    if (res.status === 403 || body.includes('already')) {
      console.log(`[EvolutionAdmin] Instance ${name} already exists`);
      return { existed: true, instanceName: name };
    }
    throw new Error(`Failed to create instance ${name}: ${res.status} ${body}`);
  }

  const data = await res.json();
  console.log(`[EvolutionAdmin] Instance ${name} created`);
  return { existed: false, instanceName: name, data };
}

/**
 * Configure webhook for a tenant's instance.
 * Webhook URL includes instanceName so we can resolve the tenant on incoming messages.
 */
export async function configureWebhook(tenantSlug: string, baseUrl: string) {
  const name = instanceName(tenantSlug);
  const webhookUrl = `${baseUrl}/api/webhook/whatsapp?instanceName=${name}`;

  const res = await fetch(`${ADMIN_URL()}/webhook/set/${name}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events: ['MESSAGES_UPSERT'],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to configure webhook for ${name}: ${res.status} ${body}`);
  }

  console.log(`[EvolutionAdmin] Webhook configured for ${name}: ${webhookUrl}`);
}

/**
 * Get instance status by exact name (for existing instances like 'acaidojapa')
 */
export async function getInstanceStatusByName(name: string) {
  const res = await fetch(`${ADMIN_URL()}/instance/fetchInstances`, {
    method: 'GET',
    headers: adminHeaders(),
  });

  if (!res.ok) return null;

  const instances = await res.json();
  const list = Array.isArray(instances) ? instances : instances?.instances || [];
  const instance = list.find(
    (i: any) => i.name === name || i.instance?.instanceName === name || i.instanceName === name
  );

  if (!instance) return null;

  return {
    instanceName: name,
    status: instance.connectionStatus || instance.instance?.connectionStatus || 'unknown',
    ownerJid: instance.ownerJid || instance.instance?.ownerJid || null,
    profileName: instance.profileName || instance.instance?.profileName || null,
    profilePicUrl: instance.profilePicUrl || instance.instance?.profilePicUrl || null,
  };
}

/**
 * Get instance status (connected, disconnected, etc.)
 */
export async function getInstanceStatus(tenantSlug: string) {
  const name = instanceName(tenantSlug);

  const res = await fetch(`${ADMIN_URL()}/instance/fetchInstances`, {
    method: 'GET',
    headers: adminHeaders(),
  });

  if (!res.ok) return null;

  const instances = await res.json();
  const list = Array.isArray(instances) ? instances : instances?.instances || [];
  const instance = list.find(
    (i: any) => i.name === name || i.instance?.instanceName === name || i.instanceName === name
  );

  if (!instance) return null;

  return {
    instanceName: name,
    status: instance.connectionStatus || instance.instance?.connectionStatus || 'unknown',
    ownerJid: instance.ownerJid || instance.instance?.ownerJid || null,
    profileName: instance.profileName || instance.instance?.profileName || null,
    profilePicUrl: instance.profilePicUrl || instance.instance?.profilePicUrl || null,
  };
}

/**
 * Connect instance and get QR code for scanning.
 */
export async function connectInstance(tenantSlug: string) {
  const name = instanceName(tenantSlug);

  const res = await fetch(`${ADMIN_URL()}/instance/connect/${name}`, {
    method: 'GET',
    headers: adminHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to connect instance ${name}: ${res.status} ${body}`);
  }

  const data = await res.json();
  return {
    base64: data.base64 || null,
    code: data.code || null,
    count: data.count || 0,
  };
}

/**
 * Disconnect (logout) a tenant's WhatsApp session.
 */
export async function disconnectInstance(tenantSlug: string) {
  const name = instanceName(tenantSlug);

  const res = await fetch(`${ADMIN_URL()}/instance/logout/${name}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[EvolutionAdmin] Failed to disconnect ${name}: ${res.status} ${body}`);
  }
}

/**
 * Delete an instance entirely (cleanup).
 */
export async function deleteInstance(tenantSlug: string) {
  const name = instanceName(tenantSlug);

  const res = await fetch(`${ADMIN_URL()}/instance/delete/${name}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[EvolutionAdmin] Failed to delete ${name}: ${res.status} ${body}`);
  }
}
