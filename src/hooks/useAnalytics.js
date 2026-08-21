import { useMemo } from 'react';
import { resolveCategory } from '../services/categorizer';
import { DateUtils } from '../utils/dateUtils';
import { RecurrenceGenerator } from '../services/RecurrenceGenerator';

const COLORS_PALETTE = ['#F44336', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548'];

export const useAnalytics = ({ 
  txList, 
  categoryList, 
  accountList, 
  recurrences,
  macroTargets,
  activeTheme,
  filters // { period, forecastPeriod, type, accountId, categoryId, isMacro }
}) => {
  return useMemo(() => {
    const { period, forecastPeriod, type, accountId, categoryId, isMacro } = filters;

    // 1. Preparação de Dados e Previsão
    let data = [...txList];

    if (forecastPeriod !== 'none') {
      const days = forecastPeriod === '30d' ? 30 : 60;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + days);
      maxDate.setHours(23, 59, 59, 999);

      const virtualTxs = RecurrenceGenerator.generateVirtualTransactions(
        recurrences,
        txList,
        maxDate.getTime()
      );

      const virtualsToInclude = virtualTxs.filter(v => v.date > Date.now());
      data = [...data, ...virtualsToInclude];
    }

    // 2. Filtros Globais (Período, Conta, Categoria, Tipo)
    const limitDate = DateUtils.getLimitDateForPeriod(period);
    
    // Filtrar dados básicos
    let filteredData = data.filter(t => t.date >= limitDate);
    
    // Filtro de Conta
    if (accountId && accountId !== 'all') {
      filteredData = filteredData.filter(t => t.accountId === accountId);
    }

    // Filtro de Categoria
    if (categoryId && categoryId !== 'all') {
       filteredData = filteredData.filter(t => {
         const catInfo = resolveCategory(t, categoryList);
         return catInfo.id === categoryId;
       });
    }

    // Filtro de Tipo (Income/Expense)
    const kpiFilteredData = [...filteredData]; // Copia sem filtro de tipo para os KPIs e gráficos globais
    
    if (type === 'income') {
      filteredData = filteredData.filter(t => t.type === 'income');
    } else if (type === 'expense') {
      filteredData = filteredData.filter(t => t.type === 'expense');
    }

    // Para calcular os Totais (usado nos KPIs e contas, independentemente do filtro de tipo)
    const allExpenses = kpiFilteredData.filter(t => t.type === 'expense');
    const allIncomes = kpiFilteredData.filter(t => t.type === 'income');

    const totalExpense = allExpenses.reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = allIncomes.reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // --- KPIs ---
    let daysInPeriod = 30;
    if (period === '7d') daysInPeriod = 7;
    else if (period === '90d') daysInPeriod = 90;
    else if (period === 'all') {
        const oldestTx = [...data].sort((a,b) => a.date - b.date)[0];
        if (oldestTx) {
             const diff = Date.now() - oldestTx.date;
             daysInPeriod = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }
    }
    const dailyAverage = totalExpense / daysInPeriod;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const biggestExpense = [...allExpenses].sort((a,b) => b.amount - a.amount)[0] || null;

    const kpis = {
      totalExpense,
      totalIncome,
      netBalance,
      dailyAverage,
      savingsRate,
      biggestExpense,
      biggestExpense,
      txCount: kpiFilteredData.length
    };

    // --- Evolução Mensal ---
    let startOffset = 5;
    let endOffset = 0;
    if (forecastPeriod === '30d') {
      startOffset = 4;
      endOffset = -1;
    } else if (forecastPeriod === '60d') {
      startOffset = 3;
      endOffset = -2;
    }

    const visibleMonths = {};
    for (let i = startOffset; i >= endOffset; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let label = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
      if (i < 0) label += '*';
      visibleMonths[key] = { label, income: 0, expense: 0, balance: 0 };
    }
    
    let barDataRaw = data;
    if (accountId && accountId !== 'all') barDataRaw = barDataRaw.filter(t => t.accountId === accountId);
    
    barDataRaw.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (visibleMonths[key]) {
        if (tx.type === 'income') visibleMonths[key].income += tx.amount;
        if (tx.type === 'expense') visibleMonths[key].expense += tx.amount;
        visibleMonths[key].balance = visibleMonths[key].income - visibleMonths[key].expense;
      }
    });

    const monthlyBars = [];
    const monthlyLine = [];
    Object.values(visibleMonths).forEach((item, index) => {
      monthlyBars.push({ 
        value: item.income, 
        frontColor: activeTheme.income, 
        label: item.label, 
        spacing: 2, 
        labelTextStyle: { color: activeTheme.textSecondary, fontSize: 10 },
        isIncome: true,
        dataPointText: `+${Math.round(item.income)}`
      });
      monthlyBars.push({ 
        value: item.expense, 
        frontColor: activeTheme.expense,
        isExpense: true,
        dataPointText: `-${Math.round(item.expense)}`
      });
      
      monthlyLine.push({
          value: item.balance,
          dataPointText: `${Math.round(item.balance)}`
      });
    });

    // --- Composição de Gastos (Donut) ---
    const grouped = {};
    if (isMacro) {
      const allMacros = new Set(Object.keys(macroTargets));
      categoryList.forEach(c => c.macro && allMacros.add(c.macro));
      
      allMacros.forEach(key => {
        grouped[key] = { name: key, total: 0, color: activeTheme.cardSecondary, txCount: 0, txList: [] };
      });
      grouped['Outros'] = { name: 'Outros', total: 0, color: activeTheme.textSecondary, txCount: 0, txList: [] };
    }

    filteredData.forEach(tx => {
      const catInfo = resolveCategory(tx, categoryList);
      let finalCatName = catInfo.categoryName;
      let finalColor = catInfo.color;
      let finalIcon = catInfo.icon;
      
      if (isMacro) {
        finalCatName = catInfo.macro || 'Outros';
      }

      if (!grouped[finalCatName]) {
        grouped[finalCatName] = { 
          name: finalCatName, 
          total: 0, 
          color: finalColor,
          icon: finalIcon,
          txCount: 0,
          txList: []
        };
      }
      grouped[finalCatName].total += tx.amount;
      grouped[finalCatName].txCount += 1;
      grouped[finalCatName].txList.push(tx);
      if (!isMacro) grouped[finalCatName].color = catInfo.color;
    });

    const sortedComposition = Object.values(grouped)
        .filter(i => i.total > 0 || (isMacro && i.name !== 'Outros'))
        .sort((a, b) => b.total - a.total);
    
    if (isMacro) {
      sortedComposition.forEach((item, idx) => {
        if (item.name === 'Outros') item.color = activeTheme.textSecondary;
        else item.color = COLORS_PALETTE[idx % COLORS_PALETTE.length] || activeTheme.textSecondary;
      });
    }

    // --- Categoria Ranking ---
    const rankingGrouped = {};
    filteredData.forEach(tx => {
      const catInfo = resolveCategory(tx, categoryList);
      if (!rankingGrouped[catInfo.categoryName]) {
         rankingGrouped[catInfo.categoryName] = {
             name: catInfo.categoryName,
             total: 0,
             color: catInfo.color,
             icon: catInfo.icon,
             txCount: 0,
             avg: 0
         };
      }
      rankingGrouped[catInfo.categoryName].total += tx.amount;
      rankingGrouped[catInfo.categoryName].txCount += 1;
    });
    const categoryRanking = Object.values(rankingGrouped).map(item => {
        item.avg = item.total / item.txCount;
        return item;
    }).sort((a,b) => b.total - a.total);


    // --- Fluxo de Caixa (Linha) ---
    let flowBalance = 0;
    const sortedFiltered = [...kpiFilteredData].sort((a,b) => a.date - b.date);
    
    const cashFlowSeries = [];
    let lastDateStr = null;
    sortedFiltered.forEach(tx => {
        flowBalance += (tx.type === 'income' ? tx.amount : -tx.amount);
        const d = new Date(tx.date);
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        
        if (dateStr !== lastDateStr) {
            cashFlowSeries.push({
                value: flowBalance,
                label: dateStr,
                dataPointText: `${Math.round(flowBalance)}`
            });
            lastDateStr = dateStr;
        } else {
            if (cashFlowSeries.length > 0) {
               cashFlowSeries[cashFlowSeries.length-1].value = flowBalance;
               cashFlowSeries[cashFlowSeries.length-1].dataPointText = `${Math.round(flowBalance)}`;
            }
        }
    });

    // --- Heatmap Semanal ---
    const heatmapData = [];
    const today = new Date();
    today.setHours(23,59,59,999);
    const heatmapDays = period === '7d' ? 7 : (period === '30d' ? 35 : 84);
    
    const heatmapStartDate = new Date(today);
    heatmapStartDate.setDate(heatmapStartDate.getDate() - heatmapDays);
    
    const dayMap = {};
    for (let i = 0; i <= heatmapDays; i++) {
       const d = new Date(heatmapStartDate);
       d.setDate(d.getDate() + i);
       d.setHours(0,0,0,0);
       dayMap[d.getTime()] = { date: d.getTime(), total: 0, txList: [] };
    }
    
    filteredData.filter(t => t.date >= heatmapStartDate.getTime() && t.type === 'expense').forEach(tx => {
       const d = new Date(tx.date);
       d.setHours(0,0,0,0);
       if (dayMap[d.getTime()]) {
           dayMap[d.getTime()].total += tx.amount;
           dayMap[d.getTime()].txList.push(tx);
       }
    });
    Object.values(dayMap).sort((a,b) => a.date - b.date).forEach(day => {
        day.txList.sort((a,b) => b.amount - a.amount);
        heatmapData.push(day);
    });

    // --- Análise de Contas ---
    const accountBreakdown = [];
    accountList.forEach(acc => {
       const txs = kpiFilteredData.filter(t => t.accountId === acc.id);
       const accIn = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
       const accOut = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
       accountBreakdown.push({
           ...acc,
           periodIncome: accIn,
           periodExpense: accOut,
           periodBalance: accIn - accOut
       });
    });

    // --- Recorrências ---
    const activeRecurrences = recurrences.filter(r => r.isActive === 1);
    const recMonthlyExpense = activeRecurrences.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);
    const recurrenceStats = {
        totalMonthly: recMonthlyExpense,
        list: activeRecurrences
    };

    // --- Top Vilões ---
    const topExpenses = [...filteredData].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount);

    // --- Insights Inteligentes ---
    const insights = [];
    if (savingsRate > 20) {
        insights.push({ type: 'positive', text: `Excelente taxa de poupança! Você não gastou ${savingsRate.toFixed(1)}% das suas receitas.`, icon: 'trending-up' });
    } else if (savingsRate < 0) {
        insights.push({ type: 'negative', text: `Atenção: Você gastou R$ ${Math.abs(netBalance).toFixed(2)} a mais do que ganhou neste período.`, icon: 'warning' });
    }
    
    if (biggestExpense) {
        const pctOfTotal = (biggestExpense.amount / totalExpense) * 100;
        if (pctOfTotal > 30) {
            insights.push({ type: 'warning', text: `Uma única despesa (${biggestExpense.description}) representa ${pctOfTotal.toFixed(1)}% dos seus gastos.`, icon: 'alert-circle' });
        }
    }

    if (recMonthlyExpense > (totalIncome * 0.5) && totalIncome > 0) {
       insights.push({ type: 'negative', text: 'Suas despesas recorrentes consomem mais de 50% da sua receita.', icon: 'repeat' });
    }

    return {
      kpis,
      monthlyBars,
      monthlyLine,
      compositionData: sortedComposition,
      cashFlowSeries,
      heatmapData,
      categoryRanking,
      accountBreakdown,
      recurrenceStats,
      topExpenses,
      insights
    };
  }, [txList, categoryList, accountList, recurrences, macroTargets, activeTheme, filters]);
};
