import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import SwipeableCard from './SwipeableCard';

const TransactionItem = React.memo(({ 
  item, 
  index, 
  sectionLength, 
  activeTheme, 
  catInfo, 
  accountName, 
  styles, 
  onEdit, 
  onDelete, 
  onAccept, 
  onSplit, 
  hasSplit 
}) => {
  const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  
  const isFirst = index === 0;
  const isLast = index === sectionLength - 1;
  
  return (
    <SwipeableCard 
      onDelete={onDelete}
      onAccept={onAccept}
      containerStyle={[
        isFirst && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
        isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }
      ]}
    >
      {(isSwiping) => (
        <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
          <View style={[
            styles.card, 
            { backgroundColor: activeTheme.card },
            !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 }
          ]}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: item.isPending ? activeTheme.expense + '20' : catInfo.color + '20' }]}>
              {item.isPending ? (
                <Ionicons name="time" size={20} color={activeTheme.expense} />
              ) : (
                <Ionicons name={catInfo.icon} size={20} color={catInfo.color} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.desc, { color: activeTheme.text, flexShrink: 1 }]} numberOfLines={1}>{item.description}</Text>
                {item.isVirtual && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: activeTheme.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Ionicons name="calendar-outline" size={10} color={activeTheme.accent} />
                    <Text style={{ color: activeTheme.accent, fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Previsto</Text>
                  </View>
                )}
                {item.isPending === 1 && !item.isVirtual && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: '#FF980020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Ionicons name="time-outline" size={10} color="#FF9800" />
                    <Text style={{ color: '#FF9800', fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Pendente</Text>
                  </View>
                )}
                {hasSplit && (
                  <TouchableOpacity onPress={onSplit} style={{ marginLeft: 6, padding: 4 }}>
                    <Ionicons name="people" size={14} color={activeTheme.accent} />
                  </TouchableOpacity>
                )}
                {item.recurrenceId && (
                  <View style={{ marginLeft: 6, padding: 4 }}>
                    <Ionicons name="repeat" size={14} color={activeTheme.textSecondary} />
                  </View>
                )}
              </View>
              <Text style={[styles.date, { color: activeTheme.textSecondary }]}>{dateStr} • {accountName}</Text>
            </View>
          </View>
          <Text style={[
            styles.amount, 
            { color: item.type === 'income' ? activeTheme.income : activeTheme.expense, opacity: item.isVirtual ? 0.6 : 1 }
          ]}>
            {item.type === 'income' ? '+' : '-'} R$ {CurrencyUtils.formatDisplay(Math.abs(item.amount))}
          </Text>
        </View>
      </TouchableOpacity>
      )}
    </SwipeableCard>
  );
}, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item && 
         prevProps.activeTheme === nextProps.activeTheme && 
         prevProps.catInfo.color === nextProps.catInfo.color &&
         prevProps.catInfo.icon === nextProps.catInfo.icon &&
         prevProps.accountName === nextProps.accountName &&
         prevProps.sectionLength === nextProps.sectionLength &&
         prevProps.index === nextProps.index &&
         prevProps.hasSplit === nextProps.hasSplit;
});

export default TransactionItem;
