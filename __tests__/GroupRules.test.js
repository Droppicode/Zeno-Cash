import {
  matchGroupIdsForTransaction,
  normalizeText,
  previewRuleAssignments,
  ruleMatches
} from '../src/utils/GroupRules';

describe('GroupRules', () => {
  it('normalizes accents and case for Portuguese text', () => {
    expect(normalizeText('CAFÉ COM AÇÚCAR')).toBe('cafe com acucar');
  });

  describe('ruleMatches', () => {
    it('matches keyword rules without accent or case sensitivity', () => {
      expect(ruleMatches({ keywords: ['cafe'] }, { description: 'Café da manhã' })).toBe(true);
      expect(ruleMatches({ keywords: ['combustivel'] }, { description: 'Mercado' })).toBe(false);
    });

    it('matches category IDs from camelCase or snake_case rules', () => {
      expect(ruleMatches({ categoryIds: [2, 5] }, { categoryId: 5 })).toBe(true);
      expect(ruleMatches({ category_ids: '[2,5]' }, { category_id: 2 })).toBe(true);
      expect(ruleMatches({ categoryIds: [2] }, { categoryId: 3 })).toBe(false);
    });

    it('matches account IDs', () => {
      expect(ruleMatches({ accountId: 4 }, { accountId: 4 })).toBe(true);
      expect(ruleMatches({ account_id: 4 }, { account_id: 5 })).toBe(false);
    });

    it('matches inclusive amount ranges using the absolute transaction value', () => {
      const rule = { minAmount: 10, maxAmount: 20 };
      expect(ruleMatches(rule, { amount: -10 })).toBe(true);
      expect(ruleMatches(rule, { amount: 20 })).toBe(true);
      expect(ruleMatches(rule, { amount: 9.99 })).toBe(false);
      expect(ruleMatches(rule, { amount: 20.01 })).toBe(false);
    });

    it('matches inclusive date periods', () => {
      const rule = { dateFrom: 100, dateTo: 200 };
      expect(ruleMatches(rule, { date: 100 })).toBe(true);
      expect(ruleMatches(rule, { date: 200 })).toBe(true);
      expect(ruleMatches(rule, { date: 99 })).toBe(false);
      expect(ruleMatches(rule, { date: 201 })).toBe(false);
    });

    it('requires every configured criterion and skips inactive rules', () => {
      const rule = {
        keywords: ['mercado'],
        categoryIds: [3],
        accountId: 7,
        minAmount: 50,
        maxAmount: 100,
        dateFrom: 1000,
        dateTo: 2000
      };
      const transaction = {
        description: 'Mercado Central',
        categoryId: 3,
        accountId: 7,
        amount: 75,
        date: 1500
      };

      expect(ruleMatches(rule, transaction)).toBe(true);
      expect(ruleMatches(rule, { ...transaction, accountId: 8 })).toBe(false);
      expect(ruleMatches({ ...rule, isActive: 0 }, transaction)).toBe(false);
    });
  });

  it('returns unique numeric group IDs for matching rules', () => {
    const rules = [
      { groupId: 3, keywords: ['mercado'] },
      { group_id: '3', keywords: ['mercado'] },
      { groupId: 4, keywords: ['mercado'] },
      { groupId: 5, isActive: 0, keywords: ['mercado'] }
    ];

    expect(matchGroupIdsForTransaction(rules, { description: 'Mercado' })).toEqual([3, 4]);
  });

  it('skips ignored transactions and already-assigned groups in previews', () => {
    const rules = [
      { groupId: 2, keywords: ['mercado'] },
      { groupId: 3, keywords: ['mercado'] }
    ];
    const txList = [
      { id: 1, description: 'Mercado', isIgnored: 0 },
      { id: 2, description: 'Mercado', isIgnored: 1 },
      { id: 3, description: 'Farmácia', isIgnored: 0 }
    ];

    expect(previewRuleAssignments(rules, txList, { 1: [2], 2: [] })).toEqual([
      { tx: txList[0], groupIds: [3] }
    ]);
  });
});
