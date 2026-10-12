import React, { useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useCategories } from '../hooks/useCategories';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import { CurrencyUtils } from '../utils/currencyUtils';
import { listMacros, macroColor, macroOf, OTHER_MACRO } from '../utils/MacroBudgets';

const formatLimit = value => (Number(value) > 0 ? CurrencyUtils.formatDisplay(Number(value)) : '');

const MacroCard = ({ macro, color, categories, limit, target, onRename, onLimit, onTarget, onRemove, theme, styles }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(macro);
  const [limitText, setLimitText] = useState(formatLimit(limit));
  const isOther = macro === OTHER_MACRO;

  useEffect(() => setLimitText(formatLimit(limit)), [limit]);

  const saveName = () => {
    const name = tempName.trim();
    if (name && name !== macro) onRename(macro, name);
    else setTempName(macro);
    setIsEditing(false);
  };

  return (
    <View testID={`macro-${macro}`} style={[styles.macroCard, { backgroundColor: theme.cardSecondary, borderLeftColor: color }]}>
      <View style={styles.row}>
        {isEditing ? (
          <>
            <TextInput style={[styles.nameInput, { backgroundColor: theme.card, color: theme.text }]} value={tempName} onChangeText={setTempName} onSubmitEditing={saveName} autoFocus />
            <TouchableOpacity onPress={saveName} style={styles.iconBtn}>
              <Ionicons name="checkmark-circle" size={22} color={theme.income} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.macroName, { color: theme.text }]} numberOfLines={1}>{macro}</Text>
            {!isOther && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            {!isOther && (
              <TouchableOpacity onPress={() => onRemove(macro)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.expense} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={[styles.row, { marginTop: 10 }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Limite por mês (R$)</Text>
          <TextInput
            testID={`macro-limit-${macro}`}
            style={[styles.fieldInput, { backgroundColor: theme.card, color: theme.text }]}
            value={limitText}
            onChangeText={setLimitText}
            onEndEditing={() => onLimit(macro, limitText)}
            onBlur={() => onLimit(macro, limitText)}
            keyboardType="decimal-pad"
            placeholder="Sem limite"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        {!isOther && (
          <View style={{ width: 90 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Meta (%)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.card, color: theme.text, textAlign: 'center' }]}
              value={String(target || 0)}
              onChangeText={val => onTarget(macro, val)}
              keyboardType="numeric"
            />
          </View>
        )}
      </View>

      <Text style={[styles.catList, { color: theme.textSecondary }]} numberOfLines={2}>
        {categories.length > 0 ? categories.map(c => c.name).join(', ') : 'Nenhuma categoria'}
      </Text>
    </View>
  );
};

export default function MacrosConfigScreen({ onBack }) {
  const { activeTheme, saveSetting, macroOptions, macroTargets, macroBudgets, macroMapping } = useContext(SettingsContext);
  const { categoryList, loadCategories, saveCategory } = useCategories();
  const [newMacroName, setNewMacroName] = useState('');
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const macros = useMemo(() => listMacros(macroOptions, categoryList), [macroOptions, categoryList]);
  const customMacros = macros.filter(m => m !== OTHER_MACRO);

  const moveCategories = async (from, to) => {
    for (const cat of categoryList.filter(c => macroOf(c) === from)) {
      await saveCategory(cat.id, { macro: to });
    }
  };

  const rename = async (oldName, newName) => {
    if (macros.includes(newName) || newName === OTHER_MACRO) return;
    saveSetting('macroOptions', customMacros.map(m => (m === oldName ? newName : m)));
    const { [oldName]: target, ...targets } = macroTargets;
    saveSetting('macroTargets', { ...targets, [newName]: target || 0 });
    const { [oldName]: limit, ...limits } = macroBudgets;
    saveSetting('macroBudgets', limit ? { ...limits, [newName]: limit } : limits);
    saveSetting('macroMapping', Object.fromEntries(Object.entries(macroMapping).map(([cat, m]) => [cat, m === oldName ? newName : m])));
    await moveCategories(oldName, newName);
  };

  const remove = async (macro) => {
    saveSetting('macroOptions', customMacros.filter(m => m !== macro));
    const { [macro]: _target, ...targets } = macroTargets;
    saveSetting('macroTargets', targets);
    const { [macro]: _limit, ...limits } = macroBudgets;
    saveSetting('macroBudgets', limits);
    await moveCategories(macro, OTHER_MACRO);
  };

  const add = () => {
    const name = newMacroName.trim();
    if (!name || macros.includes(name)) return;
    saveSetting('macroOptions', [...customMacros, name]);
    saveSetting('macroTargets', { ...macroTargets, [name]: 0 });
    setNewMacroName('');
  };

  const setLimit = (macro, text) => {
    const value = CurrencyUtils.parseCurrency(text);
    if ((Number(macroBudgets[macro]) || 0) === (value > 0 ? value : 0)) return;
    const { [macro]: _old, ...rest } = macroBudgets;
    saveSetting('macroBudgets', value > 0 ? { ...rest, [macro]: value } : rest);
  };

  const cycleCategory = (cat) => {
    const next = macros[(macros.indexOf(macroOf(cat)) + 1) % macros.length];
    saveCategory(cat.id, { macro: next });
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Macros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>
          Macros juntam várias categorias. O limite mensal aparece como barra na Home; a meta % é usada na Análise.
        </Text>

        {macros.map(macro => (
          <MacroCard
            key={macro}
            macro={macro}
            color={macroColor(macros, macro, activeTheme.textSecondary)}
            categories={categoryList.filter(c => macroOf(c) === macro)}
            limit={macroBudgets[macro]}
            target={macroTargets[macro]}
            onRename={rename}
            onLimit={setLimit}
            onTarget={(m, val) => saveSetting('macroTargets', { ...macroTargets, [m]: Number(val) || 0 })}
            onRemove={remove}
            theme={activeTheme}
            styles={styles}
          />
        ))}

        <View style={[styles.row, styles.addRow, { backgroundColor: activeTheme.cardSecondary }]}>
          <TextInput
            style={[styles.nameInput, { backgroundColor: activeTheme.card, color: activeTheme.text }]}
            placeholder="Nova macro..."
            placeholderTextColor={activeTheme.textSecondary}
            value={newMacroName}
            onChangeText={setNewMacroName}
            onSubmitEditing={add}
          />
          <TouchableOpacity style={[styles.addBtnSmall, { backgroundColor: activeTheme.accent }]} onPress={add}>
            <Ionicons name="add" size={22} color="#121212" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Categorias</Text>
        <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Toque na macro para trocar.</Text>
        <View style={[styles.catBox, { backgroundColor: activeTheme.card }]}>
          {categoryList.map((cat, idx) => {
            const macro = macroOf(cat);
            const color = macroColor(macros, macro, activeTheme.textSecondary);
            return (
              <View key={cat.id} style={[styles.catRow, idx < categoryList.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                <Ionicons name={cat.icon || 'pricetag'} size={18} color={cat.color || activeTheme.text} style={{ marginRight: 10 }} />
                <Text style={[styles.catName, { color: activeTheme.text }]} numberOfLines={1}>{cat.name}</Text>
                <TouchableOpacity testID={`cat-macro-${cat.id}`} style={[styles.pill, { borderColor: color }]} onPress={() => cycleCategory(cat)}>
                  <Text style={[styles.pillText, { color }]}>{macro}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f, marginTop: 16 * z },
    sectionDesc: { fontSize: 13 * z, marginTop: 4 * z, marginBottom: 12 * z, fontFamily: f },
    macroCard: { borderRadius: 6 * z, padding: 12 * z, marginBottom: 10 * z, borderLeftWidth: 4 },
    macroName: { flex: 1, fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    iconBtn: { padding: 4 * z, marginLeft: 8 * z },
    nameInput: { flex: 1, borderRadius: 4 * z, paddingHorizontal: 10 * z, paddingVertical: 8 * z, fontFamily: f },
    fieldLabel: { fontSize: 11 * z, marginBottom: 4 * z, fontFamily: f },
    fieldInput: { borderRadius: 4 * z, paddingHorizontal: 10 * z, paddingVertical: 8 * z, fontFamily: f },
    catList: { fontSize: 12 * z, marginTop: 10 * z, fontFamily: f },
    addRow: { padding: 8 * z, borderRadius: 6 * z, marginBottom: 8 * z },
    addBtnSmall: { padding: 8 * z, borderRadius: 4 * z, marginLeft: 8 * z },
    catBox: { borderRadius: 6 * z, overflow: 'hidden' },
    catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 * z, paddingHorizontal: 12 * z },
    catName: { flex: 1, fontSize: 14 * z, fontFamily: f },
    pill: { borderWidth: 1, borderRadius: 6 * z, paddingHorizontal: 10 * z, paddingVertical: 4 * z, marginLeft: 8 * z },
    pillText: { fontSize: 12 * z, fontWeight: 'bold', fontFamily: f }
  });
};
