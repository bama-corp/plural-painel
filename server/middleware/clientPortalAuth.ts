import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export interface ClientPortalJwtPayload {
  clientId: number
  typ: 'client_portal'
}

export function clientPortalMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.client_token
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ClientPortalJwtPayload
    if (payload.typ !== 'client_portal' || typeof payload.clientId !== 'number') {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    ;(req as Request & { clientPortal: ClientPortalJwtPayload }).clientPortal = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' })
  }
}
