import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { RecurrenceRepository } from '../services/RecurrenceRepository';
import { useAnalytics } from '../hooks/useAnalytics';

// Import dos novos módulos
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';
import KPISummary from '../components/analytics/KPISummary';
import MonthlyEvolution from '../components/analytics/MonthlyEvolution';
import ExpenseComposition from '../components/analytics/ExpenseComposition';
import CashFlowLine from '../components/analytics/CashFlowLine';
import WeeklyHeatmap from '../components/analytics/WeeklyHeatmap';
import CategoryRanking from '../components/analytics/CategoryRanking';
import AccountAnalysis from '../components/analytics/AccountAnalysis';
import RecurrenceAnalysis from '../components/analytics/RecurrenceAnalysis';
import TopVillains from '../components/analytics/TopVillains';
import SmartInsights from '../components/analytics/SmartInsights';

export default function AnalyticsScreen() {
  const { 
    activeTheme, uiConfig, defaultPeriod, macroTargets 
  } = useContext(SettingsContext);

  const [filters, setFilters] = useState({
    period: defaultPeriod || '30d',
    forecastPeriod: 'none',
    type: 'expense',
    accountId: 'all',
    categoryId: 'all',
    isMacro: true
  });

  const [recurrences, setRecurrences] = useState([]);

  const { txList, loadTransactions } = useTransactions();
  const { categoryList, loadCategories } = useCategories();
  const { accountList, loadAccounts } = useAccounts();

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
      loadAccounts();
      RecurrenceRepository.getActive().then(setRecurrences);
    }, [loadTransactions, loadCategories, loadAccounts])
  );

  const analyticsData = useAnalytics({
    txList,
    categoryList,
    accountList,
    recurrences,
    macroTargets,
    activeTheme,
    filters
  });

  const disabledModules = uiConfig.analyticsDisabledModules || [];

  const renderModule = (moduleKey) => {
    if (disabledModules.includes(moduleKey)) return null;

    switch (moduleKey) {
      case 'kpis':
        return <KPISummary key="kpis" theme={activeTheme} data={analyticsData.kpis} />;
      case 'monthly':
        return <MonthlyEvolution key="monthly" theme={activeTheme} bars={analyticsData.monthlyBars} line={analyticsData.monthlyLine} initiallyExpanded={true} />;
      case 'composition':
        return <ExpenseComposition key="composition" theme={activeTheme} data={analyticsData.compositionData} totalExpense={analyticsData.kpis.totalExpense} isMacro={filters.isMacro} setIsMacro={(v) => setFilters(prev => ({ ...prev, isMacro: v }))} macroTargets={macroTargets} initiallyExpanded={true} />;
      case 'cashflow':
        return <CashFlowLine key="cashflow" theme={activeTheme} series={analyticsData.cashFlowSeries} initiallyExpanded={true} />;
      case 'heatmap':
        return <WeeklyHeatmap key="heatmap" theme={activeTheme} data={analyticsData.heatmapData} initiallyExpanded={true} />;
      case 'ranking':
        return <CategoryRanking key="ranking" theme={activeTheme} ranking={analyticsData.categoryRanking} initiallyExpanded={false} />;
      case 'accounts':
        return <AccountAnalysis key="accounts" theme={activeTheme} breakdown={analyticsData.accountBreakdown} initiallyExpanded={false} />;
      case 'recurrence':
        return <RecurrenceAnalysis key="recurrence" theme={activeTheme} stats={analyticsData.recurrenceStats} initiallyExpanded={true} />;
      case 'villains':
        return <TopVillains key="villains" theme={activeTheme} expenses={analyticsData.topExpenses} categoryList={categoryList} initiallyExpanded={false} />;
      case 'insights':
        return <SmartInsights key="insights" theme={activeTheme} insights={analyticsData.insights} initiallyExpanded={false} />;
      default:
        return null;
    }
  };

  const modulesOrder = uiConfig.analyticsModulesOrder || ['kpis', 'heatmap', 'composition', 'recurrence', 'monthly', 'cashflow', 'ranking', 'accounts', 'villains', 'insights'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <AnalyticsFilters 
        theme={activeTheme} 
        filters={filters} 
        setFilters={setFilters}
        accounts={accountList}
        categories={categoryList}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
      >
        {modulesOrder.map(renderModule)}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingTop: 20 },
});
