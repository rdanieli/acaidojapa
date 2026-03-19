const BASE_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8082';
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'acaidojapa';

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };
}

export async function downloadMedia(messageId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(
    `${BASE_URL}/chat/getBase64FromMediaMessage/${INSTANCE}`,
    {
      method: 'POST',
      headers: headers(),
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

export async function sendMessage(remoteJid: string, text: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/message/sendText/${INSTANCE}`,
    {
      method: 'POST',
      headers: headers(),
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
export async function resolvePhoneFromLid(lid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/chat/findContacts/${INSTANCE}`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ where: { id: `${lid}@lid` } }),
      }
    );
    if (!res.ok) return null;
    const contacts = await res.json();
    const contact = Array.isArray(contacts) ? contacts[0] : contacts;
    // Check if remoteJid has a phone format
    const jid = contact?.remoteJid || '';
    if (jid.includes('@s.whatsapp.net')) {
      return jid.replace('@s.whatsapp.net', '');
    }
    return null;
  } catch {
    return null;
  }
}
