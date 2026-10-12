import React, { useContext, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../../context/SettingsContext';
import { CurrencyUtils } from '../../utils/currencyUtils';
import { budgetLevel, computeMacroBudgets, listMacros, macroColor } from '../../utils/MacroBudgets';

const LEVEL_COLORS = { ok: null, warning: '#F5A524', over: '#F31260' };

export default function HomeBudgets({ categoryList, txList, selectedMonths, activeTheme, styles, navigation }) {
  const { macroBudgets, macroOptions } = useContext(SettingsContext);
  const macros = useMemo(() => listMacros(macroOptions, categoryList), [macroOptions, categoryList]);
  const budgets = useMemo(
    () => computeMacroBudgets(categoryList, txList, selectedMonths, macroBudgets, macroOptions),
    [categoryList, txList, selectedMonths, macroBudgets, macroOptions]
  );
  const openMacros = () => navigation.navigate('Config', { open: 'macros', at: Date.now() });

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Limites por Macro</Text>
        <TouchableOpacity testID="budgets-edit" onPress={openMacros} style={{ padding: 4 }}>
          <Ionicons name="options-outline" size={18} color={activeTheme.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {budgets.length === 0 && (
          <TouchableOpacity style={styles.groupedItem} onPress={openMacros}>
            <Text style={{ color: activeTheme.textSecondary, flex: 1 }}>
              Defina um limite mensal para Essenciais, Estilo de Vida e outras macros.
            </Text>
            <Ionicons name="chevron-forward" size={18} color={activeTheme.textSecondary} />
          </TouchableOpacity>
        )}
        {budgets.map(({ macro, spent, limit, ratio }, index) => {
          const level = budgetLevel(ratio);
          const barColor = LEVEL_COLORS[level] || macroColor(macros, macro, activeTheme.textSecondary);
          return (
            <TouchableOpacity
              key={macro}
              testID={`budget-${macro}`}
              onPress={openMacros}
              style={[{ paddingVertical: 10, paddingHorizontal: 14 }, index < budgets.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.groupedText, { color: activeTheme.text, flex: 1 }]} numberOfLines={1}>{macro}</Text>
                {level !== 'ok' && <Ionicons name={level === 'over' ? 'alert-circle' : 'warning'} size={16} color={barColor} style={{ marginRight: 6 }} />}
                <Text style={{ color: level === 'ok' ? activeTheme.textSecondary : barColor, fontWeight: 'bold' }}>
                  {Math.round(ratio * 100)}%
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: activeTheme.background, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(ratio, 1) * 100}%`, height: '100%', backgroundColor: barColor }} />
              </View>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 12, marginTop: 4 }}>
                R$ {CurrencyUtils.formatDisplay(spent)} de R$ {CurrencyUtils.formatDisplay(limit)}
                {ratio >= 1 ? ` · R$ ${CurrencyUtils.formatDisplay(spent - limit)} acima` : ` · resta R$ ${CurrencyUtils.formatDisplay(limit - spent)}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
