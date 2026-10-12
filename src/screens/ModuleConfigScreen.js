import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { SettingsContext } from '../context/SettingsContext';
import ListCard from '../components/ui/ListCard';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import {
  ANALYTICS_MODULES,
  DEFAULT_ANALYTICS_ORDER,
  DEFAULT_HOME_ORDER,
  HOME_MODULES,
  resolveAnalyticsOrder,
  resolveHomeOrder
} from '../utils/ModuleOrder';

const TABS = [
  { key: 'home', label: 'Tela Inicial' },
  { key: 'analytics', label: 'Análise' },
  { key: 'general', label: 'Geral' },
];

export default function ModuleConfigScreen({ onBack }) {
  const { activeTheme, uiConfig, saveSetting } = useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState('home');
  const scrollableRef = useAnimatedRef();

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);
  const z = getZoomFactor(activeTheme);

  const disabledAnalytics = uiConfig.analyticsDisabledModules || [];
  const modules = activeTab === 'home'
    ? resolveHomeOrder(uiConfig.homeModulesOrder).map(key => {
      const mod = HOME_MODULES.find(m => m.key === key);
      return { ...mod, enabled: uiConfig[mod.toggle] !== false };
    })
    : resolveAnalyticsOrder(uiConfig.analyticsModulesOrder).map(key => {
      const mod = ANALYTICS_MODULES.find(m => m.key === key);
      return { ...mod, enabled: !disabledAnalytics.includes(key) };
    });
  const orderKey = activeTab === 'home' ? 'homeModulesOrder' : 'analyticsModulesOrder';
  const defaultOrder = activeTab === 'home' ? DEFAULT_HOME_ORDER : DEFAULT_ANALYTICS_ORDER;
  const isDefaultOrder = modules.every((mod, idx) => mod.key === defaultOrder[idx]);

  const toggleModule = (mod, value) => {
    if (activeTab === 'home') {
      saveSetting('uiConfig', { ...uiConfig, [mod.toggle]: value });
      return;
    }
    const others = disabledAnalytics.filter(key => key !== mod.key);
    saveSetting('uiConfig', { ...uiConfig, analyticsDisabledModules: value ? others : [...others, mod.key] });
  };

  const saveOrder = order => saveSetting('uiConfig', { ...uiConfig, [orderKey]: order });

  const renderModule = ({ item: mod, index }) => (
    <ListCard index={index} total={modules.length}>
      <Ionicons name="reorder-two" size={22 * z} color={activeTheme.textSecondary} />
      <View style={[styles.iconBox, { backgroundColor: `${activeTheme.accent}22`, opacity: mod.enabled ? 1 : 0.4 }]}>
        <Ionicons name={mod.icon} size={18 * z} color={activeTheme.accent} />
      </View>
      <Text
        style={[styles.moduleLabel, { color: mod.enabled ? activeTheme.text : activeTheme.textSecondary }]}
        numberOfLines={1}
      >
        {mod.label}
      </Text>
      <Switch
        testID={`module-toggle-${mod.key}`}
        value={mod.enabled}
        onValueChange={value => toggleModule(mod, value)}
        trackColor={{ false: '#333', true: activeTheme.accent }}
      />
    </ListCard>
  );

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
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={{ flex: 1, paddingVertical: 12 * z, borderBottomWidth: activeTab === tab.key ? 2 : 0, borderBottomColor: activeTheme.accent, alignItems: 'center' }}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={{ color: activeTab === tab.key ? activeTheme.text : activeTheme.textSecondary, fontWeight: 'bold', fontSize: 13 * z }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView ref={scrollableRef} contentContainerStyle={styles.scroll}>
        {activeTab === 'general' ? (
          <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
            <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
              <View style={styles.generalText}>
                <Text style={[styles.switchLabel, { color: activeTheme.text }]}>Aba Investimentos</Text>
                <Text style={[styles.hint, { color: activeTheme.textSecondary }]}>Mostra a aba de investimentos na barra inferior.</Text>
              </View>
              <Switch value={!!uiConfig.showInvestmentsTab} onValueChange={value => saveSetting('uiConfig', { ...uiConfig, showInvestmentsTab: value })} trackColor={{ false: '#333', true: activeTheme.accent }} />
            </View>
            <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
              <View style={styles.generalText}>
                <Text style={[styles.switchLabel, { color: activeTheme.text }]}>Esconder acertos de dívidas</Text>
                <Text style={[styles.hint, { color: activeTheme.textSecondary }]}>Oculta as transações de acerto na lista de Transações.</Text>
              </View>
              <Switch value={uiConfig.hideDebtSettlements !== false} onValueChange={value => saveSetting('uiConfig', { ...uiConfig, hideDebtSettlements: value })} trackColor={{ false: '#333', true: activeTheme.accent }} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Text style={[styles.hint, { color: activeTheme.textSecondary, flex: 1 }]}>
                Segure e arraste para reordenar. A chave mostra ou esconde o módulo.
              </Text>
              {!isDefaultOrder && (
                <TouchableOpacity testID="modules-reset-order" onPress={() => saveOrder(defaultOrder)} style={styles.resetBtn}>
                  <Ionicons name="refresh" size={14 * z} color={activeTheme.accent} />
                  <Text style={[styles.resetText, { color: activeTheme.accent }]}>Padrão</Text>
                </TouchableOpacity>
              )}
            </View>
            <Sortable.Grid
              key={activeTab}
              columns={1}
              data={modules}
              keyExtractor={mod => mod.key}
              scrollableRef={scrollableRef}
              activeItemScale={1.04}
              dragActivationDelay={150}
              onDragEnd={({ data }) => saveOrder(data.map(mod => mod.key))}
              renderItem={renderModule}
            />
          </>
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
    section: { borderRadius: 6 * z, paddingHorizontal: 16 * z, paddingVertical: 4 * z },
    generalText: { flex: 1, marginRight: 12 * z },
    hint: { fontSize: 12 * z, fontFamily: f, marginTop: 2 * z },
    hintRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 * z },
    resetBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 * z, paddingVertical: 4 * z },
    resetText: { fontSize: 12 * z, fontFamily: f, fontWeight: 'bold', marginLeft: 4 * z },
    iconBox: { width: 32 * z, height: 32 * z, borderRadius: 6 * z, alignItems: 'center', justifyContent: 'center', marginLeft: 10 * z },
    moduleLabel: { flex: 1, fontSize: 15 * z, fontFamily: f, fontWeight: 'bold', marginLeft: 12 * z, marginRight: 8 * z },
  });
};
