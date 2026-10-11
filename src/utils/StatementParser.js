const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const decodeUtf8 = (bytes) => {
  const codePoints = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let length = 0;
    let cp = 0;
    if (b < 0x80) { length = 1; cp = b; }
    else if (b >= 0xc2 && b < 0xe0) { length = 2; cp = b & 0x1f; }
    else if (b >= 0xe0 && b < 0xf0) { length = 3; cp = b & 0x0f; }
    else if (b >= 0xf0 && b < 0xf5) { length = 4; cp = b & 0x07; }
    else return null;
    if (i + length > bytes.length) return null;
    for (let k = 1; k < length; k++) {
      const next = bytes[i + k];
      if ((next & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (next & 0x3f);
    }
    codePoints.push(cp);
    i += length;
  }
  let out = '';
  for (let start = 0; start < codePoints.length; start += 4096) {
    out += String.fromCodePoint(...codePoints.slice(start, start + 4096));
  }
  return out;
};

export const decodeText = (bytes) => {
  const text = decodeUtf8(bytes) ?? Array.from(bytes, b => String.fromCharCode(b)).join('');
  return text.replace(/^\uFEFF/, '');
};

export const parseAmount = (raw) => {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/\s*D$/i.test(s)) { negative = true; s = s.replace(/\s*D$/i, ''); }
  s = s.replace(/\s*C$/i, '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  if (s.endsWith('-')) { negative = !negative; s = s.slice(0, -1); }
  s = s.replace(/^\+/, '');
  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const value = parseFloat(s);
  if (isNaN(value)) return null;
  return negative ? -value : value;
};

const makeDate = (year, month, day) => {
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
};

export const parseDate = (raw) => {
  const s = String(raw || '').trim();
  let m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return makeDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return makeDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/);
  if (m) return makeDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
};

const toTransaction = (date, signedAmount, description, extra = {}) => {
  if (date == null || signedAmount == null || signedAmount === 0) return null;
  const desc = String(description || '').replace(/\s+/g, ' ').trim();
  return {
    date,
    amount: Math.round(Math.abs(signedAmount) * 100) / 100,
    type: signedAmount < 0 ? 'expense' : 'income',
    description: desc || 'Sem descrição',
    ...extra
  };
};

const isBalanceLine = description => /^(saldo|sdo)\b/.test(normalize(description));

export const parseOFX = (text) => {
  const field = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
    return m ? m[1].trim() : '';
  };
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];
  const seenIds = new Set();
  const transactions = blocks.map(block => {
    const fitId = field(block, 'FITID');
    if (fitId && seenIds.has(fitId)) return null;
    if (fitId) seenIds.add(fitId);
    const memo = field(block, 'MEMO');
    const name = field(block, 'NAME');
    const description = memo && name && !memo.includes(name) ? `${name} ${memo}` : (memo || name);
    if (isBalanceLine(description)) return null;
    return toTransaction(parseDate(field(block, 'DTPOSTED')), parseAmount(field(block, 'TRNAMT')), description);
  }).filter(Boolean);
  return { format: 'ofx', isCreditCard: /<CCACCTFROM>/i.test(text), transactions };
};

const splitCsvLine = (line, delimiter) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { cells.push(cell.trim()); cell = ''; }
    else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
};

const detectDelimiter = (lines) => {
  const candidates = [';', ',', '\t'];
  const counts = candidates.map(d => lines.slice(0, 10).reduce((sum, line) => sum + splitCsvLine(line, d).length - 1, 0));
  return candidates[counts.indexOf(Math.max(...counts))];
};

const HEADER_MATCHERS = {
  date: h => h === 'date' || h.startsWith('data') || h.startsWith('dt'),
  description: h => ['descricao', 'historico', 'description', 'title', 'lancamento', 'estabelecimento', 'memo', 'detalhe'].some(k => h.includes(k)),
  amount: h => ['valor', 'amount', 'value', 'quantia'].some(k => h.includes(k)),
  credit: h => ['credito', 'entrada'].some(k => h.includes(k)),
  debit: h => ['debito', 'saida'].some(k => h.includes(k)),
  kind: h => ['tipo', 'type', 'natureza'].includes(h) || h === 'd/c'
};

