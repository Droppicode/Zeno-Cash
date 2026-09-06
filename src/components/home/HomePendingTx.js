import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import SwipeableCard from '../ui/SwipeableCard';
import { resolveCategory } from '../../services/categorizer';

export default function HomePendingTx({
  displayPendingList,
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
  if (displayPendingList.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: activeTheme.expense }]}>Transações Pendentes</Text>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {displayPendingList.map((item, idx) => {
          const isLast = idx === displayPendingList.length - 1;
          
          return (
            <SwipeableCard key={item.id} 
              onDelete={async () => {
                if (item.recurrenceId) {
                  await updateTransaction(item.id, { isIgnored: 1 });
                } else {
                  await removeTransaction(item.id);
                }
                await loadAccounts();
                await loadDebts();
              }}
              onAccept={async () => {
                await updateTransaction(item.id, { isPending: 0 });
                await loadAccounts();
              }}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                <View style={[styles.groupedItem, { backgroundColor: activeTheme.card }, !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.groupedIcon, { backgroundColor: activeTheme.expense + '20' }]}>
                      <Ionicons name="time" size={18} color={activeTheme.expense} />
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
                      <Text style={[{ color: activeTheme.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                        {new Date(item.date).toLocaleDateString('pt-BR')} {item.note ? `- ${item.note}` : ''}
                      </Text>
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
    </View>
  );
}
