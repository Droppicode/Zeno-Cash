import { getCardPaymentId, pickNotificationAccounts } from '../src/services/notificationAccounts';
import { parseBankNotification } from '../src/services/notificationParser';

const accountsData = [
  { id: 1, name: 'Nubank', type: 'checking' },
  { id: 2, name: 'Cartão Roxo', type: 'credit', associatedAccountId: 1, closingDay: 20, dueDay: 28 },
  { id: 3, name: 'Itaú', type: 'checking' },
  { id: 4, name: 'Itaú Cartão', type: 'credit', associatedAccountId: 3 }
];

const notif = (app, title, text) => ({ app, title, text });

describe('notification kinds', () => {
  it('detects credit card purchases, debit purchases and invoice payments', () => {
    expect(parseBankNotification(notif(
      'com.nu.production', 'Compra aprovada', 'Compra de R$ 50,00 aprovada em IFOOD no cartão de crédito.'
    )).kind).toBe('card');
    expect(parseBankNotification(notif(
      'com.nu.production', 'Compra no débito', 'Compra de R$ 20,00 no cartão de débito em PADARIA.'
    )).kind).toBe('account');
    expect(parseBankNotification(notif(
      'com.nu.production', 'Pix enviado', 'Você enviou um Pix de R$ 30,00 para ANA.'
    )).kind).toBe('account');
    expect(parseBankNotification(notif(
      'com.picpay', 'Cashback', 'Você recebeu R$ 12,34 de cashback na compra com cartão.'
    )).kind).toBe('account');
    const payment = parseBankNotification(notif(
      'com.itau', 'Fatura paga', 'Pagamento da fatura de R$ 1.234,56 realizado.'
    ));
    expect(payment.kind).toBe('invoice_payment');
    expect(payment.type).toBe('expense');
    expect(payment.description).toBe('Pagamento de Fatura - Itaú');
  });
});

describe('pickNotificationAccounts', () => {
  it('sends card purchases to the card linked to the bank account', () => {
    expect(pickNotificationAccounts(accountsData, { bankName: 'Nubank', kind: 'card' }))
      .toEqual({ accountId: 2, cardId: null });
    expect(pickNotificationAccounts(accountsData, { bankName: 'Itaú', kind: 'card' }))
      .toEqual({ accountId: 4, cardId: null });
  });

  it('pays invoices from the checking account and remembers the card', () => {
    expect(pickNotificationAccounts(accountsData, { bankName: 'Nubank', kind: 'invoice_payment' }))
      .toEqual({ accountId: 1, cardId: 2 });
  });

  it('keeps regular notifications on the checking account', () => {
    expect(pickNotificationAccounts(accountsData, { bankName: 'Itaú', kind: 'account' }))
      .toEqual({ accountId: 3, cardId: null });
    expect(pickNotificationAccounts(accountsData, { bankName: 'Inter', kind: 'card' }))
      .toEqual({ accountId: null, cardId: null });
  });

  it('falls back to the bank account when there is no card', () => {
    const onlyChecking = [{ id: 9, name: 'Santander', type: 'checking' }];
    expect(pickNotificationAccounts(onlyChecking, { bankName: 'Santander', kind: 'card' }))
      .toEqual({ accountId: 9, cardId: null });
    expect(pickNotificationAccounts(onlyChecking, { bankName: 'Santander', kind: 'invoice_payment' }))
      .toEqual({ accountId: 9, cardId: null });
  });

  it('reads the card payment tag', () => {
    expect(getCardPaymentId('Pagamento [cardpay:12]')).toBe(12);
    expect(getCardPaymentId('Pagamento')).toBeNull();
  });
});
