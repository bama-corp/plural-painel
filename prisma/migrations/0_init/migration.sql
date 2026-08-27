-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'geral',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "alert_scopes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "rove_id" TEXT,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "localizacao" TEXT,
    "servico" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "servidorId" INTEGER,
    "revendedor_id" INTEGER,
    "perfil" TEXT,
    "pin" TEXT,
    "iptvUser" TEXT,
    "iptvPass" TEXT,
    "iptvMac" TEXT,
    "iptvM3u" TEXT,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "inscricao_paga" BOOLEAN,
    "sala_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "indicacoes" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_notificado_vencimento_at" TIMESTAMP(3),
    "portal_pin_hash" TEXT,
    "portal_pin_plain" TEXT,
    "portal_first_login" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "senha" TEXT,
    "observacoes" TEXT,
    "data_fim" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servidores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'principal',
    "servidor_id" INTEGER,
    "total_clientes" INTEGER NOT NULL DEFAULT 0,
    "mensalidade" DECIMAL(10,2),
    "data_pagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'online',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revendedores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "servidor_id" INTEGER,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicacoes" (
    "id" SERIAL NOT NULL,
    "indicador_id" INTEGER NOT NULL,
    "indicado_nome" TEXT NOT NULL,
    "indicado_whatsapp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_rove_id_key" ON "clients"("rove_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_revendedor_id_fkey" FOREIGN KEY ("revendedor_id") REFERENCES "revendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servidores" ADD CONSTRAINT "servidores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revendedores" ADD CONSTRAINT "revendedores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
