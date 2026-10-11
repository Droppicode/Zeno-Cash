import { categoryFromHistory, decodeText, parseAmount, parseCSV, parseDate, parseOFX, parseStatement, splitDuplicates } from '../src/utils/StatementParser';

const day = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

describe('parseAmount', () => {
  it.each([
    ['1.234,56', 1234.56], ['-1.234,56', -1234.56], ['R$ -89,90', -89.9], ['1,234.56', 1234.56],
    ['-12.50', -12.5], ['1.650', 1650], ['(45,00)', -45], ['30,00 D', -30], ['30,00 C', 30], ['abc', null], ['', null]
  ])('%s → %s', (raw, expected) => expect(parseAmount(raw)).toBe(expected));
});

describe('parseDate', () => {
  it('reads OFX, ISO and Brazilian dates at noon', () => {
    expect(parseDate('20261005120000[-3:BRT]')).toBe(day(2026, 10, 5));
    expect(parseDate('2026-10-05')).toBe(day(2026, 10, 5));
    expect(parseDate('05/10/2026')).toBe(day(2026, 10, 5));
    expect(parseDate('05/10/26')).toBe(day(2026, 10, 5));
    expect(parseDate('31/02/2026')).toBeNull();
  });
});

describe('decodeText', () => {
  it('decodes UTF-8 and falls back to Latin-1', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x50, 0xc3, 0xa3, 0x6f]))).toBe('Pão');
    expect(decodeText(new Uint8Array([0x50, 0xe3, 0x6f]))).toBe('Pão');
  });
});

describe('parseOFX', () => {
  const ofx = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>0260</BANKID></BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005000000[-3:BRT]
<TRNAMT>-89.90
<FITID>a1
<MEMO>Compra no débito - Padaria Real
</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261006<TRNAMT>1650.00<FITID>a2<NAME>Fulano<MEMO>Transferência recebida pelo Pix</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261006<TRNAMT>1650.00<FITID>a2<MEMO>dup</STMTTRN>
<STMTTRN><TRNTYPE>OTHER<DTPOSTED>20261007<TRNAMT>0.00<FITID>a3<MEMO>Zero</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

  it('parses SGML transactions, skips repeated FITIDs and zero amounts', () => {
    const result = parseOFX(ofx);
    expect(result.isCreditCard).toBe(false);
    expect(result.transactions).toEqual([
      { date: day(2026, 10, 5), amount: 89.9, type: 'expense', description: 'Compra no débito - Padaria Real' },
      { date: day(2026, 10, 6), amount: 1650, type: 'income', description: 'Fulano Transferência recebida pelo Pix' }
    ]);
    expect(parseStatement(ofx).format).toBe('ofx');
  });

  it('flags credit card statements', () => {
    const cc = '<OFX><CREDITCARDMSGSRSV1><CCSTMTRS><CCACCTFROM><ACCTID>1</ACCTID></CCACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20261001</DTPOSTED><TRNAMT>-50.00</TRNAMT><MEMO>IFOOD</MEMO></STMTTRN></BANKTRANLIST></CCSTMTRS></CREDITCARDMSGSRSV1></OFX>';
    const result = parseOFX(cc);
    expect(result.isCreditCard).toBe(true);
    expect(result.transactions).toEqual([{ date: day(2026, 10, 1), amount: 50, type: 'expense', description: 'IFOOD' }]);
  });
});

describe('parseCSV', () => {
  it('reads Nubank account exports (signed amounts)', () => {
    const csv = 'Data,Valor,Identificador,Descrição\n05/10/2026,-89.90,abc,Compra no débito - Padaria\n06/10/2026,1650.00,def,"Transferência recebida, Fulano"';
    expect(parseCSV(csv).transactions).toEqual([
      { date: day(2026, 10, 5), amount: 89.9, type: 'expense', description: 'Compra no débito - Padaria' },
      { date: day(2026, 10, 6), amount: 1650, type: 'income', description: 'Transferência recebida, Fulano' }
    ]);
  });

  it('inverts Nubank card exports where purchases are positive', () => {
    const result = parseCSV('date,title,amount\n2026-10-01,Ifood,45.90\n2026-10-03,Pagamento recebido,-200.00');
    expect(result.isCreditCard).toBe(true);
    expect(result.transactions.map(t => [t.type, t.amount])).toEqual([['expense', 45.9], ['income', 200]]);
  });

  it('reads semicolon files with separate credit/debit columns and skips balance lines', () => {
    const csv = 'Extrato conta corrente\nData Lançamento;Histórico;Crédito (R$);Débito (R$);Saldo (R$)\n01/10/2026;SALDO ANTERIOR;;;1.000,00\n02/10/2026;PIX ENVIADO Maria;;150,00;850,00\n03/10/2026;SALARIO;3.200,00;;4.050,00';
    expect(parseCSV(csv).transactions).toEqual([
      { date: day(2026, 10, 2), amount: 150, type: 'expense', description: 'PIX ENVIADO Maria' },
      { date: day(2026, 10, 3), amount: 3200, type: 'income', description: 'SALARIO' }
    ]);
  });

  it('applies a D/C type column', () => {
    const csv = 'data;descricao;valor;tipo\n02/10/2026;Mercado;120,50;D\n03/10/2026;Estorno;20,00;C';
    expect(parseCSV(csv).transactions.map(t => [t.type, t.amount])).toEqual([['expense', 120.5], ['income', 20]]);
  });

  it('detects columns by content when there is no header', () => {
    const csv = '02/10/2026;Padaria;-12,00\n03/10/2026;Salário;3000,00';
    expect(parseCSV(csv).transactions.map(t => [t.description, t.type, t.amount])).toEqual([
      ['Padaria', 'expense', 12], ['Salário', 'income', 3000]
    ]);
  });
});

describe('splitDuplicates', () => {
  it('matches one imported line per existing transaction on the same day', () => {
    const existing = [
      { id: 1, type: 'expense', amount: 10, date: day(2026, 10, 2) + 3600000 },
      { id: 2, type: 'expense', amount: 99, date: day(2026, 10, 2), isIgnored: 1 }
    ];
    const imported = [
      { type: 'expense', amount: 10, date: day(2026, 10, 2) },
      { type: 'expense', amount: 10, date: day(2026, 10, 2) },
      { type: 'income', amount: 10, date: day(2026, 10, 2) },
      { type: 'expense', amount: 99, date: day(2026, 10, 2) }
    ];
    const { fresh, duplicates } = splitDuplicates(imported, existing);
    expect(duplicates).toHaveLength(1);
    expect(fresh).toHaveLength(3);
  });
});

describe('categoryFromHistory', () => {
  it('reuses the category of the latest transaction with the same description', () => {
    const existing = [
      { description: 'Padaria Real', categoryId: 1, date: 1 },
      { description: 'padaria real ', categoryId: 2, date: 2 },
      { description: 'Outra', categoryId: 3, date: 3 }
    ];
    expect(categoryFromHistory('PADARIA REAL', existing)).toBe(2);
    expect(categoryFromHistory('Nada', existing)).toBeNull();
  });
});
