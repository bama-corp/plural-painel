# API para o painel PH (`/api/ph/*`)

Endpoints de **leitura** (clientes + MRR + lucro estimado) para sincronizar com o ph-painel.
Não expõe PINs, senhas IPTV nem credenciais de salas.

**Papéis:** Plural = operação / clientes / MRR · PH = dinheiro / ledger.

## Auth

Header obrigatório em todas as rotas `/api/ph/*`:

```http
Authorization: Bearer <PH_API_KEY>
```

`PH_API_KEY` define-se no Plural (`.env` / Vercel). No painel PH usa-se o **mesmo** valor em `PLURAL_API_KEY` (só no servidor — **não** no browser).

## Configuração

### Neste projeto (Plural)

1. Gera uma chave:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Cola em `.env`:
   ```env
   PH_API_KEY="a_tua_chave"
   # URL do API PH (webhook após marcar-pago / renovar / …)
   PH_PANEL_URL="http://localhost:8787"
   ```
3. Em produção (Vercel → Environment Variables):
   - `PH_API_KEY` = a mesma chave
   - `PH_PANEL_URL` = URL do PH (ex. `https://teu-ph.vercel.app`)
   - `CORS_ORIGINS` = inclui a origem do painel PH (ex. `https://teu-ph.vercel.app`)
4. Redeploy.
5. Health: `GET /api/ph/health` com o Bearer — deve devolver `{ ok: true }`.

### No outro painel (PH) — servidor

A chave **não** vai para o frontend Vite. O browser chama só `/api/plural/*` no PH.

```env
PLURAL_API_URL="https://plural-painel.vercel.app"
PLURAL_API_KEY="a_mesma_chave"
# Deep link na tabela de clientes (URL do frontend Plural)
VITE_PLURAL_APP_URL="https://plural-painel.vercel.app"
# Opcional: segredo dedicado para webhook (senão usa PLURAL_API_KEY)
# PLURAL_HOOK_SECRET=""
CORS_ORIGINS="https://teu-ph.vercel.app,http://localhost:5173"
```

Em local:

```env
PLURAL_API_URL="http://localhost:3001"
PLURAL_API_KEY="a_mesma_chave"
VITE_PLURAL_APP_URL="http://localhost:5174"
PH_PANEL_URL no Plural = "http://localhost:8787"
```

## Rotas Plural → leitura PH

### `GET /api/ph/health`

Confirma chave + BD. Resposta: `{ ok, service, asOf }`.

### `GET /api/ph/summary`

Snapshot de clientes + MRR + custos.

## Rotas PH (proxy / webhook)

| Rota | Quem chama | Notas |
|------|------------|--------|
| `GET /api/plural/status` | Frontend PH | `{ linked }` |
| `GET /api/plural/summary` | Frontend PH | Proxy → Plural summary |
| `POST /api/plural/hook` | Plural (`notifyPh`) | Sync Neon; `marcar-pago`/`renovar`/`ativar` → receita `rove-caixa` |
| `GET\|POST /api/plural/sync` | Cron Vercel (30 min) ou admin | Sync sem receita |

## Resposta `summary` (exemplo)

```json
{
  "asOf": "2026-08-30",
  "mrr": 150000,
  "mrrPainel": 165000,
  "lucroEstimado": 120000,
  "byServico": { "netflix": 80000, "iptv": 70000 },
  "counts": { "ativo": 20, "vencido": 2, "suspenso": 1, "cancelado": 3 },
  "custos": {
    "servidores": 20000,
    "salas": 10000,
    "salaUnit": 5000,
    "salasAtivas": 2
  },
  "clients": [
    {
      "id": "12",
      "nome": "Maria",
      "servico": "netflix",
      "valor": 5000,
      "dataFim": "2026-09-15",
      "status": "ativo"
    }
  ]
}
```

| Campo | Notas |
|-------|--------|
| `status` | `ativo` \| `vencido` \| `suspenso` \| `cancelado` |
| `mrr` | Soma de `valor` dos **activos** |
| `mrrPainel` | Activos + vencidos + suspensos (Stat MRR do PH) |
| `lucroEstimado` | `mrr − servidores − salas` |
| `custos` | Mensalidades → recorrentes `plural-servidores` / `plural-salas` no PH |
| `id` | ID Plural (string); PH prefixa `plural-` |

## Webhook Plural → PH

Após **marcar-pago**, **renovar**, **ativar** ou **suspender**, o Plural faz `POST {PH_PANEL_URL}/api/plural/hook` com Bearer `PH_API_KEY`.

```json
{ "event": "marcar-pago", "clientId": 12, "clientName": "Maria", "amount": 5000 }
```

Pagamentos criam movimento `receita` na liquidez `rove-caixa` (idempotente por nota+dia+valor).

## Deep link

No PH, com `VITE_PLURAL_APP_URL` definido, o nome do cliente abre  
`{VITE_PLURAL_APP_URL}/clientes?id={id}` e o Plural abre o modal de edição.

## Erros

| HTTP | Motivo |
|------|--------|
| 401 | Bearer em falta ou incorrecto |
| 503 | `PH_API_KEY` / `PLURAL_API_*` não definida |

## Teste rápido (local)

```bash
# Plural
npm run test:ph-api
curl -sS -H "Authorization: Bearer SUA_CHAVE" http://localhost:3001/api/ph/health
curl -sS -H "Authorization: Bearer SUA_CHAVE" http://localhost:3001/api/ph/summary

# PH (dev-api :8787)
curl -sS http://localhost:8787/api/plural/status
curl -sS -X POST -H "Authorization: Bearer SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"event":"sync"}' http://localhost:8787/api/plural/hook
```
