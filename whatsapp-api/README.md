# API de WhatsApp - Rove+ Painel

Microservico Node.js que recebe chamadas HTTP e envia mensagens via WhatsApp Web (`whatsapp-web.js`).

## Requisitos

- Node.js 18+
- Numero de WhatsApp para ligar via QR Code

## Instalacao

```bash
cd whatsapp-api
npm install
```

## Arrancar o servico

```bash
npm start
```

Ou diretamente:

```bash
node server.js
```

Por defeito, a API sobe em `http://localhost:3002` (ou `PORT` se definida).

## Ligar o WhatsApp (QR Code)

1. Arranca a API com `npm start`.
2. No terminal vai aparecer um QR Code.
3. No telemovel: WhatsApp -> Dispositivos ligados -> Ligar um dispositivo.
4. Escaneia o QR.
5. Quando conectar, o terminal mostra: `WhatsApp conectado!`.

A sessao fica persistida em `.wwebjs_auth/` (ou no caminho de `WWEBJS_AUTH_PATH`).

## Variaveis de ambiente

| Variavel | Obrigatorio | Descricao |
|---|---|---|
| `PORT` | Nao | Porta da API (default: `3002`). |
| `WHATSAPP_TOKEN` | Recomendado | Token para proteger endpoints (`Authorization: Bearer ...`). |
| `WWEBJS_AUTH_PATH` | Nao | Caminho da sessao local do WhatsApp (default: `./.wwebjs_auth`). |

Exemplo `.env`:

```env
PORT=3002
WHATSAPP_TOKEN=seu_token_secreto
WWEBJS_AUTH_PATH=./.wwebjs_auth
```

## Endpoints

### `GET /status`

Retorna estado da ligacao com o WhatsApp.

```json
{ "connected": true }
```

### `POST /send`

Envia mensagem para um numero.

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer <WHATSAPP_TOKEN>` (quando `WHATSAPP_TOKEN` estiver definido)

Body:

```json
{
  "phone": "244912345678",
  "message": "texto da mensagem"
}
```

Resposta de sucesso:

```json
{
  "success": true,
  "message": "Mensagem enviada"
}
```

Erros comuns:

- `400`: phone/message invalidos
- `401`: token ausente/invalido (se token configurado)
- `503`: WhatsApp nao conectado
- `500`: falha no envio

### `GET /pair`

Página HTML com QR Code (ideal no Railway). Atualiza automaticamente até ligar.

### `GET /qr`

JSON com QR em data URL (requer Bearer token se configurado).

### `GET /health`

Health check simples (util para monitorizacao):

```json
{ "ok": true, "whatsapp": true }
```

## Teste rapido

Na pasta `whatsapp-api`:

```bash
node test-api.js
```

Enviar para outro numero:

```bash
node test-api.js 244912345678
```

Se usares token:

- Windows (PowerShell):
  ```powershell
  $env:WHATSAPP_TOKEN="seu_token"
  node test-api.js
  ```
- Linux/macOS:
  ```bash
  WHATSAPP_TOKEN=seu_token node test-api.js
  ```

## Integracao com o backend do Rove+

No backend principal, configura:

- `WHATSAPP_API_URL=http://localhost:3002`
- `WHATSAPP_TOKEN=<mesmo valor da API WhatsApp>`

A API espera payload no formato:

```json
{
  "phone": "244...",
  "message": "..."
}
```

## Producao (Railway — recomendado)

Deploy com Docker + volume persistente. Guia completo: [RAILWAY.md](./RAILWAY.md) e no painel `docs/RAILWAY-WHATSAPP.md`.

Resumo:

1. Deploy do repo no [Railway](https://railway.app) (Dockerfile incluído).
2. Variáveis: `WHATSAPP_TOKEN`, `WWEBJS_AUTH_PATH=/data/.wwebjs_auth`.
3. Volume montado em `/data`.
4. Abrir `https://SEU-DOMINIO/pair` e escanear o QR.
5. No painel Vercel: `WHATSAPP_API_URL` + `WHATSAPP_TOKEN` (mesmo token).

## Producao (VPS local)

- Mantem o servico sempre ligado.
- Usa volume persistente para `WWEBJS_AUTH_PATH`.
- Configura `WHATSAPP_TOKEN` em producao.
- Na primeira execucao, faz o scan do QR nos logs/terminal.

## Fluxo resumido

```text
Rove+ Backend -> POST /send -> WhatsApp API -> whatsapp-web.js -> WhatsApp Web -> cliente recebe
```

---

Arquivo principal da API: `whatsapp-api/server.js`.
