# Rove+ Painel

Painel interno para gestão de **clientes Netflix**, **clientes IPTV**, **servidores**, **revendedores**, **salas Netflix**, **renovações** e **indicações**.

| Stack | Frontend | Backend | BD |
|-------|----------|---------|-----|
| | React, TypeScript, Vite, Tailwind, Framer Motion | Node.js, Express | PostgreSQL (Prisma) |

- **Deploy:** Vercel (frontend + API serverless)
- **WhatsApp:** +244 933623143 (mensagens automáticas opcionais)

---

## Início rápido

```bash
npm install
cp .env.example .env   # editar .env: DATABASE_URL e JWT_SECRET
npm run db:push
npm run db:seed
npm run dev:all
```

Abrir http://localhost:3000 → login: **admin@roveplus.com** / **admin123**.

---

## Funcionalidades

| Área | Descrição |
|------|------------|
| **Login** | Logo Rove+, sessão com cookie httpOnly |
| **Dashboard** | Totais Netflix/IPTV, clientes por servidor, vencendo hoje, receita do mês, indicações, gráficos |
| **Clientes** | Filtros (serviço, servidor, revendedor, sala, status, vencimento), CRUD, Renovar, Marcar como pago, Atribuir sala, Suspender, Ativar. Servidores secundários na lista ao criar cliente. |
| **Servidores** | CRUD IPTV; Principal e Secundário; custo mensal; status: online / instável / offline |
| **Revendedores** | CRUD; Suspender / Ativar; chips total, ativos, suspensos |
| **Salas Netflix** | CRUD; Email e senha da conta; ver/ocultar senha no editar; Suspender / Ativar |
| **Indicações** | Registar, confirmar, editar, reverter, excluir; chips total, pendentes, confirmadas |
| **Utilizadores (admin)** | Criar, editar, redefinir senha, suspender, ativar, eliminar. Perfis: Geral, Netflix, IPTV. |
| **Financeiro (admin)** | Controlo financeiro simples: receita prevista, fluxo de entradas por tipo e por servidor, projeção futura. Não é contabilidade formal – para gestão interna. |
| **Log (admin)** | Auditoria de alterações; filtros por entidade, ação, utilizador e período |
| **Manual** | Guia do utilizador com instruções detalhadas por módulo |
| **Alertas** | Linhas amarelas (3 dias) e vermelhas (vencido); botão Suspender |
| **Tabelas** | Coluna Nº com contagem de linhas em todas as tabelas |
| **WhatsApp** | Mensagens automáticas (cadastro, lembrete 3 dias, vencido, renovado) quando configurado |

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL (local, Supabase, Neon ou Vercel Postgres)

---

## Base de dados

O projeto usa **Prisma** com **PostgreSQL**. Cria um ficheiro **`.env`** na raiz (podes copiar de `.env.example`) e define pelo menos:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="uma-chave-secreta"
```

### Neon (recomendado)

Guia completo: **[docs/CONFIG-NEON.md](docs/CONFIG-NEON.md)**.

1. [neon.tech](https://neon.tech) → **New Project** → copiar a connection string.
2. No `.env`: colar **a mesma URL** em **`DATABASE_URL`** e **`DIRECT_URL`** (com `?sslmode=require` se não vier na URL).
3. `npm run db:push` e `npm run db:seed`.

### Supabase (com Transaction pooler)

Guia completo: **[docs/CONFIG-SUPABASE.md](docs/CONFIG-SUPABASE.md)**. No `.env` precisas de duas URLs (Transaction 6543 e Direct/Session 5432).

### PostgreSQL local

1. Criar base e utilizador (ex.: base `roveplus`, user `roveuser`).
2. No `.env`: `DATABASE_URL="postgresql://roveuser:SENHA@localhost:5432/roveplus?schema=public"`.
3. `npm run db:push` e `npm run db:seed`.

### Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run db:push` | Cria ou atualiza as tabelas na BD |
| `npm run db:seed` | Cria o primeiro admin (usa `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`) |
| `npm run db:studio` | Abre Prisma Studio (interface visual da BD) |

Se a conexão falhar, confirma a URL (user, password, host, porta) e, em serviços na nuvem, que **SSL** está ativo (`sslmode=require` no Supabase/Neon).

---

## Instalação e desenvolvimento

1. **Instalar dependências**
   ```bash
   cd rove-plus
   npm install
   ```

