/** Planos e preços usados no painel (kz). */

export const PLANOS_IPTV = [
  { id: 'Pacote Premium', label: 'Pacote Premium', valor: 9500 },
  { id: 'Pacote Ultimate', label: 'Pacote Ultimate', valor: 12500 },
] as const

export const PLANOS_NETFLIX = [
  { id: 'Plano Room', label: 'Plano Room', valor: 4500, inscricao: 2000 },
  { id: 'Plano Solo', label: 'Plano Solo', valor: 18500, inscricao: 4000 },
] as const

export function inscricaoValorPlano(plano: string | null | undefined): number | null {
  const p = PLANOS_NETFLIX.find((x) => x.id === plano)
  return p?.inscricao ?? null
}
