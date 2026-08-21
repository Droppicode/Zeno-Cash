import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, SectionList, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { resolveCategory } from '../services/categorizer';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { DateUtils } from '../utils/dateUtils';
import SwipeableCard from '../components/ui/SwipeableCard';
import TransactionModal from '../components/TransactionModal';
import BaseModalCenter from '../components/ui/BaseModalCenter';
import { useDebts } from '../hooks/useDebts';
import { getZoomFactor } from '../utils/scaler';
import { RecurrenceRepository } from '../services/RecurrenceRepository';
import { RecurrenceGenerator } from '../services/RecurrenceGenerator';
import { DocumentScanner } from '../services/DocumentScanner';
import { ExtractionContext } from '../context/ExtractionContext';

const TransactionItem = React.memo(({ item, index, sectionLength, activeTheme, categoryList, accountList, styles, onEdit, onDelete, onAccept, onSplit, hasSplit }) => {
  const catInfo = resolveCategory(item, categoryList);
  const accId = item.accountId ?? item.account_id;
  const accountName = (accId && accountList && accountList.length > 0)
    ? (accountList.find(a => String(a.id) === String(accId))?.name || 'Sem Conta')
    : 'Sem Conta';
  const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  
  const isFirst = index === 0;
  const isLast = index === sectionLength - 1;
  
  return (
    <SwipeableCard 
      onDelete={onDelete}
      onAccept={onAccept}
      containerStyle={[
        isFirst && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
        isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }
      ]}
    >
      {(isSwiping) => (
        <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
          <View style={[
            styles.card, 
            { backgroundColor: activeTheme.card },
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.desc, { color: activeTheme.text, flexShrink: 1 }]} numberOfLines={1}>{item.description}</Text>
                {item.isVirtual && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: activeTheme.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Ionicons name="calendar-outline" size={10} color={activeTheme.accent} />
                    <Text style={{ color: activeTheme.accent, fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Previsto</Text>
                  </View>
                )}
                {item.isPending === 1 && !item.isVirtual && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, backgroundColor: '#FF980020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Ionicons name="time-outline" size={10} color="#FF9800" />
                    <Text style={{ color: '#FF9800', fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>Pendente</Text>
                  </View>
                )}
                {hasSplit && (
                  <TouchableOpacity onPress={onSplit} style={{ marginLeft: 6, padding: 4 }}>
                    <Ionicons name="people" size={14} color={activeTheme.accent} />
                  </TouchableOpacity>
                )}
                {item.recurrenceId && (
                  <View style={{ marginLeft: 6, padding: 4 }}>
                    <Ionicons name="repeat" size={14} color={activeTheme.textSecondary} />
                  </View>
                )}
              </View>
              <Text style={[styles.date, { color: activeTheme.textSecondary }]}>{dateStr} • {accountName}</Text>
            </View>
          </View>
          <Text style={[
            styles.amount, 
            { color: item.type === 'income' ? activeTheme.income : activeTheme.expense, opacity: item.isVirtual ? 0.6 : 1 }
          ]}>
            {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
      )}
    </SwipeableCard>
  );
}, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item && 
         prevProps.activeTheme === nextProps.activeTheme && 
         prevProps.categoryList === nextProps.categoryList &&
         prevProps.accountList === nextProps.accountList &&
         prevProps.sectionLength === nextProps.sectionLength &&
         prevProps.index === nextProps.index &&
         prevProps.hasSplit === nextProps.hasSplit;
});

export default function TransactionsScreen({ navigation }) {
  const { activeTheme, uiConfig, defaultPeriod, llmProvider, llmModel, llmKey } = React.useContext(SettingsContext);
  const { startExtraction, status } = React.useContext(ExtractionContext);
  const { txList, loadTransactions, saveTransaction, removeTransaction, updateTransaction } = useTransactions();
  const { categoryList, loadCategories } = useCategories();
  const { accountList, loadAccounts } = useAccounts();
  const { debtsList, loadDebts } = useDebts();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [initialSplitMode, setInitialSplitMode] = useState(false);

  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [pendingDoc, setPendingDoc] = useState(null);
  const [userContextText, setUserContextText] = useState('');

  const isImporting = status === 'uploading' || status === 'processing';

  const handleImportData = async () => {
    if (!llmKey) {
      Alert.alert('Chave API Ausente', 'Configure sua chave API em Configurações > Extratos primeiro.');
      return;
    }

    Alert.alert(
      'Importação via IA',
      'Escolha a origem do documento:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmera (Nota Fiscal)', onPress: () => processImport('camera') },
        { text: 'Arquivo (PDF/Imagem)', onPress: () => processImport('file') }
      ]
    );
  };

  const processImport = async (source) => {
    let doc = null;
    if (source === 'camera') doc = await DocumentScanner.pickImage();
    else doc = await DocumentScanner.pickDocument();

    if (!doc) return;

    setPendingDoc(doc);
    setUserContextText('');
    setContextModalVisible(true);
  };

  const confirmExtraction = () => {
    if (!pendingDoc) return;
    setContextModalVisible(false);
    const categoriesStr = categoryList.map(c => c.name).join(', ');
    const accountsStr = accountList.map(a => a.name).join(', ');
    startExtraction(pendingDoc, llmProvider, llmModel, llmKey, categoriesStr, accountsStr, userContextText);
    setPendingDoc(null);
  };

  const [inputSearch, setInputSearch] = useState('');
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(inputSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputSearch]);
  const [filter, setFilter] = useState('all'); 
  const [period, setPeriod] = useState(defaultPeriod || '30d'); 
  const [accountFilter, setAccountFilter] = useState('all');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCats, setSelectedCats] = useState([]);
  const [startDateObj, setStartDateObj] = useState(null);
  const [endDateObj, setEndDateObj] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [recurrences, setRecurrences] = useState([]);
  const [forecastPeriod, setForecastPeriod] = useState('none');

  const [visibleCount, setVisibleCount] = useState(50);

  const styles = React.useMemo(() => getStyles(activeTheme), [activeTheme]);

  React.useEffect(() => {
    setVisibleCount(50);
  }, [filter, accountFilter, period, search, startDateObj, endDateObj, selectedCats, forecastPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
      loadAccounts();
      loadDebts();
      RecurrenceRepository.getActive().then(setRecurrences);
    }, [loadTransactions, loadCategories, loadAccounts, loadDebts])
  );

  const filteredList = useMemo(() => {
    let result = txList.filter(item => {
      if (item.isIgnored === 1) return false;
      const limit = DateUtils.getLimitDateForPeriod(period);
      if (item.date < limit) return false;

      if (filter === 'income' && item.type !== 'income') return false;
      if (filter === 'expense' && item.type !== 'expense') return false;
      if (filter === 'recurrence' && !item.recurrenceId && !item.isVirtual) return false;
      if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
      
      const catInfo = resolveCategory(item, categoryList);
      if (selectedCats.length > 0 && !selectedCats.includes(catInfo.categoryName)) {
        return false;
      }
      
      if (search.trim() !== '' && !item.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      if (startDateObj) {
        const sDate = new Date(startDateObj);
        sDate.setHours(0, 0, 0, 0);
        if (item.date < sDate.getTime()) return false;
      }
      
      if (endDateObj) {
        const eDate = new Date(endDateObj);
        eDate.setHours(23, 59, 59, 999);
        if (item.date > eDate.getTime()) return false; 
      }

      return true;
    });

    if (forecastPeriod !== 'none') {
      const days = forecastPeriod === '30d' ? 30 : 60;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + days);
      maxDate.setHours(23, 59, 59, 999);

      const virtualTxs = RecurrenceGenerator.generateVirtualTransactions(
        recurrences,
        txList,
        maxDate.getTime()
      );

      let virtualsToInclude = virtualTxs.filter(v => v.date > Date.now());
      
      if (filter === 'income') virtualsToInclude = virtualsToInclude.filter(t => t.type === 'income');
      if (filter === 'expense') virtualsToInclude = virtualsToInclude.filter(t => t.type === 'expense');
      if (accountFilter !== 'all') virtualsToInclude = virtualsToInclude.filter(t => t.accountId === accountFilter);

      if (search.trim() !== '') {
        const s = search.toLowerCase();
        virtualsToInclude = virtualsToInclude.filter(t => t.description.toLowerCase().includes(s));
      }

      result = [...result, ...virtualsToInclude];
    }

    return result.sort((a, b) => b.date - a.date);
  }, [txList, period, filter, accountFilter, selectedCats, search, startDateObj, endDateObj, categoryList, forecastPeriod, recurrences]);

  const uniqueCategories = Array.from(new Set(txList.map(item => resolveCategory(item, categoryList).categoryName)));

  const toggleCategory = (cat) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter(c => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const paginatedList = filteredList.slice(0, visibleCount);

  const groupedData = paginatedList.reduce((acc, tx) => {
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
    data.isPending = 0;
    await saveTransaction(data.id, data);
    await loadAccounts(); 
    await loadDebts();
    setModalVisible(false);
    setEditingTx(null);
  };

  const handleEdit = useCallback((item, isSplit = false) => {
    setEditingTx(item);
    setInitialSplitMode(isSplit);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(async (item) => {
    if (item.recurrenceId) {
      await updateTransaction(item.id, { isIgnored: 1, splitDebts: [] });
    } else {
      await removeTransaction(item.id);
    }
    await loadAccounts();
    await loadDebts();
  }, [removeTransaction, updateTransaction, loadAccounts, loadDebts]);

  const handleAccept = useCallback(async (item) => {
    await updateTransaction(item.id, { isPending: 0 });
    await loadAccounts();
  }, [updateTransaction, loadAccounts]);

  const renderItem = useCallback(({ item, index, section }) => {
    const hasSplit = item.isVirtual
      ? debtsList.some(d => d.recurrenceId === item.recurrenceId && !d.transactionId)
      : debtsList.some(d => d.transactionId === item.id);

    return (
      <TransactionItem
        item={item}
        index={index}
        sectionLength={section.data.length}
        activeTheme={activeTheme}
        categoryList={categoryList}
        accountList={accountList}
        styles={styles}
        onEdit={() => handleEdit(item, false)}
        onDelete={() => handleDelete(item)}
        onAccept={item.isPending === 1 ? () => handleAccept(item) : undefined}
        onSplit={() => handleEdit(item, true)}
        hasSplit={hasSplit}
      />
    );
  }, [activeTheme, categoryList, accountList, styles, handleEdit, handleDelete, handleAccept, debtsList]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.card }]}>
      <View style={[styles.header, { backgroundColor: activeTheme.card }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.searchBox, { backgroundColor: activeTheme.cardSecondary, flex: 1, marginBottom: 16 * getZoomFactor(activeTheme) }]}>
            <Ionicons name="search" size={20} color={activeTheme.textSecondary} style={styles.searchIcon} />
            <TextInput 
              style={[styles.searchInput, { color: activeTheme.text }]}
              placeholder="Buscar transação..."
              placeholderTextColor={activeTheme.textSecondary}
              value={inputSearch}
              onChangeText={setInputSearch}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.importBtn, { backgroundColor: activeTheme.cardSecondary }]}
            onPress={() => { setEditingTx(null); setInitialSplitMode(false); setModalVisible(true); }}
          >
            <Ionicons name="add" size={24} color={activeTheme.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.importBtn, { backgroundColor: activeTheme.accent, marginLeft: 8 * getZoomFactor(activeTheme) }]}
            onPress={handleImportData}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <Ionicons name="sparkles" size={20} color="#121212" />
            )}
          </TouchableOpacity>
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
                    <TouchableOpacity style={[styles.filterBtn, filter === 'recurrence' && { backgroundColor: activeTheme.accent }]} onPress={() => setFilter('recurrence')}>
                      <Text style={[styles.filterText, { color: activeTheme.textSecondary }, filter === 'recurrence' && { color: '#121212' }]}>Recorrências</Text>
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

                  <View style={[styles.filterGroup, { backgroundColor: activeTheme.cardSecondary }]}>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === 'none' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('none')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === 'none' && { color: '#121212' }]}>S/ Previsão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === '30d' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('30d')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === '30d' && { color: '#121212' }]}>+30D (Futuro)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === '60d' && { backgroundColor: activeTheme.accent }]} onPress={() => setForecastPeriod('60d')}>
                      <Text style={[styles.periodText, { color: activeTheme.textSecondary }, forecastPeriod === '60d' && { color: '#121212' }]}>+60D</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.dateInputsRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Inicial</Text>
                    <TouchableOpacity
                      style={[styles.dateInput, { backgroundColor: activeTheme.cardSecondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={{ color: startDateObj ? activeTheme.text : activeTheme.textSecondary, fontSize: 13, fontFamily: activeTheme.fontFamily || 'monospace' }}>
                        {startDateObj ? startDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Selecionar...'}
                      </Text>
                      {startDateObj ? (
                        <TouchableOpacity onPress={() => setStartDateObj(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close-circle" size={16} color={activeTheme.textSecondary} />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="calendar-outline" size={16} color={activeTheme.accent} />
                      )}
                    </TouchableOpacity>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={startDateObj || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowStartDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            setStartDateObj(selectedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { color: activeTheme.textSecondary }]}>Data Final</Text>
                    <TouchableOpacity
                      style={[styles.dateInput, { backgroundColor: activeTheme.cardSecondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={{ color: endDateObj ? activeTheme.text : activeTheme.textSecondary, fontSize: 13, fontFamily: activeTheme.fontFamily || 'monospace' }}>
                        {endDateObj ? endDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Selecionar...'}
                      </Text>
                      {endDateObj ? (
                        <TouchableOpacity onPress={() => setEndDateObj(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close-circle" size={16} color={activeTheme.textSecondary} />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="calendar-outline" size={16} color={activeTheme.accent} />
                      )}
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDateObj || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowEndDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            setEndDateObj(selectedDate);
                          }
                        }}
                      />
                    )}
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
          onEndReached={() => {
            if (visibleCount < filteredList.length) {
              setVisibleCount(v => v + 50);
            }
          }}
          onEndReachedThreshold={0.5}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>

      <TransactionModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingTx(null); setInitialSplitMode(false); }}
        onSave={handleSave}
        onDelete={async (tx) => {
          if (tx.recurrenceId) {
            await updateTransaction(tx.id, { isIgnored: 1, splitDebts: [] });
          } else {
            await removeTransaction(tx.id);
          }
          await loadAccounts();
          await loadDebts();
        }}
        initialData={editingTx}
        initialSplitMode={initialSplitMode}
      />

      <BaseModalCenter
        visible={contextModalVisible}
        title="Instruções Especiais"
        onClose={() => { setContextModalVisible(false); setPendingDoc(null); }}
        onSave={confirmExtraction}
        saveText="Extrair"
      >
        <Text style={[styles.contextModalSubtitle, { color: activeTheme.textSecondary }]}>
          Deseja passar algum contexto ou regra para a Inteligência Artificial? (Opcional)
        </Text>
        <TextInput
          style={[styles.contextInput, { color: activeTheme.text, backgroundColor: activeTheme.background }]}
          placeholder="Ex: Todas as compras no Mercado Pago são gastos com Pet."
          placeholderTextColor={activeTheme.textSecondary}
          value={userContextText}
          onChangeText={setUserContextText}
          multiline
          textAlignVertical="top"
        />
      </BaseModalCenter>
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16 * z, borderBottomWidth: 1, borderBottomColor: 'transparent' },
    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12 * z, paddingHorizontal: 12 * z, height: 44 * z },
    searchIcon: { marginRight: 8 * z },
    searchInput: { flex: 1, fontSize: 16 * z, fontFamily: f },
    importBtn: { width: 44 * z, height: 44 * z, borderRadius: 12 * z, justifyContent: 'center', alignItems: 'center', marginLeft: 12 * z, marginBottom: 16 * z },
    
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

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 * z },
    contextModal: { padding: 24 * z, borderRadius: 16 * z, elevation: 5 },
    contextModalTitle: { fontSize: 18 * z, fontWeight: 'bold', marginBottom: 8 * z, fontFamily: f },
    contextModalSubtitle: { fontSize: 14 * z, marginBottom: 16 * z, fontFamily: f },
    contextInput: { height: 100 * z, borderRadius: 8 * z, padding: 12 * z, fontFamily: f, marginBottom: 24 * z },
    contextModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 * z },
    contextBtnCancel: { padding: 12 * z, justifyContent: 'center' },
    contextBtnConfirm: { paddingHorizontal: 24 * z, paddingVertical: 12 * z, borderRadius: 8 * z, justifyContent: 'center' },
  });
};
