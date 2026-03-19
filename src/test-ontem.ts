import 'dotenv/config';
import { getCupons, getTotalFilial } from './apis/pdv-legal.js';
import { getOrdersForDay, getOrder } from './apis/cardapio-web.js';

const daysBack = parseInt(process.argv[2] || '1', 10); // 0 = hoje, 1 = ontem (default)
const target = new Date();
target.setDate(target.getDate() - daysBack);
const dataOntem = target.toISOString().split('T')[0];

console.log(`=== Pedidos de ONTEM (${dataOntem}) ===\n`);

async function testPDV() {
  console.log('━━━ PDV Legal (Balcao) ━━━\n');

  const cupons = await getCupons(dataOntem, dataOntem);
  const list = Array.isArray(cupons) ? cupons : [];

  if (list.length === 0) {
    console.log('   Nenhum cupom encontrado.\n');
    return { cupons: 0, faturamento: 0 };
  }

  let faturamento = 0;
  const ranking: Record<string, { qty: number; valor: number }> = {};

  for (const c of list) {
    const hora = c.dtabertura?.split('T')[1]?.substring(0, 5) || '??:??';
    console.log(`   #${c.venda_id} | ${hora} | R$ ${c.valortotal} | ${c.iscancelado ? 'CANC' : 'OK'}`);
    faturamento += c.valortotal || 0;

    for (const item of (c.itens || [])) {
      if (item.iscancelado) continue;
      console.log(`     ${item.nomeProduto} x${item.quantidade} = R$ ${item.valortotal}`);
      if (!ranking[item.nomeProduto]) ranking[item.nomeProduto] = { qty: 0, valor: 0 };
      ranking[item.nomeProduto].qty += item.quantidade;
      ranking[item.nomeProduto].valor += item.valortotal;
    }
  }

  const totalApi = await getTotalFilial(dataOntem, dataOntem);
  const t = Array.isArray(totalApi) ? totalApi[0] : totalApi;

  console.log(`\n   ─── RESUMO PDV ───`);
  console.log(`   Cupons: ${list.length} | Faturamento: R$ ${faturamento.toFixed(2)}`);
  if (t) console.log(`   Validacao API: R$ ${t.valorTotal} (${t.numRegistros} reg) ${t.valorTotal === faturamento ? '✓' : '✗'}`);
  console.log(`   Ranking:`);
  Object.entries(ranking).sort(([, a], [, b]) => b.qty - a.qty)
    .forEach(([nome, { qty, valor }]) => console.log(`     ${qty}x ${nome} = R$ ${valor.toFixed(2)}`));

  return { cupons: list.length, faturamento };
}

async function testCardapio() {
  console.log('\n\n━━━ Cardapio Web (Online) ━━━\n');

  const result = await getOrdersForDay(dataOntem);
  const orders = result.orders || [];
  const pagination = result.pagination;

  console.log(`   Total: ${pagination?.total_orders ?? orders.length} pedidos\n`);

  if (orders.length === 0) {
    console.log('   Nenhum pedido online.');
    return { pedidos: 0, faturamento: 0 };
  }

  let faturamento = 0;
  const ranking: Record<string, { qty: number; valor: number }> = {};

  for (const o of orders) {
    const detail = await getOrder(o.id);
    const hora = detail.created_at?.split('T')[1]?.substring(0, 5) || '??:??';

    console.log(`   #${detail.display_id || detail.id} | ${hora} | R$ ${detail.total} | ${detail.order_type} | ${detail.sales_channel}`);
    faturamento += detail.total || 0;

    for (const item of (detail.items || [])) {
      console.log(`     ${item.name} x${item.quantity} = R$ ${item.total_price}`);
      if (!ranking[item.name]) ranking[item.name] = { qty: 0, valor: 0 };
      ranking[item.name].qty += item.quantity;
      ranking[item.name].valor += item.total_price;
    }

    // Pagamento
    for (const p of (detail.payments || [])) {
      console.log(`     Pgto: ${p.payment_method} (${p.payment_type}) R$ ${p.total}`);
    }
    console.log('');
  }

  console.log(`   ─── RESUMO CARDAPIO WEB ───`);
  console.log(`   Pedidos: ${orders.length} | Faturamento: R$ ${faturamento.toFixed(2)}`);
  const closed = orders.filter((o: any) => o.status === 'closed').length;
  const canceled = orders.filter((o: any) => o.status === 'canceled').length;
  if (canceled > 0) console.log(`   Cancelados: ${canceled}`);
  console.log(`   Ranking:`);
  Object.entries(ranking).sort(([, a], [, b]) => b.qty - a.qty)
    .forEach(([nome, { qty, valor }]) => console.log(`     ${qty}x ${nome} = R$ ${valor.toFixed(2)}`));

  return { pedidos: orders.length, faturamento };
}

async function main() {
  let pdv = { cupons: 0, faturamento: 0 };
  let cw = { pedidos: 0, faturamento: 0 };

  try { pdv = await testPDV(); } catch (err: any) { console.error(`   PDV ERRO: ${err.message}`); }
  try { cw = await testCardapio(); } catch (err: any) { console.error(`   CW ERRO: ${err.message}`); }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  TOTAL DO DIA (${dataOntem})`);
  console.log(`  PDV:     ${pdv.cupons} vendas  | R$ ${pdv.faturamento.toFixed(2)}`);
  console.log(`  Online:  ${cw.pedidos} pedidos | R$ ${cw.faturamento.toFixed(2)}`);
  console.log(`  TOTAL:   ${pdv.cupons + cw.pedidos} vendas  | R$ ${(pdv.faturamento + cw.faturamento).toFixed(2)}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
