import { parseBrlAmount } from './notificationParser';

const AI_LOADING_MAX_MS = 30000;

const NOTIFICATION_MODELS = {
  gemini: 'gemini-3.5-flash-lite',
  openai: 'gpt-4o-mini',
  claude: 'claude-haiku-4-6'
};

export const notificationModelFor = (provider, fallback = '') => NOTIFICATION_MODELS[provider] || fallback;

export const isAiLoading = (tx, now = Date.now()) => (
  tx?.aiStatus === 'pending' && now - tx.date < AI_LOADING_MAX_MS
);

const AMOUNT_GLOBAL = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2})/g;

const normalizeWords = (text = '') => new Set(
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
);

export const amountsInText = (text = '') => (String(text).match(AMOUNT_GLOBAL) || [])
  .map(parseBrlAmount)
  .filter(Number.isFinite);

const similarity = (a, b) => {
  const wa = normalizeWords(a);
  const wb = normalizeWords(b);
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  wa.forEach(word => { if (wb.has(word)) shared += 1; });
  return shared / (wa.size + wb.size - shared);
};

export const pickExamples = (history, current, limit = 8) => history
  .filter(tx => tx.sourceText && tx.isPending !== 1 && tx.isIgnored !== 1)
  .map(tx => {
    const textScore = similarity(tx.sourceText, current.rawText);
    const amountScore = tx.amount === current.amount ? 0.5 : 0;
    return { tx, score: textScore + amountScore };
  })
  .sort((a, b) => b.score - a.score || b.tx.date - a.tx.date)
  .slice(0, limit)
  .map(({ tx }) => tx);

const formatDate = (timestamp) => {
  const d = new Date(timestamp);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} (${weekday}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const buildNotificationPrompt = ({ parsed, date, categories, examples, categoryName }) => {
  const categoryNames = categories.map(c => c.name);
  const exampleLines = examples.map(tx => JSON.stringify({
    notificacao: tx.sourceText,
    data: formatDate(tx.date),
    resultado: {
      description: tx.description,
      note: tx.note || '',
      category: categoryName(tx.categoryId),
      type: tx.type,
      amount: tx.amount
    }
  }));

  const system = [
    'Você transforma notificações de bancos brasileiros em lançamentos de um app de finanças pessoais.',
    'Responda somente com um objeto JSON, sem markdown: {"description": string, "note": string, "category": string|null, "type": "income"|"expense", "amount": number}.',
    'description é o título curto do lançamento; note é um detalhe opcional (ex.: destinatário, loja); use "" se não houver.',
    'Imite o estilo dos exemplos do usuário (palavras, capitalização, tamanho). Se um exemplo tiver a mesma loja, destinatário ou o mesmo valor recorrente, reutilize o título e a categoria dele.',
    'Não invente nomes que não estão na notificação nem nos exemplos. Sem pistas, use um título genérico como "Pix enviado".',
    `category deve ser exatamente um destes nomes, ou null: ${JSON.stringify(categoryNames)}.`,
    'Use a loja, o destinatário ou o serviço no título quando houver, com nome limpo e capitalização normal (ex.: "IFOOD *RESTAURANTE" → "iFood", "ENEL" → "Conta de luz", TED de salário → "Salário"). Cashback é cashback, não estorno.',
    'A leitura automática é só um ponto de partida: não copie o título dela nem coloque o nome do banco no título, a menos que os exemplos do usuário façam isso.',
    'amount é o valor da transação em reais (número com ponto decimal), igual ao valor da notificação. Em compras parceladas use o valor total e coloque as parcelas na note (ex.: "3x de R$ 45,90"). Em compras internacionais use o valor em reais.'
  ].join('\n');

  const user = [
    examples.length ? `Exemplos de como o usuário registrou notificações parecidas:\n${exampleLines.join('\n')}` : 'O usuário ainda não tem exemplos registrados.',
    '',
    `Notificação (${parsed.bankName}) recebida em ${formatDate(date)}:`,
    parsed.rawText,
    '',
    `Leitura automática: ${JSON.stringify({ amount: parsed.amount, type: parsed.type, description: parsed.description })}`
  ].join('\n');

  return { system, user };
};

export const parseSuggestion = (text, { parsed, categories }) => {
  if (!text) return null;
  const jsonText = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let data;
  try {
    data = JSON.parse(jsonText.slice(start, end + 1));
  } catch (e) {
    return null;
  }

  const description = typeof data.description === 'string' ? data.description.trim().slice(0, 80) : '';
  if (!description) return null;

  const note = typeof data.note === 'string' ? data.note.trim().slice(0, 100) : '';
  const type = data.type === 'income' || data.type === 'expense' ? data.type : parsed.type;
  const category = typeof data.category === 'string'
    ? categories.find(c => c.name.toLowerCase() === data.category.trim().toLowerCase())
    : null;

  const llmAmount = Number(data.amount);
  const amountIsInText = Number.isFinite(llmAmount)
    && llmAmount > 0
    && amountsInText(parsed.rawText).some(value => Math.abs(value - llmAmount) < 0.005);

  return {
    description,
    note,
    type,
    categoryId: category ? category.id : null,
    amount: amountIsInText ? llmAmount : parsed.amount
  };
};
