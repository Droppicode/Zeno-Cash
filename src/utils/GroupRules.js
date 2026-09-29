export const normalizeText = value => String(value || '')
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const parseJsonArray = value => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const getField = (rule, camel, snake) => rule?.[camel] ?? rule?.[snake];
const getTxField = (tx, camel, snake) => tx?.[camel] ?? tx?.[snake];

export const ruleMatches = (rule, tx) => {
  if (!rule || rule.isActive === 0 || rule.is_active === 0) return false;

  const keywords = parseJsonArray(getField(rule, 'keywords', 'keywords'))
    .map(normalizeText)
    .filter(Boolean);
  const description = normalizeText(getTxField(tx, 'description', 'description'));
  if (keywords.length > 0 && !keywords.some(keyword => description.includes(keyword))) return false;

  const categoryIds = parseJsonArray(getField(rule, 'categoryIds', 'category_ids'));
  const categoryId = getTxField(tx, 'categoryId', 'category_id');
  if (categoryIds.length > 0 && !categoryIds.map(String).includes(String(categoryId))) return false;

  const accountId = getField(rule, 'accountId', 'account_id');
  const txAccountId = getTxField(tx, 'accountId', 'account_id');
  if (accountId != null && String(accountId) !== String(txAccountId)) return false;

  const amount = Math.abs(Number(tx?.amount || 0));
  const minAmount = getField(rule, 'minAmount', 'min_amount');
  const maxAmount = getField(rule, 'maxAmount', 'max_amount');
  if (minAmount != null && amount < Number(minAmount)) return false;
  if (maxAmount != null && amount > Number(maxAmount)) return false;

  const date = Number(tx?.date);
  const dateFrom = getField(rule, 'dateFrom', 'date_from');
  const dateTo = getField(rule, 'dateTo', 'date_to');
  if (dateFrom != null && date < Number(dateFrom)) return false;
  if (dateTo != null && date > Number(dateTo)) return false;

  return true;
};

export const matchGroupIdsForTransaction = (rules = [], tx) => (
  [...new Set(
    rules
      .filter(rule => ruleMatches(rule, tx))
      .map(rule => Number(getField(rule, 'groupId', 'group_id')))
      .filter(Number.isFinite)
  )]
);

export const previewRuleAssignments = (rules = [], txList = [], txGroupMap = {}) => (
  txList
    .filter(tx => tx?.isIgnored !== 1)
    .map(tx => {
      const matched = matchGroupIdsForTransaction(rules, tx);
      const existing = txGroupMap?.[tx.id] || [];
      const groupIds = matched.filter(groupId => !existing.map(Number).includes(groupId));
      return groupIds.length > 0 ? { tx, groupIds } : null;
    })
    .filter(Boolean)
);
