import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { GroupsRepository } from '../services/GroupsRepository';
import { GroupRulesRepository } from '../services/GroupRulesRepository';
import { TransactionRepository } from '../services/TransactionRepository';
import { previewRuleAssignments } from '../utils/GroupRules';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import GroupRuleModal from '../components/GroupRuleModal';
import BaseModalCenter from '../components/ui/BaseModalCenter';
import { CurrencyUtils } from '../utils/currencyUtils';
import { getZoomFactor } from '../utils/scaler';

const parse = value => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

export default function GroupRulesScreen({ route, navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { categoryList, loadCategories } = useCategories();
  const { accountList, loadAccounts } = useAccounts();
  const [group, setGroup] = useState(null);
  const [rules, setRules] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [preview, setPreview] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState([]);
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const loadData = useCallback(async () => {
    const [loadedGroup, loadedRules] = await Promise.all([
      GroupsRepository.getById(route.params.groupId),
      GroupRulesRepository.getForGroup(route.params.groupId)
    ]);
    setGroup(loadedGroup);
    setRules(loadedRules);
    loadCategories();
    loadAccounts();
  }, [route.params.groupId, loadCategories, loadAccounts]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const saveRule = async data => {
    if (editingRule) await GroupRulesRepository.update(editingRule.id, data);
    else await GroupRulesRepository.add({ ...data, groupId: route.params.groupId });
    setShowRuleModal(false);
    setEditingRule(null);
    await loadData();
  };

  const deleteRule = id => {
    Alert.alert('Apagar regra', 'A regra será removida.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await GroupRulesRepository.remove(id); await loadData(); } }
    ]);
  };

  const applyPreview = async () => {
    const txGroupMap = await GroupsRepository.getTransactionGroupMap();
    for (const item of preview.filter(entry => selectedPreviewIds.includes(entry.tx.id))) {
      const existing = txGroupMap[item.tx.id] || [];
      await GroupsRepository.setTransactionGroups(item.tx.id, [...new Set([...existing, ...item.groupIds])]);
    }
    setPreview([]);
    setSelectedPreviewIds([]);
    Alert.alert('Sucesso', 'As transações selecionadas foram adicionadas ao grupo.');
  };

  const openPreview = async () => {
    const allRules = rules.filter(rule => rule.isActive !== 0);
    const [txList, txGroupMap] = await Promise.all([
      TransactionRepository.getAll(),
      GroupsRepository.getTransactionGroupMap()
    ]);
    const matches = previewRuleAssignments(allRules, txList, txGroupMap);
    if (!matches.length) {
      Alert.alert('Nenhuma transação nova corresponde às regras.');
      return;
    }
    setPreview(matches);
    setSelectedPreviewIds(matches.map(item => item.tx.id));
  };

  const togglePreview = id => setSelectedPreviewIds(current => current.includes(id)
    ? current.filter(value => value !== id)
    : [...current, id]);

  if (!group) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Regras · {group.name}</Text>
        <TouchableOpacity onPress={() => { setEditingRule(null); setShowRuleModal(true); }}><Ionicons name="add" size={25} color={activeTheme.text} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.applyButton} onPress={openPreview}>
          <Ionicons name="flash-outline" size={19} color={activeTheme.accent} />
          <Text style={styles.applyText}>Aplicar às transações existentes</Text>
        </TouchableOpacity>
        {rules.map(rule => {
          const keywords = parse(rule.keywords);
          const categories = parse(rule.categoryIds).map(id => categoryList.find(category => String(category.id) === String(id))?.name).filter(Boolean);
          const account = accountList.find(item => String(item.id) === String(rule.accountId));
          return (
            <View key={rule.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Regra #{rule.id}</Text>
                <Switch value={rule.isActive !== 0} onValueChange={async value => { await GroupRulesRepository.update(rule.id, { isActive: value ? 1 : 0 }); await loadData(); }} trackColor={{ true: activeTheme.accent }} />
              </View>
              <View style={styles.chipWrap}>
                {keywords.map(keyword => <Text key={`k-${keyword}`} style={styles.chip}>{keyword}</Text>)}
                {categories.map(category => <Text key={`c-${category}`} style={styles.chip}>{category}</Text>)}
                {account && <Text style={styles.chip}>{account.name}</Text>}
              </View>
              {(rule.minAmount != null || rule.maxAmount != null) && (
                <Text style={styles.detail}>Valor: {rule.minAmount != null ? `R$ ${CurrencyUtils.formatDisplay(rule.minAmount)}` : '—'} até {rule.maxAmount != null ? `R$ ${CurrencyUtils.formatDisplay(rule.maxAmount)}` : '—'}</Text>
              )}
              {(rule.dateFrom || rule.dateTo) && <Text style={styles.detail}>Data: {rule.dateFrom ? new Date(rule.dateFrom).toLocaleDateString('pt-BR') : '—'} até {rule.dateTo ? new Date(rule.dateTo).toLocaleDateString('pt-BR') : '—'}</Text>}
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => { setEditingRule(rule); setShowRuleModal(true); }}><Ionicons name="pencil-outline" size={19} color={activeTheme.accent} /></TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRule(rule.id)}><Ionicons name="trash-outline" size={19} color={activeTheme.expense} /></TouchableOpacity>
              </View>
            </View>
          );
        })}
        {!rules.length && <Text style={styles.empty}>Nenhuma regra configurada.</Text>}
      </ScrollView>
      <GroupRuleModal
        visible={showRuleModal}
        theme={activeTheme}
        initialRule={editingRule}
        categoryList={categoryList}
        accountList={accountList}
        onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
        onSave={saveRule}
      />
      <BaseModalCenter
        visible={preview.length > 0}
        title="Pré-visualização"
        onClose={() => { setPreview([]); setSelectedPreviewIds([]); }}
        onSave={applyPreview}
        saveText={`Aplicar (${selectedPreviewIds.length})`}
        saveDisabled={selectedPreviewIds.length === 0}
      >
        {preview.map(item => {
          const selected = selectedPreviewIds.includes(item.tx.id);
          return (
            <TouchableOpacity key={item.tx.id} style={styles.previewRow} onPress={() => togglePreview(item.tx.id)}>
              <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={21} color={selected ? activeTheme.accent : activeTheme.textSecondary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.previewDescription}>{item.tx.description}</Text>
                <Text style={styles.detail}>{new Date(item.tx.date).toLocaleDateString('pt-BR')}</Text>
              </View>
              <Text style={styles.previewAmount}>R$ {CurrencyUtils.formatDisplay(Math.abs(item.tx.amount))}</Text>
            </TouchableOpacity>
          );
        })}
      </BaseModalCenter>
    </SafeAreaView>
  );
}

