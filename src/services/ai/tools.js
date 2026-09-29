import { GroupsRepository } from '../GroupsRepository.js';
import { GroupRulesRepository } from '../GroupRulesRepository.js';
import { calculateGroupStats } from '../../utils/GroupStats.js';
import { normalizeText } from '../../utils/GroupRules.js';

const DAY = 24 * 60 * 60 * 1000;

const asArray = value => value == null ? [] : (Array.isArray(value) ? value : [value]);
const SETTINGS_UI_KEYS = [
  'homeShowAccounts',
  'homeShowCreditCards',
  'homeShowPending',
  'showInvestmentsTab',
  'hideDebtSettlements',
  'analyticsShowCharts',
  'transactionsShowFilters'
];
const DEFAULT_PERIODS = ['30d', '90d', 'all'];

const normalizeFilters = (args = {}) => ({
  text: asArray(args.text),
  from: args.from ?? args.dateFrom ?? args.startDate,
  to: args.to ?? args.dateTo ?? args.endDate,
  categoryIds: asArray(args.categoryIds ?? args.categoryId ?? args.category_ids),
  accountId: args.accountId ?? args.account_id,
  groupId: args.groupId ?? args.group_id,
  minAmount: args.minAmount,
  maxAmount: args.maxAmount,
  type: args.type,
  includeIgnored: args.includeIgnored
});

const dateStart = value => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};

const dateEnd = value => {
  const start = dateStart(value);
  return start == null ? null : start + DAY - 1;
};

const dateText = value => {
  if (value == null) return null;
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseNumber = value => value == null || value === '' ? null : Number(value);

const isHidden = tx => String(tx?.note || '').includes('[debt:');

const monthStart = (year, month) => new Date(year, month, 1).getTime();

const monthKey = value => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthRange = value => {
  const [year, month] = (value || monthKey(Date.now())).split('-').map(Number);
  const start = monthStart(year, month - 1);
  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    start,
    end: monthStart(year, month) - 1,
    previousStart: monthStart(year, month - 2),
    previousEnd: start - 1
  };
};

const normalizeTransactionItem = (item, ctx) => {
  const accounts = ctx.accounts || ctx.accountList || [];
  const categories = ctx.categoryList || ctx.categories || [];
  const groups = ctx.groupList || ctx.groups || [];
  const account = accounts.find(candidate => String(candidate.id) === String(item.accountId));
  const category = categories.find(candidate => String(candidate.id) === String(item.categoryId));
  const validGroupIds = asArray(item.groupIds)
    .map(Number)
    .filter(id => groups.some(group => Number(group.id) === id));
  return {
    ...item,
    amount: Math.abs(Number(item.amount || 0)),
    accountId: account?.id ?? accounts[0]?.id ?? null,
    categoryId: category?.id ?? null,
    groupIds: validGroupIds
  };
};

const filteredTransactions = (args = {}, ctx = {}) => {
  const {
    text, from, to, categoryIds, accountId, groupId, minAmount, maxAmount, type, includeIgnored = false
  } = normalizeFilters(args);
  const queries = text.map(normalizeText).filter(Boolean);
  const fromMs = dateStart(from);
  const toMs = dateEnd(to);
  const groups = ctx.txGroupMap || {};
  return (ctx.txList || []).filter(tx => {
    if (!includeIgnored && (tx.isIgnored === 1 || isHidden(tx))) return false;
    if (fromMs != null && tx.date < fromMs) return false;
    if (toMs != null && tx.date > toMs) return false;
    if (queries.length && !queries.some(query => normalizeText(`${tx.description || ''} ${tx.note || ''}`).includes(query))) return false;
    if (Array.isArray(categoryIds) && categoryIds.length && !categoryIds.map(String).includes(String(tx.categoryId))) return false;
    if (accountId != null && String(tx.accountId) !== String(accountId)) return false;
    if (groupId != null && !(groups[tx.id] || []).map(String).includes(String(groupId))) return false;
    if (type && tx.type !== type) return false;
    const amount = Math.abs(Number(tx.amount || 0));
    if (minAmount != null && amount < Number(minAmount)) return false;
    if (maxAmount != null && amount > Number(maxAmount)) return false;
    return true;
  }).sort((a, b) => b.date - a.date);
};