const findColumns = (header) => {
  const used = new Set();
  const pick = (matcher) => {
    const index = header.findIndex((h, i) => !used.has(i) && matcher(h));
    if (index >= 0) used.add(index);
    return index;
  };
  const date = pick(HEADER_MATCHERS.date);
  const amount = pick(HEADER_MATCHERS.amount);
  const credit = pick(HEADER_MATCHERS.credit);
  const debit = pick(HEADER_MATCHERS.debit);
  const kind = pick(HEADER_MATCHERS.kind);
  const description = pick(HEADER_MATCHERS.description);
  return { date, amount, credit, debit, kind, description };
};

const detectColumnsByContent = (rows) => {
  const sample = rows.slice(0, 20);
  const width = Math.max(...sample.map(r => r.length));
  const share = test => Array.from({ length: width }, (_, i) => sample.filter(r => test(r[i])).length / sample.length);
  const dateShare = share(v => parseDate(v) !== null);
  const date = dateShare.indexOf(Math.max(...dateShare));
  const amountShare = share(v => /\d/.test(v || '') && parseAmount(v) !== null).map((v, i) => (i === date ? 0 : v));
  const amount = amountShare.lastIndexOf(Math.max(...amountShare));
  const textLength = Array.from({ length: width }, (_, i) => (i === date || i === amount ? -1
    : sample.reduce((sum, r) => sum + (r[i] || '').length, 0)));
  const description = textLength.indexOf(Math.max(...textLength));
  if (dateShare[date] < 0.8 || amountShare[amount] < 0.8) return null;
  return { date, amount, credit: -1, debit: -1, kind: -1, description };
};

export const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { format: 'csv', isCreditCard: false, transactions: [] };
  const delimiter = detectDelimiter(lines);
  const rows = lines.map(line => splitCsvLine(line, delimiter));

  let headerIndex = rows.slice(0, 10).findIndex(row => {
    const cols = findColumns(row.map(normalize));
    return cols.date >= 0 && (cols.amount >= 0 || cols.credit >= 0 || cols.debit >= 0);
  });
  let columns;
  let invertSign = false;
  if (headerIndex >= 0) {
    const header = rows[headerIndex].map(normalize);
    columns = findColumns(header);
    invertSign = header.join(',') === 'date,title,amount';
  } else {
    headerIndex = -1;
    columns = detectColumnsByContent(rows);
    if (!columns) return { format: 'csv', isCreditCard: false, transactions: [] };
  }

  const transactions = rows.slice(headerIndex + 1).map(row => {
    const description = columns.description >= 0 ? row[columns.description] : '';
    if (isBalanceLine(description)) return null;
    let signed = columns.amount >= 0 ? parseAmount(row[columns.amount]) : null;
    if (signed == null || signed === 0) {
      const credit = columns.credit >= 0 ? parseAmount(row[columns.credit]) : null;
      const debit = columns.debit >= 0 ? parseAmount(row[columns.debit]) : null;
      if (credit) signed = Math.abs(credit);
      else if (debit) signed = -Math.abs(debit);
    }
    if (signed == null) return null;
    if (columns.kind >= 0) {
      const kind = normalize(row[columns.kind]);
      if (/^(d|debito|saida)/.test(kind)) signed = -Math.abs(signed);
      else if (/^(c|credito|entrada)/.test(kind)) signed = Math.abs(signed);
    }
    if (invertSign) signed = -signed;
    return toTransaction(parseDate(row[columns.date]), signed, description);
  }).filter(Boolean);

  return { format: 'csv', isCreditCard: invertSign, transactions };
};

export const parseStatement = text => (/OFXHEADER|<OFX>/i.test(text) ? parseOFX(text) : parseCSV(text));

const sameDay = (a, b) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

export const splitDuplicates = (imported, existing) => {
  const available = existing.filter(tx => tx.isIgnored !== 1);
  const used = new Set();
  const fresh = [];
  const duplicates = [];
  imported.forEach(tx => {
    const amount = Math.abs(Number(tx.amount) || 0);
    const match = available.find(ex => !used.has(ex.id) && ex.type === tx.type
      && Math.abs(ex.amount - amount) < 0.01 && sameDay(ex.date, tx.date));
    if (match) {
      used.add(match.id);
      duplicates.push(tx);
    } else {
      fresh.push(tx);
    }
  });
  return { fresh, duplicates };
};

export const categoryFromHistory = (description, existing) => {
  const key = normalize(description);
  if (!key) return null;
  const match = existing
    .filter(tx => tx.categoryId != null && normalize(tx.description) === key)
    .sort((a, b) => b.date - a.date)[0];
  return match ? match.categoryId : null;
};