const getStyles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, backgroundColor: theme.card },
    title: { color: theme.text, fontSize: 17 * z, fontWeight: 'bold', fontFamily: f, maxWidth: '78%' },
    scroll: { padding: 16 * z, paddingBottom: 40 * z },
    applyButton: { flexDirection: 'row', alignItems: 'center', gap: 8 * z, padding: 14 * z, backgroundColor: theme.card, borderRadius: 8 * z, marginBottom: 14 * z },
    applyText: { color: theme.text, fontWeight: 'bold', fontFamily: f },
    card: { backgroundColor: theme.card, borderRadius: 8 * z, padding: 14 * z, marginBottom: 12 * z },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { color: theme.text, fontWeight: 'bold', fontFamily: f },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 * z, marginTop: 10 * z },
    chip: { color: theme.text, backgroundColor: theme.cardSecondary, paddingHorizontal: 9 * z, paddingVertical: 5 * z, borderRadius: 12 * z, fontSize: 11 * z, fontFamily: f },
    detail: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 8 * z, fontFamily: f },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18 * z, marginTop: 10 * z },
    empty: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 30 * z, fontFamily: f },
    previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 * z, borderBottomWidth: 1, borderBottomColor: theme.background },
    previewDescription: { color: theme.text, fontWeight: 'bold', fontFamily: f },
    previewAmount: { color: theme.expense, fontWeight: 'bold', fontFamily: f }
  });
};
