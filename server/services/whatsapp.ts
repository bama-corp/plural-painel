// Integração WhatsApp Business
// Número: +244 933623143
// Para envio automático: configurar WhatsApp Cloud API (Meta) ou Twilio e definir
// WHATSAPP_API_URL + WHATSAPP_TOKEN nas variáveis de ambiente.

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || '244933623143'

/** Dígitos normalizados (evitar enviar duas vezes ao mesmo número na mesma operação). */
export function normalizeClientWhatsappKey(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '')
}

/** Cabeçalho + corpo + rodapé (mensagens automáticas a clientes). */
export function formatClientMessage(core: string): string {
  const digits = WHATSAPP_PHONE.replace(/\D/g, '')
  const header = '*ROVE+*'
  const footer = `— Rove+\nDúvidas: https://wa.me/${digits}`
  return `${header}\n\n${core.trim()}\n\n${footer}`
}

/** Mensagens internas para operadores do painel. */
export function formatAdminMessage(core: string): string {
  return `*ROVE+ Painel*\n\n${core.trim()}\n\nAceda ao painel para detalhes.`
}

/** Corpo do lembrete (dias = dias de calendário até à data de renovação, 0 = hoje). */
function buildLembreteRenovacaoBody(nome: string, dataFim: string, dias: number): string {
  if (dias <= 0) {
    return `Olá ${nome}! A sua assinatura Rove+ vence hoje (${dataFim}). Renove o mais breve possível para manter o acesso.`
  }
  if (dias === 1) {
    return `Olá ${nome}! A sua assinatura Rove+ vence amanhã (${dataFim}). Renove para evitar interrupções.`
  }
  if (dias <= 3) {
    return `Olá ${nome}! A sua assinatura Rove+ renova em ${dias} dias (${dataFim}). Renove para continuar sem interrupções.`
  }
  return `Olá ${nome}! A sua assinatura Rove+ renova em ${dias} dias (${dataFim}). Aproveite para planear a renovação.`
}

export type WhatsAppSendResult = { ok: true } | { ok: false; error: string }

function isBrokenWhatsappSession(error: string): boolean {
  return /detached|Session closed|Target closed|Protocol error/i.test(error)
}

async function restartWhatsappApi(baseUrl: string, token: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)
    const res = await fetch(`${baseUrl}/restart`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    clearTimeout(timeout)
    if (!res.ok) return false
    await new Promise((r) => setTimeout(r, 8_000))
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[WhatsApp] Falha ao reiniciar API:', msg)
    return false
  }
}

async function sendWhatsappOnce(
  baseUrl: string,
  token: string,
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(`${baseUrl}/send`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone, message }),
    })
    clearTimeout(timeout)
    const body = (await res.json().catch(() => ({}))) as { error?: string; hint?: string }
    if (!res.ok) {
      const detail = body.error || res.statusText
      const hint = body.hint ? ` ${body.hint}` : ''
      console.error('[WhatsApp] Falha ao enviar:', res.status, detail)
      return { ok: false, error: `${detail}${hint}`.trim() }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[WhatsApp] Erro:', msg)
    return { ok: false, error: msg }
  }
}

export async function sendWhatsAppMessageDetailed(
  to: string,
  message: string
): Promise<WhatsAppSendResult> {
  const phone = normalizeClientWhatsappKey(to)
  const apiUrl = process.env.WHATSAPP_API_URL
  const token = process.env.WHATSAPP_TOKEN
  if (!apiUrl || !token) {
    return { ok: false, error: 'WHATSAPP_API_URL ou WHATSAPP_TOKEN não definidos' }
  }
  if (process.env.WHATSAPP_DISABLED === '1') {
    return { ok: false, error: 'WhatsApp desativado (WHATSAPP_DISABLED=1)' }
  }

  const baseUrl = apiUrl.replace(/\/$/, '')
  let result = await sendWhatsappOnce(baseUrl, token, phone, message)
  if (!result.ok && isBrokenWhatsappSession(result.error)) {
    console.warn('[WhatsApp] Sessão instável na API — a reiniciar e repetir envio…')
    if (await restartWhatsappApi(baseUrl, token)) {
      result = await sendWhatsappOnce(baseUrl, token, phone, message)
    }
  }
  return result
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const result = await sendWhatsAppMessageDetailed(to, message)
  return result.ok
}

export function getBusinessPhone(): string {
  return WHATSAPP_PHONE
}

/**
 * Mensagens automáticas para clientes finais (cadastro, lembretes, renovação, etc.).
 * Todas incluem cabeçalho e rodapé com link WhatsApp da Rove+.
 */