const transactionItem = (tx, ctx) => {
  const category = (ctx.categoryList || []).find(item => String(item.id) === String(tx.categoryId));
  const account = (ctx.accountList || []).find(item => String(item.id) === String(tx.accountId));
  return {
    id: tx.id,
    date: dateText(tx.date),
    description: tx.description,
    amount: Math.abs(Number(tx.amount || 0)),
    type: tx.type,
    categoryId: tx.categoryId ?? null,
    categoryName: category?.name || null,
    accountId: tx.accountId ?? null,
    accountName: account?.name || null,
    groupIds: (ctx.txGroupMap?.[tx.id] || []).map(Number),
    isPending: tx.isPending === 1
  };
};

const proposal = (ctx, type, payload) => {
  const proposalId = `proposal_${Date.now()}_${(ctx.proposals || []).length + 1}`;
  if (!ctx.proposals) ctx.proposals = [];
  ctx.proposals.push({ proposalId, type, ...payload, status: 'pending' });
  return { ok: true, proposalId };
};

const groupStats = async group => {
  const transactions = await GroupsRepository.getTransactionsForGroup(group.id);
  return { transactions, stats: calculateGroupStats(transactions, group) };
};

export const TOOL_SPECS = [
  {
    name: 'search_transactions',
    description: 'Busca transações por texto, período, categoria, conta, grupo, valor ou tipo. text pode ser uma lista de termos (OU). Prefira UMA busca ampla (por categoria, período ou lista de termos) a várias buscas de uma palavra.',
    parameters: {
      type: 'object',
      properties: {
        text: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        from: { type: 'string' }, to: { type: 'string' }, dateFrom: { type: 'string' }, dateTo: { type: 'string' },
        startDate: { type: 'string' }, endDate: { type: 'string' },
        categoryIds: { type: 'array', items: { type: 'integer' } }, categoryId: { type: 'integer' },
        category_ids: { type: 'array', items: { type: 'integer' } }, accountId: { type: 'integer' },
        account_id: { type: 'integer' }, groupId: { type: 'integer' }, group_id: { type: 'integer' },
        minAmount: { type: 'number' }, maxAmount: { type: 'number' },
        type: { type: 'string', enum: ['income', 'expense'] }, limit: { type: 'integer' }, offset: { type: 'integer' },
        includeIgnored: { type: 'boolean' }
      }
    }
  },
  {
    name: 'summarize_transactions',
    description: 'Resume transações agrupando por mês, categoria, conta, grupo ou tipo.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: { type: 'string', enum: ['month', 'category', 'account', 'group', 'type'] },
        from: { type: 'string' }, to: { type: 'string' }, dateFrom: { type: 'string' }, dateTo: { type: 'string' },
        startDate: { type: 'string' }, endDate: { type: 'string' },
        categoryIds: { type: 'array', items: { type: 'integer' } }, categoryId: { type: 'integer' },
        category_ids: { type: 'array', items: { type: 'integer' } }, accountId: { type: 'integer' },
        account_id: { type: 'integer' }, groupId: { type: 'integer' }, group_id: { type: 'integer' },
        text: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }
      },
      required: ['groupBy']
    }
  },
  {
    name: 'list_groups',
    description: 'Lista grupos ativos e arquivados com estatísticas.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_group',
    description: 'Retorna detalhes, estatísticas e últimas transações de um grupo.',
    parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }
  },
  {
    name: 'list_rules',
    description: 'Lista regras automáticas de grupos.',
    parameters: { type: 'object', properties: { groupId: { type: 'integer' } } }
  },
  {
    name: 'get_settings',
    description: 'Retorna configurações gerais sem chaves secretas.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'month_summary',
    description: 'Resume o mês atual ou um mês informado em 4–6 pontos curtos.',
    parameters: {
      type: 'object',
      properties: { month: { type: 'string', description: 'YYYY-MM' } }
    }
  },
  {
    name: 'propose_group',
    description: 'Propõe criar um grupo e opcionalmente atribuir transações e uma regra.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' }, kind: { type: 'string', enum: ['event', 'ongoing'] }, description: { type: 'string' },
        startDate: { type: 'string' }, endDate: { type: 'string' }, budget: { type: 'number' },
        transactionIds: { type: 'array', items: { type: 'integer' } },
        rule: {
          type: 'object',
          properties: {
            keywords: { type: 'array', items: { type: 'string' } },
            categoryIds: { type: 'array', items: { type: 'integer' } },
            accountId: { type: 'integer' },
            minAmount: { type: 'number' },
            maxAmount: { type: 'number' }
          }
        }
      },
      required: ['name', 'kind']
    }
  },
  {
    name: 'propose_assign',
    description: 'Propõe atribuir transações a um grupo sem remover outros grupos.',
    parameters: {
      type: 'object',
      properties: { groupId: { type: 'integer' }, transactionIds: { type: 'array', items: { type: 'integer' } } },
      required: ['groupId', 'transactionIds']
    }
  },
  {
    name: 'propose_rule',
    description: 'Propõe uma regra automática para um grupo.',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'integer' }, keywords: { type: 'array', items: { type: 'string' } },
        categoryIds: { type: 'array', items: { type: 'integer' } }, accountId: { type: 'integer' },
        minAmount: { type: 'number' }, maxAmount: { type: 'number' },
        dateFrom: { type: 'string' }, dateTo: { type: 'string' }
      },
      required: ['groupId']
    }
  },
  {
    name: 'propose_transactions',
    description: 'Propõe criar transações para confirmação do usuário.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              amount: { type: 'number', description: 'valor positivo' },
              type: { type: 'string', enum: ['expense', 'income'] },
              date: { type: 'string', description: 'YYYY-MM-DD' },
              categoryId: { type: 'integer' },
              accountId: { type: 'integer' },
              note: { type: 'string' },
              groupIds: { type: 'array', items: { type: 'integer' } }
            },
            required: ['description', 'amount', 'type', 'date']
          }
        }
      },
      required: ['items']
    }
  },
  {
    name: 'propose_settings_change',
    description: 'Propõe alterar tema, módulos da interface ou período padrão.',
    parameters: {
      type: 'object',
      properties: {
        themeId: { type: 'string', description: 'id de um tema de get_settings.themes' },
        uiConfig: {
          type: 'object',
          description: 'chaves booleanas: homeShowAccounts, homeShowCreditCards, homeShowPending, showInvestmentsTab, hideDebtSettlements, analyticsShowCharts, transactionsShowFilters'
        },
        defaultPeriod: { type: 'string', enum: DEFAULT_PERIODS }
      }
    }
  },
  {
    name: 'remember_preference',
    description: 'Guarda uma preferência durável e curta do usuário.',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  }
];

