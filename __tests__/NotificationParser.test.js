import { parseBankNotification, parseBrlAmount, findBank } from '../src/services/notificationParser';

const notif = (app, title, text, extra = {}) => ({ app, title, text, ...extra });

describe('parseBrlAmount', () => {
  it('reads Brazilian thousands and decimal separators', () => {
    expect(parseBrlAmount('1.650,00')).toBe(1650);
    expect(parseBrlAmount('1.234.567,89')).toBe(1234567.89);
    expect(parseBrlAmount('32,95')).toBe(32.95);
    expect(parseBrlAmount('1.650')).toBe(1650);
    expect(parseBrlAmount('10.5')).toBe(10.5);
    expect(parseBrlAmount('150')).toBe(150);
  });
});

describe('findBank', () => {
  it('maps real package names and ignores unrelated apps', () => {
    expect(findBank('com.santander.app')).toBe('Santander');
    expect(findBank('com.nu.production')).toBe('Nubank');
    expect(findBank('br.com.bradesco.next')).toBe('Next');
    expect(findBank('com.mercadopago.wallet')).toBe('Mercado Pago');
    expect(findBank('com.android.internal')).toBeNull();
    expect(findBank('com.whatsapp')).toBeNull();
    expect(findBank('com.mmn.zenocash')).toBeNull();
  });
});

describe('parseBankNotification', () => {
  it('keeps the thousands value when the amount ends the sentence', () => {
    const tx = parseBankNotification(notif(
      'com.santander.app',
      'Seu PIX foi enviado!',
      'PIX enviado em 09/10/2026 as 23:04 no valor de R$ 1.650,00.'
    ));
    expect(tx).toMatchObject({ amount: 1650, type: 'expense', description: 'Pix Enviado - Santander' });
  });

  it('reads income, card purchases and amounts without a currency symbol', () => {
    expect(parseBankNotification(notif('com.nu.production', 'Pix recebido', 'Você recebeu R$ 2.000,50 de Fulano.')))
      .toMatchObject({ amount: 2000.5, type: 'income', description: 'Pix Recebido - Nubank' });
    expect(parseBankNotification(notif('com.itau', 'Compra aprovada', 'Compra de R$32,95 em UBER *TRIP aprovada.')))
      .toMatchObject({ amount: 32.95, type: 'expense', description: 'Compra no Cartão - Itaú' });
    expect(parseBankNotification(notif('br.com.intermedium', 'Pagamento', 'Pagamento no valor de 89,90 realizado.')))
      .toMatchObject({ amount: 89.9, type: 'expense', bankName: 'Inter' });
    expect(parseBankNotification(notif('com.picpay', 'Estorno', 'Compra estornada: R$ 15,00')))
      .toMatchObject({ amount: 15, type: 'income', description: 'Estorno no Cartão - PicPay' });
  });

  it('prefers the expanded text when the short text is truncated', () => {
    const tx = parseBankNotification(notif('com.santander.app', 'Pix', 'Você enviou um Pix de R$ 1.2…', {
      bigText: 'Você enviou um Pix de R$ 1.234,56 para Maria.'
    }));
    expect(tx.amount).toBe(1234.56);
    expect(tx.rawText).toBe('Você enviou um Pix de R$ 1.234,56 para Maria.');
  });

  it('ignores notifications without a value or from non-bank apps', () => {
    expect(parseBankNotification(notif('com.santander.app', 'Novidade', 'Conheça o novo app'))).toBeNull();
    expect(parseBankNotification(notif('com.whatsapp', 'João', 'te mandei R$ 50,00'))).toBeNull();
    expect(parseBankNotification(notif('com.mmn.zenocash', 'Pix Enviado - Santander', 'Pendência de R$ 1,65 salva.'))).toBeNull();
  });
});
