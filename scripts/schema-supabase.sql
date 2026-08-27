-- Executar no Supabase: SQL Editor → New query → colar e Run
-- Usar se db:push ficar preso (pooler em modo transaction)

CREATE TABLE IF NOT EXISTS "User" (
  "id" SERIAL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'suporte',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "servidores" (
  "id" SERIAL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'principal',
  "total_clientes" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'online',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" SERIAL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "plano" TEXT NOT NULL,
  "servidorId" INTEGER REFERENCES "servidores"("id"),
  "perfil" TEXT,
  "iptvUser" TEXT,
  "iptvPass" TEXT,
  "iptvMac" TEXT,
  "iptvM3u" TEXT,
  "data_inicio" TIMESTAMP(3) NOT NULL,
  "data_fim" TIMESTAMP(3) NOT NULL,
  "valor" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "indicacoes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "indicacoes" (
  "id" SERIAL PRIMARY KEY,
  "indicador_id" INTEGER NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "indicado_nome" TEXT NOT NULL,
  "indicado_whatsapp" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "User"("id"),
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" INTEGER,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "clients_servidorId_idx" ON "clients"("servidorId");
CREATE INDEX IF NOT EXISTS "indicacoes_indicador_id_idx" ON "indicacoes"("indicador_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
