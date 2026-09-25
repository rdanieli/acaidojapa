import { phoneVariants } from './phone';

type WebhookBody = {
  sender?: string;
  data?: { key?: { remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean; id?: string }; source?: string };
};

const API_GENERATED_ID_PREFIX = '3EB0';
const WHATSAPP_WEB_SOURCE = 'web';

function jidPhone(jid: string | undefined): string {
  if (!jid) return '';
  return jid.replace(/@.*/, '').replace(/\D/g, '');
}

function looksGeneratedByApi(key: { id?: string }, source: string | undefined): boolean {
  return (key.id ?? '').startsWith(API_GENERATED_ID_PREFIX) && source !== WHATSAPP_WEB_SOURCE;
}

export function ownerSelfMessagePhone(body: WebhookBody): string | null {
  const key = body?.data?.key;
  if (key?.fromMe !== true) return null;
  if (looksGeneratedByApi(key, body?.data?.source)) return null;

  const ownerPhone = jidPhone(body?.sender);
  if (!ownerPhone) return null;

  const ownerVariants = phoneVariants(ownerPhone);
  const targets = [jidPhone(key.remoteJid), jidPhone(key.remoteJidAlt)].filter(Boolean);
  const isSelfChat = targets.some((target) => ownerVariants.includes(target));

  return isSelfChat ? ownerPhone : null;
}
