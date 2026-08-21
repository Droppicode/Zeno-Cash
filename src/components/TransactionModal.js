import React, { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { categorizeTransaction } from '../services/categorizer';
import { DateUtils } from '../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../utils/scaler';
import { DebtsRepository } from '../services/DebtsRepository';
import { HapticFeedback } from '../utils/haptics';

export default function TransactionModal({ visible, onClose, onSave, onDelete, initialData, isContractEdit = false, initialSplitMode = false }) {
  const { activeTheme } = useContext(SettingsContext);
  const { accountList, loadAccounts } = useAccounts();
  const { categoryList, loadCategories } = useCategories();
  const navigation = useNavigation();
  
  const [errorMsg, setErrorMsg] = useState('');
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [txType, setTxType] = useState('expense');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const isManuallyCategoryModified = useRef(false);
  const [txDateObj, setTxDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Estados para Recorrência
  const [recurrenceType, setRecurrenceType] = useState('single'); // single, subscription, installment
  const [frequencyType, setFrequencyType] = useState('monthly'); // custom_days, monthly, yearly
  const [frequencyInterval, setFrequencyInterval] = useState('1');
  const [installments, setInstallments] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState('simple'); // simple, compound

  // Estados para Divisão de Contas
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitDebts, setSplitDebts] = useState([]);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f, activeTheme), [z, f, activeTheme]);

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
      
      setTxDateObj(new Date(initialData.date || initialData.startDate || Date.now()));
      
      if (initialData.frequencyType) {
        setRecurrenceType(initialData.installments ? 'installment' : 'subscription');
        setFrequencyType(initialData.frequencyType);
        setFrequencyInterval(initialData.frequencyInterval?.toString() || '1');
        setInstallments(initialData.installments?.toString() || '');
        setInterestRate(initialData.interestRate?.toString() || '');
        setInterestType(initialData.interestType || 'simple');
      } else {
        setRecurrenceType('single');
        setFrequencyType('monthly');
        setFrequencyInterval('1');
        setInstallments('');
        setInterestRate('');
        setInterestType('simple');
      }
      
      setIsSplitMode(initialSplitMode);
      
      if (initialData.id) {
        if (isContractEdit) {
          DebtsRepository.getByRecurrenceId(initialData.id).then(debts => {
            setSplitDebts(debts.map(d => ({
              id: d.id,
              personName: d.personName,
              amount: d.isPercentage ? String((d.amount / initialData.amount * 100).toFixed(2)).replace('.00', '').replace('.', ',') : formatCurrency((d.amount * 100).toFixed(0)),
              isPaid: d.isPaid === 1,
              isPercentage: d.isPercentage === 1,
              ignoresInterest: d.ignoresInterest === 1,
              date: d.date
            })));
          });
        } else {
          DebtsRepository.getByTransactionId(initialData.id).then(debts => {
            setSplitDebts(debts.map(d => ({
              id: d.id,
              personName: d.personName,
              amount: d.isPercentage ? String((d.amount / initialData.amount * 100).toFixed(2)).replace('.00', '').replace('.', ',') : formatCurrency((d.amount * 100).toFixed(0)),
              isPaid: d.isPaid === 1,
              isPercentage: d.isPercentage === 1,
              ignoresInterest: d.ignoresInterest === 1,
              date: d.date
            })));
          });
        }
      } else {
        setSplitDebts([]);
      }

      setErrorMsg('');
    } else if (visible) {
      setAmount('');
      setDescription('');
      setNote('');
      setTxType('expense');
      setSelectedAccountId(accountList.length > 0 ? accountList[0].id : null);
      setSelectedCategoryId(null);
      setErrorMsg('');
      setRecurrenceType('single');
      setFrequencyType('monthly');
      setFrequencyInterval('1');
      setInstallments('');
      setInterestRate('');
      setInterestType('simple');
      
      setIsSplitMode(initialSplitMode);
      setSplitDebts([]);
      
      setTxDateObj(new Date());
    }
    isManuallyCategoryModified.current = false;
  }, [visible, initialData, accountList]);

  // Auto-categorize only if the user hasn't manually selected a category and we are not editing
  // Auto-categorize only if the user hasn't manually selected a category and we are not editing (or if editing a pending tx and title changed)
  useEffect(() => {
    if (visible && !isManuallyCategoryModified.current && !selectedCategoryId && description.length > 2 && categoryList.length > 0) {
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
    
    let totalSplit = 0;
    const processedSplits = splitDebts.map(d => {
      const splitRaw = String(d.amount).replace(/\./g, '').replace(',', '.');
      const splitNum = parseFloat(splitRaw) || 0;
      const finalVal = d.isPercentage ? numAmount * (splitNum / 100) : splitNum;
      totalSplit += finalVal;
      return {
        ...d,
        amount: finalVal,
      };
    });

    if (txType === 'expense' && splitDebts.length > 0) {
      if (numAmount - totalSplit < -0.01) {
        setErrorMsg('A soma das divisões não pode ultrapassar o valor total da despesa.');
        return;
      }
    }

    HapticFeedback.success();
    onSave({
      id: initialData?.id,
      _tempId: initialData?._tempId,
      amount: numAmount,
      description: description.trim(),
      note: note.trim(),
      date: txDateObj.getTime(),
      type: txType,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      recurrenceType,
      recurrenceData: recurrenceType === 'single' ? null : {
        frequencyType,
        frequencyInterval: parseInt(frequencyInterval) || 1,
        installments: recurrenceType === 'installment' ? parseInt(installments) : null,
        interestRate: parseFloat(interestRate) || 0,
        interestType
      },
      splitDebts: processedSplits,
      isPending: initialData?.isPending === 1 ? 0 : undefined
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
        <View style={[styles.modalContent, { backgroundColor: activeTheme.card, flexShrink: 1 }, isSplitMode && { flex: 1, maxHeight: '100%', marginTop: 40 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 * z }}>
            <Text style={[styles.modalTitle, { color: activeTheme.text, marginBottom: 0 }]}>
              {isSplitMode ? 'Dividir Conta' : (initialData?.id ? 'Editar Transação' : 'Nova Transação')}
            </Text>
            <TouchableOpacity onPress={() => setIsSplitMode(!isSplitMode)}>
              <Ionicons name={isSplitMode ? "close-circle" : "people"} size={28 * z} color={isSplitMode ? activeTheme.expense : activeTheme.accent} />
            </TouchableOpacity>
          </View>
          
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

            {/* Abas de Tipo de Transação */}
            {(!initialData?.id || isContractEdit) && (
              <View style={[styles.toggleContainer, { backgroundColor: activeTheme.cardSecondary, marginBottom: 24 * z }]}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, recurrenceType === 'single' && { backgroundColor: activeTheme.accent }, isContractEdit && { opacity: 0.5 }]} 
                  onPress={() => {
                    if (!isContractEdit) setRecurrenceType('single');
                  }}
                  disabled={isContractEdit}
                >
                  <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, recurrenceType === 'single' && { color: '#121212' }]}>Única</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, recurrenceType === 'subscription' && { backgroundColor: activeTheme.accent }]} 
                  onPress={() => setRecurrenceType('subscription')}
                >
                  <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, recurrenceType === 'subscription' && { color: '#121212' }]}>Assinatura</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, recurrenceType === 'installment' && { backgroundColor: activeTheme.accent }]} 
                  onPress={() => setRecurrenceType('installment')}
                >
                  <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, recurrenceType === 'installment' && { color: '#121212' }]}>Parcelada</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput 
              style={[styles.inputAmount, { color: activeTheme.text }]}
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              autoFocus={!initialData?.id}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {accountList.length > 0 && (
                <View style={[styles.selectorBlock, { flex: 1 }]}>
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

              <View style={[styles.selectorBlock, { marginLeft: 8 * z, justifyContent: 'flex-end', paddingBottom: 8 * z }]}>
                <Text style={[styles.label, { color: activeTheme.textSecondary, marginBottom: 4*z }]}>Data</Text>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={txDateObj}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) setTxDateObj(selectedDate);
                    }}
                    themeVariant={activeTheme.card === '#121212' ? 'dark' : 'light'}
                    style={{ minWidth: 110 * z }}
                  />
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.inputField, { backgroundColor: activeTheme.cardSecondary, minWidth: 110 * z, paddingVertical: 12 * z, marginBottom: 0, alignItems: 'center', justifyContent: 'center' }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: activeTheme.text }}>
                        {txDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={txDateObj}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) setTxDateObj(selectedDate);
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                style={[styles.inputField, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text, flex: 1 }]}
                placeholder="Título (Ex: Uber, Ifood...)"
                placeholderTextColor={activeTheme.textSecondary}
                value={description}
                onChangeText={(text) => {
                  isManuallyCategoryModified.current = false;
                  setDescription(text);
                }}
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
                      onPress={() => {
                        HapticFeedback.select();
                        isManuallyCategoryModified.current = true;
                        setSelectedCategoryId(prev => prev === cat.id ? null : cat.id);
                      }}
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

            {/* Configurações de Recorrência */}
            {recurrenceType !== 'single' && (!initialData?.id || isContractEdit) && (
              <View style={[styles.recurrenceBox, { backgroundColor: activeTheme.cardSecondary }]}>
                <Text style={[styles.label, { color: activeTheme.text }]}>Configuração da {recurrenceType === 'subscription' ? 'Assinatura' : 'Parcela'}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8 * z, marginTop: 8 * z }}>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, flex: 1, marginBottom: 0 }]}
                    placeholder="A cada..."
                    placeholderTextColor={activeTheme.textSecondary}
                    keyboardType="numeric"
                    value={frequencyInterval}
                    onChangeText={setFrequencyInterval}
                  />
                  <View style={[styles.toggleContainer, { flex: 2, marginBottom: 0, backgroundColor: activeTheme.card }]}>
                    <TouchableOpacity style={[styles.toggleBtn, frequencyType === 'custom_days' && { backgroundColor: activeTheme.accent }]} onPress={() => setFrequencyType('custom_days')}>
                      <Text style={[styles.toggleText, { fontSize: 12*z, color: frequencyType === 'custom_days' ? '#000' : activeTheme.textSecondary }]}>Dias</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, frequencyType === 'monthly' && { backgroundColor: activeTheme.accent }]} onPress={() => setFrequencyType('monthly')}>
                      <Text style={[styles.toggleText, { fontSize: 12*z, color: frequencyType === 'monthly' ? '#000' : activeTheme.textSecondary }]}>Meses</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {recurrenceType === 'installment' && (
                  <>
                    <TextInput 
                      style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, marginTop: 8 * z, marginBottom: 0 }]}
                      placeholder="Qtd. de Parcelas (ex: 12)"
                      placeholderTextColor={activeTheme.textSecondary}
                      keyboardType="numeric"
                      value={installments}
                      onChangeText={setInstallments}
                    />
                    
                    <View style={{ flexDirection: 'row', gap: 8 * z, marginTop: 8 * z }}>
                      <TextInput 
                        style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, flex: 1, marginBottom: 0 }]}
                        placeholder="Juros % (Opcional)"
                        placeholderTextColor={activeTheme.textSecondary}
                        keyboardType="numeric"
                        value={interestRate}
                        onChangeText={setInterestRate}
                      />
                      <View style={[styles.toggleContainer, { flex: 1.5, marginBottom: 0, backgroundColor: activeTheme.card }]}>
                        <TouchableOpacity style={[styles.toggleBtn, interestType === 'simple' && { backgroundColor: activeTheme.accent }]} onPress={() => setInterestType('simple')}>
                          <Text style={[styles.toggleText, { fontSize: 12*z, color: interestType === 'simple' ? '#000' : activeTheme.textSecondary }]}>Simples</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, interestType === 'compound' && { backgroundColor: activeTheme.accent }]} onPress={() => setInterestType('compound')}>
                          <Text style={[styles.toggleText, { fontSize: 12*z, color: interestType === 'compound' ? '#000' : activeTheme.textSecondary }]}>Composto</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
            {initialData?.recurrenceId && (
              <TouchableOpacity 
                style={{ backgroundColor: activeTheme.accent + '20', padding: 16 * z, borderRadius: 12 * z, alignItems: 'center', marginBottom: 16 * z, flexDirection: 'row', justifyContent: 'center' }}
                onPress={() => {
                  onClose();
                  navigation.navigate('RecurrenceDetails', { id: initialData.recurrenceId });
                }}
              >
                <Ionicons name="documents-outline" size={20 * z} color={activeTheme.accent} style={{ marginRight: 8 * z }} />
                <Text style={{ color: activeTheme.accent, fontWeight: 'bold', fontSize: 16 * z }}>Ver Detalhes do Contrato</Text>
              </TouchableOpacity>
            )}

            {!isSplitMode && (
              <View style={styles.modalActions}>
                {initialData?.id && onDelete && (
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => {
                      onDelete(initialData);
                      onClose();
                    }}
                  >
                    <Ionicons name="trash-outline" size={20 * z} color={activeTheme.expense} style={{ marginRight: 8 * z }} />
                    <Text style={styles.deleteButtonText}>Apagar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={onClose}>
                  <Text style={[styles.btnText, { color: activeTheme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={handleSave}>
                  <Text style={[styles.btnText, { color: '#121212' }]}>{initialData?.isPending === 1 ? 'Aprovar' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {isSplitMode && (() => {
              const rawAmt = amount.replace(/\./g, '').replace(',', '.');
              const numAmt = parseFloat(rawAmt) || 0;
              let totalSplitAmt = 0;
              splitDebts.forEach(d => {
                const sRaw = String(d.amount).replace(/\./g, '').replace(',', '.');
                const sNum = parseFloat(sRaw) || 0;
                totalSplitAmt += d.isPercentage ? numAmt * (sNum / 100) : sNum;
              });
              const remaining = numAmt - totalSplitAmt;

              return (
              <View style={{ marginTop: 8 * z }}>
                {txType === 'expense' && (
                  <View style={{ marginBottom: 12 * z, padding: 12 * z, backgroundColor: activeTheme.cardSecondary, borderRadius: 12 * z, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: activeTheme.textSecondary, fontFamily: f }}>Total: R$ {numAmt.toFixed(2)}</Text>
                    <Text style={{ color: remaining < -0.01 ? activeTheme.expense : activeTheme.text, fontFamily: f, fontWeight: 'bold' }}>
                      Restam: R$ {remaining.toFixed(2)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.label, { color: activeTheme.textSecondary, marginBottom: 12 * z }]}>Pessoas na divisão</Text>
                {splitDebts.map((debt, idx) => (
                  <View key={idx} style={[styles.splitRow, { backgroundColor: activeTheme.cardSecondary }]}>
                    <View style={{ flexDirection: 'row', gap: 8 * z, marginBottom: 8 * z }}>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, flex: 1, marginBottom: 0, paddingVertical: 10 * z }]}
                        placeholder="Nome"
                        placeholderTextColor={activeTheme.textSecondary}
                        value={debt.personName}
                        onChangeText={(text) => {
                          const newSplits = [...splitDebts];
                          newSplits[idx].personName = text;
                          setSplitDebts(newSplits);
                        }}
                      />
                      <TextInput
                        style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, width: 80 * z, marginBottom: 0, paddingVertical: 10 * z }]}
                        placeholder={debt.isPercentage ? "%" : "R$"}
                        placeholderTextColor={activeTheme.textSecondary}
                        keyboardType="numeric"
                        value={debt.amount ? String(debt.amount) : ''}
                        onChangeText={(text) => {
                          const newSplits = [...splitDebts];
                          if (!newSplits[idx].isPercentage) {
                            newSplits[idx].amount = formatCurrency(text);
                          } else {
                            newSplits[idx].amount = text.replace('.', ',');
                          }
                          setSplitDebts(newSplits);
                        }}
                      />
                      <TouchableOpacity 
                        style={[styles.toggleBtn, { backgroundColor: activeTheme.card, paddingVertical: 10 * z, paddingHorizontal: 0, borderRadius: 12 * z, width: 32 * z }]}
                        onPress={() => {
                          const newSplits = [...splitDebts];
                          const d = newSplits[idx];
                          
                          if (numAmt > 0 && d.amount) {
                            const sRaw = String(d.amount).replace(/\./g, '').replace(',', '.');
                            const sNum = parseFloat(sRaw) || 0;
                            
                            if (d.isPercentage) {
                              // Convert % to $
                              const monetaryValue = numAmt * (sNum / 100);
                              d.amount = formatCurrency((monetaryValue * 100).toFixed(0));
                            } else {
                              // Convert $ to %
                              d.amount = String((sNum / numAmt * 100).toFixed(2)).replace('.00', '').replace('.', ',');
                            }
                          } else {
                            d.amount = '';
                          }
                          
                          d.isPercentage = !d.isPercentage;
                          setSplitDebts(newSplits);
                        }}
                      >
                        <Text style={{ color: activeTheme.accent, fontWeight: 'bold' }}>{debt.isPercentage ? '%' : '$'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', gap: 12 * z }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => {
                            const newSplits = [...splitDebts];
                            newSplits[idx].isPaid = !newSplits[idx].isPaid;
                            setSplitDebts(newSplits);
                          }}
                        >
                          <Ionicons name={debt.isPaid ? "checkmark-circle" : "ellipse-outline"} size={20 * z} color={debt.isPaid ? activeTheme.income : activeTheme.textSecondary} style={{ marginRight: 6 * z }} />
                          <Text style={{ color: debt.isPaid ? activeTheme.income : activeTheme.textSecondary, fontFamily: f }}>Já pagou?</Text>
                        </TouchableOpacity>

                        {isContractEdit && parseFloat(interestRate) > 0 && (
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                              const newSplits = [...splitDebts];
                              newSplits[idx].ignoresInterest = !newSplits[idx].ignoresInterest;
                              setSplitDebts(newSplits);
                            }}
                          >
                            <Ionicons name={debt.ignoresInterest ? "checkbox" : "square-outline"} size={20 * z} color={debt.ignoresInterest ? activeTheme.accent : activeTheme.textSecondary} style={{ marginRight: 6 * z }} />
                            <Text style={{ color: debt.ignoresInterest ? activeTheme.accent : activeTheme.textSecondary, fontFamily: f }}>Sem Juros</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <TouchableOpacity onPress={() => {
                        const newSplits = [...splitDebts];
                        newSplits.splice(idx, 1);
                        setSplitDebts(newSplits);
                      }}>
                        <Ionicons name="trash" size={20 * z} color={activeTheme.expense} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 * z, borderWidth: 1, borderColor: activeTheme.accent, borderRadius: 12 * z, marginTop: 8 * z }}
                  onPress={() => {
                    setSplitDebts([...splitDebts, { personName: '', amount: '', isPaid: false, isPercentage: false, ignoresInterest: false }]);
                  }}
                >
                  <Ionicons name="add" size={20 * z} color={activeTheme.accent} style={{ marginRight: 8 * z }} />
                  <Text style={{ color: activeTheme.accent, fontWeight: 'bold', fontFamily: f }}>Adicionar Pessoa</Text>
                </TouchableOpacity>

                <View style={[styles.modalActions, { marginTop: 24 * z }]}>
                  <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setIsSplitMode(false)}>
                    <Text style={[styles.btnText, { color: activeTheme.text }]}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={() => setIsSplitMode(false)}>
                    <Text style={[styles.btnText, { color: '#121212' }]}>Pronto</Text>
                  </TouchableOpacity>
                </View>
              </View>
              );
            })()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (z, f, theme) => StyleSheet.create({
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
  deleteButton: { flex: 1, backgroundColor: theme?.expense ? theme.expense + '15' : '#FF4B4B15', padding: 16 * z, borderRadius: 12 * z, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 8 * z },
  deleteButtonText: { color: theme?.expense || '#FF4B4B', fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  clearBtn: { padding: 12 * z, marginLeft: 8 * z, justifyContent: 'center', alignItems: 'center' },
  recurrenceBox: { padding: 16 * z, borderRadius: 12 * z, marginBottom: 16 * z },
  splitRow: { padding: 12 * z, borderRadius: 12 * z, marginBottom: 12 * z }
});
