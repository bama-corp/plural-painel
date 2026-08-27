# Deploy na Vercel – Ponto 4: Variáveis de ambiente

Este documento descreve **em detalhe** como configurar as variáveis de ambiente no projeto Vercel (passo 4 do deploy).

---

## Onde configurar

1. No **dashboard da Vercel**, abre o teu projeto.
2. Vai a **Settings** (Definições).
3. No menu lateral, clica em **Environment Variables**.

Alternativa: ao importar o repositório pela primeira vez, a Vercel mostra o passo **Configure Project**; aí também podes adicionar variáveis antes do primeiro deploy.

---

## Variáveis obrigatórias

### 1. `DATABASE_URL`

**O que é:** URL de conexão à base de dados PostgreSQL (a API usa-a via Prisma).

**Como obter:**

- **Neon:** [neon.tech](https://neon.tech) → projeto → **Connection string**.  
  **Para Vercel (serverless):** usa a opção **"Pooled connection"** (Transaction pooler), para evitar "too many connections". O host costuma ter `-pooler` no nome (ex.: `ep-xxx-pooler.region.aws.neon.tech`).  
  Formato: `postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
- **Supabase:** Dashboard do projeto → Settings → Database → Connection string (URI). Usa o modo "Session" ou "Transaction" conforme a documentação.
- **Vercel Postgres / outro:** O fornecedor indica a connection string no painel.

**Na Vercel:**

| Campo        | Valor |
|-------------|--------|
| **Key**     | `DATABASE_URL` |
| **Value**   | Cola a URL completa (ex.: `postgresql://user:pass@host/db?sslmode=require`) |
| **Environments** | Marca **Production**. Opcionalmente **Preview** se quiseres que os deploys de preview usem a mesma BD. |

**Importante:** Não partilhes esta URL; contém a palavra-passe da BD.

---

### 1b. `DIRECT_URL` (obrigatório no schema)

O Prisma deste projeto usa `DIRECT_URL` no schema. Na Vercel podes usar o **mesmo valor** que `DATABASE_URL` (por exemplo a mesma connection string do Neon).  
Se usares Neon com **Pooled** em `DATABASE_URL`, no Neon podes copiar a **"Direct connection"** para `DIRECT_URL`, ou, em muitos casos, definir `DIRECT_URL` igual a `DATABASE_URL` também.

---

### 2. `JWT_SECRET`

**O que é:** Chave secreta usada para assinar os tokens de sessão (login). Tem de ser longa e aleatória.

**Como gerar (exemplo no terminal):**

```bash
# Linux / macOS / Git Bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou usa um gerador online de strings aleatórias (ex.: 32+ caracteres) e cola como valor.

**Na Vercel:**

| Campo        | Valor |
|-------------|--------|
| **Key**     | `JWT_SECRET` |
| **Value**   | A string gerada (ex.: `a1b2c3d4e5f6...` com dezenas de caracteres) |
| **Environments** | **Production** (e **Preview** se quiseres) |

**Importante:** Em produção usa sempre um valor forte e nunca o valor de desenvolvimento (ex.: `admin123`).

---

## Variáveis opcionais

### Seed do primeiro admin

Usadas **apenas** se fores criar o admin via seed (`npx tsx prisma/seed.ts`) e o seed ler estas variáveis:

| Key               | Descrição                    | Exemplo |
|-------------------|------------------------------|---------|
| `ADMIN_EMAIL`     | Email do primeiro utilizador admin | `admin@roveplus.com` |
| `ADMIN_PASSWORD`  | Senha do primeiro admin      | Uma senha segura |

**Nota:** O seed corre no teu ambiente (ou num job), não na Vercel. Só precisas destas variáveis na Vercel se tiveres algum script de deploy que rode o seed usando as env da Vercel. Caso contrário, podes defini-las só no teu `.env` local ao correr o seed.

---

### Frontend (API noutro domínio)

| Key             | Descrição |
|-----------------|-----------|
| `VITE_API_URL`  | URL base da API quando o frontend é servido noutro domínio. Ex.: `https://teu-projeto.vercel.app`. Se o frontend e a API estão no mesmo projeto e domínio na Vercel, **podes deixar vazio** (o frontend usa o mesmo domínio para `/api`). |

Se definires valor, o build do Vite vai usar essa URL nas chamadas da API. Em muitos casos não é necessário.

---

### WhatsApp (mensagens automáticas)

Só são necessárias se ativares envio de mensagens (ex.: lembretes, confirmações):

| Key                 | Descrição |
|---------------------|-----------|
| `WHATSAPP_PHONE`    | Número (ex.: `244933623143`) |
| `WHATSAPP_API_URL`  | URL da API de envio (Meta Cloud API, Twilio, etc.) |
| `WHATSAPP_TOKEN`    | Token ou credencial da API |

---

### Cron (alertas automáticos)

Só se usares o endpoint de alertas com Vercel Cron:

| Key            | Descrição |
|----------------|-----------|
| `CRON_SECRET`  | Um segredo que protege o endpoint. No Cron da Vercel, o URL deve incluir `?secret=CRON_SECRET`. |

---

## Resumo rápido – mínimo para avançar

1. **Settings** do projeto → **Environment Variables**.
2. Adicionar:
   - **`DATABASE_URL`** = connection string PostgreSQL (Neon **pooled**, Supabase, etc.).
   - **`DIRECT_URL`** = no Neon pode ser igual a `DATABASE_URL` ou a "Direct connection".
   - **`JWT_SECRET`** = chave longa e aleatória (ex.: saída do `crypto.randomBytes(32).toString('hex')`).
3. Escolher **Production** (e **Preview** se quiseres).
4. Guardar e fazer **Redeploy** (Deploy → Redeploy) para as variáveis serem aplicadas.

Depois do primeiro deploy, não esquecer: criar tabelas e admin na BD (por exemplo com `npx prisma db push` e `npx tsx prisma/seed.ts` a partir do teu PC com a mesma `DATABASE_URL`). Ver README para o ponto 6.

---

## Se o login não funcionar (erro de BD)

1. **Testar a API:** abre no browser `https://teu-dominio.vercel.app/api/health`.  
   - Se aparecer `{"ok":true,"db":"connected"}` → a BD está a responder; o problema pode ser credenciais ou cookie.  
   - Se aparecer `{"ok":false,"db":"error",...}` → a API não consegue ligar à BD: confirma `DATABASE_URL` e `DIRECT_URL` na Vercel e usa **Pooled** no Neon.
2. Confirma que **Production** (e Preview se usares) têm as variáveis definidas.
3. Depois de alterar variáveis, faz **Redeploy** do projeto.

