import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Switch, FlatList, Keyboard } from 'react-native';
import BaseModalBottom from './ui/BaseModalBottom';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useDebts } from '../hooks/useDebts';
import { useAccounts } from '../hooks/useAccounts';
import { getZoomFactor } from '../utils/scaler';
import { HapticFeedback } from '../utils/haptics';
import { CurrencyUtils } from '../utils/currencyUtils';
import CustomDatePicker from './ui/CustomDatePicker';
import AutocompleteInput from './ui/AutocompleteInput';

export default function DebtModal({ visible, onClose, onDelete, onViewTransaction, initialData = null }) {
  const { activeTheme } = useContext(SettingsContext);
  const { addDebt, updateDebt, getUniqueNames } = useDebts();
  const { accountList, loadAccounts } = useAccounts();

  const [personName, setPersonName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('owe'); // 'owe' or 'owed'
  const [debtDateObj, setDebtDateObj] = useState(new Date());
  const [isPaid, setIsPaid] = useState(false);

  const [settlementAccountId, setSettlementAccountId] = useState(null);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setPersonName(initialData.personName);
        setDescription(initialData.description || '');
        const numStr = (initialData.amount * 100).toFixed(0);
        setAmount(CurrencyUtils.formatCurrency(numStr));
        setType(initialData.type);
        setDebtDateObj(initialData.date ? new Date(initialData.date) : new Date());
        setIsPaid(initialData.isPaid === 1);
        setSettlementAccountId(null);
      } else {
        setPersonName('');
        setDescription('');
        setAmount('');
        setType('owe');
        setDebtDateObj(new Date());
        setIsPaid(false);
        setSettlementAccountId(null);
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

  const handleSave = async () => {
    if (!personName || !amount) return;
    
    const parsedDate = debtDateObj ? debtDateObj.getTime() : Date.now();

    const numAmount = CurrencyUtils.parseCurrency(amount);

    if (isNaN(numAmount) || numAmount <= 0) return;

    const data = {
      personName,
      description: description.trim(),
      amount: numAmount,
      type,
      date: parsedDate,
      isPaid: isPaid ? 1 : 0
    };

    if (initialData) {
      await updateDebt(initialData.id, data);
    } else {
      await addDebt(data);
    }

    if (isPaid && (!initialData || initialData.isPaid !== 1) && settlementAccountId) {
      if (onClose) onClose({ settlementAccountId, amount: numAmount, type, personName, description });
    } else {
      if (onClose) onClose();
    }

    HapticFeedback.success();
  };

  return (
    <BaseModalBottom
      visible={visible}
      title={initialData ? 'Editar Dívida' : 'Nova Dívida'}
      onClose={onClose}
      headerRight={
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={activeTheme.textSecondary} />
        </TouchableOpacity>
      }
      footerComponent={
        <View style={styles.footer}>
          {initialData && (initialData.transactionId || initialData.recurrenceId) && onViewTransaction && (
            <TouchableOpacity 
              style={[styles.deleteButton, { backgroundColor: activeTheme.accent + '20', marginRight: 12 * z }]} 
              onPress={() => onViewTransaction(initialData)}
            >
              <Ionicons name="link" size={20 * z} color={activeTheme.accent} style={{ marginRight: 8 * z }} />
              <Text style={[styles.deleteButtonText, { color: activeTheme.accent }]}>Transação</Text>
            </TouchableOpacity>
          )}
          
          {initialData && onDelete && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => {
                onDelete(initialData.id);
                onClose();
              }}
            >
              <Ionicons name="trash-outline" size={20 * z} color={activeTheme.expense} style={{ marginRight: 8 * z }} />
              <Text style={styles.deleteButtonText}>Apagar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ alignItems: 'center', marginVertical: 24 * z }}>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 16 * z, marginBottom: 8 * z, fontFamily: f }}>Valor</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: activeTheme.text, fontSize: 24 * z, fontWeight: 'bold', marginRight: 8 * z, fontFamily: f }}>R$</Text>
                <TextInput
                  style={{ fontSize: 40 * z, fontWeight: 'bold', color: type === 'owe' ? activeTheme.expense : activeTheme.income, minWidth: 120 * z, textAlign: 'center', fontFamily: f }}
                  value={amount}
                  onChangeText={(val) => setAmount(CurrencyUtils.formatCurrency(val))}
                  placeholder="0,00"
                  keyboardType="numeric"
                  placeholderTextColor={activeTheme.textSecondary}
                />
              </View>
            </View>

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
            <AutocompleteInput
              label="Nome"
              placeholder="Ex: João"
              value={personName}
              onChangeText={setPersonName}
              fetchSuggestions={getUniqueNames}
              theme={activeTheme}
            />

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nota / Título (Opcional)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Almoço"
                placeholderTextColor={activeTheme.textSecondary}
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data</Text>
              <CustomDatePicker 
                value={debtDateObj} 
                onChange={setDebtDateObj} 
                theme={activeTheme} 
              />
            </View>

            {/* Is Paid Toggle */}
            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Já foi pago?</Text>
              <Switch
                value={isPaid}
                onValueChange={setIsPaid}
                trackColor={{ false: activeTheme.cardSecondary, true: activeTheme.accent }}
                thumbColor={isPaid ? '#121212' : activeTheme.textSecondary}
              />
            </View>

            {isPaid && (!initialData || initialData.isPaid !== 1) && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Em qual conta o dinheiro movimentou?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                  {accountList.filter(a => a.type !== 'credit').map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accountBtn, settlementAccountId === acc.id && styles.accountBtnActive]}
                      onPress={() => setSettlementAccountId(acc.id)}
                    >
                      <Text style={[styles.accountText, settlementAccountId === acc.id && styles.accountTextActive]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Date */}

    </BaseModalBottom>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
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
