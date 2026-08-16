import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useCategories } from '../hooks/useCategories';
import { getZoomFactor } from '../utils/scaler';

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
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

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
          <View key={cat.id} style={[
            styles.categoryCard, 
            { backgroundColor: activeTheme.cardSecondary },
            index === 0 && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
            index === categoryList.length - 1 && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
            index !== categoryList.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 }
          ]}>
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
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: activeTheme.accent }]} onPress={openNew}>
          <Ionicons name="add" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.addBtnText, { color: activeTheme.accent }]}>Nova Categoria</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEditor} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: activeTheme.card }]}>
            <Text style={[styles.modalTitle, { color: activeTheme.text }]}>
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>

            {errorMsg ? (
              <Text style={{ color: activeTheme.expense, marginBottom: 12, fontWeight: 'bold' }}>{errorMsg}</Text>
            ) : null}

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
                  style={[styles.macroPill, { backgroundColor: activeTheme.cardSecondary }, macro === m && { backgroundColor: activeTheme.accent }]}
                  onPress={() => setMacro(m)}
                >
                  <Text style={[styles.macroPillText, { color: activeTheme.textSecondary }, macro === m && { color: '#121212' }]}>{m}</Text>
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

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setShowEditor(false)}>
                <Text style={[styles.btnText, { color: activeTheme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={saveCategory}>
                <Text style={[styles.btnText, { color: '#121212' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, borderBottomWidth: 1 },
  backBtn: { width: 40 * z, height: 40 * z, justifyContent: 'center' },
  title: { fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
  scroll: { padding: 16 * z },
  
  categoryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, marginBottom: 12 * z },
  iconBox: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, justifyContent: 'center', alignItems: 'center' },
  catName: { fontSize: 16 * z, fontWeight: 'bold', marginBottom: 2 * z, fontFamily: f },
  catMacro: { fontSize: 12 * z, fontFamily: f },
  actionBtn: { width: 36 * z, height: 36 * z, justifyContent: 'center', alignItems: 'center', marginLeft: 4 * z },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 * z, borderRadius: 12 * z, borderWidth: 1, borderStyle: 'dashed', marginTop: 12 * z },
  addBtnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24 * z, borderTopRightRadius: 24 * z, padding: 24 * z },
  modalTitle: { fontSize: 22 * z, fontWeight: 'bold', marginBottom: 20 * z, fontFamily: f },
  label: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 8 * z, marginTop: 12 * z, fontFamily: f },
  input: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, marginBottom: 4 * z, fontFamily: f },
  
  macroPill: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z, marginRight: 8 * z },
  macroPillText: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },

  pickerRow: { flexDirection: 'row', gap: 12 * z, marginBottom: 4 * z, flexWrap: 'wrap' },
  pickerItem: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  colorItem: { width: 36 * z, height: 36 * z, borderRadius: 18 * z },
  
  modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 32 * z },
  btnCancel: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnSave: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f }
});
