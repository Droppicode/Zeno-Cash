import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { desc, eq, isNotNull } from 'drizzle-orm';

import { db } from '../database/db';
import { transactions, categories, settings } from '../database/schema';
import { chatWithTools } from './ai/providers';
import { addUsage } from './ai/usage';
import webKeyStore from './ai/webKeyStore';
import { buildNotificationPrompt, notificationModelFor, parseSuggestion, pickExamples } from './notificationAi';

const REQUEST_TIMEOUT_MS = 10000;
const HISTORY_LIMIT = 300;

const readSettings = async () => {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
};

export const getNotificationAiConfig = async () => {
  const values = await readSettings();
  if (values.notificationAi === 'false') return null;
  const provider = values.llmProvider || 'openai';
  const apiKey = Platform.OS === 'web'
    ? webKeyStore.get(provider)
    : await SecureStore.getItemAsync(`llmKey_${provider}`);
  if (!apiKey) return null;
  return { provider, model: notificationModelFor(provider, values.llmModel), apiKey, usage: values.assistantUsage };
};

const recordUsage = async (previous, entry) => {
  let state = {};
  try { state = previous ? JSON.parse(previous) : {}; } catch (e) { state = {}; }
  const value = JSON.stringify(addUsage(state, entry));
  const existing = await db.select().from(settings).where(eq(settings.key, 'assistantUsage'));
  if (existing.length > 0) await db.update(settings).set({ value }).where(eq(settings.key, 'assistantUsage'));
  else await db.insert(settings).values({ key: 'assistantUsage', value });
};

export const enrichPendingTransaction = async ({ txId, parsed, config }) => {
  const categoryList = await db.select().from(categories);
  const history = await db.select().from(transactions)
    .where(isNotNull(transactions.sourceText))
    .orderBy(desc(transactions.date))
    .limit(HISTORY_LIMIT);
  const examples = pickExamples(history.filter(tx => tx.id !== txId), parsed);
  const categoryName = id => categoryList.find(c => c.id === id)?.name || null;
  const { system, user } = buildNotificationPrompt({
    parsed, date: Date.now(), categories: categoryList, examples, categoryName
  });

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let suggestion = null;
  try {
    const response = await chatWithTools({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      system,
      messages: [{ role: 'user', text: user }],
      signal: controller?.signal
    });
    suggestion = parseSuggestion(response.text, { parsed, categories: categoryList });
    await recordUsage(config.usage, {
      provider: config.provider,
      model: config.model,
      usage: { ...response.usage, requests: 1 },
      rateLimit: response.rateLimit
    }).catch(() => {});
  } finally {
    if (timer) clearTimeout(timer);
  }

  const [current] = await db.select().from(transactions).where(eq(transactions.id, txId));
  if (!current) return null;
  const untouched = current.isPending === 1 && current.description === parsed.description;
  if (!suggestion || !untouched) {
    await db.update(transactions).set({ aiStatus: suggestion ? 'skipped' : 'failed' }).where(eq(transactions.id, txId));
    return null;
  }

  await db.update(transactions).set({
    description: suggestion.description,
    note: suggestion.note,
    type: suggestion.type,
    amount: suggestion.amount,
    categoryId: suggestion.categoryId ?? current.categoryId,
    aiStatus: 'done'
  }).where(eq(transactions.id, txId));
  return suggestion;
};