export const templates = {
  clienteCadastrado: (nome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! Bem-vindo(a) à Rove+. A sua subscrição tem próxima renovação em ${dataFim}. Obrigado pela confiança.`
    ),

  /** Lembretes do cron (janela até 7 dias); dias = dias até dataFim (0 = hoje). */
  lembreteRenovacao: (nome: string, dataFim: string, dias: number) =>
    formatClientMessage(buildLembreteRenovacaoBody(nome, dataFim, dias)),

  /** @deprecated Usar lembreteRenovacao; mantido para código legado. */
  lembrete3Dias: (nome: string, dataFim: string) =>
    formatClientMessage(buildLembreteRenovacaoBody(nome, dataFim, 3)),

  /** @deprecated Usar lembreteRenovacao; mantido para código legado. */
  lembrete7Dias: (nome: string, dataFim: string, dias: number) =>
    formatClientMessage(buildLembreteRenovacaoBody(nome, dataFim, dias)),

  pagamentoRegistado: (nome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! Registámos o seu pagamento. O serviço mantém-se ativo; próxima renovação: ${dataFim}. Obrigado!`
    ),

  reativado: (nome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! O seu serviço Rove+ foi reativado. Próxima data de renovação: ${dataFim}. Bom proveito!`
    ),

  /** Operador marcou o cliente como suspenso / vencido no painel. */
  servicoSuspenso: (nome: string) =>
    formatClientMessage(
      `Olá ${nome}! O seu acesso Rove+ foi suspenso no nosso sistema. Para voltar a utilizar, regularize ou renove — estamos disponíveis para ajudar.`
    ),

  /** Período já passado (ex.: automações futuras). */
  periodoVencido: (nome: string) =>
    formatClientMessage(`Olá ${nome}! A sua assinatura Rove+ está vencida. Renove para reativar o serviço.`),

  /** @deprecated Usar servicoSuspenso ou periodoVencido consoante o caso. */
  vencido: (nome: string) => templates.periodoVencido(nome),

  renovado: (nome: string, dataFim: string) =>
    formatClientMessage(`Olá ${nome}! Renovação confirmada. Próxima data de renovação: ${dataFim}. Obrigado!`),

  contaCancelada: (nome: string) =>
    formatClientMessage(
      `Olá ${nome}! A sua conta Rove+ foi cancelada. Se precisar de reativar o serviço, fale connosco.`
    ),

  contaEncerrada: (nome: string) =>
    formatClientMessage(
      `Olá ${nome}! O seu registo foi removido do sistema Rove+. Para voltar a subscrever, contacte-nos.`
    ),

  inscricaoConfirmada: (nome: string, plano: string) =>
    formatClientMessage(
      `Olá ${nome}! Confirmámos o pagamento da inscrição do plano ${plano}. Obrigado — o seu Netflix Rove+ está em dia.`
    ),

  areaClienteAtivada: (nome: string, url: string) =>
    formatClientMessage(
      `Olá ${nome}! A sua área cliente Rove+ está ativa.\nEntre em ${url} com o seu WhatsApp e o PIN definido pela equipa.\nRecomendamos alterar o PIN no primeiro acesso.`
    ),

  credenciaisIptvAtualizadas: (nome: string) =>
    formatClientMessage(
      `Olá ${nome}! As credenciais do seu IPTV Rove+ foram atualizadas. Consulte a área cliente ou fale connosco se precisar de ajuda.`
    ),

  credenciaisNetflixAtualizadas: (nome: string, perfil: string | null) =>
    formatClientMessage(
      `Olá ${nome}! Os dados do seu perfil Netflix Rove+ foram atualizados${perfil ? ` (perfil: ${perfil})` : ''}.`
    ),

  dataRenovacaoAlterada: (nome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! A data de renovação da sua subscrição foi atualizada para ${dataFim}.`
    ),

  salaContaRenovada: (nome: string, salaNome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! A conta Netflix da sala "${salaNome}" foi renovada. A sua subscrição mantém-se válida até ${dataFim}.`
    ),

  salaSuspensa: (nome: string, salaNome: string) =>
    formatClientMessage(
      `Olá ${nome}! A sala Netflix "${salaNome}" foi suspensa temporariamente. O acesso pode estar limitado até regularização.`
    ),

  salaReativada: (nome: string, salaNome: string, dataFim: string) =>
    formatClientMessage(
      `Olá ${nome}! A sala Netflix "${salaNome}" foi reativada. Renovação: ${dataFim}.`
    ),

  servidorManutencao: (nome: string, servidorNome: string) =>
    formatClientMessage(
      `Olá ${nome}! O servidor IPTV "${servidorNome}" está em manutenção. Pode haver interrupções temporárias — a equipa está a trabalhar na resolução.`
    ),

  indicacaoRegistada: (nomeIndicador: string, indicadoNome: string) =>
    formatClientMessage(
      `Olá ${nomeIndicador}! Registámos a sua indicação de ${indicadoNome}. A equipa vai analisar e entrará em contacto. Obrigado!`
    ),

  indicacaoConfirmadaIndicador: (nomeIndicador: string, indicadoNome: string) =>
    formatClientMessage(
      `Olá ${nomeIndicador}! A indicação de ${indicadoNome} foi confirmada. Obrigado por recomendar a Rove+!`
    ),

  indicacaoConviteIndicado: (indicadoNome: string, indicadorNome: string) =>
    formatClientMessage(
      `Olá ${indicadoNome}! ${indicadorNome} indicou-o à Rove+. Quer conhecer os nossos planos Netflix e IPTV? Fale connosco — estamos à disposição.`
    ),
}
