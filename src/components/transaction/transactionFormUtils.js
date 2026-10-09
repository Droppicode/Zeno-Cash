import { CurrencyUtils } from '../../utils/currencyUtils';

export const mapDebtsToSplitRows = (debts, totalAmount) => debts.map(d => ({
  id: d.id,
  personName: d.personName,
  amount: d.isPercentage
    ? String((d.amount / totalAmount * 100).toFixed(2)).replace('.00', '').replace('.', ',')
    : CurrencyUtils.formatCurrency((d.amount * 100).toFixed(0)),
  isPaid: d.isPaid === 1,
  isPercentage: d.isPercentage === 1,
  ignoresInterest: d.ignoresInterest === 1,
  date: d.date
}));

export const buildTransactionPayload = (form, initialData) => {
  const {
    amount, description, note, hiddenInvoiceTag, txDateObj, txType, selectedAccountId,
    selectedCategoryId, selectedGroupIds, recurrenceType, frequencyType,
    frequencyInterval, installments, interestRate, interestType, splitDebts
  } = form;

  if (!amount || !description.trim()) {
    return { error: 'Preencha o valor e o título.' };
  }

  const numAmount = CurrencyUtils.parseCurrency(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { error: 'Insira um valor numérico válido.' };
  }

  let totalSplit = 0;
  const processedSplits = splitDebts.map(d => {
    const splitNum = CurrencyUtils.parseCurrency(d.amount);
    const finalVal = d.isPercentage ? numAmount * (splitNum / 100) : splitNum;
    totalSplit += finalVal;
    return { ...d, amount: finalVal };
  });

  if (txType === 'expense' && splitDebts.length > 0 && numAmount - totalSplit < -0.01) {
    return { error: 'A soma das divisões não pode ultrapassar o valor total da despesa.' };
  }

  return {
    payload: {
      id: initialData?.id,
      _tempId: initialData?._tempId,
      amount: numAmount,
      description: description.trim(),
      note: [hiddenInvoiceTag, note.trim()].filter(Boolean).join(' '),
      date: txDateObj.getTime(),
      type: txType,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      groupIds: selectedGroupIds,
      recurrenceType,
      recurrenceData: recurrenceType === 'single' ? null : {
        frequencyType,
        frequencyInterval: parseInt(frequencyInterval) || 1,
        installments: recurrenceType === 'installment' ? parseInt(installments) : null,
        interestRate: parseFloat(interestRate) || 0,
        interestType
      },
      splitDebts: processedSplits,
      isPending: initialData?.isPending === 1 ? 0 : undefined
    }
  };
};
