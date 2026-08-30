import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type RoveModalOverlayProps = {
  children: ReactNode
  zIndex?: number
  /** Fundo escurecido sem backdrop-blur (evita artefactos visuais no header/conteúdo). */
  dimClassName?: string
}

export function RoveModalOverlay({
  children,
  zIndex = 50,
  dimClassName = 'bg-black/60',
}: RoveModalOverlayProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`rove-portal fixed inset-0 flex items-end justify-center p-2 sm:items-center sm:p-4 ${dimClassName}`}
      style={{ zIndex }}
    >
      {children}
    </div>,
    document.body
  )
}
