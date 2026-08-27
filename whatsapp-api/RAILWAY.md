# Deploy Railway

Ver também [README.md](./README.md) e a documentação completa no repositório do painel: `docs/RAILWAY-WHATSAPP.md`.

## Deploy rápido

1. Push deste repositório para GitHub.
2. [Railway](https://railway.app) → New Project → Deploy from GitHub → `roveplus-whatsapp-api`.
3. **Importante — usar Docker, não Nixpacks:**
   - Serviço → **Settings** → **Build** → **Builder** → escolher **Dockerfile**
   - Confirmar que o `Dockerfile` está na raiz do repo
   - **Redeploy**
4. Nos logs deve aparecer: `API WhatsApp Rove+ em http://0.0.0.0:8080` e `[WhatsApp] Chromium: /usr/bin/chromium-rove`
   - Se aparecer `Node.js v18` + erro `libglib-2.0.so.0`, ainda está em Nixpacks — repetir passo 3.
5. Variables: `WHATSAPP_TOKEN` (obrigatório), `WWEBJS_AUTH_PATH=/data/.wwebjs_auth`.
6. Volume: mount **`/data`** (sessão WhatsApp persistente).
7. Generate Domain → abrir **`https://SEU-DOMINIO/pair`** e escanear QR.

## Painel Rove+ (Vercel)

```
WHATSAPP_API_URL=https://SEU-DOMINIO-RAILWAY
WHATSAPP_TOKEN=<mesmo token>
CRON_SECRET=<segredo cron>
```

Redeploy o painel. Os alertas em `/api/cron/alertas` passam a enviar WhatsApp aos clientes.
