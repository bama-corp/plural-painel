import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, getRoleServicoFilter, canAccessServidores, canAccessSalas } from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  const roleFilter = getRoleServicoFilter(user.role)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Atualizar automaticamente para vencido: clientes ativos cuja dataFim já passou
  await prisma.client.updateMany({
    where: { status: 'ativo', dataFim: { lt: today } },
    data: { status: 'vencido' },
  })

  const clientWhereBase = { status: 'ativo' as const }
  const clientWhereNetflix = { ...clientWhereBase, servico: 'netflix' }
  const clientWhereIptv = { ...clientWhereBase, servico: 'iptv' }
  const vencendoWhere = {
    status: 'ativo' as const,
    dataFim: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  }
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)
  const vencendoEm7DiasWhere = {
    status: 'ativo' as const,
    dataFim: { gte: today, lte: in7Days },
  }
  // Salas a vencer (pagamento/data fim nos próximos 7 dias) e já vencidas – antecipar alertas
  const salasVencendoWhere = { status: 'ativo' as const, dataFim: { gte: today, lte: in7Days } }
  const salasVencidasWhere = { status: 'ativo' as const, dataFim: { lt: today } }
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1)
  const fimMes = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const inicioMesAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const fimMesAnterior = new Date(today.getFullYear(), today.getMonth(), 0)

  const clientWhereRole = roleFilter ? { servico: roleFilter } : {}
  const clientWhereVencido = { status: 'vencido' as const, ...clientWhereRole }
  const clientWhereCancelado = { status: 'cancelado' as const, ...clientWhereRole }

  const [
    totalNetflix,
    totalIptv,
    servidores,
    vencendoHoje,
    vencendoEm7Dias,
    clientesVencidos,
    clientesCancelados,
    clientesVencidosNetflix,
    clientesVencidosIptv,
    clientesCanceladosNetflix,
    clientesCanceladosIptv,
    clientesNovosEsteMes,
    indicacoesTotal,
    indicacoesPendentes,
    indicacoesConfirmadas,
    indicacoesEsteMes,
    receitaMesAnterior,
    totalRevendedores,
    clientesComRevendedor,
    clients,
    vencidosValores,
    servidoresList,
    salasVencendo,
    salasVencidas,
    salas,
    custoServidoresIptv,
    totalSalasAtivas,
  ] = await Promise.all([
    roleFilter === 'iptv' ? 0 : prisma.client.count({ where: clientWhereNetflix }),
    roleFilter === 'netflix' ? 0 : prisma.client.count({ where: clientWhereIptv }),
    canAccessServidores(user.role) ? prisma.servidor.findMany({
      select: {
        id: true,
        nome: true,
        status: true,
        _count: { select: { clients: true } },
      },
    }) : [],
    prisma.client.count({
      where: roleFilter ? { ...vencendoWhere, servico: roleFilter } : vencendoWhere,
    }),
    prisma.client.count({
      where: roleFilter ? { ...vencendoEm7DiasWhere, servico: roleFilter } : vencendoEm7DiasWhere,
    }),
    prisma.client.count({ where: clientWhereVencido }),
    prisma.client.count({ where: clientWhereCancelado }),
    prisma.client.count({ where: { ...clientWhereVencido, servico: 'netflix' } }),
    prisma.client.count({ where: { ...clientWhereVencido, servico: 'iptv' } }),
    prisma.client.count({ where: { ...clientWhereCancelado, servico: 'netflix' } }),
    prisma.client.count({ where: { ...clientWhereCancelado, servico: 'iptv' } }),
    prisma.client.count({
      where: { ...clientWhereRole, createdAt: { gte: inicioMes, lte: fimMes } },
    }),
    prisma.indicacao.count(),
    prisma.indicacao.count({ where: { status: 'pendente' } }),
    prisma.indicacao.count({ where: { status: 'confirmada' } }),
    prisma.indicacao.count({
      where: { createdAt: { gte: inicioMes, lte: fimMes } },
    }),
    prisma.client.findMany({
      where: roleFilter ? { servico: roleFilter, dataFim: { gte: inicioMesAnterior, lte: fimMesAnterior } } : { dataFim: { gte: inicioMesAnterior, lte: fimMesAnterior } },
      select: { valor: true },
    }).then((arr) => arr.reduce((s, c) => s + Number(c.valor), 0)),
    canAccessServidores(user.role) ? prisma.revendedor.count() : 0,
    canAccessServidores(user.role) ? prisma.client.count({ where: { ...clientWhereRole, revendedorId: { not: null } } }) : 0,
    prisma.client.findMany({
      where: roleFilter ? { ...clientWhereBase, servico: roleFilter } : clientWhereBase,
      select: { valor: true, dataFim: true, servico: true, servidorId: true },
    }),
    prisma.client.findMany({
      where: {
        status: { in: ['vencido', 'Vencido'] },
        ...(roleFilter ? { servico: roleFilter } : {}),
      },
      select: { valor: true, servico: true },
    }),
    canAccessServidores(user.role)
      ? prisma.servidor.findMany({ select: { id: true, nome: true } })
      : [],
    canAccessSalas(user.role) ? prisma.sala.count({ where: salasVencendoWhere }) : 0,
    canAccessSalas(user.role) ? prisma.sala.count({ where: salasVencidasWhere }) : 0,
    canAccessSalas(user.role)
      ? prisma.sala.findMany({
          select: {
            id: true,
            nome: true,
            _count: { select: { clients: true } },
          },
        })
      : [],
    canAccessServidores(user.role)
      ? prisma
          .$queryRawUnsafe<Array<{ total: number | string }>>(
            `SELECT COALESCE(SUM(mensalidade), 0) as total FROM servidores WHERE tipo = 'principal'`
          )
          .then((r) => Number(r[0]?.total ?? 0))
          .catch(() => 0)
      : 0,
    canAccessSalas(user.role) ? prisma.sala.count({ where: { status: 'ativo' } }) : 0,
  ])

  // Receita do mês = soma dos valores dos clientes cujo vencimento (dataFim) cai no mês atual (dia 1 a fim do mês)
  const clientsNoMes = clients.filter((c) => {
    const df = new Date(c.dataFim)
    return df >= inicioMes && df <= fimMes
  })
  const receitaMes = clientsNoMes.reduce((s, c) => s + Number(c.valor), 0)
  const receitaMesNetflix = clientsNoMes.filter((c) => c.servico === 'netflix').reduce((s, c) => s + Number(c.valor), 0)
  const receitaMesIptv = clientsNoMes.filter((c) => c.servico === 'iptv').reduce((s, c) => s + Number(c.valor), 0)

  // Receita mensal projetada = soma de todos os valores dos clientes ativos (quanto entra por mês)
  const receitaMensalProjetada = clients.reduce((s, c) => s + Number(c.valor), 0)
  const receitaMensalProjetadaNetflix = clients.filter((c) => c.servico === 'netflix').reduce((s, c) => s + Number(c.valor), 0)
  const receitaMensalProjetadaIptv = clients.filter((c) => c.servico === 'iptv').reduce((s, c) => s + Number(c.valor), 0)

  // Valor em dívida (clientes vencidos) – servico normalizado para minúsculas
  const vencidos = (vencidosValores || []) as { valor: unknown; servico: string }[]
  const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : 0)
  const valorVencidoNetflix = vencidos
    .filter((v) => String(v.servico || '').toLowerCase() === 'netflix')
    .reduce((s, v) => s + toNum(v.valor), 0)
  const valorVencidoIptv = vencidos
    .filter((v) => String(v.servico || '').toLowerCase() === 'iptv')
    .reduce((s, v) => s + toNum(v.valor), 0)
  const valorVencidoTotal = valorVencidoNetflix + valorVencidoIptv

  // Receita por servidor (IPTV) – mês atual
  const servidoresMap = new Map<number, { nome: string; receita: number; clientes: number }>()
  for (const s of servidoresList || []) {
    servidoresMap.set((s as { id: number; nome: string }).id, { nome: (s as { id: number; nome: string }).nome, receita: 0, clientes: 0 })
  }
  for (const c of clientsNoMes) {
    if (c.servico === 'iptv') {
      const sid = c.servidorId
      if (sid && servidoresMap.has(sid)) {
        const ent = servidoresMap.get(sid)!
        ent.receita += Number(c.valor)
        ent.clientes += 1
      }
    }
  }
  const receitaPorServidor = Array.from(servidoresMap.entries())
    .map(([id, v]) => ({ servidorId: id, servidorNome: v.nome, receita: Math.round(v.receita * 100) / 100, clientes: v.clientes }))
    .filter((r) => r.clientes > 0)

  // Últimos 6 meses: receita (soma de valor onde dataFim cai no mês) – total e por serviço
  const receitaUltimosMeses: { mes: string; valor: number; valorNetflix?: number; valorIptv?: number }[] = []
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const noMes = clients.filter((c) => {
      const df = new Date(c.dataFim)
      return df >= start && df <= end
    })
    const total = noMes.reduce((s, c) => s + Number(c.valor), 0)
    const totalNetflixMes = noMes.filter((c) => c.servico === 'netflix').reduce((s, c) => s + Number(c.valor), 0)
    const totalIptvMes = noMes.filter((c) => c.servico === 'iptv').reduce((s, c) => s + Number(c.valor), 0)
    receitaUltimosMeses.push({
      mes: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      valor: Math.round(total * 100) / 100,
      valorNetflix: Math.round(totalNetflixMes * 100) / 100,
      valorIptv: Math.round(totalIptvMes * 100) / 100,
    })
  }

  const receitaMesVal = Math.round(receitaMes * 100) / 100
  const receitaMesNetflixVal = Math.round(receitaMesNetflix * 100) / 100
  const receitaMesIptvVal = Math.round(receitaMesIptv * 100) / 100
  const receitaMesAntVal = Math.round((receitaMesAnterior || 0) * 100) / 100
  const variacaoReceita =
    receitaMesAntVal > 0 ? Math.round(((receitaMesVal - receitaMesAntVal) / receitaMesAntVal) * 1000) / 10 : 0
  const receitaProjetadaVal = Math.round(receitaMensalProjetada * 100) / 100
  const salaCustoUnit = Number(process.env.SALA_NETFLIX_CUSTO_MENSAL || 0)
  const custoServidoresIptvVal = Math.round(Number(custoServidoresIptv || 0) * 100) / 100
  const custoSalasNetflixVal = Math.round(Number(totalSalasAtivas || 0) * salaCustoUnit * 100) / 100
  const lucroEstimadoVal = Math.round((receitaProjetadaVal - custoServidoresIptvVal - custoSalasNetflixVal) * 100) / 100
  const valorVencidoNetflixVal = Math.round(valorVencidoNetflix * 100) / 100
  const valorVencidoIptvVal = Math.round(valorVencidoIptv * 100) / 100

  res.json({
    totalNetflix: roleFilter === 'iptv' ? 0 : totalNetflix,
    totalIptv: roleFilter === 'netflix' ? 0 : totalIptv,
    totalClientes: totalNetflix + totalIptv,
    clientesVencidos,
    clientesCancelados,
    clientesVencidosNetflix,
    clientesVencidosIptv,
    clientesCanceladosNetflix,
    clientesCanceladosIptv,
    vencendoHoje,
    vencendoEm7Dias,
    clientesNovosEsteMes,
    clientsByServidor: canAccessServidores(user.role)
      ? servidores.map((s: { id: number; nome: string; status: string; _count: { clients: number } }) => ({
          id: s.id,
          nome: s.nome,
          status: s.status,
          totalClientes: s._count.clients,
        }))
      : [],
    clientsBySala: canAccessSalas(user.role)
      ? salas.map((s: { id: number; nome: string; _count: { clients: number } }) => ({
          id: s.id,
          nome: s.nome,
          totalClientes: s._count.clients,
        }))
      : [],
    receitaMes: receitaMesVal,
    receitaMesNetflix: receitaMesNetflixVal,
    receitaMesIptv: receitaMesIptvVal,
    receitaMesAnterior: receitaMesAntVal,
    variacaoReceita,
    receitaMensalProjetada: receitaProjetadaVal,
    receitaMensalProjetadaNetflix: Math.round(receitaMensalProjetadaNetflix * 100) / 100,
    receitaMensalProjetadaIptv: Math.round(receitaMensalProjetadaIptv * 100) / 100,
    valorVencidoNetflix: valorVencidoNetflixVal,
    valorVencidoIptv: valorVencidoIptvVal,
    valorVencidoTotal: valorVencidoNetflixVal + valorVencidoIptvVal,
    receitaPorServidor,
    indicacoesTotal,
    indicacoesPendentes,
    indicacoesConfirmadas,
    indicacoesEsteMes,
    totalRevendedores: totalRevendedores ?? 0,
    clientesComRevendedor: clientesComRevendedor ?? 0,
    receitaUltimosMeses,
    salasVencendo: salasVencendo ?? 0,
    salasVencidas: salasVencidas ?? 0,
    custoServidoresIptv: custoServidoresIptvVal,
    custoSalasNetflix: custoSalasNetflixVal,
    lucroEstimado: lucroEstimadoVal,
    totalSalasAtivas: totalSalasAtivas ?? 0,
  })
})

export default router
