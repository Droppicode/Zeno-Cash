import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useGroups } from '../hooks/useGroups';
import { GroupsRepository } from '../services/GroupsRepository';
import { GroupRulesRepository } from '../services/GroupRulesRepository';
import { DocumentScanner } from '../services/DocumentScanner';
import { runAgent } from '../services/ai/AgentRunner';
import GroupModal from '../components/GroupModal';
import { getZoomFactor } from '../utils/scaler';

const suggestions = [
  'Quanto gastei este mês?',
  'Crie um grupo com meus gastos de carro',
  'Resumo por categoria dos últimos 3 meses',
  'Resumo do mês',
  'Mudar para o tema claro'
];

const proposalLabel = type => ({
  group: 'Novo grupo',
  assign: 'Atribuição de transações',
  rule: 'Regra automática',
  transactions: 'Novas transações',
  settings: 'Alteração de configurações'
}[type] || 'Proposta');

export default function AssistantScreen({ navigation }) {
  const {
    activeTheme, customThemes, llmProvider, llmModel, llmKey, defaultPeriod, uiConfig,
    assistantMemory, saveSetting, getSecureKey
  } = useContext(SettingsContext);
  const { txList, loadTransactions, saveTransaction } = useTransactions();
  const { accountList, loadAccounts } = useAccounts();
  const { categoryList, loadCategories } = useCategories();
  const { groupList, loadGroups, txGroupMap, loadTxGroupMap } = useGroups();
  const [apiKey, setApiKey] = useState(llmKey || '');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [editingProposal, setEditingProposal] = useState(null);
  const listRef = useRef(null);
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  useEffect(() => {
    let mounted = true;
    getSecureKey(llmProvider).then(key => { if (mounted) setApiKey(key || ''); });
    loadTransactions();
    loadAccounts();
    loadCategories();
    loadGroups();
    loadTxGroupMap();
    return () => { mounted = false; };
  }, [llmProvider, getSecureKey, loadTransactions, loadAccounts, loadCategories, loadGroups, loadTxGroupMap]);

  const ctx = useMemo(() => ({
    txList,
    accountList,
    categoryList,
    groupList,
    txGroupMap,
    settings: {
      currency: 'BRL',
      defaultPeriod,
      provider: llmProvider,
      model: llmModel,
      theme: activeTheme.name,
      hideSettlements: uiConfig.hideDebtSettlements !== false,
      activeThemeId: activeTheme.id
    },
    themes: customThemes,
    activeTheme,
    activeThemeId: activeTheme.id,
    uiConfig,
    defaultPeriod,
    assistantMemory,
    accounts: accountList
  }), [txList, accountList, categoryList, groupList, txGroupMap, defaultPeriod, llmProvider, llmModel, activeTheme, uiConfig, customThemes, assistantMemory]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 20);
  }, [messages, step]);

  const submit = useCallback(async value => {
    const typedText = (value ?? input).trim();
    const userText = typedText || (attachment ? 'Crie transações a partir deste documento.' : '');
    if (!userText || busy) return;
    if (!apiKey) {
      setMessages(current => [...current, { id: `m_${Date.now()}`, role: 'assistant', text: 'Configure a chave em Config → Extração de Dados para usar o assistente.', error: true }]);
      return;
    }
    setInput('');
    const sentAttachment = attachment;
    setAttachment(null);
    setBusy(true);
    setStep('Consultando transações…');
    const userMessage = { id: `m_${Date.now()}_u`, role: 'user', text: userText, attachment: sentAttachment };
    setMessages(current => [...current, userMessage]);
    try {
      const result = await runAgent({
        provider: llmProvider,
        model: llmModel,
        apiKey,
        history,
        userText,
        attachments: sentAttachment ? [{
          mimeType: sentAttachment.mimeType,
          base64: sentAttachment.base64,
          name: sentAttachment.name
        }] : undefined,
        ctx,
        onStep: name => setStep(name === 'search_transactions' ? 'Consultando transações…' : 'Analisando dados…')
      });
      setHistory(result.history);
      if (result.memoryWrites?.length) {
        const nextMemory = [...assistantMemory, ...result.memoryWrites].slice(-10);
        await saveSetting('assistantMemory', nextMemory);
      }
      setMessages(current => [...current, {
        id: `m_${Date.now()}_a`,
        role: 'assistant',
        text: result.text,
        proposals: result.proposals,
        remembered: result.memoryWrites?.length ? result.memoryWrites : []
      }]);
    } catch (error) {
      setMessages(current => [...current, { id: `m_${Date.now()}_e`, role: 'assistant', text: error.message || 'Não foi possível consultar o provedor.', error: true }]);
    } finally {
      setBusy(false);
      setStep('');
    }
  }, [input, attachment, busy, apiKey, llmProvider, llmModel, history, ctx, assistantMemory, saveSetting]);

  const pickDocument = async () => {
    const picked = await DocumentScanner.pickDocument();
    if (picked) setAttachment(picked);
  };

  const pickImage = async () => {
    const picked = await DocumentScanner.pickImage();
    if (picked) setAttachment(picked);
  };

  const refreshData = async () => {
    await Promise.all([loadGroups(), loadTxGroupMap(), loadTransactions()]);
  };

  const markProposal = (messageId, proposalId, status) => {
    setMessages(current => current.map(message => message.id !== messageId ? message : {
      ...message,
      proposals: (message.proposals || []).map(item => item.proposalId === proposalId ? { ...item, status } : item)
    }));
  };

  const applyProposal = async (messageId, item) => {
    if (item.status !== 'pending') return;
    if (item.type === 'group') {
      const groupId = await GroupsRepository.add({
        name: item.name,
        kind: item.kind,
        description: item.description || null,
        startDate: item.startDate ? new Date(item.startDate).getTime() : null,
        endDate: item.endDate ? new Date(item.endDate).getTime() : null,
        budget: item.budget,
        isArchived: 0
      });
      for (const txId of item.transactionIds || []) {
        const existing = await GroupsRepository.getGroupIdsForTransaction(txId);
        await GroupsRepository.setTransactionGroups(txId, [...new Set([...existing, groupId])]);
      }
      if (item.rule) await addRule(groupId, item.rule);
    } else if (item.type === 'assign') {
      for (const txId of item.transactionIds || []) {
        const existing = await GroupsRepository.getGroupIdsForTransaction(txId);
        await GroupsRepository.setTransactionGroups(txId, [...new Set([...existing, item.groupId])]);
      }
    } else if (item.type === 'rule') {
      await addRule(item.groupId, item);
    } else if (item.type === 'transactions') {
      for (const transaction of item.items || []) {
        const newId = await saveTransaction(null, {
          ...transaction,
          amount: Math.abs(Number(transaction.amount || 0)),
          date: typeof transaction.date === 'string' ? new Date(transaction.date).getTime() : transaction.date,
          isPending: 0
        });
        if (newId && transaction.groupIds?.length) {
          await GroupsRepository.setTransactionGroups(newId, transaction.groupIds);
        }
      }
    } else if (item.type === 'settings') {
      if (item.themeId) {
        const theme = customThemes.find(candidate => candidate.id === item.themeId);
        if (theme) await saveSetting('activeTheme', theme);
      }
      if (item.uiConfig) await saveSetting('uiConfig', { ...uiConfig, ...item.uiConfig });
      if (item.defaultPeriod) await saveSetting('defaultPeriod', item.defaultPeriod);
    }
    await refreshData();
    markProposal(messageId, item.proposalId, 'applied');
  };

  const addRule = async (groupId, rule) => {
    const categoryIds = Array.isArray(rule.categoryIds)
      ? rule.categoryIds
      : rule.categoryIds == null ? [] : [rule.categoryIds];
    return GroupRulesRepository.add({
      groupId,
      keywords: JSON.stringify(rule.keywords || []),
      categoryIds: JSON.stringify(categoryIds),
      accountId: rule.accountId ?? null,
      minAmount: rule.minAmount ?? null,
      maxAmount: rule.maxAmount ?? null,
      dateFrom: rule.dateFrom ? new Date(rule.dateFrom).getTime() : null,
      dateTo: rule.dateTo ? new Date(rule.dateTo).getTime() : null,
      isActive: 1
    });
  };

  const renderProposal = (messageId, item) => (
    <View key={item.proposalId} style={styles.proposal}>
      <Text style={styles.proposalTitle}>{proposalLabel(item.type)}</Text>
      {item.type === 'group' && <Text style={styles.proposalText}>{item.name} · {item.kind === 'event' ? 'Evento' : 'Contínuo'}{item.budget ? ` · R$ ${Number(item.budget).toFixed(2).replace('.', ',')}` : ''}</Text>}
      {item.type === 'assign' && <Text style={styles.proposalText}>{item.transactionIds?.length || 0} transações serão adicionadas ao grupo #{item.groupId}.</Text>}
      {item.type === 'rule' && <Text style={styles.proposalText}>Critérios: {(item.keywords || []).join(', ') || 'categoria/conta/valor'}</Text>}
      {item.type === 'transactions' && <Text style={styles.proposalText}>{item.count || item.items?.length || 0} transações · R$ {Number(item.total || 0).toFixed(2).replace('.', ',')}</Text>}
      {item.type === 'settings' && <Text style={styles.proposalText}>{(item.summary || []).map(line => `• ${line}`).join('\n')}</Text>}
      {item.type === 'transactions' && item.items?.slice(0, 5).map((transaction, index) => (
        <Text key={`${item.proposalId}_${index}`} style={styles.preview}>
          {transaction.date ? `${String(transaction.date).split('-').reverse().join('/')}` : '—'} · {transaction.description} · R$ {Number(transaction.amount || 0).toFixed(2).replace('.', ',')}
        </Text>
      ))}
      {item.transactionPreview?.length ? <Text style={styles.preview}>• {item.transactionPreview.join('\n• ')}</Text> : null}
      {item.status === 'applied' ? (
        <Text style={styles.applied}>Aplicado ✓</Text>
      ) : item.status === 'discarded' ? (
        <Text style={styles.discarded}>Descartado</Text>
      ) : (
        <View style={styles.proposalActions}>
          {item.type === 'group' && <TouchableOpacity onPress={() => setEditingProposal({ messageId, item })}><Text style={styles.editAction}>Editar</Text></TouchableOpacity>}
          <TouchableOpacity onPress={() => applyProposal(messageId, item)}><Text style={styles.applyAction}>Aplicar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => markProposal(messageId, item.proposalId, 'discarded')}><Text style={styles.discardAction}>Descartar</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMessage = ({ item }) => (
    <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      {item.role === 'user' && item.attachment ? <Text style={styles.attachmentLine}>📎 {item.attachment.name}</Text> : null}
      <Text style={[styles.messageText, item.error && { color: activeTheme.expense }]}>{item.text}</Text>
      {item.role === 'assistant' && item.remembered?.map(text => <Text key={text} style={styles.remembered}>Lembrado: {text}</Text>)}
      {(item.proposals || []).map(proposal => renderProposal(item.id, proposal))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Assistente</Text>
          <Text style={styles.provider}>{llmProvider} · {llmModel || 'modelo padrão'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={25} color={activeTheme.text} /></TouchableOpacity>
      </View>
      {!apiKey && (
        <View style={styles.keyCard}>
          <Ionicons name="key-outline" size={21} color={activeTheme.accent} />
          <Text style={styles.keyText}>Configure a chave em Config → Extração de Dados.</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={34} color={activeTheme.accent} />
            <Text style={styles.emptyText}>Pergunte sobre suas finanças.</Text>
            <View style={styles.suggestions}>
              {suggestions.map(suggestion => <TouchableOpacity key={suggestion} style={styles.suggestion} onPress={() => submit(suggestion)}><Text style={styles.suggestionText}>{suggestion}</Text></TouchableOpacity>)}
            </View>
          </View>
        )}
      />
      {step ? <Text style={styles.step}>{step}</Text> : null}
      {attachment ? (
        <View style={styles.pendingAttachment}>
          <Text style={styles.pendingAttachmentText} numberOfLines={1}>📎 {attachment.name}</Text>
          <TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close" size={18} color={activeTheme.textSecondary} /></TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={pickDocument} disabled={busy} style={styles.attachButton}>
          <Ionicons name="attach-outline" size={22} color={activeTheme.accent} />
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity onPress={pickImage} disabled={busy} style={styles.attachButton}>
            <Ionicons name="camera-outline" size={21} color={activeTheme.accent} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={attachment && !input ? 'Crie transações a partir deste documento.' : 'Pergunte ao assistente...'}
          placeholderTextColor={activeTheme.textSecondary}
          multiline
        />
        <TouchableOpacity style={[styles.send, { backgroundColor: activeTheme.accent, opacity: busy || (!input.trim() && !attachment) ? 0.5 : 1 }]} disabled={busy || (!input.trim() && !attachment)} onPress={() => submit()}>
          {busy ? <ActivityIndicator size="small" color="#121212" /> : <Ionicons name="arrow-up" size={21} color="#121212" />}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
      <GroupModal
        visible={!!editingProposal}
        theme={activeTheme}
        initialGroup={editingProposal?.item}
        onClose={() => setEditingProposal(null)}
        onSave={async (id, data) => {
          const { messageId, item } = editingProposal;
          setEditingProposal(null);
          await applyProposal(messageId, { ...item, ...data });
        }}
      />
    </SafeAreaView>
  );
}

const getStyles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, backgroundColor: theme.card },
    title: { color: theme.text, fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
    provider: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 3 * z, fontFamily: f },
    keyCard: { flexDirection: 'row', alignItems: 'center', gap: 8 * z, margin: 12 * z, padding: 12 * z, borderRadius: 8 * z, backgroundColor: theme.card },
    keyText: { color: theme.textSecondary, flex: 1, fontFamily: f },
    list: { padding: 14 * z, paddingBottom: 20 * z, flexGrow: 1 },
    message: { maxWidth: '90%', padding: 12 * z, borderRadius: 10 * z, marginBottom: 10 * z },
    userMessage: { alignSelf: 'flex-end', backgroundColor: theme.cardSecondary },
    assistantMessage: { alignSelf: 'flex-start', backgroundColor: theme.card },
    messageText: { color: theme.text, lineHeight: 20 * z, fontFamily: f },
    attachmentLine: { color: theme.textSecondary, fontSize: 11 * z, marginBottom: 5 * z, fontFamily: f },
    remembered: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 8 * z, fontFamily: f },
    empty: { alignItems: 'center', paddingTop: 45 * z },
    emptyText: { color: theme.textSecondary, marginTop: 10 * z, fontFamily: f },
    suggestions: { gap: 8 * z, marginTop: 18 * z, width: '100%' },
    suggestion: { borderWidth: 1, borderColor: theme.cardSecondary, borderRadius: 18 * z, padding: 10 * z },
    suggestionText: { color: theme.text, fontSize: 12 * z, fontFamily: f },
    step: { color: theme.textSecondary, fontSize: 11 * z, paddingHorizontal: 14 * z, paddingBottom: 5 * z, fontFamily: f },
    pendingAttachment: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12 * z, paddingHorizontal: 10 * z, paddingVertical: 6 * z, borderRadius: 6 * z, backgroundColor: theme.cardSecondary },
    pendingAttachmentText: { color: theme.textSecondary, flex: 1, fontSize: 11 * z, fontFamily: f },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 * z, padding: 12 * z, backgroundColor: theme.card },
    attachButton: { width: 30 * z, height: 40 * z, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, maxHeight: 100 * z, color: theme.text, backgroundColor: theme.cardSecondary, borderRadius: 18 * z, paddingHorizontal: 14 * z, paddingVertical: 10 * z, fontFamily: f },
    send: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, alignItems: 'center', justifyContent: 'center' },
    proposal: { marginTop: 10 * z, padding: 10 * z, borderRadius: 7 * z, borderWidth: 1, borderColor: theme.accent + '70' },
    proposalTitle: { color: theme.accent, fontWeight: 'bold', fontFamily: f },
    proposalText: { color: theme.text, fontSize: 12 * z, marginTop: 5 * z, fontFamily: f },
    preview: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 7 * z, fontFamily: f },
    proposalActions: { flexDirection: 'row', gap: 16 * z, marginTop: 10 * z },
    applyAction: { color: theme.income, fontWeight: 'bold', fontFamily: f },
    editAction: { color: theme.accent, fontWeight: 'bold', fontFamily: f },
    discardAction: { color: theme.expense, fontWeight: 'bold', fontFamily: f },
    applied: { color: theme.income, fontWeight: 'bold', marginTop: 8 * z, fontFamily: f },
    discarded: { color: theme.textSecondary, marginTop: 8 * z, fontFamily: f }
  });
};
