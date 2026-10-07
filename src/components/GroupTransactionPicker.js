import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseModalBottom from './ui/BaseModalBottom';
import { TransactionRepository } from '../services/TransactionRepository';
import { GroupsRepository } from '../services/GroupsRepository';
import { InvoiceUtils } from '../utils/InvoiceUtils';
import { normalizeText } from '../utils/GroupRules';
import { CurrencyUtils } from '../utils/currencyUtils';
import { getZoomFactor } from '../utils/scaler';

const PAGE_SIZE = 50;

export default function GroupTransactionPicker({ visible, theme, groupId, hideSettlements = true, onClose, onConfirm }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    Promise.all([TransactionRepository.getAll(), GroupsRepository.getTransactionGroupMap()]).then(([allTx, map]) => {
      if (cancelled) return;
      const rows = allTx.filter(tx => {
        if (tx.isIgnored === 1 || (hideSettlements && InvoiceUtils.getSettlementDebtId(tx.note) !== null)) return false;
        return !(map[tx.id] || []).map(Number).includes(Number(groupId));
      });
      setTransactions(rows);
      setSelectedIds([]);
      setSearch('');
      setVisibleCount(PAGE_SIZE);
    });
    return () => { cancelled = true; };
  }, [visible, groupId, hideSettlements]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return transactions.filter(tx => !query || normalizeText(tx.description).includes(query));
  }, [transactions, search]);

  const toggle = id => setSelectedIds(current => current.includes(id)
    ? current.filter(value => value !== id)
    : [...current, id]);
  const shown = filtered.slice(0, visibleCount);

  return (
    <BaseModalBottom
      visible={visible}
      title="Adicionar transações"
      theme={theme}
      onClose={onClose}
      showActions={false}
      footerComponent={(
        <View style={styles(theme).footer}>
          <TouchableOpacity style={[styles(theme).cancelBtn]} onPress={onClose}>
            <Text style={[styles(theme).cancelText]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles(theme).addBtn, { backgroundColor: theme.accent, opacity: selectedIds.length ? 1 : 0.5 }]}
            disabled={!selectedIds.length}
            onPress={() => onConfirm(selectedIds)}
          >
            <Text style={styles(theme).addText}>Adicionar ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <TextInput
        style={[styles(theme).search, { color: theme.text, backgroundColor: theme.cardSecondary }]}
        placeholder="Buscar descrição..."
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView style={{ maxHeight: 440 * getZoomFactor(theme) }} keyboardShouldPersistTaps="handled">
        {shown.map(tx => {
          const selected = selectedIds.includes(tx.id);
          return (
            <TouchableOpacity key={tx.id} style={[styles(theme).row, selected && { backgroundColor: theme.accent + '18' }]} onPress={() => toggle(tx.id)}>
              <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={selected ? theme.accent : theme.textSecondary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles(theme).description]} numberOfLines={1}>{tx.description}</Text>
                <Text style={[styles(theme).meta]}>{new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
              </View>
              <Text style={[styles(theme).amount, { color: tx.type === 'income' ? theme.income : theme.expense }]}>
                {tx.type === 'income' ? '+' : '-'} R$ {CurrencyUtils.formatDisplay(Math.abs(tx.amount))}
              </Text>
            </TouchableOpacity>
          );
        })}
        {!shown.length && <Text style={[styles(theme).empty]}>Nenhuma transação disponível.</Text>}
        {visibleCount < filtered.length && (
          <TouchableOpacity style={styles(theme).loadMore} onPress={() => setVisibleCount(value => value + PAGE_SIZE)}>
            <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Carregar mais</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </BaseModalBottom>
  );
}

const styles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    search: { borderRadius: 6 * z, paddingHorizontal: 12 * z, paddingVertical: 10 * z, marginBottom: 12 * z, fontFamily: f },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 * z, borderBottomWidth: 1, borderBottomColor: theme.background },
    description: { color: theme.text, fontFamily: f, fontWeight: 'bold' },
    meta: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 3 * z, fontFamily: f },
    amount: { fontWeight: 'bold', fontFamily: f, fontSize: 12 * z },
    empty: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 28 * z, fontFamily: f },
    loadMore: { alignItems: 'center', paddingVertical: 14 * z },
    footer: { flexDirection: 'row', gap: 12 * z, marginTop: 16 * z },
    cancelBtn: { flex: 1, padding: 14 * z, borderRadius: 6 * z, backgroundColor: theme.cardSecondary, alignItems: 'center' },
    addBtn: { flex: 1, padding: 14 * z, borderRadius: 6 * z, alignItems: 'center' },
    cancelText: { color: theme.text, fontWeight: 'bold', fontFamily: f },
    addText: { color: '#121212', fontWeight: 'bold', fontFamily: f }
  });
};
