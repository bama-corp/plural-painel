const NETFLIX_LOGIN_URL = 'https://www.netflix.com/login'

export type AssistantAction =
  | { type: 'tab'; label: string; tab: 'servico' | 'renovar' | 'indicar' | 'conta' | 'inicio' }
  | { type: 'link'; label: string; url: string }
  | { type: 'whatsapp'; label: string; phone: string; message: string }
  | { type: 'copy'; label: string; text: string }
  | { type: 'openPinModal'; label: string }

export interface AssistantReply {
  reply: string
  suggestions: string[]
  actions?: AssistantAction[]
  /** Executadas automaticamente no site ao receber a resposta */
  autoActions?: AssistantAction[]
}

export interface ClientAssistantContext {
  nome: string
  whatsapp: string
  servico: string
  plano: string
  status: string
  dataFim: Date
  valor: number
  perfil: string | null
  pin: string | null
  iptvUser: string | null
  iptvPass: string | null
  iptvMac: string | null
  iptvM3u: string | null
  inscricaoPaga: boolean | null
  indicacoes: number
  portalFirstLogin: boolean
  roveId: string | null
  diasRestantes: number
}

const WA_BUSINESS = process.env.WHATSAPP_PHONE || '244933623143'
const PUBLIC_SITE = process.env.ROVE_PUBLIC_SITE_URL || 'https://plural-ph.vercel.app/'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function matches(text: string, ...keywords: string[]): boolean {
  const n = normalize(text)
  return keywords.some((k) => n.includes(normalize(k)))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR')
}

function formatValor(v: number): string {
  return `${Number(v).toLocaleString('pt-BR')} kz`
}

function servicoLabel(ctx: ClientAssistantContext): string {
  return ctx.servico === 'netflix' ? 'Netflix' : 'IPTV'
}

function buildRenewMessage(ctx: ClientAssistantContext): string {
  const lines = [
    'Olá plural, quero renovar o meu plano.',
    `Cliente: ${ctx.nome}`,
    `Plano: ${ctx.plano} (${servicoLabel(ctx)})`,
    `Vencimento: ${formatDate(ctx.dataFim)}`,
    `Valor mensal: ${formatValor(ctx.valor)}`,
  ]
  if (ctx.roveId) lines.push(`ID ROVE: ${ctx.roveId}`)
  return lines.join('\n')
}

