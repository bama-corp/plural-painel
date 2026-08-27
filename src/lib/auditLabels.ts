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
  pay_sala_month: 'Renovar sala',
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

export const AUDIT_ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: 'Clientes',
    actions: [
      'create_client',
      'update_client',
      'renew_client',
      'mark_paid_client',
      'suspend_client',
      'activate_client',
      'delete_client',
    ],
  },
  {
    label: 'Financeiro / infra',
    actions: ['pay_servidor_month', 'pay_sala_month'],
  },
  {
    label: 'Servidores',
    actions: ['create_servidor', 'update_servidor', 'suspend_servidor', 'delete_servidor'],
  },
  {
    label: 'Salas',
    actions: ['create_sala', 'update_sala', 'suspend_sala', 'activate_sala', 'delete_sala'],
  },
  {
    label: 'Revendedores',
    actions: [
      'create_revendedor',
      'update_revendedor',
      'suspend_revendedor',
      'activate_revendedor',
      'delete_revendedor',
    ],
  },
  {
    label: 'Indicações',
    actions: ['create_indicacao', 'update_indicacao', 'delete_indicacao'],
  },
  {
    label: 'Utilizadores',
    actions: ['create_user', 'update_user', 'suspend_user', 'activate_user', 'delete_user'],
  },
]

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity
}

/** Cor do badge por tipo de ação */
export function auditActionTone(action: string): string {
  if (action.startsWith('create_')) return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35'
  if (action.startsWith('delete_')) return 'bg-red-500/15 text-red-200 border-red-500/35'
  if (action.startsWith('suspend_')) return 'bg-amber-500/15 text-amber-200 border-amber-500/35'
  if (action.includes('pay_') || action.includes('mark_paid') || action.includes('renew'))
    return 'bg-sky-500/15 text-sky-200 border-sky-500/35'
  if (action.startsWith('activate_')) return 'bg-green-500/15 text-green-200 border-green-500/35'
  return 'bg-violet-500/15 text-violet-200 border-violet-500/35'
}
