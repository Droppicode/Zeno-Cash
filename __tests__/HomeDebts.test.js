jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }), { virtual: true });

import HomeDebts from '../src/components/home/HomeDebts';

const collectText = node => {
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (node?.props) return collectText(node.props.children);
  return [];
};

describe('HomeDebts pending totals', () => {
  it('omits paid debts and recurrence templates from pending totals', () => {
    const styles = {
      section: {},
      sectionTitle: {},
      groupedContainer: {},
      groupedItem: {},
      groupedIcon: {},
      groupedText: {},
      groupedAmount: {}
    };
    const element = HomeDebts({
      debtsList: [
        { isPaid: 1, type: 'owe', amount: 90, transactionId: 4, recurrenceId: null },
        { isPaid: 0, type: 'owe', amount: 40, transactionId: 5, recurrenceId: null },
        { isPaid: 0, type: 'owed', amount: 500, transactionId: null, recurrenceId: 8 }
      ],
      activeTheme: {
        text: '#000',
        textSecondary: '#666',
        accent: '#00f',
        card: '#fff',
        expense: '#f00',
        income: '#0a0',
        background: '#eee'
      },
      styles,
      navigation: { navigate: jest.fn() }
    });
    const renderedText = collectText(element).join('');

    expect(renderedText).toContain('R$ 40,00');
    expect(renderedText).toContain('R$ 0,00');
    expect(renderedText).not.toContain('R$ 90,00');
    expect(renderedText).not.toContain('R$ 500,00');
  });
});
