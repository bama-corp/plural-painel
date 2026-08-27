import type { Request } from 'express'
import { prisma } from './prisma.js'

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_client: 'Criar cliente',
  update_client: 'Atualizar cliente',
  renew_client: 'Renovar cliente',
  mark_paid_client: 'Marcar pagamento',
  suspend_client: 'Suspender cliente',
  activate_client: 'Ativar cliente',
  delete_client: 'Eliminar cliente',
  create_servidor: 'Criar servidor',
  update_servidor: 'Atualizar servidor',
  suspend_servidor: 'Suspender servidor',
  pay_servidor_month: 'Pagar servidor',
  delete_servidor: 'Eliminar servidor',
  create_revendedor: 'Criar revendedor',
  update_revendedor: 'Atualizar revendedor',
  suspend_revendedor: 'Suspender revendedor',
  activate_revendedor: 'Ativar revendedor',
  delete_revendedor: 'Eliminar revendedor',
  create_sala: 'Criar sala',
  update_sala: 'Atualizar sala',
  suspend_sala: 'Suspender sala',
  activate_sala: 'Ativar sala',
  pay_sala_month: 'Renovar sala (+1 mês)',
  delete_sala: 'Eliminar sala',
  create_indicacao: 'Criar indicação',
  update_indicacao: 'Atualizar indicação',
  delete_indicacao: 'Eliminar indicação',
  create_user: 'Criar utilizador',
  update_user: 'Atualizar utilizador',
  suspend_user: 'Suspender utilizador',
  activate_user: 'Ativar utilizador',
  delete_user: 'Eliminar utilizador',
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  client: 'Cliente',
  servidor: 'Servidor',
  revendedor: 'Revendedor',
  sala: 'Sala',
  indicacao: 'Indicação',
  user: 'Utilizador',
}

export async function recordAuditLog(data: {
  userId: number
  action: string
  entity: string
  entityId?: number | null
  details?: string | null
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? undefined,
        details: data.details ?? undefined,
      },
    })
    .catch((err) => {
      console.error('[audit] Falha ao gravar log:', err instanceof Error ? err.message : err)
    })
}

export function resolveEntityId(
  req: Request,
  responseBody: unknown,
  explicit?: number | ((req: Request) => number | undefined)
): number | undefined {
  if (typeof explicit === 'function') {
    const v = explicit(req)
    if (v != null && Number.isFinite(v)) return v
  } else if (explicit != null && Number.isFinite(explicit)) {
    return explicit
  }
  const paramId = Number(req.params.id)
  if (Number.isFinite(paramId) && paramId > 0) return paramId
  const body = responseBody as { id?: number } | null | undefined
  if (body?.id != null && Number.isFinite(body.id)) return body.id
  return undefined
}