function buildSupportMessage(ctx: ClientAssistantContext): string {
  return [
    'Olá plural, preciso de ajuda com a minha conta.',
    `Cliente: ${ctx.nome}`,
    ctx.roveId ? `ID ROVE: ${ctx.roveId}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function whatsappRenew(ctx: ClientAssistantContext): AssistantAction {
  return {
    type: 'whatsapp',
    label: 'Pedir renovação no WhatsApp',
    phone: WA_BUSINESS,
    message: buildRenewMessage(ctx),
  }
}

function whatsappSupport(ctx: ClientAssistantContext): AssistantAction {
  return {
    type: 'whatsapp',
    label: 'Falar com a equipa',
    phone: WA_BUSINESS,
    message: buildSupportMessage(ctx),
  }
}

function commonSuggestions(ctx: ClientAssistantContext): string[] {
  return [
    'Quando renovo?',
    'Ver credenciais',
    'Como indicar amigo?',
    ctx.servico === 'netflix' ? 'Abrir Netflix' : 'Como usar M3U?',
    'Alterar PIN',
    'Falar com suporte',
  ]
}

function buildCredentialsText(ctx: ClientAssistantContext): string {
  if (ctx.servico === 'netflix') {
    return [ctx.perfil ? `Perfil: ${ctx.perfil}` : null, ctx.pin ? `PIN: ${ctx.pin}` : null]
      .filter(Boolean)
      .join('\n')
  }
  return [
    ctx.perfil || ctx.iptvUser ? `Utilizador: ${ctx.perfil || ctx.iptvUser}` : null,
    ctx.iptvPass ? `Senha: ${ctx.iptvPass}` : null,
    ctx.iptvMac ? `MAC: ${ctx.iptvMac}` : null,
    ctx.iptvM3u ? `M3U: ${ctx.iptvM3u}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

type AssistantTab = 'servico' | 'renovar' | 'indicar' | 'conta' | 'inicio'

function tabFromNavigationMsg(msg: string): AssistantTab | null {
  if (matches(msg, 'renov')) return 'renovar'
  if (matches(msg, 'indic')) return 'indicar'
  if (matches(msg, 'conta', 'segur')) return 'conta'
  if (matches(msg, 'inicio', 'início', 'home')) return 'inicio'
  if (matches(msg, 'servico', 'serviço', 'netflix', 'iptv', 'credenc')) return 'servico'
  return null
}

export function getAssistantWelcome(ctx: ClientAssistantContext): AssistantReply {
  const firstName = ctx.nome.split(/\s+/)[0]
  const suggestions = commonSuggestions(ctx)

  if (ctx.portalFirstLogin) {
    return {
      reply: [
        `Olá, ${firstName}! Sou o **POne**, assistente da plural.`,
        '',
        'Por segurança, altere o PIN da área cliente agora:',
        '1. Toque em **Alterar PIN agora**',
        '2. Introduza o PIN actual (o do login)',
        '3. Escolha um novo PIN com pelo menos **6 caracteres**',
        '4. Confirme e guarde',
        '',
        'Depois posso ajudar com renovação, credenciais e indicações.',
      ].join('\n'),
      suggestions: ['Alterar PIN', 'Quando renovo?', 'Ver credenciais'],
      actions: [
        { type: 'openPinModal', label: 'Alterar PIN agora' },
        { type: 'tab', label: 'Abrir Conta', tab: 'conta' },
      ],
    }
  }

  if (ctx.status === 'vencido' || ctx.diasRestantes <= 7) {
    const urgente =
      ctx.status === 'vencido'
        ? 'A sua subscrição **está vencida**.'
        : `A sua subscrição vence em **${Math.max(0, ctx.diasRestantes)} dia(s)** (${formatDate(ctx.dataFim)}).`
    return {
      reply: [
        `Olá, ${firstName}! ${urgente}`,
        '',
        'Para renovar em 3 passos:',
        '1. Toque em **Pedir renovação no WhatsApp**',
        '2. Confirme a mensagem pré-preenchida e envie',
        '3. Aguarde a confirmação da equipa plural',
        '',
        `Plano: **${ctx.plano}** · ${formatValor(ctx.valor)}/mês`,
      ].join('\n'),
      suggestions: ['Pedir renovação', 'Qual o meu plano?', 'Ver credenciais', 'Falar com suporte'],
      actions: [
        whatsappRenew(ctx),
        { type: 'tab', label: 'Ver renovação', tab: 'renovar' },
        whatsappSupport(ctx),
      ],
    }
  }

  return {
    reply: [
      `Olá, ${firstName}! Sou o **POne** — estou aqui para o guiar.`,
      '',
      'Posso ajudar-lhe a:',
      '1. Ver e **copiar credenciais**',
      '2. **Renovar** o plano passo a passo',
      '3. **Indicar** um amigo',
      '4. **Alterar o PIN** da área cliente',
      '5. Abrir o **WhatsApp** da equipa',
      '',
      'Escolha uma sugestão abaixo ou escreva o que precisa.',
    ].join('\n'),
    suggestions,
    actions: [
      { type: 'tab', label: 'Ver credenciais', tab: 'servico' },
      { type: 'tab', label: 'Renovar', tab: 'renovar' },
      whatsappSupport(ctx),
    ],
  }
}

export function getAssistantReply(ctx: ClientAssistantContext, rawMessage: string): AssistantReply {
  const msg = rawMessage.trim()
  if (!msg) return getAssistantWelcome(ctx)

  if (matches(msg, 'ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'menu', 'começar', 'comecar', 'o que podes')) {
    return getAssistantWelcome(ctx)
  }

  if (matches(msg, 'abrir', 'ir para', 'mostrar', 'ver aba', 'aba', 'va para', 'vá para')) {
    const dest = tabFromNavigationMsg(msg)
    if (dest) {
      const labels: Record<string, string> = {
        renovar: 'Renovar',
        servico: servicoLabel(ctx),
        indicar: 'Indicar',
        conta: 'Conta',
        inicio: 'Início',
      }
      return {
        reply: [
          `A abrir a secção **${labels[dest]}**.`,
          '',
          'O que pode fazer aí:',
          dest === 'servico'
            ? '1. Ver utilizador / perfil\n2. Copiar senha, PIN ou M3U\n3. Abrir a Netflix (se aplicável)'
            : dest === 'renovar'
              ? '1. Ver dias restantes\n2. Confirmar valor e data\n3. Pedir renovação no WhatsApp'
              : dest === 'indicar'
                ? '1. Escrever nome do amigo\n2. Indicar o WhatsApp\n3. Registar a indicação'
                : dest === 'conta'
                  ? '1. Alterar PIN\n2. Ver avisos\n3. Contactar suporte'
                  : '1. Ver resumo da conta\n2. Ações rápidas\n3. Avisos recentes',
        ].join('\n'),
        suggestions: commonSuggestions(ctx).slice(0, 4),
        actions: [{ type: 'tab', label: `Abrir ${labels[dest]}`, tab: dest }],
        autoActions: [{ type: 'tab', label: labels[dest], tab: dest }],
      }
    }
  }

  if (matches(msg, 'copia', 'copiar')) {
    if (matches(msg, 'pin') && ctx.pin) {
      return {
        reply: [
          'Copiei o **PIN do perfil Netflix**.',
          '',
          'Próximos passos:',
          '1. Abra a Netflix',
          '2. Escolha o perfil correcto',
          '3. Cole o PIN se for pedido',
        ].join('\n'),
        suggestions: ['Abrir Netflix', 'Ver credenciais', 'Copiar credenciais'],
        actions: [
          { type: 'link', label: 'Abrir Netflix', url: NETFLIX_LOGIN_URL },
          { type: 'tab', label: 'Ver credenciais', tab: 'servico' },
          { type: 'copy', label: 'Copiar PIN outra vez', text: ctx.pin },
        ],
        autoActions: [{ type: 'copy', label: 'PIN Netflix', text: ctx.pin }],
      }
    }
    if (matches(msg, 'm3u') && ctx.iptvM3u) {
      return {
        reply: [
          'Copiei a **lista M3U**.',
          '',
          'Como usar:',
          '1. Abra a app IPTV (Smarters, XCIPTV, etc.)',
          '2. Escolha «Lista M3U» / «URL»',
          '3. Cole a lista e confirme',
        ].join('\n'),
        suggestions: ['Ver credenciais', 'Como usar M3U?', 'Falar com suporte'],
        actions: [
          { type: 'tab', label: 'Ver IPTV', tab: 'servico' },
          { type: 'copy', label: 'Copiar M3U outra vez', text: ctx.iptvM3u },
          whatsappSupport(ctx),
        ],
        autoActions: [{ type: 'copy', label: 'M3U', text: ctx.iptvM3u }],
      }
    }
    if (matches(msg, 'rove', 'id') && ctx.roveId) {
      return {
        reply: `Copiei o **ID ROVE** (${ctx.roveId}). Use-o quando falar com o suporte.`,
        suggestions: ['Falar com suporte', 'Estado da conta'],
        actions: [
          { type: 'copy', label: 'Copiar ID outra vez', text: ctx.roveId },
          whatsappSupport(ctx),
        ],
        autoActions: [{ type: 'copy', label: 'ID ROVE', text: ctx.roveId }],
      }
    }
    if (matches(msg, 'senha', 'password') && ctx.iptvPass) {
      return {
        reply: [
          'Copiei a **senha IPTV**.',
          '',
          '1. Abra a aba IPTV se precisar dos outros dados',
          '2. Cole a senha na app',
          '3. Se falhar, fale com o suporte',
        ].join('\n'),
        suggestions: ['Copiar credenciais', 'Ver credenciais'],
        actions: [
          { type: 'tab', label: 'Ver IPTV', tab: 'servico' },
          { type: 'copy', label: 'Copiar senha outra vez', text: ctx.iptvPass },
        ],
        autoActions: [{ type: 'copy', label: 'Senha IPTV', text: ctx.iptvPass }],
      }
    }
    const creds = buildCredentialsText(ctx)
    if (matches(msg, 'credenc', 'tudo', 'dados', 'utilizador', 'linha') && creds) {
      return {
        reply: [
          'Copiei as **credenciais** para a área de transferência.',
          '',
          '1. Cole onde precisar (app ou notas)',
          '2. Ou abra a aba Serviço para ver campo a campo',
        ].join('\n'),
        suggestions: ['Ver credenciais', 'Quando renovo?', 'Abrir Netflix'],
        actions: [
          { type: 'tab', label: 'Ver credenciais', tab: 'servico' },
          { type: 'copy', label: 'Copiar outra vez', text: creds },
          ...(ctx.servico === 'netflix'
            ? ([{ type: 'link', label: 'Abrir Netflix', url: NETFLIX_LOGIN_URL }] as AssistantAction[])
            : []),
        ],
        autoActions: [{ type: 'copy', label: 'Credenciais', text: creds }],
      }
    }
  }

  if (matches(msg, 'pedir renovacao', 'pedir renovação')) {
    return {
      reply: [
        'A abrir o WhatsApp com a mensagem de renovação…',
        '',
        '1. Confirme os dados na mensagem',
        '2. Envie para a plural',
        '3. Aguarde a activação',
      ].join('\n'),
      suggestions: ['Ver renovação', 'Estado da conta', 'Qual o meu plano?'],
      actions: [whatsappRenew(ctx), { type: 'tab', label: 'Ver renovação', tab: 'renovar' }],
      autoActions: [whatsappRenew(ctx)],
    }
  }

  if (matches(msg, 'renov', 'venc', 'pagar', 'pagamento', 'data fim', 'quando renovo', 'expir')) {
    const dias = Math.max(0, ctx.diasRestantes)
    let estado = ''
    if (ctx.status === 'cancelado') estado = 'A sua conta está **cancelada**.'
    else if (ctx.status === 'vencido') estado = 'A subscrição está **vencida** — renove para reactivar o acesso.'
    else if (dias === 0) estado = 'A subscrição **vence hoje**.'
    else if (dias <= 7) estado = `Faltam **${dias} dia(s)** para a renovação.`
    else estado = `Faltam **${dias} dia(s)**. Está tudo em dia por agora.`

    return {
      reply: [
        estado,
        '',
        `• Plano: **${ctx.plano}** (${servicoLabel(ctx)})`,
        `• Próxima data: **${formatDate(ctx.dataFim)}**`,
        `• Valor mensal: **${formatValor(ctx.valor)}**`,
        '',
        'Passo a passo para renovar:',
        '1. Toque em **Pedir renovação no WhatsApp**',
        '2. Envie a mensagem pré-preenchida',
        '3. Aguarde a confirmação da equipa',
        '',
        'Também pode abrir a aba **Renovar** para ver o resumo.',
      ].join('\n'),
      suggestions: ['Pedir renovação', 'Qual o meu plano?', 'Copiar ID ROVE', 'Falar com suporte'],
      actions: [
        whatsappRenew(ctx),
        { type: 'tab', label: 'Abrir aba Renovar', tab: 'renovar' },
        ...(ctx.roveId
          ? ([{ type: 'copy', label: 'Copiar ID ROVE', text: ctx.roveId }] as AssistantAction[])
          : []),
        whatsappSupport(ctx),
      ],
    }
  }

  if (matches(msg, 'plano', 'valor', 'preco', 'preço', 'quanto pago', 'mensal')) {
    return {
      reply: [
        `O seu plano é **${ctx.plano}** (${servicoLabel(ctx)}).`,
        `Valor mensal: **${formatValor(ctx.valor)}**`,
        `Renovação em: **${formatDate(ctx.dataFim)}**`,
        '',
        'Quer renovar ou ver as credenciais?',
      ].join('\n'),
      suggestions: ['Pedir renovação', 'Ver credenciais', 'Estado da conta'],
      actions: [
        whatsappRenew(ctx),
        { type: 'tab', label: 'Ver renovação', tab: 'renovar' },
        { type: 'tab', label: 'Ver credenciais', tab: 'servico' },
      ],
    }
  }

  if (matches(msg, 'estado', 'status', 'ativo', 'cancelado') && !matches(msg, 'alterar pin', 'mudar pin')) {
    const statusLabel =
      ctx.status === 'ativo'
        ? 'Ativa'
        : ctx.status === 'vencido'
          ? 'Vencida'
          : ctx.status === 'cancelado'
            ? 'Cancelada'
            : ctx.status
    return {
      reply: [
        `Estado da conta: **${statusLabel}**`,
        `Serviço: **${servicoLabel(ctx)}**`,
        ctx.roveId ? `ID ROVE: **${ctx.roveId}**` : null,
        `Vencimento: **${formatDate(ctx.dataFim)}**`,
      ]
        .filter(Boolean)
        .join('\n'),
      suggestions: ['Quando renovo?', 'Ver credenciais', 'Falar com suporte'],
      actions: [
        { type: 'tab', label: 'Ir ao início', tab: 'inicio' },
        ...(ctx.roveId
          ? ([{ type: 'copy', label: 'Copiar ID ROVE', text: ctx.roveId }] as AssistantAction[])
          : []),
        whatsappSupport(ctx),
      ],
    }
  }

  if (matches(msg, 'credenc', 'utilizador', 'senha', 'password', 'login', 'acesso', 'm3u', 'mac', 'linha', 'dados', 'ver credenciais')) {
    const creds = buildCredentialsText(ctx)
    if (ctx.servico === 'netflix') {
      return {
        reply: [
          'Credenciais **Netflix** — siga estes passos:',
          '1. Abra a aba **Netflix** (ou toque abaixo)',
          '2. Copie o **perfil** e o **PIN**',
          '3. Abra a Netflix e escolha o perfil',
          '4. Introduza o PIN se for pedido',
          '',
          ctx.perfil ? `• Perfil: **${ctx.perfil}**` : null,
          ctx.pin ? `• PIN: **${ctx.pin}**` : '• PIN: ainda não registado — fale com o suporte',
        ]
          .filter(Boolean)
          .join('\n'),
        suggestions: ['Copiar credenciais', 'Abrir Netflix', 'Alterar PIN área cliente', 'Falar com suporte'],
        actions: [
          { type: 'tab', label: 'Abrir Netflix (aba)', tab: 'servico' },
          ...(creds ? ([{ type: 'copy', label: 'Copiar credenciais', text: creds }] as AssistantAction[]) : []),
          { type: 'link', label: 'Abrir site Netflix', url: NETFLIX_LOGIN_URL },
          whatsappSupport(ctx),
        ],
      }
    }

    return {
      reply: [
        'Credenciais **IPTV** — passo a passo:',
        '1. Abra a aba **IPTV**',
        '2. Copie utilizador e senha (ou «Copiar tudo»)',
        '3. Se usar M3U, copie a lista e cole na app',
        '4. Se algo falhar, fale com o suporte',
        '',
        ctx.perfil || ctx.iptvUser ? `• Utilizador: **${ctx.perfil || ctx.iptvUser}**` : null,
        ctx.iptvPass ? '• Senha: disponível para copiar' : '• Senha: contacte a plural se não aparecer',
        ctx.iptvMac ? `• MAC: **${ctx.iptvMac}**` : null,
        ctx.iptvM3u ? '• Lista M3U: disponível para copiar' : null,
      ]
        .filter(Boolean)
        .join('\n'),
      suggestions: ['Copiar credenciais', 'Como usar M3U?', 'Quando renovo?', 'Falar com suporte'],
      actions: [
        { type: 'tab', label: 'Abrir IPTV', tab: 'servico' },
        ...(creds ? ([{ type: 'copy', label: 'Copiar tudo', text: creds }] as AssistantAction[]) : []),
        ...(ctx.iptvM3u
          ? ([{ type: 'copy', label: 'Copiar só M3U', text: ctx.iptvM3u }] as AssistantAction[])
          : []),
        whatsappSupport(ctx),
      ],
    }
  }

  if (ctx.servico === 'netflix' && matches(msg, 'netflix', 'perfil', 'pin netflix', 'qual o meu pin')) {
    return getAssistantReply(ctx, 'ver credenciais')
  }

  if (matches(msg, 'm3u', 'lista', 'app iptv', 'smart tv iptv', 'como usar m3u')) {
    if (ctx.servico !== 'iptv') {
      return {
        reply: [
          'O M3U é para clientes **IPTV**.',
          'O seu serviço é Netflix — use a aba Netflix para perfil e PIN.',
        ].join('\n'),
        suggestions: ['Ver credenciais', 'Abrir Netflix'],
        actions: [
          { type: 'tab', label: 'Ver Netflix', tab: 'servico' },
          { type: 'link', label: 'Abrir Netflix', url: NETFLIX_LOGIN_URL },
        ],
      }
    }
    return {
      reply: ctx.iptvM3u
        ? [
            'Como configurar a lista **M3U**:',
            '1. Toque em **Copiar M3U** (ou abra a aba IPTV)',
            '2. Abra a app no telemóvel / TV (Smarters, XCIPTV, etc.)',
            '3. Adicione uma lista por URL / M3U',
            '4. Cole e guarde',
            '',
            'Se a lista não carregar, fale connosco no WhatsApp.',
          ].join('\n')
        : [
            'Ainda não há lista M3U na sua conta.',
            '',
            '1. Toque em **Falar com a equipa**',
            '2. Peça a activação / envio da M3U',
            '3. Depois volte aqui para copiar',
          ].join('\n'),
      suggestions: ['Ver credenciais', 'Copiar M3U', 'Falar com suporte'],
      actions: [
        { type: 'tab', label: 'Ver IPTV', tab: 'servico' },
        ...(ctx.iptvM3u
          ? ([{ type: 'copy', label: 'Copiar M3U', text: ctx.iptvM3u }] as AssistantAction[])
          : []),
        whatsappSupport(ctx),
      ],
    }
  }

  if (matches(msg, 'pin area', 'pin da area', 'alterar pin', 'mudar pin', 'trocar pin', 'primeiro acesso', 'alterar pin')) {
    const abrirJa = matches(msg, 'alterar', 'mudar', 'trocar', 'primeiro', 'agora')
    return {
      reply: [
        'Para **alterar o PIN** da área cliente:',
        '1. Toque em **Alterar PIN agora**',
        '2. Introduza o PIN actual',
        '3. Escolha um novo PIN (mín. **6 caracteres**)',
        '4. Confirme e guarde',
        '',
        'Se esqueceu o PIN, use «Recuperar PIN» na página de login.',
      ].join('\n'),
      suggestions: ['Alterar PIN', 'Ver credenciais', 'Falar com suporte'],
      actions: [
        { type: 'openPinModal', label: 'Alterar PIN agora' },
        { type: 'tab', label: 'Abrir Conta', tab: 'conta' },
        whatsappSupport(ctx),
      ],
      autoActions: abrirJa ? [{ type: 'openPinModal', label: 'Alterar PIN' }] : undefined,
    }
  }

  if (matches(msg, 'indic', 'amigo', 'refer', 'convidar', 'como indicar')) {
    return {
      reply: [
        'Como **indicar um amigo**:',
        '1. Abra a aba **Indicar**',
        '2. Escreva o **nome completo**',
        '3. Indique o **WhatsApp** (+244…)',
        '4. Toque em **Registar indicação**',
        '',
        `Já tem **${ctx.indicacoes}** indicação(ões) registada(s).`,
        'A equipa valida antes de contactar a pessoa.',
      ].join('\n'),
      suggestions: ['Abrir indicações', 'Quando renovo?', 'Falar com suporte'],
      actions: [
        { type: 'tab', label: 'Indicar amigo', tab: 'indicar' },
        { type: 'tab', label: 'Ir ao início', tab: 'inicio' },
      ],
      autoActions: matches(msg, 'abrir') ? [{ type: 'tab', label: 'Indicar', tab: 'indicar' }] : undefined,
    }
  }

  if (matches(msg, 'rove', 'id rove', 'referencia', 'referência', 'copiar id')) {
    return {
      reply: ctx.roveId
        ? [
            `O seu ID ROVE é **${ctx.roveId}**.`,
            '',
            '1. Copie o ID',
            '2. Envie-o no WhatsApp se pedir suporte',
            '3. Assim a equipa encontra a sua conta mais depressa',
          ].join('\n')
        : 'O ID ROVE será gerado automaticamente. Actualize a página ou contacte o suporte se não aparecer.',
      suggestions: ['Copiar ID ROVE', 'Falar com suporte', 'Estado da conta'],
      actions: [
        ...(ctx.roveId
          ? ([{ type: 'copy', label: 'Copiar ID ROVE', text: ctx.roveId }] as AssistantAction[])
          : []),
        whatsappSupport(ctx),
        { type: 'tab', label: 'Abrir Conta', tab: 'conta' },
      ],
    }
  }

  if (matches(msg, 'whatsapp', 'suporte', 'humano', 'atendente', 'pessoa', 'equipa', 'falar')) {
    return {
      reply: [
        'Vou ajudá-lo a contactar a equipa **plural**:',
        '1. Toque em **Falar com a equipa**',
        '2. Complete a mensagem no WhatsApp com o seu problema',
        '3. Envie — respondemos o mais breve possível',
        '',
        ctx.roveId ? `Dica: o seu ID ROVE é **${ctx.roveId}** (já pode ir na mensagem).` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      suggestions: ['Pedir renovação', 'Ver credenciais', 'Copiar ID ROVE'],
      actions: [
        whatsappSupport(ctx),
        whatsappRenew(ctx),
        ...(ctx.roveId
          ? ([{ type: 'copy', label: 'Copiar ID ROVE', text: ctx.roveId }] as AssistantAction[])
          : []),
      ],
    }
  }

  if (matches(msg, 'site', 'plural', 'planos site', 'rove plus', 'rove+')) {
    return {
      reply: [
        'No site da plural encontra planos e novidades.',
        '',
        '1. Toque em **Abrir site plural**',
        '2. Explore os planos',
        '3. Volte aqui para renovar ou pedir suporte',
      ].join('\n'),
      suggestions: ['Pedir renovação', 'Quando renovo?'],
      actions: [
        { type: 'link', label: 'Abrir site plural', url: PUBLIC_SITE },
        whatsappRenew(ctx),
      ],
    }
  }

  if (ctx.servico === 'netflix' && matches(msg, 'abrir netflix', 'entrar netflix', 'link netflix')) {
    return {
      reply: [
        'Para entrar na Netflix:',
        '1. Toque em **Abrir Netflix**',
        `2. Escolha o perfil **${ctx.perfil || 'indicado na aba Serviço'}**`,
        '3. Introduza o PIN se for pedido',
        '',
        'Se precisar, copie as credenciais antes.',
      ].join('\n'),
      suggestions: ['Ver credenciais', 'Copiar credenciais', 'Qual o meu PIN?'],
      actions: [
        { type: 'link', label: 'Abrir Netflix', url: NETFLIX_LOGIN_URL },
        { type: 'tab', label: 'Ver perfil e PIN', tab: 'servico' },
        ...(buildCredentialsText(ctx)
          ? ([{ type: 'copy', label: 'Copiar credenciais', text: buildCredentialsText(ctx) }] as AssistantAction[])
          : []),
      ],
    }
  }

  if (matches(msg, 'inscri', 'taxa', 'entrada')) {
    if (ctx.servico !== 'netflix') {
      return {
        reply: 'A taxa de inscrição aplica-se a planos Netflix. O seu serviço é IPTV — não há inscrição separada.',
        suggestions: ['Ver credenciais', 'Quando renovo?'],
        actions: [{ type: 'tab', label: 'Ver IPTV', tab: 'servico' }],
      }
    }
    const pago =
      ctx.inscricaoPaga === true
        ? 'Sim, inscrição **paga**.'
        : ctx.inscricaoPaga === false
          ? 'Inscrição ainda **pendente** — fale connosco para liquidar.'
          : 'Estado da inscrição não registado.'
    return {
      reply: [`Inscrição Netflix: ${pago}`, '', 'Se precisar de ajuda, fale com a equipa.'].join('\n'),
      suggestions: ['Falar com suporte', 'Ver credenciais'],
      actions: [whatsappSupport(ctx), { type: 'tab', label: 'Ver Netflix', tab: 'servico' }],
    }
  }

  return {
    reply: [
      'Ainda não tenho a certeza sobre isso.',
      '',
      'Pode perguntar-me sobre:',
      '1. **Renovação** e datas',
      '2. **Credenciais** (Netflix / IPTV)',
      '3. **PIN** da área cliente',
      '4. **Indicações**',
      '5. **Suporte** no WhatsApp',
      '',
      'Ou escolha uma acção rápida abaixo.',
    ].join('\n'),
    suggestions: ['Quando renovo?', 'Ver credenciais', 'Como indicar amigo?', 'Falar com suporte', 'Menu'],
    actions: [
      { type: 'tab', label: 'Ver credenciais', tab: 'servico' },
      { type: 'tab', label: 'Renovar', tab: 'renovar' },
      whatsappSupport(ctx),
    ],
  }
}
