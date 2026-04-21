# Branding — nome do produto vs nomes técnicos

Este documento explica a diferença entre o nome **visível ao usuário** e os **nomes técnicos/infra** usados internamente.

## TL;DR

| | Nome atual |
|---|---|
| Domínio público | `japagestao.com.br` / `app.japagestao.com.br` |
| Nome do produto (UI, emails, invoices) | **Japa Gestão** |
| Identificadores técnicos (Docker, DB, paths) | `acaidojapa` |
| Prefixo de instâncias WhatsApp (Evolution API) | `tongo-{slug}` |

A divergência é proposital: mudar identificadores de infra exige migração de dados (volumes Docker, connection strings, paths no servidor) sem valor pro usuário. Foi feita uma troca só em UX.

## Identificadores que ficaram com nome antigo

### Docker / deploy
- Container names: `acaidojapa-postgres`, `acaidojapa-dashboard`, `acaidojapa-redis`, `acaidojapa-evolution` (+ variantes `-staging`)
- Volume names: `postgres_data`, `redis_data`, `postgres_staging_data`, `redis_staging_data`
- Docker images: `ghcr.io/rdanieli/acaidojapa/dashboard:{latest,staging}`
- Deploy path na VPS: `/opt/acaidojapa`
- Log path: `/var/log/acaidojapa-cron.log`

### Database
- Database name (prod): `acaidojapa`
- Database name (staging): `acaidojapa_staging`
- Database user: `acaidojapa`
- Connection strings em `docker-compose.yml`, `docker-compose.staging.yml`, `deploy.sh`, `init-db.sql`

### Código
- `package.json` (root) — campo `"name": "acaidojapa"` (cosmético, não usado)
- Default env var em compose: `EVOLUTION_INSTANCE_NAME:-acaidojapa` (fallback pra instância do tenant Felippe)

### Evolution API (WhatsApp)
- Prefixo de instâncias novas: `tongo-{slug}` — ver `dashboard/lib/whatsapp/evolution-admin.ts`
- Parsing correspondente em `dashboard/app/api/webhook/whatsapp/route.ts` e `dashboard/app/api/dashboard/whatsapp/route.ts`
- Instância existente do Felippe: `acaidojapa` (criada antes do pattern `tongo-*`)

### Workflows CI/CD (`.github/workflows/`)
- `build-dashboard.yml` → builda `:latest` em push para `main`, auto-deploy em `/opt/acaidojapa`
- `build-dashboard-staging.yml` → builda `:staging` em push para `feat/saas`

## Quando (se) renomear infra

Se quiser alinhar infra com o nome novo, a sequência segura seria:

1. **DB**: `pg_dump acaidojapa > /tmp/dump.sql`, criar novo user/DB `japagestao`, restore, atualizar connection strings em compose + `deploy.sh`, fazer cutover em janela de manutenção
2. **Containers + volumes**: stop, renomear no compose, recriar (dados persistem no volume se o nome do volume for mantido; se renomear volume, copiar os dados com `docker run --rm -v old:/from -v new:/to alpine cp -r /from/. /to`)
3. **Docker image**: criar novo repo `ghcr.io/rdanieli/japagestao/dashboard`, ajustar dois workflows GitHub Actions, invalidar tag antiga
4. **Deploy path**: `mv /opt/acaidojapa /opt/japagestao`, ajustar workflows, ajustar nginx configs pra novo path
5. **Evolution instances**: chamar API `POST /instance/rename` do Evolution pra cada instância existente, depois ajustar `instanceName()` em `evolution-admin.ts`

Nada disso é urgente. Produção funciona normalmente com a divergência atual.

## Histórico

- Commit `8748e56` (2026-04-21): migração de domínio `japa.divinify.app` → `app.japagestao.com.br` + remoção da landing interna
- Commit seguinte: rebranding UX de "Tongo Gestão" → "Japa Gestão" (este doc adicionado)
