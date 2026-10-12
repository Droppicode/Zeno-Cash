import { DEFAULT_HOME_ORDER, resolveAnalyticsOrder, resolveHomeOrder } from '../src/utils/ModuleOrder';

describe('resolveHomeOrder', () => {
  it('uses the default order with macro limits right below debts', () => {
    expect(resolveHomeOrder(undefined)).toEqual(DEFAULT_HOME_ORDER);
    expect(DEFAULT_HOME_ORDER.indexOf('budgets')).toBe(DEFAULT_HOME_ORDER.indexOf('debts') + 1);
  });

  it('inserts missing modules after their default predecessor', () => {
    expect(resolveHomeOrder(['accounts', 'pending', 'recent'])).toEqual([
      'accounts', 'creditCards', 'pending', 'recent', 'debts', 'budgets', 'groups',
    ]);
    expect(resolveHomeOrder(['debts', 'accounts', 'creditCards', 'pending', 'recent', 'groups'])).toEqual([
      'debts', 'budgets', 'accounts', 'creditCards', 'pending', 'recent', 'groups',
    ]);
  });

  it('keeps a saved order and drops unknown or duplicated keys', () => {
    const saved = ['groups', 'insights', 'budgets', 'accounts', 'creditCards', 'pending', 'recent', 'debts', 'groups'];
    expect(resolveHomeOrder(saved)).toEqual(['groups', 'budgets', 'accounts', 'creditCards', 'pending', 'recent', 'debts']);
  });
});

describe('resolveAnalyticsOrder', () => {
  it('adds new analytics modules to a saved order', () => {
    const order = resolveAnalyticsOrder(['monthly', 'kpis']);
    expect(order.indexOf('monthly')).toBeLessThan(order.indexOf('kpis'));
    expect(order).toHaveLength(10);
  });
});
