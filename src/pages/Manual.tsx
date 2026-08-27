import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Server,
  Store,
  LayoutGrid,
  Gift,
  UserCog,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface Secao {
  id: string
  icon: typeof LayoutDashboard
  titulo: string
  desc: string
  detalhes: { titulo: string; passos: string[] }[]
}

const SECOES: Secao[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titulo: 'Dashboard',
    desc: 'Visão geral: total de clientes, receita do mês, vencimentos e indicações pendentes.',
    detalhes: [
      {
        titulo: 'O que é o Dashboard',
        passos: [
          'O Dashboard mostra métricas em tempo real: total de clientes IPTV e Netflix, receita do mês, vencimentos próximos e indicações pendentes.',
          'Os cards principais mostram: total de clientes, receita do mês, clientes vencidos, vencimentos hoje e em 7 dias.',
          'A secção de indicações mostra total, pendentes e confirmadas.',
          'Os gráficos mostram: distribuição por servidor, receita dos últimos meses e clientes novos.',
        ],
      },
      {
        titulo: 'Como interpretar os dados',
        passos: [
          'Clique nos cards de navegação rápida para ir diretamente para Clientes, Revendedores, Salas ou Indicações.',
          'O gráfico de receita mostra a evolução mensal.',
          'Clientes vencidos e cancelados aparecem destacados para ação rápida.',
        ],
      },
    ],
  },
  {
    id: 'clientes',
    icon: Users,
    titulo: 'Clientes',
    desc: 'Gestão de clientes IPTV e Netflix. Crie, edite, renove, suspenda ou ative. Filtre por servidor, revendedor, sala e estado.',
    detalhes: [
      {
        titulo: 'Criar novo cliente',
        passos: [
          'Clique no botão "+ Novo cliente".',
          'Selecione o serviço: IPTV ou Netflix.',
          'Preencha os campos obrigatórios: nome, WhatsApp, localização, plano, data início, data fim e valor.',
          'Para IPTV: escolha o servidor e o revendedor (se aplicável).',
          'Para Netflix Plano Room: escolha a sala.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Editar cliente',
        passos: [
          'Na linha do cliente, clique no ícone de lápis (Editar).',
          'Altere os campos desejados (nome, contacto, plano, datas, valor, etc.).',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Renovar cliente',
        passos: [
          'Clique no botão "Renovar" na linha do cliente.',
          'A data fim será prolongada conforme o plano (mensalidade).',
          'Confirme a renovação. O cliente só pode ser renovado se estiver ativo.',
        ],
      },
      {
        titulo: 'Marcar inscrição como paga',
        passos: [
          'Para clientes Netflix com inscrição pendente, use o botão "Marcar pago".',
          'Confirme a ação. O cliente fica com a inscrição registada como paga.',
        ],
      },
      {
        titulo: 'Atribuir sala',
        passos: [
          'Para clientes Netflix Plano Room, clique em "Atribuir sala".',
          'Selecione a sala na lista e clique em "Guardar".',
          'A data fim do cliente pode ser alinhada à data fim da sala.',
        ],
      },
      {
        titulo: 'Suspender cliente',
        passos: [
          'Clique no botão "Suspender" na linha do cliente.',
          'Confirme no modal. O cliente passa a estado "suspenso" e não pode ser renovado.',
        ],
      },
      {
        titulo: 'Ativar cliente',
        passos: [
          'Para clientes suspensos, clique em "Ativar".',
          'Confirme no modal. O cliente volta a estado normal.',
        ],
      },
      {
        titulo: 'Filtrar clientes',
        passos: [
          'Use os filtros: Servidor, Revendedor, Sala (Netflix), Estado (ativo/vencido/cancelado).',
          'Use "Vencendo" para ver clientes por vencer (hoje, 7 dias, 30 dias).',
          'Use a caixa de pesquisa para buscar por nome ou WhatsApp.',
        ],
      },
    ],
  },
  {
    id: 'servidores',
    icon: Server,
    titulo: 'Servidores',
    desc: 'Servidores IPTV (Principal e Secundário). Associe clientes a cada servidor.',
    detalhes: [
      {
        titulo: 'Criar servidor',
        passos: [
          'Clique no botão "+ Novo servidor".',
          'Preencha o nome do servidor.',
          'Selecione o tipo: Principal ou Secundário.',
          'Se for Secundário, selecione o servidor primário a que pertence.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Editar servidor',
        passos: [
          'Clique no ícone de lápis (Editar) na linha do servidor.',
          'Altere o nome, tipo ou servidor primário (se secundário).',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Excluir servidor',
        passos: [
          'Clique no ícone de lixo (Excluir).',
          'Confirme. Os clientes vinculados ficarão sem servidor atribuído.',
        ],
      },
    ],
  },
  {
    id: 'revendedores',
    icon: Store,
    titulo: 'Revendedores',
    desc: 'Revendedores do serviço IPTV. Pode suspender e ativar conforme necessário.',
    detalhes: [
      {
        titulo: 'Criar revendedor',
        passos: [
          'Clique no botão "+ Novo revendedor".',
          'Preencha nome e contacto (obrigatórios).',
          'Opcional: escolha o servidor e adicione observações.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Editar revendedor',
        passos: [
          'Clique no ícone de lápis (Editar) na linha do revendedor.',
          'Altere os campos desejados.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Suspender revendedor',
        passos: [
          'Clique no botão "Suspender" na linha do revendedor.',
          'Confirme no modal. O revendedor fica suspenso.',
        ],
      },
      {
        titulo: 'Ativar revendedor',
        passos: [
          'Para revendedores suspensos, clique em "Ativar".',
          'Confirme no modal.',
        ],
      },
    ],
  },
  {
    id: 'salas',
    icon: LayoutGrid,
    titulo: 'Salas Netflix',
    desc: 'Contas (salas) do Plano Room. Atribua clientes Netflix a salas e defina a data fim partilhada.',
    detalhes: [
      {
        titulo: 'Criar sala',
        passos: [
          'Clique no botão "+ Nova sala".',
          'Preencha o nome da sala (obrigatório).',
          'Opcional: email e senha da conta Netflix, data fim e observações.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Editar sala',
        passos: [
          'Clique no ícone de lápis (Editar) na linha da sala.',
          'Altere nome, email, senha, data fim ou observações.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Suspender sala',
        passos: [
          'Clique no botão "Suspender" na linha da sala.',
          'Confirme no modal. A sala fica suspensa.',
        ],
      },
      {
        titulo: 'Ativar sala',
        passos: [
          'Para salas suspensas, clique em "Ativar".',
          'Confirme no modal.',
        ],
      },
      {
        titulo: 'Excluir sala',
        passos: [
          'Clique no ícone de lixo (Excluir).',
          'Confirme. Os clientes vinculados ficarão sem sala atribuída.',
        ],
      },
    ],
  },
  {
    id: 'indicacoes',
    icon: Gift,
    titulo: 'Indicações',
    desc: 'Registo de indicações. Confirme indicações pendentes e acompanhe quem indicou quem.',
    detalhes: [
      {
        titulo: 'Registar nova indicação',
        passos: [
          'Clique no botão "+ Nova indicação".',
          'Selecione o cliente que indicou (indicador).',
          'Preencha o nome do indicado (obrigatório).',
          'Opcional: WhatsApp do indicado.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Confirmar indicação',
        passos: [
          'Clique no botão "Confirmar" na indicação pendente.',
          'A indicação passa a estado "confirmada".',
        ],
      },
      {
        titulo: 'Editar indicação',
        passos: [
          'Clique no ícone de lápis (Editar) na linha da indicação.',
          'Altere nome ou WhatsApp do indicado.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Reverter para pendente',
        passos: [
          'Clique no botão "Reverter" na indicação confirmada.',
          'Confirme. A indicação volta a estado "pendente".',
        ],
      },
      {
        titulo: 'Excluir indicação',
        passos: [
          'Clique no ícone de lixo (Excluir).',
          'Confirme no modal.',
        ],
      },
      {
        titulo: 'Filtrar indicações',
        passos: [
          'Use os chips: Total, Pendentes, Confirmadas para filtrar.',
        ],
      },
    ],
  },
  {
    id: 'financeiro',
    icon: DollarSign,
    titulo: 'Financeiro',
    desc: 'Controlo financeiro simples: acompanha clientes, tipos de serviço, quanto cada um paga e quanto deve entrar mensalmente. Projeção de receitas e fluxo de entradas – para gestão interna, não contabilidade formal.',
    detalhes: [
      {
        titulo: 'O que é esta área',
        passos: [
          'Não é contabilidade pesada nem formal. É apenas controlo financeiro simples e projeção de receitas.',
          'Acompanha quantos clientes tens, os tipos de serviço (Netflix, IPTV por servidor), quanto cada cliente paga por mês e quanto dinheiro deve entrar mensalmente.',
          'Visão clara das receitas previstas, crescimento de clientes e valor total esperado por mês.',
          'Usado para gestão interna do negócio, não para fins contabilísticos oficiais.',
        ],
      },
      {
        titulo: 'Cálculo das entradas',
        passos: [
          'Receita mensal = soma do valor que cada cliente ativo paga (preço do serviço).',
          'Separada por tipo: Netflix e IPTV.',
          'Receita por servidor: no IPTV, quanto entra por cada servidor no mês atual.',
          'Receita do mês (est.): clientes cujo vencimento cai no mês atual.',
        ],
      },
      {
        titulo: 'Projeção de receita futura',
        passos: [
          'Projeção simples: receita mensal × número de meses (assumindo clientes ativos mantêm-se).',
          'Com crescimento: adicione estimativa de novos clientes por mês e valor médio para recalcular.',
        ],
      },
      {
        titulo: 'Finanças devidas',
        passos: [
          'Valor em dívida de clientes vencidos. Use o seletor para ver Netflix, IPTV ou Total.',
        ],
      },
      {
        titulo: 'Receita do mês e gráfico',
        passos: [
          'Receita do mês (est.): receita estimada com base nos clientes ativos cujo vencimento cai no mês atual.',
          'O gráfico mostra a evolução das entradas pelos últimos meses.',
        ],
      },
    ],
  },
  {
    id: 'utilizadores',
    icon: UserCog,
    titulo: 'Utilizadores',
    desc: 'Gestão de acessos ao painel (apenas administrador). Crie utilizadores, defina perfis e redefina senhas.',
    detalhes: [
      {
        titulo: 'Criar utilizador',
        passos: [
          'Clique no botão "+ Novo utilizador".',
          'Preencha nome, email e senha (obrigatórios).',
          'Selecione o perfil: Geral, Netflix ou IPTV.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Editar utilizador',
        passos: [
          'Clique no ícone de lápis (Editar) na linha do utilizador.',
          'Altere nome, email ou perfil.',
          'Não altere a senha aqui — use "Redefinir senha".',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Redefinir senha',
        passos: [
          'Clique no botão "Redefinir senha" na linha do utilizador.',
          'Introduza a nova senha e confirme.',
          'Clique em "Guardar".',
        ],
      },
      {
        titulo: 'Suspender utilizador',
        passos: [
          'Clique no botão "Suspender".',
          'Confirme no modal. O utilizador não consegue fazer login.',
        ],
      },
      {
        titulo: 'Ativar utilizador',
        passos: [
          'Para utilizadores suspensos, clique em "Ativar".',
          'Confirme no modal.',
        ],
      },
      {
        titulo: 'Eliminar utilizador',
        passos: [
          'Clique no ícone de lixo (Eliminar).',
          'Confirme no modal.',
        ],
      },
      {
        titulo: 'Perfis de acesso',
        passos: [
          'Administrador: acesso total.',
          'Geral: acesso a todas as áreas de clientes.',
          'Netflix: apenas clientes e salas Netflix.',
          'IPTV: apenas clientes e revendedores IPTV.',
        ],
      },
    ],
  },
  {
    id: 'log',
    icon: FileText,
    titulo: 'Log',
    desc: 'Registo de alterações no sistema. Filtre por entidade, ação, utilizador ou período.',
    detalhes: [
      {
        titulo: 'O que é o Log',
        passos: [
          'O Log regista todas as alterações no sistema: criação, atualização, renovação, suspensão, ativação e eliminação.',
          'Cada entrada mostra: ação, entidade, detalhes, utilizador e data.',
        ],
      },
      {
        titulo: 'Filtrar registos',
        passos: [
          'Entidade: filtro por Cliente, Servidor, Revendedor, Sala ou Indicação.',
          'Ação: filtro por tipo de ação (criar, atualizar, renovar, suspender, etc.).',
          'Utilizador: filtro por quem fez a alteração.',
          'Período: datas de início e fim.',
        ],
      },
      {
        titulo: 'Como usar os filtros',
        passos: [
          'Selecione os filtros desejados e a lista atualiza automaticamente.',
          'Limite o período para ver mais registos recentes.',
        ],
      },
    ],
  },
]

export default function Manual() {
  const [expandido, setExpandido] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandido((prev) => (prev === id ? null : id))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Manual do Utilizador
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Clique em cada módulo para ver instruções detalhadas de como fazer cada ação.
        </p>
      </div>

      <div className="space-y-3">
        {SECOES.map((s) => {
          const aberto = expandido === s.id
          return (
            <div
              key={s.id}
              className={`rounded-md border shadow-lg overflow-hidden transition-all ${
                aberto
                  ? 'border-primary-500/70 bg-primary-500/10 shadow-xl shadow-black/30 ring-2 ring-primary-500/30'
                  : 'border-netflix-border/80 bg-netflix-card/80 shadow-black/20'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={`w-full flex items-start gap-3 p-5 text-left transition-colors ${
                  aberto ? 'bg-primary-500/10' : 'hover:bg-white/5'
                }`}
              >
                <div
                  className={`p-2.5 rounded-md shrink-0 ${
                    aberto ? 'bg-primary-500/40 text-primary-300' : 'bg-primary-500/20 text-primary-400'
                  }`}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">{s.titulo}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
                <div className="shrink-0 pt-1">
                  {aberto ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {aberto && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-netflix-border/60"
                  >
                    <div className="p-5 pt-4 space-y-6 bg-black/20">
                      {s.detalhes.map((d) => (
                        <div key={d.titulo}>
                          <h4 className="text-sm font-semibold text-primary-300 mb-2">{d.titulo}</h4>
                          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-300">
                            {d.passos.map((p, i) => (
                              <li key={i} className="leading-relaxed">
                                {p}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
