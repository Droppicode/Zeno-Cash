import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import SwipeableCard from '../ui/SwipeableCard';
import { resolveCategory } from '../../services/categorizer';

export default function HomeRecentTx({
  recentTxList,
  activeTheme,
  styles,
  categoryList,
  debtsList,
  updateTransaction,
  removeTransaction,
  loadAccounts,
  loadDebts,
  setEditingTx,
  setModalVisible
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Últimas Transações</Text>
      
      {recentTxList.length === 0 && (
        <Text style={{ color: activeTheme.textSecondary }}>Nenhuma transação confirmada ainda.</Text>
      )}

      {recentTxList.length > 0 && (
        <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
          {recentTxList.slice(0, 5).map((item, idx) => {
            const catInfo = resolveCategory(item, categoryList);
            const isLast = idx === Math.min(recentTxList.length, 5) - 1;
            
            return (
              <SwipeableCard key={item.id} onDelete={async () => {
                if (item.recurrenceId) {
                  await updateTransaction(item.id, { isIgnored: 1 });
                } else {
                  await removeTransaction(item.id);
                }
                await loadAccounts();
                await loadDebts();
              }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                  <View style={[styles.groupedItem, { backgroundColor: activeTheme.card }, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: activeTheme.background }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.groupedIcon, { backgroundColor: catInfo.color + '20' }]}>
                        <Ionicons name={catInfo.icon} size={18} color={catInfo.color} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.groupedText, { color: activeTheme.text, flexShrink: 1 }]} numberOfLines={1}>{item.description}</Text>
                          {debtsList.some(d => d.transactionId === item.id) && (
                            <Ionicons name="people" size={14} color={activeTheme.accent} style={{ marginLeft: 4 }} />
                          )}
                          {item.recurrenceId && (
                            <Ionicons name="repeat" size={14} color={activeTheme.textSecondary} style={{ marginLeft: 4 }} />
                          )}
                        </View>
                        {item.note ? <Text style={[{ color: activeTheme.textSecondary, fontSize: 11 }]} numberOfLines={1}>{item.note}</Text> : null}
                      </View>
                    </View>
                    <Text style={[styles.groupedAmount, { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }]}>
                      {item.type === 'income' ? '+' : '-'} R$ {CurrencyUtils.formatDisplay(Math.abs(item.amount))}
                    </Text>
                  </View>
                </TouchableOpacity>
              </SwipeableCard>
            );
          })}
        </View>
      )}
    </View>
  );
}
