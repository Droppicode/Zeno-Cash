export const HOME_MODULES = [
  { key: 'accounts', label: 'Suas Contas', icon: 'wallet', toggle: 'homeShowAccounts' },
  { key: 'creditCards', label: 'Cartões de Crédito', icon: 'card', toggle: 'homeShowCreditCards' },
  { key: 'pending', label: 'Transações Pendentes', icon: 'time', toggle: 'homeShowPending' },
  { key: 'recent', label: 'Últimas Transações', icon: 'list', toggle: 'homeShowRecent' },
  { key: 'debts', label: 'Controle de Dívidas', icon: 'people', toggle: 'homeShowDebts' },
  { key: 'budgets', label: 'Limites por Macro', icon: 'speedometer', toggle: 'homeShowBudgets' },
  { key: 'groups', label: 'Grupos', icon: 'albums', toggle: 'homeShowGroups' },
];

export const ANALYTICS_MODULES = [
  { key: 'kpis', label: 'Resumo Financeiro (KPIs)', icon: 'stats-chart' },
  { key: 'monthly', label: 'Evolução Mensal', icon: 'bar-chart' },
  { key: 'composition', label: 'Composição de Gastos', icon: 'pie-chart' },
  { key: 'cashflow', label: 'Fluxo de Caixa', icon: 'trending-up' },
  { key: 'heatmap', label: 'Heatmap Semanal', icon: 'grid' },
  { key: 'ranking', label: 'Ranking de Categorias', icon: 'podium' },
  { key: 'accounts', label: 'Análise por Conta', icon: 'wallet' },
  { key: 'recurrence', label: 'Recorrências', icon: 'repeat' },
  { key: 'villains', label: 'Top Vilões', icon: 'flame' },
  { key: 'insights', label: 'Insights Inteligentes', icon: 'bulb' },
];

export const DEFAULT_HOME_ORDER = HOME_MODULES.map(mod => mod.key);
export const DEFAULT_ANALYTICS_ORDER = ANALYTICS_MODULES.map(mod => mod.key);

// Keeps the saved order and inserts modules it doesn't know yet right after their predecessor in the default order.
export const resolveOrder = (saved, defaults) => {
  if (!Array.isArray(saved) || saved.length === 0) return [...defaults];
  const order = saved.filter((key, idx) => defaults.includes(key) && saved.indexOf(key) === idx);
  defaults.forEach((key, idx) => {
    if (order.includes(key)) return;
    const previous = defaults.slice(0, idx).reverse().find(prev => order.includes(prev));
    order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, key);
  });
  return order;
};

export const resolveHomeOrder = saved => resolveOrder(saved, DEFAULT_HOME_ORDER);
export const resolveAnalyticsOrder = saved => resolveOrder(saved, DEFAULT_ANALYTICS_ORDER);
