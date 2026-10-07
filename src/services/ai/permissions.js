export const DEFAULT_ASSISTANT_PERMISSIONS = {
  createTransactions: true,
  editTransactions: false,
  deleteTransactions: false,
  groups: true,
  accountsCategories: false,
  debts: false,
  recurrences: false,
  settings: true,
  memory: true
};

export const PERMISSION_OPTIONS = [
  { key: 'createTransactions', label: 'Criar transações', desc: 'Lançar transações a partir de texto, recibos e PDFs.' },
  { key: 'editTransactions', label: 'Editar transações', desc: 'Alterar descrição, valor, data, conta, categoria ou marcar como ignorada.' },
  { key: 'deleteTransactions', label: 'Apagar transações', desc: 'Remover transações existentes (sempre pede confirmação).' },
  { key: 'groups', label: 'Grupos e regras', desc: 'Criar grupos, atribuir transações e criar regras automáticas.' },
  { key: 'accountsCategories', label: 'Contas e categorias', desc: 'Criar contas, cartões e categorias novas.' },
  { key: 'debts', label: 'Dívidas', desc: 'Registrar dívidas e marcar como pagas ou não pagas.' },
  { key: 'recurrences', label: 'Recorrências', desc: 'Criar assinaturas e parcelamentos.' },
  { key: 'settings', label: 'Tema e configurações', desc: 'Trocar tema, módulos da interface e período padrão.' },
  { key: 'memory', label: 'Memória', desc: 'Guardar preferências curtas para as próximas conversas.' }
];

export const TOOL_PERMISSIONS = {
  propose_transactions: 'createTransactions',
  propose_update_transactions: 'editTransactions',
  propose_delete_transactions: 'deleteTransactions',
  propose_group: 'groups',
  propose_assign: 'groups',
  propose_rule: 'groups',
  propose_category: 'accountsCategories',
  propose_account: 'accountsCategories',
  propose_debt: 'debts',
  propose_settle_debts: 'debts',
  propose_recurrence: 'recurrences',
  propose_settings_change: 'settings',
  remember_preference: 'memory'
};

export const resolvePermissions = permissions => ({ ...DEFAULT_ASSISTANT_PERMISSIONS, ...(permissions || {}) });

export const isToolAllowed = (name, permissions) => {
  const key = TOOL_PERMISSIONS[name];
  return !key || resolvePermissions(permissions)[key] === true;
};

export const disabledPermissionLabels = permissions => {
  const resolved = resolvePermissions(permissions);
  return PERMISSION_OPTIONS.filter(option => !resolved[option.key]).map(option => option.label);
};
