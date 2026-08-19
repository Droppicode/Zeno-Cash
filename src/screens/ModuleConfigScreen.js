import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import BaseModal from '../components/ui/BaseModal';

const COLORS_PALETTE = ['#F44336', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548'];

const MacroRow = ({ macro, target, onUpdateName, onUpdateTarget, onRemove, theme }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(macro);

  const styles = useMemo(() => ({ ...getSharedStyles(theme), ...getLocalStyles(theme) }), [theme]);

  const handleSaveName = () => {
    if (tempName.trim() === '') {
      setTempName(macro);
      setIsEditing(false);
      return;
    }
    onUpdateName(macro, tempName.trim());
    setIsEditing(false);
  };

  return (
    <View style={[styles.goalInputRow, { backgroundColor: theme.cardSecondary }]}>
      {isEditing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TextInput 
            style={[styles.goalInput, { flex: 1, textAlign: 'left', backgroundColor: theme.card, color: theme.text }]} 
            value={tempName} 
            onChangeText={setTempName} 
            autoFocus 
          />
          <TouchableOpacity onPress={handleSaveName} style={{ marginLeft: 8 }}>
            <Ionicons name="checkmark-circle" size={24} color={theme.income} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 4, marginRight: 4 }}>
            <Ionicons name="pencil" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.goalLabel, { color: theme.text }]} numberOfLines={1}>{macro}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
        <TextInput
          style={[styles.goalInput, { backgroundColor: theme.card, color: theme.text }]}
          keyboardType="numeric"
          value={String(target)}
          onChangeText={(val) => onUpdateTarget(macro, val)}
        />
        <Text style={{ color: theme.text, marginLeft: 8 }}>%</Text>
        
        <TouchableOpacity onPress={() => onRemove(macro)} style={{ marginLeft: 16, padding: 4 }}>
          <Ionicons name="trash-outline" size={20} color={theme.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ModuleConfigScreen({ onBack }) {
  const { 
    activeTheme, uiConfig, saveSetting,
    macroTargets, macroMapping, macroOptions 
  } = useContext(SettingsContext);

  const [newMacroName, setNewMacroName] = useState('');
  const [showMappingModal, setShowMappingModal] = useState(false);

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);
  const z = getZoomFactor(activeTheme);

  const handleToggleUi = (key) => {
    const newConfig = { ...uiConfig, [key]: !uiConfig[key] };
    saveSetting('uiConfig', newConfig);
  };

  const homeOrderRaw = uiConfig.homeModulesOrder || ['accounts', 'pending', 'recent'];
  const homeOrder = homeOrderRaw.includes('debts') ? homeOrderRaw : [...homeOrderRaw, 'debts'];

  const moveModule = (index, direction) => {
    if (index + direction < 0 || index + direction >= homeOrder.length) return;
    const newOrder = [...homeOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    saveSetting('uiConfig', { ...uiConfig, homeModulesOrder: newOrder });
  };
  
  const getModuleName = (key) => {
    if (key === 'accounts') return 'Suas Contas';
    if (key === 'pending') return 'Transações Pendentes';
    if (key === 'recent') return 'Últimas Transações';
    if (key === 'debts') return 'Controle de Dívidas';
    return key;
  };

  // Mutações de Macros Dinâmicos (agora salvam no Contexto/DB)
  const updateMacroName = (oldName, newName) => {
    if (oldName === newName) return;
    if (macroOptions.includes(newName)) return;
    
    const newOptions = macroOptions.map(m => m === oldName ? newName : m);
    saveSetting('macroOptions', newOptions);
    
    const newTargets = { ...macroTargets };
    newTargets[newName] = newTargets[oldName];
    delete newTargets[oldName];
    saveSetting('macroTargets', newTargets);

    const newMapping = { ...macroMapping };
    Object.keys(newMapping).forEach(micro => {
      if (newMapping[micro] === oldName) newMapping[micro] = newName;
    });
    saveSetting('macroMapping', newMapping);
  };

  const updateTarget = (cat, val) => {
    saveSetting('macroTargets', { ...macroTargets, [cat]: Number(val) });
  };

  const removeMacro = (macro) => {
    const newOptions = macroOptions.filter(m => m !== macro);
    saveSetting('macroOptions', newOptions);
    
    const newTargets = { ...macroTargets };
    delete newTargets[macro];
    saveSetting('macroTargets', newTargets);
    
    const newMapping = { ...macroMapping };
    Object.keys(newMapping).forEach(micro => {
      if (newMapping[micro] === macro) newMapping[micro] = 'Outros';
    });
    saveSetting('macroMapping', newMapping);
  };

  const addMacro = () => {
    const name = newMacroName.trim();
    if (name && !macroOptions.includes(name) && name !== 'Outros') {
      saveSetting('macroOptions', [...macroOptions, name]);
      saveSetting('macroTargets', { ...macroTargets, [name]: 0 });
      setNewMacroName('');
    }
  };

  const cycleMacroMapping = (microCat) => {
    const availableMacros = [...macroOptions, 'Outros'];
    const current = macroMapping[microCat] || 'Outros';
    const nextIdx = (availableMacros.indexOf(current) + 1) % availableMacros.length;
    saveSetting('macroMapping', { ...macroMapping, [microCat]: availableMacros[nextIdx] });
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Módulos e Macros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* MODULARIDADE DE UI */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Visibilidade de Módulos</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Ligue ou desligue recursos inteiros do app.</Text>
          
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Geral] Aba Investimentos</Text>
            <Switch value={uiConfig.showInvestmentsTab} onValueChange={() => handleToggleUi('showInvestmentsTab')} trackColor={{ false: '#333', true: activeTheme.accent }} />
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
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Últimas Trans.</Text>
            <Switch value={uiConfig.homeShowRecent !== false} onValueChange={() => handleToggleUi('homeShowRecent')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Home] Mostrar Dívidas</Text>
            <Switch value={uiConfig.homeShowDebts !== false} onValueChange={() => handleToggleUi('homeShowDebts')} trackColor={{ false: '#333', true: activeTheme.accent }} />
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
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Análise] Mostrar Gráficos</Text>
            <Switch value={uiConfig.analyticsShowCharts} onValueChange={() => handleToggleUi('analyticsShowCharts')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Análise] Top 3 Vilões</Text>
            <Switch value={uiConfig.analyticsShowVilao} onValueChange={() => handleToggleUi('analyticsShowVilao')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: activeTheme.cardSecondary }]}>
            <Text style={[styles.switchLabel, { color: activeTheme.text }]}>[Transações] Filtros</Text>
            <Switch value={uiConfig.transactionsShowFilters} onValueChange={() => handleToggleUi('transactionsShowFilters')} trackColor={{ false: '#333', true: activeTheme.accent }} />
          </View>
        </View>

        {/* METAS MACRO */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Metas e Macros</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Crie grandes grupos de categorias e defina uma meta % para o orçamento.</Text>
          
          <View style={{ marginBottom: 16 }}>
            {macroOptions.map(cat => (
              <MacroRow 
                key={cat} 
                macro={cat} 
                target={macroTargets[cat] || 0} 
                onUpdateName={updateMacroName}
                onUpdateTarget={updateTarget}
                onRemove={removeMacro}
                theme={activeTheme}
              />
            ))}
            
            <View style={[styles.addMacroRow, { backgroundColor: activeTheme.cardSecondary }]}>
              <TextInput
                style={[styles.goalInput, { flex: 1, textAlign: 'left', marginRight: 12, backgroundColor: activeTheme.card, color: activeTheme.text }]}
                placeholder="Novo Grupo Macro..."
                placeholderTextColor={activeTheme.textSecondary}
                value={newMacroName}
                onChangeText={setNewMacroName}
              />
              <TouchableOpacity style={[styles.iconBtnAdd, { backgroundColor: activeTheme.accent }]} onPress={addMacro}>
                <Ionicons name="add" size={24} color="#121212" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.outlineBtn, { borderColor: activeTheme.accent }]} onPress={() => setShowMappingModal(true)}>
            <Text style={[styles.outlineBtnText, { color: activeTheme.accent }]}>Mapear Categorias para Macros</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL MAPEAMENTO DE CATEGORIAS */}
      <BaseModal
        visible={showMappingModal}
        title="Mapeamento Macro"
        onClose={() => setShowMappingModal(false)}
        cancelText="Voltar"
      >
        <Text style={[styles.modalSub, { color: activeTheme.textSecondary }]}>Toque no botão à direita para trocar o grupo macro da categoria.</Text>
        
        <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
          {Object.keys(macroMapping).sort().map(microCat => {
            const currentMacro = macroMapping[microCat];
            const macroIdx = macroOptions.indexOf(currentMacro);
            const macroColor = currentMacro === 'Outros' ? activeTheme.textSecondary : COLORS_PALETTE[macroIdx % COLORS_PALETTE.length] || activeTheme.textSecondary;

            return (
              <View key={microCat} style={[styles.mapRow, { borderBottomColor: activeTheme.card }]}>
                <Text style={[styles.mapMicro, { color: activeTheme.text }]}>{microCat}</Text>
                <TouchableOpacity 
                  style={[styles.mapToggleBtn, { borderColor: macroColor }]}
                  onPress={() => cycleMacroMapping(microCat)}
                >
                  <Text style={[styles.mapToggleText, { color: macroColor }]}>{currentMacro}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </BaseModal>

    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    section: { borderRadius: 16 * z, padding: 20 * z, marginBottom: 20 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    sectionDesc: { fontSize: 14 * z, marginTop: 4 * z, marginBottom: 16 * z, fontFamily: f },
    
    orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 * z, borderRadius: 12 * z, marginBottom: 8 * z },
    orderLabel: { fontSize: 16 * z, fontFamily: f, fontWeight: 'bold' },
    orderBtn: { padding: 4 * z, marginLeft: 8 * z },
    
    goalInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 * z, padding: 8 * z, borderRadius: 12 * z },
    addMacroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 * z, padding: 8 * z, borderRadius: 12 * z },
    goalLabel: { fontSize: 14 * z, fontWeight: 'bold', flexShrink: 1, fontFamily: f },
    goalInput: { borderRadius: 8 * z, paddingHorizontal: 12 * z, paddingVertical: 8 * z, width: 60 * z, textAlign: 'center', fontFamily: f },
    iconBtnAdd: { padding: 8 * z, borderRadius: 8 * z },

    outlineBtn: { borderWidth: 1, padding: 12 * z, borderRadius: 12 * z, alignItems: 'center', marginTop: 8 * z },
    outlineBtnText: { fontWeight: 'bold', fontSize: 14 * z, fontFamily: f },

    modalSub: { fontSize: 14 * z, marginBottom: 24 * z, fontFamily: f },
    
    mapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 * z, borderBottomWidth: 1 },
    mapMicro: { fontSize: 14 * z, fontFamily: f },
    mapToggleBtn: { borderWidth: 1, borderRadius: 12 * z, paddingHorizontal: 10 * z, paddingVertical: 4 * z },
    mapToggleText: { fontSize: 12 * z, fontWeight: 'bold', fontFamily: f }
  });
};
