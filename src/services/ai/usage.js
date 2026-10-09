export const DEFAULT_MODEL_PRICES = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-3.7-flash': {
    input: 0.75,
    output: 3.75,
    schedule: [{ from: '2027-01-01', input: 1.5, output: 7.5 }]
  },
  'claude-fable-5': { input: 10, output: 50 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-4-6': { input: 5, output: 25 },
  'claude-sonnet-4-6': { input: 3, output: 15 }
};

export const GEMINI_COST_NOTE = 'Estimativa com preço do plano pago; no plano gratuito do Gemini o custo é zero.';

export const currentMonthKey = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const estimateCost = (prices, model, usage, at = new Date()) => {
  const basePrice = prices?.[model];
  if (!basePrice || !usage) return null;

  const date = at instanceof Date ? at : new Date(at);
  const localDate = Number.isNaN(date.getTime())
    ? null
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const scheduledPrice = localDate && Array.isArray(basePrice.schedule)
    ? basePrice.schedule.reduce((selected, entry) => (
      typeof entry?.from === 'string' && entry.from <= localDate ? entry : selected
    ), null)
    : null;
  const price = scheduledPrice ? { ...basePrice, ...scheduledPrice } : basePrice;
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
