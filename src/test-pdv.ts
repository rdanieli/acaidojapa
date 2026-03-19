import 'dotenv/config';
import {
  getToken,
  getCupons,
  getTotalFilial,
  getEstoque,
  getProdutos,
  getProdutosResumido,
  getFiliais,
  getGruposProdutos,
  getFormasPagamento,
} from './apis/pdv-legal.js';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('=== Teste API PDV Legal (Tablet Cloud) ===\n');

  // 1. Token
  console.log('1. Gerando token...');
  try {
    const token = await getToken();
    console.log(`   Token obtido: ${token.substring(0, 20)}...`);
  } catch (err) {
    console.error('   ERRO ao gerar token:', err);
    process.exit(1);
  }

  // 2. Filiais
  console.log('\n2. Buscando filiais...');
  try {
    const filiais = await getFiliais();
    console.log('   Filiais:', JSON.stringify(filiais, null, 2).substring(0, 500));
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 3. Produtos
  console.log('\n3. Buscando produtos (lista resumida, pagina 1)...');
  try {
    const produtos = await getProdutosResumido(1);
    const list = Array.isArray(produtos) ? produtos : [produtos];
    console.log(`   Total retornado: ${list.length} produtos`);
    if (list.length > 0) {
      console.log('   Amostra (primeiros 3):');
      list.slice(0, 3).forEach((p: any) => console.log(`     - ${JSON.stringify(p)}`));
    }
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 4. Grupos de produtos
  console.log('\n4. Buscando grupos de produtos...');
  try {
    const grupos = await getGruposProdutos();
    console.log('   Grupos:', JSON.stringify(grupos, null, 2).substring(0, 500));
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 5. Cupons/Vendas de hoje
  const hoje = new Date();
  const dataHoje = formatDate(hoje);
  console.log(`\n5. Buscando cupons de hoje (${dataHoje})...`);
  try {
    const cupons = await getCupons(dataHoje, dataHoje);
    const list = Array.isArray(cupons) ? cupons : [cupons];
    console.log(`   Total cupons: ${list.length}`);
    if (list.length > 0) {
      console.log('   Primeiro cupom:', JSON.stringify(list[0], null, 2).substring(0, 800));
    }
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 6. Total vendas hoje
  console.log(`\n6. Total vendas filial hoje (${dataHoje})...`);
  try {
    const total = await getTotalFilial(dataHoje, dataHoje);
    console.log('   Total:', JSON.stringify(total, null, 2).substring(0, 500));
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 7. Estoque
  console.log('\n7. Buscando estoque da filial...');
  try {
    const estoque = await getEstoque();
    const list = Array.isArray(estoque) ? estoque : [estoque];
    console.log(`   Total itens em estoque: ${list.length}`);
    if (list.length > 0) {
      console.log('   Amostra (primeiros 3):');
      list.slice(0, 3).forEach((e: any) => console.log(`     - ${JSON.stringify(e)}`));
    }
  } catch (err) {
    console.error('   ERRO:', err);
  }

  // 8. Formas de pagamento
  console.log('\n8. Formas de pagamento...');
  try {
    const formas = await getFormasPagamento();
    console.log('   Formas:', JSON.stringify(formas, null, 2).substring(0, 500));
  } catch (err) {
    console.error('   ERRO:', err);
  }

  console.log('\n=== Teste PDV Legal concluido ===');
}

main().catch(console.error);
