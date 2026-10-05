export const DEFAULT_MODEL_PRICES = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 }
};

export const currentMonthKey = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const estimateCost = (prices, model, usage) => {
  const price = prices?.[model];
  if (!price || (price.input == null && price.output == null) || !usage) return null;
  return ((usage.input || 0) * Number(price.input || 0) + (usage.output || 0) * Number(price.output || 0)) / 1e6;
};

export const addUsage = (state, { provider, model, usage, rateLimit }) => {
  const month = currentMonthKey();
  const base = state?.month === month ? state : { month, byModel: {}, rateLimits: state?.rateLimits || {} };
  const key = model || 'padrão';
  const previous = base.byModel?.[key] || { input: 0, output: 0, requests: 0 };
  return {
    ...base,
    byModel: {
      ...base.byModel,
      [key]: {
        provider,
        input: previous.input + (usage?.input || 0),
        output: previous.output + (usage?.output || 0),
        requests: previous.requests + (usage?.requests || 0)
      }
    },
    rateLimits: rateLimit ? { ...base.rateLimits, [provider]: { ...rateLimit, at: Date.now() } } : base.rateLimits
  };
};

export const monthTotals = (state, prices) => {
  const entries = Object.entries(state?.month === currentMonthKey() ? state.byModel || {} : {});
  let cost = 0;
  let hasCost = false;
  const totals = entries.reduce((sum, [model, item]) => {
    const itemCost = estimateCost(prices, model, item);
    if (itemCost != null) { cost += itemCost; hasCost = true; }
    return { input: sum.input + item.input, output: sum.output + item.output, requests: sum.requests + item.requests };
  }, { input: 0, output: 0, requests: 0 });
  return { ...totals, cost: hasCost ? cost : null, models: entries };
};

export const formatTokens = value => Number(value || 0).toLocaleString('pt-BR');

export const formatUsd = value => value == null ? '—' : `US$ ${value < 0.01 ? value.toFixed(4) : value.toFixed(2)}`.replace('.', ',');
