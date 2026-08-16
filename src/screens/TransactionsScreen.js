import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, SectionList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { resolveCategory } from '../services/categorizer';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { DateUtils } from '../utils/dateUtils';
import { Swipeable } from 'react-native-gesture-handler';
import TransactionModal from '../components/TransactionModal';
import { getZoomFactor } from '../utils/scaler';

export default function TransactionsScreen() {
  const { activeTheme, uiConfig, defaultPeriod } = React.useContext(SettingsContext);
  const { txList, loadTransactions, saveTransaction, removeTransaction } = useTransactions();
  const { categoryList, loadCategories } = useCategories();
  const { accountList, loadAccounts } = useAccounts();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [period, setPeriod] = useState(defaultPeriod || '30d'); 
  const [accountFilter, setAccountFilter] = useState('all');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCats, setSelectedCats] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const styles = React.useMemo(() => getStyles(activeTheme), [activeTheme]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
      loadAccounts();
    }, [loadTransactions, loadCategories, loadAccounts])
  );

  const filteredList = useMemo(() => {
    return txList.filter(item => {
      const limit = DateUtils.getLimitDateForPeriod(period);
      if (item.date < limit) return false;

      if (filter === 'income' && item.type !== 'income') return false;
      if (filter === 'expense' && item.type !== 'expense') return false;
      if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
      
      const catInfo = resolveCategory(item, categoryList);
      if (selectedCats.length > 0 && !selectedCats.includes(catInfo.categoryName)) {
        return false;
      }
      
      if (search.trim() !== '' && !item.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      if (startDate.length === 10) {
        const sDate = DateUtils.parseDateInput(startDate);
        if (sDate && item.date < sDate) return false;
      }
      
      if (endDate.length === 10) {
        const eDate = DateUtils.parseDateInput(endDate);
        if (eDate && item.date > (eDate + 86400000)) return false; 
      }

      return true;
    });
  }, [txList, period, filter, accountFilter, selectedCats, search, startDate, endDate, categoryList]);

  const uniqueCategories = Array.from(new Set(txList.map(item => resolveCategory(item, categoryList).categoryName)));

  const toggleCategory = (cat) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter(c => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };



  const groupedData = filteredList.reduce((acc, tx) => {
    const d = new Date(tx.date);
    const monthYear = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const sections = Object.keys(groupedData).map(key => ({
    title: key,
    data: groupedData[key]
  }));

  const handleSave = async (data) => {
    // Se a transação for salva/editada, ela deixa de ser pendente
    data.isPending = 0;
    await saveTransaction(data.id, data);
    setModalVisible(false);
    setEditingTx(null);
  };

  const renderRightActions = (tx) => (
    <TouchableOpacity 
      style={[styles.deleteAction, { backgroundColor: activeTheme.expense }]}
      onPress={() => removeTransaction(tx.id)}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={[styles.deleteActionText, { color: '#fff' }]}>Apagar</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index, section }) => {
    const catInfo = resolveCategory(item, categoryList);
    const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    
    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;
    
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
        <TouchableOpacity onPress={() => { setEditingTx(item); setModalVisible(true); }} activeOpacity={0.7}>
          <View style={[
            styles.card, 
            { backgroundColor: activeTheme.card },
            isFirst && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
            isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
            !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 }
          ]}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: item.isPending ? activeTheme.expense + '20' : catInfo.color + '20' }]}>
            {item.isPending ? (
              <Ionicons name="time" size={20} color={activeTheme.expense} />
            ) : (
              <Ionicons name={catInfo.icon} size={20} color={catInfo.color} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[styles.desc, { color: activeTheme.text }]} numberOfLines={1}>{item.description}</Text>
              {item.isPending === 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: '#FF980020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Ionicons name="time-outline" size={10} color="#FF9800" />
                  <Text style={{ color: '#FF9800', fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Pendente</Text>
                </View>
              )}
            </View>
            {item.note ? <Text style={[{ color: activeTheme.textSecondary, fontSize: 11 }]} numberOfLines={1}>{item.note}</Text> : null}
            <Text style={[styles.date, { color: activeTheme.textSecondary }]}>{dateStr} • {catInfo.categoryName} • {item.account}</Text>
          </View>
        </View>
        <Text style={[
          styles.amount, 
          { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }
        ]}>
          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
        </Text>
        </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.card }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: activeTheme.card }]}>
        <View style={[styles.searchBox, { backgroundColor: activeTheme.cardSecondary }]}>
          <Ionicons name="search" size={20} color={activeTheme.textSecondary} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: activeTheme.text }]}
            placeholder="Buscar transação..."
            placeholderTextColor={activeTheme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        {uiConfig.transactionsShowFilters !== false && (
          <View>
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
                <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
                  <TouchableOpacity style={[styles.periodBtn, accountFilter === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setAccountFilter('all')}>
                    <Text style={[styles.periodText, { color: activeTheme.textSecondary }, accountFilter === 'all' && { color: '#121212' }]}>Todas as Contas</Text>
                  </TouchableOpacity>
                  {accountList.map(acc => (
                    <TouchableOpacity key={acc.id} style={[styles.periodBtn, accountFilter === acc.id && { backgroundColor: activeTheme.accent }]} onPress={() => setAccountFilter(acc.id)}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, accountFilter === acc.id && { color: '#121212' }]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.advancedToggleBtn, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setShowAdvanced(!showAdvanced)}>
                <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={20} color={activeTheme.accent} />
              </TouchableOpacity>
            </View>

            {showAdvanced && (
              <View style={{ marginTop: 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={styles.filterScrollContent}>
                  <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
                    <TouchableOpacity style={[styles.filterBtn, filter === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('all')}>
                      <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'all' && { color: '#121212' }]}>Tudo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, filter === 'income' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('income')}>
                      <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'income' && { color: '#121212' }]}>Receitas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, filter === 'expense' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('expense')}>
                      <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'expense' && { color: '#121212' }]}>Despesas</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
                    <TouchableOpacity style={[styles.periodBtn, period === '30d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('30d')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '30d' && { color: '#121212' }]}>30D</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, period === '90d' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('90d')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '90d' && { color: '#121212' }]}>90D</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, period === 'all' && { backgroundColor: activeTheme.accent }]} onPress={() => setPeriod('all')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === 'all' && { color: '#121212' }]}>Sempre</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.dateInputsRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Inicial</Text>
                    <TextInput 
                      style={[styles.dateInput, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={activeTheme.textSecondary}
                      keyboardType="numeric"
                      value={startDate}
                      onChangeText={(text) => setStartDate(DateUtils.formatDateInput(text))}
                      maxLength={10}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Final</Text>
                    <TextInput 
                      style={[styles.dateInput, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={activeTheme.textSecondary}
                      keyboardType="numeric"
                      value={endDate}
                      onChangeText={(text) => setEndDate(DateUtils.formatDateInput(text))}
                      maxLength={10}
                    />
                  </View>
                </View>

                <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Categorias</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScrollContent}>
                  {uniqueCategories.map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.catBtn, { backgroundColor: activeTheme.cardSecondary }, selectedCats.includes(cat) && { backgroundColor: activeTheme.accent }]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <Text style={[styles.catText, { color: activeTheme.textSecondary }, selectedCats.includes(cat) && { color: '#121212' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

      </View>

      <View style={{ flex: 1, backgroundColor: activeTheme.background }}>
        <SectionList 
          sections={sections}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={[styles.sectionHeader, { color: activeTheme.accent }]}>{title}</Text>
          )}
          renderSectionFooter={() => <View style={{ height: 16 }} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: activeTheme.textSecondary }]}>Nenhuma transação encontrada.</Text>}
          stickySectionHeadersEnabled={false}
        />
      </View>

      <TransactionModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingTx(null); }}
        onSave={handleSave}
        initialData={editingTx}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16 * z, borderBottomWidth: 1, borderBottomColor: 'transparent' },
    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12 * z, paddingHorizontal: 12 * z, height: 44 * z, marginBottom: 16 * z },
    searchIcon: { marginRight: 8 * z },
    searchInput: { flex: 1, fontSize: 16 * z, fontFamily: f },
    
    filterContainer: { flexDirection: 'row', alignItems: 'center' },
    filterScroll: { flex: 1, marginRight: 8 * z },
    filterScrollContent: { gap: 8 * z, paddingBottom: 4 * z },
    
    filterGroup: { flexDirection: 'row', borderRadius: 20 * z, padding: 4 * z, alignItems: 'center' },
    filterBtn: { paddingHorizontal: 12 * z, paddingVertical: 6 * z, borderRadius: 16 * z },
    filterText: { fontWeight: 'bold', fontSize: 12 * z, fontFamily: f },
    
    periodBtn: { paddingHorizontal: 10 * z, paddingVertical: 6 * z, borderRadius: 16 * z },
    periodText: { fontWeight: 'bold', fontSize: 12 * z, fontFamily: f },
    
    advancedToggleBtn: { width: 40 * z, height: 40 * z, borderRadius: 20 * z, justifyContent: 'center', alignItems: 'center' },
    
    advancedPanel: { marginTop: 16 * z, padding: 12 * z, borderRadius: 12 * z },
    advancedTitle: { fontWeight: 'bold', marginBottom: 12 * z, fontFamily: f },
    dateInputsRow: { flexDirection: 'row', gap: 12 * z, marginBottom: 16 * z },
    dateInputContainer: { flex: 1 },
    dateLabel: { fontSize: 12 * z, marginBottom: 4 * z, fontFamily: f },
    dateInput: { padding: 10 * z, borderRadius: 8 * z, fontFamily: f },
    
    catScrollContent: { gap: 8 * z, flexDirection: 'row' },
    catBtn: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z },
    catText: { fontWeight: 'bold', fontSize: 12 * z, fontFamily: f },
    
    listContent: { padding: 16 * z, paddingBottom: 40 * z },
    sectionHeader: { fontSize: 16 * z, fontWeight: '700', marginTop: 12 * z, marginBottom: 12 * z, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: f },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, marginBottom: 0 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', marginRight: 14 * z },
    desc: { fontSize: 16 * z, fontWeight: '600', marginBottom: 4 * z, fontFamily: f },
    date: { fontSize: 13 * z, fontFamily: f },
    amount: { fontSize: 16 * z, fontWeight: '700', marginLeft: 8 * z, fontFamily: f },
    emptyText: { textAlign: 'center', marginTop: 40 * z, fontSize: 16 * z, fontFamily: f },
    deleteAction: { width: 80 * z, justifyContent: 'center', alignItems: 'center' },
    deleteActionText: { fontSize: 12 * z, fontWeight: 'bold', marginTop: 4 * z, fontFamily: f }
  });
};
