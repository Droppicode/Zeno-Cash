import React, { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SettingsContext } from '../context/SettingsContext';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { categorizeTransaction } from '../services/categorizer';
import { DateUtils } from '../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../utils/scaler';

export default function TransactionModal({ visible, onClose, onSave, initialData }) {
  const { activeTheme } = useContext(SettingsContext);
  const { accountList, loadAccounts } = useAccounts();
  const { categoryList, loadCategories } = useCategories();
  
  const [errorMsg, setErrorMsg] = useState('');
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [txType, setTxType] = useState('expense');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  useEffect(() => {
    if (visible) {
      loadAccounts();
      loadCategories();
    }
  }, [visible, loadAccounts, loadCategories]);

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
    if (visible && initialData) {
      // Format initial number (e.g. 5.5 -> 550 -> "5,50")
      const numStr = (initialData.amount * 100).toFixed(0);
      setAmount(formatCurrency(numStr));
      setDescription(initialData.description);
      setNote(initialData.note || '');
      setTxType(initialData.type);
      setSelectedAccountId(initialData.accountId);
      setSelectedCategoryId(initialData.categoryId || null);
      setErrorMsg('');
    } else if (visible) {
      setAmount('');
      setDescription('');
      setNote('');
      setTxType('expense');
      setSelectedAccountId(accountList.length > 0 ? accountList[0].id : null);
      setSelectedCategoryId(null);
      setErrorMsg('');
    }
  }, [visible, initialData, accountList]);

  // Auto-categorize only if the user hasn't manually selected a category and we are not editing
  // Auto-categorize only if the user hasn't manually selected a category and we are not editing (or if editing a pending tx and title changed)
  useEffect(() => {
    if (visible && !selectedCategoryId && description.length > 2 && categoryList.length > 0) {
      // Evita re-categorizar uma transação oficial editada, mas permite para as pendentes
      if (!initialData || initialData.isPending === 1) {
        const rawAmount = amount.replace(/\./g, '').replace(',', '.');
        const match = categorizeTransaction(description, parseFloat(rawAmount || 0));
        if (match) {
          const cat = categoryList.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase());
          if (cat) setSelectedCategoryId(cat.id);
        }
      }
    }
  }, [description, visible, initialData, selectedCategoryId, categoryList, amount]);

  const handleAmountChange = (text) => {
    setAmount(formatCurrency(text));
  };

  const handleSave = () => {
    setErrorMsg('');
    if (!amount || !description.trim()) {
      setErrorMsg('Preencha o valor e o título.');
      return;
    }
    
    let rawAmount = amount.replace(/\./g, '').replace(',', '.');
    let numAmount = parseFloat(rawAmount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Insira um valor numérico válido.');
      return;
    }
    
    onSave({
      id: initialData?.id,
      amount: numAmount,
      description: description.trim(),
      note: note.trim(),
      type: txType,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId
    });
  };

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior="position"
        contentContainerStyle={{ flex: 1, justifyContent: 'flex-end' }}
        enabled={Platform.OS === 'ios' ? true : isKeyboardVisible}
      >
        <View style={[styles.modalContent, { backgroundColor: activeTheme.card, flexShrink: 1 }]}>
          <Text style={[styles.modalTitle, { color: activeTheme.text }]}>
            {initialData?.id ? 'Editar Transação' : 'Nova Transação'}
          </Text>
          
          {errorMsg ? (
            <Text style={{ color: activeTheme.expense, marginBottom: 12, fontWeight: 'bold' }}>{errorMsg}</Text>
          ) : null}
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          >
            <View style={[styles.toggleContainer, { backgroundColor: activeTheme.cardSecondary }]}>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'expense' && { backgroundColor: activeTheme.expense }]} 
                onPress={() => setTxType('expense')}
              >
                <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, txType === 'expense' && { color: '#fff' }]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'income' && { backgroundColor: activeTheme.income }]} 
                onPress={() => setTxType('income')}
              >
                <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, txType === 'income' && { color: '#fff' }]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={[styles.inputAmount, { color: activeTheme.text }]}
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              autoFocus={!initialData?.id}
            />

            {accountList.length > 0 && (
              <View style={styles.selectorBlock}>
                <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Conta</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accountList.map(acc => (
                    <TouchableOpacity 
                      key={acc.id} 
                      style={[
                        styles.pill, 
                        { backgroundColor: activeTheme.cardSecondary },
                        selectedAccountId === acc.id && { backgroundColor: activeTheme.accent }
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text style={[
                        styles.pillText, 
                        { color: activeTheme.textSecondary },
                        selectedAccountId === acc.id && { color: '#121212', fontWeight: 'bold' }
                      ]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                style={[styles.inputField, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text, flex: 1 }]}
                placeholder="Título (Ex: Uber, Ifood...)"
                placeholderTextColor={activeTheme.textSecondary}
                value={description}
                onChangeText={setDescription}
              />
              {initialData?.isPending === 1 && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setDescription('')}>
                  <Ionicons name="close-circle" size={24} color={activeTheme.expense} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                style={[styles.inputField, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text, flex: 1 }]}
                placeholder="Notas adicionais (Opcional)"
                placeholderTextColor={activeTheme.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
              />
              {initialData?.isPending === 1 && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setNote('')}>
                  <Ionicons name="close-circle" size={24} color={activeTheme.expense} />
                </TouchableOpacity>
              )}
            </View>

            {categoryList.length > 0 && (
              <View style={styles.selectorBlock}>
                <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categoryList.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      style={[
                        styles.catPill, 
                        { backgroundColor: cat.color + '20', borderColor: cat.color },
                        selectedCategoryId === cat.id && { backgroundColor: cat.color }
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      <Ionicons name={cat.icon} size={16} color={selectedCategoryId === cat.id ? '#fff' : cat.color} style={{ marginRight: 4 }} />
                      <Text style={[
                        styles.catPillText, 
                        { color: selectedCategoryId === cat.id ? '#fff' : cat.color }
                      ]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={onClose}>
                <Text style={[styles.btnText, { color: activeTheme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={handleSave}>
                <Text style={[styles.btnText, { color: '#121212' }]}>{initialData?.isPending === 1 ? 'Aprovar' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24 * z, borderTopRightRadius: 24 * z, padding: 24 * z, maxHeight: '90%' },
  modalTitle: { fontSize: 22 * z, fontWeight: 'bold', marginBottom: 20 * z, fontFamily: f },
  
  toggleContainer: { flexDirection: 'row', borderRadius: 12 * z, overflow: 'hidden', marginBottom: 20 * z },
  toggleBtn: { flex: 1, paddingVertical: 12 * z, alignItems: 'center' },
  toggleText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  
  inputAmount: { fontSize: 40 * z, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 * z, fontFamily: f },
  
  selectorBlock: { marginBottom: 16 * z },
  label: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 8 * z, fontFamily: f },
  
  pill: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z, marginRight: 8 * z },
  pillText: { fontSize: 14 * z, fontFamily: f },
  
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 * z, paddingVertical: 6 * z, borderRadius: 20 * z, borderWidth: 1, marginRight: 8 * z },
  catPillText: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
  
  inputField: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, marginBottom: 12 * z, fontFamily: f },
  
  modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 16 * z },
  btnCancel: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnSave: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  clearBtn: { padding: 12 * z, marginLeft: 8 * z, justifyContent: 'center', alignItems: 'center' }
});
