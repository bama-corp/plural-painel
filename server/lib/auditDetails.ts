import type { Request } from 'express'
import { prisma } from './prisma.js'
import { formatRoveDate } from './roveDates.js'

type Jsonish = Record<string, unknown>

function bodyOf(req: Request): Jsonish {
  return req.body && typeof req.body === 'object' ? (req.body as Jsonish) : {}
}

function asRecord(v: unknown): Jsonish | null {
  return v && typeof v === 'object' ? (v as Jsonish) : null
}

function fmtDate(v: unknown): string {
  return formatRoveDate(v)
}

function fmtMoney(v: unknown): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toFixed(2)} kz` : String(v)
}

function joinParts(parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(' · ')
}

const CLIENT_FIELDS: Record<string, string> = {
  nome: 'nome',
  whatsapp: 'WhatsApp',
  servico: 'serviço',
  plano: 'plano',
  valor: 'mensalidade',
  dataFim: 'data fim',
  dataInicio: 'data início',
  status: 'estado',
  inscricaoPaga: 'inscrição',
  perfil: 'perfil',
  pin: 'PIN Netflix',
}

export async function loadEntitySnapshot(
  entity: string,
  entityId: number
): Promise<Jsonish | null> {
  if (!Number.isFinite(entityId) || entityId < 1) return null
  try {
    switch (entity) {
      case 'client': {
        const c = await prisma.client.findUnique({
          where: { id: entityId },
          select: {
            nome: true,
            whatsapp: true,
            servico: true,
            plano: true,
            valor: true,
            dataFim: true,
            dataInicio: true,
            status: true,
            inscricaoPaga: true,
          },
        })
        return c as Jsonish | null
      }
      case 'servidor': {
        const s = await prisma.servidor.findUnique({
          where: { id: entityId },
          select: { nome: true, tipo: true, status: true },
        })
        return s as Jsonish | null
      }
      case 'sala': {
        const s = await prisma.sala.findUnique({
          where: { id: entityId },
          select: { nome: true, dataFim: true },
        })
        return s as Jsonish | null
      }
      case 'revendedor': {
        const r = await prisma.revendedor.findUnique({
          where: { id: entityId },
          select: { nome: true, contacto: true },
        })
        return r as Jsonish | null
      }
      case 'indicacao': {
        const i = await prisma.indicacao.findUnique({
          where: { id: entityId },
          select: { indicadoNome: true, indicadoWhatsapp: true, status: true },
        })
        return i as Jsonish | null
      }
      case 'user': {
        const u = await prisma.user.findUnique({
          where: { id: entityId },
          select: { nome: true, email: true, role: true },
        })
        return u as Jsonish | null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

function clientSummary(snap: Jsonish | null, fallbackNome?: string): string {
  const nome = String(snap?.nome ?? fallbackNome ?? 'Cliente')
  const servico = snap?.servico ? String(snap.servico).toUpperCase() : null
  const wa = snap?.whatsapp ? String(snap.whatsapp) : null
  return joinParts([nome, servico, wa])
}

function diffClientFields(before: Jsonish | null, body: Jsonish): string[] {
  const changes: string[] = []
  if (body.portalPin !== undefined) {
    changes.push(
      body.portalPin === null || String(body.portalPin).trim() === ''
        ? 'PIN área cliente removido'
        : 'PIN área cliente redefinido'
    )
  }
  for (const [key, label] of Object.entries(CLIENT_FIELDS)) {
    if (body[key] === undefined) continue
    const rawNew = body[key]
    const rawOld = before?.[key]
    let newStr: string
    let oldStr: string
    if (key === 'valor') {
      newStr = fmtMoney(rawNew)
      oldStr = fmtMoney(rawOld)
    } else if (key === 'dataFim' || key === 'dataInicio') {
      newStr = fmtDate(rawNew)
      oldStr = fmtDate(rawOld)
    } else if (key === 'inscricaoPaga') {
      newStr = rawNew ? 'paga' : 'pendente'
      oldStr = rawOld ? 'paga' : rawOld === false ? 'pendente' : '—'
    } else {
      newStr = rawNew == null || rawNew === '' ? '—' : String(rawNew)
      oldStr = rawOld == null || rawOld === '' ? '—' : String(rawOld)
    }
    if (newStr !== oldStr) changes.push(`${label}: ${oldStr} → ${newStr}`)
  }
  return changes
}

export async function buildAuditDetails(
  action: string,
  entity: string,
  entityId: number | undefined,
  req: Request,
  responseBody: unknown,
  beforeSnapshot: unknown
): Promise<string> {
  const body = bodyOf(req)
  const res = asRecord(responseBody)
  const before = asRecord(beforeSnapshot)

  switch (action) {
    case 'create_client':
      return joinParts([
        res?.nome ? `Cliente "${res.nome}"` : body.nome ? `Cliente "${body.nome}"` : 'Novo cliente',
        body.servico ? String(body.servico).toUpperCase() : null,
        body.plano ? `plano ${body.plano}` : null,
        body.valor != null ? fmtMoney(body.valor) : null,
        body.dataFim ? `vence ${fmtDate(body.dataFim)}` : null,
        body.whatsapp ? `WhatsApp ${body.whatsapp}` : null,
      ])

    case 'update_client': {
      const summary = clientSummary(before ?? res, res?.nome as string | undefined)
      const changes = diffClientFields(before, body)
      if (changes.length) return `${summary} — ${changes.join('; ')}`
      return summary || 'Cliente atualizado'
    }

    case 'renew_client': {
      const mesesAdd = Number(body.meses) || (body.dias ? Math.max(1, Math.round(Number(body.dias) / 30)) : 1)
      const nome = String(res?.nome ?? before?.nome ?? 'Cliente')
      const novaFim = fmtDate(res?.dataFim)
      const antigaFim = before ? fmtDate(before.dataFim) : null
      return joinParts([
        `"${nome}" renovado +${mesesAdd} mês(es)`,
        antigaFim && novaFim !== '—' ? `data fim ${antigaFim} → ${novaFim}` : novaFim !== '—' ? `nova data fim ${novaFim}` : null,
        body.valor != null ? `mensalidade ${fmtMoney(body.valor)}` : res?.valor != null ? `mensalidade ${fmtMoney(res.valor)}` : null,
      ])
    }

    case 'mark_paid_client': {
      const nome = String(res?.nome ?? before?.nome ?? 'Cliente')
      const fim = fmtDate(res?.dataFim ?? body.dataFim ?? before?.dataFim)
      return `"${nome}": pagamento registado, válido até ${fim}`
    }

    case 'suspend_client': {
      const nome = String(res?.nome ?? before?.nome ?? 'Cliente')
      const fim = fmtDate(res?.dataFim ?? before?.dataFim)
      return `"${nome}" suspenso (vencido) — vencia ${fim}`
    }

    case 'activate_client': {
      const nome = String(res?.nome ?? before?.nome ?? 'Cliente')
      const fim = fmtDate(res?.dataFim)
      const estava = before?.status ? `estava ${before.status}` : null
      return joinParts([`"${nome}" reativado`, estava, fim !== '—' ? `nova data fim ${fim}` : null])
    }

    case 'delete_client': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('client', entityId) : null)
      const nome = String(snap?.nome ?? 'Cliente')
      return joinParts([
        `Eliminado "${nome}"`,
        snap?.servico ? String(snap.servico).toUpperCase() : null,
        snap?.whatsapp ? String(snap.whatsapp) : null,
        snap?.valor != null ? fmtMoney(snap.valor) : null,
      ])
    }

    case 'create_servidor':
      return joinParts([
        res?.nome ? `Servidor "${res.nome}"` : body.nome ? `Servidor "${body.nome}"` : 'Novo servidor',
        body.tipo ? `tipo ${body.tipo}` : res?.tipo ? `tipo ${res.tipo}` : null,
        body.mensalidade != null ? fmtMoney(body.mensalidade) : null,
      ])

    case 'update_servidor': {
      const nome = String(res?.nome ?? before?.nome ?? 'Servidor')
      const parts: string[] = []
      if (body.nome && before?.nome && body.nome !== before.nome) parts.push(`nome: ${before.nome} → ${body.nome}`)
      if (body.status && before?.status) parts.push(`estado: ${before.status} → ${body.status}`)
      if (body.mensalidade !== undefined) parts.push(`mensalidade: ${fmtMoney(body.mensalidade)}`)
      if (body.dataPagamento) parts.push(`data pagamento: ${fmtDate(body.dataPagamento)}`)
      return parts.length ? `"${nome}" — ${parts.join('; ')}` : `"${nome}" atualizado`
    }

    case 'suspend_servidor': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('servidor', entityId) : null)
      return `Servidor "${snap?.nome ?? '—'}" passou a offline`
    }

    case 'pay_servidor_month': {
      const meses = Number(body.meses) || 1
      const snap = before ?? (entityId ? await loadEntitySnapshot('servidor', entityId) : null)
      const nome = String(res?.nome ?? snap?.nome ?? 'Servidor')
      const novaData = fmtDate(res?.dataPagamento)
      return joinParts([
        `"${nome}": pagamento de ${meses} mês(es) registado`,
        snap?.nome && body.mensalidade == null && res?.mensalidade != null ? fmtMoney(res.mensalidade) + '/mês' : null,
        novaData !== '—' ? `próximo pagamento ${novaData}` : null,
      ])
    }

    case 'delete_servidor': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('servidor', entityId) : null)
      return `Eliminado servidor "${snap?.nome ?? entityId}"`
    }

    case 'create_sala':
      return joinParts([
        res?.nome ? `Sala "${res.nome}"` : body.nome ? `Sala "${body.nome}"` : 'Nova sala Netflix',
        body.dataFim ? `renova ${fmtDate(body.dataFim)}` : null,
      ])

    case 'update_sala': {
      const nome = String(res?.nome ?? before?.nome ?? 'Sala')
      const parts: string[] = []
      if (body.dataFim !== undefined) {
        parts.push(`data renovação: ${fmtDate(before?.dataFim)} → ${fmtDate(body.dataFim)}`)
      }
      if (body.nome && before?.nome && body.nome !== before.nome) {
        parts.push(`nome: ${before.nome} → ${body.nome}`)
      }
      if (body.status) parts.push(`estado: ${body.status}`)
      return parts.length ? `"${nome}" — ${parts.join('; ')}` : `"${nome}" atualizada`
    }

    case 'suspend_sala':
    case 'activate_sala': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('sala', entityId) : null)
      const verbo = action === 'suspend_sala' ? 'suspensa' : 'ativada'
      return `Sala Netflix "${snap?.nome ?? '—'}" ${verbo}`
    }

    case 'pay_sala_month': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('sala', entityId) : null)
      const nome = String(res?.nome ?? snap?.nome ?? 'Sala')
      const antiga = fmtDate(snap?.dataFim)
      const nova = fmtDate(res?.dataFim)
      const clientes = res?.totalClientes != null ? `${res.totalClientes} cliente(s) sincronizados` : null
      return joinParts([
        `"${nome}": conta Netflix +1 mês`,
        antiga !== '—' && nova !== '—' ? `renovação ${antiga} → ${nova}` : null,
        clientes,
      ])
    }

    case 'delete_sala': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('sala', entityId) : null)
      return `Eliminada sala "${snap?.nome ?? entityId}"`
    }

    case 'create_revendedor':
      return joinParts([
        res?.nome ? `Revendedor "${res.nome}"` : body.nome ? `Revendedor "${body.nome}"` : 'Novo revendedor',
        body.contacto ? String(body.contacto) : null,
      ])

    case 'update_revendedor': {
      const nome = String(res?.nome ?? before?.nome ?? 'Revendedor')
      const parts: string[] = []
      if (body.nome && before?.nome) parts.push(`nome: ${before.nome} → ${body.nome}`)
      if (body.contacto) parts.push(`Contacto: ${body.contacto}`)
      return parts.length ? `"${nome}" — ${parts.join('; ')}` : `"${nome}" atualizado`
    }

    case 'suspend_revendedor':
    case 'activate_revendedor': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('revendedor', entityId) : null)
      const verbo = action === 'suspend_revendedor' ? 'suspenso' : 'ativado'
      return `Revendedor "${snap?.nome ?? '—'}" ${verbo}`
    }

    case 'delete_revendedor': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('revendedor', entityId) : null)
      return `Eliminado revendedor "${snap?.nome ?? entityId}"`
    }

    case 'create_indicacao':
      return joinParts([
        body.indicadoNome ? `Indicado "${body.indicadoNome}"` : res?.indicadoNome ? `Indicado "${res.indicadoNome}"` : 'Nova indicação',
        body.indicadoWhatsapp ? String(body.indicadoWhatsapp) : null,
        body.indicadorId ? `pelo cliente #${body.indicadorId}` : body.indicadorRoveId ? `ID ROVE ${body.indicadorRoveId}` : null,
      ])

    case 'update_indicacao': {
      const snap = before ?? res
      const nome = String(snap?.indicadoNome ?? 'Indicado')
      const parts: string[] = []
      if (body.status && snap?.status) parts.push(`estado: ${snap.status} → ${body.status}`)
      if (body.indicadoNome) parts.push(`nome: ${body.indicadoNome}`)
      if (body.indicadoWhatsapp) parts.push(`WhatsApp: ${body.indicadoWhatsapp}`)
      return parts.length ? `"${nome}" — ${parts.join('; ')}` : `Indicação "${nome}" atualizada`
    }

    case 'delete_indicacao': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('indicacao', entityId) : null)
      return joinParts([
        `Indicação removida: "${snap?.indicadoNome ?? '—'}"`,
        snap?.indicadoWhatsapp ? String(snap.indicadoWhatsapp) : null,
      ])
    }

    case 'create_user':
      return joinParts([
        res?.nome ? `Utilizador "${res.nome}"` : body.nome ? `Utilizador "${body.nome}"` : 'Novo utilizador',
        res?.email ?? body.email ? String(res?.email ?? body.email) : null,
        res?.role ?? body.role ? `perfil ${res?.role ?? body.role}` : null,
      ])

    case 'update_user': {
      const nome = String(res?.nome ?? before?.nome ?? 'Utilizador')
      const parts: string[] = []
      if (body.nome && before?.nome && body.nome !== before.nome) parts.push(`nome: ${before.nome} → ${body.nome}`)
      if (body.email && before?.email) parts.push(`email: ${before.email} → ${body.email}`)
      if (body.role && before?.role) parts.push(`perfil: ${before.role} → ${body.role}`)
      if (body.password) parts.push('senha redefinida')
      return parts.length ? `"${nome}" — ${parts.join('; ')}` : `"${nome}" atualizado`
    }

    case 'suspend_user':
    case 'activate_user': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('user', entityId) : null)
      const verbo = action === 'suspend_user' ? 'suspenso' : 'ativado'
      return joinParts([
        `Utilizador "${snap?.nome ?? '—'}" ${verbo}`,
        snap?.email ? String(snap.email) : null,
        snap?.role ? `perfil ${snap.role}` : null,
      ])
    }

    case 'delete_user': {
      const snap = before ?? (entityId ? await loadEntitySnapshot('user', entityId) : null)
      return joinParts([
        `Eliminado "${snap?.nome ?? entityId}"`,
        snap?.email ? String(snap.email) : null,
        snap?.role ? `perfil ${snap.role}` : null,
      ])
    }

    default:
      return res?.nome ? String(res.nome) : entityId ? `#${entityId}` : 'Operação registada'
  }
}

/** Carrega estado anterior para ações que alteram ou removem registos. */
export async function prefetchAuditBefore(
  action: string,
  entity: string,
  req: Request
): Promise<unknown> {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id < 1) return null
  const needsBefore =
    action.startsWith('update_') ||
    action.startsWith('delete_') ||
    action.startsWith('suspend_') ||
    action.startsWith('activate_') ||
    action === 'renew_client' ||
    action === 'mark_paid_client' ||
    action === 'pay_servidor_month' ||
    action === 'pay_sala_month'
  if (!needsBefore) return null
  return loadEntitySnapshot(entity, id)
}
