# Plano de Migração: feat/saas → Produção

## Resumo

Migrar 19 commits (92 arquivos, +6.580 linhas) da branch `feat/saas` para `main`.
O Felippe continua operando normalmente — login antigo funciona, WhatsApp funciona,
crons funcionam. As mudanças são aditivas (novas tabelas, novas colunas, novas páginas).

**Testado com sucesso no staging usando dump real da produção.**

---

## O que muda pro Felippe

### O que continua IGUAL (zero impacto):
- Login com `admin` / `acaidojapa2026` → continua funcionando (fallback de env vars)
- WhatsApp → mesma instância `acaidojapa` via env vars, zero mudança
- Crons → sync de pedidos, processamento diário, lista de compras → continuam rodando
- Dashboard, Estoque, Pedidos, Financeiro → mesmos dados, mesma interface
- Todas as URLs que ele usa hoje → funcionam igual

### O que aparece de NOVO (ele pode ignorar se quiser):
- Sidebar: 5 links novos (Vendas, Fornecedores, Desperdícios, Checklists, Etiquetas)
- Sino de notificações no topo (alertas de estoque baixo, entradas pendentes)
- Botão flutuante de ações rápidas (canto inferior direito)
- Gráfico de histórico de estoque (ícone de gráfico no catálogo de produtos)
- Botão "Exportar CSV" em movimentações, desperdícios e vendas
- Banner de boas-vindas some automaticamente quando tem dados (ele já tem)

### O que NÃO aparece pro Felippe:
- Página de registro (`/registro`) — só pra novos clientes
- Onboarding wizard — só pra novos tenants (Felippe já tá marcado como onboarded)

---

## Procedimento Passo a Passo

### Preparação (antes do deploy)

**Horário recomendado:** Madrugada ou manhã cedo (antes das 10h), quando o movimento é baixo.

#### Passo 1: Backup do banco de produção
```bash
ssh root@app.japagestao.com.br "docker exec acaidojapa-postgres pg_dump -U acaidojapa acaidojapa > /opt/acaidojapa/backup-antes-saas.sql"
```
Verificar que o backup foi criado:
```bash
ssh root@app.japagestao.com.br "ls -lh /opt/acaidojapa/backup-antes-saas.sql"
```

#### Passo 2: Verificar que produção está estável
```bash
ssh root@app.japagestao.com.br "docker compose ps"
# Todos os containers devem estar "Up" e "healthy"

curl -s -o /dev/null -w "%{http_code}" https://app.japagestao.com.br/login
# Deve retornar 200
```

### Deploy

#### Passo 3: Merge feat/saas → main (local)
```bash
cd /Users/rafaeldanieli/code-personal/acaidojapa
git checkout main
git pull origin main
git merge feat/saas --no-ff -m "feat: merge Tongo Gestão SaaS platform"
```
O `--no-ff` garante um merge commit pra facilitar rollback se necessário.

#### Passo 4: Push para GitHub
```bash
git push origin main
```
Isso triggera o CI/CD:
- GitHub Actions builda nova imagem `ghcr.io/rdanieli/acaidojapa/dashboard:latest`
- Auto-deploya no servidor: pull image + restart container
- **Tempo estimado: ~3 minutos**

#### Passo 5: Aguardar CI/CD completar
```bash
gh run list --branch main --limit 1
# Esperar "completed success"
```

#### Passo 6: Verificar que o container reiniciou
```bash
ssh root@app.japagestao.com.br "docker compose ps"
# acaidojapa-dashboard deve mostrar "Up X seconds"
```

### Migração do Banco

#### Passo 7: Copiar SQL de migração pro servidor
```bash
scp /tmp/migrate-schema.sql root@app.japagestao.com.br:/tmp/migrate-schema.sql
```

#### Passo 8: Adicionar novas tabelas e colunas
```bash
ssh root@app.japagestao.com.br "docker cp /tmp/migrate-schema.sql acaidojapa-postgres:/tmp/migrate-schema.sql && docker exec acaidojapa-postgres psql -U acaidojapa -d acaidojapa -f /tmp/migrate-schema.sql"
```
**Resultado esperado:**
- 9x `CREATE TABLE` (tenants, users, tenant_settings, suppliers, manual_sales, waste_entries, checklist_templates, checklist_runs, locations)
- 17x `ALTER TABLE` (adiciona tenant_id como nullable em todas as tabelas existentes)
- **NENHUM dado é perdido** — tenant_id é adicionado como nullable

#### Passo 9: Rodar script de migração
```bash
ssh root@app.japagestao.com.br "docker exec acaidojapa-dashboard node scripts/migrate-to-multitenant.js"
```
**Resultado esperado:**
```
=== Tongo Gestão: Multi-tenant Migration ===

1. Creating tenant "Açaí do Japa"...
   ✓ Tenant created: id=1, slug=acaidojapa
2. Creating owner user...
   ✓ User created: id=1, email=admin@acaidojapa.com, role=owner
3. Backfilling tenant_id on all tables...
   ✓ inventory_entries: ~34 rows updated
   ✓ products: ~113 rows updated
   ✓ orders: ~2172 rows updated
   ... (todas as tabelas com dados)

=== Migration Complete! ===
```

