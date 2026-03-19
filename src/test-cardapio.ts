import 'dotenv/config';
import { getMerchant, getCatalog, getOrders } from './apis/cardapio-web.js';

async function main() {
  console.log('=== Teste API Cardapio Web ===\n');
  console.log(`Base URL: ${process.env.CARDAPIO_API_URL || 'https://integracao.cardapioweb.com'}`);
  console.log(`Token: ${process.env.CARDAPIO_TOKEN?.substring(0, 15)}...`);
  console.log(`Auth: X-API-KEY header\n`);

  // 1. Merchant (Loja)
  console.log('1. Consultando loja (merchant)...');
  try {
    const merchant = await getMerchant();
    console.log('   Loja:', JSON.stringify(merchant, null, 2).substring(0, 1000));
  } catch (err: any) {
    console.error(`   ERRO: ${err.message}`);
  }

  // 2. Catalogo
  console.log('\n2. Consultando catalogo...');
  try {
    const catalog = await getCatalog();
    const str = JSON.stringify(catalog, null, 2);
    console.log(`   Catalogo (${str.length} chars):`);
    console.log('  ', str.substring(0, 1500));
    if (str.length > 1500) console.log('   ... (truncado)');
  } catch (err: any) {
    console.error(`   ERRO: ${err.message}`);
  }

  // 3. Pedidos
  console.log('\n3. Consultando pedidos...');
  try {
    const orders = await getOrders({ page: 1, per_page: 5 });
    const str = JSON.stringify(orders, null, 2);
    console.log(`   Pedidos (${str.length} chars):`);
    console.log('  ', str.substring(0, 1500));
    if (str.length > 1500) console.log('   ... (truncado)');
  } catch (err: any) {
    console.error(`   ERRO: ${err.message}`);
  }

  console.log('\n=== Teste Cardapio Web concluido ===');
}

main().catch(console.error);
