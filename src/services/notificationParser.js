const BANKS = [
  { name: 'Next', keys: ['bradesco.next'] },
  { name: 'Nubank', keys: ['com.nu.', 'nubank'] },
  { name: 'Inter', keys: ['intermedium', 'bancointer'] },
  { name: 'Itaú', keys: ['itau', 'itaú'] },
  { name: 'Bradesco', keys: ['bradesco'] },
  { name: 'Santander', keys: ['santander'] },
  { name: 'Banco do Brasil', keys: ['br.com.bb.', 'bancodobrasil'] },
  { name: 'Caixa Econômica', keys: ['caixa'] },
  { name: 'PicPay', keys: ['picpay'] },
  { name: 'Mercado Pago', keys: ['mercadopago'] },
  { name: 'C6 Bank', keys: ['c6bank', 'c6.'] },
  { name: 'BTG Pactual', keys: ['btg'] },
  { name: 'XP Investimentos', keys: ['br.com.xp.', '.xpi.'] },
  { name: 'Neon', keys: ['neon'] },
  { name: 'Sicoob', keys: ['sicoob'] },
  { name: 'Sicredi', keys: ['sicredi'] },
  { name: 'PagBank', keys: ['pagbank', 'pagseguro', 'uol.ps'] },
  { name: 'Will Bank', keys: ['willbank'] },
  { name: 'Banco Original', keys: ['original'] }
];

const OWN_PACKAGE = 'com.mmn.zenocash';

const INCOME_KEYWORDS = [
  'recebid', 'recebeu', 'estorno', 'estornad', 'reembolso', 'salário', 'salario',
  'depósito', 'deposito', 'entrou', 'rendimento', 'cashback', 'creditad', 'crédito em conta', 'credito em conta'
];

const AMOUNT_PATTERN = /(?:r\$|brl)\s*([+-])?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d.,]*\d)/i;
const TOTAL_PATTERN = /total\s+(?:de\s+)?(?:(?:r\$|brl)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?![\d.,]*\d)/i;
const INFO_ONLY_PATTERN = /fatura\s+(?:fechou|fechada|est[aá]\s+fechada|est[aá]\s+dispon[ií]vel|dispon[ií]vel|vence|venceu|vencendo)|limite\s+(?:dispon[ií]vel|aumentou|liberado)/i;
const TRANSACTION_HINT = /pag(?:amento|o|a|ou)\b|compra|pix|transfer|recebe|debitad|estorn/i;
const VALUE_WORD_PATTERN = /valor\s+(?:de\s+)?([+-])?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?![\d.,]*\d)/i;

export const findBank = (packageName = '') => {
  const pkg = String(packageName).toLowerCase();
  if (!pkg || pkg === OWN_PACKAGE) return null;
  return BANKS.find(bank => bank.keys.some(key => pkg.includes(key)))?.name || null;
};

export const parseBrlAmount = (raw) => {
  if (raw == null) return NaN;
  const str = String(raw).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(?:\.\d{3})+$/.test(str)) return parseFloat(str.replace(/\./g, ''));
  return parseFloat(str);
};

export const extractAmount = (content) => {
  const match = content.match(AMOUNT_PATTERN) || content.match(VALUE_WORD_PATTERN);
  if (!match) return null;
  const amount = parseBrlAmount(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, sign: match[1] || null };
};

const uniqueParts = (parts) => {
  const clean = parts.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  return clean.filter((p, i) => !clean.some((other, j) => (
    other.includes(p) && (other.length > p.length || j < i)
  )));
};

export const parseBankNotification = (notification) => {
  if (!notification) return null;
  const bankName = findBank(notification.app);
  if (!bankName) return null;

  const title = notification.titleBig || notification.title || '';
  const body = uniqueParts([notification.bigText || notification.text, notification.subText]).join(' ');
  const rawText = uniqueParts([title, body]).join(' ').replace(/\s+/g, ' ').trim();
  const content = rawText.toLowerCase();

  if (INFO_ONLY_PATTERN.test(content) && !TRANSACTION_HINT.test(content)) return null;

  const found = extractAmount(content);
  if (!found) return null;
  const total = content.match(TOTAL_PATTERN);
  const totalAmount = total ? parseBrlAmount(total[1]) : NaN;
  if (Number.isFinite(totalAmount) && totalAmount > found.amount) found.amount = totalAmount;

  const isIncome = INCOME_KEYWORDS.some(kw => content.includes(kw));
  const type = found.sign === '-' ? 'expense'
    : (found.sign === '+' || isIncome) ? 'income' : 'expense';

  let label = 'Transação Pendente';
  if (content.includes('cashback')) {
    label = 'Cashback';
  } else if (/estorn|reembolso/.test(content)) {
    label = 'Estorno';
  } else if (content.includes('pix')) {
    label = type === 'income' ? 'Pix Recebido' : 'Pix Enviado';
  } else if (/cart[aã]o|compra/.test(content)) {
    label = type === 'income' ? 'Estorno no Cartão' : 'Compra no Cartão';
  } else if (/transfer[eê]ncia|\bted\b|\bdoc\b/.test(content)) {
    label = type === 'income' ? 'Transferência Recebida' : 'Transferência Enviada';
  } else if (/boleto|pagamento/.test(content)) {
    label = 'Pagamento de Boleto';
  } else if (type === 'income') {
    label = 'Entrada';
  }

  return {
    amount: found.amount,
    type,
    bankName,
    description: `${label} - ${bankName}`,
    rawText
  };
};
