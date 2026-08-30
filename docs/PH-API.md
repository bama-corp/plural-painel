# API para o painel PH (`/api/ph/summary`)

Endpoint de **leitura** (clientes + MRR + lucro estimado) para sincronizar com outro painel.
Não expõe PINs, senhas IPTV nem credenciais de salas.

## Auth

Header obrigatório:

```http
Authorization: Bearer <PH_API_KEY>
```

`PH_API_KEY` define-se no Plural (`.env` / Vercel). No painel PH usa-se o **mesmo** valor em `VITE_PLURAL_API_KEY`.

## Configuração

### Neste projeto (Plural)

1. Gera uma chave:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Cola em `.env`:
   ```env
   PH_API_KEY="a_tua_chave"
   ```
3. Em produção (Vercel → Environment Variables):
   - `PH_API_KEY` = a mesma chave
   - `CORS_ORIGINS` = inclui a origem do painel PH (ex.: `https://teu-ph.vercel.app`)
4. Redeploy.

### No outro painel (PH)

```env
VITE_PLURAL_API_URL="https://plural-painel.vercel.app"
VITE_PLURAL_API_KEY="a_mesma_chave"
```

Em local:

```env
VITE_PLURAL_API_URL="http://localhost:3001"
VITE_PLURAL_API_KEY="a_mesma_chave"
```

## Pedido

```http
GET /api/ph/summary
Authorization: Bearer <PH_API_KEY>
```

## Resposta (exemplo)

```json
{
  "asOf": "2026-08-30",
  "mrr": 150000,
  "lucroEstimado": 120000,
  "byServico": { "netflix": 80000, "iptv": 70000 },
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
| `status` | `ativo` \| `vencido` \| `cancelado` (antes da resposta, ativos com `dataFim` passada passam a `vencido`) |
| `mrr` | Soma de `valor` dos clientes **ativos** |
| `lucroEstimado` | `mrr − mensalidades servidores principais − (salas ativas × SALA_NETFLIX_CUSTO_MENSAL)` |
| `id` | ID numérico do Plural como string (o PH prefixa `plural-`) |

## Erros

| HTTP | Motivo |
|------|--------|
| 401 | Bearer em falta ou incorrecto |
| 503 | `PH_API_KEY` não definida no Plural |

## Teste rápido (local)

Com `npm run dev:all` e `PH_API_KEY` preenchida:

```bash
curl -sS -H "Authorization: Bearer SUA_CHAVE" http://localhost:3001/api/ph/summary
```
