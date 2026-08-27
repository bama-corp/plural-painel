# Configurar Neon para o Rove+ Painel

O **Neon** é um PostgreSQL na nuvem (plano gratuito disponível). Uma única connection string serve para runtime e migrações.

---

## 1. Criar o projeto no Neon

1. Entra em [neon.tech](https://neon.tech) e faz login (ou cria conta).
2. Clica em **New Project**.
3. Dá um **nome** ao projeto (ex.: `rove-plus`) e escolhe a **region** (ex.: Europe).
4. Clica em **Create project**.

---

## 2. Copiar a connection string

1. No dashboard do projeto, a **connection string** aparece logo após criar (ou em **Connection details**).
2. Escolhe **Pooled connection** (recomendado para serverless) ou **Direct connection**.
3. Clica em **Copy** – a URL tem este formato:
   ```text
   postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   O Neon já inclui `?sslmode=require` na maioria dos casos. Se não tiver, acrescenta no final.

---

## 3. Configurar o `.env`

1. Na raiz do projeto (rove-plus), abre o ficheiro **`.env`**.
2. Coloca **a mesma URL** em **`DATABASE_URL`** e **`DIRECT_URL`** (com Neon não precisas de duas URLs diferentes).

Exemplo:

```env
# Neon – mesma URL nas duas variáveis
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="uma-chave-secreta"
ADMIN_EMAIL="admin@roveplus.com"
ADMIN_PASSWORD="admin123"
```

Substitui pela connection string que copiaste do Neon.

---

## 4. Criar tabelas e admin

No terminal, na pasta do projeto:

```bash
npm run db:push
npm run db:seed
```

- **`db:push`** – cria as tabelas na base Neon.
- **`db:seed`** – cria o utilizador admin (email e senha do `.env`).

---

## 5. Resumo

| Passo | Onde | O quê |
|-------|------|--------|
| 1 | neon.tech → New Project | Criar projeto e região |
| 2 | Dashboard Neon | Copiar connection string (Pooled ou Direct) |
| 3 | Projeto → `.env` | Colar a mesma URL em `DATABASE_URL` e `DIRECT_URL` |
| 4 | Terminal | `npm run db:push` e `npm run db:seed` |
| 5 | Browser | http://localhost:3000 → login com `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

Em produção (ex.: Vercel), define as mesmas variáveis `DATABASE_URL` e `DIRECT_URL` no ambiente do deploy.
