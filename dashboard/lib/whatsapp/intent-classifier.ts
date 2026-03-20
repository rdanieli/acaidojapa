import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type Intent = 'question' | 'inventory';

/**
 * Uses Groq LLM to classify whether a WhatsApp message is a question about
 * stock/sales or an inventory entry. Confirmation messages (ok/cancelar)
 * are already handled upstream, so we only distinguish these two.
 */
export async function classifyIntent(text: string): Promise<Intent> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `Você classifica mensagens de WhatsApp de uma loja de açaí em EXATAMENTE uma categoria:

QUESTION — perguntas sobre estoque, vendas, produtos, alertas, resumos. Exemplos:
- "quanto tem de açaí?"
- "tá acabando algo?"
- "vendeu quanto ontem?"
- "qual o estoque atual?"
- "precisa comprar o quê?"
- "como tão as vendas?"
- "resumo do dia"

INVENTORY — entradas de estoque, itens recebidos, notas fiscais. Geralmente contém números + unidades. Exemplos:
- "5kg morango"
- "3 caixas de açaí 10kg"
- "chegou 2 pacotes de granola"
- "leite condensado 5 un"

Responda APENAS com a palavra: QUESTION ou INVENTORY`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const response = (completion.choices[0]?.message?.content ?? '').trim().toUpperCase();
    if (response.includes('QUESTION')) return 'question';
    return 'inventory';
  } catch (error) {
    console.error('[IntentClassifier] Groq error, defaulting to inventory:', error);
    return 'inventory';
  }
}
