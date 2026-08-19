import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useCategories } from '../hooks/useCategories';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import BaseModalBottom from '../components/ui/BaseModalBottom';
import ListCard from '../components/ui/ListCard';

const CATEGORY_ICONS = ['cash', 'car', 'restaurant', 'cart', 'play-circle', 'medkit', 'home', 'book', 'fitness', 'airplane', 'bulb', 'gift', 'game-controller'];
const CATEGORY_COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548', '#607D8B', '#3F51B5'];
const MACRO_OPTIONS = ['Essenciais', 'Estilo de Vida', 'Investimento', 'Outros'];

export default function CategoriesConfigScreen({ onBack }) {
  const { activeTheme } = useContext(SettingsContext);
  const { categoryList, loadCategories, saveCategory: saveCat, deleteCategory: delCat } = useCategories();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [macro, setMacro] = useState(MACRO_OPTIONS[0]);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setIcon(CATEGORY_ICONS[0]);
    setColor(CATEGORY_COLORS[0]);
    setMacro(MACRO_OPTIONS[0]);
    setErrorMsg('');
    setShowEditor(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon || CATEGORY_ICONS[0]);
    setColor(cat.color || CATEGORY_COLORS[0]);
    setMacro(cat.macro || MACRO_OPTIONS[0]);
    setErrorMsg('');
    setShowEditor(true);
  };

  const saveCategory = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('O nome da categoria é obrigatório.');
      return;
    }
    
    await saveCat(editingId, {
      name: name.trim(),
      icon,
      color,
      macro
    });
    
    setShowEditor(false);
  };

  const deleteCategory = (id) => {
    Alert.alert('Apagar Categoria', 'Tem certeza? Transações ligadas a ela ficarão sem categoria.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        await delCat(id);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Categorias</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {categoryList.map((cat, index) => (
          <ListCard key={cat.id} index={index} total={categoryList.length}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon || 'list'} size={20} color={cat.color || activeTheme.text} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.catName, { color: activeTheme.text }]}>{cat.name}</Text>
                <Text style={[styles.catMacro, { color: activeTheme.textSecondary }]}>Grupo: {cat.macro || 'Outros'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(cat)}>
                <Ionicons name="pencil" size={20} color={activeTheme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => deleteCategory(cat.id)}>
                <Ionicons name="trash" size={20} color={activeTheme.expense} />
              </TouchableOpacity>
            </View>
          </ListCard>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: activeTheme.accent }]} onPress={openNew}>
          <Ionicons name="add" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.addBtnText, { color: activeTheme.accent }]}>Nova Categoria</Text>
        </TouchableOpacity>
      </ScrollView>

      <BaseModalBottom
        visible={showEditor}
        title={editingId ? 'Editar Categoria' : 'Nova Categoria'}
        onClose={() => setShowEditor(false)}
        onSave={saveCategory}
        errorMsg={errorMsg}
      >
        <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Nome da Categoria</Text>
        <TextInput
          style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Uber, Mercado..."
          placeholderTextColor={activeTheme.textSecondary}
        />

        <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Grupo Principal (Macro)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {MACRO_OPTIONS.map(m => (
            <TouchableOpacity 
              key={m}
              style={[styles.pill, { backgroundColor: activeTheme.cardSecondary }, macro === m && { backgroundColor: activeTheme.accent }]}
              onPress={() => setMacro(m)}
            >
              <Text style={[styles.pillText, { color: activeTheme.textSecondary }, macro === m && { color: '#121212' }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Ícone</Text>
        <View style={styles.pickerRow}>
          {CATEGORY_ICONS.map(i => (
            <TouchableOpacity 
              key={i} 
              style={[styles.pickerItem, icon === i && { backgroundColor: activeTheme.accent + '30', borderColor: activeTheme.accent }]}
              onPress={() => setIcon(i)}
            >
              <Ionicons name={i} size={24} color={icon === i ? activeTheme.accent : activeTheme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Cor</Text>
        <View style={styles.pickerRow}>
          {CATEGORY_COLORS.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.colorItem, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: activeTheme.text }]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
      </BaseModalBottom>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    iconBox: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, justifyContent: 'center', alignItems: 'center' },
    catName: { fontSize: 16 * z, fontWeight: 'bold', marginBottom: 2 * z, fontFamily: f },
    catMacro: { fontSize: 12 * z, fontFamily: f }
  });
};
