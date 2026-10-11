import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import { budgetLevel, computeCategoryBudgets } from '../../utils/CategoryBudgets';

const LEVEL_COLORS = { ok: null, warning: '#F5A524', over: '#F31260' };

export default function HomeBudgets({ categoryList, txList, selectedMonths, activeTheme, styles }) {
  const budgets = useMemo(
    () => computeCategoryBudgets(categoryList, txList, selectedMonths)
      .sort((a, b) => b.ratio - a.ratio),
    [categoryList, txList, selectedMonths]
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Orçamento por Categoria</Text>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {budgets.length === 0 && (
          <View style={styles.groupedItem}>
            <Text style={{ color: activeTheme.textSecondary, flex: 1 }}>
              Defina um limite mensal em Config → Categorias para acompanhar aqui.
            </Text>
          </View>
        )}
        {budgets.map(({ category, spent, limit, ratio }, index) => {
          const level = budgetLevel(ratio);
          const barColor = LEVEL_COLORS[level] || category.color || activeTheme.accent;
          return (
            <View
              key={category.id}
              testID={`budget-${category.id}`}
              style={[{ paddingVertical: 10, paddingHorizontal: 14 }, index < budgets.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name={category.icon || 'pricetag'} size={16} color={category.color || activeTheme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.groupedText, { color: activeTheme.text, flex: 1 }]} numberOfLines={1}>{category.name}</Text>
                {level !== 'ok' && <Ionicons name={level === 'over' ? 'alert-circle' : 'warning'} size={16} color={barColor} style={{ marginRight: 6 }} />}
                <Text style={{ color: level === 'ok' ? activeTheme.textSecondary : barColor, fontWeight: 'bold' }}>
                  {Math.round(ratio * 100)}%
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: activeTheme.background, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(ratio, 1) * 100}%`, height: '100%', backgroundColor: barColor }} />
              </View>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 12, marginTop: 4 }}>
                R$ {CurrencyUtils.formatDisplay(spent)} de R$ {CurrencyUtils.formatDisplay(limit)}
                {ratio >= 1 ? ` · R$ ${CurrencyUtils.formatDisplay(spent - limit)} acima` : ` · resta R$ ${CurrencyUtils.formatDisplay(limit - spent)}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
