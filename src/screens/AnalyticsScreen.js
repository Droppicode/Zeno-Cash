import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { resolveCategory } from '../services/categorizer';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { DateUtils } from '../utils/dateUtils';

const COLORS_PALETTE = ['#F44336', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548'];

export default function AnalyticsScreen() {
  const { 
    activeTheme, uiConfig, defaultPeriod, 
    macroTargets 
  } = React.useContext(SettingsContext);

  const [isMacro, setIsMacro] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod || '30d');

  const { txList, loadTransactions } = useTransactions();
  const { categoryList, loadCategories } = useCategories();

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
    }, [loadTransactions, loadCategories])
  );

  const { analyticsData, totalExpense, totalIncome, topExpenses, monthlyData } = useMemo(() => {
      const data = txList;
      
      const limitDate = DateUtils.getLimitDateForPeriod(period);

      const last6Months = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
        last6Months[key] = { label, income: 0, expense: 0 };
      }
      
      data.forEach(tx => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (last6Months[key]) {
          if (tx.type === 'income') last6Months[key].income += tx.amount;
          if (tx.type === 'expense') last6Months[key].expense += tx.amount;
        }
      });
      
      const barData = [];
      Object.values(last6Months).forEach(item => {
        barData.push({ 
          value: item.income, 
          frontColor: activeTheme.income, 
          label: item.label, 
          spacing: 2, 
          labelTextStyle: { color: activeTheme.textSecondary, fontSize: 10 } 
        });
        barData.push({ value: item.expense, frontColor: activeTheme.expense });
      });

      const expenses = data.filter(t => t.type === 'expense' && t.date >= limitDate);
      const incomes = data.filter(t => t.type === 'income' && t.date >= limitDate);
      
      const sumIncome = incomes.reduce((acc, t) => acc + t.amount, 0);

      const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
      
      let sum = 0;
      const grouped = {};

      if (isMacro) {
        const allMacros = new Set(Object.keys(macroTargets));
        categoryList.forEach(c => c.macro && allMacros.add(c.macro));
        
        allMacros.forEach(key => {
          grouped[key] = { name: key, total: 0, color: activeTheme.cardSecondary };
        });
        grouped['Outros'] = { name: 'Outros', total: 0, color: activeTheme.textSecondary };
      }

      expenses.forEach(tx => {
        sum += tx.amount;
        const catInfo = resolveCategory(tx, categoryList);
        let finalCatName = catInfo.categoryName;
        let finalColor = catInfo.color;
        
        if (isMacro) {
          finalCatName = catInfo.macro || 'Outros';
        }

        if (!grouped[finalCatName]) {
          grouped[finalCatName] = { name: finalCatName, total: 0, color: finalColor };
        }
        grouped[finalCatName].total += tx.amount;
        if (!isMacro) grouped[finalCatName].color = catInfo.color;
      });

      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      
      if (isMacro) {
        sorted.forEach((item, idx) => {
          if (item.name === 'Outros') item.color = activeTheme.textSecondary;
          else item.color = COLORS_PALETTE[idx % COLORS_PALETTE.length] || activeTheme.textSecondary;
        });
      }

      return {
        analyticsData: sorted,
        totalExpense: sum,
        totalIncome: sumIncome,
        topExpenses: top3,
        monthlyData: barData
      };
  }, [txList, period, isMacro, macroTargets, activeTheme, categoryList]);

  const pieData = analyticsData.filter(i => i.total > 0).map(item => ({
    value: item.total,
    color: item.color,
    text: totalExpense > 0 ? `${((item.total / totalExpense) * 100).toFixed(0)}%` : '0%'
  }));

  const z = 0.8 * (activeTheme.zoom || 1);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.card }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: 'transparent', backgroundColor: activeTheme.card }]}>
        <Text style={[styles.title, { color: activeTheme.text }]}>Análise Avançada</Text>
        <View style={styles.periodRow}>
          <TouchableOpacity style={[styles.periodBtn, { backgroundColor: activeTheme.cardSecondary }, period === '30d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('30d')}>
            <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '30d' && { color: '#121212' }]}>30 Dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.periodBtn, { backgroundColor: activeTheme.cardSecondary }, period === '90d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('90d')}>
            <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '90d' && { color: '#121212' }]}>90 Dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.periodBtn, { backgroundColor: activeTheme.cardSecondary }, period === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('all')}>
            <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === 'all' && { color: '#121212' }]}>Sempre</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: activeTheme.background }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Gráfico 1: Barras 6 Meses */}
        {uiConfig.analyticsShowCharts !== false && (
          <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Evolução de 6 Meses</Text>
            <Text style={[styles.cardSubtitle, { color: activeTheme.textSecondary }]}>Receitas vs Despesas</Text>
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              {monthlyData.length > 0 ? (
                <BarChart
                  data={monthlyData}
                  barWidth={12}
                  spacing={16}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: activeTheme.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  barBorderRadius={6}
                  frontColor="lightgray"
                  height={150 * z}
                />
              ) : <Text style={[styles.emptyText, { color: activeTheme.textSecondary }]}>Carregando...</Text>}
            </View>
          </View>
        )}

        {/* Resumo Financeiro */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Text style={[styles.subtitle, { color: activeTheme.textSecondary }]}>Gasto Total no Período Selecionado</Text>
          <Text style={[styles.totalValue, { color: activeTheme.expense }]}>R$ {totalExpense.toFixed(2)}</Text>
        </View>

        {/* Gráfico 2: Composição (Donut) */}
        <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Composição</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setIsMacro(!isMacro)}>
                <Text style={[styles.toggleText, { color: activeTheme.accent }]}>{isMacro ? 'Ver Detalhado' : 'Agrupar Macro'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {isMacro && (
            <Text style={[styles.cardSubtitle, { color: activeTheme.textSecondary }]}>Baseado nas suas metas de orçamento (%)</Text>
          )}

          {uiConfig.analyticsShowCharts !== false && (
            pieData.length === 0 ? (
              <Text style={[styles.emptyText, { color: activeTheme.textSecondary }]}>Sem despesas neste período.</Text>
            ) : (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <PieChart
                  donut
                  data={pieData}
                  innerRadius={60 * z}
                  radius={90 * z}
                  textColor="white"
                  textSize={12 * z}
                  showTextBackground
                  textBackgroundRadius={14 * z}
                />
              </View>
            )
          )}

          {analyticsData.map((item, index) => {
            if (item.total === 0 && item.name === 'Outros') return null; 
            
            const actualPercent = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
            const targetPercent = macroTargets[item.name] || 0;
            const diffPercent = actualPercent - targetPercent;
            
            let statusColor = activeTheme.textSecondary;
            let statusText = '';
            
            if (isMacro && targetPercent > 0 && item.name !== 'Outros') {
              if (item.name.toLowerCase().includes('invest')) {
                if (actualPercent >= targetPercent) {
                  statusColor = activeTheme.income;
                  statusText = `Meta atingida! (+${diffPercent.toFixed(1)}%)`;
                } else {
                  statusColor = activeTheme.expense;
                  statusText = `Abaixo da meta (${Math.abs(diffPercent).toFixed(1)}% faltando)`;
                }
              } else {
                if (actualPercent <= targetPercent) {
                  statusColor = activeTheme.income;
                  statusText = `Dentro da meta (${Math.abs(diffPercent).toFixed(1)}% de sobra)`;
                } else {
                  statusColor = activeTheme.expense;
                  statusText = `Acima do limite (+${diffPercent.toFixed(1)}%)`;
                }
              }
            }

            return (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.catHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.catName, { color: activeTheme.text }]}>{item.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.catAmount, { color: activeTheme.text }]}>R$ {item.total.toFixed(2)}</Text>
                    <Text style={[styles.catPercent, { color: activeTheme.textSecondary }]}>
                      {isMacro && item.name !== 'Outros' ? `${actualPercent.toFixed(1)}% (Meta: ${targetPercent}%)` : `${actualPercent.toFixed(1)}%`}
                    </Text>
                  </View>
                </View>
                
                {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: 'bold' }}>{statusText}</Text>
                  </View>
                )}

                <View style={[styles.progressBarBg, { backgroundColor: activeTheme.cardSecondary }]}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(actualPercent, 100)}%`, backgroundColor: item.color }]} />
                  {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
                    <View style={[styles.targetMarker, { left: `${Math.min(targetPercent, 100)}%` }]} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Top 3 Vilões */}
        {uiConfig.analyticsShowVilao !== false && (
          <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Top 3 Vilões</Text>
            <Text style={[styles.cardSubtitle, { color: activeTheme.textSecondary }]}>As maiores despesas isoladas do período</Text>
            
            <View style={{ marginTop: 16 }}>
              {topExpenses.length === 0 ? (
                <Text style={[styles.emptyText, { color: activeTheme.textSecondary }]}>Nenhuma transação encontrada.</Text>
              ) : (
                topExpenses.map((item, idx) => {
                  const catInfo = resolveCategory(item, categoryList);
                  return (
                    <View key={item.id} style={[styles.vilaoCard, { backgroundColor: activeTheme.cardSecondary }]}>
                      <Text style={[styles.vilaoRank, { color: activeTheme.accent }]}>#{idx + 1}</Text>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.vilaoDesc, { color: activeTheme.text }]}>{item.description}</Text>
                        <Text style={[styles.vilaoCat, { color: activeTheme.textSecondary }]}>{catInfo.categoryName}</Text>
                      </View>
                      <Text style={[styles.vilaoAmount, { color: activeTheme.expense }]}>- R$ {item.amount.toFixed(2)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 * z, borderBottomWidth: 1 },
  title: { fontSize: 24 * z, fontWeight: 'bold', marginBottom: 16 * z, marginTop: 16 * z, fontFamily: f },
  periodRow: { flexDirection: 'row', gap: 8 * z },
  periodBtn: { flex: 1, paddingVertical: 8 * z, alignItems: 'center', borderRadius: 8 * z },
  periodText: { fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
  scroll: { padding: 16 * z },
  subtitle: { fontSize: 14 * z, textAlign: 'center', fontFamily: f },
  totalValue: { fontSize: 36 * z, fontWeight: 'bold', textAlign: 'center', marginTop: 4 * z, fontFamily: f },
  
  card: { borderRadius: 16 * z, padding: 20 * z, marginBottom: 20 * z },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
  cardSubtitle: { fontSize: 12 * z, marginTop: 4 * z, fontFamily: f },
  
  toggleBtn: { paddingHorizontal: 12 * z, paddingVertical: 6 * z, borderRadius: 12 * z },
  toggleText: { fontSize: 12 * z, fontWeight: 'bold', fontFamily: f },
  
  categoryRow: { marginBottom: 16 * z },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 * z },
  colorDot: { width: 12 * z, height: 12 * z, borderRadius: 6 * z, marginRight: 8 * z },
  catName: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
  catAmount: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
  catPercent: { fontSize: 12 * z, fontFamily: f },
  
  progressBarBg: { height: 8 * z, borderRadius: 4 * z, overflow: 'hidden', position: 'relative' },
  progressBarFill: { height: '100%', borderRadius: 4 * z },
  targetMarker: { position: 'absolute', top: 0, bottom: 0, width: 2 * z, backgroundColor: '#fff', zIndex: 10 },
  
  vilaoCard: { flexDirection: 'row', alignItems: 'center', padding: 12 * z, borderRadius: 12 * z, marginBottom: 8 * z },
  vilaoRank: { fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
  vilaoDesc: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
  vilaoCat: { fontSize: 12 * z, fontFamily: f },
  vilaoAmount: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
  
  emptyText: { textAlign: 'center', padding: 20 * z, fontFamily: f, fontSize: 14 * z }
});
