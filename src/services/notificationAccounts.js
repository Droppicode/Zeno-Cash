const isCredit = acc => acc.type === 'credit';

const bankMatches = (accountsData, bankName) => {
  const key = (bankName || '').toLowerCase();
  if (!key) return [];
  const exact = accountsData.filter(acc => acc.name?.toLowerCase() === key);
  const partial = accountsData.filter(acc => acc.name?.toLowerCase().includes(key) && !exact.includes(acc));
  return [...exact, ...partial];
};

export const cardPaymentTag = cardId => `[cardpay:${cardId}]`;

export const getCardPaymentId = (note) => {
  const match = typeof note === 'string' ? note.match(/\[cardpay:(\d+)\]/) : null;
  return match ? Number(match[1]) : null;
};

export const pickNotificationAccounts = (accountsData, { bankName, kind }) => {
  const matches = bankMatches(accountsData, bankName);
  const checking = matches.find(acc => !isCredit(acc));
  const card = matches.find(isCredit)
    || (checking && accountsData.find(acc => isCredit(acc) && acc.associatedAccountId === checking.id));

  if (kind === 'card') {
    return { accountId: (card || checking || matches[0])?.id ?? null, cardId: null };
  }
  if (kind === 'invoice_payment') {
    const payingId = checking?.id ?? card?.associatedAccountId ?? null;
    return { accountId: payingId, cardId: card && payingId ? card.id : null };
  }
  return { accountId: (checking || matches[0])?.id ?? null, cardId: null };
};
