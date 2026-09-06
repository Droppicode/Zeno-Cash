import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomDatePicker from './CustomDatePicker';
import { getZoomFactor } from '../../utils/scaler';

export default function TransactionsFilterBar({
  uiConfig,
  activeTheme,
  styles,
  accountList,
  filterState,
  filterActions
}) {
  if (uiConfig.transactionsShowFilters === false) return null;

  const {
    accountFilter, showAdvanced, filter, period, forecastPeriod,
    startDateObj, endDateObj, selectedCats, uniqueCategories
  } = filterState;

  const {
    setAccountFilter, setShowAdvanced, setFilter, setPeriod, setForecastPeriod,
    setStartDateObj, setEndDateObj, toggleCategory
  } = filterActions;

  return (
    <View>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
          <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
            <TouchableOpacity style={[styles.periodBtn, accountFilter === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setAccountFilter('all')}>
              <Text style={[styles.periodText, { color: activeTheme.textSecondary }, accountFilter === 'all' && { color: '#121212' }]}>Todas as Contas</Text>
            </TouchableOpacity>
            {accountList.map(acc => (
              <TouchableOpacity key={acc.id} style={[styles.periodBtn, accountFilter === acc.id && { backgroundColor: activeTheme.accent }]} onPress={() => setAccountFilter(acc.id)}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, accountFilter === acc.id && { color: '#121212' }]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={[styles.advancedToggleBtn, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setShowAdvanced(!showAdvanced)}>
          <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={20} color={activeTheme.accent} />
        </TouchableOpacity>
      </View>

      {showAdvanced && (
        <View style={{ marginTop: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={styles.filterScrollContent}>
            <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
              <TouchableOpacity style={[styles.filterBtn, filter === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('all')}>
                <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'all' && { color: '#121212' }]}>Tudo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'income' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('income')}>
                <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'income' && { color: '#121212' }]}>Receitas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'expense' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('expense')}>
                <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'expense' && { color: '#121212' }]}>Despesas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'recurrence' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('recurrence')}>
                <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'recurrence' && { color: '#121212' }]}>Recorrências</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
              <TouchableOpacity style={[styles.periodBtn, period === '30d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('30d')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '30d' && { color: '#121212' }]}>30D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, period === '90d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('90d')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '90d' && { color: '#121212' }]}>90D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, period === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('all')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === 'all' && { color: '#121212' }]}>Sempre</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
              <TouchableOpacity style={[styles.periodBtn, forecastPeriod === 'none' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('none')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === 'none' && { color: '#121212' }]}>S/ Previsão</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, forecastPeriod === '30d' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('30d')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === '30d' && { color: '#121212' }]}>+30D (Futuro)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, forecastPeriod === '60d' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('60d')}>
                <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === '60d' && { color: '#121212' }]}>+60D</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.dateInputsRow}>
            <View style={styles.dateInputContainer}>
              <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Inicial</Text>
              <CustomDatePicker
                value={startDateObj}
                onChange={setStartDateObj}
                onClear={() => setStartDateObj(null)}
                theme={activeTheme}
                style={{ padding: 10 * getZoomFactor(activeTheme), paddingVertical: 10 * getZoomFactor(activeTheme) }}
              />
            </View>
            <View style={styles.dateInputContainer}>
              <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Final</Text>
              <CustomDatePicker
                value={endDateObj}
                onChange={setEndDateObj}
                onClear={() => setEndDateObj(null)}
                theme={activeTheme}
                style={{ padding: 10 * getZoomFactor(activeTheme), paddingVertical: 10 * getZoomFactor(activeTheme) }}
              />
            </View>
          </View>

          <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Categorias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScrollContent}>
            {uniqueCategories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.catBtn, { backgroundColor: activeTheme.cardSecondary }, selectedCats.includes(cat) && { backgroundColor: activeTheme.accent }]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[styles.catText, { color: activeTheme.textSecondary }, selectedCats.includes(cat) && { color: '#121212' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
