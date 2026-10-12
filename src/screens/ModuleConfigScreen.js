import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';

export default function ModuleConfigScreen({ onBack }) {
  const { activeTheme, uiConfig, saveSetting } = useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'analytics'

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);
  const z = getZoomFactor(activeTheme);
  const handleToggleUi = (key) => {
    const newConfig = { ...uiConfig, [key]: !uiConfig[key] };
    saveSetting('uiConfig', newConfig);
  };

  const handleToggleAnalyticsModule = (modKey) => {
    const disabled = uiConfig.analyticsDisabledModules || [];
    let newDisabled;
    if (disabled.includes(modKey)) {
       newDisabled = disabled.filter(k => k !== modKey);
    } else {
       newDisabled = [...disabled, modKey];
    }
    saveSetting('uiConfig', { ...uiConfig, analyticsDisabledModules: newDisabled });
  };

  const knownHomeModules = ['accounts', 'creditCards', 'pending', 'recent', 'debts', 'groups', 'budgets'];
  const homeOrderRaw = uiConfig.homeModulesOrder || ['accounts', 'creditCards', 'pending', 'recent'];
  let homeOrder = homeOrderRaw.filter(key => knownHomeModules.includes(key));
  if (!homeOrder.includes('debts')) homeOrder.push('debts');
  if (!homeOrder.includes('groups')) homeOrder.push('groups');
  if (!homeOrder.includes('budgets')) homeOrder.push('budgets');
  if (!homeOrder.includes('creditCards')) {
    const idx = homeOrder.indexOf('accounts');
    if (idx !== -1) homeOrder.splice(idx + 1, 0, 'creditCards');
    else homeOrder.push('creditCards');
  }
  const analyticsOrder = uiConfig.analyticsModulesOrder || ['kpis', 'heatmap', 'composition', 'recurrence', 'monthly', 'cashflow', 'ranking', 'accounts', 'villains', 'insights'];

  const moveModule = (index, direction) => {
    if (index + direction < 0 || index + direction >= homeOrder.length) return;
    const newOrder = [...homeOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    saveSetting('uiConfig', { ...uiConfig, homeModulesOrder: newOrder });
  };

  const moveAnalyticsModule = (index, direction) => {
    if (index + direction < 0 || index + direction >= analyticsOrder.length) return;
    const newOrder = [...analyticsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    saveSetting('uiConfig', { ...uiConfig, analyticsModulesOrder: newOrder });
  };
  
  const getModuleName = (key) => {
    if (key === 'accounts') return 'Suas Contas';
    if (key === 'creditCards') return 'Cartões de Crédito';
    if (key === 'pending') return 'Transações Pendentes';
    if (key === 'recent') return 'Últimas Transações';
    if (key === 'debts') return 'Controle de Dívidas';
    if (key === 'groups') return 'Grupos';
    if (key === 'budgets') return 'Limites por Macro';
    return key;
  };

  const getAnalyticsModuleName = (key) => {
    const map = {
      kpis: 'Resumo Financeiro (KPIs)',
      monthly: 'Evolução Mensal',
      composition: 'Composição de Gastos',
      cashflow: 'Fluxo de Caixa',
      heatmap: 'Heatmap Semanal',
      ranking: 'Ranking de Categorias',
      accounts: 'Análise por Conta',
      recurrence: 'Recorrências',
      villains: 'Top Vilões',
      insights: 'Insights Inteligentes'
    };
    return map[key] || key;
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Módulos</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: activeTheme.card, borderBottomWidth: 1, borderBottomColor: activeTheme.cardSecondary }}>
         {['home', 'analytics'].map(tab => (
            <TouchableOpacity 
               key={tab}
               style={{ flex: 1, paddingVertical: 12 * z, borderBottomWidth: activeTab === tab ? 2 : 0, borderBottomColor: activeTheme.accent, alignItems: 'center' }}
               onPress={() => setActiveTab(tab)}
            >
               <Text style={{ color: activeTab === tab ? activeTheme.text : activeTheme.textSecondary, fontWeight: 'bold', fontSize: 13 * z }}>
                 {tab === 'home' ? 'Tela Inicial' : 'Análise'}
               </Text>
            </TouchableOpacity>
         ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {activeTab === 'home' && (
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Visibilidade de Módulos</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Ligue ou desligue recursos inteiros do app.</Text>
          
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Geral] Aba Investimentos</Text>
            <Switch value={uiConfig.showInvestmentsTab} onValueChange={() => handleToggleUi('showInvestmentsTab')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Geral] Esconder Acertos de Dívidas nas Transações</Text>
            <Switch value={uiConfig.hideDebtSettlements !== false} onValueChange={(value) => saveSetting('uiConfig', { ...uiConfig, hideDebtSettlements: value })} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Pendências</Text>
            <Switch value={uiConfig.homeShowPending !== false} onValueChange={() => handleToggleUi('homeShowPending')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Contas</Text>
            <Switch value={uiConfig.homeShowAccounts !== false} onValueChange={() => handleToggleUi('homeShowAccounts')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Cartões</Text>
            <Switch value={uiConfig.homeShowCreditCards !== false} onValueChange={() => handleToggleUi('homeShowCreditCards')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Últimas Trans.</Text>
            <Switch value={uiConfig.homeShowRecent !== false} onValueChange={() => handleToggleUi('homeShowRecent')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Dívidas</Text>
            <Switch value={uiConfig.homeShowDebts !== false} onValueChange={() => handleToggleUi('homeShowDebts')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Grupos</Text>
            <Switch value={uiConfig.homeShowGroups !== false} onValueChange={() => handleToggleUi('homeShowGroups')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Limites por Macro</Text>
            <Switch value={uiConfig.homeShowBudgets !== false} onValueChange={() => handleToggleUi('homeShowBudgets')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>

          <Text style={[styles.sectionTitle, { color: activeTheme.text, marginTop: 24 * z }]}>Ordem na Tela Inicial</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Mova para cima ou para baixo para reordenar.</Text>
          <View style={{ marginTop: 8 * z }}>
            {homeOrder.map((modKey, idx) => (
              <View key={modKey} style={[styles.orderRow, { backgroundColor: activeTheme.cardSecondary }]}>
                <Text style={[styles.orderLabel, { color: activeTheme.text }]}>{getModuleName(modKey)}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity 
                    style={[styles.orderBtn, idx === 0 && { opacity: 0.3 }]} 
                    onPress={() => moveModule(idx, -1)} 
                    disabled={idx === 0}
                  >
                    <Ionicons name="chevron-up" size={24} color={activeTheme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.orderBtn, idx === homeOrder.length - 1 && { opacity: 0.3 }]} 
                    onPress={() => moveModule(idx, 1)} 
                    disabled={idx === homeOrder.length - 1}
                  >
                    <Ionicons name="chevron-down" size={24} color={activeTheme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
        )}

        {activeTab === 'analytics' && (
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Módulos de Análise</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Ligue ou desligue módulos da tela de gráficos.</Text>
          
          {['kpis', 'heatmap', 'composition', 'recurrence', 'monthly', 'cashflow', 'ranking', 'accounts', 'villains', 'insights'].map(modKey => (
             <View key={modKey} style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
               <Text style={[styles.switchLabel, { color: activeTheme.text }]}>{getAnalyticsModuleName(modKey)}</Text>
               <Switch 
                 value={!(uiConfig.analyticsDisabledModules || []).includes(modKey)} 
                 onValueChange={() => handleToggleAnalyticsModule(modKey)} 
                 trackColor={{ false: '#333', true: activeTheme.accent }} 
               />
             </View>
          ))}

          <Text style={[styles.sectionTitle, { color: activeTheme.text, marginTop: 24 * z }]}>Ordem na Tela de Análise</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Mova para cima ou para baixo para reordenar os módulos ativados.</Text>
          <View style={{ marginTop: 8 * z, marginBottom: 16 * z }}>
            {analyticsOrder.map((modKey, idx) => {
              const isDisabled = (uiConfig.analyticsDisabledModules || []).includes(modKey);
              if (isDisabled) return null;
              return (
              <View key={modKey} style={[styles.orderRow, { backgroundColor: activeTheme.cardSecondary }]}>
                <Text style={[styles.orderLabel, { color: activeTheme.text }]}>{getAnalyticsModuleName(modKey)}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity 
                    style={[styles.orderBtn, idx === 0 && { opacity: 0.3 }]} 
                    onPress={() => moveAnalyticsModule(idx, -1)} 
                    disabled={idx === 0}
                  >
                    <Ionicons name="chevron-up" size={24} color={activeTheme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.orderBtn, idx === analyticsOrder.length - 1 && { opacity: 0.3 }]} 
                    onPress={() => moveAnalyticsModule(idx, 1)} 
                    disabled={idx === analyticsOrder.length - 1}
                  >
                    <Ionicons name="chevron-down" size={24} color={activeTheme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )})}
          </View>
        </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>


    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    section: { borderRadius: 6 * z, padding: 20 * z, marginBottom: 20 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    sectionDesc: { fontSize: 14 * z, marginTop: 4 * z, marginBottom: 16 * z, fontFamily: f },
    
    orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 * z, borderRadius: 6 * z, marginBottom: 8 * z },
    orderLabel: { fontSize: 16 * z, fontFamily: f, fontWeight: 'bold' },
    orderBtn: { padding: 4 * z, marginLeft: 8 * z },
  });
};
