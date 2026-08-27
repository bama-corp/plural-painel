import type { Request, Response, NextFunction } from 'express'
import type { AuthPayload } from './auth.js'
import { buildAuditDetails, prefetchAuditBefore } from '../lib/auditDetails.js'
import { recordAuditLog, resolveEntityId } from '../lib/auditLog.js'

type AuditLocals = {
  auditResponseBody?: unknown
  auditBefore?: unknown
}

export function auditLog(
  action: string,
  entity: string,
  entityId?: number | ((req: Request) => number | undefined)
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: AuthPayload }).user
    if (!user) return next()

    const locals = res.locals as AuditLocals
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)

    try {
      locals.auditBefore = await prefetchAuditBefore(action, entity, req)
    } catch {
      locals.auditBefore = null
    }

    res.json = function (body: unknown) {
      locals.auditResponseBody = body
      return originalJson(body)
    }

    res.send = function (body?: unknown) {
      if (body !== undefined) locals.auditResponseBody = body
      return originalSend(body)
    }

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return

      void (async () => {
        const responseBody = locals.auditResponseBody
        const resolvedId = resolveEntityId(req, responseBody, entityId)
        const details = await buildAuditDetails(
          action,
          entity,
          resolvedId,
          req,
          responseBody,
          locals.auditBefore
        )

        await recordAuditLog({
          userId: user.userId,
          action,
          entity,
          entityId: resolvedId,
          details,
        })
      })()
    })

    next()
  }
}
