import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ExtractedItem {
  product_name: string;
  matched_product_id?: number;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_price?: number;
}

export interface ExtractionResult {
  items: ExtractedItem[];
  raw_text?: string;
}

export interface CatalogProduct {
  id: number;
  name: string;
  aliases: string | null;
  defaultUnit: string;
  unitWeightG?: string | null;
}

function buildPrompt(catalog: CatalogProduct[]): string {
  let catalogSection = '';

  if (catalog.length > 0) {
    const productList = catalog
      .map((p) => {
        const names = [p.name, ...(p.aliases ? p.aliases.split(',').map((a) => a.trim()) : [])];
        const weight = p.unitWeightG ? ` | peso/un: ${p.unitWeightG}g` : '';
        return `  - ID ${p.id}: ${names.join(' / ')} (unidade padrão: ${p.defaultUnit}${weight})`;
      })
      .join('\n');

    catalogSection = `
CATÁLOGO DE PRODUTOS EXISTENTES:
${productList}

REGRAS DE MATCHING:
- Se o item mencionado corresponder a um produto do catálogo acima (mesmo que escrito de forma diferente, abreviado, ou com variação), use EXATAMENTE o nome do catálogo e inclua o campo "matched_product_id" com o ID correspondente.
- Se não corresponder a nenhum produto do catálogo, use o nome como foi mencionado e NÃO inclua "matched_product_id".
- Abreviações comuns: "cx"="caixa", "pct"="pacote", "pol"="polpa", "sc"="saco"
- Variações de açaí são o mesmo produto: "açaí", "acai", "açai", "acaí"
- Ignore acentos e diferenças de maiúsculas/minúsculas ao fazer matching
- "Polpa de açaí 10kg" = "polpa acai" = "açaí 10kg" = "pol açaí"
- "Leite condensado" = "leite cond" = "condensado"
- "Granola" = "gran" (se não houver ambiguidade)
`;
  }

  return `Você é um assistente que extrai itens de notas fiscais e mensagens de inventário de uma loja de açaí no Brasil.

Extraia cada item mencionado e retorne um JSON array com os seguintes campos:
- product_name: nome do produto
- matched_product_id: ID do produto no catálogo (se encontrar correspondência, senão omitir)
- quantity: quantidade numérica
- unit: unidade de medida (kg, un, L, cx, pct, sc, g, ml)
- unit_price: preço unitário (se mencionado, senão null)
- total_price: preço total do item (se mencionado, senão null)
${catalogSection}
Regras:
- Mantenha os nomes dos produtos em português
- Se não houver unidade explícita, use "un"
- Converta abreviações comuns: caixa→cx, pacote→pct, saco→sc, litro→L, quilo→kg
- Retorne APENAS o JSON array, sem texto adicional
- Se não conseguir extrair nenhum item, retorne []

Exemplo de saída:
[{"product_name":"Polpa de Açaí 10kg","matched_product_id":1,"quantity":5,"unit":"cx","unit_price":45.00,"total_price":225.00}]`;
}

export async function transcribeAudio(buffer: Buffer): Promise<string> {
  const file = new File([new Uint8Array(buffer)], 'audio.ogg', { type: 'audio/ogg' });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: 'pt',
  });

  return transcription.text;
}

export async function extractInventoryFromText(text: string, catalog: CatalogProduct[] = []): Promise<ExtractionResult> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: buildPrompt(catalog) },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content ?? '[]';
  const items = parseItems(content);
  return { items, raw_text: text };
}

export async function extractInventoryFromImage(base64: string, mimeType: string, catalog: CatalogProduct[] = []): Promise<ExtractionResult> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: buildPrompt(catalog) },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extraia todos os itens desta nota fiscal / imagem de inventário.',
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content ?? '[]';
  const items = parseItems(content);
  return { items, raw_text: content };
}

function parseItems(content: string): ExtractedItem[] {
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      product_name: String(item.product_name || ''),
      matched_product_id: item.matched_product_id != null ? Number(item.matched_product_id) : undefined,
      quantity: Number(item.quantity) || 0,
      unit: String(item.unit || 'un'),
      unit_price: item.unit_price != null ? Number(item.unit_price) : undefined,
      total_price: item.total_price != null ? Number(item.total_price) : undefined,
    })).filter((item: ExtractedItem) => item.product_name && item.quantity > 0);
  } catch {
    return [];
  }
}