export async function executeTool(name, args = {}, ctx = {}) {
  if (name === 'search_transactions') {
    const all = filteredTransactions(args, ctx);
    const limit = Math.min(200, Math.max(1, Number(args.limit) || 50));
    const offset = Math.max(0, Number(args.offset) || 0);
    const items = all.slice(offset, offset + limit).map(tx => transactionItem(tx, ctx));
    return {
      total: all.length,
      items,
      ...(all.length > offset + items.length ? { hint: 'Há mais resultados; use offset para ver mais.' } : {})
    };
  }
  if (name === 'summarize_transactions') {
    const rows = new Map();
    const all = filteredTransactions(args, ctx);
    const filters = normalizeFilters(args);
    const groupBy = args.groupBy || 'month';
    all.forEach(tx => {
      const category = (ctx.categoryList || []).find(item => String(item.id) === String(tx.categoryId));
      const account = (ctx.accountList || []).find(item => String(item.id) === String(tx.accountId));
      const groupIds = ctx.txGroupMap?.[tx.id] || [];
      const groups = (ctx.groupList || []).filter(group => groupIds.map(String).includes(String(group.id)));
      const labels = groupBy === 'month'
        ? [{ key: dateText(tx.date).slice(0, 7), label: new Date(tx.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) }]
        : groupBy === 'category' ? [{ key: String(tx.categoryId || 'none'), label: category?.name || 'Sem categoria' }]
          : groupBy === 'account' ? [{ key: String(tx.accountId || 'none'), label: account?.name || 'Sem conta' }]
            : groupBy === 'type' ? [{ key: tx.type, label: tx.type === 'income' ? 'Receitas' : 'Despesas' }]
              : (groups.length ? groups : [{ id: 'none', name: 'Sem grupo' }]).map(group => ({ key: String(group.id || 'none'), label: group.name }));
      labels.forEach(({ key, label }) => {
        const row = rows.get(key) || { key, label, income: 0, expense: 0, count: 0 };
        row[tx.type === 'income' ? 'income' : 'expense'] += Math.abs(Number(tx.amount || 0));
        row.count += 1;
        rows.set(key, row);
      });
    });
    const resultRows = [...rows.values()].sort((a, b) => a.label.localeCompare(b.label));
    return {
      from: filters.from || null,
      to: filters.to || null,
      rows: resultRows,
      totals: {
        income: resultRows.reduce((sum, row) => sum + row.income, 0),
        expense: resultRows.reduce((sum, row) => sum + row.expense, 0)
      }
    };
  }
  if (name === 'list_groups') {
    const groups = await GroupsRepository.getAll({ includeArchived: true });
    const items = [];
    for (const group of groups) {
      const { stats } = await groupStats(group);
      items.push({ id: group.id, name: group.name, kind: group.kind, startDate: dateText(group.startDate), endDate: dateText(group.endDate), budget: group.budget, isArchived: group.isArchived, transactionCount: stats.count, total: stats.total, currentMonthTotal: stats.currentMonthTotal, monthlyAverage: stats.monthlyAverage });
    }
    return { items };
  }
  if (name === 'get_group') {
    const group = await GroupsRepository.getById(args.id);
    if (!group) return { error: 'Grupo não encontrado.' };
    const { transactions, stats } = await groupStats(group);
    return { ...group, stats, transactions: transactions.slice(0, 30).map(tx => transactionItem(tx, ctx)) };
  }
  if (name === 'list_rules') {
    const rules = args.groupId == null ? await GroupRulesRepository.getAll() : await GroupRulesRepository.getForGroup(args.groupId);
    return { items: rules };
  }
  if (name === 'get_settings') {
    return {
      currency: 'BRL',
      ...(ctx.settings || {}),
      hideSettlements: ctx.settings?.hideSettlements !== false,
      themes: (ctx.themes || []).map(theme => ({ id: theme.id, name: theme.name })),
      activeThemeId: ctx.activeThemeId || ctx.activeTheme?.id || null,
      uiConfig: Object.fromEntries(
        SETTINGS_UI_KEYS
          .filter(key => ctx.uiConfig?.[key] !== undefined)
          .map(key => [key, ctx.uiConfig[key]])
      ),
      defaultPeriod: ctx.defaultPeriod || null
    };
  }
  if (name === 'month_summary') {
    const range = monthRange(args.month);
    const transactions = (ctx.txList || []).filter(tx =>
      !tx.isIgnored &&
      !isHidden(tx) &&
      tx.date >= range.start &&
      tx.date <= range.end
    );
    const previousTransactions = (ctx.txList || []).filter(tx =>
      !tx.isIgnored &&
      !isHidden(tx) &&
      tx.date >= range.previousStart &&
      tx.date <= range.previousEnd
    );
    const usable = transactions.filter(tx => tx.isPending !== 1);
    const income = usable
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
    const expense = usable
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
    const previousExpense = previousTransactions
      .filter(tx => tx.type === 'expense' && tx.isPending !== 1)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
    const categoryTotals = new Map();
    usable.filter(tx => tx.type === 'expense').forEach(tx => {
      const category = (ctx.categoryList || []).find(item => String(item.id) === String(tx.categoryId));
      const key = category?.name || 'Sem categoria';
      categoryTotals.set(key, (categoryTotals.get(key) || 0) + Math.abs(Number(tx.amount || 0)));
    });
    const topCategories = [...categoryTotals.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const topExpenses = usable
      .filter(tx => tx.type === 'expense')
      .sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)))
      .slice(0, 3)
      .map(tx => ({ date: dateText(tx.date), description: tx.description, amount: Math.abs(Number(tx.amount || 0)) }));
    return {
      month: range.month,
      income,
      expense,
      balance: income - expense,
      previousExpense,
      expenseChangePct: previousExpense ? ((expense - previousExpense) / previousExpense) * 100 : null,
      topCategories,
      topExpenses,
      pendingCount: transactions.filter(tx => tx.isPending === 1).length
    };
  }
  if (name === 'propose_group') {
    const rule = args.rule ? {
      ...args.rule,
      categoryIds: asArray(args.rule.categoryIds ?? args.rule.categoryId ?? args.rule.category_ids),
      accountId: args.rule.accountId ?? args.rule.account_id
    } : null;
    return proposal(ctx, 'group', {
    name: args.name,
    kind: args.kind,
    description: args.description || '',
    startDate: args.startDate || null,
    endDate: args.endDate || null,
    budget: parseNumber(args.budget),
    transactionIds: (args.transactionIds || []).map(Number),
    transactionPreview: (args.transactionIds || []).map(Number).map(id => ctx.txList?.find(tx => Number(tx.id) === id)?.description).filter(Boolean).slice(0, 5),
      rule
    });
  }
  if (name === 'propose_assign') return proposal(ctx, 'assign', {
    groupId: Number(args.groupId),
    transactionIds: (args.transactionIds || []).map(Number),
    transactionPreview: (args.transactionIds || []).map(Number).map(id => ctx.txList?.find(tx => Number(tx.id) === id)?.description).filter(Boolean).slice(0, 5)
  });
  if (name === 'propose_rule') return proposal(ctx, 'rule', { groupId: Number(args.groupId), ...args });
  if (name === 'propose_transactions') {
    const items = (args.items || []).map(item => normalizeTransactionItem(item, ctx));
    return proposal(ctx, 'transactions', {
      items,
      count: items.length,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      transactionPreview: items.map(item => item.description).filter(Boolean).slice(0, 5)
    });
  }
  if (name === 'propose_settings_change') {
    const themes = ctx.themes || [];
    const theme = args.themeId ? themes.find(item => item.id === args.themeId) : null;
    if (args.themeId && !theme) return { error: 'Tema não encontrado.' };
    const uiConfig = Object.fromEntries(
      Object.entries(args.uiConfig || {}).filter(([key, value]) =>
        SETTINGS_UI_KEYS.includes(key) && typeof value === 'boolean'
      )
    );
    const defaultPeriod = DEFAULT_PERIODS.includes(args.defaultPeriod) ? args.defaultPeriod : undefined;
    const summary = [];
    if (theme) summary.push(`Tema: ${theme.name}`);
    Object.entries(uiConfig).forEach(([key, value]) => {
      const labels = {
        homeShowAccounts: 'contas na Home',
        homeShowCreditCards: 'cartões na Home',
        homeShowPending: 'pendências na Home',
        showInvestmentsTab: 'aba de investimentos',
        hideDebtSettlements: 'liquidações de dívidas',
        analyticsShowCharts: 'gráficos da análise',
        transactionsShowFilters: 'filtros de transações'
      };
      summary.push(`${value ? 'Mostrar' : 'Ocultar'} ${labels[key] || key}`);
    });
    if (defaultPeriod) summary.push(`Período padrão: ${defaultPeriod}`);
    return proposal(ctx, 'settings', {
      themeId: theme?.id || null,
      themeName: theme?.name || null,
      uiConfig,
      defaultPeriod: defaultPeriod || null,
      summary
    });
  }
  if (name === 'remember_preference') {
    const text = String(args.text || '').trim();
    if (text) ctx.memoryWrites = [...(ctx.memoryWrites || []), text].slice(-10);
    return { ok: true, text };
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
}
