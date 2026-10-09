import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';
import { HapticFeedback } from '../../utils/haptics';
import AutocompleteInput from '../ui/AutocompleteInput';

export function TransactionTypeTabs({ styles, activeTheme, z, initialData, isContractEdit, txType, setTxType, recurrenceType, setRecurrenceType }) {
  return (
    <>
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
    </>
  );
}

export function AccountSelector({ styles, activeTheme, accountList, selectedAccountId, setSelectedAccountId }) {
  return accountList.length > 0 && (
    <View style={[styles.selectorBlock, { flex: 1 }]}>
      <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Conta</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {accountList.map(acc => (
          <TouchableOpacity
            key={acc.id}
            style={[styles.pill, { backgroundColor: activeTheme.cardSecondary }, selectedAccountId === acc.id && { backgroundColor: activeTheme.accent }]}
            onPress={() => setSelectedAccountId(acc.id)}
          >
            <Text style={[styles.pillText, { color: activeTheme.textSecondary }, selectedAccountId === acc.id && { color: '#121212', fontWeight: 'bold' }]}>{acc.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function CategorySelector({ styles, activeTheme, categoryList, selectedCategoryId, setSelectedCategoryId, isManuallyCategoryModified }) {
  return categoryList.length > 0 && (
    <View style={styles.selectorBlock}>
      <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categoryList.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catPill, { backgroundColor: cat.color + '20', borderColor: cat.color }, selectedCategoryId === cat.id && { backgroundColor: cat.color }]}
            onPress={() => {
              HapticFeedback.select();
              isManuallyCategoryModified.current = true;
              setSelectedCategoryId(prev => prev === cat.id ? null : cat.id);
            }}
          >
            <Ionicons name={cat.icon} size={16} color={selectedCategoryId === cat.id ? '#fff' : cat.color} style={{ marginRight: 4 }} />
            <Text style={[styles.catPillText, { color: selectedCategoryId === cat.id ? '#fff' : cat.color }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function GroupChips({ styles, activeTheme, z, groupList, selectedGroupIds, setSelectedGroupIds, setGroupModalVisible }) {
  return (
    <View style={styles.selectorBlock}>
      <Text style={[styles.label, { color: activeTheme.textSecondary }]}>Grupos</Text>
      <View style={styles.groupChipRow}>
        {groupList.map(group => {
          const selected = selectedGroupIds.includes(group.id);
          const groupColor = group.color || activeTheme.accent;
          return (
            <TouchableOpacity
              key={group.id}
              style={[styles.groupChip, { borderColor: groupColor, backgroundColor: selected ? groupColor : `${groupColor}20` }]}
              onPress={() => setSelectedGroupIds(ids => selected ? ids.filter(id => id !== group.id) : [...ids, group.id])}
            >
              <Ionicons name={group.icon || 'albums'} size={14} color={selected ? '#fff' : groupColor} />
              <Text style={{ color: selected ? '#fff' : groupColor, fontSize: 12 * z }}>{group.name}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={[styles.groupChip, { borderColor: activeTheme.accent, backgroundColor: activeTheme.accent + '20' }]} onPress={() => setGroupModalVisible(true)}>
          <Ionicons name="add" size={16} color={activeTheme.accent} />
          <Text style={{ color: activeTheme.accent, fontSize: 12 * z }}>{groupList.length ? 'Criar' : 'Criar grupo'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function RecurrenceSettings({ styles, activeTheme, z, initialData, isContractEdit, recurrenceType, frequencyType, setFrequencyType, frequencyInterval, setFrequencyInterval, installments, setInstallments, interestRate, setInterestRate, interestType, setInterestType }) {
  return recurrenceType !== 'single' && (!initialData?.id || isContractEdit) && (
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
            <Text style={[styles.toggleText, { fontSize: 12 * z, color: frequencyType === 'custom_days' ? '#000' : activeTheme.textSecondary }]}>Dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, frequencyType === 'monthly' && { backgroundColor: activeTheme.accent }]} onPress={() => setFrequencyType('monthly')}>
            <Text style={[styles.toggleText, { fontSize: 12 * z, color: frequencyType === 'monthly' ? '#000' : activeTheme.textSecondary }]}>Meses</Text>
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
                <Text style={[styles.toggleText, { fontSize: 12 * z, color: interestType === 'simple' ? '#000' : activeTheme.textSecondary }]}>Simples</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, interestType === 'compound' && { backgroundColor: activeTheme.accent }]} onPress={() => setInterestType('compound')}>
                <Text style={[styles.toggleText, { fontSize: 12 * z, color: interestType === 'compound' ? '#000' : activeTheme.textSecondary }]}>Composto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export function SplitDebtsEditor({ styles, activeTheme, z, f, txType, amount, splitDebts, setSplitDebts, isContractEdit, interestRate, getUniqueNames }) {
  const numAmt = CurrencyUtils.parseCurrency(amount);
  let totalSplitAmt = 0;
  splitDebts.forEach(d => {
    const sNum = CurrencyUtils.parseCurrency(d.amount);
    totalSplitAmt += d.isPercentage ? numAmt * (sNum / 100) : sNum;
  });
  const remaining = numAmt - totalSplitAmt;
  return (
    <>
      {txType === 'expense' && (
        <View style={{ marginBottom: 12 * z, padding: 12 * z, backgroundColor: activeTheme.cardSecondary, borderRadius: 6 * z, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: activeTheme.textSecondary, fontFamily: f }}>Total: R$ {CurrencyUtils.formatDisplay(numAmt)}</Text>
          <Text style={{ color: remaining < -0.01 ? activeTheme.expense : activeTheme.text, fontFamily: f, fontWeight: 'bold' }}>Restam: R$ {CurrencyUtils.formatDisplay(remaining)}</Text>
        </View>
      )}
      <Text style={[styles.label, { color: activeTheme.textSecondary, marginBottom: 12 * z }]}>Pessoas na divisão</Text>
      {splitDebts.map((debt, idx) => (
        <View key={idx} style={[styles.splitRow, { backgroundColor: activeTheme.cardSecondary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 * z, marginBottom: 8 * z }}>
            <AutocompleteInput
              style={{ flex: 1, marginBottom: 0 }}
              inputStyle={{ backgroundColor: activeTheme.card, color: activeTheme.text, paddingVertical: 10 * z, padding: undefined, paddingHorizontal: 12 * z, fontSize: styles.inputField.fontSize }}
              placeholder="Nome"
              value={debt.personName}
              onChangeText={text => {
                const newSplits = [...splitDebts];
                newSplits[idx].personName = text;
                setSplitDebts(newSplits);
              }}
              fetchSuggestions={getUniqueNames}
              excludeItems={splitDebts.filter((_, i) => i !== idx).map(d => d.personName)}
              theme={activeTheme}
            />
            <TextInput
              style={[styles.inputField, { backgroundColor: activeTheme.card, color: activeTheme.text, width: 80 * z, marginBottom: 0, paddingVertical: 10 * z }]}
              placeholder={debt.isPercentage ? '%' : 'R$'}
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="numeric"
              value={debt.amount ? String(debt.amount) : ''}
              onChangeText={text => {
                const newSplits = [...splitDebts];
                if (!newSplits[idx].isPercentage) {
                  newSplits[idx].amount = CurrencyUtils.formatCurrency(text);
                } else {
                  newSplits[idx].amount = text.replace('.', ',');
                }
                setSplitDebts(newSplits);
              }}
            />
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: activeTheme.card, paddingVertical: 10 * z, paddingHorizontal: 0, borderRadius: 6 * z, width: 32 * z }]}
              onPress={() => {
                const newSplits = [...splitDebts];
                const d = newSplits[idx];
                if (numAmt > 0 && d.amount) {
                  const sNum = CurrencyUtils.parseCurrency(d.amount);
                  if (d.isPercentage) {
                    const monetaryValue = numAmt * (sNum / 100);
                    d.amount = CurrencyUtils.formatCurrency((monetaryValue * 100).toFixed(0));
                  } else {
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
                <Ionicons name={debt.isPaid ? 'checkmark-circle' : 'ellipse-outline'} size={20 * z} color={debt.isPaid ? activeTheme.income : activeTheme.textSecondary} style={{ marginRight: 6 * z }} />
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
                  <Ionicons name={debt.ignoresInterest ? 'checkbox' : 'square-outline'} size={20 * z} color={debt.ignoresInterest ? activeTheme.accent : activeTheme.textSecondary} style={{ marginRight: 6 * z }} />
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
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 * z, borderWidth: 1, borderColor: activeTheme.accent, borderRadius: 6 * z, marginTop: 8 * z }}
        onPress={() => setSplitDebts([...splitDebts, { personName: '', amount: '', isPaid: false, isPercentage: false, ignoresInterest: false }])}
      >
        <Ionicons name="add" size={20 * z} color={activeTheme.accent} style={{ marginRight: 8 * z }} />
        <Text style={{ color: activeTheme.accent, fontWeight: 'bold', fontFamily: f }}>Adicionar Pessoa</Text>
      </TouchableOpacity>
    </>
  );
}
