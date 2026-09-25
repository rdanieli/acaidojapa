export const SENT_MESSAGES_CAPACITY = 500;

const sentIds = new Set<string>();

export function rememberSentMessage(id: string | undefined): void {
  if (!id) return;
  sentIds.delete(id);
  sentIds.add(id);
  while (sentIds.size > SENT_MESSAGES_CAPACITY) {
    const oldest = sentIds.values().next().value;
    if (oldest === undefined) break;
    sentIds.delete(oldest);
  }
}

export function wasSentByUs(id: string | undefined): boolean {
  if (!id) return false;
  return sentIds.has(id);
}
