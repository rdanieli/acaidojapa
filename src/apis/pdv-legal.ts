import 'dotenv/config';

const API_URL = process.env.PDV_API_URL!;
const USERNAME = process.env.PDV_USERNAME!;
const PASSWORD = process.env.PDV_PASSWORD!;
const CLIENT_ID = process.env.PDV_CLIENT_ID!;
const CLIENT_SECRET = process.env.PDV_CLIENT_SECRET!;
const COD_FILIAL = process.env.PDV_COD_FILIAL!;

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const body = new URLSearchParams({
    username: USERNAME,
    password: PASSWORD,
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000, // refresh 1min early
  };

  return cachedToken.access_token;
}

async function apiGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

// --- Cupons / Vendas ---

/** Lista cupons/vendas em um intervalo de datas (max 10 dias). Formato data: yyyy-MM-dd */
export function getCupons(dataInicial: string, dataFinal: string, filial = COD_FILIAL) {
  return apiGet(`/cupom/get/${dataInicial}/${dataFinal}/${filial}`);
}

/** Cupons paginados (100 por pagina). offset começa em 0 */
export function getCuponsPaginado(offset: number, dataInicial: string, dataFinal: string, filial = COD_FILIAL) {
  return apiGet(`/cupom/get/${offset}/${dataInicial}/${dataFinal}/${filial}`);
}

/** Total de vendas por filial no periodo */
export function getTotalFilial(dataInicial: string, dataFinal: string, filial = COD_FILIAL) {
  return apiGet(`/cupom/gettotalfilial/${dataInicial}/${dataFinal}/${filial}`);
}

/** Cupom especifico por VendaId */
export function getCupom(vendaId: string, filial = COD_FILIAL) {
  return apiGet(`/cupom/get/${vendaId}/${filial}`);
}

// --- Estoque ---

/** Estoque completo da filial */
export function getEstoque(filial = COD_FILIAL) {
  return apiGet(`/estoque/get/${filial}`);
}

/** Estoque de um produto especifico */
export function getEstoqueProduto(codVenda: string, filial = COD_FILIAL) {
  return apiGet(`/estoque/get/${filial}/${codVenda}`);
}

/** Movimentacoes de estoque */
export function getMovimentacoes(dataInicial: string, dataFinal: string, filial = COD_FILIAL, offset = 0) {
  return apiGet(`/estoque/getmovimentacao?offset=${offset}&dataInicial=${dataInicial}&datafinal=${dataFinal}&filiais=${filial}`);
}

/** Saidas de estoque */
export function getSaidas(dataInicial: string, dataFinal: string, filial = COD_FILIAL, offset = 0) {
  return apiGet(`/estoque/getsaida/${offset}/${dataInicial}/${dataFinal}/${filial}`);
}

// --- Produtos ---

/** Todos os produtos */
export function getProdutos() {
  return apiGet('/produtos/get');
}

/** Produto por ID */
export function getProduto(id: string) {
  return apiGet(`/produtos/get/${id}`);
}

/** Lista resumida paginada (100 por pagina) */
export function getProdutosResumido(pagina = 1) {
  return apiGet(`/produtos/getlistaresumida/${pagina}`);
}

// --- Filiais ---

export function getFiliais() {
  return apiGet('/filial/get');
}

// --- Grupos e Pagamento ---

export function getGruposProdutos() {
  return apiGet('/grupoprodutos/get');
}

export function getFormasPagamento() {
  return apiGet('/formapagamentopdv/get');
}

export function getPromocoes(filial = COD_FILIAL) {
  return apiGet(`/promocoes/get/${filial}`);
}

// --- Clientes ---

export function getClientes() {
  return apiGet('/cliente/get');
}

export function getClienteVendas(clienteId: string) {
  return apiGet(`/cliente/get/vendas/${clienteId}`);
}
