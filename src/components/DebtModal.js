import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Switch, KeyboardAvoidingView, Platform, FlatList, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useDebts } from '../hooks/useDebts';
import { useAccounts } from '../hooks/useAccounts';
import { getZoomFactor } from '../utils/scaler';

export default function DebtModal({ visible, onClose, onDelete, initialData = null }) {
  const { activeTheme } = useContext(SettingsContext);
  const { addDebt, updateDebt, getUniqueNames } = useDebts();
  const { accountList, loadAccounts } = useAccounts();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('owe'); // 'owe' or 'owed'
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const formatCurrency = (value) => {
    if (!value) return '';
    const cleaned = value.toString().replace(/\D/g, '');
    if (!cleaned) return '';
    const numberValue = parseInt(cleaned, 10);
    const formatted = (numberValue / 100).toFixed(2);
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setPersonName(initialData.personName);
        const numStr = (initialData.amount * 100).toFixed(0);
        setAmount(formatCurrency(numStr));
        setType(initialData.type);
        setDate(new Date(initialData.date).toLocaleDateString('pt-BR'));
        setAccountId(initialData.accountId);
      } else {
        setPersonName('');
        setAmount('');
        setType('owe');
        setDate(new Date().toLocaleDateString('pt-BR'));
        setAccountId(null);
      }
      loadAccounts();
    }
  }, [visible, initialData, loadAccounts]);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleNameChange = async (text) => {
    setPersonName(text);
    if (text.length > 0) {
      const names = await getUniqueNames();
      const filtered = names.filter(n => n.toLowerCase().includes(text.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectName = (name) => {
    setPersonName(name);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!personName || !amount || !date) return;
    
    // Parse Date DD/MM/YYYY
    const parts = date.split('/');
    if (parts.length !== 3) return; // simple validation
    const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).getTime();

    const rawAmount = amount.replace(/\./g, '').replace(',', '.');
    const numAmount = parseFloat(rawAmount);

    if (isNaN(numAmount) || numAmount <= 0) return;

    const data = {
      personName,
      amount: numAmount,
      type,
      date: parsedDate,
      accountId
    };

    if (initialData) {
      await updateDebt(initialData.id, data);
    } else {
      await addDebt(data);
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior="position"
        contentContainerStyle={{ flex: 1, justifyContent: 'flex-end' }}
        enabled={Platform.OS === 'ios' ? true : isKeyboardVisible}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initialData ? 'Editar Dívida' : 'Nova Dívida'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={activeTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type Switch */}
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'owe' && styles.typeButtonActiveExpense]}
                onPress={() => setType('owe')}
              >
                <Text style={[styles.typeText, type === 'owe' && styles.typeTextActive]}>Eu Devo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'owed' && styles.typeButtonActiveIncome]}
                onPress={() => setType('owed')}
              >
                <Text style={[styles.typeText, type === 'owed' && styles.typeTextActive]}>Me Devem</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input with Autocomplete */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={personName}
                onChangeText={handleNameChange}
                placeholder="Ex: João"
                placeholderTextColor={activeTheme.textSecondary}
              />
              {showSuggestions && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectName(item)}>
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={(val) => setAmount(formatCurrency(val))}
                placeholder="0,00"
                keyboardType="numeric"
                placeholderTextColor={activeTheme.textSecondary}
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                placeholderTextColor={activeTheme.textSecondary}
                maxLength={10}
              />
            </View>

            {/* Account Optional */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Conta Relacionada (Opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                <TouchableOpacity
                  style={[styles.accountBtn, accountId === null && styles.accountBtnActive]}
                  onPress={() => setAccountId(null)}
                >
                  <Text style={[styles.accountText, accountId === null && styles.accountTextActive]}>Nenhuma</Text>
                </TouchableOpacity>
                {accountList.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountBtn, accountId === acc.id && styles.accountBtnActive]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text style={[styles.accountText, accountId === acc.id && styles.accountTextActive]}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          </ScrollView>
          <View style={styles.footer}>
            {initialData && onDelete && (
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => {
                  onDelete(initialData.id);
                  onClose();
                }}
              >
                <Ionicons name="trash-outline" size={20 * z} color={activeTheme.expense} style={{ marginRight: 8 * z }} />
                <Text style={styles.deleteButtonText}>Apagar Dívida</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24 * z, borderTopRightRadius: 24 * z, padding: 24 * z, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 * z },
    modalTitle: { fontSize: 20 * z, fontWeight: 'bold', color: theme.text, fontFamily: f },
    closeButton: { padding: 4 * z },
    typeContainer: { flexDirection: 'row', backgroundColor: theme.background, borderRadius: 12 * z, padding: 4 * z, marginBottom: 24 * z },
    typeButton: { flex: 1, paddingVertical: 12 * z, alignItems: 'center', borderRadius: 8 * z },
    typeButtonActiveExpense: { backgroundColor: theme.expense },
    typeButtonActiveIncome: { backgroundColor: theme.income },
    typeText: { fontSize: 16 * z, fontWeight: '600', color: theme.textSecondary, fontFamily: f },
    typeTextActive: { color: '#fff' },
    inputGroup: { marginBottom: 20 * z, zIndex: 1 },
    label: { fontSize: 14 * z, color: theme.textSecondary, marginBottom: 8 * z, fontWeight: '600', fontFamily: f },
    input: { backgroundColor: theme.background, borderRadius: 12 * z, padding: 16 * z, fontSize: 16 * z, color: theme.text, fontFamily: f },
    suggestionsContainer: { backgroundColor: theme.cardSecondary, borderRadius: 8 * z, marginTop: 4 * z, maxHeight: 120 * z, zIndex: 2 },
    suggestionItem: { padding: 12 * z, borderBottomWidth: 1, borderBottomColor: theme.background },
    suggestionText: { color: theme.text, fontSize: 14 * z, fontFamily: f },
    accountScroll: { flexDirection: 'row' },
    accountBtn: { backgroundColor: theme.background, paddingHorizontal: 16 * z, paddingVertical: 10 * z, borderRadius: 12 * z, marginRight: 8 * z },
    accountBtnActive: { backgroundColor: theme.accent },
    accountText: { color: theme.textSecondary, fontWeight: '600', fontFamily: f },
    accountTextActive: { color: '#121212' },
    footer: { marginTop: 24 * z, paddingTop: 16 * z, borderTopWidth: 1, borderTopColor: theme.background, flexDirection: 'row', gap: 12 * z },
    saveButton: { flex: 1, backgroundColor: theme.accent, paddingVertical: 16 * z, borderRadius: 16 * z, alignItems: 'center' },
    saveButtonText: { color: '#121212', fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    deleteButton: { flex: 1, backgroundColor: theme.expense + '15', paddingVertical: 16 * z, borderRadius: 16 * z, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    deleteButtonText: { color: theme.expense, fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  });
};
