import { prisma } from './prisma.js'
import { notifyPanelUsers, formatDateBr } from './whatsappNotify.js'

export type PanelBadgeDigestStats = {
  clientesVencidos: number
  vencendoEm7Dias: number
  salasVencidas: number
  salasVencendo: number
  indicacoesPendentes: number
  servidoresOffline: number
}

/**
 * Agrega as mesmas categorias do badge do sino (/notificacoes).
 */
export async function collectPanelBadgeStats(): Promise<PanelBadgeDigestStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)

  const [
    clientesVencidos,
    vencendoEm7Dias,
    salasVencidas,
    salasVencendo,
    indicacoesPendentes,
    servidoresOffline,
  ] = await Promise.all([
    prisma.client.count({ where: { status: 'vencido' } }),
    prisma.client.count({
      where: { status: 'ativo', dataFim: { gte: today, lte: in7Days } },
    }),
    prisma.sala.count({ where: { status: 'ativo', dataFim: { lt: today } } }),
    prisma.sala.count({ where: { status: 'ativo', dataFim: { gte: today, lte: in7Days } } }),
    prisma.indicacao.count({ where: { status: 'pendente' } }),
    prisma.servidor.count({ where: { status: { in: ['instável', 'offline'] } } }),
  ])

  return {
    clientesVencidos,
    vencendoEm7Dias,
    salasVencidas,
    salasVencendo,
    indicacoesPendentes,
    servidoresOffline,
  }
}

function formatDigestLines(stats: PanelBadgeDigestStats): string[] {
  return [
    stats.clientesVencidos > 0 ? `Clientes vencidos: ${stats.clientesVencidos}` : null,
    stats.vencendoEm7Dias > 0 ? `A vencer (7 dias): ${stats.vencendoEm7Dias}` : null,
    stats.salasVencidas > 0 ? `Salas vencidas: ${stats.salasVencidas}` : null,
    stats.salasVencendo > 0 ? `Salas a vencer: ${stats.salasVencendo}` : null,
    stats.indicacoesPendentes > 0 ? `Indicações pendentes: ${stats.indicacoesPendentes}` : null,
    stats.servidoresOffline > 0
      ? `Servidores offline/instáveis: ${stats.servidoresOffline}`
      : null,
  ].filter((l): l is string => !!l)
}

export function panelBadgeDigestHasItems(stats: PanelBadgeDigestStats): boolean {
  return formatDigestLines(stats).length > 0
}

/**
 * Envia para o ntfy o mesmo resumo que alimenta o sino do painel.
 * Inclui nomes das salas/servidores problemáticos quando existirem.
 */
export async function notifyPanelBadgeDigest(opts?: {
  extraLines?: string[]
  testMessage?: string
}): Promise<{ sent: boolean; stats: PanelBadgeDigestStats }> {
  if (opts?.testMessage) {
    void notifyPanelUsers('resumo', opts.testMessage)
    return { sent: true, stats: await collectPanelBadgeStats() }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)

  const [stats, salasVencendo, salasVencidas, servidoresProblema] = await Promise.all([
    collectPanelBadgeStats(),
    prisma.sala.findMany({
      where: { status: 'ativo', dataFim: { gte: today, lte: in7Days } },
      select: { nome: true, dataFim: true },
      orderBy: { dataFim: 'asc' },
      take: 5,
    }),
    prisma.sala.findMany({
      where: { status: 'ativo', dataFim: { lt: today } },
      select: { nome: true, dataFim: true },
      orderBy: { dataFim: 'asc' },
      take: 5,
    }),
    prisma.servidor.findMany({
      where: { status: { in: ['instável', 'offline'] } },
      select: { nome: true, status: true, _count: { select: { clients: true } } },
      orderBy: { nome: 'asc' },
      take: 5,
    }),
  ])

  const lines = formatDigestLines(stats)
  if (opts?.extraLines?.length) {
    for (const line of opts.extraLines) {
      if (line.trim()) lines.push(line.trim())
    }
  }

  if (lines.length === 0) {
    return { sent: false, stats }
  }

  const detail: string[] = []
  if (salasVencidas.length > 0 && stats.salasVencidas > 0) {
    detail.push(
      `Salas vencidas: ${salasVencidas
        .map((s) => `${s.nome} (${formatDateBr(s.dataFim!)})`)
        .join(', ')}${stats.salasVencidas > 5 ? '…' : ''}`
    )
  }
  if (salasVencendo.length > 0 && stats.salasVencendo > 0) {
    detail.push(
      `Salas a vencer: ${salasVencendo
        .map((s) => `${s.nome} (${formatDateBr(s.dataFim!)})`)
        .join(', ')}${stats.salasVencendo > 5 ? '…' : ''}`
    )
  }
  if (servidoresProblema.length > 0 && stats.servidoresOffline > 0) {
    detail.push(
      `Servidores: ${servidoresProblema
        .map((s) => `${s.nome} (${s.status}, ${s._count.clients} cliente(s))`)
        .join(', ')}${stats.servidoresOffline > 5 ? '…' : ''}`
    )
  }

  // Evitar duplicar linhas de salas/servidores quando já temos detalhe
  const summaryOnly = lines.filter(
    (l) =>
      !l.startsWith('Salas vencidas:') &&
      !l.startsWith('Salas a vencer:') &&
      !l.startsWith('Servidores offline')
  )

  const body = ['🔔 Sino do painel', ...summaryOnly, ...detail].join('\n')
  void notifyPanelUsers('resumo', body)
  return { sent: true, stats }
}
