import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import ColorPicker from 'react-native-wheel-color-picker';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import BaseModalBottom from '../components/ui/BaseModalBottom';

export default function ThemeConfigScreen({ onBack }) {
  const { activeTheme, customThemes, saveSetting } = useContext(SettingsContext);
  const [selectedThemeId, setSelectedThemeId] = useState(activeTheme.id);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  
  // Color Picker states
  const [editingKey, setEditingKey] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tempColor, setTempColor] = useState('#ffffff');

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  const applyTheme = (theme) => {
    setSelectedThemeId(theme.id);
    saveSetting('activeTheme', theme);
  };

  const handleCreateNew = () => {
    const newTheme = {
      ...activeTheme,
      id: `custom_${Date.now()}`,
      name: `Meu Tema ${customThemes.length}`
    };
    setEditingTheme(newTheme);
    setShowEditor(true);
  };

  const handleDuplicateTheme = (baseTheme) => {
    const newTheme = {
      ...baseTheme,
      id: `custom_${Date.now()}`,
      name: `${baseTheme.name} (Cópia)`
    };
    setEditingTheme(newTheme);
    setShowEditor(true);
  };

  const handleEditTheme = (theme) => {
    setEditingTheme({ ...theme });
    setShowEditor(true);
  };

  const handleSaveEditedTheme = () => {
    if (!editingTheme.name.trim()) {
      Alert.alert('Erro', 'Dê um nome ao seu tema.');
      return;
    }
    
    const existingIndex = customThemes.findIndex(t => t.id === editingTheme.id);
    let newCustomThemes = [...customThemes];
    
    if (existingIndex >= 0) {
      newCustomThemes[existingIndex] = editingTheme;
    } else {
      newCustomThemes.push(editingTheme);
    }
    
    saveSetting('customThemes', newCustomThemes);
    
    if (activeTheme.id === editingTheme.id) {
      saveSetting('activeTheme', editingTheme);
    } else if (existingIndex === -1) {
      applyTheme(editingTheme);
    }
    
    setShowEditor(false);
  };

  const handleDeleteTheme = (id) => {
    if (id === 'default_dark' || id === 'default_light') {
      Alert.alert('Erro', 'Você não pode apagar os temas padrão.');
      return;
    }
    
    Alert.alert('Apagar Tema', 'Tem certeza que deseja apagar este tema?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => {
        const newThemes = customThemes.filter(t => t.id !== id);
        saveSetting('customThemes', newThemes);
        if (activeTheme.id === id) {
          applyTheme(newThemes[0]); 
        }
      }}
    ]);
  };

  const openPickerFor = (key) => {
    setEditingKey(key);
    setTempColor(editingTheme[key]);
    setShowPicker(true);
  };

  const confirmColor = () => {
    setEditingTheme(prev => ({ ...prev, [editingKey]: tempColor }));
    setShowPicker(false);
  };

  if (showEditor && editingTheme) {
    return (
      <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
          <TouchableOpacity onPress={() => setShowEditor(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: activeTheme.text }]}>Editar Tema</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Nome do Tema</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: activeTheme.card, color: activeTheme.text }]}
            value={editingTheme.name}
            onChangeText={(txt) => setEditingTheme(prev => ({ ...prev, name: txt }))}
          />

          <View style={styles.colorsGrid}>
            {[
              { key: 'background', label: 'Fundo Geral' },
              { key: 'card', label: 'Cards (Primário)' },
              { key: 'cardSecondary', label: 'Cards (Secundário)' },
              { key: 'text', label: 'Texto Principal' },
              { key: 'textSecondary', label: 'Texto Secundário' },
              { key: 'accent', label: 'Acento (Destaque)' },
              { key: 'income', label: 'Receitas/Sucesso' },
              { key: 'expense', label: 'Despesas/Perigo' }
            ].map(item => (
              <View key={item.key} style={styles.colorRow}>
                <Text style={[styles.colorLabel, { color: activeTheme.text }]}>{item.label}</Text>
                <TouchableOpacity 
                  style={[styles.colorCircle, { backgroundColor: editingTheme[item.key], borderColor: activeTheme.textSecondary, borderWidth: 1 }]} 
                  onPress={() => openPickerFor(item.key)} 
                />
              </View>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { color: activeTheme.textSecondary, marginTop: 12 }]}>Tipografia (Fonte)</Text>
          <View style={styles.pickerRow}>
            {['System', 'serif', 'monospace', 'sans-serif-condensed', 'sans-serif-medium'].map(f => (
              <TouchableOpacity 
                key={f} 
                style={[styles.fontPill, { backgroundColor: activeTheme.cardSecondary }, editingTheme.fontFamily === f && { backgroundColor: activeTheme.accent }]}
                onPress={() => setEditingTheme(prev => ({ ...prev, fontFamily: f }))}
              >
                <Text style={[styles.fontPillText, { color: activeTheme.text, fontFamily: f }, editingTheme.fontFamily === f && { color: '#121212', fontWeight: 'bold' }]}>
                  {f === 'System' ? 'Padrão' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: activeTheme.textSecondary, marginTop: 12 }]}>Zoom / Escala (Ex: 1.0, 1.2)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              value={editingTheme.zoom ? editingTheme.zoom.toString() : '1'}
              onChangeText={(txt) => setEditingTheme(prev => ({ ...prev, zoom: parseFloat(txt.replace(',', '.')) || 1 }))}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', marginLeft: 12, gap: 8 }}>
              {[0.8, 1, 1.2].map(z => (
                <TouchableOpacity 
                  key={z} 
                  style={[styles.zoomPill, { backgroundColor: activeTheme.cardSecondary }]}
                  onPress={() => setEditingTheme(prev => ({ ...prev, zoom: z }))}
                >
                  <Text style={{ color: activeTheme.text }}>{z}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: activeTheme.accent }]} onPress={handleSaveEditedTheme}>
            <Text style={[styles.saveBtnText, { color: '#121212' }]}>Salvar Tema</Text>
          </TouchableOpacity>
        </ScrollView>

        <BaseModalBottom
          visible={showPicker}
          title="Escolha a Cor"
          onClose={() => setShowPicker(false)}
          onSave={confirmColor}
          saveText="Confirmar"
        >
          <View style={styles.pickerContainer}>
            <ColorPicker
              color={tempColor}
              onColorChange={(color) => setTempColor(color)}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
            />
          </View>
          
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text, textAlign: 'center', marginBottom: 20 }]}
            value={tempColor}
            onChangeText={setTempColor}
            autoCapitalize="none"
            placeholder="#000000"
            placeholderTextColor={activeTheme.textSecondary}
          />
        </BaseModalBottom>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Aparência e Temas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={[styles.createBtn, { borderColor: activeTheme.accent }]} onPress={handleCreateNew}>
          <Ionicons name="add" size={24} color={activeTheme.accent} />
          <Text style={[styles.createBtnText, { color: activeTheme.accent }]}>Criar Novo Tema</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: activeTheme.textSecondary }]}>Meus Temas</Text>
        
        {customThemes.map(theme => (
          <View key={theme.id} style={[styles.themeCard, { backgroundColor: activeTheme.card, borderColor: selectedThemeId === theme.id ? activeTheme.accent : 'transparent' }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => applyTheme(theme)}>
              <Text style={[styles.themeName, { color: activeTheme.text }]}>{theme.name}</Text>
              <View style={styles.themePreview}>
                <View style={[styles.previewDot, { backgroundColor: theme.background }]} />
                <View style={[styles.previewDot, { backgroundColor: theme.card }]} />
                <View style={[styles.previewDot, { backgroundColor: theme.accent }]} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.themeActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicateTheme(theme)}>
                <Ionicons name="copy-outline" size={20} color={activeTheme.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditTheme(theme)}>
                <Ionicons name="pencil" size={20} color={activeTheme.textSecondary} />
              </TouchableOpacity>
              
              {theme.id !== 'default_dark' && theme.id !== 'default_light' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteTheme(theme.id)}>
                  <Ionicons name="trash" size={20} color={activeTheme.expense} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', padding: 16 * z, borderRadius: 12 * z, marginBottom: 24 * z },
    createBtnText: { fontSize: 16 * z, fontWeight: 'bold', marginLeft: 8 * z, fontFamily: f },
    
    sectionTitle: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 12 * z, textTransform: 'uppercase', fontFamily: f },
    themeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 * z, borderRadius: 12 * z, marginBottom: 12 * z, borderWidth: 2 * z },
    themeName: { fontSize: 18 * z, fontWeight: 'bold', marginBottom: 8 * z, fontFamily: f },
    themePreview: { flexDirection: 'row', gap: 8 * z },
    previewDot: { width: 20 * z, height: 20 * z, borderRadius: 10 * z, borderWidth: 1, borderColor: '#555' },
    themeActions: { flexDirection: 'row', gap: 8 * z },
    
    colorsGrid: { gap: 12 * z, marginBottom: 24 * z },
    colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 * z },
    colorLabel: { fontSize: 16 * z, fontFamily: f },
    colorCircle: { width: 32 * z, height: 32 * z, borderRadius: 16 * z },

    saveBtn: { padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
    saveBtnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    pickerContainer: { height: 300 * z, marginBottom: 20 * z },
    
    fontPill: { paddingHorizontal: 16 * z, paddingVertical: 10 * z, borderRadius: 20 * z },
    fontPillText: { fontSize: 14 * z, fontFamily: f },
    zoomPill: { paddingHorizontal: 12 * z, paddingVertical: 12 * z, borderRadius: 8 * z, justifyContent: 'center', alignItems: 'center' }
  });
};