#### Passo 10: Reiniciar o dashboard pra limpar caches
```bash
ssh root@app.japagestao.com.br "cd /opt/acaidojapa && docker compose up -d --force-recreate dashboard"
```

### Verificação

#### Passo 11: Testar login (ambos os métodos)
```bash
# Login antigo (env vars) — DEVE FUNCIONAR
curl -s -w "%{http_code}" -X POST https://app.japagestao.com.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"acaidojapa2026"}'
# Esperado: {"ok":true} 200

# Login novo (email) — DEVE FUNCIONAR
curl -s -w "%{http_code}" -X POST https://app.japagestao.com.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@acaidojapa.com","password":"acaidojapa2026"}'
# Esperado: {"ok":true,"user":{"name":"Felippe","role":"owner"}} 200
```

#### Passo 12: Testar dados
```bash
COOKIE=$(curl -s -c - -X POST https://app.japagestao.com.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"acaidojapa2026"}' | grep auth-token | awk '{print $NF}')

# Produtos
curl -s -b "auth-token=$COOKIE" https://app.japagestao.com.br/api/dashboard/products-catalog | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Products: {len(d[\"products\"])}')"
# Esperado: Products: 113

# Métricas
curl -s -b "auth-token=$COOKIE" "https://app.japagestao.com.br/api/dashboard/metrics?start=2026-03-22&end=2026-03-29" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Revenue: R\${d[\"totalRevenue\"]:.2f}, Orders: {d[\"orderCount\"]}')"
# Esperado: Revenue e orders com valores reais

# WhatsApp
curl -s -b "auth-token=$COOKIE" https://app.japagestao.com.br/api/dashboard/whatsapp | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
# Esperado: "connected" (ou "connecting")
```

#### Passo 13: Testar crons manualmente
```bash
# Sync de pedidos
curl -s -X POST http://localhost:3001/api/dashboard/orders/sync \
  -H 'Authorization: Bearer b4dc1e451e560b0cbe4861e88e61090c80cda5bdd0bf25c26ca986b03287c222' \
  -H 'Content-Type: application/json' -d '{}'
# Esperado: resposta com orders synced
```

#### Passo 14: Abrir no browser
Abrir https://app.japagestao.com.br no browser e verificar:
- [ ] Dashboard carrega com gráficos e KPIs
- [ ] Sidebar mostra nome "Açaí do Japa" no topo
- [ ] Sino de notificações aparece
- [ ] Estoque > Catálogo mostra os 113 produtos
- [ ] Financeiro mostra receita e CMV
- [ ] Estoque > Conexão mostra WhatsApp conectado

---

## Rollback (se algo der errado)

### Rollback rápido: reverter o código
```bash
# No servidor
ssh root@app.japagestao.com.br "cd /opt/acaidojapa && docker compose pull dashboard && docker compose up -d dashboard"
# Isso puxa a imagem :latest que o CI acabou de buildar

# Se precisar voltar pra versão anterior:
git checkout main
git revert HEAD  # reverte o merge commit
git push origin main
# CI builda e deploya a versão anterior
```

### Rollback completo: restaurar banco
```bash
ssh root@app.japagestao.com.br "
  docker exec acaidojapa-postgres psql -U acaidojapa -d postgres -c 'DROP DATABASE acaidojapa;' &&
  docker exec acaidojapa-postgres psql -U acaidojapa -d postgres -c 'CREATE DATABASE acaidojapa OWNER acaidojapa;' &&
  docker exec acaidojapa-postgres psql -U acaidojapa -d acaidojapa -f /opt/acaidojapa/backup-antes-saas.sql
"
```

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Login para de funcionar | Muito baixa | Alto | Fallback de env vars testado e funcionando |
| Dados somem | Zero | Alto | tenant_id é nullable, backfill não deleta nada |
| WhatsApp para | Zero | Alto | Instância `acaidojapa` continua via env vars |
| Crons falham | Baixa | Médio | Crons resolvem primeiro tenant ativo |
| Dashboard lento | Baixa | Baixo | Queries adicionam WHERE tenant_id = filtro simples |
| Schema push perde dados | Zero | Alto | Usamos SQL manual (ALTER ADD COLUMN), não drizzle push |

---

## Tempo estimado

| Etapa | Tempo |
|-------|-------|
| Backup | 1 min |
| Merge + push | 1 min |
| CI/CD build + deploy | 3 min |
| SQL migration | 1 min |
| Script de backfill | 30 seg |
| Verificação | 5 min |
| **Total** | **~12 minutos** |

---

## Depois da migração

Coisas que podem ser feitas depois, sem pressa:

1. **Avisar o Felippe** sobre os novos links na sidebar (Vendas, Fornecedores, Desperdícios, Checklists, Etiquetas)
2. **Criar conta pro Rafael** como manager: via Configurações > Usuários
3. **Configurar checklists** de abertura/fechamento se ele quiser
4. **Testar WhatsApp** mandando uma mensagem pro número do Felippe
