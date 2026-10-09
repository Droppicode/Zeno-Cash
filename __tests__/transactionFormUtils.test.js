import { buildTransactionPayload, mapDebtsToSplitRows } from '../src/components/transaction/transactionFormUtils';
import { CurrencyUtils } from '../src/utils/currencyUtils';

const createForm = overrides => ({
  amount: '10,00',
  description: ' Lunch ',
  note: '',
  hiddenInvoiceTag: '',
  txDateObj: new Date(1000),
  txType: 'expense',
  selectedAccountId: 2,
  selectedCategoryId: 3,
  selectedGroupIds: [4],
  recurrenceType: 'single',
  frequencyType: 'monthly',
  frequencyInterval: '1',
  installments: '',
  interestRate: '',
  interestType: 'simple',
  splitDebts: [],
  ...overrides
});

describe('buildTransactionPayload', () => {
  it('returns the required title and amount validation error', () => {
    expect(buildTransactionPayload(createForm({ amount: '', description: 'Lunch' })).error)
      .toBe('Preencha o valor e o título.');
  });

  it('returns the invalid numeric amount error', () => {
    expect(buildTransactionPayload(createForm({ amount: 'abc' })).error)
      .toBe('Insira um valor numérico válido.');
  });

  it('rejects splits more than one cent over the total', () => {
    const result = buildTransactionPayload(createForm({
      splitDebts: [{ amount: '10,02', isPercentage: false }]
    }));
    expect(result.error).toBe('A soma das divisões não pode ultrapassar o valor total da despesa.');
  });

  it('accepts a split total exactly at the 0.01 tolerance', () => {
    const result = buildTransactionPayload(createForm({
      splitDebts: [{ amount: '100,05', isPercentage: true }]
    }));
    expect(result.payload.splitDebts[0].amount).toBeCloseTo(10.005);
  });

  it('converts percentage splits to monetary values', () => {
    const result = buildTransactionPayload(createForm({
      amount: '100,00',
      splitDebts: [{ personName: 'Ana', amount: '25', isPercentage: true }]
    }));
    expect(result.payload.splitDebts[0].amount).toBe(25);
  });

  it('keeps the single and installment recurrenceData shapes', () => {
    expect(buildTransactionPayload(createForm()).payload.recurrenceData).toBeNull();
    expect(buildTransactionPayload(createForm({
      recurrenceType: 'installment',
      frequencyInterval: '0',
      installments: '3',
      interestRate: '2.5'
    })).payload.recurrenceData).toEqual({
      frequencyType: 'monthly',
      frequencyInterval: 1,
      installments: 3,
      interestRate: 2.5,
      interestType: 'simple'
    });
  });

  it('joins the hidden invoice tag and visible note', () => {
    const result = buildTransactionPayload(createForm({
      hiddenInvoiceTag: '[invoice:2]',
      note: '  details  '
    }));
    expect(result.payload.note).toBe('[invoice:2] details');
  });

  it('maps pending transactions to approved and omits the field otherwise', () => {
    expect(buildTransactionPayload(createForm(), { isPending: 1 }).payload.isPending).toBe(0);
    expect(buildTransactionPayload(createForm()).payload.isPending).toBeUndefined();
  });
});

describe('mapDebtsToSplitRows', () => {
  it('maps percentage and fixed debts to editable rows', () => {
    const rows = mapDebtsToSplitRows([
      { id: 1, personName: 'Ana', amount: 20, isPercentage: 1, isPaid: 1, ignoresInterest: 0, date: 10 },
      { id: 2, personName: 'Bia', amount: 12.34, isPercentage: 0, isPaid: 0, ignoresInterest: 1, date: 20 }
    ], 100);
    expect(rows[0]).toEqual({
      id: 1,
      personName: 'Ana',
      amount: '20',
      isPaid: true,
      isPercentage: true,
      ignoresInterest: false,
      date: 10
    });
    expect(rows[1]).toEqual({
      id: 2,
      personName: 'Bia',
      amount: CurrencyUtils.formatCurrency('1234'),
      isPaid: false,
      isPercentage: false,
      ignoresInterest: true,
      date: 20
    });
  });
});
