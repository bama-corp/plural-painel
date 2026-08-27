# WhatsApp API no Railway — alertas Rove+

A API em `whatsapp-api/` envia mensagens via WhatsApp Web (`whatsapp-web.js`). O painel (Vercel) chama `POST /send`; o **cron diário** (`/api/cron/alertas`) envia lembretes de renovação e avisos de vencimento.

Repositório da API: [BPA-Inovacoes/roveplus-whatsapp-api](https://github.com/BPA-Inovacoes/roveplus-whatsapp-api)

---

## 1. Deploy no Railway

1. Entra em [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Escolhe o repositório **`roveplus-whatsapp-api`** (pasta raiz = API WhatsApp).
3. Railway detecta o `Dockerfile` e `railway.toml`.

### Variáveis no Railway (Settings → Variables)

| Variável | Valor |
|----------|--------|
| `WHATSAPP_TOKEN` | Token longo e aleatório (ex.: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `WWEBJS_AUTH_PATH` | `/data/.wwebjs_auth` |

`PORT` é definido automaticamente pelo Railway.

### Volume persistente (obrigatório)

Sem volume, terás de escanear o QR em cada redeploy.

1. No serviço Railway → **Volumes** → **Add Volume**.
2. Mount path: **`/data`**
3. Redeploy.

### Domínio público

1. **Settings** → **Networking** → **Generate Domain** (ex.: `roveplus-whatsapp-production.up.railway.app`).
2. Anota a URL — será o `WHATSAPP_API_URL` no painel.

---

## 2. Ligar o WhatsApp (QR Code)

1. Após o deploy, abre no browser:
   ```
   https://SEU-DOMINIO-RAILWAY/pair
   ```
2. No telemóvel: **WhatsApp → Dispositivos ligados → Ligar dispositivo** → escaneia o QR.
3. Confirma: `GET https://SEU-DOMINIO/health` → `{ "ok": true, "whatsapp": true }`.

A sessão fica guardada no volume `/data/.wwebjs_auth`.

---

## 3. Configurar o painel (Vercel)

No projeto Vercel do painel, **Settings → Environment Variables**:

| Variável | Exemplo |
|----------|---------|
| `WHATSAPP_PHONE` | `244933623143` |
| `WHATSAPP_API_URL` | `https://roveplus-whatsapp-production.up.railway.app` |
| `WHATSAPP_TOKEN` | **O mesmo** token definido no Railway |
| `CRON_SECRET` | Segredo para o cron (ver abaixo) |

**Redeploy** o painel após guardar.

---

## 4. Alertas automáticos (cron)

O `vercel.json` já agenda o cron diário às 05:00 UTC:

```json
"path": "/api/cron/alertas"
```

Com `CRON_SECRET` definido na Vercel, a Vercel envia `Authorization: Bearer <CRON_SECRET>`.

### Teste manual

```bash
curl "https://SEU-PAINEL.vercel.app/api/cron/alertas?secret=SEU_CRON_SECRET"
```

Ou só alerta admin (sem mensagens a clientes):

```bash
curl "https://SEU-PAINEL.vercel.app/api/cron/alertas?secret=SEU_CRON_SECRET&testAdmin=1"
```

### O que o cron envia

- **Clientes** com renovação nos próximos 7 dias → lembrete WhatsApp
- **Clientes vencidos** → aviso + marca como `vencido`
- **Admins** (utilizadores com role `admin` e WhatsApp no perfil) → resumo de salas/servidores

---

## 5. Testar envio

Na pasta `whatsapp-api` (local ou contra Railway):

```bash
WHATSAPP_API_URL=https://SEU-DOMINIO-RAILWAY WHATSAPP_TOKEN=seu_token node test-api.js 2449XXXXXXXX
```

---

## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Não | Health check |
| GET | `/pair` | Não | Página QR para parear |
| GET | `/status` | Bearer | Estado da ligação |
| GET | `/qr` | Bearer | QR em JSON (data URL) |
| POST | `/send` | Bearer | Enviar mensagem `{ phone, message }` |

---

## Resolução de problemas

| Problema | Solução |
|----------|---------|
| `503 WhatsApp não conectado` | Abrir `/pair` e escanear QR |
| Sessão perdida após deploy | Verificar volume montado em `/data` |
| `401 Token inválido` | `WHATSAPP_TOKEN` igual no Railway e na Vercel |
| Mensagens não saem no cron | Confirmar `WHATSAPP_API_URL` + redeploy Vercel; ver logs da função |
| Chromium crash no Railway | Redeploy; o Dockerfile já inclui dependências |

---

## Fluxo

```text
Vercel Cron → /api/cron/alertas → sendWhatsAppMessage()
     → Railway POST /send → whatsapp-web.js → cliente recebe WhatsApp
```
