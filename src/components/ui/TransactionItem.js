import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import SwipeableCard from './SwipeableCard';
import AiLoadingBorder from './AiLoadingBorder';
import { isAiLoading } from '../../services/notificationAi';

const TransactionItem = React.memo(function TransactionItem({
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
  hasSplit,
  deleteText = 'Apagar',
  txGroupMap,
  groupColorMap,
  onLongPress,
  selectable = false,
  selected = false
}) {
  const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  
  const isFirst = index === 0;
  const isLast = index === sectionLength - 1;
  
  return (
    <SwipeableCard 
      onDelete={onDelete}
      deleteText={deleteText}
      onAccept={onAccept}
      enabled={!selectable}
      containerStyle={[
        isFirst && { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
        isLast && { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
      ]}
    >
      {(isSwiping) => (
        <TouchableOpacity onPress={selectable ? onLongPress : onEdit} onLongPress={onLongPress} activeOpacity={0.7}>
          <AiLoadingBorder active={isAiLoading(item)} color={activeTheme.accent}>
          <View style={[
            styles.card, 
            { backgroundColor: activeTheme.card },
            selected && { backgroundColor: activeTheme.accent + '18' },
            !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 }
          ]}>
          {selectable && (
            <View style={{ width: 28, alignItems: 'flex-start' }}>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selected ? activeTheme.accent : activeTheme.textSecondary}
              />
            </View>
          )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: activeTheme.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Ionicons name="calendar-outline" size={10} color={activeTheme.accent} />
                    <Text style={{ color: activeTheme.accent, fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Previsto</Text>
                  </View>
                )}
                {item.isPending === 1 && !item.isVirtual && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: '#FF980020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Ionicons name={isAiLoading(item) ? 'sparkles' : 'time-outline'} size={10} color="#FF9800" />
                    <Text style={{ color: '#FF9800', fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>{isAiLoading(item) ? 'IA lendo…' : 'Pendente'}</Text>
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
                {txGroupMap?.[item.id]?.slice(0, 2).map((groupId, groupIndex) => (
                  <View key={groupId} style={{ width: 7, height: 7, borderRadius: 4, marginLeft: 4, backgroundColor: groupColorMap?.[groupId] || activeTheme.accent }} />
                ))}
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
          </AiLoadingBorder>
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
         prevProps.hasSplit === nextProps.hasSplit &&
         prevProps.txGroupMap === nextProps.txGroupMap &&
         prevProps.groupColorMap === nextProps.groupColorMap &&
         prevProps.selectable === nextProps.selectable &&
         prevProps.selected === nextProps.selected &&
         prevProps.onLongPress === nextProps.onLongPress;
});

export default TransactionItem;
