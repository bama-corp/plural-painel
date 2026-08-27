/**
 * Retorna "Sr. Nome" ou "Sra. Nome" consoante o primeiro nome.
 * Nomes cujo primeiro nome termina em 'a' → Sra., caso contrário → Sr.
 */
export function tratamentoNome(nome: string): string {
  const n = (nome || '').trim()
  if (!n) return n
  const primeiro = n.split(/\s+/)[0] || n
  const terminaEmA = /a$/i.test(primeiro)
  return terminaEmA ? `Sra. ${n}` : `Sr. ${n}`
}
