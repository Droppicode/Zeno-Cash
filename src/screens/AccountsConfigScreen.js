import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useAccounts } from '../hooks/useAccounts';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import BaseModalBottom from '../components/ui/BaseModalBottom';
import ListCard from '../components/ui/ListCard';

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
  const [type, setType] = useState('checking'); // checking, credit, cash
  const [balance, setBalance] = useState('0');
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]);
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  
  // Credit specific state
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [associatedAccountId, setAssociatedAccountId] = useState(null);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const checkingAccounts = useMemo(() => accountList.filter(a => a.type !== 'credit'), [accountList]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setType('checking');
    setBalance('0');
    setIcon(ACCOUNT_ICONS[0]);
    setColor(ACCOUNT_COLORS[0]);
    setClosingDay('');
    setDueDay('');
    setCreditLimit('');
    setAssociatedAccountId(checkingAccounts.length > 0 ? checkingAccounts[0].id : null);
    setErrorMsg('');
    setShowEditor(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type || 'checking');
    setBalance(acc.balance.toString());
    setIcon(acc.icon || ACCOUNT_ICONS[0]);
    setColor(acc.color || ACCOUNT_COLORS[0]);
    setClosingDay(acc.closingDay ? acc.closingDay.toString() : '');
    setDueDay(acc.dueDay ? acc.dueDay.toString() : '');
    setCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : '');
    setAssociatedAccountId(acc.associatedAccountId || null);
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

    let payload = {
      name: name.trim(),
      type,
      icon,
      color,
    };

    if (type === 'credit') {
      let cDay = parseInt(closingDay);
      let dDay = parseInt(dueDay);
      let limit = parseFloat(creditLimit.replace(',', '.'));
      if (isNaN(cDay) || cDay < 1 || cDay > 31) return setErrorMsg('Dia de fechamento inválido.');
      if (isNaN(dDay) || dDay < 1 || dDay > 31) return setErrorMsg('Dia de vencimento inválido.');
      if (isNaN(limit)) return setErrorMsg('Limite de crédito inválido.');
      if (!associatedAccountId) return setErrorMsg('Selecione uma conta corrente associada.');

      payload.balance = 0; // Credit cards balance starts at 0 (debt)
      payload.closingDay = cDay;
      payload.dueDay = dDay;
      payload.creditLimit = limit;
      payload.associatedAccountId = associatedAccountId;
    } else {
      payload.balance = numBalance;
      payload.closingDay = null;
      payload.dueDay = null;
      payload.creditLimit = null;
      payload.associatedAccountId = null;
    }

    await saveAcc(editingId, payload);
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
        <Text style={[styles.title, { color: activeTheme.text }]}>Contas e Cartões</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {accountList.map((acc, index) => (
          <ListCard key={acc.id} index={index} total={accountList.length}>
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
                {acc.type === 'credit' ? (
                  <Text style={[styles.accBalance, { color: activeTheme.textSecondary }]}>Cartão de Crédito • Limite: R$ {acc.creditLimit?.toFixed(2)}</Text>
                ) : (
                  <Text style={[styles.accBalance, { color: activeTheme.textSecondary }]}>{acc.type === 'cash' ? 'Dinheiro' : 'Conta Corrente'} • Saldo Inic: R$ {acc.balance.toFixed(2)}</Text>
                )}
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
          </ListCard>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: activeTheme.accent }]} onPress={openNew}>
          <Ionicons name="add" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.addBtnText, { color: activeTheme.accent }]}>Nova Conta ou Cartão</Text>
        </TouchableOpacity>
      </ScrollView>

      <BaseModalBottom
        visible={showEditor}
        title={editingId ? 'Editar Conta/Cartão' : 'Nova Conta/Cartão'}
        onClose={() => setShowEditor(false)}
        onSave={saveAccount}
        errorMsg={errorMsg}
      >
        <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 0 }]}>Tipo</Text>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {['checking', 'credit', 'cash'].map(t => (
            <TouchableOpacity 
              key={t}
              style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: type === t ? activeTheme.accent : activeTheme.cardSecondary, backgroundColor: type === t ? activeTheme.accent + '20' : 'transparent', borderRadius: 8, marginRight: 8, alignItems: 'center' }}
              onPress={() => setType(t)}
            >
              <Text style={{ color: type === t ? activeTheme.accent : activeTheme.textSecondary, fontFamily: f, fontSize: 12*z }}>
                {t === 'checking' ? 'Corrente' : t === 'credit' ? 'Cartão' : 'Dinheiro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!editingId && type !== 'credit' && (
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

        <Text style={[styles.label, { color: activeTheme.textSecondary, marginTop: 0 }]}>Nome da Conta/Cartão</Text>
        <TextInput
          style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
          value={name}
          onChangeText={setName}
          placeholder={type === 'credit' ? "Ex: Cartão Nubank" : "Ex: Conta Nubank, Dinheiro"}
          placeholderTextColor={activeTheme.textSecondary}
        />

        {type !== 'credit' ? (
          <>
            <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Saldo Inicial (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
            />
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Limite de Crédito Total (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              value={creditLimit}
              onChangeText={setCreditLimit}
              keyboardType="numeric"
              placeholder="Ex: 5000,00"
              placeholderTextColor={activeTheme.textSecondary}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Dia Fechamento</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
                  value={closingDay}
                  onChangeText={setClosingDay}
                  keyboardType="numeric"
                  placeholder="Ex: 25"
                  maxLength={2}
                  placeholderTextColor={activeTheme.textSecondary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Dia Vencimento</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="numeric"
                  placeholder="Ex: 05"
                  maxLength={2}
                  placeholderTextColor={activeTheme.textSecondary}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Débito Automático da Fatura na Conta:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {checkingAccounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id}
                  style={[styles.quickBankPill, { borderColor: associatedAccountId === acc.id ? activeTheme.accent : activeTheme.cardSecondary, backgroundColor: associatedAccountId === acc.id ? activeTheme.accent + '20' : 'transparent' }]}
                  onPress={() => setAssociatedAccountId(acc.id)}
                >
                  <Text style={[styles.quickBankText, { color: associatedAccountId === acc.id ? activeTheme.text : activeTheme.textSecondary }]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
              {checkingAccounts.length === 0 && (
                <Text style={{ color: activeTheme.expense, fontSize: 12, fontFamily: f }}>Você precisa criar uma conta corrente primeiro.</Text>
              )}
            </ScrollView>
          </>
        )}

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
      </BaseModalBottom>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    iconBox: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, justifyContent: 'center', alignItems: 'center' },
    accName: { fontSize: 16 * z, fontWeight: 'bold', marginBottom: 2 * z, fontFamily: f },
    accBalance: { fontSize: 12 * z, fontFamily: f },
    quickBankPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 * z, paddingVertical: 8 * z, borderRadius: 16 * z, borderWidth: 1, marginRight: 8 * z },
    quickBankText: { fontSize: 13 * z, fontWeight: 'bold', fontFamily: f }
  });
};
