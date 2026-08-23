import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { getZoomFactor } from '../utils/scaler';
import BaseModalBottom from './ui/BaseModalBottom';

export default function PayInvoiceModal({ visible, onClose, invoice, onPay }) {
  const { activeTheme } = useContext(SettingsContext);
  const styles = getStyles(activeTheme);
  
  const [payType, setPayType] = useState('full'); // 'full', 'current', 'custom'
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (visible) {
      setPayType('full');
      setCustomAmount('');
    }
  }, [visible]);

  if (!invoice) return null;

  const currentMonthRemaining = invoice ? Math.max(0, (invoice.cycleExpenses || 0) - (invoice.cyclePayments || 0)) : 0;

  const handleConfirm = () => {
    let amountToPay = 0;
    if (payType === 'full') {
      amountToPay = invoice.closingBalance;
    } else if (payType === 'current') {
      amountToPay = currentMonthRemaining; // Paga apenas o que gastou neste mês descontando os pagamentos parciais
    } else {
      amountToPay = parseFloat(customAmount.replace(',', '.'));
      if (isNaN(amountToPay) || amountToPay <= 0) {
        alert('Insira um valor válido para o pagamento parcial.');
        return;
      }
    }
    
    if (amountToPay > invoice.closingBalance) {
      alert('O valor do pagamento não pode ser maior que o saldo devedor da fatura.');
      return;
    }

    onPay(amountToPay);
  };

  return (
    <BaseModalBottom
      visible={visible}
      title="Pagar Fatura"
      onClose={onClose}
      headerRight={
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={activeTheme.textSecondary} />
        </TouchableOpacity>
      }
      footerComponent={
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirmar Pagamento</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.invoiceSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fatura Anterior:</Text>
                <Text style={styles.summaryValue}>R$ {invoice.previousBalance?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gastos do Mês:</Text>
                <Text style={styles.summaryValue}>R$ {invoice.cycleExpenses?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total da Fatura:</Text>
                <Text style={[styles.summaryValue, { color: activeTheme.expense, fontWeight: 'bold' }]}>
                  R$ {invoice.closingBalance?.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Como deseja pagar?</Text>
            
            <TouchableOpacity 
              style={[styles.optionCard, payType === 'full' && styles.optionCardActive]} 
              onPress={() => setPayType('full')}
            >
              <View style={styles.radio}>
                {payType === 'full' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Pagamento Integral</Text>
                <Text style={styles.optionDesc}>Pagar o valor total e ficar em dia.</Text>
              </View>
              <Text style={styles.optionAmount}>R$ {invoice.closingBalance?.toFixed(2)}</Text>
            </TouchableOpacity>

            {invoice.previousBalance > 0 && (
              <TouchableOpacity 
                style={[styles.optionCard, payType === 'current' && styles.optionCardActive]} 
                onPress={() => setPayType('current')}
              >
                <View style={styles.radio}>
                  {payType === 'current' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Apenas Mês Atual</Text>
                  <Text style={styles.optionDesc}>Ignorar a fatura anterior que não foi paga.</Text>
                </View>
                <Text style={styles.optionAmount}>R$ {currentMonthRemaining.toFixed(2)}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.optionCard, payType === 'custom' && styles.optionCardActive]} 
              onPress={() => setPayType('custom')}
            >
              <View style={styles.radio}>
                {payType === 'custom' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Pagamento Parcial</Text>
                <Text style={styles.optionDesc}>Escolher um valor específico para pagar.</Text>
              </View>
            </TouchableOpacity>

            {payType === 'custom' && (
              <View style={styles.customInputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={activeTheme.textSecondary}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  autoFocus
                />
              </View>
            )}

    </BaseModalBottom>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    closeBtn: {
      padding: 4 * z,
    },
    invoiceSummary: {
      backgroundColor: theme.card,
      padding: 16 * z,
      borderRadius: 12 * z,
      marginBottom: 20 * z,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8 * z,
    },
    summaryLabel: {
      color: theme.textSecondary,
      fontSize: 14 * z,
      fontFamily: f,
    },
    summaryValue: {
      color: theme.text,
      fontSize: 14 * z,
      fontFamily: f,
    },
    sectionTitle: {
      fontSize: 16 * z,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: f,
      marginBottom: 12 * z,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16 * z,
      borderRadius: 12 * z,
      marginBottom: 12 * z,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    optionCardActive: {
      borderColor: theme.accent,
      backgroundColor: theme.accent + '15',
    },
    radio: {
      width: 20 * z,
      height: 20 * z,
      borderRadius: 10 * z,
      borderWidth: 2,
      borderColor: theme.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12 * z,
    },
    radioInner: {
      width: 10 * z,
      height: 10 * z,
      borderRadius: 5 * z,
      backgroundColor: theme.accent,
    },
    optionTitle: {
      color: theme.text,
      fontSize: 15 * z,
      fontWeight: 'bold',
      fontFamily: f,
    },
    optionDesc: {
      color: theme.textSecondary,
      fontSize: 12 * z,
      fontFamily: f,
      marginTop: 2 * z,
    },
    optionAmount: {
      color: theme.text,
      fontSize: 15 * z,
      fontWeight: 'bold',
      fontFamily: f,
    },
    customInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12 * z,
      paddingHorizontal: 16 * z,
      marginBottom: 20 * z,
    },
    currencySymbol: {
      color: theme.textSecondary,
      fontSize: 20 * z,
      fontFamily: f,
      marginRight: 8 * z,
    },
    customInput: {
      flex: 1,
      color: theme.text,
      fontSize: 24 * z,
      fontFamily: f,
      fontWeight: 'bold',
      paddingVertical: 12 * z,
    },
    confirmBtn: {
      backgroundColor: theme.accent,
      padding: 16 * z,
      borderRadius: 12 * z,
      alignItems: 'center',
      marginTop: 12 * z,
    },
    confirmBtnText: {
      color: '#121212',
      fontSize: 16 * z,
      fontWeight: 'bold',
      fontFamily: f,
    },
  });
};
