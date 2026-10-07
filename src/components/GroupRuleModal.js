import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BaseModalBottom from './ui/BaseModalBottom';
import CustomDatePicker from './ui/CustomDatePicker';
import { getZoomFactor } from '../utils/scaler';

export default function GroupRuleModal({ visible, theme, initialRule = null, categoryList = [], accountList = [], onClose, onSave }) {
  const [keywordsText, setKeywordsText] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const z = getZoomFactor(theme);
  const styles = useMemo(() => getStyles(theme), [theme]);

  useEffect(() => {
    if (!visible) return;
    let keywords = [];
    try { keywords = initialRule?.keywords ? JSON.parse(initialRule.keywords) : []; } catch (err) {}
    let cats = [];
    try { cats = initialRule?.categoryIds ? JSON.parse(initialRule.categoryIds) : []; } catch (err) {}
    setKeywordsText(keywords.join(', '));
    setCategoryIds(cats.map(Number));
    setAccountId(initialRule?.accountId ?? null);
    setMinAmount(initialRule?.minAmount != null ? String(initialRule.minAmount).replace('.', ',') : '');
    setMaxAmount(initialRule?.maxAmount != null ? String(initialRule.maxAmount).replace('.', ',') : '');
    setDateFrom(initialRule?.dateFrom ? new Date(initialRule.dateFrom) : null);
    setDateTo(initialRule?.dateTo ? new Date(initialRule.dateTo) : null);
    setIsActive(initialRule?.isActive !== 0);
    setErrorMsg('');
  }, [visible, initialRule]);

  const toggleCategory = id => setCategoryIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  const handleSave = async () => {
    const keywords = keywordsText.split(',').map(value => value.trim()).filter(Boolean);
    const min = minAmount.trim() ? parseFloat(minAmount.replace(',', '.')) : null;
    const max = maxAmount.trim() ? parseFloat(maxAmount.replace(',', '.')) : null;
    const hasCriterion = keywords.length > 0 || categoryIds.length > 0 || accountId != null || min != null || max != null || dateFrom || dateTo;
    if (!hasCriterion) {
      setErrorMsg('Informe pelo menos um critério.');
      return;
    }
    if ((minAmount.trim() && Number.isNaN(min)) || (maxAmount.trim() && Number.isNaN(max)) || (min != null && max != null && min > max)) {
      setErrorMsg('Informe uma faixa de valor válida.');
      return;
    }
    await onSave({
      keywords: JSON.stringify(keywords),
      categoryIds: JSON.stringify(categoryIds),
      accountId,
      minAmount: min,
      maxAmount: max,
      dateFrom: dateFrom?.getTime() || null,
      dateTo: dateTo?.getTime() || null,
      isActive: isActive ? 1 : 0
    });
    onClose();
  };

  return (
    <BaseModalBottom
      visible={visible}
      title={initialRule ? 'Editar regra' : 'Nova regra'}
      onClose={onClose}
      onSave={handleSave}
      errorMsg={errorMsg}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Palavras-chave (separadas por vírgula)</Text>
        <TextInput
          style={styles.input}
          value={keywordsText}
          onChangeText={setKeywordsText}
          placeholder="Ex: Uber, combustível"
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={styles.label}>Categorias</Text>
        <View style={styles.wrap}>
          {categoryList.map(category => {
            const selected = categoryIds.includes(category.id);
            return (
              <TouchableOpacity key={category.id} style={[styles.chip, { backgroundColor: selected ? theme.accent : theme.cardSecondary }]} onPress={() => toggleCategory(category.id)}>
                <Text style={[styles.chipText, { color: selected ? '#121212' : theme.text }]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.label}>Conta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {[{ id: null, name: 'Todas' }, ...accountList].map(account => {
            const selected = accountId == null ? account.id == null : String(accountId) === String(account.id);
            return (
              <TouchableOpacity key={account.id == null ? 'all' : account.id} style={[styles.chip, { backgroundColor: selected ? theme.accent : theme.cardSecondary }]} onPress={() => setAccountId(account.id)}>
                <Text style={[styles.chipText, { color: selected ? '#121212' : theme.text }]}>{account.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.amountRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Valor mínimo</Text>
            <TextInput style={styles.input} value={minAmount} onChangeText={setMinAmount} keyboardType="numeric" placeholder="Opcional" placeholderTextColor={theme.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Valor máximo</Text>
            <TextInput style={styles.input} value={maxAmount} onChangeText={setMaxAmount} keyboardType="numeric" placeholder="Opcional" placeholderTextColor={theme.textSecondary} />
          </View>
        </View>
        <Text style={styles.label}>Data inicial</Text>
        <CustomDatePicker value={dateFrom} onChange={setDateFrom} onClear={() => setDateFrom(null)} theme={theme} placeholder="Opcional" style={{ marginBottom: 12 * z }} />
        <Text style={styles.label}>Data final</Text>
        <CustomDatePicker value={dateTo} onChange={setDateTo} onClear={() => setDateTo(null)} theme={theme} placeholder="Opcional" style={{ marginBottom: 12 * z }} />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Regra ativa</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: theme.accent }} />
        </View>
      </ScrollView>
    </BaseModalBottom>
  );
}

const getStyles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    label: { color: theme.textSecondary, fontSize: 12 * z, marginBottom: 6 * z, fontFamily: f },
    input: { backgroundColor: theme.cardSecondary, color: theme.text, borderRadius: 6 * z, padding: 11 * z, marginBottom: 12 * z, fontFamily: f },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * z, marginBottom: 12 * z },
    row: { gap: 8 * z, marginBottom: 12 * z },
    chip: { borderRadius: 16 * z, paddingHorizontal: 12 * z, paddingVertical: 8 * z },
    chipText: { fontSize: 12 * z, fontFamily: f },
    amountRow: { flexDirection: 'row', gap: 10 * z },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 * z }
  });
};