2. **Configurar ambiente**
   - Copiar `.env.example` para `.env`.
   - Preencher `DATABASE_URL` e `JWT_SECRET`; opcionalmente `ADMIN_EMAIL` e `ADMIN_PASSWORD` para o seed.

3. **Criar BD e admin**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Executar**
   ```bash
   npm run dev:all
   ```
   - Frontend: http://localhost:3000 (login é a primeira página)
   - API:   (o Vite faz proxy de `/api` para a API)

   Ou em terminais separados:
   ```bash
   npm run dev        # só frontend
   npm run dev:api    # só API
   ```

---

## Deploy (Vercel)

1. **Base de dados**  
   Usar PostgreSQL (Supabase, Neon, Vercel Postgres, etc.) e definir **`DATABASE_URL`** nas variáveis de ambiente do projeto na Vercel.

2. **Variáveis de ambiente**
   - `DATABASE_URL` – obrigatório
   - `JWT_SECRET` – obrigatório em produção
   - Opcional: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (para seed), `WHATSAPP_PHONE`, `WHATSAPP_API_URL`, `WHATSAPP_TOKEN`, `CRON_SECRET`, `VITE_API_URL` (URL da API em produção)

3. **Build**  
   O `vercel.json` define o comando de build (prisma generate, build:api, vite build). A API é servida em **`/api/*`** como função serverless.

4. **Primeira vez**  
   Após o deploy, criar tabelas e admin (em local com a mesma `DATABASE_URL` ou num job):
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Backup**  
   Usar o backup do fornecedor da BD (Supabase, Neon, etc.) ou agendar `pg_dump` externamente.

6. **Alertas (cron)**  
   Para lembrete “3 dias antes” via WhatsApp, configurar no Vercel um Cron que chame:
   `GET https://teu-dominio.vercel.app/api/cron/alertas?secret=CRON_SECRET`

---

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Frontend (Vite) |
| `npm run dev:api` | API (Express) em watch |
| `npm run dev:all` | Frontend + API em paralelo |
| `npm run build` | Build frontend (tsc + vite) |
| `npm run build:api` | Compila a API (server/dist) |
| `npm run db:push` | Cria/atualiza tabelas |
| `npm run db:seed` | Cria admin inicial |
| `npm | `npm run test:db` | Testa conexão à BD |
run db:studio` | Prisma Studio |
| `npm run db:generate` | Gera Prisma Client |

---

## Estrutura do projeto

```
rove-plus/
├── api/              # Entrada serverless Vercel (re-exporta server)
├── prisma/           # Schema PostgreSQL e seed
├── public/           # Assets estáticos (logo em public/logo/)
├── server/           # API Express (auth, clients, servidores, salas, revendedores, indicacoes, dashboard, audit, cron)
├── src/              # Frontend React (Login, Dashboard, Clientes, Servidores, Revendedores, Salas, Indicações, Utilizadores, Audit, Manual)
├── .env              # Variáveis (não commitar; usar .env.example como base)
├── .env.example      # Exemplo de variáveis
├── vercel.json       # Configuração de build e rewrites## Resolução de problemas

**"Internal Server Error" ou dados não carregam:**
- Usa `npm run dev:all` (não só `npm run dev`) – a API tem de estar na porta 3001.

**"Não puxa os dados da BD":**
1. **Diagnóstico:** `npm run diagnostico` – varre todos os passos (BD, API, login, clients).
2. Se der erro "coluna custoMensal não existe" ou Prisma desatualizado:
   - Para a API (Ctrl+C no terminal)
   - `npx prisma generate`
   - `npm run dev:all`
3. `npm run test:db` – verifica se a BD responde.
4. Faz login – sem sessão, a API devolve 401.

---


└── package.json
```
 `User`):**

| Role | Acesso |
|------|--------|
| **admin** | Tudo + menu Log (auditoria) |
| **geral** | Tudo (clientes Netflix e IPTV, servidores, indicações) |
| **netflix** | Só clientes Netflix; sem menu Servidores |
| **iptv** | Só clientes IPTV; vê servidores e indicações |
| **suporte** | Tratado como **geral** (compatibilidade) |

Criar operadores: via área **Utilizadores** (só admin) com perfis `geral`, `netflix` ou `iptv`. Utilizadores suspensos não conseguem fazer login.

---

## Licença

Uso interno Rove+. Todos os direitos reservados.