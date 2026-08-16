import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useAccounts } from '../hooks/useAccounts';
import { getZoomFactor } from '../utils/scaler';

const ACCOUNT_ICONS = ['wallet-outline', 'card-outline', 'business-outline', 'cash-outline', 'logo-bitcoin', 'bar-chart-outline'];
const ACCOUNT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B'];

const QUICK_BANKS = [
  { name: 'Nubank', color: '#8A05BE', icon: 'https://www.google.com/s2/favicons?domain=nubank.com.br&sz=128' },
  { name: 'Inter', color: '#FF7A00', icon: 'https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=128' },
  { name: 'Itaú', color: '#EC7000', icon: 'https://www.google.com/s2/favicons?domain=itau.com.br&sz=128' },
  { name: 'Santander', color: '#CC0000', icon: 'https://www.google.com/s2/favicons?domain=santander.com.br&sz=128' },
  { name: 'Mercado Pago', color: '#00B1EA', icon: 'https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=128' },
  { name: 'Dinheiro', color: '#4CAF50', icon: 'wallet-outline' }
];

export default function AccountsConfigScreen({ onBack }) {
  const { activeTheme } = useContext(SettingsContext);
  const { accountList, loadAccounts, saveAccount: saveAcc, deleteAccount: delAcc } = useAccounts();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]);
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setBalance('0');
    setIcon(ACCOUNT_ICONS[0]);
    setColor(ACCOUNT_COLORS[0]);
    setErrorMsg('');
    setShowEditor(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setName(acc.name);
    setBalance(acc.balance.toString());
    setIcon(acc.icon || ACCOUNT_ICONS[0]);
    setColor(acc.color || ACCOUNT_COLORS[0]);
    setErrorMsg('');
    setShowEditor(true);
  };

  const saveAccount = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('O nome da conta é obrigatório.');
      return;
    }
    
    let numBalance = parseFloat(balance.replace(',', '.'));
    if (isNaN(numBalance)) numBalance = 0;

    await saveAcc(editingId, {
      name: name.trim(),
      balance: numBalance,
      icon,
      color,
      type: 'checking'
    });
    
    setShowEditor(false);
  };

  const deleteAccount = (id) => {
    Alert.alert('Apagar Conta', 'Tem certeza? As transações atreladas a ela podem ficar sem referência.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        await delAcc(id);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Contas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {accountList.map((acc, index) => (
          <View key={acc.id} style={[
            styles.accountCard, 
            { backgroundColor: activeTheme.cardSecondary },
            index === 0 && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
            index === accountList.length - 1 && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
            index !== accountList.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: acc.color + '20' }]}>
                {acc.icon && acc.icon.startsWith('http') ? (
                  <Image source={{ uri: acc.icon }} style={{ width: 20, height: 20, borderRadius: 4 }} />
                ) : (
                  <Ionicons name={acc.icon || 'wallet-outline'} size={20} color={acc.color || activeTheme.text} />
                )}
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.accName, { color: activeTheme.text }]}>{acc.name}</Text>
                <Text style={[styles.accBalance, { color: activeTheme.textSecondary }]}>Saldo Inicial: R$ {acc.balance.toFixed(2)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(acc)}>
                <Ionicons name="pencil" size={20} color={activeTheme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => deleteAccount(acc.id)}>
                <Ionicons name="trash" size={20} color={activeTheme.expense} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: activeTheme.accent }]} onPress={openNew}>
          <Ionicons name="add" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.addBtnText, { color: activeTheme.accent }]}>Nova Conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEditor} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: activeTheme.card }]}>
            <Text style={[styles.modalTitle, { color: activeTheme.text }]}>
              {editingId ? 'Editar Conta' : 'Nova Conta'}
            </Text>

            {errorMsg ? (
              <Text style={{ color: activeTheme.expense, marginBottom: 12, fontWeight: 'bold' }}>{errorMsg}</Text>
            ) : null}

            {!editingId && (
              <View>
                <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 0 }]}>Bancos Rápidos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {QUICK_BANKS.map(bank => (
                    <TouchableOpacity 
                      key={bank.name}
                      style={[styles.quickBankPill, { borderColor: bank.color, backgroundColor: bank.color + '15' }]}
                      onPress={() => {
                        setName(bank.name);
                        setColor(bank.color);
                        setIcon(bank.icon);
                      }}
                    >
                      {bank.icon.startsWith('http') ? (
                        <Image source={{ uri: bank.icon }} style={{ width: 14, height: 14, borderRadius: 2, marginRight: 6 }} />
                      ) : (
                        <Ionicons name={bank.icon} size={14} color={bank.color} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.quickBankText, { color: bank.color }]}>{bank.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: editingId ? 12 : 0 }]}>Nome da Conta</Text>
            <TextInput
              style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank, Inter, Dinheiro"
              placeholderTextColor={activeTheme.textSecondary}
            />

            <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Saldo Inicial (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
            />

            <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Ícone</Text>
            {icon && icon.startsWith('http') && (
               <View style={{ marginBottom: 12, alignItems: 'center' }}>
                 <Image source={{ uri: icon }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                 <Text style={{ fontSize: 12, color: activeTheme.textSecondary, marginTop: 4 }}>Logo via Web</Text>
               </View>
            )}
            <View style={styles.pickerRow}>
              {ACCOUNT_ICONS.map(i => (
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
              {ACCOUNT_COLORS.map(c => (
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
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={saveAccount}>
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
  
  accountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, marginBottom: 12 * z },
  iconBox: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, justifyContent: 'center', alignItems: 'center' },
  accName: { fontSize: 16 * z, fontWeight: 'bold', marginBottom: 2 * z, fontFamily: f },
  accBalance: { fontSize: 12 * z, fontFamily: f },
  actionBtn: { width: 36 * z, height: 36 * z, justifyContent: 'center', alignItems: 'center', marginLeft: 4 * z },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 * z, borderRadius: 12 * z, borderWidth: 1, borderStyle: 'dashed', marginTop: 12 * z },
  addBtnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24 * z, borderTopRightRadius: 24 * z, padding: 24 * z },
  modalTitle: { fontSize: 22 * z, fontWeight: 'bold', marginBottom: 20 * z, fontFamily: f },
  label: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 8 * z, marginTop: 12 * z, fontFamily: f },
  input: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, marginBottom: 4 * z, fontFamily: f },
  
  pickerRow: { flexDirection: 'row', gap: 12 * z, marginBottom: 4 * z, flexWrap: 'wrap' },
  pickerItem: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  colorItem: { width: 36 * z, height: 36 * z, borderRadius: 18 * z },
  
  modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 32 * z },
  btnCancel: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnSave: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
  btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  
  quickBankPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 * z, paddingVertical: 8 * z, borderRadius: 16 * z, borderWidth: 1, marginRight: 8 * z },
  quickBankText: { fontSize: 13 * z, fontWeight: 'bold', fontFamily: f }
});
