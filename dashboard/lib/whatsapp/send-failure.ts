export type SendFailure = { status: number; message: string };

const NUMBER_NOT_ON_WHATSAPP = /"exists"\s*:\s*false/;
const CONNECTION_CLOSED = /Connection Closed/i;

export function describeSendFailure(err: unknown): SendFailure {
  const raw = err instanceof Error ? err.message : String(err);

  if (NUMBER_NOT_ON_WHATSAPP.test(raw)) {
    return { status: 422, message: 'Número não encontrado no WhatsApp. Confira o DDD e o número e tente de novo.' };
  }
  if (CONNECTION_CLOSED.test(raw)) {
    return { status: 502, message: 'WhatsApp desconectado. Reconecte na aba Conexão e reenvie a verificação.' };
  }
  return { status: 502, message: 'Não foi possível enviar a mensagem de verificação pelo WhatsApp. Tente de novo em instantes.' };
}
