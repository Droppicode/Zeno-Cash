import { addUsage, estimateCost, monthTotals } from '../src/services/ai/usage';

describe('AI usage accounting', () => {
  afterEach(() => jest.useRealTimers());

  it('estimates cost using per-million-token prices', () => {
    expect(estimateCost({ model: { input: 2.5, output: 10 } }, 'model', {
      input: 1_000_000,
      output: 500_000
    })).toBe(7.5);
  });

  it('returns null for missing model prices and zero for a known model with zero usage', () => {
    const prices = { model: { input: 2, output: 4 } };
    expect(estimateCost(prices, 'unknown', { input: 5 })).toBeNull();
    expect(estimateCost(prices, 'model', { input: 0, output: 0 })).toBe(0);
  });

  it('accumulates requests and tokens for the current month', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-10T12:00:00Z'));
    const state = {
      month: '2026-03',
      byModel: { model: { provider: 'openai', input: 10, output: 5, requests: 1 } },
      rateLimits: {}
    };

    expect(addUsage(state, {
      provider: 'openai',
      model: 'model',
      usage: { input: 3, output: 2, requests: 1 }
    }).byModel.model).toEqual({ provider: 'openai', input: 13, output: 7, requests: 2 });
  });

  it('starts fresh model totals when the month changes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T00:00:00Z'));
    const state = {
      month: '2026-03',
      byModel: { old: { input: 50, output: 20, requests: 3 } },
      rateLimits: { openai: { remaining: 2 } }
    };

    expect(addUsage(state, {
      provider: 'gemini',
      model: 'new',
      usage: { input: 4, output: 1, requests: 1 }
    })).toEqual({
      month: '2026-04',
      byModel: { new: { provider: 'gemini', input: 4, output: 1, requests: 1 } },
      rateLimits: { openai: { remaining: 2 } }
    });
  });

  it('totals current-month tokens and prices known models only', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T00:00:00Z'));
    const state = {
      month: '2026-04',
      byModel: {
        model: { input: 1_000_000, output: 500_000, requests: 2 },
        unknown: { input: 20, output: 10, requests: 1 }
      }
    };

    expect(monthTotals(state, { model: { input: 2, output: 4 } })).toEqual({
      input: 1_000_020,
      output: 500_010,
      requests: 3,
      cost: 4,
      models: Object.entries(state.byModel)
    });
  });
});
