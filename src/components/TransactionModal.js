import React, { useContext, useEffect, useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import CustomDatePicker from './ui/CustomDatePicker';
import { useNavigation } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../utils/scaler';
import { useDebts } from '../hooks/useDebts';
import { useGroups } from '../hooks/useGroups';
import GroupModal from './GroupModal';
import useTransactionForm from './transaction/useTransactionForm';
import getStyles from './transaction/transactionModalStyles';
import {
  AccountSelector, CategorySelector, GroupChips, RecurrenceSettings,
  SplitDebtsEditor, TransactionTypeTabs
} from './transaction/TransactionModalParts';

export default function TransactionModal({ visible, onClose, onSave, onDelete, initialData, isContractEdit = false, initialSplitMode = false }) {
  const { activeTheme } = useContext(SettingsContext);
  const { accountList, loadAccounts } = useAccounts();
  const { categoryList, loadCategories } = useCategories();
  const { getUniqueNames } = useDebts();
  const { groupList, loadGroups, saveGroup } = useGroups();
  const navigation = useNavigation();
  const form = useTransactionForm({
    visible, initialData, isContractEdit, initialSplitMode, accountList, categoryList, loadGroups
  });
  const {
    errorMsg, amount, description, setDescription, note, setNote, txType,
    setTxType, selectedAccountId, setSelectedAccountId, selectedCategoryId,
    setSelectedCategoryId, selectedGroupIds, setSelectedGroupIds, groupModalVisible,
    setGroupModalVisible, isManuallyCategoryModified, descriptionRef, noteRef, txDateObj,
    setTxDateObj, recurrenceType, setRecurrenceType, frequencyType, setFrequencyType,
    frequencyInterval, setFrequencyInterval, installments, setInstallments, interestRate,
    setInterestRate, interestType, setInterestType, isSplitMode, setIsSplitMode,
    splitDebts, setSplitDebts, handleAmountChange, handleSave
  } = form;
  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f, activeTheme), [z, f, activeTheme]);

  useEffect(() => {
    if (visible) {
      loadAccounts();
      loadCategories();
    }
  }, [visible, loadAccounts, loadCategories]);

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
              <Ionicons name={isSplitMode ? 'close-circle' : 'people'} size={28 * z} color={isSplitMode ? activeTheme.expense : activeTheme.accent} />
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <Text style={{ color: activeTheme.expense, marginBottom: 12, fontWeight: 'bold' }}>{errorMsg}</Text>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
            <TransactionTypeTabs
              styles={styles}
              activeTheme={activeTheme}
              z={z}
              initialData={initialData}
              isContractEdit={isContractEdit}
              txType={txType}
              setTxType={setTxType}
              recurrenceType={recurrenceType}
              setRecurrenceType={setRecurrenceType}
            />

            <TextInput
              style={[styles.inputAmount, { color: activeTheme.text }]}
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              autoFocus={!initialData?.id}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => descriptionRef.current?.focus()}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AccountSelector styles={styles} activeTheme={activeTheme} z={z} accountList={accountList} selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId} />
              <View style={[styles.selectorBlock, { marginLeft: 8 * z, justifyContent: 'flex-end', paddingBottom: 8 * z }]}>
                <Text style={[styles.label, { color: activeTheme.textSecondary, marginBottom: 4 * z }]}>Data</Text>
                <CustomDatePicker
                  value={txDateObj}
                  onChange={setTxDateObj}
                  theme={activeTheme}
                  style={{ minWidth: 110 * z, paddingVertical: 12 * z, marginBottom: 0 }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                ref={descriptionRef}
                style={[styles.inputField, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text, flex: 1 }]}
                placeholder="Título (Ex: Uber, Ifood...)"
                placeholderTextColor={activeTheme.textSecondary}
                value={description}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => noteRef.current?.focus()}
                onChangeText={text => {
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
                ref={noteRef}
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

            <CategorySelector styles={styles} activeTheme={activeTheme} categoryList={categoryList} selectedCategoryId={selectedCategoryId} setSelectedCategoryId={setSelectedCategoryId} isManuallyCategoryModified={isManuallyCategoryModified} />
            <GroupChips styles={styles} activeTheme={activeTheme} z={z} groupList={groupList} selectedGroupIds={selectedGroupIds} setSelectedGroupIds={setSelectedGroupIds} setGroupModalVisible={setGroupModalVisible} />

            <RecurrenceSettings
              styles={styles}
              activeTheme={activeTheme}
              z={z}
              initialData={initialData}
              isContractEdit={isContractEdit}
              recurrenceType={recurrenceType}
              frequencyType={frequencyType}
              setFrequencyType={setFrequencyType}
              frequencyInterval={frequencyInterval}
              setFrequencyInterval={setFrequencyInterval}
              installments={installments}
              setInstallments={setInstallments}
              interestRate={interestRate}
              setInterestRate={setInterestRate}
              interestType={interestType}
              setInterestType={setInterestType}
            />

            {initialData?.recurrenceId && (
              <TouchableOpacity
                style={{ backgroundColor: activeTheme.accent + '20', padding: 16 * z, borderRadius: 6 * z, alignItems: 'center', marginBottom: 16 * z, flexDirection: 'row', justifyContent: 'center' }}
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
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={() => handleSave(onSave)}>
                  <Text style={[styles.btnText, { color: '#121212' }]}>{initialData?.isPending === 1 ? 'Aprovar' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {isSplitMode && (
              <View style={{ marginTop: 8 * z }}>
                <SplitDebtsEditor
                  styles={styles}
                  activeTheme={activeTheme}
                  z={z}
                  f={f}
                  txType={txType}
                  amount={amount}
                  splitDebts={splitDebts}
                  setSplitDebts={setSplitDebts}
                  isContractEdit={isContractEdit}
                  interestRate={interestRate}
                  getUniqueNames={getUniqueNames}
                />
                <View style={[styles.modalActions, { marginTop: 24 * z }]}>
                  <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setIsSplitMode(false)}>
                    <Text style={[styles.btnText, { color: activeTheme.text }]}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={() => setIsSplitMode(false)}>
                    <Text style={[styles.btnText, { color: '#121212' }]}>Pronto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <GroupModal
        visible={groupModalVisible}
        theme={activeTheme}
        onClose={() => setGroupModalVisible(false)}
        onSave={async (id, data) => {
          const newId = await saveGroup(id, data);
          await loadGroups();
          if (!id && newId) setSelectedGroupIds(ids => [...ids, newId]);
          return newId;
        }}
      />
    </Modal>
  );
}
