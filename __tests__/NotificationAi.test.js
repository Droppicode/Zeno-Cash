import { amountsInText, buildNotificationPrompt, isAiLoading, parseSuggestion, pickExamples } from '../src/services/notificationAi';

const categories = [{ id: 1, name: 'Moradia' }, { id: 2, name: 'Transporte' }];
const parsed = {
  amount: 1650,
  type: 'expense',
  bankName: 'Santander',
  description: 'Pix Enviado - Santander',
  rawText: 'Seu PIX foi enviado! PIX enviado em 09/10/2026 as 23:04 no valor de R$ 1.650,00.'
};

describe('notification AI helpers', () => {
  it('lists BRL amounts present in the text', () => {
    expect(amountsInText(parsed.rawText)).toEqual([1650]);
    expect(amountsInText('R$ 32,95 e R$ 1.234.567,89')).toEqual([32.95, 1234567.89]);
  });

  it('ranks approved examples by similar text and same amount', () => {
    const history = [
      { id: 1, sourceText: 'Compra aprovada UBER R$ 20,00', amount: 20, date: 3, isPending: 0, description: 'Uber' },
      { id: 2, sourceText: 'Seu PIX foi enviado! no valor de R$ 1.650,00.', amount: 1650, date: 1, isPending: 0, description: 'Aluguel' },
      { id: 3, sourceText: 'Seu PIX foi enviado! no valor de R$ 1.650,00.', amount: 1650, date: 2, isPending: 1, description: 'Pix' }
    ];
    const picked = pickExamples(history, parsed, 2);
    expect(picked.map(tx => tx.id)).toEqual([2, 1]);
  });

  it('puts the user examples and category names in the prompt', () => {
    const { system, user } = buildNotificationPrompt({
      parsed,
      date: new Date(2026, 9, 9, 23, 5).getTime(),
      categories,
      examples: [{ sourceText: 'PIX enviado R$ 1.650,00', date: new Date(2026, 8, 9).getTime(), description: 'Aluguel', note: '', categoryId: 1, type: 'expense', amount: 1650 }],
      categoryName: id => categories.find(c => c.id === id)?.name || null
    });
    expect(system).toContain('["Moradia","Transporte"]');
    expect(user).toContain('"description":"Aluguel"');
    expect(user).toContain('"category":"Moradia"');
    expect(user).toContain(parsed.rawText);
  });

  it('validates the model answer against categories and the notification amount', () => {
    expect(parseSuggestion('```json\n{"description":"Aluguel","note":"","category":"moradia","type":"expense","amount":1650}\n```', { parsed, categories }))
      .toEqual({ description: 'Aluguel', note: '', type: 'expense', categoryId: 1, amount: 1650 });
    expect(parseSuggestion('{"description":"Aluguel","category":"Inexistente","amount":99}', { parsed, categories }))
      .toEqual({ description: 'Aluguel', note: '', type: 'expense', categoryId: null, amount: 1650 });
    expect(parseSuggestion('não sei', { parsed, categories })).toBeNull();
    expect(parseSuggestion('{"description":""}', { parsed, categories })).toBeNull();
  });

  it('stops the loading state after a stale pending call', () => {
    expect(isAiLoading({ aiStatus: 'pending', date: 1000 }, 5000)).toBe(true);
    expect(isAiLoading({ aiStatus: 'pending', date: 1000 }, 40000)).toBe(false);
    expect(isAiLoading({ aiStatus: 'done', date: 1000 }, 2000)).toBe(false);
  });
});
